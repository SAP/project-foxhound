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

ChromeUtils.defineLazyGetter(
  lazy,
  "l10n",
  () => new Localization(["toolkit/passwordmgr/passwordmgr.ftl"])
);

import { initialize as initRustComponents } from "moz-src:///toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustInitRustComponents.sys.mjs";

import {
  LoginEntry,
  LoginMeta,
  LoginEntryWithMeta,
  BulkResultEntry,
  PrimaryPasswordAuthenticator,
  createLoginStoreWithNssKeymanager,
  AuthenticationCanceled,
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
const loginInfoToLoginEntryWithMeta = loginInfo => {
  const now = Date.now();
  return new LoginEntryWithMeta({
    entry: loginInfoToLoginEntry(loginInfo),
    meta: new LoginMeta({
      id: loginInfo.guid || Services.uuid.generateUUID().toString(),
      timesUsed: loginInfo.timesUsed || 1,
      timeCreated: loginInfo.timeCreated || now,
      timeLastUsed: loginInfo.timeLastUsed || now,
      timePasswordChanged: loginInfo.timePasswordChanged || now,
      timeLastBreachAlertDismissed:
        loginInfo.timeLastBreachAlertDismissed || null,
    }),
  });
};

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
  loginInfo.timeLastBreachAlertDismissed =
    login.timeLastBreachAlertDismissed || null;

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

  async get(id) {
    const login = await this.#store.get(id);
    return login && loginToLoginInfo(login);
  }

  async list() {
    const logins = await this.#store.list();
    return logins.map(loginToLoginInfo);
  }

  async update(id, loginInfo) {
    const loginEntry = loginInfoToLoginEntry(loginInfo);
    const login = await this.#store.update(id, loginEntry);
    return loginToLoginInfo(login);
  }

  async add(loginInfo) {
    const loginEntry = loginInfoToLoginEntry(loginInfo);
    const login = await this.#store.add(loginEntry);
    return loginToLoginInfo(login);
  }

  async addWithMeta(loginInfo) {
    const loginEntryWithMeta = loginInfoToLoginEntryWithMeta(loginInfo);
    const login = await this.#store.addWithMeta(loginEntryWithMeta);
    return loginToLoginInfo(login);
  }

  async addManyWithMeta(loginInfos, continueOnDuplicates) {
    const loginEntriesWithMeta = loginInfos.map(loginInfoToLoginEntryWithMeta);
    const results = await this.#store.addManyWithMeta(loginEntriesWithMeta);

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
      throw new Error(error.message);
    }
    // and return login info objects
    return results
      .filter(l => l instanceof BulkResultEntry.Success)
      .map(({ login }) => loginToLoginInfo(login));
  }

  async delete(id) {
    return await this.#store.delete(id);
  }

  async deleteMany(ids) {
    return await this.#store.deleteMany(ids);
  }

  // reset() {
  //   return this.#store.reset()
  // }

  async wipeLocal() {
    return await this.#store.wipeLocal();
  }

  async count() {
    return await this.#store.count();
  }

  async countByOrigin(origin) {
    return await this.#store.countByOrigin(origin);
  }

  async countByFormActionOrigin(formActionOrigin) {
    return await this.#store.countByFormActionOrigin(formActionOrigin);
  }

  async touch(id) {
    return await this.#store.touch(id);
  }

  async findLoginToUpdate(loginInfo) {
    const loginEntry = loginInfoToLoginEntry(loginInfo);
    const login = await this.#store.findLoginToUpdate(loginEntry);
    return login && loginToLoginInfo(login);
  }

  async recordPotentiallyVulnerablePasswords(passwords) {
    await this.#store.recordPotentiallyVulnerablePasswords(passwords);
  }

  async isPotentiallyVulnerablePassword(id) {
    return this.#store.isPotentiallyVulnerablePassword(id);
  }

  async recordBreachAlertDismissal(id) {
    await this.#store.recordBreachAlertDismissal(id);
  }

  async clearAllPotentiallyVulnerablePasswords() {
    await this.#store.resetAllBreaches();
  }

  async arePotentiallyVulnerablePasswords(ids) {
    return this.#store.arePotentiallyVulnerablePasswords(ids);
  }

  async getBreachAlertDismissalsByLoginGUID() {
    const result = {};
    for (const {
      id,
      timeLastBreachAlertDismissed: timeBreachAlertDismissed,
    } of await this.#store.list()) {
      if (timeBreachAlertDismissed) {
        result[id] = {
          timeBreachAlertDismissed,
        };
      }
    }
    return result;
  }

  shutdown() {
    return this.#store.shutdown();
  }
}

