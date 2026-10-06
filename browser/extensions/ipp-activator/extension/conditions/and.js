/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global ConditionBaseWithSub */

/**
 * AND condition
 */
class ConditionAnd extends ConditionBaseWithSub {
  constructor(factory, desc) {
    super(factory, desc, desc.conditions);
  }

  check() {
    for (const c of this.conditions) {
      if (!c.check()) {
        return false;
      }
    }
    return true;
  }
}

globalThis.ConditionAnd = ConditionAnd;
