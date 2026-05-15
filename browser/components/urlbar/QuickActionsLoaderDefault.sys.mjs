/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ActionsProviderQuickActions:
    "moz-src:///browser/components/urlbar/ActionsProviderQuickActions.sys.mjs",
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.sys.mjs",
  DevToolsShim: "chrome://devtools-startup/content/DevToolsShim.sys.mjs",
  ResetProfile: "resource://gre/modules/ResetProfile.sys.mjs",
  ScreenshotsUtils: "resource:///modules/ScreenshotsUtils.sys.mjs",
  TranslationsParent: "resource://gre/actors/TranslationsParent.sys.mjs",
  UrlbarUtils: "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logger", () =>
  lazy.UrlbarUtils.getLogger({ prefix: "QuickActions" })
);

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

if (AppConstants.MOZ_UPDATER) {
  XPCOMUtils.defineLazyServiceGetter(
    lazy,
    "AUS",
    "@mozilla.org/updates/update-service;1",
    Ci.nsIApplicationUpdateService
  );
}

let openUrlFun = url => () => openUrl(url);
let openUrl = url => {
  let window = lazy.BrowserWindowTracker.getTopWindow({
    allowFromInactiveWorkspace: true,
  });

  if (url.startsWith("about:")) {
    window.switchToTabHavingURI(Services.io.newURI(url), true, {
      ignoreFragment: "whenComparing",
    });
  } else {
    window.gBrowser.addTab(url, {
      inBackground: false,
      triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
    });
  }
  return { focusContent: true };
};

let openAddonsUrl = url => {
  return () => {
    // bug 1983835 - should this only look for windows on the current
    // workspace?
    let window = lazy.BrowserWindowTracker.getTopWindow({
      allowFromInactiveWorkspace: true,
    });
    window.BrowserAddonUI.openAddonsMgr(url, { selectTabByViewId: true });
  };
};

// bug 1983835 - should this only look for windows on the current
// workspace?
let currentBrowser = () =>
  lazy.BrowserWindowTracker.getTopWindow({ allowFromInactiveWorkspace: true })
    ?.gBrowser.selectedBrowser;
// bug 1983835 - should this only look for windows on the current
// workspace?
let currentTab = () =>
  lazy.BrowserWindowTracker.getTopWindow({ allowFromInactiveWorkspace: true })
    ?.gBrowser.selectedTab;

ChromeUtils.defineLazyGetter(lazy, "gFluentStrings", function () {
  return new Localization(
    [
      "branding/brand.ftl",
      "browser/browser.ftl",
      "toolkit/branding/brandings.ftl",
    ],
    true
  );
});

