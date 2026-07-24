/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RootBiDiModule } from "chrome://remote/content/webdriver-bidi/modules/RootBiDiModule.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  assert: "chrome://remote/content/shared/webdriver/Assert.sys.mjs",
  ContextDescriptorType:
    "chrome://remote/content/shared/messagehandler/MessageHandler.sys.mjs",
  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  Log: "chrome://remote/content/shared/Log.sys.mjs",
  NavigableManager: "chrome://remote/content/shared/NavigableManager.sys.mjs",
  pprint: "chrome://remote/content/shared/Format.sys.mjs",
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
 * Enum of possible natural orientations supported by the
 * emulation.setOrientationOverride command.
 *
 * @readonly
 * @enum {ScreenOrientationNatural}
 */
const ScreenOrientationNatural = {
  Landscape: "landscape",
  Portrait: "portrait",
};

/**
 * Enum of possible orientation types supported by the
 * emulation.setOrientationOverride command.
 *
 * @readonly
 * @enum {ScreenOrientationType}
 */
const ScreenOrientationType = {
  PortraitPrimary: "portrait-primary",
  PortraitSecondary: "portrait-secondary",
  LandscapePrimary: "landscape-primary",
  LandscapeSecondary: "landscape-secondary",
};

// see https://www.w3.org/TR/screen-orientation/#dfn-screen-orientation-values-lists.
const SCREEN_ORIENTATION_VALUES_LISTS = {
  [ScreenOrientationNatural.Portrait]: {
    [ScreenOrientationType.PortraitPrimary]: 0,
    [ScreenOrientationType.LandscapePrimary]: 90,
    [ScreenOrientationType.PortraitSecondary]: 180,
    [ScreenOrientationType.LandscapeSecondary]: 270,
  },
  [ScreenOrientationNatural.Landscape]: {
    [ScreenOrientationType.LandscapePrimary]: 0,
    [ScreenOrientationType.PortraitPrimary]: 90,
    [ScreenOrientationType.LandscapeSecondary]: 180,
    [ScreenOrientationType.PortraitSecondary]: 270,
  },
};

class EmulationModule extends RootBiDiModule {
  /**
   * Create a new module instance.
   *
   * @param {MessageHandler} messageHandler
   *     The MessageHandler instance which owns this Module instance.
   */
  constructor(messageHandler) {
    super(messageHandler);
  }

  destroy() {}

  /**
   * Used as an argument for emulation.setGeolocationOverride command
   * to represent an object which holds geolocation coordinates which
   * should override the return result of geolocation APIs.
   *
   * @typedef {object} GeolocationCoordinates
   *
   * @property {number} latitude
   * @property {number} longitude
   * @property {number=} accuracy
   *     Defaults to 1.
   * @property {number=} altitude
   *     Defaults to null.
   * @property {number=} altitudeAccuracy
   *     Defaults to null.
   * @property {number=} heading
   *     Defaults to null.
   * @property {number=} speed
   *     Defaults to null.
   */

