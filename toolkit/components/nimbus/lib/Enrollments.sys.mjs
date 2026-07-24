/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @import { ExperimentStore } from "./ExperimentStore.sys.mjs" */
/** @import { DeferredTask } from "../../../modules/DeferredTask.sys.mjs" */
/** @import { OpenedConnection, Sqlite } from "../../../modules/Sqlite.sys.mjs" */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  DeferredTask: "resource://gre/modules/DeferredTask.sys.mjs",
  ExperimentAPI: "resource://nimbus/ExperimentAPI.sys.mjs",
  NimbusTelemetry: "resource://nimbus/lib/Telemetry.sys.mjs",
  ProfilesDatastoreService:
    "moz-src:///toolkit/profile/ProfilesDatastoreService.sys.mjs",
  RemoteSettingsSyncError:
    "resource://nimbus/lib/RemoteSettingsExperimentLoader.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "log", () => {
  const { Logger } = ChromeUtils.importESModule(
    "resource://messaging-system/lib/Logger.sys.mjs"
  );
  return new Logger("NimbusEnrollments");
});

/**
 * How long should we wait before flushing changes to the database.
 *
 * This was copied from a similar constant in JSONFile.sys.mjs.
 */
const FLUSH_DELAY_MS = 1500;

// We read this prefs *once* at startup because the ExperimentStore (and
// SharedDataMap) have different initialization logic based on the state of these prefs.
//
// To ensure that changing them doesn't result in inconsistent behavaiour, they
// will only take affect after a restart.
//
// They are only mutable so they can be updated for tests.
let DATABASE_ENABLED = Services.prefs.getBoolPref(
  "nimbus.profilesdatastoreservice.enabled",
  false
);
let READ_FROM_DATABASE_ENABLED = Services.prefs.getBoolPref(
  "nimbus.profilesdatastoreservice.read.enabled",
  false
);
let SYNC_ENROLLMENTS_ENABLED = Services.prefs.getBoolPref(
  "nimbus.profilesdatastoreservice.sync.enabled",
  false
);

export class PendingWrites {
  /**
   * Create a new `PendingWrites` object.
   *
   * @param {PendingWrites} other A `PendingWrites` object to clone.
   */
  constructor(other = undefined) {
    /**
     * Enrollment changes to flush to the database.
     *
     * The keys are enrollment slugs and the values are optional recipes. If the
     * recipe is present, a new enrollment will be created in the database.
     * Otherwise, an existing enrollment will be updated to be inactive (or
     * deleted if it cannot be found in the `ExperimentStore`).
     *
     * @type {Map<string, object | null>}
     */
    this.enrollments = new Map(other?.enrollments.entries() ?? []);

    /**
     * Sync timestamps to flush to the database.
     *
     * @type {Map<string, object | null>}
     */
    this.syncTimestamps = new Map(other?.syncTimestamps.entries() ?? []);
  }

  /**
   * Whether or not there are pending writes.
   *
   * @returns {boolean}
   */
  get hasPendingWrites() {
    return this.enrollments.size > 0 || this.syncTimestamps.size > 0;
  }

  /**
   * Register an enrollment update.
   *
   * @param {string} slug The slug of the enrollment that is changing.
   * @param {object | undefined} recipe If this update is for an enrollment event,
   * the recipe that resulted in the enrollment.
   */
  updateEnrollment(slug, recipe) {
    // Don't overwrite a pending entry that has a recipe with one that has none
    // or we will try to do the wrong query (UPDATE instead of INSERT).
    //
    // We explicitly check for the presence of the value, not the key, in case
    // this is a re-enrollment following an unenrollment.
    if (!this.enrollments.get(slug)) {
      this.enrollments.set(slug, recipe);
    }
  }

