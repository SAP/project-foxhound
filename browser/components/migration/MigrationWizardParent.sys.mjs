/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { MigrationUtils } from "resource:///modules/MigrationUtils.sys.mjs";
import { E10SUtils } from "resource://gre/modules/E10SUtils.sys.mjs";
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

XPCOMUtils.defineLazyGetter(lazy, "gFluentStrings", function() {
  return new Localization([
    "branding/brand.ftl",
    "locales-preview/migrationWizard.ftl",
  ]);
});

ChromeUtils.defineESModuleGetters(lazy, {
  InternalTestingProfileMigrator:
    "resource:///modules/InternalTestingProfileMigrator.sys.mjs",
  PromiseUtils: "resource://gre/modules/PromiseUtils.sys.mjs",
});

/**
 * This class is responsible for communicating with MigrationUtils to do the
 * actual heavy-lifting of any kinds of migration work, based on messages from
 * the associated MigrationWizardChild.
 */
export class MigrationWizardParent extends JSWindowActorParent {
  /**
   * General message handler function for messages received from the
   * associated MigrationWizardChild JSWindowActor.
   *
   * @param {ReceiveMessageArgument} message
   *   The message received from the MigrationWizardChild.
   * @returns {Promise}
   */
  async receiveMessage(message) {
    // Some belt-and-suspenders here, mainly because the migration-wizard
    // component can be embedded in less privileged content pages, so let's
    // make sure that any messages from content are coming from the privileged
    // about content process type.
    if (
      !this.browsingContext.currentWindowGlobal.isInProcess &&
      this.browsingContext.currentRemoteType !=
        E10SUtils.PRIVILEGEDABOUT_REMOTE_TYPE
    ) {
      throw new Error(
        "MigrationWizardParent: received message from the wrong content process type."
      );
    }

    switch (message.name) {
      case "GetAvailableMigrators": {
        let availableMigrators = [];
        for (const key of MigrationUtils.availableMigratorKeys) {
          availableMigrators.push(this.#getMigratorAndProfiles(key));
        }
        // Wait for all getMigrator calls to resolve in parallel
        let results = await Promise.all(availableMigrators);
        // Each migrator might give us a single MigratorProfileInstance,
        // or an Array of them, so we flatten them out and filter out
        // any that ended up going wrong and returning null from the
        // #getMigratorAndProfiles call.
        return results.flat().filter(result => result);
      }

      case "Migrate": {
        await this.#doMigration(
          message.data.key,
          message.data.resourceTypes,
          message.data.profile
        );
      }
    }

    return null;
  }

  /**
   * Calls into MigrationUtils to perform a migration given the parameters
   * sent via the wizard.
   *
   * @param {string} migratorKey
   *   The unique identification key for a migrator.
   * @param {string[]} resourceTypes
   *   An array of strings, where each string represents a resource type
   *   that can be imported for this migrator and profile. The strings
   *   should be one of the key values of
   *   MigrationWizardConstants.DISPLAYED_RESOURCE_TYPES.
   * @param {object|null} profileObj
   *   A description of the user profile that the migrator can import.
   * @param {string} profileObj.id
   *   A unique ID for the user profile.
   * @param {string} profileObj.name
   *   The display name for the user profile.
   * @returns {Promise<undefined>}
   *   Resolves once the Migration:Ended observer notification has fired.
   */
  async #doMigration(migratorKey, resourceTypes, profileObj) {
    let migrator = await MigrationUtils.getMigrator(migratorKey);
    let resourceTypesToMigrate = 0;
    let progress = {};

    for (let resourceType of resourceTypes) {
      resourceTypesToMigrate |= MigrationUtils.resourceTypes[resourceType];
      progress[resourceType] = {
        inProgress: true,
        message: "",
      };
    }

    this.sendAsyncMessage("UpdateProgress", progress);

    let observer = {
      observe: (subject, topic, resourceType) => {
        if (topic == "Migration:Ended") {
          observer.migrationDefer.resolve();
          return;
        }

        // Unfortunately, MigratorBase hands us the string representation
        // of the numeric value of the MigrationUtils.resourceType from this
        // observer. For now, we'll just do a look-up to map it to the right
        // constant.

        let resourceTypeNum = parseInt(resourceType, 10);
        let foundResourceTypeName;
        for (let resourceTypeName in MigrationUtils.resourceTypes) {
          if (
            MigrationUtils.resourceTypes[resourceTypeName] == resourceTypeNum
          ) {
            foundResourceTypeName = resourceTypeName;
            break;
          }
        }

        if (!foundResourceTypeName) {
          console.error(
            "Could not find a resource type for value: ",
            resourceType
          );
        } else {
          // For now, we ignore errors in migration, and simply display
          // the success state.
          progress[foundResourceTypeName] = {
            inProgress: false,
            message: "",
          };
          this.sendAsyncMessage("UpdateProgress", progress);
        }
      },

      migrationDefer: lazy.PromiseUtils.defer(),

      QueryInterface: ChromeUtils.generateQI([
        Ci.nsIObserver,
        Ci.nsISupportsWeakReference,
      ]),
    };
    Services.obs.addObserver(observer, "Migration:ItemAfterMigrate", true);
    Services.obs.addObserver(observer, "Migration:ItemError", true);
    Services.obs.addObserver(observer, "Migration:Ended", true);

