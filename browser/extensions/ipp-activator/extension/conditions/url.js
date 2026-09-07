/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global browser, ConditionBase */

/**
 * URL condition
 */
class ConditionUrl extends ConditionBase {
  #url = "";
  #onTabUpdated = null;
  #tabId = null;

  async init() {
    await super.init();

    this.#tabId = this.factory?.context?.tabId;
    if (typeof this.#tabId !== "number") {
      return;
    }

    try {
      const tab = await browser.tabs.get(this.#tabId);
      this.#url = tab?.url ?? "";
    } catch (_) {}

    this.#onTabUpdated = (tabId, changeInfo) => {
      if (tabId !== this.#tabId || !("url" in changeInfo)) {
        return;
      }
      this.#url = changeInfo.url ?? "";
      this._notifyChange();
    };
    browser.tabs.onUpdated.addListener(this.#onTabUpdated, {
      tabId: this.#tabId,
      properties: ["url"],
    });
  }

  uninit() {
    if (this.#onTabUpdated) {
      browser.tabs.onUpdated.removeListener(this.#onTabUpdated);
      this.#onTabUpdated = null;
    }
    super.uninit();
  }

  check() {
    try {
      const pattern = new RegExp(String(this.desc?.pattern ?? ""));
      return pattern.test(this.#url);
    } catch (e) {
      console.warn("Unable to parse the regexp", this.desc?.pattern, e);
      return false;
    }
  }
}

globalThis.ConditionUrl = ConditionUrl;
