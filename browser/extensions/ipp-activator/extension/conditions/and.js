/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global ConditionBase */

/**
 * AND condition
 */
class ConditionAnd extends ConditionBase {
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
      if (!c.check()) {
        return false;
      }
    }
    return true;
  }
}

globalThis.ConditionAnd = ConditionAnd;
