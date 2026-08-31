/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global browser, ConditionBase */

/**
 * A VPN condition
 */
class ConditionVPN extends ConditionBase {
  #ippActive = false;
  #listener = null;

  async init() {
    await super.init();

    this.#ippActive = await browser.ippActivator.isIPPActive();

    this.#listener = next => {
      if (next !== this.#ippActive) {
        this.#ippActive = next;
        this._notifyChange();
      }
    };
    browser.ippActivator.onIPPActivated.addListener(this.#listener);
  }

  uninit() {
    if (this.#listener) {
      browser.ippActivator.onIPPActivated.removeListener(this.#listener);
      this.#listener = null;
    }
    super.uninit();
  }

  check() {
    return this.#ippActive === this.desc.active;
  }
}

globalThis.ConditionVPN = ConditionVPN;
