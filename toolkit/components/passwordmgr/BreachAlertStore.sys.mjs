/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AsyncShutdown: "resource://gre/modules/AsyncShutdown.sys.mjs",
  LoginHelper: "resource://gre/modules/LoginHelper.sys.mjs",
});

import {
  BreachAlertDismissal,
  BreachAlertsStore,
} from "moz-src:///toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustBreachAlerts.sys.mjs";

const toRustDismissal = d =>
  new BreachAlertDismissal({
    breachName: d.breachName,
    timeDismissed: d.timeDismissed,
  });

const fromRustDismissal = d => ({
  breachName: d.breachName,
  timeDismissed: d.timeDismissed,
});

export class BreachAlertStorage {
  #store = null;
  #initializationPromise = null;
  #logger = null;

  // have it a singleton
  constructor() {
    if (BreachAlertStorage._instance) {
      return BreachAlertStorage._instance;
    }
    BreachAlertStorage._instance = this;
    this.#logger = lazy.LoginHelper.createLogger("BreachAlertStorage");
  }

  initialize() {
    if (this.#initializationPromise) {
      this.#logger.log("breach alert storage already initialized");
    } else {
      const profilePath = Services.dirsvc.get("ProfD", Ci.nsIFile).path;
      const path = `${profilePath}/breach-alerts.db`;

      this.#logger.log(`Initializing breach alerts storage at ${path}`);
      this.#initializationPromise = BreachAlertsStore.newStore(path).then(
        store => {
          this.#store = store;
          this.#logger.log("Breach alert storage ready.");

          // Shutdown blocker to ensure that we finalize properly.
          lazy.AsyncShutdown.profileChangeTeardown.addBlocker(
            "BreachAlertsStore: Interrupt IO operations on breach alerts store",
            async () => this.finalize()
          );

          return this;
        },
        e => {
          this.#logger.log(`Initialization failed: ${e}`);
          throw e;
        }
      );
    }

    return this.#initializationPromise;
  }

  /**
   * Terminate all pending writes. After this call, the store can't be used.
   */
  async finalize() {
    await this.#store.close();
  }

  /**
   * @param {string[]} breachNames
   * @returns {Promise<object[]>}
   */
  async getBreachAlertDismissals(breachNames) {
    const results = await this.#store.getBreachAlertDismissals(breachNames);
    return results.map(fromRustDismissal);
  }

  /**
   * Creates or updates dismissal records for each entry.
   *
   * @param {object[]} dismissals - Array of { breachName, timeDismissed } objects.
   */
  async setBreachAlertDismissals(dismissals) {
    await this.#store.setBreachAlertDismissals(dismissals.map(toRustDismissal));
  }

  /**
   * @param {string[]} breachNames
   */
  async clearBreachAlertDismissals(breachNames) {
    await this.#store.clearBreachAlertDismissals(breachNames);
  }

  async clearAllBreachAlertDismissals() {
    await this.#store.clearAllBreachAlertDismissals();
  }
}
