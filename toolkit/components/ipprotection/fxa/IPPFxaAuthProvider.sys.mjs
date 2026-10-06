/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { IPPFxaBaseAuthProvider } from "moz-src:///toolkit/components/ipprotection/fxa/IPPFxaBaseAuthProvider.sys.mjs";
import { GUARDIAN_EXPERIMENT_TYPE } from "moz-src:///toolkit/components/ipprotection/fxa/GuardianClient.sys.mjs";

const lazy = {};

ChromeUtils.defineLazyGetter(lazy, "fxAccounts", () =>
  ChromeUtils.importESModule(
    "resource://gre/modules/FxAccounts.sys.mjs"
  ).getFxAccountsSingleton()
);
ChromeUtils.defineESModuleGetters(lazy, {
  IPProtectionService:
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
});

const CLIENT_ID_MAP = {
  "http://localhost:3000": "6089c54fdc970aed",
  "https://guardian-dev.herokuapp.com": "64ef9b544a31bca8",
  "https://dev.vpn.nonprod.webservices.mozgcp.net": "64ef9b544a31bca8",
  "https://stage.guardian.nonprod.cloudops.mozgcp.net": "e6eb0d1e856335fc",
  "https://stage.vpn.nonprod.webservices.mozgcp.net": "e6eb0d1e856335fc",
  "https://fpn.firefox.com": "e6eb0d1e856335fc",
  "https://vpn.mozilla.org": "e6eb0d1e856335fc",
};

const GUARDIAN_ENDPOINT_PREF = "browser.ipProtection.guardian.endpoint";
const GUARDIAN_ENDPOINT_DEFAULT = "https://vpn.mozilla.com";

/**
 * FxA implementation of IPPAuthProvider. Handles enrollment via Guardian and
 * FxA-specific proxy bypass rules.
 */
class IPPFxaAuthProviderSingleton extends IPPFxaBaseAuthProvider {
  #enrollAndEntitleFn = null;
  // Promises to queue enrolling and entitling operations.
  #enrollingPromise = null;
  #entitlementPromise = null;

  /**
   * @param {object} [signInWatcher] - Custom sign-in watcher. Defaults to IPPSignInWatcher.
   * @param {Function} [enrollAndEntitleFn] - Custom enroll function. Defaults to the FxA hidden-window flow.
   */
  constructor(signInWatcher = null, enrollAndEntitleFn = null) {
    super(signInWatcher);
    this.#enrollAndEntitleFn =
      enrollAndEntitleFn ??
      IPPFxaAuthProviderSingleton.#defaultEnrollAndEntitle;
  }

