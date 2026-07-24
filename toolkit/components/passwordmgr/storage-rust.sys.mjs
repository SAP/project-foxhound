/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * LoginManagerStorage implementation for the Rust logins storage back-end.
 */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  FXA_PWDMGR_HOST: "resource://gre/modules/FxAccountsCommon.sys.mjs",
  FXA_PWDMGR_REALM: "resource://gre/modules/FxAccountsCommon.sys.mjs",

  LoginHelper: "resource://gre/modules/LoginHelper.sys.mjs",

  AsyncShutdown: "resource://gre/modules/AsyncShutdown.sys.mjs",
});

import { initialize as initRustComponents } from "moz-src:///toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustInitRustComponents.sys.mjs";

import {
  LoginEntry,
  LoginMeta,
  LoginEntryWithMeta,
  BulkResultEntry,
  PrimaryPasswordAuthenticator,
  createLoginStoreWithNssKeymanager,
} from "moz-src:///toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustLogins.sys.mjs";

const LoginInfo = Components.Constructor(
  "@mozilla.org/login-manager/loginInfo;1",
  "nsILoginInfo",
  "init"
);

// Convert a LoginInfo, as known to the JS world, to a LoginEntry, the Rust
// Login type.
// This could be an instance method implemented in
// toolkit/components/passwordmgr/LoginInfo.sys.mjs
// but I'd like to decouple from as many components as possible by now
const loginInfoToLoginEntry = loginInfo =>
  new LoginEntry({
    origin: loginInfo.origin,
    httpRealm: loginInfo.httpRealm,
    formActionOrigin: loginInfo.formActionOrigin,
    usernameField: loginInfo.usernameField,
    passwordField: loginInfo.passwordField,
    username: loginInfo.username,
    password: loginInfo.password,
  });

// Convert a LoginInfo to a LoginEntryWithMeta, to be used for migrating
// records between legacy and Rust storage.
const loginInfoToLoginEntryWithMeta = loginInfo =>
  new LoginEntryWithMeta({
    entry: loginInfoToLoginEntry(loginInfo),
    meta: new LoginMeta({
      id: loginInfo.guid,
      timesUsed: loginInfo.timesUsed,
      timeCreated: loginInfo.timeCreated,
      timeLastUsed: loginInfo.timeLastUsed,
      timePasswordChanged: loginInfo.timePasswordChanged,
    }),
  });

// Convert a Login instance, as returned from Rust Logins, to a LoginInfo
const loginToLoginInfo = login => {
  const loginInfo = new LoginInfo(
    login.origin,
    login.formActionOrigin,
    login.httpRealm,
    login.username,
    login.password,
    login.usernameField,
    login.passwordField
  );

  // add meta information
  loginInfo.QueryInterface(Ci.nsILoginMetaInfo);
  // Rust Login ids are guids
  loginInfo.guid = login.id;
  loginInfo.timeCreated = login.timeCreated;
  loginInfo.timeLastUsed = login.timeLastUsed;
  loginInfo.timePasswordChanged = login.timePasswordChanged;
  loginInfo.timesUsed = login.timesUsed;

  /* These fields are not attributes on the Rust Login class
  loginInfo.syncCounter = login.syncCounter;
  loginInfo.everSynced = login.everSynced;
  loginInfo.unknownFields = login.encryptedUnknownFields;
  */

  return loginInfo;
};

// An adapter which talks to the Rust Logins Store via LoginInfo objects
class RustLoginsStoreAdapter {
  #store = null;

  constructor(store) {
    this.#store = store;
  }

  get(id) {
    const login = this.#store.get(id);
    return login && loginToLoginInfo(login);
  }

  list() {
    const logins = this.#store.list();
    return logins.map(loginToLoginInfo);
  }

  update(id, loginInfo) {
    const loginEntry = loginInfoToLoginEntry(loginInfo);
    const login = this.#store.update(id, loginEntry);
    return loginToLoginInfo(login);
  }

  add(loginInfo) {
    const loginEntry = loginInfoToLoginEntry(loginInfo);
    const login = this.#store.add(loginEntry);
    return loginToLoginInfo(login);
  }

  addWithMeta(loginInfo) {
    const loginEntryWithMeta = loginInfoToLoginEntryWithMeta(loginInfo);
    const login = this.#store.addWithMeta(loginEntryWithMeta);
    return loginToLoginInfo(login);
  }