const DEFAULT_ACTIONS = {
  addons: {
    l10nCommands: ["quickactions-cmd-addons3"],
    icon: "chrome://mozapps/skin/extensions/category-extensions.svg",
    label: "quickactions-addons",
    onPick: openAddonsUrl("addons://discover/"),
  },
  bookmarks: {
    l10nCommands: ["quickactions-cmd-bookmarks", "quickactions-bookmarks2"],
    icon: "chrome://browser/skin/bookmark.svg",
    label: "quickactions-bookmarks2",
    onPick: () => {
      lazy.BrowserWindowTracker.getTopWindow({
        allowFromInactiveWorkspace: true,
      }).top.PlacesCommandHook.showPlacesOrganizer("BookmarksToolbar");
    },
  },
  clear: {
    l10nCommands: [
      "quickactions-cmd-clearrecenthistory",
      "quickactions-clearrecenthistory",
    ],
    label: "quickactions-clearrecenthistory",
    onPick: () => {
      lazy.BrowserWindowTracker.getTopWindow({
        allowFromInactiveWorkspace: true,
      })
        .document.getElementById("Tools:Sanitize")
        .doCommand();
    },
  },
  downloads: {
    l10nCommands: ["quickactions-cmd-downloads"],
    icon: "chrome://browser/skin/downloads/downloads.svg",
    label: "quickactions-downloads2",
    onPick: openUrlFun("about:downloads"),
  },
  extensions: {
    l10nCommands: ["quickactions-cmd-extensions2"],
    icon: "chrome://mozapps/skin/extensions/category-extensions.svg",
    label: "quickactions-extensions",
    onPick: openAddonsUrl("addons://list/extension"),
  },
  help: {
    l10nCommands: ["quickactions-cmd-help"],
    icon: "chrome://global/skin/icons/help.svg",
    label: "quickactions-help",
    onPick: openUrlFun(
      "https://support.mozilla.org/products/firefox?as=u&utm_source=inproduct"
    ),
  },
  firefoxview: {
    l10nCommands: ["quickactions-cmd-firefoxview"],
    icon: "chrome://browser/skin/firefox-view.svg",
    label: "quickactions-firefoxview",
    onPick: () => {
      lazy.BrowserWindowTracker.getTopWindow({
        allowFromInactiveWorkspace: true,
      }).FirefoxViewHandler.openTab();
    },
  },
  inspect: {
    l10nCommands: ["quickactions-cmd-inspector2"],
    icon: "chrome://devtools/skin/images/open-inspector.svg",
    label: "quickactions-inspector2",
    isVisible: () => {
      // The inspect action is available if:
      // 1. DevTools is enabled.
      // 2. The user can be considered as a DevTools user.
      // 3. The url is not about:devtools-toolbox.
      // 4. The inspector is not opened yet on the page.
      return (
        lazy.DevToolsShim.isEnabled() &&
        lazy.DevToolsShim.isDevToolsUser() &&
        !currentBrowser()?.currentURI.spec.startsWith(
          "about:devtools-toolbox"
        ) &&
        !lazy.DevToolsShim.hasToolboxForTab(currentTab())
      );
    },
    onPick: openInspector,
  },
  logins: {
    l10nCommands: ["quickactions-cmd-logins"],
    label: "quickactions-logins2",
    onPick: openUrlFun("about:logins"),
  },
  print: {
    l10nCommands: ["quickactions-cmd-print"],
    label: "quickactions-print2",
    icon: "chrome://global/skin/icons/print.svg",
    isVisible: () => {
      return Services.prefs.getBoolPref("print.enabled");
    },
    onPick: () => {
      lazy.BrowserWindowTracker.getTopWindow({
        allowFromInactiveWorkspace: true,
      })
        .document.getElementById("cmd_print")
        .doCommand();
    },
  },
  private: {
    l10nCommands: ["quickactions-cmd-private"],
    label: "quickactions-private2",
    icon: "chrome://global/skin/icons/indicator-private-browsing.svg",
    onPick: () => {
      lazy.BrowserWindowTracker.getTopWindow({
        allowFromInactiveWorkspace: true,
      }).OpenBrowserWindow({
        private: true,
      });
    },
  },
  refresh: {
    l10nCommands: ["quickactions-cmd-refresh"],
    label: "quickactions-refresh",
    isVisible: () => lazy.ResetProfile.resetSupported(),
    onPick: () => {
      lazy.ResetProfile.openConfirmationDialog(
        lazy.BrowserWindowTracker.getTopWindow({
          allowFromInactiveWorkspace: true,
        })
      );
    },
  },
  restart: {
    l10nCommands: ["quickactions-cmd-restart"],
    label: "quickactions-restart",
    onPick: restartBrowser,
  },
  savepdf: {
    l10nCommands: ["quickactions-cmd-savepdf2"],
    label: "quickactions-savepdf",
    icon: "chrome://global/skin/icons/print.svg",
    isVisible: () => {
      return Services.prefs.getBoolPref("print.enabled");
    },
    onPick: () => {
      // This writes over the users last used printer which we
      // should not do. Refactor to launch the print preview with
      // custom settings.
      let win = lazy.BrowserWindowTracker.getTopWindow({
        allowFromInactiveWorkspace: true,
      });
      Cc["@mozilla.org/gfx/printsettings-service;1"]
        .getService(Ci.nsIPrintSettingsService)
        .maybeSaveLastUsedPrinterNameToPrefs(
          win.PrintUtils.SAVE_TO_PDF_PRINTER
        );
      win.PrintUtils.startPrintWindow(
        win.gBrowser.selectedBrowser.browsingContext,
        {}
      );
    },
  },
  screenshot: {
    l10nCommands: ["quickactions-cmd-screenshot2"],
    label: "quickactions-screenshot3",
    icon: "chrome://browser/skin/screenshot.svg",
    isVisible: () => {
      return lazy.ScreenshotsUtils.screenshotsEnabled;
    },
    onPick: () => {
      Services.obs.notifyObservers(
        lazy.BrowserWindowTracker.getTopWindow({
          allowFromInactiveWorkspace: true,
        }),
        "menuitem-screenshot",
        "QuickActions"
      );
      return { focusContent: true };
    },
  },
  settings: {
    l10nCommands: ["quickactions-cmd-settings2"],
    icon: "chrome://global/skin/icons/settings.svg",
    label: "quickactions-settings2",
    onPick: openUrlFun("about:preferences"),
  },
  themes: {
    l10nCommands: ["quickactions-cmd-themes2"],
    icon: "chrome://mozapps/skin/extensions/category-extensions.svg",
    label: "quickactions-themes",
    onPick: openAddonsUrl("addons://list/theme"),
  },
  translate: {
    l10nCommands: ["quickactions-cmd-translate"],
    icon: "chrome://browser/skin/translations.svg",
    label: "quickactions-translate",
    isVisible: () => {
      return (
        lazy.TranslationsParent.AIFeature.isEnabled &&
        Services.prefs.getBoolPref(
          "browser.translations.quickAction.enabled",
          false
        )
      );
    },
    onPick: async () => {
      let url = "about:translations";
      let targetLanguage;

      try {
        targetLanguage =
          await lazy.TranslationsParent.getTopPreferredSupportedToLang();
      } catch (error) {
        lazy.logger.error(error);
      }

      if (targetLanguage) {
        const urlObj = new URL(url);
        const params = new URLSearchParams();
        params.set("trg", targetLanguage);
        urlObj.hash = params.toString();
        url = urlObj.href;
      }

      return openUrl(url);
    },
  },
  update: {
    l10nCommands: ["quickactions-cmd-update"],
    label: "quickactions-update",
    isVisible: () => {
      if (!AppConstants.MOZ_UPDATER) {
        return false;
      }
      return (
        lazy.AUS.currentState == Ci.nsIApplicationUpdateService.STATE_PENDING
      );
    },
    onPick: restartBrowser,
  },
  viewsource: {
    l10nCommands: ["quickactions-cmd-viewsource2"],
    icon: "chrome://global/skin/icons/settings.svg",
    label: "quickactions-viewsource2",
    isVisible: () => currentBrowser()?.currentURI.scheme !== "view-source",
    onPick: () => openUrl("view-source:" + currentBrowser().currentURI.spec),
  },
};

