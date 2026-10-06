/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export class NetworkDataBytes {
  #getBytesValue;
  #isBase64;

  /**
   * Common interface used to handle network BytesValue for collected data which
   * might be encoded and require an additional async step in order to retrieve
   * the actual bytes.
   *
   * This is a simple wrapper mostly designed to ensure a common interface in
   * case this is used for request or response bodies.
   *
   * @param {object} options
   * @param {Function} options.getBytesValue
   *     A -potentially async- callable which returns the bytes as a string.
   * @param {boolean} options.isBase64
   *     Whether this represents a base64-encoded binary data.
   */
  constructor(options) {
    this.#getBytesValue = options.getBytesValue;
    this.#isBase64 = options.isBase64;
  }

  get isBase64() {
    return this.#isBase64;
  }

  async getBytesValue() {
    return this.#getBytesValue();
  }
}
