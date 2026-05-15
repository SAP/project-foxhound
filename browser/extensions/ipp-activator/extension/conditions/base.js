/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Base class for conditions
 */
class ConditionBase {
  constructor(factory, desc) {
    this.factory = factory;
    this.desc = desc;
  }

  async init() {
    /* nothing to do */
  }

  check() {
    throw new Error("Check is not implemented!");
  }
}

globalThis.ConditionBase = ConditionBase;
