/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global browser, ConditionBase */

/**
 * COOKIE condition
 */
class ConditionCookie extends ConditionBase {
  static STORAGE_KEY = "cookies-";

  constructor(factory, desc) {
    super(factory, desc);
  }

  async init() {
    const { domain } = this.desc;
    if (!domain) {
      return;
    }

    let cache = this.factory.retrieveData(ConditionCookie.STORAGE_KEY + domain);
    if (Array.isArray(cache)) {
      return;
    }

    try {
      const cookies = await browser.cookies.getAll({ domain });
      cache = Array.isArray(cookies) ? cookies : [];
    } catch (e) {
      cache = [];
    }

    this.factory.storeData(ConditionCookie.STORAGE_KEY + domain, cache);
  }

  check() {
    if (!this.desc.domain || !this.desc.name) {
      return false;
    }

    const cookies =
      this.factory.retrieveData(
        ConditionCookie.STORAGE_KEY + this.desc.domain
      ) || [];
    const cookie = cookies.find(c => c && c.name === this.desc.name);
    if (!cookie) {
      return false;
    }

    if (
      typeof this.desc.value === "string" &&
      cookie.value !== this.desc.value
    ) {
      return false;
    }

    if (
      typeof this.desc.value_contain === "string" &&
      (typeof cookie.value !== "string" ||
        !cookie.value.includes(this.desc.value_contain))
    ) {
      return false;
    }

    return true;
  }
}

globalThis.ConditionCookie = ConditionCookie;
