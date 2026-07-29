/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module handles embeddings-based semantic search capabilities using the
 * Places database and an ML engine for vector operations.
 */

/**
 * @import {OpenedConnection} from "resource://gre/modules/Sqlite.sys.mjs"
 */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AsyncShutdown: "resource://gre/modules/AsyncShutdown.sys.mjs",
  DeferredTask: "resource://gre/modules/DeferredTask.sys.mjs",
  EmbeddingsGenerator: "chrome://global/content/ml/EmbeddingsGenerator.sys.mjs",
  PlacesSemanticHistoryDatabase:
    "resource://gre/modules/PlacesSemanticHistoryDatabase.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  Region: "resource://gre/modules/Region.sys.mjs",
});

/**
 * Returns whether two model configurations represent the same embedding model.
 * Null and undefined are considered equivalent.
 *
 * @param {object} a
 *   First embedding model configuration.
 * @param {string|null|undefined} a.featureId
 * @param {string|null|undefined} a.modelId
 * @param {number|null|undefined} a.embeddingDimension
 * @param {object} b
 *   Second embedding model configuration.
 * @param {string|null|undefined} b.featureId
 * @param {string|null|undefined} b.modelId
 * @param {number|null|undefined} b.embeddingDimension
 * @returns {boolean}
 *   True if the configurations describe the same embedding model.
 */
function modelConfigMatches(a, b) {
  // SQLite NULLs come back as JS null; resolved configs may have undefined
  // for absent fields. Treat the two as equivalent so a benign shape
  // mismatch does not trigger a spurious drop-and-rebuild.
  const eq = (x, y) => (x ?? null) === (y ?? null);
  return (
    eq(a.featureId, b.featureId) &&
    eq(a.modelId, b.modelId) &&
    eq(a.embeddingDimension, b.embeddingDimension)
  );
}

ChromeUtils.defineLazyGetter(lazy, "logger", function () {
  return lazy.PlacesUtils.getLogger({ prefix: "PlacesSemanticHistoryManager" });
});

// Constants to support an alternative frecency algorithm.
ChromeUtils.defineLazyGetter(lazy, "PAGES_FRECENCY_FIELD", () => {
  return lazy.PlacesUtils.history.isAlternativeFrecencyEnabled
    ? "alt_frecency"
    : "frecency";
});

// This list is based on the current model capabilities. It is a Map-like list
// of regions where English is predominant, and a common language is latin-based.
// Each country code is assigned to an array of supported BCP 47 language tags,
// a tag can end with "-*" to match any variants (match at the start).
// The list of supported region and locales is loaded from the
// places.semanticHistory.supportedRegions string pref, and this is used as a
// fallback if we fail to parse the pref.
/** @type {[string, string[]][]} */
const ENABLED_REGIONS_DEFAULT = [
  ["AU", ["en-*"]],
  ["CA", ["en-*"]],
  ["GB", ["en-*"]],
  ["IE", ["en-*"]],
  ["NZ", ["en-*"]],
  ["PH", ["en-*"]],
  ["US", ["en-*"]],
];
const FAILSAFE_THROTTLE_ID = "failsafe";
const SOFT_THROTTLE_ID = "soft";

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "supportedRegions",
  "places.semanticHistory.supportedRegions",
  JSON.stringify(ENABLED_REGIONS_DEFAULT),
  null,
  val => {
    try {
      return new Map(JSON.parse(val));
    } catch (ex) {
      lazy.logger.debug("Invalid json in supportedRegions pref.");
      // Supposing a user may empty the pref to disable the feature, as they
      // don't know it should be a JSON string, we'll treat that as an empty
      // Map, so the feature is disabled.
      if (val === "") {
        return new Map();
      }
      return new Map(ENABLED_REGIONS_DEFAULT);
    }
  }
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "semanticHistorySmartwindowFeatureGate",
  "places.semanticHistory.smartwindow.featureGate",
  false
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "maxChunkTimeMs",
  "places.semanticHistory.maxChunkTimeMs",
  300
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "maxChunkTimeMsFailsafe",
  "places.semanticHistory.maxChunkTimeMsFailsafe",
  500
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "minEntriesBeforeThrottle",
  "places.semanticHistory.minEntriesBeforeThrottle",
  1000
);

// Time between deferred task executions.
const DEFERRED_TASK_INTERVAL_MS = 3000;
// Maximum time to wait for an idle before the task is executed anyway.
const DEFERRED_TASK_MAX_IDLE_WAIT_MS = 2 * 60000;
// Number of entries to update at once.
const DEFAULT_CHUNK_SIZE = Services.prefs.getIntPref(
  "places.semanticHistory.defaultBatchChunksize",
  25
);
const MIN_CHUNK_SIZE = 10;

// Minimum number of embeddings required before semantic search is enabled.
const COMPLETED_EMBEDDINGS_MINIMUM = 10;

// Number of recent chunk durations kept to decide whether to throttle indexing.
const CHUNK_LATENCY_MONITORING_WINDOW = 9;
// How often (in update-task runs) to report the embeddings count to telemetry.
const GLEAN_REPORT_DB_SIZE_FREQUENCY = 40;
const ONE_MiB = 1024 * 1024;
// minimum title length threshold; Usage len(title || description) > MIN_TITLE_LENGTH
const MIN_TITLE_LENGTH = 4;

