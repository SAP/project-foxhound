/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Sticky security-flag container. A flag that has been set to `true` can never
 * be cleared back to `false`, preventing a later tool call from accidentally
 * downgrading a flag raised by an earlier one.
 *
 * Flags are written to a staging area and only become visible after `commit()`
 * is called. This ensures that parallel tool calls requested in the same
 * conversation turn all see the same committed flags.
 */
export class SecurityProperties {
  #privateData = false;
  #untrustedInput = false;
  #newPrivateData = false;
  #newUntrustedInput = false;

  /** @returns {boolean} */
  get privateData() {
    return this.#privateData;
  }
  setPrivateData() {
    this.#newPrivateData = true;
  }

  /** @returns {boolean} */
  get untrustedInput() {
    return this.#untrustedInput;
  }
  setUntrustedInput() {
    this.#newUntrustedInput = true;
  }

  /**
   * Promotes staged flag values to the committed state. Call this once all
   * tool calls in a batch have completed so that parallel tool calls all see
   * the same flags.
   */
  commit() {
    this.#privateData = this.#privateData || this.#newPrivateData;
    this.#untrustedInput = this.#untrustedInput || this.#newUntrustedInput;
    this.#newPrivateData = false;
    this.#newUntrustedInput = false;
  }

  /**
   * Serializes committed flag state for persistence. Staged flags are
   * runtime coordination state and are not included.
   *
   * @returns {{ privateData: boolean, untrustedInput: boolean }}
   */
  toJSON() {
    return {
      privateData: this.#privateData,
      untrustedInput: this.#untrustedInput,
    };
  }

  /**
   * Restores a SecurityProperties instance from a persisted JSON object.
   * Returns a clean default instance if input is null or undefined.
   *
   * Migration behavior: Conversations created before securityProperties
   * persistence existed have no stored flag payload. Those conversations
   * restore as false/false and will only become tainted again if later
   * conversation activity sets and commits the flags.
   *
   * @param {object|null} obj - Parsed JSON from SQLite
   * @returns {SecurityProperties}
   */
  static fromJSON(obj) {
    const props = new SecurityProperties();
    if (!obj) {
      return props;
    }
    if (obj.privateData) {
      props.#privateData = true;
    }
    if (obj.untrustedInput) {
      props.#untrustedInput = true;
    }
    return props;
  }

  /**
   * Get text that can be used in logging.
   *
   * @returns {string}
   */
  getLogText() {
    return `private=${this.privateData} untrusted=${this.untrustedInput}`;
  }
}
