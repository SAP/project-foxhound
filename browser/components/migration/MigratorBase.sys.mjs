/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const TOPIC_WILL_IMPORT_BOOKMARKS =
  "initial-migration-will-import-default-bookmarks";
const TOPIC_DID_IMPORT_BOOKMARKS =
  "initial-migration-did-import-default-bookmarks";
const TOPIC_PLACES_DEFAULTS_FINISHED = "places-browser-init-complete";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  BookmarkHTMLUtils: "resource://gre/modules/BookmarkHTMLUtils.sys.mjs",
  MigrationUtils: "resource:///modules/MigrationUtils.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  PromiseUtils: "resource://gre/modules/PromiseUtils.sys.mjs",
  ResponsivenessMonitor: "resource://gre/modules/ResponsivenessMonitor.sys.mjs",
});

/**
 * @typedef {object} MigratorResource
 *   A resource returned by a subclass of MigratorBase that can migrate
 *   data to this browser.
 * @property {number} type
 *   A bitfield with bits from MigrationUtils.resourceTypes flipped to indicate
 *   what this resource represents. A resource can represent one or more types
 *   of data, for example HISTORY and FORMDATA.
 * @property {Function} migrate
 *   A function that will actually perform the migration of this resource's
 *   data into this browser.
 */

/**
 * Shared prototype for migrators.
 *
 * To implement a migrator:
 * 1. Import this module.
 * 2. Create a subclass of MigratorBase for your new migrator.
 * 3. Override the `key` static getter with a unique identifier for the browser
 *    that this migrator migrates from.
 * 4. If the migrator supports multiple profiles, override the sourceProfiles
 *    Here we default for single-profile migrator.
 * 5. Implement getResources(aProfile) (see below).
 * 6. For startup-only migrators, override |startupOnlyMigrator|.
 * 7. Add the migrator to the MIGRATOR_MODULES structure in MigrationUtils.sys.mjs.
 */
export class MigratorBase {
  /**
   * This must be overridden to return a simple string identifier for the
   * migrator, for example "firefox", "chrome", "opera-gx". This key is what
   * is used as an identifier when calling MigrationUtils.getMigrator.
   *
   * @type {string}
   */
  static get key() {
    throw new Error("MigratorBase.key must be overridden.");
  }

  /**
   * This must be overridden to return a Fluent string ID mapping to the display
   * name for this migrator. These strings should be defined in migrationWizard.ftl.
   *
   * @type {string}
   */
  static get displayNameL10nID() {
    throw new Error("MigratorBase.displayNameL10nID must be overridden.");
  }

  /**
   * OVERRIDE IF AND ONLY IF the source supports multiple profiles.
   *
   * Returns array of profile objects from which data may be imported. The object
   * should have the following keys:
   *   id - a unique string identifier for the profile
   *   name - a pretty name to display to the user in the UI
   *
   * Only profiles from which data can be imported should be listed.  Otherwise
   * the behavior of the migration wizard isn't well-defined.
   *
   * For a single-profile source (e.g. safari, ie), this returns null,
   * and not an empty array.  That is the default implementation.
   *
   * @abstract
   * @returns {object[]|null}
   */
  getSourceProfiles() {
    return null;
  }

