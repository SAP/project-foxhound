/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const PERM_NAME = "ipp-vpn";

/**
 * Manages site exceptions for IP Protection.
 * It communicates with Services.perms to update the ipp-vpn permission type.
 * Site exclusions are marked as permissions with DENY capabilities.
 *
 * While permissions related UI (eg. panels and dialogs) already handle changes to ipp-vpn,
 * the intention of this class is to abstract methods for updating ipp-vpn as needed
 * from other non-permissions related UI.
 */
class ExceptionsManager extends EventTarget {
  #inited = false;
  #observer = null;

  init() {
    if (this.#inited) {
      return;
    }

    // ES6 classes that extend EventTarget cannot be coerced into nsIObserver.
    // Work around this by using a function as the observer.
    this.#observer = (subject, topic, data) => {
      this.observe(subject, topic, data);
    };
    Services.obs.addObserver(this.#observer, "perm-changed");
    this.#inited = true;
  }

  uninit() {
    if (!this.#inited) {
      return;
    }

    Services.obs.removeObserver(this.#observer, "perm-changed");
    this.#observer = null;
    this.#inited = false;
  }

  observe(subject, topic, data) {
    if (topic !== "perm-changed") {
      return;
    }

    let permission = subject.QueryInterface(Ci.nsIPermission);
    if (permission.type !== PERM_NAME) {
      return;
    }

    const isExclusion =
      permission.capability === Ci.nsIPermissionManager.DENY_ACTION;
    const added = data === "added" && isExclusion;
    const removed = data === "deleted" && isExclusion;

    if (added || removed) {
      if (added) {
        Glean.ipprotection.exclusionAdded.add(1);
      }

      this.dispatchEvent(
        new CustomEvent("IPPExceptionsManager:ExclusionChanged")
      );
    }
  }

  /**
   * Adds a principal to ipp-vpn with capability DENY_ACTION
   * for site exclusions.
   *
   * @param {nsIPrincipal} principal
   *  The principal that we want to add as a site exception.
   */
  addExclusion(principal) {
    Services.perms.addFromPrincipal(
      principal,
      PERM_NAME,
      Ci.nsIPermissionManager.DENY_ACTION
    );
  }

  /**
   * Removes an existing principal from ipp-vpn.
   *
   * @param {nsIPrincipal} principal
   *  The principal that we want to remove as a site exception.
   */
  removeExclusion(principal) {
    Services.perms.removeFromPrincipal(principal, PERM_NAME);
  }

  /**
   * Returns true if the principal already exists in ipp-vpn
   * and is registered as a permission with a DENY_ACTION
   * capability (site exclusions).
   * Else returns false if no such principal exists.
   *
   * @param {nsIPrincipal} principal
   *  The principal that we want to check is saved in ipp-vpn
   *  as a site exclusion.
   * @returns {boolean}
   *  True if the principal exists as a site exclusion.
   */
  hasExclusion(principal) {
    let permission = this.getExceptionPermissionObject(principal);
    return permission?.capability === Ci.nsIPermissionManager.DENY_ACTION;
  }

  /**
   * Get the permission object for a site exception if it exists in ipp-vpn.
   *
   * Use exactHost=true to only match the specific origin, not the base domain.
   * This ensures that subdomains aren't implicitly excluded when entering
   * a site in the about:preferences dialog. It also avoids an issue where we
   * try to remove a subdomain as an exclusion when the site doesn't exist in ipp-vpn
   * (see Bug 2016676).
   *
   * Eg. if we enter "example.com" in the dialog, "www.example.com" and
   * "subdomain.example.com" won't be considered exclusions.
   *
   * @param {nsIPrincipal} principal
   *  The principal that we want to check is saved in ipp-vpn.
   *
   * @returns {nsIPermission}
   *  The permission object for a site exception, or null if unavailable.
   */
  getExceptionPermissionObject(principal) {
    let permissionObject = Services.perms.getPermissionObject(
      principal,
      PERM_NAME,
      true /* exactHost */
    );
    return permissionObject;
  }

  /**
   * Gets the total number of site exclusions added to ipp-vpn.
   *
   * @returns {number}
   *  The count of site exclusions in ipp-vpn.
   */
  getExclusionCount() {
    let count = 0;
    for (let perm of Services.perms.getAllByTypes([PERM_NAME])) {
      if (perm.capability === Ci.nsIPermissionManager.DENY_ACTION) {
        count++;
      }
    }
    return count;
  }

  /**
   * Sets the given principal as an exclusion or non exclusion.
   *
   * @param {nsIPrincipal} principal
   *  The principal we want to update for the exclusion state.
   * @param {boolean} shouldExclude
   *  True to set the principal as an exclusion. Otherwise false.
   *
   * @example
   * // Assuming the principal represents a site https://www.example.com,
   * // this line sets https://www.example.com as an exclusion
   * // in ipp-vpn.
   * IPPExceptionsManager.setExclusion(nsIPrincipal, true);
   */
  setExclusion(principal, shouldExclude) {
    if (!principal) {
      return;
    }

    const isExclusion = this.hasExclusion(principal);

    // Early return if already in desired state
    if ((shouldExclude && isExclusion) || (!shouldExclude && !isExclusion)) {
      return;
    }

    if (shouldExclude) {
      this.addExclusion(principal);
    } else {
      this.removeExclusion(principal);
    }
  }
}

const IPPExceptionsManager = new ExceptionsManager();
export { IPPExceptionsManager };
