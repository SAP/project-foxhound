/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PrivateBrowsingUtils } from "resource://gre/modules/PrivateBrowsingUtils.sys.mjs";
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPProtectionServerlist:
    "moz-src:///browser/components/ipprotection/IPProtectionServerlist.sys.mjs",
  IPPProxyManager:
    "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs",
  IPProtectionService:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  IPProtectionStates:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
});

const AUTOSTART_PREF = "browser.ipProtection.autoStartEnabled";
const USER_ENABLED_PREF = "browser.ipProtection.userEnabled";
const AUTO_RESTORE_PREF = "browser.ipProtection.autoRestoreEnabled";
const RESTORING_ON_STARTUP = "sessionstore-restoring-on-startup";

/**
 * A helper that manages the auto-restore of the VPN connection on session restore.
 * If the user had the VPN active before closing the browser and the session is
 * being restored, this class will start the VPN again once the IPProtectionService
 * reaches the READY state.
 */
export class IPPAutoRestoreSingleton {
  #willRestore = false;
  #hasRestoringObserver = undefined;

  constructor() {
    this.handleEvent = this.#handleEvent.bind(this);

    XPCOMUtils.defineLazyPreferenceGetter(
      this,
      "userEnabled",
      USER_ENABLED_PREF,
      false
    );

    // If auto-start is enabled, auto-restore is not needed.
    XPCOMUtils.defineLazyPreferenceGetter(
      this,
      "autoStartPref",
      AUTOSTART_PREF,
      false
    );

    XPCOMUtils.defineLazyPreferenceGetter(
      this,
      "autoRestorePref",
      AUTO_RESTORE_PREF,
      false
    );
  }

  init() {
    if (!this.autoRestorePref || this.autoStartPref || !this.userEnabled) {
      return;
    }

    lazy.IPProtectionService.addEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );

    Services.obs.addObserver(this, RESTORING_ON_STARTUP);
    this.#hasRestoringObserver = true;
  }

  initOnStartupCompleted() {
    if (this.#willRestore) {
      lazy.IPPProxyManager.start(
        false,
        PrivateBrowsingUtils.permanentPrivateBrowsing
      );
      this.#willRestore = false;
    }
    this.uninit();
  }

  uninit() {
    if (this.#willRestore) {
      this.#cancelChannelFilter();
    }
    lazy.IPProtectionService.removeEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );
    if (this.#hasRestoringObserver) {
      Services.obs.removeObserver(this, RESTORING_ON_STARTUP);
      this.#hasRestoringObserver = undefined;
    }
  }

  get shouldRestore() {
    return lazy.IPProtectionServerlist.hasList && this.userEnabled;
  }

  get willRestore() {
    return this.#willRestore;
  }

  #createChannelFilter() {
    if (!this.shouldRestore) {
      return;
    }
    this.#willRestore = true;
    lazy.IPPProxyManager.createChannelFilter();
  }

  #cancelChannelFilter() {
    this.#willRestore = false;
    lazy.IPPProxyManager.cancelChannelFilter();
  }

  observe(_subject, topic) {
    if (topic !== RESTORING_ON_STARTUP) {
      return;
    }

    // If the cached service state is ready, hold restoring until the
    // proxy is started.
    if (lazy.IPProtectionService.state === lazy.IPProtectionStates.READY) {
      this.#createChannelFilter();
    }

    Services.obs.removeObserver(this, RESTORING_ON_STARTUP);
    this.#hasRestoringObserver = undefined;
  }

  #handleEvent() {
    switch (lazy.IPProtectionService.state) {
      case lazy.IPProtectionStates.UNAVAILABLE:
      case lazy.IPProtectionStates.UNAUTHENTICATED:
        // Proxy cannot be started.
        this.uninit();
        break;

      default:
        break;
    }
  }
}

const IPPAutoRestoreHelper = new IPPAutoRestoreSingleton();

export { IPPAutoRestoreHelper };