  addManyWithMeta(loginInfos, continueOnDuplicates) {
    const loginEntriesWithMeta = loginInfos.map(loginInfoToLoginEntryWithMeta);
    const results = this.#store.addManyWithMeta(loginEntriesWithMeta);

    // on continuous mode, return result objects, which could be either a login
    // or an error containing the error message
    if (continueOnDuplicates) {
      return results.map(l => {
        if (l instanceof BulkResultEntry.Error) {
          return {
            error: { message: l.message },
          };
        }
        return {
          login: loginToLoginInfo(l.login),
        };
      });
    }

    // otherwise throw first error
    const error = results.find(l => l instanceof BulkResultEntry.Error);
    if (error) {
      throw error;
    }
    // and return login info objects
    return results
      .filter(l => l instanceof BulkResultEntry.Success)
      .map(({ login }) => loginToLoginInfo(login));
  }

  delete(id) {
    return this.#store.delete(id);
  }

  deleteMany(ids) {
    return this.#store.deleteMany(ids);
  }

  // reset() {
  //   return this.#store.reset()
  // }

  wipeLocal() {
    return this.#store.wipeLocal();
  }

  count() {
    return this.#store.count();
  }

  countByOrigin(origin) {
    return this.#store.countByOrigin(origin);
  }

  countByFormActionOrigin(formActionOrigin) {
    return this.#store.countByFormActionOrigin(formActionOrigin);
  }

  touch(id) {
    this.#store.touch(id);
  }

  findLoginToUpdate(loginInfo) {
    const loginEntry = loginInfoToLoginEntry(loginInfo);
    const login = this.#store.findLoginToUpdate(loginEntry);
    return login && loginToLoginInfo(login);
  }

  shutdown() {
    this.#store.shutdown();
  }
}

// This is a mock atm, as the Rust Logins mirror is not enabled for primary
// password users. A primary password entered outide of Rust will still unlock
// the Rust encdec, because it uses the same NSS.
class LoginStorageAuthenticator extends PrimaryPasswordAuthenticator {}

export class LoginManagerRustStorage {
  #storageAdapter = null;
  #initializationPromise = null;

  // have it a singleton
  constructor() {
    if (LoginManagerRustStorage._instance) {
      return LoginManagerRustStorage._instance;
    }
    LoginManagerRustStorage._instance = this;
  }

