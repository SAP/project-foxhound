/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AppMenuNotifications: "resource://gre/modules/AppMenuNotifications.sys.mjs",
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.sys.mjs",
  BrowserUIUtils: "resource:///modules/BrowserUIUtils.sys.mjs",
  ClientID: "resource://gre/modules/ClientID.sys.mjs",
  CloseRemoteTab: "resource://gre/modules/FxAccountsCommands.sys.mjs",
  FxAccounts: "resource://gre/modules/FxAccounts.sys.mjs",
  UIState: "resource://services-sync/UIState.sys.mjs",
});

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "CLIENT_ASSOCIATION_PING_ENABLED",
  "identity.fxaccounts.telemetry.clientAssociationPing.enabled",
  false
);

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "AlertsService",
  "@mozilla.org/alerts-service;1",
  Ci.nsIAlertsService
);

ChromeUtils.defineLazyGetter(
  lazy,
  "accountsL10n",
  () => new Localization(["browser/accounts.ftl", "branding/brand.ftl"], true)
);

const AlertNotification = Components.Constructor(
  "@mozilla.org/alert-notification;1",
  "nsIAlertNotification",
  "initWithObject"
);

/**
 * Manages Mozilla Account and Sync related functionality
 * needed at startup. It mainly handles various account-related events and notifications.
 *
 * This module was sliced off of BrowserGlue and designed to centralize
 * account-related events/notifications to prevent crowding BrowserGlue
 */