    try {
      // The MigratorBase API is somewhat awkward - we must wait for an observer
      // notification with topic Migration:Ended to know when the migration
      // finishes.
      migrator.migrate(resourceTypesToMigrate, false, profileObj);
      await observer.migrationDefer.promise;
    } finally {
      Services.obs.removeObserver(observer, "Migration:ItemAfterMigrate");
      Services.obs.removeObserver(observer, "Migration:ItemError");
      Services.obs.removeObserver(observer, "Migration:Ended");
    }
  }

  /**
   * @typedef {object} MigratorProfileInstance
   *   An object that describes a single user profile (or the default
   *   user profile) for a particular migrator.
   * @property {string} key
   *   The unique identification key for a migrator.
   * @property {string} displayName
   *   The display name for the migrator that will be shown to the user
   *   in the wizard.
   * @property {string[]} resourceTypes
   *   An array of strings, where each string represents a resource type
   *   that can be imported for this migrator and profile. The strings
   *   should be one of the key values of
   *   MigrationWizardConstants.DISPLAYED_RESOURCE_TYPES.
   *
   *   Example: ["HISTORY", "FORMDATA", "PASSWORDS", "BOOKMARKS"]
   * @property {object|null} profile
   *   A description of the user profile that the migrator can import.
   * @property {string} profile.id
   *   A unique ID for the user profile.
   * @property {string} profile.name
   *   The display name for the user profile.
   */

  /**
   * Asynchronously fetches a migrator for a particular key, and then
   * also gets any user profiles that exist on for that migrator. Resolves
   * to null if something goes wrong getting information about the migrator
   * or any of the user profiles.
   *
   * @param {string} key
   *   The unique identification key for a migrator.
   * @returns {Promise<MigratorProfileInstance[]|null>}
   */
  async #getMigratorAndProfiles(key) {
    try {
      let migrator = await MigrationUtils.getMigrator(key);
      if (!migrator) {
        return null;
      }

      let sourceProfiles = await migrator.getSourceProfiles();
      if (Array.isArray(sourceProfiles)) {
        if (!sourceProfiles.length) {
          return null;
        }

        let result = [];
        for (let profile of sourceProfiles) {
          result.push(
            await this.#serializeMigratorAndProfile(migrator, profile)
          );
        }
        return result;
      }
      return this.#serializeMigratorAndProfile(migrator, sourceProfiles);
    } catch (e) {
      console.error(`Could not get migrator with key ${key}`, e);
    }
    return null;
  }

  /**
   * Asynchronously fetches information about what resource types can be
   * migrated for a particular migrator and user profile, and then packages
   * the migrator, user profile data, and resource type data into an object
   * that can be sent down to the MigrationWizardChild.
   *
   * @param {MigratorBase} migrator
   *   A migrator subclass of MigratorBase.
   * @param {object|null} profileObj
   *   The user profile object representing the profile to get information
   *   about. This object is usually gotten by calling getSourceProfiles on
   *   the migrator.
   * @returns {Promise<MigratorProfileInstance>}
   */
  async #serializeMigratorAndProfile(migrator, profileObj) {
    let profileMigrationData = await migrator.getMigrateData(profileObj);
    let availableResourceTypes = [];

    for (let resourceType in MigrationUtils.resourceTypes) {
      if (profileMigrationData & MigrationUtils.resourceTypes[resourceType]) {
        availableResourceTypes.push(resourceType);
      }
    }

    let displayName;

    if (migrator.constructor.key == lazy.InternalTestingProfileMigrator.key) {
      // In the case of the InternalTestingProfileMigrator, which is never seen
      // by users outside of testing, we don't make our localization community
      // localize it's display name, and just display the ID instead.
      displayName = migrator.constructor.displayNameL10nID;
    } else {
      displayName = await lazy.gFluentStrings.formatValue(
        migrator.constructor.displayNameL10nID
      );
    }

    return {
      key: migrator.constructor.key,
      displayName,
      resourceTypes: availableResourceTypes,
      profile: profileObj,
    };
  }
}
