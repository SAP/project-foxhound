/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// TDOD: Remove eslint-disable lines once methods are updated. See bug 1896727
/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-private-class-members */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import { SelectableProfile } from "./SelectableProfile.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  CryptoUtils: "resource://services-crypto/utils.sys.mjs",
  Sqlite: "resource://gre/modules/Sqlite.sys.mjs",
});

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "ProfileService",
  "@mozilla.org/toolkit/profile-service;1",
  "nsIToolkitProfileService"
);

const PROFILES_CRYPTO_SALT_LENGTH_BYTES = 8;

/**
 * The service that manages selectable profiles
 */
export class SelectableProfileService {
  #connection = null;
  #asyncShutdownBlocker = null;
  #initialized = false;
  #groupToolkitProfile = null;

  static get PROFILE_GROUPS_DIR() {
    return PathUtils.join(
      Services.dirsvc.get("UAppData", Ci.nsIFile).path,
      "Profile Groups"
    );
  }

  async createProfilesStorePath() {
    await IOUtils.makeDirectory(SelectableProfileService.PROFILE_GROUPS_DIR);

    const storageID = Services.uuid
      .generateUUID()
      .toString()
      .replace("{", "")
      .split("-")[0];
    this.#groupToolkitProfile.storeID = storageID;
  }

  async getProfilesStorePath() {
    if (!this.#groupToolkitProfile?.storeID) {
      await this.createProfilesStorePath();
    }

    return PathUtils.join(
      SelectableProfileService.PROFILE_GROUPS_DIR,
      `${this.#groupToolkitProfile.storeID}.sqlite`
    );
  }

  /**
   * At startup, store the nsToolkitProfile for the group.
   * Get the groupDBPath from the nsToolkitProfile, and connect to it.
   */
  async init() {
    if (this.#initialized) {
      return;
    }

    this.#groupToolkitProfile = lazy.ProfileService.currentProfile;

    await this.initConnection();

    this.#initialized = true;
  }