class RustLoginStorageAuthenticator extends PrimaryPasswordAuthenticator {
  #logger = null;

  constructor() {
    super();
    this.#logger = lazy.LoginHelper.createLogger(
      "RustLoginStorageAuthenticator"
    );
  }

  // Called by Rust when the NSS key needs to be unlocked. Concurrent calls are not
  // possible: all store operations hold the store's internal Mutex<LoginDb> while
  // calling get_key(), so this method is always invoked serially.
  async getPrimaryPassword() {
    this.#logger.log("getPrimaryPassword called");
    const win = Services.wm.getMostRecentBrowserWindow();
    // Empty title causes Prompter.sys.mjs to fall back to the localised
    // "PromptPassword3" string ("Password Required - <AppName>").
    const message = await lazy.l10n.formatValue(
      "primary-password-prompt-message"
    );
    const result = await Services.prompt.asyncPromptPassword(
      win?.browsingContext,
      Services.prompt.MODAL_TYPE_WINDOW,
      "",
      message,
      ""
    );

    if (!result.getProperty("ok")) {
      Services.obs.notifyObservers(null, "passwordmgr-crypto-loginCanceled");
      throw new AuthenticationCanceled("User cancelled");
    }

    this.#logger.log("got a password");
    return result.getProperty("pass");
  }

  async onAuthenticationSuccess() {
    Services.obs.notifyObservers(null, "passwordmgr-crypto-login");
    this.#logger.log("authenticated with success");
  }

  async onAuthenticationFailure() {
    this.#logger.log("failed to authenticate");
  }
}

export class LoginManagerRustStorage {
  #storageAdapter = null;
  #initializationPromise = null;
  // Only the active backend fires storage-changed events to avoid duplicates
  // when both JSON and Rust stores are initialized.
  // Default is false (json is active)
  #isActive = false;
  set isActive(v) {
    this.#isActive = v;
  }

  // have it a singleton
  constructor() {
    if (LoginManagerRustStorage._instance) {
      return LoginManagerRustStorage._instance;
    }
    this.__crypto = null; // nsILoginManagerCrypto service
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
            const authenticator = new RustLoginStorageAuthenticator();
            const store = createLoginStoreWithNssKeymanager(
              path,
              authenticator
            );

            this.#storageAdapter = new RustLoginsStoreAdapter(store);
            this.log("Rust login storage ready.");

            this._registerShutdownBlocker().then(() => resolve(this));
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
   * Ensure the storage is finalized at shutdown. All LoginManager storage
   * backends must have their own shutdown blocker to finalize properly.
   *
   * In the corner case where the shutdown phase has already passed by the time
   * we get here, registering a blocker would throw, so we call `finalize()`
   * immediately instead.
   *
   * @param {object} phase An `AsyncShutdown` phase object. Exposed as a
   *   parameter for testing.
   */
  _registerShutdownBlocker(phase = lazy.AsyncShutdown.profileChangeTeardown) {
    if (phase.isClosed) {
      return this.finalize();
    }
    phase.addBlocker(
      "LoginManagerRustStorage: Interrupt IO operations on login store",
      async () => this.finalize()
    );
    return Promise.resolve();
  }

  /**
   * Internal method used by tests only. It is called before replacing
   * this storage module with a new instance.
   */
  testSaveForReplace() {}

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

  loginIsDeleted(_guid) {
    throw Components.Exception("loginIsDeleted", Cr.NS_ERROR_NOT_IMPLEMENTED);
  }

  loginIsDeletedAsync(_guid) {
    throw Components.Exception(
      "loginIsDeletedAsync",
      Cr.NS_ERROR_NOT_IMPLEMENTED
    );
  }

  async addLoginsAsync(logins, continueOnDuplicates = false) {
    if (logins.length === 0) {
      return logins;
    }

    const result = await this.#storageAdapter.addManyWithMeta(
      logins,
      continueOnDuplicates
    );

    if (this.#isActive) {
      Glean.pwmgr.numSavedPasswords.set(
        await this.countLoginsAsync("", "", "")
      );
      for (const item of result) {
        const login = continueOnDuplicates ? item.login : item;
        if (login) {
          lazy.LoginHelper.notifyStorageChanged("addLogin", login);
        }
      }
    }

    return result;
  }