  /**
   * Set the geolocation override to the list of top-level navigables
   * or user contexts.
   *
   * @param {object=} options
   * @param {Array<string>=} options.contexts
   *     Optional list of browsing context ids.
   * @param {(GeolocationCoordinates|null)} options.coordinates
   *     Geolocation coordinates which have to override
   *     the return result of geolocation APIs.
   *     Null value resets the override.
   * @param {Array<string>=} options.userContexts
   *     Optional list of user context ids.
   *
   * @throws {InvalidArgumentError}
   *     Raised if an argument is of an invalid type or value.
   * @throws {NoSuchFrameError}
   *     If the browsing context cannot be found.
   * @throws {NoSuchUserContextError}
   *     Raised if the user context id could not be found.
   */
  async setGeolocationOverride(options = {}) {
    let { coordinates } = options;
    const { contexts: contextIds = null, userContexts: userContextIds = null } =
      options;

    if (coordinates !== null) {
      lazy.assert.object(
        coordinates,
        lazy.pprint`Expected "coordinates" to be an object, got ${coordinates}`
      );

      const {
        latitude,
        longitude,
        accuracy = 1,
        altitude = null,
        altitudeAccuracy = null,
        heading = null,
        speed = null,
      } = coordinates;

      lazy.assert.numberInRange(
        latitude,
        [-90, 90],
        lazy.pprint`Expected "latitude" to be in the range of -90 to 90, got ${latitude}`
      );

      lazy.assert.numberInRange(
        longitude,
        [-180, 180],
        lazy.pprint`Expected "longitude" to be in the range of -180 to 180, got ${longitude}`
      );

      lazy.assert.positiveNumber(
        accuracy,
        lazy.pprint`Expected "accuracy" to be a positive number, got ${accuracy}`
      );

      if (altitude !== null) {
        lazy.assert.number(
          altitude,
          lazy.pprint`Expected "altitude" to be a number, got ${altitude}`
        );
      }

      if (altitudeAccuracy !== null) {
        lazy.assert.positiveNumber(
          altitudeAccuracy,
          lazy.pprint`Expected "altitudeAccuracy" to be a positive number, got ${altitudeAccuracy}`
        );

        if (altitude === null) {
          throw new lazy.error.InvalidArgumentError(
            `When "altitudeAccuracy" is provided it's required to provide "altitude" as well`
          );
        }
      }

      if (heading !== null) {
        lazy.assert.number(
          heading,
          lazy.pprint`Expected "heading" to be a number, got ${heading}`
        );

        lazy.assert.that(
          number => number >= 0 && number < 360,
          lazy.pprint`Expected "heading" to be >= 0 and < 360, got ${heading}`
        )(heading);
      }

      if (speed !== null) {
        lazy.assert.positiveNumber(
          speed,
          lazy.pprint`Expected "speed" to be a positive number, got ${speed}`
        );
      }

      coordinates = {
        ...coordinates,
        accuracy,
        // For platform API if we want to set values to null
        // we have to set them to NaN.
        altitude: altitude === null ? NaN : altitude,
        altitudeAccuracy: altitudeAccuracy === null ? NaN : altitudeAccuracy,
        heading: heading === null ? NaN : heading,
        speed: speed === null ? NaN : speed,
      };
    }

    const { navigables, userContexts } = this.#getEmulationTargets(
      contextIds,
      userContextIds
    );