  /**
   * MUST BE OVERRIDDEN.
   *
   * Returns an array of "migration resources" objects for the given profile,
   * or for the "default" profile, if the migrator does not support multiple
   * profiles.
   *
   * Each migration resource should provide:
   * - a |type| getter, returning any of the migration resource types (see
   *   MigrationUtils.resourceTypes).
   *
   * - a |migrate| method, taking a single argument, aCallback(bool success),
   *   for migrating the data for this resource.  It may do its job
   *   synchronously or asynchronously.  Either way, it must call
   *   aCallback(bool aSuccess) when it's done.  In the case of an exception
   *   thrown from |migrate|, it's taken as if aCallback(false) is called.
   *
   *   Note: In the case of a simple asynchronous implementation, you may find
   *   MigrationUtils.wrapMigrateFunction handy for handling aCallback easily.
   *
   * For each migration type listed in MigrationUtils.resourceTypes, multiple
   * migration resources may be provided.  This practice is useful when the
   * data for a certain migration type is independently stored in few
   * locations.  For example, the mac version of Safari stores its "reading list"
   * bookmarks in a separate property list.
   *
   * Note that the importation of a particular migration type is reported as
   * successful if _any_ of its resources succeeded to import (that is, called,
   * |aCallback(true)|).  However, completion-status for a particular migration
   * type is reported to the UI only once all of its migrators have called
   * aCallback.
   *
   * NOTE: The returned array should only include resources from which data
   * can be imported.  So, for example, before adding a resource for the
   * BOOKMARKS migration type, you should check if you should check that the
   * bookmarks file exists.
   *
   * @abstract
   * @param {object|string} aProfile
   *  The profile from which data may be imported, or an empty string
   *  in the case of a single-profile migrator.
   *  In the case of multiple-profiles migrator, it is guaranteed that
   *  aProfile is a value returned by the sourceProfiles getter (see
   *  above).
   * @returns {Promise<MigratorResource[]>|MigratorResource[]}
   */
  // eslint-disable-next-line no-unused-vars
  getResources(aProfile) {
    throw new Error("getResources must be overridden");
  }

  /**
   * OVERRIDE in order to provide an estimate of when the last time was
   * that somebody used the browser. It is OK that this is somewhat fuzzy -
   * history may not be available (or be wiped or not present due to e.g.
   * incognito mode).
   *
   * If not overridden, the promise will resolve to the Unix epoch.
   *
   * @returns {Promise<Date>}
   *   A Promise that resolves to the last used date.
   */
  getLastUsedDate() {
    return Promise.resolve(new Date(0));
  }

  /**
   * OVERRIDE IF AND ONLY IF the migrator is a startup-only migrator (For now,
   * that is just the Firefox migrator, see bug 737381).  Default: false.
   *
   * Startup-only migrators are different in two ways:
   * - they may only be used during startup.
   * - the user-profile is half baked during migration.  The folder exists,
   *   but it's only accessible through MigrationUtils.profileStartup.
   *   The migrator can call MigrationUtils.profileStartup.doStartup
   *   at any point in order to initialize the profile.
   *
   * @returns {boolean}
   *   true if the migrator is start-up only.
   */
  get startupOnlyMigrator() {
    return false;
  }

  /**
   * Returns true if the migrator is configured to be enabled. This is
   * controlled by the `browser.migrate.<BROWSER_KEY>.enabled` boolean
   * preference.
   *
   * @returns {boolean}
   *   true if the migrator should be shown in the migration wizard.
   */
  get enabled() {
    let key = this.constructor.key;
    return Services.prefs.getBoolPref(`browser.migrate.${key}.enabled`, false);
  }

  /**
   * This method returns a number that is the bitwise OR of all resource
   * types that are available in aProfile. See MigrationUtils.resourceTypes
   * for each resource type.
   *
   * @param {object|string} aProfile
   *   The profile from which data may be imported, or an empty string
   *   in the case of a single-profile migrator.
   * @returns {number}
   */
  async getMigrateData(aProfile) {
    let resources = await this.#getMaybeCachedResources(aProfile);
    if (!resources) {
      return 0;
    }
    let types = resources.map(r => r.type);
    return types.reduce((a, b) => {
      a |= b;
      return a;
    }, 0);
  }