  async modifyLoginAsync(oldLogin, newLoginData, _fromSync) {
    const oldStoredLogin = await this.#storageAdapter.get(oldLogin.guid);

    if (!oldStoredLogin) {
      throw new Error("No matching logins");
    }

    const idToModify = oldLogin.guid;

    const newLogin = lazy.LoginHelper.buildModifiedLogin(
      oldStoredLogin,
      newLoginData
    );

    // Check if the new GUID is duplicate.
    if (
      newLogin.guid != idToModify &&
      (await this.#storageAdapter.get(newLogin.guid))
    ) {
      throw new Error("specified GUID already exists");
    }

    // Look for an existing entry in case key properties changed.
    if (!newLogin.matches(oldLogin, true)) {
      const matchData = {};
      for (const field of ["origin", "formActionOrigin", "httpRealm"]) {
        if (newLogin[field] != "") {
          matchData[field] = newLogin[field];
        }
      }
      const [logins] = await this.#searchLogins(matchData);

      const matchingLogin = logins.find(login => newLogin.matches(login, true));
      if (matchingLogin) {
        throw lazy.LoginHelper.createLoginAlreadyExistsError(
          matchingLogin.guid
        );
      }
    }

    const updatedLogin = await this.#storageAdapter.update(
      idToModify,
      newLogin
    );

    if (this.#isActive) {
      lazy.LoginHelper.notifyStorageChanged("modifyLogin", [
        oldStoredLogin,
        updatedLogin,
      ]);
    }

    return updatedLogin;
  }

  async recordPasswordUseAsync(login) {
    const oldStoredLogin = await this.#storageAdapter.findLoginToUpdate(login);

    if (!oldStoredLogin) {
      throw new Error("No matching logins");
    }

    return await this.#storageAdapter.touch(oldStoredLogin.guid);
  }

  async recordBreachAlertDismissal(loginGUID) {
    await this.#storageAdapter.recordBreachAlertDismissal(loginGUID);
  }

  async getBreachAlertDismissalsByLoginGUID() {
    return this.#storageAdapter.getBreachAlertDismissalsByLoginGUID();
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
    return await this.#storageAdapter.list();
  }

