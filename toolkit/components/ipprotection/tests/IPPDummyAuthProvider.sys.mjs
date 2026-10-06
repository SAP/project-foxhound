/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { IPPAuthProvider } from "moz-src:///toolkit/components/ipprotection/IPPAuthProvider.sys.mjs";

const BANDWIDTH_USAGE_ENABLED_PREF = "browser.ipProtection.bandwidth.enabled";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPProtectionService:
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
});

/**
 * Test-only IPPAuthProvider implementation.
 *
 * State that mirrors a real auth provider (signed-in status, current
 * entitlement, in-progress enrollment) is stored in private fields and
 * manipulated via `simulateSignIn`, `setEntitlement`, `resetEntitlement`
 * and `enroll`.
 *
 * Responses for the outbound/network-shaped methods (`enrollAndEntitle`,
 * `getEntitlement`, `fetchProxyPass`, `fetchProxyUsage`) can be overridden
 * via the matching `set*Response` setters so tests can drive them without
 * wrapping the dummy in sinon.
 */
class IPPDummyAuthProviderSingleton extends IPPAuthProvider {
  #entitlement = null;
  #isEnrolling = false;
  #signedIn = true;
  #enrollResponse = null;
  #getEntitlementResponse = null;
  #proxyPassResponse = null;
  #proxyPassError = null;
  #proxyUsageResponse = null;

  get helpers() {
    return [this];
  }

  #setEntitlement(entitlement) {
    this.#entitlement = entitlement;
    Services.prefs.setBoolPref(
      BANDWIDTH_USAGE_ENABLED_PREF,
      entitlement?.limitedBandwidth ?? true
    );
  }

  init() {}
  initOnStartupCompleted() {
    if (!this.#signedIn) {
      return;
    }
    this.updateEntitlement();
  }
  uninit() {
    this.#entitlement = null;
    this.#signedIn = true;
    this.#isEnrolling = false;
    // Test-configuration responses (#enrollResponse, #getEntitlementResponse,
    // #proxyPass*Response, #proxyPassError) are deliberately *not* cleared:
    // they are seeded once by setupStubs at suite setup, and tests rely on
    // them surviving init/uninit cycles triggered by pref toggles.
  }

  get isReady() {
    return this.#signedIn && !!this.entitlement;
  }

  get hasUpgraded() {
    return this.entitlement?.subscribed ?? false;
  }

  get isEnrolling() {
    return this.#isEnrolling;
  }

  get maxBytes() {
    return this.entitlement?.maxBytes ?? null;
  }

  get entitlement() {
    return this.#entitlement;
  }

  /**
   * Test API: set the dummy's sign-in state. Clears the entitlement on
   * sign-out (mirroring the real provider's behavior on a sign-out
   * transition). Does *not* call IPProtectionService.updateState() — tests
   * that change sign-in state after init should call updateState themselves.
   *
   * @param {boolean} value
   */
  simulateSignIn(value) {
    this.#signedIn = value;
    if (!value) {
      this.#setEntitlement(null);
    }
  }

  async enroll() {
    this.#isEnrolling = true;
    this.dispatchEvent(new CustomEvent("IPPAuthProvider:StateChanged"));
    try {
      const response = await this.enrollAndEntitle();
      if (response?.isEnrolledAndEntitled && response.entitlement) {
        this.#setEntitlement(response.entitlement);
      }
      return {
        isEnrolledAndEntitled: !!response?.isEnrolledAndEntitled,
        error: response?.error ?? null,
      };
    } finally {
      this.#isEnrolling = false;
      lazy.IPProtectionService.updateState();
      this.dispatchEvent(new CustomEvent("IPPAuthProvider:StateChanged"));
    }
  }

  async enrollAndEntitle() {
    return this.#enrollResponse;
  }

  async aboutToStart() {
    return null;
  }

  async checkForUpgrade() {}

  async getEntitlement() {
    return this.#getEntitlementResponse;
  }

  async fetchProxyPass() {
    if (this.#proxyPassError) {
      throw this.#proxyPassError;
    }
    return (
      this.#proxyPassResponse ?? {
        status: 200,
        error: undefined,
        pass: null,
        usage: null,
      }
    );
  }

  async fetchProxyUsage() {
    return this.#proxyUsageResponse;
  }

  /**
   * Test API: override what enrollAndEntitle() resolves to.
   *
   * @param {object|null} response - {isEnrolledAndEntitled, entitlement, error}
   *   or null to make enrollAndEntitle() resolve to null.
   */
  setEnrollResponse(response) {
    this.#enrollResponse = response;
  }

  /**
   * Test API: override what getEntitlement() resolves to.
   *
   * @param {object|null} response - {entitlement, error?} or null to make
   *   getEntitlement() resolve to null.
   */
  setGetEntitlementResponse(response) {
    this.#getEntitlementResponse = response;
  }

  /**
   * Test API: override what fetchProxyPass() resolves to.
   *
   * @param {object|null} response
   */
  setProxyPass(response) {
    this.#proxyPassResponse = response;
  }

  /**
   * Test API: make fetchProxyPass() throw the given error. Pass `null` to
   * restore the normal response path.
   *
   * @param {Error|null} error
   */
  setProxyPassError(error) {
    this.#proxyPassError = error;
  }

  /**
   * Test API: override what fetchProxyUsage() resolves to.
   *
   * @param {object|null} response
   */
  setProxyUsage(response) {
    this.#proxyUsageResponse = response;
  }

  async updateEntitlement() {
    const response = await this.getEntitlement();
    if (response?.entitlement) {
      this.#setEntitlement(response.entitlement);
    }
    lazy.IPProtectionService.updateState();
    this.dispatchEvent(new CustomEvent("IPPAuthProvider:StateChanged"));
    return { isEntitled: !!this.#entitlement, error: null };
  }

  resetEntitlement() {
    this.#setEntitlement(null);
    lazy.IPProtectionService.updateState();
    this.dispatchEvent(new CustomEvent("IPPAuthProvider:StateChanged"));
  }

  /**
   * Test API: set the current entitlement.
   *
   * By default this mirrors the real provider's runtime behaviour and
   * notifies the service (so any state transition propagates to listeners).
   * Pass `{ silent: true }` during test setup, when you only want to seed
   * the initial value without triggering a StateChanged event the test
   * isn't ready to observe yet.
   *
   * @param {object|null} entitlement
   * @param {object} [options]
   * @param {boolean} [options.silent=false]
   */
  setEntitlement(entitlement, { silent = false } = {}) {
    this.#setEntitlement(entitlement);
    if (silent) {
      return;
    }
    lazy.IPProtectionService.updateState();
    this.dispatchEvent(new CustomEvent("IPPAuthProvider:StateChanged"));
  }

  get excludedUrlPrefs() {
    return [];
  }
}

const IPPDummyAuthProvider = new IPPDummyAuthProviderSingleton();

export { IPPDummyAuthProvider, IPPDummyAuthProviderSingleton };