    const sessionDataItems = this.#generateSessionDataUpdate({
      category: "geolocation-override",
      contextOverride: contextIds !== null,
      hasGlobalOverride: false,
      navigables,
      resetValue: null,
      userContexts,
      userContextOverride: userContextIds !== null,
      value: coordinates,
    });

    if (sessionDataItems.length) {
      // TODO: Bug 1953079. Saving the geolocation override in the session data works fine
      // with one session, but when we start supporting multiple BiDi session, we will
      // have to rethink this approach.
      await this.messageHandler.updateSessionData(sessionDataItems);
    }

    await this.#applyOverride({
      async: true,
      callback: this.#applyGeolocationOverride.bind(this),
      category: "geolocation-override",
      contextIds,
      navigables,
      resetValue: null,
      userContextIds,
      value: coordinates,
    });
  }

  /**
   * Set the locale override to the list of top-level navigables
   * or user contexts.
   *
   * @param {object=} options
   * @param {Array<string>=} options.contexts
   *     Optional list of browsing context ids.
   * @param {(string|null)} options.locale
   *     Locale string which have to override
   *     the return result of JavaScript Intl APIs.
   *     Null value resets the override.
   * @param {Array<string>=} options.userContexts
   *     Optional list of user context ids.
   *
   * @throws {InvalidArgumentError}
   *     Raised if an argument is of an invalid type or value.
   * @throws {NoSuchFrameError}
   *     If the browsing context cannot be found.
   * @throws {NoSuchUserContextError}
   *     Raised if the user context id could not be found.
   */
  async setLocaleOverride(options = {}) {
    const {
      contexts: contextIds = null,
      locale: localeArg,
      userContexts: userContextIds = null,
    } = options;

    let locale;
    if (localeArg === null) {
      // The API requires an empty string to reset the override.
      locale = "";
    } else {
      locale = lazy.assert.string(
        localeArg,
        lazy.pprint`Expected "locale" to be a string, got ${localeArg}`
      );

      // Validate if locale is a structurally valid language tag.
      try {
        Intl.getCanonicalLocales(localeArg);
      } catch (err) {
        if (err instanceof RangeError) {
          throw new lazy.error.InvalidArgumentError(
            `Expected "locale" to be a structurally valid language tag (e.g., "en-GB"), got ${localeArg}`
          );
        }

        throw err;
      }
    }

    const { navigables, userContexts } = this.#getEmulationTargets(
      contextIds,
      userContextIds
    );

    const sessionDataItems = this.#generateSessionDataUpdate({
      category: "locale-override",
      contextOverride: contextIds !== null,
      hasGlobalOverride: false,
      navigables,
      resetValue: "",
      userContexts,
      userContextOverride: userContextIds !== null,
      value: locale,
    });

    if (sessionDataItems.length) {
      // TODO: Bug 1953079. Saving the locale override in the session data works fine
      // with one session, but when we start supporting multiple BiDi session, we will
      // have to rethink this approach.
      await this.messageHandler.updateSessionData(sessionDataItems);
    }

    await this.#applyOverride({
      async: true,
      callback: this.#setLocaleForBrowsingContext.bind(this),
      category: "locale-override",
      contextIds,
      navigables,
      userContextIds,
      value: locale,
    });
  }

  /**
   * Used as an argument for emulation.setScreenOrientationOverride command
   * to represent an object which holds screen orientation settings which
   * should override screen settings.
   *
   * @typedef {object} ScreenOrientation
   *
   * @property {ScreenOrientationNatural} natural
   * @property {ScreenOrientationType} type
   */

  /**
   * Set the screen orientation override to the list of
   * top-level navigables or user contexts.
   *
   * @param {object=} options
   * @param {Array<string>=} options.contexts
   *     Optional list of browsing context ids.
   * @param {(ScreenOrientation|null)} options.screenOrientation
   *     Screen orientation object which have to override
   *     screen settings.
   *     Null value resets the override.
   * @param {Array<string>=} options.userContexts
   *     Optional list of user context ids.
   *
   * @throws {InvalidArgumentError}
   *     Raised if an argument is of an invalid type or value.
   * @throws {NoSuchFrameError}
   *     If the browsing context cannot be found.
   * @throws {NoSuchUserContextError}
   *     Raised if the user context id could not be found.
   */
  async setScreenOrientationOverride(options = {}) {
    const {
      contexts: contextIds = null,
      screenOrientation,
      userContexts: userContextIds = null,
    } = options;

    let orientationOverride;

    if (screenOrientation !== null) {
      lazy.assert.object(
        screenOrientation,
        lazy.pprint`Expected "screenOrientation" to be an object or null, got ${screenOrientation}`
      );

      const { natural, type } = screenOrientation;

      const naturalValues = Object.keys(SCREEN_ORIENTATION_VALUES_LISTS);

      lazy.assert.in(
        natural,
        naturalValues,
        `Expected "screenOrientation.natural" to be one of ${naturalValues},` +
          lazy.pprint`got ${natural}`
      );

      const orientationTypes = Object.keys(
        SCREEN_ORIENTATION_VALUES_LISTS[natural]
      );

      lazy.assert.in(
        type,
        orientationTypes,
        lazy.pprint`Expected "screenOrientation.type" to be one of ${orientationTypes}` +
          lazy.pprint`got ${type}`
      );

      const angle = SCREEN_ORIENTATION_VALUES_LISTS[natural][type];

      orientationOverride = { angle, type };
    } else {
      orientationOverride = null;
    }

    const { navigables, userContexts } = this.#getEmulationTargets(
      contextIds,
      userContextIds
    );

    const sessionDataItems = this.#generateSessionDataUpdate({
      category: "screen-orientation-override",
      contextOverride: contextIds !== null,
      hasGlobalOverride: false,
      navigables,
      resetValue: null,
      userContexts,
      userContextOverride: userContextIds !== null,
      value: orientationOverride,
    });

    if (sessionDataItems.length) {
      // TODO: Bug 1953079. Saving the screen orientation override in the session data works fine
      // with one session, but when we start supporting multiple BiDi session, we will
      // have to rethink this approach.
      await this.messageHandler.updateSessionData(sessionDataItems);
    }

    this.#applyOverride({
      callback: setScreenOrientationOverrideForBrowsingContext,
      category: "screen-orientation-override",
      contextIds,
      navigables,
      resetValue: null,
      userContextIds,
      value: orientationOverride,
    });
  }

  /**
   * Used as an argument for emulation.setScreenSettingsOverride command
   * to represent an object which holds screen area settings which
   * should override screen dimensions.
   *
   * @typedef {object} ScreenArea
   *
   * @property {number} height
   * @property {number} width
   */

  /**
   * Set the screen settings override to the list of top-level navigables
   * or user contexts.
   *
   * @param {object=} options
   * @param {Array<string>=} options.contexts
   *     Optional list of browsing context ids.
   * @param {(ScreenArea|null)} options.screenArea
   *     An object which has to override
   *     the return result of JavaScript APIs which return
   *     screen dimensions. Null value resets the override.
   * @param {Array<string>=} options.userContexts
   *     Optional list of user context ids.
   *
   * @throws {InvalidArgumentError}
   *     Raised if an argument is of an invalid type or value.
   * @throws {NoSuchFrameError}
   *     If the browsing context cannot be found.
   * @throws {NoSuchUserContextError}
   *     Raised if the user context id could not be found.
   */
  async setScreenSettingsOverride(options = {}) {
    const {
      contexts: contextIds = null,
      screenArea,
      userContexts: userContextIds = null,
    } = options;

    if (screenArea !== null) {
      lazy.assert.object(
        screenArea,
        lazy.pprint`Expected "screenArea" to be an object, got ${screenArea}`
      );

      const { height, width } = screenArea;
      lazy.assert.positiveNumber(
        height,
        lazy.pprint`Expected "screenArea.height" to be a positive number, got ${height}`
      );
      lazy.assert.positiveNumber(
        width,
        lazy.pprint`Expected "screenArea.width" to be a positive number, got ${width}`
      );
    }

    const { navigables, userContexts } = this.#getEmulationTargets(
      contextIds,
      userContextIds
    );

    const sessionDataItems = this.#generateSessionDataUpdate({
      category: "screen-settings-override",
      contextOverride: contextIds !== null,
      hasGlobalOverride: false,
      navigables,
      resetValue: null,
      userContexts,
      userContextOverride: userContextIds !== null,
      value: screenArea,
    });

    if (sessionDataItems.length) {
      // TODO: Bug 1953079. Saving the locale override in the session data works fine
      // with one session, but when we start supporting multiple BiDi session, we will
      // have to rethink this approach.
      await this.messageHandler.updateSessionData(sessionDataItems);
    }

    this.#applyOverride({
      callback: setScreenSettingsOverrideForBrowsingContext,
      category: "screen-settings-override",
      contextIds,
      navigables,
      resetValue: null,
      userContextIds,
      value: screenArea,
    });
  }

  /**
   * Set the timezone override to the list of top-level navigables
   * or user contexts.
   *
   * @param {object=} options
   * @param {Array<string>=} options.contexts
   *     Optional list of browsing context ids.
   * @param {(string|null)} options.timezone
   *     Timezone string which has to override
   *     the return result of JavaScript Intl/Date APIs.
   *     It can represent timezone id or timezone offset.
   *     Null value resets the override.
   * @param {Array<string>=} options.userContexts
   *     Optional list of user context ids.
   *
   * @throws {InvalidArgumentError}
   *     Raised if an argument is of an invalid type or value.
   * @throws {NoSuchFrameError}
   *     If the browsing context cannot be found.
   * @throws {NoSuchUserContextError}
   *     Raised if the user context id could not be found.
   */
  async setTimezoneOverride(options = {}) {
    let { timezone } = options;
    const { contexts: contextIds = null, userContexts: userContextIds = null } =
      options;

    if (timezone === null) {
      // The API requires an empty string to reset the override.
      timezone = "";
    } else {
      lazy.assert.string(
        timezone,
        lazy.pprint`Expected "timezone" to be a string, got ${timezone}`
      );

      if (
        // Validate if the timezone is on the list of available timezones ids
        !Intl.supportedValuesOf("timeZone").includes(timezone) &&
        // or is a valid timezone offset string.
        !this.#isTimeZoneOffsetString(timezone)
      ) {
        throw new lazy.error.InvalidArgumentError(
          `Expected "timezone" to be a valid timezone ID (e.g., "Europe/Berlin") ` +
            `or a valid timezone offset (e.g., "+01:00"), got ${timezone}`
        );
      }

      if (this.#isTimeZoneOffsetString(timezone)) {
        // The platform API requires a timezone offset to have a "GMT" prefix.
        timezone = `GMT${timezone}`;
      }
    }

    const { navigables, userContexts } = this.#getEmulationTargets(
      contextIds,
      userContextIds
    );

    const sessionDataItems = this.#generateSessionDataUpdate({
      category: "timezone-override",
      contextOverride: contextIds !== null,
      hasGlobalOverride: false,
      navigables,
      resetValue: "",
      userContexts,
      userContextOverride: userContextIds !== null,
      value: timezone,
    });

    if (sessionDataItems.length) {
      // TODO: Bug 1953079. Saving the timezone override in the session data works fine
      // with one session, but when we start supporting multiple BiDi session, we will
      // have to rethink this approach.
      await this.messageHandler.updateSessionData(sessionDataItems);
    }

    await this.#applyOverride({
      async: true,
      callback: this.#setTimezoneOverrideForBrowsingContext.bind(this),
      category: "timezone-override",
      contextIds,
      navigables,
      userContextIds,
      value: timezone,
    });
  }

  /**
   * Set the user agent override to the list of top-level navigables
   * or user contexts.
   *
   * @param {object=} options
   * @param {Array<string>=} options.contexts
   *     Optional list of browsing context ids.
   * @param {(string|null)} options.userAgent
   *     User agent string which has to override
   *     the browser user agent.
   *     Null value resets the override.
   * @param {Array<string>=} options.userContexts
   *     Optional list of user context ids.
   *
   * @throws {InvalidArgumentError}
   *     Raised if an argument is of an invalid type or value.
   * @throws {NoSuchFrameError}
   *     If the browsing context cannot be found.
   * @throws {NoSuchUserContextError}
   *     Raised if the user context id could not be found.
   */
  async setUserAgentOverride(options = {}) {
    const { contexts: contextIds, userContexts: userContextIds } = options;
    let { userAgent } = options;

    if (userAgent === null) {
      // The API requires an empty string to reset the override.
      userAgent = "";
    } else {
      lazy.assert.string(
        userAgent,
        lazy.pprint`Expected "userAgent" to be a string, got ${userAgent}`
      );

      if (userAgent === "") {
        throw new lazy.error.UnsupportedOperationError(
          `Overriding "userAgent" to an empty string is not supported`
        );
      }
    }

    if (contextIds !== undefined && userContextIds !== undefined) {
      throw new lazy.error.InvalidArgumentError(
        `Providing both "contexts" and "userContexts" arguments is not supported`
      );
    }

    const navigables = new Set();
    const userContexts = new Set();
    if (contextIds !== undefined) {
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
    } else if (userContextIds !== undefined) {
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
    } else {
      lazy.TabManager.getBrowsers().forEach(browser =>
        navigables.add(browser.browsingContext)
      );
    }

    const sessionDataItems = this.#generateSessionDataUpdate({
      category: "user-agent-override",
      contextOverride: contextIds !== undefined,
      hasGlobalOverride: true,
      navigables,
      resetValue: "",
      userContexts,
      userContextOverride: userContextIds !== undefined,
      value: userAgent,
    });

    if (sessionDataItems.length) {
      // TODO: Bug 1953079. Saving the user agent override in the session data works fine
      // with one session, but when we start supporting multiple BiDi session, we will
      // have to rethink this approach.
      await this.messageHandler.updateSessionData(sessionDataItems);
    }

    this.#applyOverride({
      callback: setUserAgentOverrideForBrowsingContext,
      category: "user-agent-override",
      contextIds,
      navigables,
      userContextIds,
      value: userAgent,
    });
  }

  /**
   * Apply the geolocation override to the top-level browsing context.
   *
   * @param {object} options
   * @param {BrowsingContext} options.context
   *     Top-level browsing context object which is a target
   *     for the geolocation override.
   * @param {(GeolocationCoordinates|null)} options.value
   *     Geolocation coordinates which have to override
   *     the return result of geolocation APIs.
   *     Null value resets the override.
   */
  #applyGeolocationOverride(options) {
    const { context, value } = options;

    return this._forwardToWindowGlobal(
      "_setGeolocationOverride",
      context.id,
      {
        coordinates: value,
      },
      { retryOnAbort: true }
    );
  }

  async #applyOverride(options) {
    const {
      async = false,
      callback,
      category,
      contextIds,
      navigables,
      resetValue = "",
      userContextIds,
      value,
    } = options;

    const commands = [];

    for (const navigable of navigables) {
      const overrideValue = this.#getOverrideValue(
        {
          category,
          context: navigable,
          contextIds,
          userContextIds,
          value,
        },
        resetValue
      );

      if (overrideValue === undefined) {
        continue;
      }

      const commandArgs = {
        context: navigable,
        value: overrideValue,
      };

      if (async) {
        commands.push(callback(commandArgs));
      } else {
        callback(commandArgs);
      }
    }

    if (async) {
      await Promise.all(commands);
    }
  }

  #generateSessionDataUpdate(options) {
    const {
      category,
      contextOverride,
      hasGlobalOverride,
      navigables,
      resetValue,
      userContexts,
      userContextOverride,
      value,
    } = options;
    const sessionDataItems = [];
    const onlyRemoveSessionDataItem = value === resetValue;

    if (userContextOverride) {
      for (const userContext of userContexts) {
        sessionDataItems.push(
          ...this.messageHandler.sessionData.generateSessionDataItemUpdate(
            "_configuration",
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
    } else if (contextOverride) {
      for (const navigable of navigables) {
        sessionDataItems.push(
          ...this.messageHandler.sessionData.generateSessionDataItemUpdate(
            "_configuration",
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
    } else if (hasGlobalOverride) {
      sessionDataItems.push(
        ...this.messageHandler.sessionData.generateSessionDataItemUpdate(
          "_configuration",
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
   * Return value for #getEmulationTargets.
   *
   * @typedef {object} EmulationTargets
   *
   * @property {Set<Navigable>} navigables
   * @property {Set<number>} userContexts
   */

  /**
   * Validates the provided browsing contexts or user contexts and resolves them
   * to a set of navigables.
   *
   * @param {Array<string>|null} contextIds
   *     Optional list of browsing context ids.
   * @param {Array<string>|null} userContextIds
   *     Optional list of user context ids.
   *
   * @returns {EmulationTargets}
   */
  #getEmulationTargets(contextIds, userContextIds) {
    if (contextIds !== null && userContextIds !== null) {
      throw new lazy.error.InvalidArgumentError(
        `Providing both "contexts" and "userContexts" arguments is not supported`
      );
    }

    const navigables = new Set();
    const userContexts = new Set();

    if (contextIds !== null) {
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
    } else if (userContextIds !== null) {
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
    } else {
      throw new lazy.error.InvalidArgumentError(
        `At least one of "contexts" or "userContexts" arguments should be provided`
      );
    }

    return { navigables, userContexts };
  }

  #getOverrideValue(params, resetValue = "") {
    const { category, context, contextIds, userContextIds, value } = params;
    const [overridePerContext, overridePerUserContext, overrideGlobal] =
      this.#findExistingOverrideForContext(category, context);

    if (contextIds) {
      if (value === resetValue) {
        // In case of resetting an override for navigable,
        // if there is an existing override for user context or global,
        // we should apply it to browsing context.
        return overridePerUserContext || overrideGlobal || resetValue;
      }
    } else if (userContextIds) {
      // No need to do anything if there is an override
      // for the browsing context.
      if (overridePerContext) {
        return undefined;
      }

      // In case of resetting an override for user context,
      // apply a global override if it exists
      if (value === resetValue && overrideGlobal) {
        return overrideGlobal;
      }
    } else if (overridePerContext || overridePerUserContext) {
      // No need to do anything if there is an override
      // for the browsing or user context.
      return undefined;
    }

    return value;
  }

  /**
   * Find the existing overrides for a given category and context.
   *
   * @param {string} category
   *     The session data category.
   * @param {BrowsingContext} context
   *     The browsing context.
   *
   * @returns {Array<string>}
   *     Return the list of existing values.
   */
  #findExistingOverrideForContext(category, context) {
    let overrideGlobal, overridePerUserContext, overridePerContext;

    const sessionDataItems =
      this.messageHandler.sessionData.getSessionDataForContext(
        "_configuration",
        category,
        context
      );

    sessionDataItems.forEach(item => {
      switch (item.contextDescriptor.type) {
        case lazy.ContextDescriptorType.All: {
          overrideGlobal = item.value;
          break;
        }
        case lazy.ContextDescriptorType.UserContext: {
          overridePerUserContext = item.value;
          break;
        }
        case lazy.ContextDescriptorType.TopBrowsingContext: {
          overridePerContext = item.value;
          break;
        }
      }
    });

    return [overridePerContext, overridePerUserContext, overrideGlobal];
  }

  /**
   * Validate that a string has timezone offset string format
   * (e.g. `+10:00` or `-05:00`).
   *
   * @see https://tc39.es/ecma262/#sec-time-zone-offset-strings.
   *
   * @param {string} string
   *     The string to validate.
   *
   * @returns {boolean}
   *     Return true if the string has timezone offset string format,
   *     false otherwise.
   */
  #isTimeZoneOffsetString(string) {
    if (string === "" || string === "Z") {
      return false;
    }
    // Random date string is added to validate an offset string.
    return ChromeUtils.isISOStyleDate(`2011-10-05T00:00${string}`);
  }

  /**
   * Set the locale override to the top-level browsing context.
   *
   * @param {object} options
   * @param {BrowsingContext} options.context
   *     Top-level browsing context object which is a target
   *     for the locale override.
   * @param {string} options.value
   *     Locale string which have to override
   *     the return result of JavaScript Intl APIs.
   *     Empty string resets the override.
   */
  async #setLocaleForBrowsingContext(options) {
    const { context, value } = options;

    setLocaleOverrideForBrowsingContext(options);

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

  /**
   * Set the timezone override to the top-level browsing context.
   *
   * @param {object} options
   * @param {BrowsingContext} options.context
   *     Top-level browsing context object which is a target
   *     for the locale override.
   * @param {string} options.value
   *     Timezone string which has to override
   *     the return result of JavaScript Intl/Date APIs.
   *     Empty string value resets the override.
   */
  async #setTimezoneOverrideForBrowsingContext(options) {
    const { context, value } = options;

    setTimezoneOverrideForBrowsingContext(options);

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
}

/**
 * Set the locale override to the top-level browsing context.
 *
 * @param {object} options
 * @param {BrowsingContext} options.context
 *     Top-level browsing context object which is a target
 *     for the locale override.
 * @param {string} options.value
 *     Locale string which have to override
 *     the return result of JavaScript Intl APIs.
 *     Empty string resets the override.
 */
export const setLocaleOverrideForBrowsingContext = options => {
  const { context, value } = options;

  context.languageOverride = value;

  const contextId = lazy.NavigableManager.getIdForBrowsingContext(context);
  lazy.logger.trace(`[${contextId}] Updated locale override to: ${value}`);
};

/**
 * Set the screen orientation override to the top-level browsing context.
 *
 * @param {object} options
 * @param {BrowsingContext} options.context
 *     Top-level browsing context object which is a target
 *     for the screen orientation override.
 * @param {(object|null)} options.value
 *     Screen orientation object which have to override
 *     screen settings.
 *     Null value resets the override.
 */
export const setScreenOrientationOverrideForBrowsingContext = options => {
  const { context, value } = options;
  const contextId = lazy.NavigableManager.getIdForBrowsingContext(context);

  if (value) {
    const { angle, type } = value;
    context.setOrientationOverride(type, angle);

    lazy.logger.trace(
      `[${contextId}] Updated screen orientation override to: ${JSON.stringify(value)}`
    );
  } else {
    context.resetOrientationOverride();

    lazy.logger.trace(`[${contextId}] Reset screen orientation override`);
  }
};

/**
 * Set the screen settings override to the top-level browsing context.
 *
 * @param {object} options
 * @param {BrowsingContext} options.context
 *     Top-level browsing context object which is a target
 *     for the locale override.
 * @param {(ScreenArea|null)} options.value
 *     An object which has to override
 *     the return result of JavaScript APIs which return
 *     screen dimensions. Null value resets the override.
 */
export const setScreenSettingsOverrideForBrowsingContext = options => {
  const { context, value } = options;
  const contextId = lazy.NavigableManager.getIdForBrowsingContext(context);

  if (value === null) {
    context.resetScreenAreaOverride();

    lazy.logger.trace(`[${contextId}] Reset screen settings override`);
  } else {
    const { height, width } = value;
    context.setScreenAreaOverride(width, height);

    lazy.logger.trace(
      `[${contextId}] Updated screen settings override to: ${JSON.stringify(value)}`
    );
  }
};

/**
 * Set the timezone override to the top-level browsing context.
 *
 * @param {object} options
 * @param {BrowsingContext} options.context
 *     Top-level browsing context object which is a target
 *     for the timezone override.
 * @param {string} options.value
 *     Timezone string which has to override
 *     the return result of JavaScript Intl/Date APIs.
 *     Empty string value resets the override.
 */
export const setTimezoneOverrideForBrowsingContext = options => {
  const { context, value } = options;

  context.timezoneOverride = value;

  const contextId = lazy.NavigableManager.getIdForBrowsingContext(context);
  lazy.logger.trace(`[${contextId}] Updated timezone override to: ${value}`);
};

/**
 * Set the user agent override to the top-level browsing context.
 *
 * @param {object} options
 * @param {BrowsingContext} options.context
 *     Top-level browsing context object which is a target
 *     for the user agent override.
 * @param {string} options.value
 *     User agent string which has to override
 *     the browser user agent.
 */
export const setUserAgentOverrideForBrowsingContext = options => {
  const { context, value } = options;
  const contextId = lazy.NavigableManager.getIdForBrowsingContext(context);

  try {
    context.customUserAgent = value;

    lazy.logger.trace(
      `[${contextId}] Updated user agent override to: ${value}`
    );
  } catch (e) {
    lazy.logger.warn(
      `Failed to override user agent for context with id: ${contextId} (${e.message})`
    );
  }
};

export const emulation = EmulationModule;