  async initConnection() {
    if (this.#connection) {
      return;
    }

    let path = await this.getProfilesStorePath();

    // TODO: (Bug 1902320) Handle exceptions on connection opening
    // This could fail if the store is corrupted.
    this.#connection = await lazy.Sqlite.openConnection({
      path,
      openNotExclusive: true,
    });

    await this.#connection.execute("PRAGMA journal_mode = WAL");
    await this.#connection.execute("PRAGMA wal_autocheckpoint = 16");

    this.#asyncShutdownBlocker = async () => {
      await this.#connection.close();
      this.#connection = null;
    };

    // This could fail if we're adding it during shutdown. In this case,
    // don't throw but close the connection.
    try {
      lazy.Sqlite.shutdown.addBlocker(
        "Profiles:ProfilesSqlite closing",
        this.#asyncShutdownBlocker
      );
    } catch (ex) {
      await this.closeConnection();
      return;
    }

    await this.createProfilesDBTables();
  }

  async closeConnection() {
    if (this.#asyncShutdownBlocker) {
      lazy.Sqlite.shutdown.removeBlocker(this.#asyncShutdownBlocker);
      this.#asyncShutdownBlocker = null;
    }

    if (this.#connection) {
      // An error could occur while closing the connection. We suppress the
      // error since it is not a critical part of the browser.
      try {
        await this.#connection.close();
      } catch (ex) {}
      this.#connection = null;
    }
  }

  /**
   * Create tables for Selectable Profiles if they don't already exist
   */
  async createProfilesDBTables() {
    // TODO: (Bug 1902320) Handle exceptions on connection opening
    await this.#connection.executeTransaction(async () => {
      const createProfilesTable = `
        CREATE TABLE IF NOT EXISTS "Profiles" (
          id  INTEGER NOT NULL,
          path	TEXT NOT NULL UNIQUE,
          name	TEXT NOT NULL,
          avatar	TEXT NOT NULL,
          themeL10nId	TEXT NOT NULL,
          themeFg	TEXT NOT NULL,
          themeBg	TEXT NOT NULL,
          PRIMARY KEY(id)
        );`;

      await this.#connection.execute(createProfilesTable);

      const createSharedPrefsTable = `
        CREATE TABLE IF NOT EXISTS "SharedPrefs" (
          id	INTEGER NOT NULL,
          name	TEXT NOT NULL UNIQUE,
          value	BLOB,
          isBoolean	INTEGER,
          PRIMARY KEY(id)
        );`;

      await this.#connection.execute(createSharedPrefsTable);
    });
  }

  /**
   * Create the SQLite DB for the profile group.
   * Init shared prefs for the group and add to DB.
   * Create the Group DB path to aNamedProfile entry in profiles.ini.
   * Import aNamedProfile into DB.
   */
  createProfileGroup() {}

  /**
   * When the last selectable profile in a group is deleted,
   * also remove the profile group's named profile entry from profiles.ini
   * and vacuum the group DB.
   */
  async deleteProfileGroup() {
    if (this.getProfiles().length) {
      return;
    }

    this.#groupToolkitProfile.storeID = null;
    await this.vacuumAndCloseGroupDB();
  }

  // App session lifecycle methods and multi-process support

  /**
   * When the group DB has been updated, either changes to prefs or profiles,
   * ask the remoting service to notify other running instances that they should
   * check for updates and refresh their UI accordingly.
   */
  notify() {}

  /**
   * Invoked when the remoting service has notified this instance that another
   * instance has updated the database. Triggers refreshProfiles() and refreshPrefs().
   */
  observe() {}

  /**
   * Init or update the current SelectableProfiles from the DB.
   */
  refreshProfiles() {}

  /**
   * Fetch all prefs from the DB and write to the current instance.
   */
  refreshPrefs() {}

  /**
   * Update the current default profile by setting its path as the Path
   * of the nsToolkitProfile for the group.
   *
   * @param {SelectableProfile} aSelectableProfile The new default SelectableProfile
   */
  setDefault(aSelectableProfile) {}

  /**
   * Update whether to show the selectable profile selector window at startup.
   * Set on the nsToolkitProfile instance for the group.
   *
   * @param {boolean} shouldShow Whether or not we should show the profile selector
   */
  setShowProfileChooser(shouldShow) {}

  /**
   * Update the path to the group DB. Set on the nsToolkitProfile instance
   * for the group.
   *
   * @param {string} aPath The path to the group DB
   */
  setGroupDBPath(aPath) {}

  // SelectableProfile lifecycle

  /**
   * Create the profile directory for new profile. The profile name is combined
   * with a salt string to ensure the directory is unique. The format of the
   * directory is salt + "." + profileName. (Ex. c7IZaLu7.testProfile)
   *
   * @param {string} aProfileName The name of the profile to be created
   * @returns {string} The directory name for the given profile name
   */
  async createProfileDirs(aProfileName) {
    const salt = btoa(
      lazy.CryptoUtils.generateRandomBytesLegacy(
        PROFILES_CRYPTO_SALT_LENGTH_BYTES
      )
    ).slice(0, 8);
    const profileDir = `${salt}.${aProfileName}`;

    // Handle errors in bug 1909919
    await Promise.all([
      IOUtils.makeDirectory(
        PathUtils.join(
          Services.dirsvc.get("DefProfRt", Ci.nsIFile).path,
          profileDir
        )
      ),
      IOUtils.makeDirectory(
        PathUtils.join(
          Services.dirsvc.get("DefProfLRt", Ci.nsIFile).path,
          profileDir
        )
      ),
    ]);
    return profileDir;
  }

  /**
   * Create an empty SelectableProfile and add it to the group DB.
   * This is an unmanaged profile from the nsToolkitProfile perspective.
   *
   * @param {object} profile An object that contains a path, name, themeL10nId,
   *                 themeFg, and themeBg for creating a new profile.
   */
  async createProfile(profile) {
    let profileDir = await this.createProfileDirs(profile.name);
    profile.path = profileDir;
    await this.#connection.execute(
      `INSERT INTO Profiles VALUES (NULL, :path, :name, :avatar, :themeL10nId, :themeFg, :themeBg);`,
      profile
    );
    return this.getProfileByName(profile.name);
  }

  /**
   * Remove the profile directories.
   *
   * @param {string} profileDir Directory name of profile to be removed.
   */
  async removeProfileDirs(profileDir) {
    // Handle errors in bug 1909919
    await Promise.all([
      IOUtils.remove(
        PathUtils.join(
          Services.dirsvc.get("DefProfRt", Ci.nsIFile).path,
          profileDir
        ),
        {
          recursive: true,
        }
      ),
      IOUtils.remove(
        PathUtils.join(
          Services.dirsvc.get("DefProfLRt", Ci.nsIFile).path,
          profileDir
        ),
        {
          recursive: true,
        }
      ),
    ]);
  }

  /**
   * Delete a SelectableProfile from the group DB.
   * If it was the last profile in the group, also call deleteProfileGroup().
   *
   * @param {SelectableProfile} aSelectableProfile The SelectableProfile to be deleted
   * @param {boolean} removeFiles True if the profile directory should be removed
   */
  async deleteProfile(aSelectableProfile, removeFiles) {
    await this.#connection.execute("DELETE FROM Profiles WHERE id = :id;", {
      id: aSelectableProfile.id,
    });
    if (removeFiles) {
      await this.removeProfileDirs(aSelectableProfile.path);
    }
  }

  /**
   * Close all active instances running the current profile
   */
  closeActiveProfileInstances() {}

  /**
   * Schedule deletion of the current SelectableProfile as a background task, then exit.
   */
  async deleteCurrentProfile() {
    this.closeActiveProfileInstances();

    await this.#connection.executeBeforeShutdown(
      "SelectableProfileService: deleteCurrentProfile",
      db =>
        db.execute("DELETE FROM Profiles WHERE id = :id;", {
          id: this.currentProfile.id,
        })
    );
  }

  /**
   * Write an updated profile to the DB.
   *
   * @param {SelectableProfile} aSelectableProfile The SelectableProfile to be updated
   */
  async updateProfile(aSelectableProfile) {
    let profile = {
      id: aSelectableProfile.id,
      path: aSelectableProfile.path,
      name: aSelectableProfile.name,
      avatar: aSelectableProfile.avatar,
      ...aSelectableProfile.theme,
    };

    await this.#connection.execute(
      `UPDATE Profiles
       SET path = :path, name = :name, avatar = :avatar, themeL10nId = :themeL10nId, themeFg = :themeFg, themeBg = :themeBg
       WHERE id = :id;`,
      profile
    );
  }

  /**
   * Get the complete list of profiles in the group.
   */
  async getProfiles() {
    return (
      await this.#connection.executeCached("SELECT * FROM Profiles;")
    ).map(row => {
      return new SelectableProfile(row);
    });
  }

  /**
   * Get a specific profile by its internal ID.
   *
   * @param {number} aProfileID The internal id of the profile
   */
  async getProfile(aProfileID) {
    let row = (
      await this.#connection.execute("SELECT * FROM Profiles WHERE id = :id;", {
        id: aProfileID,
      })
    )[0];

    return new SelectableProfile(row);
  }

  /**
   * Get a specific profile by its name.
   *
   * @param {string} aProfileNanme The name of the profile
   */
  async getProfileByName(aProfileNanme) {
    let row = (
      await this.#connection.execute(
        "SELECT * FROM Profiles WHERE name = :name;",
        {
          name: aProfileNanme,
        }
      )
    )[0];

    return new SelectableProfile(row);
  }

  // Shared Prefs management

  getPrefValueFromRow(row) {
    let value = row.getResultByName("value");
    if (row.getResultByName("isBoolean")) {
      return value === 1;
    }

    return value;
  }

  /**
   * Get all shared prefs as a list.
   */
  async getAllPrefs() {
    return (
      await this.#connection.executeCached("SELECT * FROM SharedPrefs;")
    ).map(row => {
      let value = this.getPrefValueFromRow(row);
      return {
        name: row.getResultByName("name"),
        value,
        type: typeof value,
      };
    });
  }

  /**
   * Get the value of a specific shared pref.
   *
   * @param {string} aPrefName The name of the pref to get
   *
   * @returns {any} Value of the pref
   */
  async getPref(aPrefName) {
    let row = (
      await this.#connection.execute(
        "SELECT value, isBoolean FROM SharedPrefs WHERE name = :name;",
        {
          name: aPrefName,
        }
      )
    )[0];

    return this.getPrefValueFromRow(row);
  }

  /**
   * Get the value of a specific shared pref.
   *
   * @param {string} aPrefName The name of the pref to get
   *
   * @returns {boolean} Value of the pref
   */
  async getBoolPref(aPrefName) {
    let prefValue = await this.getPref(aPrefName);
    if (typeof prefValue !== "boolean") {
      return null;
    }

    return prefValue;
  }

  /**
   * Get the value of a specific shared pref.
   *
   * @param {string} aPrefName The name of the pref to get
   *
   * @returns {number} Value of the pref
   */
  async getIntPref(aPrefName) {
    let prefValue = await this.getPref(aPrefName);
    if (typeof prefValue !== "number") {
      return null;
    }

    return prefValue;
  }

  /**
   * Get the value of a specific shared pref.
   *
   * @param {string} aPrefName The name of the pref to get
   *
   * @returns {string} Value of the pref
   */
  async getStringPref(aPrefName) {
    let prefValue = await this.getPref(aPrefName);
    if (typeof prefValue !== "string") {
      return null;
    }

    return prefValue;
  }

  /**
   * Insert or update a pref value, then notify() other running instances.
   *
   * @param {string} aPrefName The name of the pref
   * @param {any} aPrefValue The value of the pref
   */
  async setPref(aPrefName, aPrefValue) {
    await this.#connection.execute(
      "INSERT INTO SharedPrefs(id, name, value, isBoolean) VALUES (NULL, :name, :value, :isBoolean) ON CONFLICT(name) DO UPDATE SET value=excluded.value, isBoolean=excluded.isBoolean;",
      {
        name: aPrefName,
        value: aPrefValue,
        isBoolean: typeof aPrefValue === "boolean",
      }
    );
  }

  /**
   * Insert or update a pref value, then notify() other running instances.
   *
   * @param {string} aPrefName The name of the pref
   * @param {boolean} aPrefValue The value of the pref
   */
  async setBoolPref(aPrefName, aPrefValue) {
    if (typeof aPrefValue !== "boolean") {
      throw new Error("aPrefValue must be of type boolean");
    }
    await this.setPref(aPrefName, aPrefValue);
  }

  /**
   * Insert or update a pref value, then notify() other running instances.
   *
   * @param {string} aPrefName The name of the pref
   * @param {number} aPrefValue The value of the pref
   */
  async setIntPref(aPrefName, aPrefValue) {
    if (typeof aPrefValue !== "number") {
      throw new Error("aPrefValue must be of type number");
    }
    await this.setPref(aPrefName, aPrefValue);
  }

  /**
   * Insert or update a pref value, then notify() other running instances.
   *
   * @param {string} aPrefName The name of the pref
   * @param {string} aPrefValue The value of the pref
   */
  async setStringPref(aPrefName, aPrefValue) {
    if (typeof aPrefValue !== "string") {
      throw new Error("aPrefValue must be of type string");
    }
    await this.setPref(aPrefName, aPrefValue);
  }

  /**
   * Remove a shared pref, then notify() other running instances.
   *
   * @param {string} aPrefName The name of the pref to delete
   */
  async deletePref(aPrefName) {
    await this.#connection.execute(
      "DELETE FROM SharedPrefs WHERE name = :name;",
      {
        name: aPrefName,
      }
    );
  }

  // DB lifecycle

  /**
   * Create the SQLite DB for the profile group at groupDBPath.
   * Init shared prefs for the group and add to DB.
   */
  createGroupDB() {}

  /**
   * Vacuum the SQLite DB.
   */
  async vacuumAndCloseGroupDB() {
    await this.#connection.execute("VACUUM;");
    await this.closeConnection();
  }
}