  /**
   * @see MigrationUtils
   *
   * @param {number} aItems
   *   A bitfield with bits from MigrationUtils.resourceTypes flipped to indicate
   *   what types of resources should be migrated.
   * @param {boolean} aStartup
   *   True if this migration is occurring during startup.
   * @param {object|string} aProfile
   *   The other browser profile that is being migrated from.
   */
  async migrate(aItems, aStartup, aProfile) {
    let resources = await this.#getMaybeCachedResources(aProfile);
    if (!resources.length) {
      throw new Error("migrate called for a non-existent source");
    }

    if (aItems != lazy.MigrationUtils.resourceTypes.ALL) {
      resources = resources.filter(r => aItems & r.type);
    }

    // Used to periodically give back control to the main-thread loop.
    let unblockMainThread = function() {
      return new Promise(resolve => {
        Services.tm.dispatchToMainThread(resolve);
      });
    };

    let getHistogramIdForResourceType = (resourceType, template) => {
      if (resourceType == lazy.MigrationUtils.resourceTypes.HISTORY) {
        return template.replace("*", "HISTORY");
      }
      if (resourceType == lazy.MigrationUtils.resourceTypes.BOOKMARKS) {
        return template.replace("*", "BOOKMARKS");
      }
      if (resourceType == lazy.MigrationUtils.resourceTypes.PASSWORDS) {
        return template.replace("*", "LOGINS");
      }
      return null;
    };

    let browserKey = this.constructor.key;

    let maybeStartTelemetryStopwatch = resourceType => {
      let histogramId = getHistogramIdForResourceType(
        resourceType,
        "FX_MIGRATION_*_IMPORT_MS"
      );
      if (histogramId) {
        TelemetryStopwatch.startKeyed(histogramId, browserKey);
      }
      return histogramId;
    };

    let maybeStartResponsivenessMonitor = resourceType => {
      let responsivenessMonitor;
      let responsivenessHistogramId = getHistogramIdForResourceType(
        resourceType,
        "FX_MIGRATION_*_JANK_MS"
      );
      if (responsivenessHistogramId) {
        responsivenessMonitor = new lazy.ResponsivenessMonitor();
      }
      return { responsivenessMonitor, responsivenessHistogramId };
    };

    let maybeFinishResponsivenessMonitor = (
      responsivenessMonitor,
      histogramId
    ) => {
      if (responsivenessMonitor) {
        let accumulatedDelay = responsivenessMonitor.finish();
        if (histogramId) {
          try {
            Services.telemetry
              .getKeyedHistogramById(histogramId)
              .add(browserKey, accumulatedDelay);
          } catch (ex) {
            console.error(histogramId, ": ", ex);
          }
        }
      }
    };

    let collectQuantityTelemetry = () => {
      for (let resourceType of Object.keys(
        lazy.MigrationUtils._importQuantities
      )) {
        let histogramId =
          "FX_MIGRATION_" + resourceType.toUpperCase() + "_QUANTITY";
        try {
          Services.telemetry
            .getKeyedHistogramById(histogramId)
            .add(
              browserKey,
              lazy.MigrationUtils._importQuantities[resourceType]
            );
        } catch (ex) {
          console.error(histogramId, ": ", ex);
        }
      }
    };

    // Called either directly or through the bookmarks import callback.
    let doMigrate = async function() {
      let resourcesGroupedByItems = new Map();
      resources.forEach(function(resource) {
        if (!resourcesGroupedByItems.has(resource.type)) {
          resourcesGroupedByItems.set(resource.type, new Set());
        }
        resourcesGroupedByItems.get(resource.type).add(resource);
      });

      if (resourcesGroupedByItems.size == 0) {
        throw new Error("No items to import");
      }

      let notify = function(aMsg, aItemType) {
        Services.obs.notifyObservers(null, aMsg, aItemType);
      };

      for (let resourceType of Object.keys(
        lazy.MigrationUtils._importQuantities
      )) {
        lazy.MigrationUtils._importQuantities[resourceType] = 0;
      }
      notify("Migration:Started");
      for (let [migrationType, itemResources] of resourcesGroupedByItems) {
        notify("Migration:ItemBeforeMigrate", migrationType);

        let stopwatchHistogramId = maybeStartTelemetryStopwatch(migrationType);

        let {
          responsivenessMonitor,
          responsivenessHistogramId,
        } = maybeStartResponsivenessMonitor(migrationType);

        let itemSuccess = false;
        for (let res of itemResources) {
          let completeDeferred = lazy.PromiseUtils.defer();
          let resourceDone = function(aSuccess) {
            itemResources.delete(res);
            itemSuccess |= aSuccess;
            if (itemResources.size == 0) {
              notify(
                itemSuccess
                  ? "Migration:ItemAfterMigrate"
                  : "Migration:ItemError",
                migrationType
              );
              resourcesGroupedByItems.delete(migrationType);

              if (stopwatchHistogramId) {
                TelemetryStopwatch.finishKeyed(
                  stopwatchHistogramId,
                  browserKey
                );
              }

              maybeFinishResponsivenessMonitor(
                responsivenessMonitor,
                responsivenessHistogramId
              );

              if (resourcesGroupedByItems.size == 0) {
                collectQuantityTelemetry();
                notify("Migration:Ended");
              }
            }
            completeDeferred.resolve();
          };

          // If migrate throws, an error occurred, and the callback
          // (itemMayBeDone) might haven't been called.
          try {
            res.migrate(resourceDone);
          } catch (ex) {
            console.error(ex);
            resourceDone(false);
          }

          await completeDeferred.promise;
          await unblockMainThread();
        }
      }
    };

    if (
      lazy.MigrationUtils.isStartupMigration &&
      !this.startupOnlyMigrator &&
      Services.policies.isAllowed("defaultBookmarks")
    ) {
      lazy.MigrationUtils.profileStartup.doStartup();
      // First import the default bookmarks.
      // Note: We do not need to do so for the Firefox migrator
      // (=startupOnlyMigrator), as it just copies over the places database
      // from another profile.
      (async function() {
        // Tell nsBrowserGlue we're importing default bookmarks.
        let browserGlue = Cc["@mozilla.org/browser/browserglue;1"].getService(
          Ci.nsIObserver
        );
        browserGlue.observe(null, TOPIC_WILL_IMPORT_BOOKMARKS, "");

        // Import the default bookmarks. We ignore whether or not we succeed.
        await lazy.BookmarkHTMLUtils.importFromURL(
          "chrome://browser/content/default-bookmarks.html",
          {
            replace: true,
            source: lazy.PlacesUtils.bookmarks.SOURCES.RESTORE_ON_STARTUP,
          }
        ).catch(console.error);

        // We'll tell nsBrowserGlue we've imported bookmarks, but before that
        // we need to make sure we're going to know when it's finished
        // initializing places:
        let placesInitedPromise = new Promise(resolve => {
          let onPlacesInited = function() {
            Services.obs.removeObserver(
              onPlacesInited,
              TOPIC_PLACES_DEFAULTS_FINISHED
            );
            resolve();
          };
          Services.obs.addObserver(
            onPlacesInited,
            TOPIC_PLACES_DEFAULTS_FINISHED
          );
        });
        browserGlue.observe(null, TOPIC_DID_IMPORT_BOOKMARKS, "");
        await placesInitedPromise;
        doMigrate();
      })();
      return;
    }
    doMigrate();
  }

