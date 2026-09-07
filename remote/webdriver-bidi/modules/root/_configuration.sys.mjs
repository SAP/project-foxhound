/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RootBiDiModule } from "chrome://remote/content/webdriver-bidi/modules/RootBiDiModule.sys.mjs";
import { SessionDataCategory } from "chrome://remote/content/shared/messagehandler/sessiondata/SessionData.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  assert: "chrome://remote/content/shared/webdriver/Assert.sys.mjs",
  BrowsingContextListener:
    "chrome://remote/content/shared/listeners/BrowsingContextListener.sys.mjs",
  ContextDescriptorType:
    "chrome://remote/content/shared/messagehandler/MessageHandler.sys.mjs",
  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  Log: "chrome://remote/content/shared/Log.sys.mjs",
  NavigableManager: "chrome://remote/content/shared/NavigableManager.sys.mjs",
  pprint: "chrome://remote/content/shared/Format.sys.mjs",
  setDevicePixelRatioForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/browsingContext.sys.mjs",
  setDownloadFolderOverrideForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/browser.sys.mjs",
  setLocaleOverrideForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/emulation.sys.mjs",
  setNetworkConditionsForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/emulation.sys.mjs",
  setScreenOrientationOverrideForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/emulation.sys.mjs",
  setScreenSettingsOverrideForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/emulation.sys.mjs",
  setTimezoneOverrideForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/emulation.sys.mjs",
  setUserAgentOverrideForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/emulation.sys.mjs",
  TabManager: "chrome://remote/content/shared/TabManager.sys.mjs",
  UserContextManager:
    "chrome://remote/content/shared/UserContextManager.sys.mjs",
  WindowGlobalMessageHandler:
    "chrome://remote/content/shared/messagehandler/WindowGlobalMessageHandler.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logger", () =>
  lazy.Log.get(lazy.Log.TYPES.WEBDRIVER_BIDI)
);

/**
 * Return value for #getConfigurationTargets.
 *
 * @typedef {object} ConfigurationTargets
 *
 * @property {Set<Navigable>} navigables
 * @property {Set<number>} userContexts
 */

const NULL = Symbol("NULL");

// Apply here only the configurations that will be initialized in the parent process,
// except from `viewport-override` which is handled separately.
const CONFIGURATIONS_TO_APPLY = [
  SessionDataCategory.DownloadBehaviorOverride,
  SessionDataCategory.LocaleOverride,
  SessionDataCategory.NetworkConditions,
  SessionDataCategory.ScreenOrientationOverride,
  SessionDataCategory.ScreenSettingsOverride,
  SessionDataCategory.TimezoneOverride,
  SessionDataCategory.UserAgentOverride,
];

/**
 * Internal module to set the configuration on the newly created navigables.
 */
class _ConfigurationModule extends RootBiDiModule {
  #configurationMap;
  #contextListener;

