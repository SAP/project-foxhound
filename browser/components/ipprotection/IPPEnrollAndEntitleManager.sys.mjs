/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPPProxyManager:
    "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs",
  IPPStartupCache:
    "moz-src:///browser/components/ipprotection/IPPStartupCache.sys.mjs",
  IPProtectionService:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  IPPSignInWatcher:
    "moz-src:///browser/components/ipprotection/IPPSignInWatcher.sys.mjs",
});

const LOG_PREF = "browser.ipProtection.log";

ChromeUtils.defineLazyGetter(lazy, "logConsole", function () {
  return console.createInstance({
    prefix: "IPPEnrollAndEntitleManager",
    maxLogLevel: Services.prefs.getBoolPref(LOG_PREF, false) ? "Debug" : "Warn",
  });
});

/**
 * This class manages the enrolling and entitlement.
 */
class IPPEnrollAndEntitleManagerSingleton extends EventTarget {
  #entitlement = null;

  // Promises to queue enrolling and entitling operations.
  #enrollingPromise = null;
  #entitlementPromise = null;

  constructor() {
    super();

    this.handleEvent = this.#handleEvent.bind(this);
  }

  get entitlement() {
    return this.#entitlement;
  }

  init() {
    // We will use data from the cache until we are fully functional. Then we
    // will recompute the state in `initOnStartupCompleted`.
    this.#entitlement = lazy.IPPStartupCache.entitlement;

    lazy.IPPSignInWatcher.addEventListener(
      "IPPSignInWatcher:StateChanged",
      this.handleEvent
    );
  }

  initOnStartupCompleted() {
    if (!lazy.IPPSignInWatcher.isSignedIn) {
      return;
    }
    // This bit must be async because we want to trigger the updateState at
    // the end of the rest of the initialization.
    this.updateEntitlement();
  }

  uninit() {
    lazy.IPPSignInWatcher.removeEventListener(
      "IPPSignInWatcher:StateChanged",
      this.handleEvent
    );

    this.#entitlement = null;
  }

  #handleEvent(_event) {
    if (!lazy.IPPSignInWatcher.isSignedIn) {
      this.#setEntitlement(null);
      return;
    }
    this.updateEntitlement();
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

    const entitled = await this.#entitle(forceRefetch);
    deferred.resolve(entitled);

    if (entitled?.isEntitled) {
      lazy.IPPProxyManager.refreshUsage();
    }

