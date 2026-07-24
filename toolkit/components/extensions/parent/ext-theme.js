/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* global windowTracker, EventManager, EventEmitter */

/* eslint-disable complexity */

ChromeUtils.defineESModuleGetters(this, {
  LightweightThemeManager:
    "resource://gre/modules/LightweightThemeManager.sys.mjs",
});

const onUpdatedEmitter = new EventEmitter();

// Represents an empty theme for convenience of use
const emptyTheme = {
  details: { colors: null, images: null, properties: null },
};

let defaultTheme = emptyTheme;
// Map[BrowserWindow -> Theme instance]
let windowOverrides = new WeakMap();

/**
 * Class representing either a global theme affecting all windows or an override on a specific window.
 * Any extension updating the theme with a new global theme will replace the singleton defaultTheme.
 */
class Theme {
  /**
   * Creates a theme instance.
   *
   * @param {object} options
   * @param {string} options.extension Extension that created the theme.
   * @param {Integer} options.windowId The windowId where the theme is applied.
   * @param {object} options.details
   * @param {object} options.darkDetails
   * @param {object} options.experiment
   * @param {object} options.startupData startupData if this is a static theme.
   */
  constructor({
    extension,
    details,
    darkDetails,
    windowId,
    experiment,
    startupData,
  }) {
    this.extension = extension;
    this.details = details;
    this.darkDetails = darkDetails;
    this.windowId = windowId;

    if (startupData?.lwtData) {
      // Parsed theme from a previous load() already available in startupData
      // of parsed theme. We assume that reparsing the theme will yield the same
      // result, and therefore reuse the value of startupData. This is a minor
      // optimization; the more important use of startupData is before startup,
      // by Extension.sys.mjs for LightweightThemeManager.fallbackThemeData.
      //
      // Note: the assumption "yield the same result" is not obviously true: the
      // startupData persists across application updates, so it is possible for
      // a browser update to occur that interprets the static theme differently.
      // In this case we would still be using the old interpretation instead of
      // the new one, until the user disables and re-enables/installs the theme.
      this.lwtData = startupData.lwtData;
      this.experiment = startupData.lwtData.experiment;
    } else {
      // lwtData will be populated by load().
      this.lwtData = null;
      this.experiment = null;
      if (experiment) {
        if (extension.canUseThemeExperiment()) {
          this.experiment = experiment;
        } else {
          const { logger } = this.extension;
          logger.warn("This extension is not allowed to run theme experiments");
          return;
        }
      }
    }
    this.load();
  }

  /**
   * Loads a theme by reading the properties from the extension's manifest.
   * This method will override any currently applied theme.
   */
  load() {
    // this.lwtData is usually null, unless populated from startupData.
    if (!this.lwtData) {
      this.lwtData = LightweightThemeManager.themeDataFrom(
        this.details,
        this.darkDetails,
        this.experiment,
        this.extension.baseURI,
        this.extension.id,
        this.extension.version,
        this.extension.logger
      );
      if (this.extension.type === "theme") {
        // Store the parsed theme in startupData, so it is available early at
        // browser startup, to use as LightweightThemeManager.fallbackThemeData,
        // which is assigned from Extension.sys.mjs to avoid having to wait for
        // this ext-theme.js file to be loaded.
        this.extension.startupData = {
          lwtData: this.lwtData,
        };
        this.extension.saveStartupData();
      }
    }

    if (this.windowId) {
      let browserWindow = windowTracker.getWindow(this.windowId);
      this.lwtData.window = browserWindow.docShell.outerWindowID;
      windowOverrides.set(browserWindow, this);
    } else {
      windowOverrides = new WeakMap();
      defaultTheme = this;
      LightweightThemeManager.fallbackThemeData = this.lwtData;
    }
    onUpdatedEmitter.emit("theme-updated", this.details, this.windowId);

    Services.obs.notifyObservers(
      this.lwtData,
      "lightweight-theme-styling-update"
    );
  }

  static unload(browserWindow) {
    let lwtData = {
      theme: null,
    };

    if (browserWindow) {
      lwtData.window = browserWindow.docShell?.outerWindowID;
      windowOverrides.delete(browserWindow);

      onUpdatedEmitter.emit(
        "theme-updated",
        {},
        windowTracker.getId(browserWindow)
      );
    } else {
      windowOverrides = new WeakMap();
      defaultTheme = emptyTheme;
      LightweightThemeManager.fallbackThemeData = null;

      onUpdatedEmitter.emit("theme-updated", {});
    }

    Services.obs.notifyObservers(lwtData, "lightweight-theme-styling-update");
  }
}

this.theme = class extends ExtensionAPIPersistent {
  PERSISTENT_EVENTS = {
    onUpdated({ fire, context }) {
      let callback = (event, theme, windowId) => {
        if (windowId) {
          // Force access validation for incognito mode by getting the window.
          if (windowTracker.getWindow(windowId, context, false)) {
            fire.async({ theme, windowId });
          }
        } else {
          fire.async({ theme });
        }
      };

      onUpdatedEmitter.on("theme-updated", callback);
      return {
        unregister() {
          onUpdatedEmitter.off("theme-updated", callback);
        },
        convert(_fire, _context) {
          fire = _fire;
          context = _context;
        },
      };
    },
  };

  onManifestEntry() {
    let { extension } = this;
    let { manifest } = extension;

    // Note: only static themes are processed here; extensions with the "theme"
    // permission do not enter this code path.
    defaultTheme = new Theme({
      extension,
      details: manifest.theme,
      darkDetails: manifest.dark_theme,
      experiment: manifest.theme_experiment,
      startupData: extension.startupData,
    });
  }

  onShutdown(isAppShutdown) {
    if (isAppShutdown) {
      return;
    }

    let { extension } = this;
    for (let browserWindow of ChromeUtils.nondeterministicGetWeakMapKeys(
      windowOverrides
    )) {
      let theme = windowOverrides.get(browserWindow);
      if (theme.extension === extension) {
        Theme.unload(browserWindow);
      }
    }

    if (defaultTheme.extension === extension) {
      Theme.unload();
    }
  }

  getAPI(context) {
    let { extension } = context;

    return {
      theme: {
        getCurrent: windowId => {
          // Take last focused window when no ID is supplied.
          if (!windowId) {
            windowId = windowTracker.getId(windowTracker.topWindow);
          }

          const browserWindow = windowTracker.getWindow(windowId, context);
          if (windowOverrides.has(browserWindow)) {
            return Promise.resolve(windowOverrides.get(browserWindow).details);
          }

          return Promise.resolve(defaultTheme.details);
        },
        update: (windowId, details) => {
          if (windowId) {
            const browserWindow = windowTracker.getWindow(windowId, context);
            if (!browserWindow) {
              return Promise.reject(`Invalid window ID: ${windowId}`);
            }
          }

          new Theme({
            extension,
            details,
            windowId,
            experiment: this.extension.manifest.theme_experiment,
          });
        },
        reset: windowId => {
          if (windowId) {
            const browserWindow = windowTracker.getWindow(windowId, context);
            const theme = windowOverrides.get(browserWindow) || defaultTheme;
            if (theme.extension === extension) {
              Theme.unload(browserWindow);
            }
            return;
          }

          if (defaultTheme.extension === extension) {
            Theme.unload();
          }
        },
        onUpdated: new EventManager({
          context,
          module: "theme",
          event: "onUpdated",
          extensionApi: this,
        }).api(),
      },
    };
  }
};
