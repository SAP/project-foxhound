/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Migrates from a Firefox SelectableProfile in a lossy manner in order to
 * clean up a user's profile. Data is only migrated where the benefits outweigh
 * the potential problems caused by importing undesired/invalid configurations
 * from the source profile.
 */

import { MigrationUtils } from "resource:///modules/MigrationUtils.sys.mjs";
import { SelectableProfileService } from "resource:///modules/profiles/SelectableProfileService.sys.mjs";
import { FirefoxProfileMigrator } from "resource:///modules/FirefoxProfileMigrator.sys.mjs";

/**
 * Firefox SelectableProfile migrator. Currently, this class only does
 * "pave over" migrations, where various parts of an old profile overwrite a
 * new profile. This is distinct from other migrators which attempt to import
 * old profile data into the existing profile.
 *
 * This migrator is what powers the "Profile Refresh" mechanism for
 * selectable profiles.
 */
export class FirefoxSelectableProfileMigrator extends FirefoxProfileMigrator {
  static get key() {
    return "firefox-selectable-profile";
  }

  /**
   * Get all the profiles in the group. The group storeID is set environment
   * variable SELECTABLE_PROFILE_RESET_STORE_ID.
   *
   * @returns {Map} A map of available profiles
   *   The key is the absolute profile path, the value is an object with some
   *   profile information
   */
  async getAllProfiles() {
    await SelectableProfileService.startupMigrationInit();

    let availableProfiles = new Map();
    let profiles = await SelectableProfileService.getAllProfiles();
    for (let profile of profiles) {
      let rootDir = await profile.rootDir;

      if (
        rootDir.exists() &&
        rootDir.isReadable() &&
        !rootDir.equals(MigrationUtils.profileStartup.directory)
      ) {
        availableProfiles.set(profile.path, {
          id: profile.path,
          name: profile.name,
          rootDir,
        });
      }
    }
    return availableProfiles;
  }

  getResourcesInternal(sourceProfileDir, currentProfileDir) {
    let resources = super.getResourcesInternal(
      sourceProfileDir,
      currentProfileDir
    );

    function savePrefs() {
      // If we've used the pref service to write prefs for the new profile, it's too
      // early in startup for the service to have a profile directory, so we have to
      // manually tell it where to save the prefs file.
      let newPrefsFile = currentProfileDir.clone();
      newPrefsFile.append("prefs.js");
      Services.prefs.savePrefFile(newPrefsFile);
    }

    let types = MigrationUtils.resourceTypes;
    let profiles = {
      name: "profiles",
      type: types.OTHERDATA,
      migrate: async aCallback => {
        try {
          const storeID = Services.env.get("SELECTABLE_PROFILE_RESET_STORE_ID");
          if (storeID) {
            Services.prefs.setStringPref("toolkit.profiles.storeID", storeID);
            Services.prefs.setBoolPref("browser.profiles.enabled", true);
            Services.prefs.setBoolPref("browser.profiles.created", true);
          }

          savePrefs();
        } catch {
          aCallback(false);
          return;
        }

        aCallback(true);
      },
    };

    let allResources = resources.concat([profiles].filter(r => r));
    return allResources;
  }
}