  async searchLoginsAsync(matchData, includeDeleted) {
    const realMatchData = {};
    const options = {};

    if ("guid" in matchData) {
      realMatchData.guid = matchData.guid;
    } else {
      for (const name in matchData) {
        switch (name) {
          // Some property names aren't field names but are special options to
          // affect the search.
          case "acceptDifferentSubdomains":
          case "schemeUpgrades":
          case "acceptRelatedRealms":
          case "relatedRealms": {
            options[name] = matchData[name];
            break;
          }
          default: {
            realMatchData[name] = matchData[name];
            break;
          }
        }
      }
    }

    const [logins] = await this.#searchLogins(
      realMatchData,
      includeDeleted,
      options
    );
    return logins;
  }

  async #searchLogins(
    matchData,
    includeDeleted = false,
    aOptions = {
      schemeUpgrades: false,
      acceptDifferentSubdomains: false,
      acceptRelatedRealms: false,
      relatedRealms: [],
    },
    candidateLogins
  ) {
    candidateLogins ||= await this.#storageAdapter.list();

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

  async removeLoginAsync(login, _fromSync) {
    const deleted = await this.#storageAdapter.delete(login.guid);
    if (!deleted) {
      throw new Error("No matching logins");
    }

    if (this.#isActive) {
      Glean.pwmgr.numSavedPasswords.set(
        await this.countLoginsAsync("", "", "")
      );
      lazy.LoginHelper.notifyStorageChanged("removeLogin", login);
    }
  }

  /**
   * Removes all logins from local storage, including FxA Sync key.
   *
   * NOTE: You probably want removeAllUserFacingLogins instead of this function.
   *
   */
  async removeAllLoginsAsync() {
    const removed = await this.#removeLogins(false, true);
    if (this.#isActive) {
      lazy.LoginHelper.notifyStorageChanged("removeAllLogins", removed ?? []);
    }
    return removed;
  }

  /**
   * Removes all user facing logins from storage. e.g. all logins except the FxA Sync key
   *
   * If you need to remove the FxA key, use `removeAllLogins` instead
   *
   * @param fullyRemove remove the logins rather than mark them deleted.
   */
  async removeAllUserFacingLoginsAsync(fullyRemove) {
    return await this.#removeLogins(fullyRemove, true);
  }

  /**
   * Removes all logins from storage. If removeFXALogin is true, then the FxA Sync
   * key is also removed.
   *
   * @param fullyRemove remove the logins rather than mark them deleted.
   * @param removeFXALogin also remove the FxA Sync key.
   */
  async #removeLogins(fullyRemove, removeFXALogin = false) {
    this.log("Removing all logins.");

    const removedLogins = [];
    const remainingLogins = [];

    const logins = await this.#storageAdapter.list();
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

    if (idsToDelete.length) {
      await this.#storageAdapter.deleteMany(idsToDelete);
    }
  }

  async countLoginsAsync(origin, formActionOrigin, httpRealm) {
    if (!origin && !formActionOrigin && !httpRealm) {
      return await this.#storageAdapter.count();
    }

    if (origin && !formActionOrigin && !httpRealm) {
      return await this.#storageAdapter.countByOrigin(origin);
    }

    if (!origin && formActionOrigin && !httpRealm) {
      return await this.#storageAdapter.countByFormActionOrigin(
        formActionOrigin
      );
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
    const [logins] = await this.#searchLogins(matchData);

    this.log(`Counted ${logins.length} logins.`);
    return logins.length;
  }

  async addPotentiallyVulnerablePassword(login) {
    await this.#storageAdapter.recordPotentiallyVulnerablePasswords([
      login.password,
    ]);
    if (this.#isActive) {
      lazy.LoginHelper.notifyStorageChanged(
        "addPotentiallyVulnerablePassword",
        login
      );
    }
  }

  // adding multiple potentially vulnerable passwords during migration
  async addPotentiallyVulnerablePasswords(passwords) {
    await this.#storageAdapter.recordPotentiallyVulnerablePasswords(passwords);
  }

  async isPotentiallyVulnerablePassword(login) {
    return this.#storageAdapter.isPotentiallyVulnerablePassword(
      login.QueryInterface(Ci.nsILoginMetaInfo).guid
    );
  }

  async arePotentiallyVulnerablePasswords(logins) {
    const ids = logins.map(l => l.QueryInterface(Ci.nsILoginMetaInfo).guid);
    return this.#storageAdapter.arePotentiallyVulnerablePasswords(ids);
  }

  async clearAllPotentiallyVulnerablePasswords() {
    await this.#storageAdapter.clearAllPotentiallyVulnerablePasswords();
    if (this.#isActive) {
      lazy.LoginHelper.notifyStorageChanged(
        "clearAllPotentiallyVulnerablePasswords"
      );
    }
  }

  get _crypto() {
    if (!this.__crypto) {
      this.__crypto = Cc["@mozilla.org/login-manager/crypto/SDR;1"].getService(
        Ci.nsILoginManagerCrypto
      );
    }
    return this.__crypto;
  }

  get uiBusy() {
    return this._crypto.uiBusy;
  }

  get isLoggedIn() {
    return this._crypto.isLoggedIn;
  }
}

ChromeUtils.defineLazyGetter(LoginManagerRustStorage.prototype, "log", () => {
  const logger = lazy.LoginHelper.createLogger("RustLogins");
  return logger.log.bind(logger);
});