    this.#entitlementPromise = null;
    return entitled;
  }

  /**
   * Enrolls and entitles the current Firefox account when possible.
   * This is a long-running request that will set isEnrolling while in progress
   * and will only run once until it completes.
   *
   * @param {AbortSignal} [abortSignal=null] - a signal to indicate the process should be aborted
   * @returns {Promise<object>} result
   * @returns {boolean} result.isEnrolledAndEntitled - True if the user is enrolled and entitled.
   * @returns {string} [result.error] - Error message if enrollment or entitlement failed.
   */
  async maybeEnrollAndEntitle(abortSignal = null) {
    if (this.#enrollingPromise) {
      return this.#enrollingPromise;
    }

    let deferred = Promise.withResolvers();
    this.#enrollingPromise = deferred.promise;

    const enrolledAndEntitled = await this.#enrollAndEntitle(abortSignal);
    deferred.resolve(enrolledAndEntitled);
    this.#enrollingPromise = null;

    return enrolledAndEntitled;
  }

  /**
   * Enroll and entitle the current Firefox account.
   *
   * This will attempt to enroll the user if they are not enrolled, and then fetch
   *
   * @param {AbortSignal} abortSignal - a signal to abort the enrollment
   * @returns {Promise<object>} status
   * @returns {boolean} status.isEnrolledAndEntitled - True if the user is enrolled and entitled.
   * @returns {string} [status.error] - Error message if enrollment or entitlement failed.
   */
  async #enrollAndEntitle(abortSignal = null) {
    if (this.#entitlement) {
      return { isEnrolledAndEntitled: true };
    }

    const { enrollment, error: enrollmentError } =
      await IPPEnrollAndEntitleManagerSingleton.#enroll(abortSignal);

    if (enrollmentError || !enrollment) {
      // Unset the entitlement if enrollment failed.
      this.#setEntitlement(null);
      return { isEnrolledAndEntitled: false, error: enrollmentError };
    }

    const { entitlement, error: entitlementError } =
      await IPPEnrollAndEntitleManagerSingleton.#getEntitlement();

    if (entitlementError || !entitlement) {
      // Unset the entitlement if not available.
      this.#setEntitlement(null);
      return { isEnrolledAndEntitled: false, error: entitlementError };
    }

    this.#setEntitlement(entitlement);
    return { isEnrolledAndEntitled: true };
  }

  /**
   * Fetch and update the entitlement.
   *
   * @param {boolean} forceRefetch - If true, will refetch the entitlement even when one is present.
   * @returns {Promise<object>} status
   * @returns {boolean} status.isEntitled - True if the user is entitled.
   * @returns {string} [status.error] - Error message if entitlement fetch failed.
   */
  async #entitle(forceRefetch = false) {
    if (this.#entitlement && !forceRefetch) {
      return { isEntitled: true };
    }

    // Linked does not mean enrolled: it could be that the link comes from a
    // previous MozillaVPN subscription.
    let isLinked =
      await IPPEnrollAndEntitleManagerSingleton.#isLinkedToGuardian(
        !forceRefetch
      );

    if (!isLinked) {
      this.#setEntitlement(null);
      return { isEntitled: false };
    }

    // Enrolling will handle updating the entitlement.
    if (this.#enrollingPromise) {
      return { isEntitled: false };
    }

    let { entitlement, error } =
      await IPPEnrollAndEntitleManagerSingleton.#getEntitlement();

    if (error || !entitlement) {
      this.#setEntitlement(null);
      return { isEntitled: false, error };
    }

    this.#setEntitlement(entitlement);
    return { isEntitled: true };
  }

  // These methods are static because we don't want to change the internal state
  // of the singleton.

  /**
   * Enrolls the current Firefox account with Guardian.
   *
   * Static to avoid changing internal state of the singleton.
   *
   * @param {AbortSignal} [abortSignal=null] - a signal to indicate the enrollment should be aborted
   * @returns {Promise<object>} status
   * @returns {boolean} status.enrollment - True if enrollment succeeded.
   * @returns {string} [status.error] - Error message if enrollment failed.
   */
  static async #enroll(abortSignal = null) {
    try {
      const enrollment = await lazy.IPProtectionService.guardian.enroll(
        "alpha",
        abortSignal
      );
      if (!enrollment?.ok) {
        return { enrollment: null, error: enrollment?.error };
      }
    } catch (error) {
      return { enrollment: null, error: error?.message };
    }
    return { enrollment: true };
  }

  /**
   * Checks if the current Firefox account is linked to Guardian.
   *
   * Static to avoid changing internal state of the singleton.
   *
   * @param {boolean} useCache - If true, will use cached value if available.
   * @returns {Promise<boolean>} - True if linked, false otherwise.
   */
  static async #isLinkedToGuardian(useCache = true) {
    try {
      let isLinked = await lazy.IPProtectionService.guardian.isLinkedToGuardian(
        /* only cache: */ useCache
      );

      return isLinked;
    } catch (_) {
      return false;
    }
  }

  /**
   * Fetches the entitlement for the current Firefox account.
   *
   * Static to avoid changing internal state of the singleton.
   *
   * @returns {Promise<object>} status
   * @returns {object} status.entitlement - The entitlement object.
   * @returns {string} [status.error] - Error message if fetching entitlement failed.
   */
  static async #getEntitlement() {
    try {
      const { status, entitlement, error } =
        await lazy.IPProtectionService.guardian.fetchUserInfo();
      lazy.logConsole.debug("Entitlement:", { status, entitlement, error });

      if (error || !entitlement || status != 200) {
        return { entitlement: null, error: error || `Status: ${status}` };
      }

      return { entitlement };
    } catch (error) {
      return { entitlement: null, error: error.message };
    }
  }

  /**
   * Sets the entitlement and updates the cache and IPProtectionService state.
   *
   * @param {object | null} entitlement - The entitlement object or null to unset.
   */
  #setEntitlement(entitlement) {
    this.#entitlement = entitlement;
    lazy.IPPStartupCache.storeEntitlement(this.#entitlement);

    lazy.IPProtectionService.updateState();

    this.dispatchEvent(
      new CustomEvent("IPPEnrollAndEntitleManager:StateChanged", {
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Checks if we have the entitlement
   */
  get isEnrolledAndEntitled() {
    return !!this.#entitlement;
  }

  /**
   * Checks if a user has upgraded.
   *
   * @returns {boolean}
   */
  get hasUpgraded() {
    return this.#entitlement?.subscribed;
  }

  /**
   * Checks if we're running the Alpha variant based on
   * available features
   */
  get isAlpha() {
    return (
      !this.#entitlement?.autostart &&
      !this.#entitlement?.website_inclusion &&
      !this.#entitlement?.location_controls
    );
  }

  /**
   * Checks if we are currently enrolling.
   */
  get isEnrolling() {
    return !!this.#enrollingPromise;
  }

  /**
   * Waits for the current enrollment to complete, if any.
   */
  async waitForEnrollment() {
    return this.#enrollingPromise;
  }

  /**
   * Refetches the entitlement even if it is cached.
   */
  async refetchEntitlement() {
    await this.updateEntitlement(true);
  }

  /**
   * Unsets any stored entitlement.
   */
  resetEntitlement() {
    this.#setEntitlement(null);
  }
}

const IPPEnrollAndEntitleManager = new IPPEnrollAndEntitleManagerSingleton();

export { IPPEnrollAndEntitleManager };