  /**
   * @param {AbortSignal} [abortSignal]
   * @returns {Promise<{isEnrolledAndEntitled: boolean, entitlement?: object, error?: string}>}
   */
  async enrollAndEntitle(abortSignal) {
    return this.#enrollAndEntitleFn(
      this.guardian,
      this.getToken.bind(this),
      abortSignal
    );
  }

  static async #defaultEnrollAndEntitle(
    guardian,
    getToken,
    abortSignal = null
  ) {
    try {
      const result = await guardian.enrollWithFxa(
        GUARDIAN_EXPERIMENT_TYPE,
        abortSignal
      );
      if (!result?.ok) {
        return { isEnrolledAndEntitled: false, error: result?.error };
      }
    } catch (error) {
      return { isEnrolledAndEntitled: false, error: error?.message };
    }
    using tokenHandle = await getToken(abortSignal);
    try {
      const { status, entitlement, error } =
        await guardian.fetchUserInfo(tokenHandle);
      if (error || !entitlement || status != 200) {
        return {
          isEnrolledAndEntitled: false,
          error: error || `Status: ${status}`,
        };
      }
      return { isEnrolledAndEntitled: true, entitlement };
    } catch (error) {
      return { isEnrolledAndEntitled: false, error: error?.message };
    }
  }

  /**
   * @param {boolean} [forceRefetch=false]
   * @returns {Promise<{entitlement?: object|null, error?: string}>}
   */
  async getEntitlement(forceRefetch = false) {
    const isLinked = await this.#isLinkedToGuardian(!forceRefetch);
    if (!isLinked) {
      return { entitlement: null };
    }
    return super.getEntitlement();
  }

  async #isLinkedToGuardian(useCache = true) {
    try {
      const endpoint = Services.prefs.getCharPref(
        GUARDIAN_ENDPOINT_PREF,
        GUARDIAN_ENDPOINT_DEFAULT
      );
      const clientId = CLIENT_ID_MAP[new URL(endpoint).origin];
      if (!clientId) {
        return false;
      }
      const cached = await lazy.fxAccounts.listAttachedOAuthClients();
      if (cached.some(c => c.id === clientId)) {
        return true;
      }
      if (useCache) {
        return false;
      }
      const refreshed = await lazy.fxAccounts.listAttachedOAuthClients(true);
      return refreshed.some(c => c.id === clientId);
    } catch (_) {
      return false;
    }
  }

  get helpers() {
    return [this, this.signInWatcher];
  }

  /**
   * Updates the entitlement status.
   * This will run only one fetch at a time, and queue behind any ongoing enrollment.
   *
   * @param {boolean} forceRefetch - If true, will refetch the entitlement even when one is present.
   * @returns {Promise<object>} status
   * @returns {boolean} status.isEntitled - True if the user is entitled.
   * @returns {string} [status.error] - Error message if entitlement fetch failed.
   */
  async updateEntitlement(forceRefetch = false) {
    if (this.#entitlementPromise) {
      return this.#entitlementPromise;
    }

    // Queue behind any ongoing enrollment.
    if (this.#enrollingPromise) {
      await this.#enrollingPromise;
    }

    let deferred = Promise.withResolvers();
    this.#entitlementPromise = deferred.promise;

    // Notify listeners that an entitlement check has started so they can
    // react to isEnrolling becoming true.
    this.dispatchEvent(
      new CustomEvent("IPPAuthProvider:StateChanged", {
        bubbles: true,
        composed: true,
      })
    );

    const entitled = { isEntitled: false, error: null };
    if (this.entitlement && !forceRefetch) {
      entitled.isEntitled = true;
    } else {
      const { entitlement, error } = await this.getEntitlement(forceRefetch);
      if (error) {
        entitled.error = error;
        entitled.isEntitled = !!this.entitlement;
      } else if (entitlement) {
        this.#setEntitlement(entitlement);
        entitled.isEntitled = true;
      } else {
        this.#setEntitlement(null);
      }
    }

    deferred.resolve(entitled);

    this.#entitlementPromise = null;

    // Notify listeners that the entitlement check has completed so they can
    // react to isEnrolling becoming false.
    this.dispatchEvent(
      new CustomEvent("IPPAuthProvider:StateChanged", {
        bubbles: true,
        composed: true,
      })
    );

    return entitled;
  }

  /**
   * Enrolls and entitles the current Firefox account when possible.
   * This is a long-running request that will set isEnrolling while in progress
   * and will only run once until it completes.
   *
   * @returns {Promise<object>} result
   * @returns {boolean} result.isEnrolledAndEntitled - True if the user is enrolled and entitled.
   * @returns {string} [result.error] - Error message if enrollment or entitlement failed.
   */
  async enroll() {
    if (this.#enrollingPromise) {
      return this.#enrollingPromise;
    }

    let deferred = Promise.withResolvers();
    this.#enrollingPromise = deferred.promise;

    this.dispatchEvent(
      new CustomEvent("IPPAuthProvider:StateChanged", {
        bubbles: true,
        composed: true,
      })
    );

    const result = { isEnrolledAndEntitled: false, error: null };
    if (this.entitlement) {
      result.isEnrolledAndEntitled = true;
    } else {
      const { isEnrolledAndEntitled, entitlement, error } =
        await this.enrollAndEntitle();
      if (!isEnrolledAndEntitled) {
        this.#setEntitlement(null);
        result.error = error;
      } else {
        this.#setEntitlement(entitlement ?? null);
        result.isEnrolledAndEntitled = true;
      }
    }

    deferred.resolve(result);
    this.#enrollingPromise = null;

    // By the time enrollingPromise is unset, notify listeners so that they
    // can react to isEnrolling becoming false.
    this.dispatchEvent(
      new CustomEvent("IPPAuthProvider:StateChanged", {
        bubbles: true,
        composed: true,
      })
    );

    return result;
  }

  #setEntitlement(entitlement) {
    this._setEntitlement(entitlement);
    lazy.IPProtectionService.updateState();
    this.dispatchEvent(
      new CustomEvent("IPPAuthProvider:StateChanged", {
        bubbles: true,
        composed: true,
      })
    );
  }

  get isEnrolling() {
    return !!this.#enrollingPromise || !!this.#entitlementPromise;
  }

  async checkForUpgrade() {
    await this.updateEntitlement(true);
  }

  get isReady() {
    // For non authenticated users, we don't know yet their enroll state so the UI
    // is shown and they have to login.
    if (!this.signInWatcher.isSignedIn) {
      return false;
    }

    // If the current account is not enrolled and entitled, the UI is shown and
    // they have to opt-in.
    // If they are currently enrolling, they have already opted-in.
    if (!this.entitlement && !this.#enrollingPromise) {
      return false;
    }

    return true;
  }

  async aboutToStart() {
    let result;
    if (this.#enrollingPromise) {
      result = await this.#enrollingPromise;
    }
    if (!this.entitlement) {
      return { error: result?.error };
    }
    return null;
  }

  resetEntitlement() {
    this.#setEntitlement(null);
  }
}

const IPPFxaAuthProvider = new IPPFxaAuthProviderSingleton();

export { IPPFxaAuthProvider, IPPFxaAuthProviderSingleton };