  /**
   * Merge the two collections of pending writes together.
   *
   * @param {PendingWrites} first The first set of pending writes to apply.
   * @param {PendingWrites} second The second set of pending writes to apply.
   * Pending syncTimestamps in this set will override those set in `first`.
   *
   * @returns {PendingWrites}
   */
  static merge(first, second) {
    if (!first.hasPendingWrites) {
      return second;
    } else if (!second.hasPendingWrites) {
      return first;
    }

    const merged = new PendingWrites(first);
    for (const [slug, recipe] of second.enrollments.entries()) {
      merged.updateEnrollment(slug, recipe);
    }
    for (const [collection, lastModified] of second.syncTimestamps.entries()) {
      merged.syncTimestamps.set(collection, lastModified);
    }

    return merged;
  }
}

/**
 * Handles queueing changes to the NimbusEnrollments database table in the
 * shared profiles database.
 */
export class NimbusEnrollments {
  /**
   * Whether the NimbusEvents instance is initialized or not.
   *
   * @type {boolean}
   */
  #initialized;

  /**
   * The ExperimentStore.
   *
   * @type {ExperimentStore}
   */
  #store;

  /**
   * The task that will flush the changes to the database on a timer.
   *
   * @type {DeferredTask}
   */
  #flushTask;

  /**
   * Our shutdown blocker that will ensure we flush pending writes before the
   * ProfilesDatastoreService closes its database connection.
   *
   * @type {(function(): void) | null}
   */
  #shutdownBlocker;

  /**
   * Whether or not we've started shutdown and will accept new pending writes.
   *
   * @type {boolean}
   */
  #finalized;

  /**
   * Pending writes that will be flushed in `#flush()`.
   *
   * @type {PendingWrites}
   */
  #pendingWrites;

  /**
   * The lastModified times of the Nimbus Remote Settings collections.
   *
   * This will always contain the most up to date set of timestamps, even if
   * they are not flushed to the database.
   *
   * @type {Map<string, number> | null}
   */
  #syncTimestamps;

  constructor(store) {
    this.#initialized = false;
    this.#store = store;

    this.#flushTask = new lazy.DeferredTask(
      this.#flush.bind(this),
      FLUSH_DELAY_MS
    );

    this.#shutdownBlocker = this.finalize.bind(this);
    lazy.ProfilesDatastoreService.shutdown.addBlocker(
      "NimbusEnrollments: writing to database",
      this.#shutdownBlocker
    );
    this.#finalized = false;