  initialize() {
    if (this.#initializationPromise) {
      this.log("rust storage already initialized");
    } else {
      try {
        const profilePath = Services.dirsvc.get("ProfD", Ci.nsIFile).path;
        const path = `${profilePath}/logins.db`;

        this.#initializationPromise = new Promise(resolve => {
          this.log(`Initializing Rust login storage at ${path}`);

          initRustComponents(profilePath).then(() => {
            const authenticator = new LoginStorageAuthenticator();
            const store = createLoginStoreWithNssKeymanager(
              path,
              authenticator
            );

            this.#storageAdapter = new RustLoginsStoreAdapter(store);
            this.log("Rust login storage ready.");

            // All LoginManager storage backends must have their own shutdown
            // blocker to ensure that they finalize properly.
            lazy.AsyncShutdown.profileChangeTeardown.addBlocker(
              "LoginManagerRustStorage: Interrupt IO operations on login store",
              async () => this.finalize()
            );

            resolve(this);
          });
        });
      } catch (e) {
        this.log(`Initialization failed ${e.name}.`);
        this.log(e);
        throw new Error("Initialization failed");
      }
    }

    return this.#initializationPromise;
  }

  /**
   * Terminate all pending writes. After this call, the store can't be used.
   */
  async finalize() {
    // TODO: Currently we do not mark the instance as closed, not sure if later
    // calls would be rejected elsewhere.

    // Note: This is a synchronous call.
    this.#storageAdapter.shutdown();
    return Promise.resolve();
  }

  /**
   * Internal method used by tests only. It is called before replacing
   * this storage module with a new instance.
   */
  testSaveForReplace() {
    // Currently we only ever call this on LoginManagerStorage which is derived
    // from LoginManagerStorage_json and there seems to be nothing that would
    // want to call it here, but maybe once we entirely replace the JSON store
    // with this one it would be called and we'd need to implement it.
    throw Components.Exception(
      "testSaveForReplace",
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  }

  /**
   * Returns the "sync id" used by Sync to know whether the store is current with
   * respect to the sync servers. It is stored encrypted, but only so we
   * can detect failure to decrypt (for example, a "reset" of the primary
   * password will leave all logins alone, but they will fail to decrypt. We
   * also want this metadata to be unavailable in that scenario)
   *
   * Returns null if the data doesn't exist or if the data can't be
   * decrypted (including if the primary-password prompt is cancelled). This is
   * OK for Sync as it can't even begin syncing if the primary-password is
   * locked as the sync encrytion keys are stored in this login manager.
   */
  async getSyncID() {
    throw Components.Exception("getSyncID", Cr.NS_ERROR_NOT_IMPLEMENTED);
  }

  async setSyncID(_syncID) {
    throw Components.Exception("setSyncID", Cr.NS_ERROR_NOT_IMPLEMENTED);
  }

  async getLastSync() {
    throw Components.Exception("getLastSync", Cr.NS_ERROR_NOT_IMPLEMENTED);
  }

  async setLastSync(_timestamp) {
    throw Components.Exception("setLastSync", Cr.NS_ERROR_NOT_IMPLEMENTED);
  }

  async resetSyncCounter(_guid, _value) {
    throw Components.Exception("resetSyncCounter", Cr.NS_ERROR_NOT_IMPLEMENTED);
  }

  // Returns false if the login has marked as deleted or doesn't exist.
  loginIsDeleted(_guid) {
    throw Components.Exception("loginIsDeleted", Cr.NS_ERROR_NOT_IMPLEMENTED);
  }

  loginIsDeletedAsync(_guid) {
    throw Components.Exception(
      "loginIsDeletedAsync",
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  }

  addWithMeta(login) {
    return this.#storageAdapter.addWithMeta(login);
  }

  async addLoginsAsync(logins, continueOnDuplicates = false) {
    if (logins.length === 0) {
      return logins;
    }

    const result = this.#storageAdapter.addManyWithMeta(
      logins,
      continueOnDuplicates
    );

    // Emulate being async
    return Promise.resolve(result);
  }

  modifyLogin(oldLogin, newLoginData, _fromSync) {
    const oldStoredLogin = this.#storageAdapter.findLoginToUpdate(oldLogin);

    if (!oldStoredLogin) {
      throw new Error("No matching logins");
    }

    const idToModify = oldStoredLogin.guid;

    const newLogin = lazy.LoginHelper.buildModifiedLogin(
      oldStoredLogin,
      newLoginData
    );

    // Check if the new GUID is duplicate.
    if (newLogin.guid != idToModify && !this.#isGuidUnique(newLogin.guid)) {
      throw new Error("specified GUID already exists");
    }

    // Look for an existing entry in case key properties changed.
    if (!newLogin.matches(oldLogin, true)) {
      const loginData = {
        origin: newLogin.origin,
        formActionOrigin: newLogin.formActionOrigin,
        httpRealm: newLogin.httpRealm,
      };

      const logins = this.searchLogins(
        lazy.LoginHelper.newPropertyBag(loginData)
      );

      const matchingLogin = logins.find(login => newLogin.matches(login, true));
      if (matchingLogin) {
        throw lazy.LoginHelper.createLoginAlreadyExistsError(
          matchingLogin.guid
        );
      }
    }

    this.#storageAdapter.update(idToModify, newLogin);
  }

  async modifyLoginAsync(oldLogin, newLoginData, _fromSync) {
    let result = this.modifyLogin(oldLogin, newLoginData, _fromSync);

    // Emulate being async:
    return Promise.resolve(result);
  }

  /**
   * Checks to see if the specified GUID already exists.
   */
  #isGuidUnique(guid) {
    return !this.#storageAdapter.get(guid);
  }

  recordPasswordUse(login) {
    const oldStoredLogin = this.#storageAdapter.findLoginToUpdate(login);

    if (!oldStoredLogin) {
      throw new Error("No matching logins");
    }

    this.#storageAdapter.touch(oldStoredLogin.guid);
  }

  async recordPasswordUseAsync(login) {
    let result = this.recordPasswordUse(login);
    // Emulate being async:
    return Promise.resolve(result);
  }

  async recordBreachAlertDismissal(_loginGUID) {
    throw Components.Exception(
      "recordBreachAlertDismissal",
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  }

  getBreachAlertDismissalsByLoginGUID() {
    throw Components.Exception(
      "getBreachAlertDismissalsByLoginGUID",
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  }

  /**
   * Returns an array of nsILoginInfo. If decryption of a login
   * fails due to a corrupt entry, the login is not included in
   * the resulting array.
   *
   * @returns {Promise<nsILoginInfo[]>}
   */
  async getAllLogins(includeDeleted) {
    // `includeDeleted` is currentlty unsupported
    if (includeDeleted) {
      throw Components.Exception(
        "getAllLogins with includeDeleted",
        Cr.NS_ERROR_NOT_IMPLEMENTED
      );
    }
    return Promise.resolve(this.#storageAdapter.list());
  }

  // The Rust API is sync atm
  searchLoginsAsync(matchData, includeDeleted) {
    this.log(`Searching for matching logins for origin ${matchData.origin}.`);
    const result = this.searchLogins(
      lazy.LoginHelper.newPropertyBag(matchData),
      includeDeleted
    );

    // Emulate being async:
    return Promise.resolve(result);
  }

  /**
   * Public wrapper around #searchLogins to convert the nsIPropertyBag to a
   * JavaScript object and decrypt the results.
   *
   * @return {nsILoginInfo[]} which are decrypted.
   */
  searchLogins(matchData, includeDeleted) {
    const realMatchData = {};
    const options = {};
    matchData.QueryInterface(Ci.nsIPropertyBag2);

    if (matchData.hasKey("guid")) {
      realMatchData.guid = matchData.getProperty("guid");
    } else {
      for (const prop of matchData.enumerator) {
        switch (prop.name) {
          // Some property names aren't field names but are special options to
          // affect the search.
          case "acceptDifferentSubdomains":
          case "schemeUpgrades":
          case "acceptRelatedRealms":
          case "relatedRealms": {
            options[prop.name] = prop.value;
            break;
          }
          default: {
            realMatchData[prop.name] = prop.value;
            break;
          }
        }
      }
    }
    const [logins] = this.#searchLogins(realMatchData, includeDeleted, options);
    return logins;
  }

  #searchLogins(
    matchData,
    includeDeleted = false,
    aOptions = {
      schemeUpgrades: false,
      acceptDifferentSubdomains: false,
      acceptRelatedRealms: false,
      relatedRealms: [],
    },
    candidateLogins = this.#storageAdapter.list()
  ) {
    function match(aLoginItem) {
      for (const field in matchData) {
        const wantedValue = matchData[field];

        // Override the storage field name for some fields due to backwards
        // compatibility with Sync/storage.
        let storageFieldName = field;
        switch (field) {
          case "formActionOrigin": {
            storageFieldName = "formSubmitURL";
            break;
          }
          case "origin": {
            storageFieldName = "hostname";
            break;
          }
        }

        switch (field) {
          case "formActionOrigin":
            if (wantedValue != null) {
              // Historical compatibility requires this special case
              if (
                aLoginItem.formSubmitURL == "" ||
                (wantedValue == "" && Object.keys(matchData).length != 1)
              ) {
                break;
              }
              if (
                !lazy.LoginHelper.isOriginMatching(
                  aLoginItem[storageFieldName],
                  wantedValue,
                  aOptions
                )
              ) {
                return false;
              }
              break;
            }
          // fall through
          case "origin":
            if (wantedValue != null) {
              // needed for formActionOrigin fall through
              if (
                !lazy.LoginHelper.isOriginMatching(
                  aLoginItem[storageFieldName],
                  wantedValue,
                  aOptions
                )
              ) {
                return false;
              }
              break;
            }
          // Normal cases.
          // fall through
          case "httpRealm":
          case "id":
          case "usernameField":
          case "passwordField":
          case "encryptedUsername":
          case "encryptedPassword":
          case "guid":
          case "encType":
          case "timeCreated":
          case "timeLastUsed":
          case "timePasswordChanged":
          case "timesUsed":
          case "syncCounter":
          case "everSynced":
            if (wantedValue == null && aLoginItem[storageFieldName]) {
              return false;
            } else if (aLoginItem[storageFieldName] != wantedValue) {
              return false;
            }
            break;
          // Fail if caller requests an unknown property.
          default:
            throw new Error("Unexpected field: " + field);
        }
      }
      return true;
    }

    const foundLogins = [];
    const foundIds = [];

    for (const login of candidateLogins) {
      if (login.deleted && !includeDeleted) {
        continue; // skip deleted items
      }

      if (match(login)) {
        foundLogins.push(login);
        foundIds.push(login.guid);
      }
    }

    this.log(
      `Returning ${foundLogins.length} logins for specified origin with options ${aOptions}`
    );
    return [foundLogins, foundIds];
  }

  removeLogin(login, _fromSync) {
    const storedLogin = this.#storageAdapter.findLoginToUpdate(login);

    if (!storedLogin) {
      throw new Error("No matching logins");
    }

    const idToDelete = storedLogin.guid;

    this.#storageAdapter.delete(idToDelete);
  }

  async removeLoginAsync(login, _fromSync) {
    let result = this.removeLogin(login, _fromSync);

    // Emulate being async:
    return Promise.resolve(result);
  }

  /**
   * Removes all logins from local storage, including FxA Sync key.
   *
   * NOTE: You probably want removeAllUserFacingLogins instead of this function.
   *
   */
  removeAllLogins() {
    this.#removeLogins(false, true);
  }

  async removeAllLoginsAsync() {
    this.removeAllLogins();
  }

  /**
   * Removes all user facing logins from storage. e.g. all logins except the FxA Sync key
   *
   * If you need to remove the FxA key, use `removeAllLogins` instead
   *
   * @param fullyRemove remove the logins rather than mark them deleted.
   */
  removeAllUserFacingLogins(fullyRemove) {
    this.#removeLogins(fullyRemove, false);
  }

  async removeAllUserFacingLoginsAsync(fullyRemove) {
    this.removeAllUserFacingLogins(fullyRemove);
  }

  /**
   * Removes all logins from storage. If removeFXALogin is true, then the FxA Sync
   * key is also removed.
   *
   * @param fullyRemove remove the logins rather than mark them deleted.
   * @param removeFXALogin also remove the FxA Sync key.
   */
  #removeLogins(fullyRemove, removeFXALogin = false) {
    this.log("Removing all logins.");

    const removedLogins = [];
    const remainingLogins = [];

    const logins = this.#storageAdapter.list();
    const idsToDelete = [];
    for (const login of logins) {
      if (
        !removeFXALogin &&
        login.hostname == lazy.FXA_PWDMGR_HOST &&
        login.httpRealm == lazy.FXA_PWDMGR_REALM
      ) {
        remainingLogins.push(login);
      } else {
        removedLogins.push(login);

        idsToDelete.push(login.guid);
      }
    }

    this.#storageAdapter.deleteMany(idsToDelete);
  }

  findLogins(origin, formActionOrigin, httpRealm) {
    const loginData = {
      origin,
      formActionOrigin,
      httpRealm,
    };
    const matchData = {};
    for (const field of ["origin", "formActionOrigin", "httpRealm"]) {
      if (loginData[field] != "") {
        matchData[field] = loginData[field];
      }
    }
    const [logins] = this.#searchLogins(matchData);

    this.log(`Returning ${logins.length} logins.`);
    return logins;
  }

  countLogins(origin, formActionOrigin, httpRealm) {
    if (!origin && !formActionOrigin && !httpRealm) {
      return this.#storageAdapter.count();
    }

    if (origin && !formActionOrigin && !httpRealm) {
      return this.#storageAdapter.countByOrigin(origin);
    }

    if (!origin && formActionOrigin && !httpRealm) {
      return this.#storageAdapter.countByFormActionOrigin(formActionOrigin);
    }

    const loginData = {
      origin,
      formActionOrigin,
      httpRealm,
    };

    const matchData = {};
    for (const field of ["origin", "formActionOrigin", "httpRealm"]) {
      if (loginData[field] != "") {
        matchData[field] = loginData[field];
      }
    }
    const [logins] = this.#searchLogins(matchData);

    this.log(`Counted ${logins.length} logins.`);
    return logins.length;
  }

  addPotentiallyVulnerablePassword(_login) {
    throw Components.Exception(
      "addPotentiallyVulnerablePassword",
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  }

  isPotentiallyVulnerablePassword(_login) {
    throw Components.Exception(
      "isPotentiallyVulnerablePassword",
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  }

  clearAllPotentiallyVulnerablePasswords() {
    throw Components.Exception(
      "clearAllPotentiallyVulnerablePasswords",
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  }

  get uiBusy() {
    throw Components.Exception("uiBusy", Cr.NS_ERROR_NOT_IMPLEMENTED);
  }

  get isLoggedIn() {
    throw Components.Exception("isLoggedIn", Cr.NS_ERROR_NOT_IMPLEMENTED);
  }
}

ChromeUtils.defineLazyGetter(LoginManagerRustStorage.prototype, "log", () => {
  const logger = lazy.LoginHelper.createLogger("RustLogins");
  return logger.log.bind(logger);
});
