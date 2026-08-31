/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Base class for IPProtection authentication providers.
 *
 * Subclasses should override all methods to provide a real implementation.
 * The default implementations are safe no-ops that keep the service in an
 * unauthenticated/inactive state.
 */
export class IPPAuthProvider extends EventTarget {
  /** Returns whether the user is authenticated and ready to use the proxy. */
  get isReady() {
    return false;
  }

  /** Returns whether the user has a VPN subscription. */
  get hasUpgraded() {
    return false;
  }

  /** Returns true while enrollment or entitlement checks are in progress. */
  get isEnrolling() {
    return false;
  }

  /** Returns the maximum bytes allowed for the current entitlement, or null if unknown. */
  get maxBytes() {
    return null;
  }

  /**
   * Checks whether the user has upgraded their subscription since the last
   * known state and updates accordingly.
   *
   * @returns {Promise<void>}
   */
  async checkForUpgrade() {}

  /**
   * Enrolls and entitles the user.
   *
   * @returns {Promise<{isEnrolledAndEntitled: boolean, error?: string}>}
   */
  async enroll() {
    throw new Error("enroll() must be implemented by subclasses");
  }

  /**
   * Called before the proxy starts. Should resolve enrollment and verify
   * entitlement. Returns an error object if the proxy should not start,
   * or null if everything is in order.
   *
   * @returns {Promise<{error?: string} | null>}
   */
  async aboutToStart() {
    return { error: "no_auth_provider" };
  }

  /**
   * Fetches a new VPN node pass from the auth provider.
   *
   * @param {AbortSignal} [_abortSignal]
   * @returns {Promise<{pass?: import("./GuardianTypes.sys.mjs").ProxyPass, usage?: import("./GuardianTypes.sys.mjs").ProxyUsage|null, status?: number, error?: string}>}
   */
  async fetchProxyPass(_abortSignal) {
    return { error: "no_auth_provider" };
  }

  /**
   * Fetches the current VPN node usage without requesting a new pass.
   *
   * @param {AbortSignal} [_abortSignal]
   * @returns {Promise<import("./GuardianTypes.sys.mjs").ProxyUsage | null>}
   */
  async fetchProxyUsage(_abortSignal) {
    return null;
  }

  /**
   * Preference names whose values are URLs that should bypass the proxy.
   * Subclasses should override this to add auth-provider-specific exclusions.
   *
   * @returns {string[]}
   */
  get excludedUrlPrefs() {
    return [];
  }
}
