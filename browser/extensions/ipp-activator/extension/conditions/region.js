/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global browser, ConditionBase */

/**
 * A region condition
 */
class ConditionRegion extends ConditionBase {
  #region = null;
  #listener = null;

  async init() {
    await super.init();

    this.#region = await browser.ippActivator.getRegion();

    this.#listener = next => {
      if (next !== this.#region) {
        this.#region = next;
        this._notifyChange();
      }
    };
    browser.ippActivator.onRegionChanged.addListener(this.#listener);
  }

  uninit() {
    if (this.#listener) {
      browser.ippActivator.onRegionChanged.removeListener(this.#listener);
      this.#listener = null;
    }
    super.uninit();
  }

  check() {
    const list = Array.isArray(this.desc?.regions) ? this.desc.regions : [];
    return list.includes(this.#region);
  }
}

globalThis.ConditionRegion = ConditionRegion;
