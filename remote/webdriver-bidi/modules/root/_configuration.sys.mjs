/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RootBiDiModule } from "chrome://remote/content/webdriver-bidi/modules/RootBiDiModule.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  BrowsingContextListener:
    "chrome://remote/content/shared/listeners/BrowsingContextListener.sys.mjs",
  ContextDescriptorType:
    "chrome://remote/content/shared/messagehandler/MessageHandler.sys.mjs",
  Log: "chrome://remote/content/shared/Log.sys.mjs",
  NavigableManager: "chrome://remote/content/shared/NavigableManager.sys.mjs",
  setDevicePixelRatioForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/browsingContext.sys.mjs",
  setLocaleOverrideForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/emulation.sys.mjs",
  setScreenOrientationOverrideForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/emulation.sys.mjs",
  setScreenSettingsOverrideForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/emulation.sys.mjs",
  setTimezoneOverrideForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/emulation.sys.mjs",
  setUserAgentOverrideForBrowsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/emulation.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logger", () =>
  lazy.Log.get(lazy.Log.TYPES.WEBDRIVER_BIDI)
);

// Apply here only the emulations that will be initialized in the parent process,
// except from `viewport-override` which is handled separately.
const EMULATIONS_TO_APPLY = [
  "locale-override",
  "screen-orientation-override",
  "screen-settings-override",
  "timezone-override",
  "user-agent-override",
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

    // The configuration map, which maps an emulation to the settings
    // that derived from session data when a browsing context is created
    // to define which emulations have to be applied to this browsing context.
    this.#configurationMap = {};
    for (const emulation of EMULATIONS_TO_APPLY) {
      this.#configurationMap[emulation] = {
        [lazy.ContextDescriptorType.TopBrowsingContext]: null,
        [lazy.ContextDescriptorType.UserContext]: null,
      };

      // User agent override also supports a global setting.
      // see https://www.w3.org/TR/webdriver-bidi/#command-emulation-setUserAgentOverride.
      if (emulation === "user-agent-override") {
        this.#configurationMap["user-agent-override"][
          lazy.ContextDescriptorType.All
        ] = null;
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
        "viewport-override",
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

  // For some emulations a value set per a browsing context overrides
  // a value set per a user context or set globally. And a value set per
  // a user context overrides a global value.
  #findCorrectOverrideValue(configuration, type) {
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
        !EMULATIONS_TO_APPLY.includes(category) &&
        category !== "viewport-override"
      ) {
        continue;
      }

      if (category === "viewport-override") {
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

    // For the following emulations on the previous step, we found session items
    // that would apply an override for a browsing context, a user context, and in some cases globally.
    // Now from these items we have to choose the one that would take precedence.
    // The order is the user context item overrides the global one, and the browsing context overrides the user context item.
    const localeOverride = this.#findCorrectOverrideValue(
      configurationMap["locale-override"],
      "string"
    );
    if (localeOverride !== null) {
      lazy.setLocaleOverrideForBrowsingContext({
        context: browsingContext,
        value: localeOverride,
      });
    }

    const screenOrientationOverride = this.#findCorrectOverrideValue(
      configurationMap["screen-orientation-override"],
      "object"
    );
    if (screenOrientationOverride !== null) {
      lazy.setScreenOrientationOverrideForBrowsingContext({
        context: browsingContext,
        value: screenOrientationOverride,
      });
    }

    const screenSettingsOverride = this.#findCorrectOverrideValue(
      configurationMap["screen-settings-override"],
      "object"
    );
    if (screenSettingsOverride !== null) {
      lazy.setScreenSettingsOverrideForBrowsingContext({
        context: browsingContext,
        value: screenSettingsOverride,
      });
    }

    const timezoneOverride = this.#findCorrectOverrideValue(
      configurationMap["timezone-override"],
      "string"
    );
    if (timezoneOverride !== null) {
      lazy.setTimezoneOverrideForBrowsingContext({
        context: browsingContext,
        value: timezoneOverride,
      });
    }

    const userAgentOverride = this.#findCorrectOverrideValue(
      configurationMap["user-agent-override"],
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
   * Internal commands
   */

  _applySessionData() {}
}

export const _configuration = _ConfigurationModule;