function openInspector() {
  lazy.DevToolsShim.showToolboxForTab(
    lazy.BrowserWindowTracker.getTopWindow({ allowFromInactiveWorkspace: true })
      .gBrowser.selectedTab,
    { toolId: "inspector" }
  );
}

// TODO: We likely want a prompt to confirm with the user that they want to restart
// the browser.
function restartBrowser() {
  // Notify all windows that an application quit has been requested.
  let cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(
    Ci.nsISupportsPRBool
  );
  Services.obs.notifyObservers(
    cancelQuit,
    "quit-application-requested",
    "restart"
  );
  // Something aborted the quit process.
  if (cancelQuit.data) {
    return;
  }
  // If already in safe mode restart in safe mode.
  if (Services.appinfo.inSafeMode) {
    Services.startup.restartInSafeMode(Ci.nsIAppStartup.eAttemptQuit);
  } else {
    Services.startup.quit(
      Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart
    );
  }
}

/**
 * Loads the default QuickActions.
 */
export class QuickActionsLoaderDefault {
  // Track the loading of the QuickActions to ensure they aren't loaded multiple times.
  static #loadedPromise = null;

  static async load() {
    let keys = Object.keys(DEFAULT_ACTIONS);
    for (const key of keys) {
      let actionData = DEFAULT_ACTIONS[key];
      let messages = await lazy.gFluentStrings.formatMessages(
        actionData.l10nCommands.map(id => ({ id }))
      );
      actionData.commands = messages
        .map(({ value }) => value.split(",").map(x => x.trim().toLowerCase()))
        .flat();
      lazy.ActionsProviderQuickActions.addAction(key, actionData);
    }
  }
  static async ensureLoaded() {
    if (!this.#loadedPromise) {
      this.#loadedPromise = this.load();
    }
    await this.#loadedPromise;
  }
}