const DEFAULT_QUERY_OVERSAMPLE = 50;

/**
 * PlacesSemanticHistoryManager manages the semantic.sqlite database and provides helper
 * methods for initializing, querying, and updating semantic data.
 */
class PlacesSemanticHistoryManager {
  #promiseConn;
  #engine = undefined;
  #embeddingSize;
  #rowLimit;
  #samplingAttrib;
  #changeThresholdCount;
  #distanceThreshold;
  #finalized = false;
  #chunkSize = DEFAULT_CHUNK_SIZE;
  #updateTask = null;
  #prevPagesRankChangedCount = 0;
  #pendingUpdates = true;
  testFlag = false;
  #updateTaskLatency = [];
  embedder;
  qualifiedForSemanticSearch = false;
  #promiseInitialized = null;
  enoughEntries = false;
  #shutdownProgress = { state: "Not started" };
  #deferredTaskInterval = DEFERRED_TASK_INTERVAL_MS;
  #lastMaxChunksCount = 0;
  #recentChunkTimes = [];
  #indexingBlocked = false;
  #reportDbSizeModCounter = 0;

  /**
   * Checks if a value is an array or a typed array.
   *
   * @param {Array|ArrayBufferView} val
   * @returns {boolean} Whether the input is like an array.
   */
  #isArrayLike(val) {
    return Array.isArray(val) || ArrayBuffer.isView(val);
  }

  /**
   * Constructor for PlacesSemanticHistoryManager.
   *
   * @param {object} options - Configuration options.
   * @param {number} [options.rowLimit=10000] - Maximum number of rows to process from the database.
   * @param {string} [options.samplingAttrib="frecency"] - Attribute used for sampling rows.
   * @param {number} [options.changeThresholdCount=3] - Threshold of changed rows to trigger updates.
   * @param {number} [options.distanceThreshold=0.6] - Cosine distance threshold to determine similarity.
   * @param {boolean} [options.testFlag=false] - Flag for test behavior.
   * @param {number} [options.deferredTaskInterval=DEFERRED_TASK_INTERVAL_MS] - Interval for deferred task execution.
   */
  constructor({
    rowLimit = 10000,
    samplingAttrib = "frecency",
    changeThresholdCount = 3,
    distanceThreshold = 0.6,
    testFlag = false,
    deferredTaskInterval = DEFERRED_TASK_INTERVAL_MS,
  } = {}) {
    this.QueryInterface = ChromeUtils.generateQI([
      "nsIObserver",
      "nsISupportsWeakReference",
    ]);

    // Do not initialize during shutdown.
    if (
      Services.startup.isInOrBeyondShutdownPhase(
        Ci.nsIAppStartup.SHUTDOWN_PHASE_APPSHUTDOWNCONFIRMED
      )
    ) {
      this.#finalized = true;
      return;
    }

    this.embedder = lazy.EmbeddingsGenerator.forPlaces();
    this.semanticDB = new lazy.PlacesSemanticHistoryDatabase({
      embeddingSize: this.embedder.embeddingSize,
      fileName: "places_semantic.sqlite",
    });
    this.qualifiedForSemanticSearch =
      this.embedder.isEnoughPhysicalMemoryAvailable() &&
      this.embedder.isEnoughCpuCoresAvailable();

    lazy.AsyncShutdown.appShutdownConfirmed.addBlocker(
      "SemanticManager: shutdown",
      () => this.shutdown(),
      { fetchState: () => this.#shutdownProgress }
    );

    // Add the observer for pages-rank-changed and history-cleared topics
    this.handlePlacesEvents = this.handlePlacesEvents.bind(this);
    lazy.PlacesUtils.observers.addListener(
      ["pages-rank-changed", "history-cleared", "page-removed"],
      this.handlePlacesEvents
    );

    this.#rowLimit = rowLimit;
    this.#embeddingSize = this.embedder.embeddingSize;
    this.#samplingAttrib = samplingAttrib;
    this.#changeThresholdCount = changeThresholdCount;
    this.#distanceThreshold = distanceThreshold;
    this.testFlag = testFlag;
    this.#deferredTaskInterval = deferredTaskInterval;
    this.#updateTaskLatency = [];
    lazy.logger.trace("PlaceSemanticManager constructor");

    this.#promiseInitialized = (async () => {
      // canUseSemanticSearch depends on Region being initialized.
      if (!lazy.Region.home) {
        await lazy.Region.init();
      }

      // When semantic history is disabled or not available anymore due to
      // system requirements, we want to remove the database files, though we
      // don't want to check on disk on every startup, thus we use a pref.
      // The removal is done on startup anyway, as it's less likely to fail.
      // We check prefHasUserValue instead of the value itself, because users
      // may set it to false to try to disable the feature, then checking value
      // the files would not be removed.
      lazy.logger.debug(
        "PlaceSemanticManager detected region:",
        lazy.Region.home
      );
      let wasInitialized = Services.prefs.prefHasUserValue(
        "places.semanticHistory.initialized"
      );

      let isAvailable =
        this.canUseSemanticSearch || this.isEnabledForSmartWindow;
      let removeFiles =
        (wasInitialized && !isAvailable) ||
        Services.prefs.getBoolPref(
          "places.semanticHistory.removeOnStartup",
          false
        );
      if (removeFiles) {
        lazy.logger.info("Removing database files on startup");
        Services.prefs.clearUserPref("places.semanticHistory.removeOnStartup");
        await this.semanticDB.removeDatabaseFiles().catch(console.error);
      }
      if (!isAvailable) {
        Services.prefs.clearUserPref("places.semanticHistory.initialized");
      } else if (!wasInitialized) {
        Services.prefs.setBoolPref("places.semanticHistory.initialized", true);
      }
    })();
  }

  /**
   * Ensures the semantic DB schema/config matches the currently resolved
   * embedder model configuration.
   *
   * This is invoked lazily during the first `getConnection()` call.
   *
   * If the active on-disk model configuration differs from the embedder's
   * current model context, the embedding tables are recreated to match the
   * new model dimensions and feature identifiers.
   *
   * @param {object} conn
   *   Active database connection.
   */
  async #reconcileModelState(conn) {
    try {
      const desired = this.embedder.modelContext;
      const onDisk = await this.semanticDB.getActiveModelConfig(conn);
      if (onDisk && !modelConfigMatches(onDisk, desired)) {
        lazy.logger.info(
          `Model switch detected: ${onDisk.featureId}/${onDisk.embeddingDimension} -> ${desired.featureId}/${desired.embeddingDimension}`
        );
        await this.semanticDB.replaceEmbeddingTables(desired, conn);
      }
    } catch (e) {
      lazy.logger.error("Model reconciliation failed", e);
    }
  }

  /**
   * Connects to the semantic.sqlite database and attaches the Places DB.
   *
   * @returns {Promise<object>}
   *   A promise resolving to the database connection.
   */
  async getConnection() {
    if (
      Services.startup.isInOrBeyondShutdownPhase(
        Ci.nsIAppStartup.SHUTDOWN_PHASE_APPSHUTDOWNCONFIRMED
      )
    ) {
      return null;
    }

    await this.#promiseInitialized;

    if (!this.canUseSemanticSearch && !this.isEnabledForSmartWindow) {
      return null;
    }

    // Avoid re-entrance using a cached promise rather than handing off a conn.
    if (!this.#promiseConn) {
      this.#promiseConn = (async () => {
        const conn = await this.semanticDB.getConnection();
        // Kick off updates.
        await this.#reconcileModelState(conn);
        this.#createOrUpdateTask();
        this.onPagesRankChanged();
        return conn;
      })();
    }
    return this.#promiseConn;
  }

  /**
   * Checks whether the semantic-history vector DB holds the minimum number of
   * embeddings required to enable semantic search.
   *
   * The result is memoised in `this.enoughEntries` once the minimum is reached;
   * subsequent calls return that cached value to avoid repeating the query.
   *
   * @returns {Promise<boolean>}
   *   `true` once at least `COMPLETED_EMBEDDINGS_MINIMUM` embeddings exist,
   *   `false` while the DB is still below that minimum.
   */
  async hasSufficientEntriesForSearching() {
    if (this.enoughEntries) {
      // Return cached answer if we already ran once.
      return true;
    }
    let conn = await this.getConnection();

    // Count how many embeddings we currently have.
    const [row] = await conn.execute(
      `SELECT COUNT(*) AS completed FROM vec_history_mapping`
    );
    const completed = row.getResultByName("completed");

    this.enoughEntries = completed > COMPLETED_EMBEDDINGS_MINIMUM;

    if (this.enoughEntries) {
      lazy.logger.debug(
        `Semantic-DB ready — ${completed} embeddings; update task can run at ` +
          `normal cadence.`
      );
    }

    return this.enoughEntries;
  }

  /**
   * Determines if semantic search can be used based on preferences
   * and hardware qualification criteria
   *
   * @returns {boolean} - Returns `true` if semantic search can be used,
   *   else false
   */
  get canUseSemanticSearch() {
    // This requires Region to have been initialized somewhere else
    // asynchronously, so consumer is responsible for that, otherwise it may
    // be null.
    return (
      this.qualifiedForSemanticSearch &&
      Services.prefs.getBoolPref("browser.ml.enable", true) &&
      Services.prefs.getBoolPref("places.semanticHistory.featureGate", false) &&
      this.#isSupportedLocale(Services.locale.appLocaleAsBCP47)
    );
  }

  /**
   * Per-window-type enablement check for Smart Window. This is a UI-surface
   * decision (should the SW search consumer query semantic history?), distinct
   * from `canUseSemanticSearch` which gates the Classic Window surface. The
   * underlying singleton DB initializes if either gate is on, so toggling SW
   * does not affect CW behavior and vice versa.
   *
   * @returns {boolean}
   */
  get isEnabledForSmartWindow() {
    return (
      this.qualifiedForSemanticSearch &&
      Services.prefs.getBoolPref("browser.ml.enable", true) &&
      lazy.semanticHistorySmartwindowFeatureGate &&
      this.#isSupportedLocale(Services.locale.appLocaleAsBCP47)
    );
  }

  /**
   * Check if the given locale is supported for Semantic History Search.
   *
   * @param {string} appLocale BCP 47 language tag.
   * @returns {boolean} Whether the locale is supported.
   */
  #isSupportedLocale(appLocale) {
    // Per BCP-47 comparisons must be performend in a case-insensitive manner.
    appLocale = appLocale.toLowerCase();
    let supportedLocales = lazy.supportedRegions.get(lazy.Region.home) ?? [];
    for (let localePattern of supportedLocales) {
      localePattern = localePattern.toLowerCase();
      if (
        localePattern.endsWith("*") &&
        appLocale.startsWith(localePattern.replace(/-?\*$/, ""))
      ) {
        return true;
      } else if (localePattern == appLocale) {
        return true;
      }
    }
    return false;
  }

  handlePlacesEvents(events) {
    for (const { type } of events) {
      switch (type) {
        case "pages-rank-changed":
        case "history-cleared":
        case "page-removed":
          this.onPagesRankChanged();
          break;
      }
    }
  }

  /**
   * Handles updates triggered by database changes or rank changes.
   *
   * This is invoked whenever the `"pages-rank-changed"` or
   * `"history-cleared"` event is observed.
   * It re-arms the DeferredTask for updates if not finalized and indexing has
   * not been blocked by the failsafe.
   *
   * @private
   */
  async onPagesRankChanged() {
    if (
      this.#updateTask &&
      !this.#updateTask.isFinalized &&
      !this.#indexingBlocked
    ) {
      lazy.logger.trace("Arm update task");
      this.#updateTask.arm();
    }
  }

  // getter for testing purposes
  getUpdateTaskLatency() {
    return this.#updateTaskLatency;
  }

  /**
   * Records the duration of the last processed chunk, keeping only the most
   * recent CHUNK_LATENCY_MONITORING_WINDOW samples.
   *
   * @param {number} durationMS Chunk processing duration in milliseconds.
   */
  #recordChunkTime(durationMS) {
    this.#recentChunkTimes.push(durationMS);
    if (this.#recentChunkTimes.length > CHUNK_LATENCY_MONITORING_WINDOW) {
      this.#recentChunkTimes.shift();
    }
  }

  /**
   * Decides whether background indexing should stop advancing because recent
   * chunks have been too slow, based on the last
   * CHUNK_LATENCY_MONITORING_WINDOW durations.
   *
   * The failsafe is a hard brake: if half or more of the recent chunks exceed
   * `maxChunkTimeMsFailsafe`, indexing stops regardless of how much is stored
   * and is not restarted for the rest of the session.
   * The soft threshold only applies once the DB holds more than
   * `minEntriesBeforeThrottle` embeddings, so slow machines keep going until the
   * feature is usable.
   *
   * @param {OpenedConnection} conn a SQLite connection to the database.
   * @returns {Promise<?string>}
   *   `FAILSAFE_THROTTLE_ID` or `SOFT_THROTTLE_ID` when indexing should be
   *   throttled, otherwise `null`.
   */
  async #shouldThrottleIndexing(conn) {
    if (this.#recentChunkTimes.length < CHUNK_LATENCY_MONITORING_WINDOW) {
      return null;
    }

    const majority = Math.ceil(CHUNK_LATENCY_MONITORING_WINDOW / 2);
    let countOver = threshold =>
      this.#recentChunkTimes.filter(ms => ms > threshold).length;

    if (countOver(lazy.maxChunkTimeMsFailsafe) >= majority) {
      return FAILSAFE_THROTTLE_ID;
    }

    if (countOver(lazy.maxChunkTimeMs) >= majority) {
      const [row] = await conn.execute(
        `SELECT COUNT(*) AS c FROM vec_history_mapping`
      );
      if (row.getResultByName("c") > lazy.minEntriesBeforeThrottle) {
        return SOFT_THROTTLE_ID;
      }
    }

    return null;
  }

  /**
   * Reports the number of stored embeddings to telemetry, roughly once every
   * GLEAN_REPORT_DB_SIZE_FREQUENCY update-task runs to avoid querying the DB on
   * every run.
   *
   * @param {OpenedConnection} conn a SQLite connection to the database.
   */
  async #maybeReportEntriesCount(conn) {
    if (this.#reportDbSizeModCounter++ % GLEAN_REPORT_DB_SIZE_FREQUENCY == 0) {
      const [row] = await conn.execute(
        `SELECT COUNT(*) AS c FROM vec_history_mapping`
      );
      Glean.places.databaseSemanticHistoryNumEntries.set(
        row.getResultByName("c")
      );
    }
  }

  /**
   * Creates or updates the DeferredTask for managing updates to the semantic DB.
   */
  #createOrUpdateTask() {
    if (this.#finalized) {
      lazy.logger.trace(`Not resurrecting #updateTask because finalized`);
      return;
    }
    if (this.#updateTask) {
      this.#updateTask.disarm();
      this.#updateTask.finalize().catch(console.error);
    }

    // Syncs the semantic search database with history changes. It first checks
    // if enough page changes have occurred to warrant an update. If so, it
    // finds history entries that need to be added or removed from the vector
    // database. It then processes a chunk of additions, for which it generates
    // embeddings, and deletions in batches. It will re-arm itself if more work
    // remains, otherwise marks the update as complete and notifies.
    this.#updateTask = new lazy.DeferredTask(
      async () => {
        if (this.#finalized) {
          return;
        }

        // Capture updateTask startTime.
        const updateStartTime = ChromeUtils.now();

        try {
          lazy.logger.info("Running vector DB update task...");
          let conn = await this.getConnection();
          if (!conn) {
            return;
          }
          let pagesRankChangedCount =
            PlacesObservers.counts.get("pages-rank-changed") +
            PlacesObservers.counts.get("history-cleared") +
            PlacesObservers.counts.get("page-removed");
          if (
            pagesRankChangedCount - this.#prevPagesRankChangedCount <
              this.#changeThresholdCount &&
            !this.#pendingUpdates &&
            !this.testFlag
          ) {
            lazy.logger.info("No significant changes detected.");
            return;
          }

          await this.#maybeReportEntriesCount(conn);

          this.#prevPagesRankChangedCount = pagesRankChangedCount;
          const startTime = ChromeUtils.now();

          lazy.logger.info(
            `Changes exceed threshold (${this.#changeThresholdCount}).`
          );

          let { count: addCount, results: addRows } =
            await this.findAddsChunk(conn);
          let { count: deleteCount, results: deleteRows } =
            await this.findDeletesChunk(conn);

          // We already have startTime for profile markers, so just use it
          // instead of tracking timer within the distribution.
          Glean.places.semanticHistoryFindChunksTime.accumulateSingleSample(
            ChromeUtils.now() - startTime
          );

          lazy.logger.info(
            `Total rows to add: ${addCount}, delete: ${deleteCount}`
          );

          if (addCount || deleteCount) {
            let chunkTimer =
              Glean.places.semanticHistoryChunkCalculateTime.start();

            let chunksCount =
              Math.ceil(addCount / this.#chunkSize) +
              Math.ceil(deleteCount / this.#chunkSize);
            if (chunksCount > this.#lastMaxChunksCount) {
              this.#lastMaxChunksCount = chunksCount;
              Glean.places.semanticHistoryMaxChunksCount.set(chunksCount);
            }

            const chunkStart = ChromeUtils.now();
            await this.updateVectorDB(conn, addRows, deleteRows);
            this.#recordChunkTime(ChromeUtils.now() - chunkStart);
            ChromeUtils.addProfilerMarker(
              "updateVectorDB",
              startTime,
              "Details about updateVectorDB event"
            );

            Glean.places.semanticHistoryChunkCalculateTime.stopAndAccumulate(
              chunkTimer
            );
          }

          if (addCount > this.#chunkSize || deleteCount > this.#chunkSize) {
            // There's still entries to update, but recent chunks may have been
            // too slow.
            const throttle = await this.#shouldThrottleIndexing(conn);
            if (throttle) {
              // Capture the samples for logging before resetting the window, so
              // the next decision is based on the new chunk size's performance.
              const recentTimes = this.#recentChunkTimes.join(", ");
              this.#recentChunkTimes = [];
              Glean.places.semanticHistoryIndexingStopped[throttle].add(1);
              this.#pendingUpdates = true;
              if (throttle == FAILSAFE_THROTTLE_ID) {
                // Hard stop: block indexing for the rest of the session. The
                // task will not be re-armed by Places observer events.
                this.#indexingBlocked = true;
                lazy.logger.debug(
                  `Blocking indexing (failsafe); recent chunk times: ` +
                    `${recentTimes} ms.`
                );
                return;
              }
              // Soft throttle: halve the chunk size (down to MIN_CHUNK_SIZE) so
              // the next run, re-armed by the usual Places observer events, does
              // less work. This reduction persists until the service restarts.
              if (this.#chunkSize > MIN_CHUNK_SIZE) {
                this.#chunkSize = Math.max(
                  MIN_CHUNK_SIZE,
                  Math.floor(this.#chunkSize / 2)
                );
                lazy.logger.debug(
                  `Reducing chunk size to ${this.#chunkSize}; recent chunk ` +
                    `times: ${recentTimes} ms.`
                );
              }
              return;
            }
            if (!this.#indexingBlocked) {
              // There's still entries to update, re-arm the task.
              this.#pendingUpdates = true;
              this.#updateTask.arm();
            }
            return;
          }

          this.#pendingUpdates = false;
          Services.obs.notifyObservers(
            null,
            "places-semantichistorymanager-update-complete"
          );
          if (this.testFlag) {
            this.#updateTask.arm();
          }
        } catch (error) {
          lazy.logger.error("Error executing vector DB update task:", error);
        } finally {
          lazy.logger.info("Vector DB update task completed.");
          const updateEndTime = ChromeUtils.now();
          const updateTaskTime = updateEndTime - updateStartTime;
          this.#updateTaskLatency.push(updateTaskTime);

          lazy.logger.info(
            `DeferredTask update completed in ${updateTaskTime} ms.`
          );
        }
      },
      this.#deferredTaskInterval,
      DEFERRED_TASK_MAX_IDLE_WAIT_MS
    );
    lazy.logger.info("Update task armed.");
  }

  /**
   * Finalizes the PlacesSemanticHistoryManager by cleaning up resources.
   *
   * This ensures any tasks are finalized and the manager is properly
   * cleaned up during shutdown.
   *
   */
  #finalize() {
    lazy.logger.trace("Finalizing SemanticManager");
    // We don't mind about tasks completiion, since we can execute them in the
    // next session.
    this.#updateTask?.disarm();
    this.#updateTask?.finalize().catch(console.error);
    this.#finalized = true;
  }

  /**
   * Find semantic vector entries to be added.
   *
   * @param {OpenedConnection} conn a SQLite connection to the database.
   * @returns {Promise<{count: number, results: { url_hash: string } }>}
   *   Resolves to an array of objects containing results, limited to
   *   DEFAULT_CHUNK_SIZE elements, and the total count of found entries.
   */
  async findAddsChunk(conn) {
    // find any adds after successful checkForChanges
    const rows = await conn.executeCached(
      `
      WITH top_places AS (
        SELECT url_hash, trim(title || " " || IFNULL(description, '')) AS content
        FROM moz_places
        WHERE title NOTNULL
          AND length(title || ifnull(description,'')) > :min_title_length
          AND last_visit_date NOTNULL
          AND frecency > 0
        ORDER BY ${this.#samplingAttrib} DESC
        LIMIT :rowLimit
      ),
      updates AS (
        SELECT top.url_hash, top.content
        FROM top_places top
        LEFT JOIN vec_history_mapping map USING (url_hash)
        WHERE map.url_hash IS NULL
      )
      SELECT url_hash, content, (SELECT count(*) FROM updates) AS total
      FROM updates
      LIMIT :chunkSize
    `,
      {
        rowLimit: this.#rowLimit,
        min_title_length: MIN_TITLE_LENGTH,
        chunkSize: this.#chunkSize,
      }
    );

    return {
      count: rows[0]?.getResultByName("total") || 0,
      results: rows.map(row => ({
        url_hash: row.getResultByName("url_hash"),
        content: row.getResultByName("content"),
      })),
    };
  }

  /**
   * Find semantic vector entries to eventually delete due to:
   * - Orphaning: URLs no longer in top_places
   * - Broken Mappings: rowid has no corresponding entry in vec_history
   *
   * @param {OpenedConnection} conn a SQLite connection to the database.
   * @returns {Promise<{count: number, results: { url_hash: string } }>}
   *   Resolves to an array of objects containing results, limited to
   *   DEFAULT_CHUNK_SIZE elements, and the total count of found entries.
   */
  async findDeletesChunk(conn) {
    // find any deletes after successful checkForChanges
    const rows = await conn.executeCached(
      `
      WITH top_places AS (
        SELECT url_hash
        FROM moz_places
        WHERE title NOTNULL
          AND length(title || ifnull(description,'')) > :min_title_length
          AND last_visit_date NOTNULL
          AND frecency > 0
        ORDER BY ${this.#samplingAttrib} DESC
        LIMIT :rowLimit
      ),
      orphans AS (
        SELECT url_hash FROM vec_history_mapping
        EXCEPT
        SELECT url_hash FROM top_places
      ),
      updates AS (
        SELECT url_hash FROM orphans
        UNION
        SELECT url_hash FROM vec_history_mapping
        LEFT JOIN vec_history v USING (rowid)
        WHERE v.rowid IS NULL
      )
      SELECT url_hash, (SELECT count(*) FROM updates) AS total
      FROM updates
      LIMIT :chunkSize
    `,
      {
        rowLimit: this.#rowLimit,
        min_title_length: MIN_TITLE_LENGTH,
        chunkSize: this.#chunkSize,
      }
    );

    return {
      count: rows[0]?.getResultByName("total") || 0,
      results: rows.map(row => ({
        url_hash: row.getResultByName("url_hash"),
      })),
    };
  }

  async updateVectorDB(conn, rowsToAdd, rowsToDelete) {
    await this.embedder.createEngineIfNotPresent();

    let batchTensors;
    if (rowsToAdd.length) {
      // Instead of calling engineRun in a loop for each row,
      // you prepare an array of requests.
      try {
        batchTensors = await this.embedder.embedMany(
          rowsToAdd.map(r => r.content)
        );
        batchTensors = this.#convertTensor(batchTensors, rowsToAdd.length);
      } catch (ex) {
        lazy.logger.error(`Error processing tensors`, ex);
        // If we failed generating tensors skip the addition, but proceed
        // with removals below.
        rowsToAdd.length = 0;
      }
    }

    await conn.executeTransaction(async () => {
      // Process each new row and the corresponding tensor.
      for (let i = 0; i < rowsToAdd.length; i++) {
        const { url_hash } = rowsToAdd[i];
        const tensor = batchTensors.values[i];
        try {
          // We first insert the url into vec_history_mapping, get the rowid
          // and then insert the embedding into vec_history using that.
          // Doing the opposite doesn't work, as RETURNING is not properly
          // supported by the vec extension.
          // See https://github.com/asg017/sqlite-vec/issues/229.

          // Normally there should be no conflict on url_hash, as we previously
          // checked for its existence in vec_history_mapping. Though, since
          // the hash is not unique, we may try to insert two pages with the
          // same hash value as part of the same chunk.
          let rows = await conn.executeCached(
            `
            INSERT INTO vec_history_mapping (rowid, url_hash)
            VALUES (NULL, :url_hash)
            /* This is apparently useless, but it makes RETURNING always return
               a value, while DO NOTHING would not. */
            ON CONFLICT(url_hash) DO UPDATE SET url_hash = :url_hash
            RETURNING rowid
            `,
            { url_hash }
          );
          const rowid = rows[0].getResultByName("rowid");
          if (!rowid) {
            lazy.logger.error(`Unable to get inserted rowid for: ${url_hash}`);
            continue;
          }
          await conn.executeCached(
            `
            INSERT OR REPLACE INTO vec_history (rowid, embedding)
            VALUES (:rowid, :vector)
            `,
            {
              rowid,
              vector: lazy.PlacesUtils.tensorToSQLBindable(tensor),
            }
          );
          lazy.logger.info(
            `Added embedding and mapping for url_hash: ${url_hash}`
          );
        } catch (error) {
          lazy.logger.error(
            `Failed to insert embedding for url_hash: ${url_hash}. Error: ${error.message}`
          );
        }
      }

      // Now apply deletions.
      for (let { url_hash } of rowsToDelete) {
        try {
          // Delete the mapping from vec_history_mapping table
          const rows = await conn.executeCached(
            `
            DELETE FROM vec_history_mapping
            WHERE url_hash = :url_hash
            RETURNING rowid
            `,
            { url_hash }
          );

          if (rows.length === 0) {
            lazy.logger.warn(`No mapping found for url_hash: ${url_hash}`);
            continue;
          }

          const rowid = rows[0].getResultByName("rowid");

          // Delete the embedding from vec_history table
          await conn.executeCached(
            `
            DELETE FROM vec_history
            WHERE rowid = :rowid
            `,
            { rowid }
          );

          lazy.logger.info(
            `Deleted embedding and mapping for url_hash: ${url_hash}`
          );
        } catch (error) {
          lazy.logger.error(
            `Failed to delete for url_hash: ${url_hash}. Error: ${error.message}`
          );
        }
      }
    });
  }

  /**
   * Shuts down the manager, ensuring cleanup of tasks and connections.
   */
  async shutdown() {
    this.#shutdownProgress.state = "In progress";
    await this.#finalize();
    this.#shutdownProgress.state = "Task finalized";
    await this.semanticDB.closeConnection();
    this.#shutdownProgress.state = "Connection closed";

    lazy.PlacesUtils.observers.removeListener(
      ["pages-rank-changed", "history-cleared", "page-removed"],
      this.handlePlacesEvents
    );

    this.#shutdownProgress.state = "Complete";
    lazy.logger.info("PlacesSemanticHistoryManager shut down.");
  }

  /**
   * Executes an inference operation using the ML engine.
   *
   * This runs the engine's inference pipeline on the provided request and
   * checks if changes to the rank warrant triggering an update.
   *
   * @param {object} queryContext
   *   The request to run through the engine.
   * @param {string} queryContext.searchString
   *   The search string used for the request.
   * @returns {Promise<object>}
   *   The result of the engine's inference pipeline.
   */
  async infer(queryContext) {
    const inferStartTime = ChromeUtils.now();
    let results = [];
    await this.embedder.ensureEngine();

    let tensor;
    try {
      tensor = await this.embedder.embed(queryContext.searchString);
      tensor = this.#convertTensor(tensor, 1);
    } catch (ex) {
      lazy.logger.error(`Error processing tensor: ${ex}`);
      return results;
    }

    let metrics = tensor.metrics;

    let conn = await this.getConnection();

    await conn.execute(`INSERT INTO vec_history(vec_history) VALUES(:cmd)`, {
      cmd: `oversample=${DEFAULT_QUERY_OVERSAMPLE}`,
    });

    let rows = await conn.executeCached(
      `
      WITH
      matches AS (
        SELECT rowid AS vec_rowid, url_hash
        FROM vec_history_mapping
        JOIN vec_history USING (rowid)
        WHERE embedding MATCH (:vector)
        AND k=2
        ORDER BY distance
      ),
      scored AS (
        SELECT matches.url_hash,
               vec_distance_cosine(vec_history.embedding, :vector) AS distance
        FROM matches
        JOIN vec_history ON vec_history.rowid = matches.vec_rowid
      )
      SELECT id,
             title,
             url,
             distance,
             frecency,
             last_visit_date
      FROM moz_places
      JOIN scored USING (url_hash)
      WHERE ${lazy.PAGES_FRECENCY_FIELD} <> 0
      AND distance <= :distanceThreshold
      ORDER BY distance
      `,
      {
        vector: lazy.PlacesUtils.tensorToSQLBindable(tensor.values[0]),
        distanceThreshold: this.#distanceThreshold,
      }
    );

    for (let row of rows) {
      results.push({
        id: row.getResultByName("id"),
        title: row.getResultByName("title"),
        url: row.getResultByName("url"),
        distance: row.getResultByName("distance"),
        frecency: row.getResultByName("frecency"),
        lastVisit: row.getResultByName("last_visit_date"),
      });
    }

    // Add a duration marker, representing a span of time, with some additional text
    ChromeUtils.addProfilerMarker(
      "semanticHistorySearch",
      inferStartTime,
      "semanticHistorySearch details"
    );

    return { results, metrics };
  }

  // for easier testing purpose.
  async engineRun(request) {
    return await this.#engine.run(request);
  }

  /**
   * Converts result of an engine run into a consistent structure.
   *
   * @param {Array|object} tensor
   * @param {number} expectedLength
   * @returns {{ metrics: object, values: Array <Array|Float32Array>[]}}
   */
  #convertTensor(tensor, expectedLength) {
    if (!tensor) {
      throw new Error("Unexpected empty tensor");
    }
    let result = { metrics: tensor?.metrics ?? null, values: [] };
    if (expectedLength == 0) {
      return result;
    }

    // It may be a { metrics, output } object.
    if (tensor.output) {
      if (Array.isArray(tensor.output) && this.#isArrayLike(tensor.output[0])) {
        result.values = tensor.output;
      } else {
        result.values.push(tensor.output);
      }
    } else {
      // It may be a nested array, then we must extract it first.
      if (
        Array.isArray(tensor) &&
        tensor.length === 1 &&
        Array.isArray(tensor[0])
      ) {
        tensor = tensor[0];
      }

      // Then we check if it's an array of arrays or just a single value.
      if (Array.isArray(tensor) && this.#isArrayLike(tensor[0])) {
        result.values = tensor;
      } else {
        result.values.push(tensor);
      }
    }

    if (result.values.length != expectedLength) {
      throw new Error(
        `Got ${result.values.length} embeddings instead of ${expectedLength}`
      );
    }
    if (
      !this.#isArrayLike(result.values[0]) ||
      result.values[0].length != this.#embeddingSize
    ) {
      throw new Error(
        `Got tensors with dimension ${tensor.values[0].length} instead of ${this.#embeddingSize}`
      );
    }
    return result;
  }

  /**
   * Performs a WAL checkpoint to flush all pending writes from WAL to the main database file.
   * Then measures the final disk size of semantic.sqlite.
   * **This method is for test purposes only.**
   *
   * @returns {Promise<number>} - The size of `semantic.sqlite` in bytes after checkpointing.
   */
  async checkpointAndMeasureDbSize() {
    let conn = await this.getConnection();

    try {
      lazy.logger.info("Starting WAL checkpoint on semantic.sqlite");

      // Perform a full checkpoint to move WAL data into the main database file
      await conn.execute(`PRAGMA wal_checkpoint(FULL);`);
      await conn.execute(`PRAGMA wal_checkpoint(TRUNCATE);`);

      // Ensure database is in WAL mode
      let journalMode = await conn.execute(`PRAGMA journal_mode;`);
      lazy.logger.info(
        `Journal Mode after checkpoint: ${journalMode[0].getResultByName("journal_mode")}`
      );

      // Measure the size of `semantic.sqlite` after checkpoint
      const semanticDbPath = this.semanticDB.databaseFilePath;
      let { size } = await IOUtils.stat(semanticDbPath);
      const sizeInMB = size / ONE_MiB;

      lazy.logger.info(
        `Size of semantic.sqlite after checkpoint: ${sizeInMB} mb`
      );
      return sizeInMB;
    } catch (error) {
      lazy.logger.error(
        "Error during WAL checkpoint and size measurement:",
        error
      );
      return null;
    }
  }

  //getters
  getEmbeddingSize() {
    return this.#embeddingSize;
  }

  getRowLimit() {
    return this.#rowLimit;
  }

  getPrevPagesRankChangeCount() {
    return this.#prevPagesRankChangedCount;
  }

  getPendingUpdatesStatus() {
    return this.#pendingUpdates;
  }

  //for test purposes
  stopProcess() {
    this.#finalize();
  }
}

/**
 * @type {PlacesSemanticHistoryManager}
 *   Internal holder for the singleton.
 */
let gSingleton = null;

/**
 * Get the one shared semantic‐history manager.
 *
 * @param {object} [options] invokes PlacesSemanticHistoryManager constructor on first call or if recreate==true
 * @param {boolean} recreate set could true only for testing purposes and should not be true in production
 */
export function getPlacesSemanticHistoryManager(
  options = {},
  recreate = false
) {
  if (!gSingleton || recreate) {
    gSingleton = new PlacesSemanticHistoryManager(options);
  }
  return gSingleton;
}
