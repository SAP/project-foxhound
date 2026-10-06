/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

module.exports = {
  /**
   * Limit the decimal count of a number. Unlike Number.toFixed(),
   * this function does not pad with extra zeros. If the input is not a number,
   * the function throws an error.
   *
   * @param {number} number
   * @param {number} decimals
   *        Decimal count in the output number. Default to one decimal.
   * @return {number}
   */
  toFixed(number, decimals = 1) {
    if (typeof number !== "number") {
      throw new Error(`Input: "${number}" is not a number.`);
    }

    return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },
};
