/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RootBiDiModule } from "chrome://remote/content/webdriver-bidi/modules/RootBiDiModule.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  assert: "chrome://remote/content/shared/webdriver/Assert.sys.mjs",
  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  Log: "chrome://remote/content/shared/Log.sys.mjs",
  NavigableManager: "chrome://remote/content/shared/NavigableManager.sys.mjs",
  pprint: "chrome://remote/content/shared/Format.sys.mjs",
  RootMessageHandler:
    "chrome://remote/content/shared/messagehandler/RootMessageHandler.sys.mjs",
  SessionDataCategory:
    "chrome://remote/content/shared/messagehandler/sessiondata/SessionData.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logger", () =>
  lazy.Log.get(lazy.Log.TYPES.WEBDRIVER_BIDI)
);

/**
 * @typedef {object} NetworkConditions
 * @property {string} type
 */

/**
 * Enum of possible network conditions.
 *
 * @readonly
 * @enum {NetworkConditionsType}
 */
const NetworkConditionsType = {
  Offline: "offline",
};

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
    const { contexts: contextIds, userContexts: userContextIds } = options;

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

    await this.messageHandler.handleCommand({
      moduleName: "_configuration",
      commandName: "_applyConfigurationParameters",
      destination: { type: lazy.RootMessageHandler.type },
      params: {
        async: true,
        category: lazy.SessionDataCategory.GeolocationOverride,
        contextIds,
        resetValue: null,
        supportsGlobalConfiguration: false,
        userContextIds,
        value: coordinates,
      },
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
      contexts: contextIds,
      locale: localeArg,
      userContexts: userContextIds,
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

    await this.messageHandler.handleCommand({
      moduleName: "_configuration",
      commandName: "_applyConfigurationParameters",
      destination: { type: lazy.RootMessageHandler.type },
      params: {
        async: true,
        category: lazy.SessionDataCategory.LocaleOverride,
        contextIds,
        resetValue: "",
        supportsGlobalConfiguration: false,
        userContextIds,
        value: locale,
      },
    });
  }

  /**
   * Emulates specific network conditions for the provided contexts, user
   * contexts, or globally.
   *
   * @param {object=} options
   * @param {Array<string>=} options.contexts
   *     Optional list of browsing context ids.
   * @param {(NetworkConditions|null)} options.networkConditions
   *     Network conditions to emulate. At the moment only the value
   *     NetworkConditionsOffline is supported.
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
  async setNetworkConditions(options = {}) {
    const {
      contexts: contextIds,
      networkConditions,
      userContexts: userContextIds,
    } = options;

    if (networkConditions !== null) {
      lazy.assert.object(
        networkConditions,
        lazy.pprint`Expected "networkConditions" to be an object, got ${networkConditions}`
      );

      lazy.assert.that(
        conditions => conditions.type === NetworkConditionsType.Offline,
        lazy.pprint`Expected "networkConditions.type" to be "offline", got ${networkConditions.type}`
      )(networkConditions);

      if (networkConditions.type === NetworkConditionsType.Offline) {
        // For offline network conditions, some requests need to be blocked from
        // the beforeRequestSent handler.
        await this.messageHandler.handleCommand({
          moduleName: "network",
          commandName: "_startListeningForNetworkConditionsOffline",
          destination: {
            type: lazy.RootMessageHandler.type,
          },
        });
      }
    }

    await this.messageHandler.handleCommand({
      moduleName: "_configuration",
      commandName: "_applyConfigurationParameters",
      destination: { type: lazy.RootMessageHandler.type },
      params: {
        async: false,
        category: lazy.SessionDataCategory.NetworkConditions,
        contextIds,
        resetValue: null,
        supportsGlobalConfiguration: true,
        userContextIds,
        value: networkConditions,
      },
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
      contexts: contextIds,
      screenOrientation,
      userContexts: userContextIds,
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

    await this.messageHandler.handleCommand({
      moduleName: "_configuration",
      commandName: "_applyConfigurationParameters",
      destination: { type: lazy.RootMessageHandler.type },
      params: {
        async: false,
        category: lazy.SessionDataCategory.ScreenOrientationOverride,
        contextIds,
        resetValue: null,
        supportsGlobalConfiguration: false,
        userContextIds,
        value: orientationOverride,
      },
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
      contexts: contextIds,
      screenArea,
      userContexts: userContextIds,
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

    await this.messageHandler.handleCommand({
      moduleName: "_configuration",
      commandName: "_applyConfigurationParameters",
      destination: { type: lazy.RootMessageHandler.type },
      params: {
        async: false,
        category: lazy.SessionDataCategory.ScreenSettingsOverride,
        contextIds,
        resetValue: null,
        supportsGlobalConfiguration: false,
        userContextIds,
        value: screenArea,
      },
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
    const { contexts: contextIds, userContexts: userContextIds } = options;

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

    await this.messageHandler.handleCommand({
      moduleName: "_configuration",
      commandName: "_applyConfigurationParameters",
      destination: { type: lazy.RootMessageHandler.type },
      params: {
        async: true,
        category: lazy.SessionDataCategory.TimezoneOverride,
        contextIds,
        resetValue: "",
        supportsGlobalConfiguration: false,
        userContextIds,
        value: timezone,
      },
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

    await this.messageHandler.handleCommand({
      moduleName: "_configuration",
      commandName: "_applyConfigurationParameters",
      destination: { type: lazy.RootMessageHandler.type },
      params: {
        async: false,
        category: lazy.SessionDataCategory.UserAgentOverride,
        contextIds,
        resetValue: "",
        supportsGlobalConfiguration: true,
        userContextIds,
        value: userAgent,
      },
    });
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
 * Update the network conditions for the provided top-level browsing context.
 *
 * @param {object} options
 * @param {BrowsingContext} options.context
 *     Top-level browsing context object for which the network conditions are
 *     updated.
 * @param {NetworkConditions} options.value
 *     The value of the NetworkConditions to enable.
 */
export const setNetworkConditionsForBrowsingContext = options => {
  const { context, value } = options;

  const contextId = lazy.NavigableManager.getIdForBrowsingContext(context);

  if (value?.type === NetworkConditionsType.Offline) {
    context.forceOffline = true;
    lazy.logger.trace(`[${contextId}] Updated network conditions to "offline"`);
  } else {
    context.forceOffline = false;
    lazy.logger.trace(`[${contextId}] Restored network conditions to default`);
  }
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
