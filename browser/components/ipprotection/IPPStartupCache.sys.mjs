/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

/**
 * Type Imports
 *
 * @typedef {import("./GuardianClient.sys.mjs").Entitlement} Entitlement
 * @typedef {import("./GuardianClient.sys.mjs").ProxyUsage} ProxyUsage
 */
ChromeUtils.defineESModuleGetters(lazy, {
  IPProtectionService:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  IPProtectionStates:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  IPPProxyManager:
    "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs",
  Entitlement:
    "moz-src:///browser/components/ipprotection/GuardianClient.sys.mjs",
  ProxyUsage:
    "moz-src:///browser/components/ipprotection/GuardianClient.sys.mjs",
});

const STATE_CACHE_PREF = "browser.ipProtection.stateCache";
const ENTITLEMENT_CACHE_PREF = "browser.ipProtection.entitlementCache";
const LOCATIONLIST_CACHE_PREF = "browser.ipProtection.locationListCache";
const USAGE_CACHE_PREF = "browser.ipProtection.usageCache";
const HAS_UPGRADED_PREF = "browser.ipProtection.hasUpgraded";

/**
 * This class implements a cache for the IPP state machine. The cache is used
 * until we receive the `sessionstore-windows-restored` event
 */
class IPPStartupCacheSingleton {
  #stateFromCache = null;
  #startupCompleted = false;

  constructor() {
    // For XPCShell tests, the cache must be disabled.
    if (
      Services.prefs.getBoolPref("browser.ipProtection.cacheDisabled", false)
    ) {
      this.#startupCompleted = true;
      return;
    }

    this.handleEvent = this.#handleEvent.bind(this);

    const stateFromCache = Services.prefs.getCharPref(
      STATE_CACHE_PREF,
      "unset"
    );
    if (stateFromCache !== "unset") {
      this.#stateFromCache = stateFromCache;
    }

    Services.obs.addObserver(this, "sessionstore-windows-restored");
  }

  init() {
    lazy.IPProtectionService.addEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );
    lazy.IPPProxyManager.addEventListener(
      "IPPProxyManager:UsageChanged",
      this.handleEvent
    );
  }

  async initOnStartupCompleted() {}

  uninit() {
    lazy.IPProtectionService.removeEventListener(
      "IPProtectionService:StateChanged",
      this.handleEvent
    );
    lazy.IPPProxyManager.removeEventListener(
      "IPPProxyManager:UsageChanged",
      this.handleEvent
    );
  }

  get isStartupCompleted() {
    return this.#startupCompleted;
  }

  get state() {
    if (this.#startupCompleted) {
      throw new Error("IPPStartupCache should not be used after the startup");
    }

    if (Object.values(lazy.IPProtectionStates).includes(this.#stateFromCache)) {
      return this.#stateFromCache;
    }

    // This should not happen.
    return lazy.IPProtectionStates.UNINITIALIZED;
  }

  async observe(_subject, topic, _) {
    if (topic !== "sessionstore-windows-restored") {
      return;
    }

    // The browser is ready! Let's invalidate the cache and let's recompute the
    // state.

    Services.obs.removeObserver(this, "sessionstore-windows-restored");
    this.#startupCompleted = true;
    this.#stateFromCache = null;

    await lazy.IPProtectionService.initOnStartupCompleted();
    lazy.IPProtectionService.updateState();
  }

  /**
   * Stores the entitlement in the cache.
   *
   * @param {Entitlement} entitlement
   */
  storeEntitlement(entitlement) {
    if (!entitlement) {
      Services.prefs.setCharPref(ENTITLEMENT_CACHE_PREF, "");
      Services.prefs.setBoolPref(HAS_UPGRADED_PREF, false);
      return;
    }
    if (entitlement instanceof lazy.Entitlement === false) {
      throw new Error(
        "entitlement must be an instance of Entitlement, is " +
          JSON.stringify(entitlement)
      );
    }
    Services.prefs.setCharPref(ENTITLEMENT_CACHE_PREF, entitlement?.toString());
    Services.prefs.setBoolPref(HAS_UPGRADED_PREF, entitlement.subscribed);
  }

  /**
   * Retrieves the entitlement from the cache.
   *
   * @returns {Entitlement|null}
   */
  get entitlement() {
    try {
      const entitlement_string = Services.prefs.getCharPref(
        ENTITLEMENT_CACHE_PREF,
        ""
      );
      return new lazy.Entitlement(JSON.parse(entitlement_string));
    } catch (e) {
      return null;
    }
  }

  storeLocationList(locationList) {
    Services.prefs.setCharPref(
      LOCATIONLIST_CACHE_PREF,
      JSON.stringify(locationList)
    );
  }

  get locationList() {
    try {
      const locationList = Services.prefs.getCharPref(
        LOCATIONLIST_CACHE_PREF,
        ""
      );
      return JSON.parse(locationList);
    } catch (e) {
      return null;
    }
  }

  /**
   * Stores the usage info in the cache.
   *
   * @param {ProxyUsage} usageInfo
   */
  storeUsageInfo(usageInfo) {
    if (!usageInfo) {
      Services.prefs.setCharPref(USAGE_CACHE_PREF, "");
      return;
    }
    if (usageInfo instanceof lazy.ProxyUsage === false) {
      throw new Error(
        "usageInfo must be an instance of ProxyUsage, is " +
          JSON.stringify(usageInfo, (key, value) =>
            typeof value === "bigint" ? JSON.rawJSON(value.toString()) : value
          )
      );
    }
    const serialized = JSON.stringify({
      max: usageInfo.max.toString(),
      remaining: usageInfo.remaining.toString(),
      reset: usageInfo.reset.toString(),
    });
    Services.prefs.setCharPref(USAGE_CACHE_PREF, serialized);
  }

  /**
   * Retrieves the usage info from the cache.
   *
   * @returns {ProxyUsage|null}
   */
  get usageInfo() {
    try {
      const usageInfo_string = Services.prefs.getCharPref(USAGE_CACHE_PREF, "");
      if (!usageInfo_string) {
        return null;
      }
      const data = JSON.parse(usageInfo_string);
      return new lazy.ProxyUsage(data.max, data.remaining, data.reset);
    } catch (e) {
      return null;
    }
  }

  #handleEvent(event) {
    if (event.type === "IPProtectionService:StateChanged") {
      const state = lazy.IPProtectionService.state;
      if (this.#startupCompleted) {
        Services.prefs.setCharPref(STATE_CACHE_PREF, state);
      } else {
        this.#stateFromCache = state;
      }
    } else if (event.type === "IPPProxyManager:UsageChanged") {
      const usageInfo = event.detail.usage;
      this.storeUsageInfo(usageInfo);
    }
  }
}

const IPPStartupCache = new IPPStartupCacheSingleton();

export { IPPStartupCache, IPPStartupCacheSingleton };
