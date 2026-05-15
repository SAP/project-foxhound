/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global ConditionBase */

/**
 * Simple condition for testing
 */
class ConditionTest extends ConditionBase {
  #ret;

  constructor(factory, desc) {
    super(factory, desc);
    this.#ret = desc.ret;
  }

  check() {
    return this.#ret;
  }
}

globalThis.ConditionTest = ConditionTest;
