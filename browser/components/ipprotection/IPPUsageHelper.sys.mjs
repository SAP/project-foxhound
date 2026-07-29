/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { IPPProxyManager } from "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs";
import { BANDWIDTH } from "chrome://browser/content/ipprotection/ipprotection-constants.mjs";
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const BANDWIDTH_WARNING_DISMISSED_PREF =
  "browser.ipProtection.bandwidthWarningDismissedThreshold";
const BANDWIDTH_ENABLED_PREF = "browser.ipProtection.bandwidth.enabled";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  IPProtectionService:
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
  IPProtectionStates:
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
});

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "BANDWIDTH_USAGE_ENABLED",
  BANDWIDTH_ENABLED_PREF,
  true
);

/**
 * @typedef {"none" | "unlimited" | "warning-75-percent" | "warning-90-percent"} UsageState
 * An Object containing instances of UsageState.
 * @typedef {object} UsageStates
 *
 * @property {string} NONE
 *  Usage is below warning thresholds or the quota is exhausted.
 * @property {string} WARNING_75_PERCENT
 *  75% or more of bandwidth has been used.
 * @property {string} WARNING_90_PERCENT
 *  90% or more of bandwidth has been used.
 * @property {string} UNLIMITED
 *  The user has unlimited bandwidth, so there is no usage to track.
 */
export const UsageStates = Object.freeze({
  NONE: "none",
  WARNING_75_PERCENT: "warning-75-percent",
  WARNING_90_PERCENT: "warning-90-percent",
  UNLIMITED: "unlimited",
});

/**
 * Tracks if bandwidth is enabled and usage warning state by listening to IPPProxyManager usage changes.
 *
 * @fires IPPUsageHelperSingleton#"IPPUsageHelper:StateChanged"
 *  When the usage warning state changes. Check the `state` attribute to
 *  know the current state.
 */
class IPPUsageHelperSingleton extends EventTarget {
  /** @type {UsageState} */
  #state = UsageStates.NONE;

  constructor() {
    super();
    this.handleEvent = this.#handleEvent.bind(this);
  }

  /**
   * @returns {UsageState}
   */
  get state() {
    return this.#state;
  }

  init() {
    IPPProxyManager.addEventListener(
      "IPPProxyManager:UsageChanged",
      this.handleEvent
    );
    lazy.IPProtectionService.addEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );
    lazy.IPProtectionService.authProvider.addEventListener(
      "IPPAuthProvider:StateChanged",
      this.handleEvent
    );
  }

  initOnStartupCompleted() {
    this.#checkEntitlement();
  }

  uninit() {
    IPPProxyManager.removeEventListener(
      "IPPProxyManager:UsageChanged",
      this.handleEvent
    );
    lazy.IPProtectionService.removeEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );
    lazy.IPProtectionService.authProvider.removeEventListener(
      "IPPAuthProvider:StateChanged",
      this.handleEvent
    );
    this.#setState(UsageStates.NONE);
  }

  #handleEvent(event) {
    if (event.type === "IPPAuthProvider:StateChanged") {
      this.#checkEntitlement();
      return;
    }

    if (event.type === "IPProtectionService:StateChanged") {
      if (lazy.IPProtectionService.state !== lazy.IPProtectionStates.READY) {
        this.#setState(UsageStates.NONE);
      }
      return;
    }

    if (event.type !== "IPPProxyManager:UsageChanged") {
      return;
    }

    const { usage } = event.detail;
    if (!usage) {
      return;
    }

    this.#setBandwidthEnabled(!usage.unlimited);

    if (usage.unlimited) {
      this.#setState(UsageStates.UNLIMITED);
      return;
    }

    if (usage.max == null || usage.remaining == null) {
      this.#setState(UsageStates.NONE);
      return;
    }

    const max = Number(usage.max);
    const remainingPercent = Number(usage.remaining) / max;

    let newState;
    if (remainingPercent <= BANDWIDTH.THIRD_THRESHOLD) {
      newState = UsageStates.WARNING_90_PERCENT;
    } else if (remainingPercent <= BANDWIDTH.SECOND_THRESHOLD) {
      newState = UsageStates.WARNING_75_PERCENT;
    } else {
      newState = UsageStates.NONE;
    }

    this.#setState(newState);
  }

  getDismissedThresholds() {
    try {
      const prefValue = Services.prefs.getStringPref(
        BANDWIDTH_WARNING_DISMISSED_PREF,
        ""
      );
      if (!prefValue) {
        return { infobar: 0, panel: 0 };
      }
      const obj = JSON.parse(prefValue);
      return {
        infobar: typeof obj.infobar === "number" ? obj.infobar : 0,
        panel: typeof obj.panel === "number" ? obj.panel : 0,
      };
    } catch {
      return { infobar: 0, panel: 0 };
    }
  }

  setDismissedThresholds(obj) {
    Services.prefs.setStringPref(
      BANDWIDTH_WARNING_DISMISSED_PREF,
      JSON.stringify(obj)
    );
  }

  #checkEntitlement() {
    const limitedBandwidth =
      lazy.IPProtectionService.authProvider.entitlement?.limitedBandwidth ??
      true;
    this.#setBandwidthEnabled(limitedBandwidth);
    if (!limitedBandwidth) {
      this.#setState(UsageStates.UNLIMITED);
    } else if (this.#state === UsageStates.UNLIMITED) {
      this.#setState(UsageStates.NONE);
    }
  }

  #setBandwidthEnabled(enabled) {
    if (lazy.BANDWIDTH_USAGE_ENABLED !== enabled) {
      Services.prefs.setBoolPref(BANDWIDTH_ENABLED_PREF, enabled);
    }
  }

  #setState(state) {
    if (state === this.#state) {
      return;
    }
    this.#state = state;
    this.dispatchEvent(
      new CustomEvent("IPPUsageHelper:StateChanged", {
        bubbles: true,
        composed: true,
        detail: { state },
      })
    );
  }
}

const IPPUsageHelper = new IPPUsageHelperSingleton();

export { IPPUsageHelper };
