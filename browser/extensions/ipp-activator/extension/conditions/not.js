/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global ConditionBaseWithSub */

/**
 * NOT condition
 */
class ConditionNot extends ConditionBaseWithSub {
  constructor(factory, desc) {
    super(factory, desc, desc.condition ? [desc.condition] : []);
  }

  check() {
    if (!this.conditions.length) {
      return true;
    }
    return !this.conditions[0].check();
  }
}

globalThis.ConditionNot = ConditionNot;
