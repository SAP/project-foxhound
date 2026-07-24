/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global ConditionBase */

/**
 * URL condition
 */
class ConditionUrl extends ConditionBase {
  constructor(factory, desc) {
    super(factory, desc);
  }

  check() {
    try {
      const pattern = new RegExp(String(this.desc?.pattern ?? ""));
      const url = String(this.factory?.context?.url ?? "");
      return pattern.test(url);
    } catch (e) {
      console.warn("Unable to parse the regexp", this.desc?.pattern, e);
      return false;
    }
  }
}

globalThis.ConditionUrl = ConditionUrl;
