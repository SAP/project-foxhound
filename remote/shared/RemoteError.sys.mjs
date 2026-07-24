/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Base class for all remote protocol errors.
 */
export class RemoteError extends Error {
  get isRemoteError() {
    return true;
  }

  /**
   * Convert to a serializable object. Should be implemented by subclasses.
   */
  toJSON() {
    throw new Error("Not implemented");
  }
}

/**
 * Internal class for navigation errors.
 */
export class NavigationError extends Error {
  #status;

  constructor(errorName, status) {
    super(errorName);
    this.#status = status;
  }

  get isNavigationError() {
    return true;
  }

  get isBindingAborted() {
    return this.#status == Cr.NS_BINDING_ABORTED;
  }
}