    this.#pendingWrites = new PendingWrites();
    this.#syncTimestamps = null;
  }

  async init() {
    if (this.#initialized) {
      throw new Error("Already initialized");
    }

    this.#initialized = true;

    const conn = await lazy.ProfilesDatastoreService.getConnection();
    return conn.executeTransaction(async txn => {
      // Only load enrollments if the database is the source-of-truth for reads.
      const enrollments = NimbusEnrollments.readFromDatabaseEnabled
        ? await NimbusEnrollments.loadEnrollments(txn)
        : null;
      this.#syncTimestamps = await NimbusEnrollments.loadSyncTimestamps(txn);

      return enrollments;
    });
  }

  /**
   * The number of pending writes.
   */
  get pendingWrites() {
    return this.#pendingWrites.enrollments.size;
  }

  /**
   * Queue an update to the database for the given enrollment.
   *
   * @param {string} slug The slug of the enrollment.
   * @param {object | undefined} recipe If this update is for an enrollment event,
   * the recipe that resulted in the enrollment.
   */
  updateEnrollment(slug, recipe) {
    if (this.#finalized) {
      lazy.log.debug(
        `Did not queue update for enrollment ${slug}: already finalized`
      );
      return;
    }

    lazy.log.debug(`Queued update for enrollment ${slug}`);

    this.#pendingWrites.updateEnrollment(slug, recipe);
    this.#flushSoon();
  }

  /**
   * Update the known lastModified timestamps for the given collections.
   *
   * Omitted timestamps will not change.
   *
   * @param {Map<string, number>} timestamps The timestamps to update.
   *
   * @throws {RemoteSettingsSyncError} If any timestamps are behind currently known
   * timestamps or if any timestamps are invalid.
   */
  updateSyncTimestamps(timestamps) {
    if (!this.#initialized) {
      throw new Error("Not initialized");
    }

    const mergedTimestamps = new Map(this.#syncTimestamps.entries());
    let timestampsChanged = false;

    for (const [collection, timestamp] of timestamps) {
      const lastTimestamp = this.#syncTimestamps.get(collection);

      if (typeof timestamp !== "number" || isNaN(timestamp) || timestamp < 0) {
        throw new lazy.RemoteSettingsSyncError(
          collection,
          lazy.NimbusTelemetry.RemoteSettingsSyncErrorReason
            .INVALID_LAST_MODIFIED
        );
      } else if (
        typeof lastTimestamp === "undefined" ||
        timestamp > lastTimestamp
      ) {
        mergedTimestamps.set(collection, timestamp);
        this.#pendingWrites.syncTimestamps.set(collection, timestamp);

        timestampsChanged = true;
      } else if (timestamp < lastTimestamp) {
        throw new lazy.RemoteSettingsSyncError(
          collection,
          lazy.NimbusTelemetry.RemoteSettingsSyncErrorReason.BACKWARDS_SYNC
        );
      }
    }

    if (timestampsChanged) {
      this.#syncTimestamps = mergedTimestamps;
      this.#flushSoon();

      lazy.log.debug("Timestamps updated");
    }
  }

  /**
   * Immediately flush all pending updates to the NimbusEnrollments table.
   *
   * ** TEST ONLY **
   */
  async _flushNow() {
    // If the flush is already running, wait for it to finish.
    if (this.#flushTask.isRunning) {
      await this.#flushTask._runningPromise;
    }

    // If the flush task is armed, disarm it and run it immediately.
    if (this.#flushTask.isArmed) {
      this.#flushTask.disarm();
      await this.#flush();
    }
  }

  /**
   * Queue a flush to happen soon (within {@link FLUSH_DELAY_MS}).
   */
  #flushSoon() {
    if (this.#finalized) {
      return;
    }

    this.#flushTask.arm();
  }

  /**
   * Flush all pending updates to the NimbusEnrollments and NimbusSyncTimestamps
   * tables.
   *
   * The updates are done as a single transaction to ensure the database stays
   * in a consistent state.
   *
   * If the transaction fails, the write will be re-attempted after
   * {@link FLUSH_DELAY_MS}, unless we have already begun shutdown, in which we
   * will attempt to flush once more immediately.
   *
   * @param {object} options
   * @param {boolean} options.retryOnFailure Whether or not to retry flushing if
   * an error occurs. Should only be false if we have failed to flush once and
   * we've started shutting down.
   */
  async #flush({ retryOnFailure = true } = {}) {
    if (!this.#pendingWrites.hasPendingWrites) {
      lazy.log.debug(`Not flushing: no changes`);
      return;
    }

    // Swap the set of pending writes, if there are any, with default values.
    // While we are waiting for the writes to the database complete we may
    // receive more pending writes. If our write to the database fails, we need
    // to reconcile those changes by merging them.
    const pendingWrites = this.#pendingWrites;
    this.#pendingWrites = new PendingWrites();

    lazy.log.debug(
      `Flushing ${pendingWrites.enrollments.size} enrollments, ${pendingWrites.syncTimestamps.size} timestamps to database`
    );

    let success = true;
    try {
      const conn = await lazy.ProfilesDatastoreService.getConnection();
      if (!conn) {
        // The database has already closed. There's nothing we can do.
        //
        // This *should not happen* since we have a shutdown blocker preventing
        // the connection from being closed, but it may happen if we're already
        // in shutdown when we try to flush for the first time, e.g., during a
        // very short-lived session.
        lazy.log.debug(
          `Not flushing changes to database: connection is closed`
        );
        return;
      }

      await conn.executeTransaction(async txn => {
        for (const [slug, recipe] of pendingWrites.enrollments.entries()) {
          const enrollment = this.#store.get(slug);
          if (enrollment) {
            await NimbusEnrollments.#insertOrUpdateEnrollment(
              txn,
              enrollment,
              recipe
            );
          } else {
            await NimbusEnrollments.#deleteEnrollment(txn, slug);
          }
        }

        await NimbusEnrollments.#flushSyncTimestamps(
          txn,
          pendingWrites.syncTimestamps
        );
      });
    } catch (e) {
      success = false;

      if (retryOnFailure) {
        // Re-queue all the pending writes that failed and merge any new changes
        // that happened while we attempted to save.
        this.#pendingWrites = PendingWrites.merge(
          pendingWrites,
          this.#pendingWrites
        );

        if (!this.#finalized) {
          lazy.log.error(
            `ExperimentStore: Failed writing enrollments to NimbusEnrollments; will retry soon`,
            e
          );

          // Ensure we try to flush again if we aren't in shutdown yet.
          this.#flushSoon();
        } else {
          lazy.log.error(
            `ExperimentStore: Failed writing enrollments to NimbusEnrollments during shutdown; retrying immediately`,
            e
          );

          // If we are in our shutdown blocker, we aren't going to get another
          // chance and there's not really anything we can do except try to
          // write again immediately.
          await this.#flush({ retryOnFailure: false });
        }
      } else {
        lazy.log.error(
          `ExperimentStore: Failed writing enrollments to NimbusEnrollments`,
          e
        );
      }
    }

    Glean.nimbusEvents.databaseWrite.record({ success });
  }

  /**
   * Insert or update an enrollment.
   *
   * @param {OpenedConnection} conn The connection to the database.
   * @param {object} enrollment The enrollment.
   * @param {object | null} recipe The recipe for the enrollment. Only non-null
   * when the initial enrollment has not already been flushed.
   */
  static async #insertOrUpdateEnrollment(conn, enrollment, recipe) {
    if (recipe) {
      // This was a new enrollment at the time. It may have since unenrolled.
      await conn.executeCached(
        `
          INSERT INTO NimbusEnrollments(
            profileId,
            slug,
            branchSlug,
            recipe,
            active,
            unenrollReason,
            lastSeen,
            setPrefs,
            prefFlips,
            source
          )
          VALUES(
            :profileId,
            :slug,
            :branchSlug,
            jsonb(:recipe),
            :active,
            :unenrollReason,
            :lastSeen,
            jsonb(:setPrefs),
            jsonb(:prefFlips),
            :source
          )
          ON CONFLICT(profileId, slug)
          DO UPDATE SET
            branchSlug = excluded.branchSlug,
            recipe = excluded.recipe,
            active = excluded.active,
            unenrollReason = excluded.unenrollReason,
            lastSeen = excluded.lastSeen,
            setPrefs = excluded.setPrefs,
            prefFlips = excluded.setPrefs,
            source = excluded.source;
        `,
        {
          profileId: lazy.ExperimentAPI.profileId,
          slug: enrollment.slug,
          branchSlug: enrollment.branch.slug,
          recipe: JSON.stringify(recipe),
          active: enrollment.active,
          unenrollReason: enrollment.unenrollReason ?? null,
          lastSeen: enrollment.lastSeen,
          setPrefs:
            enrollment.active && enrollment.prefs
              ? JSON.stringify(enrollment.prefs)
              : null,
          prefFlips:
            enrollment.active && enrollment.prefFlips
              ? JSON.stringify(enrollment.prefFlips)
              : null,
          source: enrollment.source,
        }
      );

      lazy.log.debug(
        `Created ${enrollment.active ? "active" : "inactive"} enrollment ${enrollment.slug}`
      );
    } else {
      // This was an unenrollment.
      await conn.executeCached(
        `
          UPDATE NimbusEnrollments SET
            active = false,
            unenrollReason = :unenrollReason,
            setPrefs = null,
            prefFlips = null
          WHERE
            profileId = :profileId AND
            slug = :slug;
        `,
        {
          profileId: lazy.ExperimentAPI.profileId,
          slug: enrollment.slug,
          unenrollReason: enrollment.unenrollReason,
        }
      );

      lazy.log.debug(`Updated enrollment ${enrollment.slug} to be inactive`);
    }
  }

  /**
   * Remove an expired enrollment from the NimbusEnrollments table.
   *
   * @param {OpenedConnection} conn The connection to the database.
   * @param {string} slug The slug of the enrollment to delete.
   */
  static async #deleteEnrollment(conn, slug) {
    await conn.execute(
      `
        DELETE FROM NimbusEnrollments
        WHERE
          profileId = :profileId AND
          slug = :slug;
      `,
      {
        profileId: lazy.ExperimentAPI.profileId,
        slug,
      }
    );

    lazy.log.debug(`Deleted expired enrollment ${slug}`);
  }

  /**
   * Finalize the flush task and ensure we flush all pending enrollment updates
   * to the NimbusEnrollments table.
   *
   * As soon as this function is called, all new enrollment updates will be
   * refused.
   *
   * This is used as a shutdown blocker that blocks the {@link Sqlite.shutdown}
   * shutdown barrier.
   */
  async finalize() {
    if (this.#finalized) {
      return;
    }

    this.#finalized = true;
    await this.#flushTask.finalize();

    lazy.ProfilesDatastoreService.shutdown.removeBlocker(this.#shutdownBlocker);
    this.#shutdownBlocker = null;
  }

  static async #flushSyncTimestamps(conn, timestamps) {
    for (const [collection, lastModified] of timestamps) {
      await conn.executeCached(
        `
          INSERT INTO NimbusSyncTimestamps(
            profileId,
            collection,
            lastModified
          )
          VALUES(
            :profileId,
            :collection,
            :lastModified
          )
          ON CONFLICT(profileId, collection)
          DO UPDATE SET
            lastModified = excluded.lastModified;
        `,
        {
          profileId: lazy.ExperimentAPI.profileId,
          collection,
          lastModified,
        }
      );
    }
  }

  /**
   * Whether or not writing to the NimbusEnrollments table is enabled.
   *
   * This should only be false in xpcshell tests.
   */
  static get databaseEnabled() {
    // TODO(bug 1967779): require the ProfilesDatastoreService to be initialized
    // and remove this.
    return DATABASE_ENABLED;
  }

  /**
   * Whether or not reading from the NimbusEnrollments table is enabled.
   *
   * This is true by default in Nightly, except in xpcshell tests.
   */
  static get readFromDatabaseEnabled() {
    // TODO(bug 1972426): Enable this behaviour by default and remove this pref.
    return DATABASE_ENABLED && READ_FROM_DATABASE_ENABLED;
  }

  static get syncEnrollmentsEnabled() {
    // TODO(bug 1956087): Enable this behaviour by default and remove this pref.
    return (
      DATABASE_ENABLED && READ_FROM_DATABASE_ENABLED && SYNC_ENROLLMENTS_ENABLED
    );
  }

  /**
   * Load the enrollments from the NimbusEnrollments table.

   * @param {OpenedConnection} txn An optional connection, used when this is
   * called within a transaction.
   *
   * @returns {Promise<Record<string, object>>} The enrollments from the
   * NimbusEnrollments table.
   */
  static async loadEnrollments(txn) {
    function copyProperties(target, src, properties) {
      for (const property of properties) {
        target[property] = src[property];
      }
    }

    function processRow(row) {
      const enrollment = {};

      for (const key of ["slug", "lastSeen", "source"]) {
        enrollment[key] = row.getResultByName(key);
      }

      enrollment.active = Boolean(row.getResultByName("active"));

      const unenrollReason = row.getResultByName("unenrollReason");
      if (unenrollReason) {
        enrollment.unenrollReason = unenrollReason;
      }

      const setPrefs = JSON.parse(row.getResultByName("setPrefs"));
      if (setPrefs) {
        enrollment.prefs = setPrefs;
      }

      const prefFlips = JSON.parse(row.getResultByName("prefFlips"));
      if (prefFlips) {
        enrollment.prefFlips = prefFlips;
      }

      const recipe = JSON.parse(row.getResultByName("recipe"));
      const branchSlug = row.getResultByName("branchSlug");

      enrollment.branch = recipe.branches.find(b => b.slug === branchSlug);

      copyProperties(enrollment, recipe, [
        "userFacingName",
        "userFacingDescription",
        "featureIds",
        "isRollout",
        "localizations",
      ]);

      if (typeof recipe.isFirefoxLabsOptIn !== "undefined") {
        copyProperties(enrollment, recipe, [
          "isFirefoxLabsOptIn",
          "firefoxLabsTitle",
          "firefoxLabsDescription",
          "firefoxLabsDescriptionLinks",
          "firefoxLabsGroup",
          "requiresRestart",
        ]);
      }

      return [enrollment.slug, enrollment];
    }

    const conn = txn ?? (await lazy.ProfilesDatastoreService.getConnection());
    const rows = await conn.execute(
      `
      SELECT
        slug,
        branchSlug,
        active,
        unenrollReason,
        lastSeen,
        json(recipe) AS recipe,
        json(setPrefs) AS setPrefs,
        json(prefFlips) AS prefFlips,
        source
      FROM NimbusEnrollments
      WHERE
        profileId = :profileId;
      `,
      {
        profileId: lazy.ExperimentAPI.profileId,
      }
    );

    const enrollments = rows.map(processRow);

    lazy.log.debug(`Loaded ${enrollments.length} enrollments`);

    return Object.fromEntries(enrollments);
  }

  /**
   * Load the last known lastModified timestamps of Nimbus collections from the
   * NimbusSyncTimestamps table.
   *
   * @param {OpenedConnection} txn An option connection, used when this is
   * called within a transaction.
   *
   * @returns {Promise<Map<string, number>>} The lastModified timestamps of the
   * Nimbus collections.
   */
  static async loadSyncTimestamps(txn) {
    const conn = txn ?? (await lazy.ProfilesDatastoreService.getConnection());
    const rows = await conn.execute(
      `
        SELECT
          collection,
          lastModified
        FROM NimbusSyncTimestamps
        WHERE
          profileId = :profileId;
      `,
      {
        profileId: lazy.ExperimentAPI.profileId,
      }
    );

    return new Map(
      rows.map(row => [
        row.getResultByName("collection"),
        row.getResultByName("lastModified"),
      ])
    );
  }

  /**
   * Load the slugs of all experiments from other profiles that have unenrolled.
   *
   * @returns {Set<string>} The slugs of the experiments.
   */
  static async loadUnenrolledExperimentSlugsFromOtherProfiles() {
    const conn = await lazy.ProfilesDatastoreService.getConnection();
    const rows = await conn.execute(
      `
        SELECT DISTINCT
          slug
        FROM NimbusEnrollments
        WHERE
              NOT active
          AND NOT json_extract(recipe, "$.isRollout")
          AND profileId != :profileId;
      `,
      {
        profileId: lazy.ExperimentAPI.profileId,
      }
    );

    return new Set(rows.map(row => row.getResultByName("slug")));
  }

  /**
   * Reload the database-related prefs
   *
   * ** TEST ONLY **
   */
  static _reloadPrefsForTests() {
    DATABASE_ENABLED = Services.prefs.getBoolPref(
      "nimbus.profilesdatastoreservice.enabled",
      false
    );
    READ_FROM_DATABASE_ENABLED = Services.prefs.getBoolPref(
      "nimbus.profilesdatastoreservice.read.enabled",
      false
    );
    SYNC_ENROLLMENTS_ENABLED = Services.prefs.getBoolPref(
      "nimbus.profilesdatastoreservice.sync.enabled",
      false
    );
  }
}
