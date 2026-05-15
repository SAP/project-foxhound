/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global ConditionBase */

/**
 * OR condition
 */
class ConditionOr extends ConditionBase {
  #conditions;

  constructor(factory, desc) {
    super(factory, desc);

    this.#conditions = desc.conditions.map(c => factory.create(c));
  }

  async init() {
    for (const c of this.#conditions) {
      await c.init();
    }
  }

  check() {
    for (const c of this.#conditions) {
      if (c.check()) {
        return true;
      }
    }
    return false;
  }
}

globalThis.ConditionOr = ConditionOr;
