/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { LoginManagerStorage_json } from "resource://gre/modules/storage-json.sys.mjs";
import { LoginManagerRustStorage } from "resource://gre/modules/storage-rust.sys.mjs";
import { LoginManagerRustMirror } from "resource://gre/modules/LoginManagerRustMirror.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  LoginHelper: "resource://gre/modules/LoginHelper.sys.mjs",
});

export class LoginManagerStorage extends LoginManagerStorage_json {
  static #jsonStorage = null;
  static #rustStorage = null;
  static #logger = lazy.LoginHelper.createLogger("LoginManagerStorage");
  static #initializationPromise = null;

  static create(callback) {
    if (this.#initializationPromise) {
      this.#logger.log("json storage already initialized");
    } else {
      this.#jsonStorage = new LoginManagerStorage_json();
      this.#rustStorage = new LoginManagerRustStorage();

      this.#initializationPromise = this.#jsonStorage
        .initialize()
        .then(() => this.#rustStorage.initialize())
        .then(() => {
          new LoginManagerRustMirror(this.#jsonStorage, this.#rustStorage);
        });
    }

    this.#initializationPromise.then(() => callback?.());

    return this.#jsonStorage;
  }
}