  constructor(messageHandler) {
    super(messageHandler);

    Services.obs.addObserver(
      this,
      "tabbrowser-browser-element-will-be-inserted"
    );

    this.#contextListener = new lazy.BrowsingContextListener();
    this.#contextListener.on("attached", this.#onContextAttached);
    this.#contextListener.startListening();

    // The configuration map, which maps a configuration to the settings
    // that derived from session data when a browsing context is created
    // to define which configurations have to be applied to this browsing context.
    this.#configurationMap = {};
    for (const configuration of CONFIGURATIONS_TO_APPLY) {
      this.#configurationMap[configuration] = {
        [lazy.ContextDescriptorType.TopBrowsingContext]: null,
        [lazy.ContextDescriptorType.UserContext]: null,
      };

      // User agent override also supports a global setting.
      // see https://www.w3.org/TR/webdriver-bidi/#command-emulation-setUserAgentOverride.
      if (
        configuration === SessionDataCategory.UserAgentOverride ||
        configuration === SessionDataCategory.DownloadBehaviorOverride
      ) {
        this.#configurationMap[configuration][lazy.ContextDescriptorType.All] =
          null;
      }
    }
  }

  destroy() {
    Services.obs.removeObserver(
      this,
      "tabbrowser-browser-element-will-be-inserted"
    );

    this.#contextListener.stopListening();
    this.#contextListener.off("attached", this.#onContextAttached);
    this.#contextListener.destroy();

    this.#configurationMap = null;
  }

  observe(subject, topic) {
    if (topic === "tabbrowser-browser-element-will-be-inserted") {
      const userContextId = subject.getAttribute("usercontextid");

      const sessionData = this.messageHandler.sessionData.getSessionData(
        "_configuration",
        SessionDataCategory.ViewportOverride,
        {
          type: lazy.ContextDescriptorType.UserContext,
          id: userContextId === null ? 0 : parseInt(userContextId),
        }
      );

      if (!sessionData.length) {
        return;
      }

      const lastViewportItem = sessionData.findLast(
        item => item.value.viewport !== undefined
      );

      if (!lastViewportItem || !lastViewportItem.value.viewport) {
        return;
      }

      const { height, width } = lastViewportItem.value.viewport;
      subject.style.setProperty("height", height + "px");
      subject.style.setProperty("width", width + "px");

      lazy.logger.trace(
        `[${lazy.NavigableManager.getIdForBrowser(subject)}] Updated viewport to height: ${height}, width: ${width}`
      );
    }
  }

  // For some configurations a value set per a browsing context supersedes
  // a value set per a user context or set globally. And a value set per
  // a user context supersedes a global value.
  #findCorrectConfigurationValue(configuration, type) {
    const contextValue =
      configuration[lazy.ContextDescriptorType.TopBrowsingContext];
    const userContextValue =
      configuration[lazy.ContextDescriptorType.UserContext];
    const globalValue = configuration[lazy.ContextDescriptorType.All];

    if (this.#isOfType(contextValue, type)) {
      return contextValue;
    }
    if (this.#isOfType(userContextValue, type)) {
      return userContextValue;
    }
    if (this.#isOfType(globalValue, type)) {
      return globalValue;
    }
    return null;
  }

  /**
   * Check if the provided value matches the provided type.
   *
   * @param {*} value
   *     The value to verify.
   * @param {string} type
   *     The type to match.
   *
   * @returns {boolean}
   *     Returns `true` if the value type is the same as
   *     the provided type. `false`, otherwise.
   *     Also always returns `false` for `null`.
   */
  #isOfType(value, type) {
    return typeof value === type && value !== null;
  }

  #onContextAttached = async (eventName, data = {}) => {
    const { browsingContext } = data;

    // We have to apply configuration only to top-level browsing contexts.
    if (browsingContext.parent) {
      return;
    }

    const sessionDataItems =
      this.messageHandler.sessionData.getSessionDataForContext(
        "_configuration",
        undefined,
        browsingContext
      );

    const configurationMap = structuredClone(this.#configurationMap);
    let devicePixelRatioOverride = null;

    for (const { category, contextDescriptor, value } of sessionDataItems) {
      if (
        !CONFIGURATIONS_TO_APPLY.includes(category) &&
        category !== SessionDataCategory.ViewportOverride
      ) {
        continue;
      }

      if (category === SessionDataCategory.ViewportOverride) {
        if (value.devicePixelRatio !== undefined) {
          devicePixelRatioOverride = value.devicePixelRatio;
        }
      } else {
        configurationMap[category][contextDescriptor.type] = value;
      }
    }

    if (devicePixelRatioOverride !== null) {
      lazy.setDevicePixelRatioForBrowsingContext({
        context: browsingContext,
        value: devicePixelRatioOverride,
      });
    }

    // For the following configurations on the previous step, we found session items
    // that would apply a configuration for a browsing context, a user context, and in some cases globally.
    // Now from these items we have to choose the one that would take precedence.
    // The order is the user context item supersedes the global one, and the browsing context supersedes the user context item.
    const downloadBehaviorOverride = this.#findCorrectConfigurationValue(
      configurationMap[SessionDataCategory.DownloadBehaviorOverride],
      "object"
    );
    if (downloadBehaviorOverride !== null) {
      lazy.setDownloadFolderOverrideForBrowsingContext({
        context: browsingContext,
        value: downloadBehaviorOverride,
      });
    }

    const localeOverride = this.#findCorrectConfigurationValue(
      configurationMap[SessionDataCategory.LocaleOverride],
      "string"
    );
    if (localeOverride !== null) {
      lazy.setLocaleOverrideForBrowsingContext({
        context: browsingContext,
        value: localeOverride,
      });
    }

    const networkConditions = this.#findCorrectConfigurationValue(
      configurationMap[SessionDataCategory.NetworkConditions],
      "object"
    );
    if (networkConditions !== null) {
      lazy.setNetworkConditionsForBrowsingContext({
        context: browsingContext,
        value: networkConditions,
      });
    }

    const screenOrientationOverride = this.#findCorrectConfigurationValue(
      configurationMap[SessionDataCategory.ScreenOrientationOverride],
      "object"
    );
    if (screenOrientationOverride !== null) {
      lazy.setScreenOrientationOverrideForBrowsingContext({
        context: browsingContext,
        value: screenOrientationOverride,
      });
    }

    const screenSettingsOverride = this.#findCorrectConfigurationValue(
      configurationMap[SessionDataCategory.ScreenSettingsOverride],
      "object"
    );
    if (screenSettingsOverride !== null) {
      lazy.setScreenSettingsOverrideForBrowsingContext({
        context: browsingContext,
        value: screenSettingsOverride,
      });
    }

    const timezoneOverride = this.#findCorrectConfigurationValue(
      configurationMap[SessionDataCategory.TimezoneOverride],
      "string"
    );
    if (timezoneOverride !== null) {
      lazy.setTimezoneOverrideForBrowsingContext({
        context: browsingContext,
        value: timezoneOverride,
      });
    }

    const userAgentOverride = this.#findCorrectConfigurationValue(
      configurationMap[SessionDataCategory.UserAgentOverride],
      "string"
    );
    if (userAgentOverride !== null) {
      lazy.setUserAgentOverrideForBrowsingContext({
        context: browsingContext,
        value: userAgentOverride,
      });
    }

    const contextId =
      lazy.NavigableManager.getIdForBrowsingContext(browsingContext);
    lazy.logger.trace(
      `[${contextId}] All required configurations are applied to a new browsing context`
    );
  };

  /**
   * Apply configuration command parameters for contexts, user contexts, or
   * globally.
   *
   * @param {object} options
   * @param {bool} options.async
   * @param {string} options.category
   * @param {Array<string>|null} options.contextIds
   * @param {string} [options.moduleName="_configuration"]
   *     The module name to use when writing session data.
   * @param {boolean} options.supportsGlobalConfiguration
   * @param {*} options.resetValue
   * @param {Array<string>|null} options.userContextIds
   * @param {*} options.value
   */
  async _applyConfigurationParameters(options) {
    const {
      async: isAsync,
      category,
      contextIds = NULL,
      moduleName = "_configuration",
      resetValue,
      supportsGlobalConfiguration,
      userContextIds = NULL,
      value,
    } = options;

    const hasContextConfiguration = contextIds !== NULL;
    const hasUserContextConfiguration = userContextIds !== NULL;
    const hasGlobalConfiguration =
      supportsGlobalConfiguration &&
      !hasContextConfiguration &&
      !hasUserContextConfiguration;

    const { navigables, userContexts } = this.#getConfigurationTargets(
      contextIds,
      userContextIds,
      {
        hasContextConfiguration,
        hasUserContextConfiguration,
        supportsGlobalConfiguration,
      }
    );

    const sessionDataItems = this.#generateSessionDataUpdate({
      category,
      hasContextConfiguration,
      hasGlobalConfiguration,
      moduleName,
      navigables,
      resetValue,
      userContexts,
      hasUserContextConfiguration,
      value,
    });

    if (sessionDataItems.length) {
      // TODO: Bug 1953079. Saving configurations in the session data works fine
      // with one session, but when we start supporting multiple BiDi session,
      // we will have to rethink this approach.
      await this.messageHandler.updateSessionData(sessionDataItems);
    }

    await this.#applyConfiguration({
      async: isAsync,
      category,
      hasContextConfiguration,
      hasUserContextConfiguration,
      navigables,
      resetValue,
      value,
    });
  }

  async #applyConfiguration(options) {
    const {
      async: isAsync = false,
      category,
      hasContextConfiguration,
      hasUserContextConfiguration,
      navigables,
      resetValue = "",
      value,
    } = options;

    const commands = [];

    for (const navigable of navigables) {
      const configurationValue = this.#getConfigurationValue(
        {
          category,
          context: navigable,
          hasContextConfiguration,
          hasUserContextConfiguration,
          value,
        },
        resetValue
      );

      if (configurationValue === undefined) {
        continue;
      }

      const commandArgs = {
        context: navigable,
        value: configurationValue,
      };

      if (isAsync) {
        commands.push(
          this.#applyConfigurationForCategory(category, commandArgs)
        );
      } else {
        this.#applyConfigurationForCategory(category, commandArgs);
      }
    }

    if (isAsync) {
      await Promise.all(commands);
    }
  }

  #applyConfigurationForCategory(category, commandArgs) {
    switch (category) {
      case SessionDataCategory.DownloadBehaviorOverride:
        return lazy.setDownloadFolderOverrideForBrowsingContext(commandArgs);
      case SessionDataCategory.GeolocationOverride:
        return this.#applyGeolocationOverride(commandArgs);
      case SessionDataCategory.LocaleOverride:
        return this.#applyLocaleOverride(commandArgs);
      case SessionDataCategory.NetworkConditions:
        return lazy.setNetworkConditionsForBrowsingContext(commandArgs);
      case SessionDataCategory.ScreenOrientationOverride:
        return lazy.setScreenOrientationOverrideForBrowsingContext(commandArgs);
      case SessionDataCategory.ScreenSettingsOverride:
        return lazy.setScreenSettingsOverrideForBrowsingContext(commandArgs);
      case SessionDataCategory.TimezoneOverride:
        return this.#applyTimezoneOverride(commandArgs);
      case SessionDataCategory.UserAgentOverride:
        return lazy.setUserAgentOverrideForBrowsingContext(commandArgs);
      default:
        return undefined;
    }
  }

  async #applyGeolocationOverride(options) {
    const { context, value } = options;

    await this.messageHandler.handleCommand({
      moduleName: "emulation",
      commandName: "_setGeolocationOverride",
      destination: {
        type: lazy.WindowGlobalMessageHandler.type,
        contextDescriptor: {
          type: lazy.ContextDescriptorType.TopBrowsingContext,
          id: context.browserId,
        },
      },
      params: {
        coordinates: value,
      },
      retryOnAbort: true,
    });
  }

  async #applyLocaleOverride(options) {
    const { context, value } = options;

    lazy.setLocaleOverrideForBrowsingContext(options);

    await this.messageHandler.handleCommand({
      moduleName: "emulation",
      commandName: "_setLocaleOverrideToSandboxes",
      destination: {
        type: lazy.WindowGlobalMessageHandler.type,
        contextDescriptor: {
          type: lazy.ContextDescriptorType.TopBrowsingContext,
          id: context.browserId,
        },
      },
      params: {
        locale: value,
      },
    });
  }

  async #applyTimezoneOverride(options) {
    const { context, value } = options;

    lazy.setTimezoneOverrideForBrowsingContext(options);

    await this.messageHandler.handleCommand({
      moduleName: "emulation",
      commandName: "_setTimezoneOverrideToSandboxes",
      destination: {
        type: lazy.WindowGlobalMessageHandler.type,
        contextDescriptor: {
          type: lazy.ContextDescriptorType.TopBrowsingContext,
          id: context.browserId,
        },
      },
      params: {
        timezone: value,
      },
    });
  }

  #generateSessionDataUpdate(options) {
    const {
      category,
      hasContextConfiguration,
      hasGlobalConfiguration,
      hasUserContextConfiguration,
      moduleName,
      navigables,
      resetValue,
      userContexts,
      value,
    } = options;
    const sessionDataItems = [];
    const onlyRemoveSessionDataItem = value === resetValue;

    if (hasUserContextConfiguration) {
      for (const userContext of userContexts) {
        sessionDataItems.push(
          ...this.messageHandler.sessionData.generateSessionDataItemUpdate(
            moduleName,
            category,
            {
              type: lazy.ContextDescriptorType.UserContext,
              id: userContext,
            },
            onlyRemoveSessionDataItem,
            value
          )
        );
      }
    } else if (hasContextConfiguration) {
      for (const navigable of navigables) {
        sessionDataItems.push(
          ...this.messageHandler.sessionData.generateSessionDataItemUpdate(
            moduleName,
            category,
            {
              type: lazy.ContextDescriptorType.TopBrowsingContext,
              id: navigable.browserId,
            },
            onlyRemoveSessionDataItem,
            value
          )
        );
      }
    } else if (hasGlobalConfiguration) {
      sessionDataItems.push(
        ...this.messageHandler.sessionData.generateSessionDataItemUpdate(
          moduleName,
          category,
          {
            type: lazy.ContextDescriptorType.All,
          },
          onlyRemoveSessionDataItem,
          value
        )
      );
    }

    return sessionDataItems;
  }

  /**
   * Validates the provided browsing contexts or user contexts and resolves them
   * to a set of navigables.
   *
   * @param {Array<string>|null} contextIds
   *     Optional list of browsing context ids.
   * @param {Array<string>|null} userContextIds
   *     Optional list of user context ids.
   * @param {object=} options
   * @param {boolean} options.hasContextConfiguration
   *     Whether the contextIds parameter was present or omitted.
   * @param {boolean} options.hasUserContextConfiguration
   *     Whether the userContextIds parameter was present or omitted.
   * @param {boolean} options.supportsGlobalConfiguration
   *     Allow global configuration if no contextIds or userContextIds are provided.
   *
   * @returns {ConfigurationTargets}
   */
  #getConfigurationTargets(contextIds, userContextIds, options = {}) {
    const {
      hasContextConfiguration,
      hasUserContextConfiguration,
      supportsGlobalConfiguration = false,
    } = options;
    if (hasContextConfiguration && hasUserContextConfiguration) {
      throw new lazy.error.InvalidArgumentError(
        `Providing both "contexts" and "userContexts" arguments is not supported`
      );
    }

    const navigables = new Set();
    const userContexts = new Set();

    if (hasContextConfiguration) {
      lazy.assert.isNonEmptyArray(
        contextIds,
        lazy.pprint`Expected "contexts" to be a non-empty array, got ${contextIds}`
      );

      for (const contextId of contextIds) {
        lazy.assert.string(
          contextId,
          lazy.pprint`Expected elements of "contexts" to be a string, got ${contextId}`
        );

        const context = this._getNavigable(contextId);

        lazy.assert.topLevel(
          context,
          `Browsing context with id ${contextId} is not top-level`
        );

        navigables.add(context);
      }
    } else if (hasUserContextConfiguration) {
      lazy.assert.isNonEmptyArray(
        userContextIds,
        lazy.pprint`Expected "userContexts" to be a non-empty array, got ${userContextIds}`
      );

      for (const userContextId of userContextIds) {
        lazy.assert.string(
          userContextId,
          lazy.pprint`Expected elements of "userContexts" to be a string, got ${userContextId}`
        );

        const internalId =
          lazy.UserContextManager.getInternalIdById(userContextId);

        if (internalId === null) {
          throw new lazy.error.NoSuchUserContextError(
            `User context with id: ${userContextId} doesn't exist`
          );
        }

        userContexts.add(internalId);

        // Prepare the list of navigables to update.
        lazy.UserContextManager.getTabsForUserContext(internalId).forEach(
          tab => {
            const contentBrowser = lazy.TabManager.getBrowserForTab(tab);
            navigables.add(contentBrowser.browsingContext);
          }
        );
      }
    } else if (supportsGlobalConfiguration) {
      lazy.TabManager.getBrowsers().forEach(browser =>
        navigables.add(browser.browsingContext)
      );
    } else {
      throw new lazy.error.InvalidArgumentError(
        `At least one of "contexts" or "userContexts" arguments should be provided`
      );
    }

    return { navigables, userContexts };
  }

  #getConfigurationValue(params, resetValue = "") {
    const {
      category,
      context,
      hasContextConfiguration,
      hasUserContextConfiguration,
      value,
    } = params;
    const [
      configurationPerContext,
      configurationPerUserContext,
      configurationGlobal,
    ] = this.#findExistingConfigurationForContext(category, context);

    if (hasContextConfiguration) {
      if (value === resetValue) {
        // In case of resetting a configuration for navigable,
        // if there is an existing configuration for user context or global,
        // we should apply it to browsing context.
        return configurationPerUserContext || configurationGlobal || resetValue;
      }
    } else if (hasUserContextConfiguration) {
      // No need to do anything if there is a configuration
      // for the browsing context.
      if (configurationPerContext) {
        return undefined;
      }

      // In case of resetting a configuration for user context,
      // apply a global configuration if it exists
      if (value === resetValue && configurationGlobal) {
        return configurationGlobal;
      }
    } else if (configurationPerContext || configurationPerUserContext) {
      // No need to do anything if there is a configuration
      // for the browsing or user context.
      return undefined;
    }

    return value;
  }

  /**
   * Find the existing configurations for a given category and context.
   *
   * @param {string} category
   *     The session data category.
   * @param {BrowsingContext} context
   *     The browsing context.
   *
   * @returns {Array<string>}
   *     Return the list of existing values.
   */
  #findExistingConfigurationForContext(category, context) {
    let configurationGlobal,
      configurationPerUserContext,
      configurationPerContext;

    const sessionDataItems =
      this.messageHandler.sessionData.getSessionDataForContext(
        "_configuration",
        category,
        context
      );

    sessionDataItems.forEach(item => {
      switch (item.contextDescriptor.type) {
        case lazy.ContextDescriptorType.All: {
          configurationGlobal = item.value;
          break;
        }
        case lazy.ContextDescriptorType.UserContext: {
          configurationPerUserContext = item.value;
          break;
        }
        case lazy.ContextDescriptorType.TopBrowsingContext: {
          configurationPerContext = item.value;
          break;
        }
      }
    });

    return [
      configurationPerContext,
      configurationPerUserContext,
      configurationGlobal,
    ];
  }

  /**
   * Internal commands
   */

  _applySessionData() {}
}

export const _configuration = _ConfigurationModule;
