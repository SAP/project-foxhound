/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @typedef {object} LazyModules
 * @property {import("./IPPProxyManager.sys.mjs").IPPProxyManager} IPPProxyManager
 * // ProxyManager
 * @property {import("./IPPProxyManager.sys.mjs").IPPProxyStates} IPPProxyStates
 * // Proxy States
 * @property {import("../../modules/Preferences.sys.mjs").Preferences} Preferences
 * // Pref Service
 */

/** @type {LazyModules} */
const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPPProxyStates:
    "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs",
  IPPProxyManager:
    "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs",
  Preferences: "resource://gre/modules/Preferences.sys.mjs",
});

/**
 * This class monitors the proxy state.
 * When the proxy becomes active it will set prefs temporarily for the session
 * and resets them when the proxy is no longer active.
 */
export class IPPSessionPrefManagerClass {
  #active = false;
  /** @type {Map<string, Function>} */
  #changedPrefs = new Map();
  #observedPrefs;

  /**
   * Get the list of prefs that should be set when the proxy is active.
   */
  static getPrefs() {
    return [["media.peerconnection.ice.proxy_only_if_behind_proxy", true]];
  }
  init() {}

  initOnStartupCompleted() {
    lazy.IPPProxyManager.addEventListener(
      "IPPProxyManager:StateChanged",
      this.#handleStateChange
    );
  }

  uninit() {
    lazy.IPPProxyManager.removeEventListener(
      "IPPProxyManager:StateChanged",
      this.#handleStateChange
    );
    this.stop();
  }

  #handleStateChange = () => {
    if (lazy.IPPProxyManager.state === lazy.IPPProxyStates.ACTIVE) {
      this.start();
      return;
    }
    this.stop();
  };

  start() {
    if (this.#active) {
      return;
    }
    this.#active = true;
    for (let [prefName, prefValue] of this.#observedPrefs) {
      // Do not change user prefs.
      if (lazy.Preferences.isSet(prefName)) {
        continue;
      }
      lazy.Preferences.set(prefName, prefValue);
      // If the user changes the pref, while we have changed it
      // keep the user change, and abort the reset.
      const callback = () => {
        this.#changedPrefs.delete(prefName);
        lazy.Preferences.ignore(prefName, callback);
      };
      this.#changedPrefs.set(prefName, callback);
      lazy.Preferences.observe(prefName, callback);
    }
  }
  stop() {
    if (!this.#active) {
      return;
    }
    this.#active = false;

    for (const [pref, callback] of this.#changedPrefs) {
      lazy.Preferences.reset(pref);
      lazy.Preferences.ignore(pref, callback);
    }
    this.#changedPrefs = new Map();
  }

  constructor(observedPrefs = IPPSessionPrefManagerClass.getPrefs()) {
    this.#observedPrefs = observedPrefs;
  }
}

export const IPPSessionPrefManager = new IPPSessionPrefManagerClass();