  /**
   * Checks to see if one or more profiles exist for the browser that this
   * migrator migrates from.
   *
   * @returns {Promise<boolean>}
   *   True if one or more profiles exists that this migrator can migrate
   *   resources from.
   */
  async isSourceAvailable() {
    if (this.startupOnlyMigrator && !lazy.MigrationUtils.isStartupMigration) {
      return false;
    }

    // For a single-profile source, check if any data is available.
    // For multiple-profiles source, make sure that at least one
    // profile is available.
    let exists = false;
    try {
      let profiles = await this.getSourceProfiles();
      if (!profiles) {
        let resources = await this.#getMaybeCachedResources("");
        if (resources && resources.length) {
          exists = true;
        }
      } else {
        exists = !!profiles.length;
      }
    } catch (ex) {
      console.error(ex);
    }
    return exists;
  }

  /*** PRIVATE STUFF - DO NOT OVERRIDE ***/

  /**
   * Returns resources for a particular profile and then caches them for later
   * lookups.
   *
   * @param {object|string} aProfile
   *   The profile that resources are being imported from.
   * @returns {Promise<MigrationResource[]>}
   */
  async #getMaybeCachedResources(aProfile) {
    let profileKey = aProfile ? aProfile.id : "";
    if (this._resourcesByProfile) {
      if (profileKey in this._resourcesByProfile) {
        return this._resourcesByProfile[profileKey];
      }
    } else {
      this._resourcesByProfile = {};
    }
    this._resourcesByProfile[profileKey] = await this.getResources(aProfile);
    return this._resourcesByProfile[profileKey];
  }
}
