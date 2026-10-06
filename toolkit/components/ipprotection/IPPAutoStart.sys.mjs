/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PrivateBrowsingUtils } from "resource://gre/modules/PrivateBrowsingUtils.sys.mjs";
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import { IPPEarlyStartupFilter } from "moz-src:///toolkit/components/ipprotection/IPPEarlyStartupFilter.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPProtectionServerlist:
    "moz-src:///toolkit/components/ipprotection/IPProtectionServerlist.sys.mjs",
  IPPProxyManager:
    "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs",
  IPProtectionService:
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
  IPProtectionStates:
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
});

const AUTOSTART_FEATURE_ENABLE_PREF = "browser.ipProtection.features.autoStart";
const AUTOSTART_PREF = "browser.ipProtection.autoStartEnabled";

/**
 * This class monitors the auto-start pref and if it sees a READY state, it
 * calls `start()`. This is done only if the previous state was not a ACTIVE
 * because, in that case, more likely the VPN on/off state is an user decision.
 */
class IPPAutoStartSingleton {
  #shouldStartWhenReady = false;

  constructor() {
    XPCOMUtils.defineLazyPreferenceGetter(
      this,
      "autoStartPref",
      AUTOSTART_PREF,
      false,
      (_pref, _oldVal, featureEnabled) => {
        if (featureEnabled) {
          this.init();
        } else {
          this.uninit();
        }
      }
    );

    XPCOMUtils.defineLazyPreferenceGetter(
      this,
      "autoStartFeatureEnablePref",
      AUTOSTART_FEATURE_ENABLE_PREF,
      false
    );
  }

  init() {
    if (this.autoStart && !this.handleEvent) {
      this.handleEvent = this.#handleEvent.bind(this);
      this.#shouldStartWhenReady = true;

      lazy.IPProtectionService.addEventListener(
        "IPProtectionService:StateChanged",
        this.handleEvent
      );
    }
  }

  initOnStartupCompleted() {}

  uninit() {
    if (this.handleEvent) {
      lazy.IPProtectionService.removeEventListener(
        "IPProtectionService:StateChanged",
        this.handleEvent
      );

      delete this.handleEvent;
      this.#shouldStartWhenReady = false;
    }
  }

  get autoStart() {
    // We activate the auto-start feature only if the pref is true and we have
    // the serverlist already.
    return (
      this.autoStartFeatureEnablePref &&
      this.autoStartPref &&
      lazy.IPProtectionServerlist.hasList
    );
  }

  #handleEvent(_event) {
    switch (lazy.IPProtectionService.state) {
      case lazy.IPProtectionStates.UNINITIALIZED:
      case lazy.IPProtectionStates.UNAVAILABLE:
      case lazy.IPProtectionStates.UNAUTHENTICATED:
        this.#shouldStartWhenReady = true;
        break;

      case lazy.IPProtectionStates.READY:
        if (this.#shouldStartWhenReady) {
          this.#shouldStartWhenReady = false;
          lazy.IPPProxyManager.start(
            false,
            PrivateBrowsingUtils.permanentPrivateBrowsing
          );
        }
        break;

      default:
        break;
    }
  }
}

const IPPAutoStart = new IPPAutoStartSingleton();

const IPPAutoStartHelpers = [
  IPPAutoStart,
  new IPPEarlyStartupFilter(() => IPPAutoStart.autoStart),
];

export { IPPAutoStartHelpers };
