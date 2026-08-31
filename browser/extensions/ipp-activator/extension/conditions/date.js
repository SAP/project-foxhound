/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global ConditionBase */

/**
 * A date-range condition.
 */
class ConditionDate extends ConditionBase {
  #start = null;
  #end = null;

  async init() {
    await super.init();
    this.#start = this.#parse(this.desc?.start);
    this.#end = this.#parse(this.desc?.end);
  }

  #parse(v) {
    if (typeof v !== "string") {
      return null;
    }
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }

  check() {
    const now = Date.now();
    if (this.#start !== null && now < this.#start) {
      return false;
    }
    if (this.#end !== null && now > this.#end) {
      return false;
    }
    return true;
  }
}

globalThis.ConditionDate = ConditionDate;
