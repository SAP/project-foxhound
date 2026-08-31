/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPPAuthProvider:
    "moz-src:///toolkit/components/ipprotection/IPPAuthProvider.sys.mjs",
  IPPNimbusHelper:
    "moz-src:///toolkit/components/ipprotection/IPPNimbusHelper.sys.mjs",
  IPPStartupCache:
    "moz-src:///toolkit/components/ipprotection/IPPStartupCache.sys.mjs",
});

const ENABLED_PREF = "browser.ipProtection.enabled";

/**
 * @typedef {object} IPProtectionStates
 *  List of the possible states of the IPProtectionService.
 * @property {string} UNINITIALIZED
 *  The service has not been initialized yet.
 * @property {string} UNAVAILABLE
 *  The user is not eligible (via nimbus) or still not signed in. No UI is available.
 * @property {string} UNAUTHENTICATED
 *  The user is signed out but eligible (via nimbus). The panel should show the login view.
 * @property {string} READY
 *  Ready to be activated.
 *
 * Note: If you update this list of states, make sure to update the
 * corresponding documentation in the `docs` folder as well.
 */
export const IPProtectionStates = Object.freeze({
  UNINITIALIZED: "uninitialized",
  UNAVAILABLE: "unavailable",
  UNAUTHENTICATED: "unauthenticated",
  READY: "ready",
});

/**
 * A singleton service that manages proxy integration and backend functionality.
 *
 * @fires IPProtectionServiceSingleton#"IPProtectionService:StateChanged"
 *  When the proxy state machine changes state. Check the `state` attribute to
 *  know the current state.
 */
class IPProtectionServiceSingleton extends EventTarget {
  #state = IPProtectionStates.UNINITIALIZED;

  #helpers = [];
  #authProvider = new lazy.IPPAuthProvider();

  /**
   * Returns the state of the service. See the description of the state
   * machine.
   *
   * @returns {string} - the current state from IPProtectionStates.
   */
  get state() {
    return this.#state;
  }

  constructor() {
    super();
    this.updateState = this.#updateState.bind(this);
    this.setState = this.#setState.bind(this);
  }

  /**
   * Sets the list of helpers to be initialized/uninitialized with the service.
   *
   * @param {Array} helpers
   */
  setHelpers(helpers) {
    this.#helpers = helpers;
  }

  get authProvider() {
    return this.#authProvider;
  }

  /**
   * Sets the authentication provider.
   *
   * @param {object} authProvider
   */
  setAuthProvider(authProvider) {
    this.#authProvider = authProvider;
  }

  /**
   * Setups the IPProtectionService if enabled.
   */
  async init() {
    if (
      this.#state !== IPProtectionStates.UNINITIALIZED ||
      !this.featureEnabled
    ) {
      return;
    }

    this.#helpers.forEach(helper => helper.init());

    this.#updateState();

    if (lazy.IPPStartupCache.isStartupCompleted) {
      this.initOnStartupCompleted();
    }
  }

  /**
   * Removes the UI widget.
   */
  uninit() {
    if (this.#state === IPProtectionStates.UNINITIALIZED) {
      return;
    }
    this.#helpers.forEach(helper => helper.uninit());

    this.#setState(IPProtectionStates.UNINITIALIZED);
  }

  async initOnStartupCompleted() {
    await Promise.allSettled(
      this.#helpers.map(helper => helper.initOnStartupCompleted?.())
    );
  }

  /**
   * Recomputes the current state synchronously using the latest helper data.
   * Callers should update their own inputs before invoking this.
   */
  #updateState() {
    this.#setState(this.#computeState());
  }

  /**
   * Checks observed statuses or with Guardian to get the current state.
   *
   * @returns {Promise<IPProtectionStates>}
   */
  #computeState() {
    // The IPP feature is disabled.
    if (!this.featureEnabled) {
      return IPProtectionStates.UNINITIALIZED;
    }

    // Maybe we have to use the cached state, because we are not initialized yet.
    if (!lazy.IPPStartupCache.isStartupCompleted) {
      return lazy.IPPStartupCache.state;
    }

    // If the device is not eligible no UI is shown.
    if (!lazy.IPPNimbusHelper.isEligible) {
      return IPProtectionStates.UNAVAILABLE;
    }

    if (!this.#authProvider.isReady) {
      return IPProtectionStates.UNAUTHENTICATED;
    }

    // The proxy can be activated.
    return IPProtectionStates.READY;
  }

  /**
   * Sets the current state and triggers the state change event if needed.
   *
   * @param {IPProtectionStates} newState
   */
  #setState(newState) {
    if (newState === this.#state) {
      return;
    }

    let prevState = this.#state;
    this.#state = newState;

    this.#stateChanged(newState, prevState);
  }

  /**
   * Handles side effects of a state change and dispatches the StateChanged event.
   *
   * @param {IPProtectionStates} state
   * @param {IPProtectionStates} prevState
   */
  #stateChanged(state, prevState) {
    this.dispatchEvent(
      new CustomEvent("IPProtectionService:StateChanged", {
        bubbles: true,
        composed: true,
        detail: {
          state,
          prevState,
        },
      })
    );
  }
}

const IPProtectionService = new IPProtectionServiceSingleton();

XPCOMUtils.defineLazyPreferenceGetter(
  IPProtectionService,
  "featureEnabled",
  ENABLED_PREF,
  false,
  (_pref, _oldVal, featureEnabled) => {
    // On Android, the embedder controls initialization and teardown via
    // the GeckoView API; the pref observer must not interfere.
    if (Services.appinfo.OS === "Android") {
      return;
    }
    if (featureEnabled) {
      IPProtectionService.init();
    } else {
      IPProtectionService.uninit();
    }
  }
);

export { IPProtectionService };
