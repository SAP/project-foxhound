/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global ConditionBase */

/**
 * NOT condition
 */
class ConditionNot extends ConditionBase {
  #condition;

  constructor(factory, desc) {
    super(factory, desc);
    this.#condition = desc?.condition ? factory.create(desc.condition) : null;
  }

  async init() {
    if (this.#condition) {
      await this.#condition.init();
    }
  }

  check() {
    if (!this.#condition) {
      return true;
    }
    return !this.#condition.check();
  }
}

globalThis.ConditionNot = ConditionNot;