export const AccountsGlue = {
  QueryInterface: ChromeUtils.generateQI([
    "nsIObserver",
    "nsISupportsWeakReference",
  ]),

  init() {
    let os = Services.obs;
    [
      "fxaccounts:onverified",
      "fxaccounts:device_connected",
      "fxaccounts:verify_login",
      "fxaccounts:device_disconnected",
      "fxaccounts:commands:open-uri",
      "fxaccounts:commands:close-uri",
      "sync-ui-state:update",
    ].forEach(topic => os.addObserver(this, topic, true));
  },

  observe(subject, topic, data) {
    switch (topic) {
      case "fxaccounts:onverified":
        this._onThisDeviceConnected();
        break;
      case "fxaccounts:device_connected":
        this._onDeviceConnected(data);
        break;
      case "fxaccounts:verify_login":
        this._onVerifyLoginNotification(JSON.parse(data));
        break;
      case "fxaccounts:device_disconnected":
        data = JSON.parse(data);
        if (data.isLocalDevice) {
          this._onDeviceDisconnected();
        }
        break;
      case "fxaccounts:commands:open-uri":
        this._onDisplaySyncURIs(subject);
        break;
      case "fxaccounts:commands:close-uri":
        this._onIncomingCloseTabCommand(subject);
        break;
      case "sync-ui-state:update": {
        this._updateFxaBadges(
          lazy.BrowserWindowTracker.getTopWindow({
            allowFromInactiveWorkspace: true,
          })
        );

        if (lazy.CLIENT_ASSOCIATION_PING_ENABLED) {
          let fxaState = lazy.UIState.get();
          if (fxaState.status == lazy.UIState.STATUS_SIGNED_IN) {
            Glean.clientAssociation.uid.set(fxaState.uid);
            Glean.clientAssociation.legacyClientId.set(
              lazy.ClientID.getCachedClientID()
            );
          }
        }
        break;
      }
      case "browser-glue-test": // used by tests
        if (data == "mock-alerts-service") {
          // eslint-disable-next-line mozilla/valid-lazy
          Object.defineProperty(lazy, "AlertsService", {
            value: subject.wrappedJSObject,
          });
        }
        break;
    }
  },

  _onThisDeviceConnected() {
    const [title, body] = lazy.accountsL10n.formatValuesSync([
      "account-connection-title-2",
      "account-connection-connected",
    ]);

    let clickCallback = (subject, topic) => {
      if (topic != "alertclickcallback") {
        return;
      }
      this._openPreferences("sync");
    };
    let alert = new AlertNotification({
      title,
      text: body,
      textClickable: true,
    });
    lazy.AlertsService.showAlert(alert, clickCallback);
  },

  _openURLInNewWindow(url, privateTab = false) {
    let urlString = Cc["@mozilla.org/supports-string;1"].createInstance(
      Ci.nsISupportsString
    );
    urlString.data = url;
    let features = "chrome,all,dialog=no";
    if (privateTab) {
      features += ",private";
    }
    return new Promise(resolve => {
      let win = Services.ww.openWindow(
        null,
        AppConstants.BROWSER_CHROME_URL,
        "_blank",
        features,
        urlString
      );
      win.addEventListener(
        "load",
        () => {
          resolve(win);
        },
        { once: true }
      );
    });
  },

  /**
   * Called as an observer when Sync's "display URIs" notification is fired.
   * We open the received URIs in background tabs.
   *
   * @param {object} data
   *        The data passed to the observer notification, which contains
   *        a wrappedJSObject with the URIs to open.
   */
  async _onDisplaySyncURIs(data) {
    try {
      // The payload is wrapped weirdly because of how Sync does notifications.
      const URIs = data.wrappedJSObject.object;

      // privateWin and nonPrivateWin can be null, but it's ok, we'll assign it later in openTab() if needed.
      let privateWin = lazy.BrowserWindowTracker.getTopWindow({
        private: true,
      });
      let nonPrivateWin = lazy.BrowserWindowTracker.getTopWindow({
        private: false,
      });

      const openTab = async URI => {
        let tab;
        let win = URI.private ? privateWin : nonPrivateWin;

        if (!win) {
          win = await this._openURLInNewWindow(URI.uri, URI.private);
          if (URI.private) {
            privateWin = win;
          } else {
            nonPrivateWin = win;
          }
          let tabs = win.gBrowser.tabs;
          tab = tabs[tabs.length - 1];
        } else {
          tab = win.gBrowser.addWebTab(URI.uri);
        }
        tab.attention = true;
        return tab;
      };

      const firstTab = await openTab(URIs[0]);
      await Promise.all(URIs.slice(1).map(URI => openTab(URI)));

      const deviceName = URIs[0].sender && URIs[0].sender.name;
      let titleL10nId, body;
      if (URIs.length == 1) {
        // Due to bug 1305895, tabs from iOS may not have device information, so
        // we have separate strings to handle those cases. (See Also
        // unnamedTabsArrivingNotificationNoDevice.body below)
        titleL10nId = deviceName
          ? {
              id: "account-single-tab-arriving-from-device-title",
              args: { deviceName },
            }
          : { id: "account-single-tab-arriving-title" };
        // Use the page URL as the body. We strip the fragment and query (after
        // the `?` and `#` respectively) to reduce size, and also format it the
        // same way that the url bar would.
        let url = URIs[0].uri.replace(/([?#]).*$/, "$1");
        const wasTruncated = url.length < URIs[0].uri.length;
        url = lazy.BrowserUIUtils.trimURL(url);
        if (wasTruncated) {
          body = await lazy.accountsL10n.formatValue(
            "account-single-tab-arriving-truncated-url",
            { url }
          );
        } else {
          body = url;
        }
      } else {
        titleL10nId = { id: "account-multiple-tabs-arriving-title" };
        const allKnownSender = URIs.every(URI => URI.sender != null);
        const allSameDevice =
          allKnownSender &&
          URIs.every(URI => URI.sender.id == URIs[0].sender.id);
        let bodyL10nId;
        if (allSameDevice) {
          bodyL10nId = deviceName
            ? "account-multiple-tabs-arriving-from-single-device"
            : "account-multiple-tabs-arriving-from-unknown-device";
        } else {
          bodyL10nId = "account-multiple-tabs-arriving-from-multiple-devices";
        }

        body = await lazy.accountsL10n.formatValue(bodyL10nId, {
          deviceName,
          tabCount: URIs.length,
        });
      }
      const title = await lazy.accountsL10n.formatValue(
        titleL10nId.id,
        titleL10nId.args
      );

      const clickCallback = (obsSubject, obsTopic) => {
        if (obsTopic == "alertclickcallback") {
          // We might have opened a tab in a private window, which isn't the focused
          // window - we should focus it before selecting the tab.
          firstTab.ownerGlobal.window.focus();
          firstTab.ownerGlobal.gBrowser.selectedTab = firstTab;
        }
      };

      let alert = new AlertNotification({
        title,
        text: body,
        textClickable: true,
      });
      lazy.AlertsService.showAlert(alert, clickCallback);
    } catch (ex) {
      console.error("Error displaying tab(s) received by Sync: ", ex);
    }
  },

  async _onIncomingCloseTabCommand(data) {
    // The payload is wrapped weirdly because of how Sync does notifications.
    const wrappedObj = data.wrappedJSObject.object;
    let { urls } = wrappedObj[0];
    let urisToClose = [];
    urls.forEach(urlString => {
      try {
        urisToClose.push(Services.io.newURI(urlString));
      } catch (ex) {
        // The url was invalid so we ignore
        console.error(ex);
      }
    });
    // We want to keep track of the tabs we closed for the notification
    // given that there could be duplicates we also closed
    let totalClosedTabs = 0;
    const windows = lazy.BrowserWindowTracker.orderedWindows;

    async function closeTabsInWindows() {
      for (const win of windows) {
        if (!win.gBrowser) {
          continue;
        }
        try {
          const closedInWindow = await win.gBrowser.closeTabsByURI(urisToClose);
          totalClosedTabs += closedInWindow;
        } catch (ex) {
          this.log.error("Error closing tabs in window:", ex);
        }
      }
    }

    await closeTabsInWindows();

    let clickCallback = async (subject, topic) => {
      if (topic == "alertshow") {
        // Keep track of the fact that we showed the notification to
        // the user at least once
        lazy.CloseRemoteTab.hasPendingCloseTabNotification = true;
      }

      // The notification is either turned off or dismissed by user
      if (topic == "alertfinished") {
        // Reset the notification pending flag
        lazy.CloseRemoteTab.hasPendingCloseTabNotification = false;
      }

      if (topic != "alertclickcallback") {
        return;
      }
      let win =
        lazy.BrowserWindowTracker.getTopWindow({ private: false }) ??
        (await lazy.BrowserWindowTracker.promiseOpenWindow());
      // We don't want to open a new tab, instead use the handler
      // to switch to the existing view
      if (win) {
        win.FirefoxViewHandler.openTab("recentlyclosed");
      }
    };

    // Reset the count only if there are no pending notifications
    if (!lazy.CloseRemoteTab.hasPendingCloseTabNotification) {
      lazy.CloseRemoteTab.closeTabNotificationCount = 0;
    }
    lazy.CloseRemoteTab.closeTabNotificationCount += totalClosedTabs;
    const [title, body] = await lazy.accountsL10n.formatValues([
      {
        id: "account-tabs-closed-remotely",
        args: { closedCount: lazy.CloseRemoteTab.closeTabNotificationCount },
      },
      { id: "account-view-recently-closed-tabs" },
    ]);

    try {
      let alert = new AlertNotification({
        title,
        text: body,
        textClickable: true,
        name: "closed-tab-notification",
      });
      lazy.AlertsService.showAlert(alert, clickCallback);
    } catch (ex) {
      console.error("Error notifying user of closed tab(s) ", ex);
    }
  },

  async _onVerifyLoginNotification({ body, title, url }) {
    let tab;
    let win = lazy.BrowserWindowTracker.getTopWindow({ private: false });
    if (!win) {
      win = await this._openURLInNewWindow(url, false);
      let tabs = win.gBrowser.tabs;
      tab = tabs[tabs.length - 1];
    } else {
      tab = win.gBrowser.addWebTab(url);
    }
    tab.attention = true;
    let clickCallback = (subject, topic) => {
      if (topic != "alertclickcallback") {
        return;
      }
      win.gBrowser.selectedTab = tab;
    };

    try {
      let alert = new AlertNotification({
        title,
        body,
        textClickable: true,
      });
      lazy.AlertsService.showAlert(alert, clickCallback);
    } catch (ex) {
      console.error("Error notifying of a verify login event: ", ex);
    }
  },

  _onDeviceConnected(deviceName) {
    const [title, body] = lazy.accountsL10n.formatValuesSync([
      { id: "account-connection-title-2" },
      deviceName
        ? { id: "account-connection-connected-with", args: { deviceName } }
        : { id: "account-connection-connected-with-noname" },
    ]);

    let clickCallback = async (subject, topic) => {
      if (topic != "alertclickcallback") {
        return;
      }
      let url = await lazy.FxAccounts.config.promiseManageDevicesURI(
        "device-connected-notification"
      );
      let win = lazy.BrowserWindowTracker.getTopWindow({ private: false });
      if (!win) {
        this._openURLInNewWindow(url, false);
      } else {
        win.gBrowser.addWebTab(url);
      }
    };

    try {
      let alert = new AlertNotification({
        title,
        text: body,
        textClickable: true,
      });
      lazy.AlertsService.showAlert(alert, clickCallback);
    } catch (ex) {
      console.error("Error notifying of a new Sync device: ", ex);
    }
  },

  _onDeviceDisconnected() {
    const [title, body] = lazy.accountsL10n.formatValuesSync([
      "account-connection-title-2",
      "account-connection-disconnected",
    ]);

    let clickCallback = (subject, topic) => {
      if (topic != "alertclickcallback") {
        return;
      }
      this._openPreferences("sync");
    };

    let alert = new AlertNotification({
      title,
      text: body,
      textClickable: true,
    });
    lazy.AlertsService.showAlert(alert, clickCallback);
  },

  _updateFxaBadges(win) {
    let fxaButton = win.document.getElementById("fxa-toolbar-menu-button");
    let badge = fxaButton?.querySelector(".toolbarbutton-badge");

    let state = lazy.UIState.get();
    if (
      state.status == lazy.UIState.STATUS_LOGIN_FAILED ||
      state.status == lazy.UIState.STATUS_NOT_VERIFIED
    ) {
      // If the fxa toolbar button is in the toolbox, we display the notification
      // on the fxa button instead of the app menu.
      let navToolbox = win.document.getElementById("navigator-toolbox");
      let isFxAButtonShown = navToolbox.contains(fxaButton);
      if (isFxAButtonShown) {
        state.status == lazy.UIState.STATUS_LOGIN_FAILED
          ? fxaButton?.setAttribute("badge-status", state.status)
          : badge?.classList.add("feature-callout");
      } else {
        lazy.AppMenuNotifications.showBadgeOnlyNotification(
          "fxa-needs-authentication"
        );
      }
    } else {
      fxaButton?.removeAttribute("badge-status");
      badge?.classList.remove("feature-callout");
      lazy.AppMenuNotifications.removeNotification("fxa-needs-authentication");
    }
  },

  // Open preferences even if there are no open windows.
  async _openPreferences(...args) {
    let chromeWindow = lazy.BrowserWindowTracker.getTopWindow();
    if (!chromeWindow && AppConstants.platform !== "macosx") {
      // If we're not on macOS, there may be no windows open in this
      // workspace, so open a new one. (the macOS case is handled below)
      //
      // This should get cleaned up in bug 1983081 since openPreferences()
      // shouldn't require a window argument.
      chromeWindow = await lazy.BrowserWindowTracker.promiseOpenWindow();
    }
    if (chromeWindow) {
      chromeWindow.openPreferences(...args);
      return;
    }

    if (AppConstants.platform == "macosx") {
      Services.appShell.hiddenDOMWindow.openPreferences(...args);
    }
  },
};
