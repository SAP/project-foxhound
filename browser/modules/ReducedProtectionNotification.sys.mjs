/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  EveryWindow: "resource:///modules/EveryWindow.sys.mjs",
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
});

const NOTIFICATION_VALUE = "reduced-protection-reload";

const PREF = "privacy.reducePageProtection.infobar.enabled.pbmode";

export const ReducedProtectionNotification = {
  _initialized: false,
  _prefObserved: false,
  // Store per browsingContext whether we encountered blocked resources to only show the
  // ReducedProtectionNotification when a reload really would unblock resources
  _blockedTrackers: new WeakSet(),
  // Track browsers where the user triggered a reload that should show the notification.
  _pendingNotification: new WeakSet(),
  // Per tab we only want to show the infobar at maximum once per host to not annoy users.
  // Keep track of hosts, where this infobar already appeared per tab.
  _shownHosts: new WeakMap(),

  observePref() {
    if (this._prefObserved) {
      return;
    }
    this._prefObserved = true;
    Services.prefs.addObserver(PREF, () => {
      if (Services.prefs.getBoolPref(PREF, false)) {
        this.init();
      } else {
        this.uninit();
      }
    });
    if (Services.prefs.getBoolPref(PREF, false)) {
      this.init();
    }
  },

  init() {
    if (this._initialized) {
      return;
    }
    lazy.EveryWindow.registerCallback(
      "reduced-protection-notification",
      win => {
        if (
          lazy.PrivateBrowsingUtils.isWindowPrivate(win) &&
          !lazy.PrivateBrowsingUtils.permanentPrivateBrowsing
        ) {
          win.gBrowser?.addTabsProgressListener(this);
        }
      },
      win => {
        if (
          lazy.PrivateBrowsingUtils.isWindowPrivate(win) &&
          !lazy.PrivateBrowsingUtils.permanentPrivateBrowsing
        ) {
          win.gBrowser?.removeTabsProgressListener(this);
        }
      }
    );
    this._initialized = true;
  },

  uninit() {
    if (!this._initialized) {
      return;
    }
    lazy.EveryWindow.unregisterCallback("reduced-protection-notification");
    this._initialized = false;
    this._blockedTrackers = new WeakSet();
    this._pendingNotification = new WeakSet();
    this._shownHosts = new WeakMap();
  },

  markUserReload(aBrowser) {
    if (this._blockedTrackers.has(aBrowser)) {
      const host = aBrowser.currentURI?.host;
      if (host && !this._shownHosts.get(aBrowser)?.has(host)) {
        this._pendingNotification.add(aBrowser);
      }
    }
  },

  onContentBlockingEvent(aBrowser, aWebProgress, aRequest, aEvent) {
    if (!aWebProgress.isTopLevel) {
      return;
    }
    if (aEvent & Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT) {
      this._blockedTrackers.add(aBrowser);
    }
  },

  onLocationChange(aBrowser, aWebProgress, aRequest, aLocation, aFlags) {
    if (!aWebProgress.isTopLevel) {
      return;
    }
    // Don't do anything when staying on the same page (e.g. clicking an an anchor link)
    if (aFlags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) {
      return;
    }

    // We only want to show the notification if we blocked trackers and
    // user initiated reload through browser UI
    const blockedTrackers = this._blockedTrackers.delete(aBrowser);
    const isPending = this._pendingNotification.delete(aBrowser);
    if (
      aFlags & Ci.nsIWebProgressListener.LOCATION_CHANGE_RELOAD &&
      isPending &&
      blockedTrackers
    ) {
      this.showNotification(aBrowser).catch(e => console.error(e));
    }
  },

  async showNotification(aBrowser) {
    const tabbrowser = aBrowser.getTabBrowser();
    if (!tabbrowser) {
      return;
    }

    const currentURI = aBrowser.currentURI;
    if (!currentURI) {
      return;
    }

    const host = currentURI.host;
    if (this._shownHosts.get(aBrowser)?.has(host)) {
      return;
    }

    const notificationBox = tabbrowser.getNotificationBox(aBrowser);
    if (notificationBox.getNotificationWithValue(NOTIFICATION_VALUE)) {
      return;
    }

    await notificationBox.appendNotification(
      NOTIFICATION_VALUE,
      {
        label: { "l10n-id": "reduced-protection-infobar-message" },
        priority: notificationBox.PRIORITY_INFO_LOW,
      },
      [
        {
          "l10n-id": "reduced-protection-infobar-never-show-button",
          callback: () => {
            Glean.privacyReducedPageProtection.disableClicked.add(1);
            Services.prefs.setBoolPref(PREF, false);
          },
        },
        {
          "l10n-id": "reduced-protection-infobar-reload-button",
          callback: () => {
            Glean.privacyReducedPageProtection.reloadClicked.add(1);
            const scopedPrefs = aBrowser.browsingContext.scopedPrefs;
            if (scopedPrefs) {
              const bc = aBrowser.browsingContext;
              for (const pref of [
                Ci.nsIScopedPrefs.PRIVACY_TRACKINGPROTECTION_ENABLED,
                Ci.nsIScopedPrefs
                  .PRIVACY_TRACKINGPROTECTION_CRYPTOMINING_ENABLED,
                Ci.nsIScopedPrefs
                  .PRIVACY_TRACKINGPROTECTION_FINGERPRINTING_ENABLED,
                Ci.nsIScopedPrefs
                  .PRIVACY_TRACKINGPROTECTION_SOCIALTRACKING_ENABLED,
                Ci.nsIScopedPrefs
                  .PRIVACY_TRACKINGPROTECTION_EMAILTRACKING_ENABLED,
              ]) {
                scopedPrefs.setBoolPrefScoped(pref, bc, false);
              }
            }
            aBrowser.reload();
          },
        },
      ]
    );

    Glean.privacyReducedPageProtection.bannerShown.add(1);

    if (!this._shownHosts.has(aBrowser)) {
      this._shownHosts.set(aBrowser, new Set());
    }
    this._shownHosts.get(aBrowser).add(host);
  },
};
