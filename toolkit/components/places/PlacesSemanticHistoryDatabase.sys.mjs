/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  Sqlite: "resource://gre/modules/Sqlite.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logger", function () {
  return lazy.PlacesUtils.getLogger({
    prefix: "PlacesSemanticHistoryDatabase",
  });
});

// Tracks the on-disk *structure* of the semantic database only. Changing the
// embedding model (engine, dimension, feature/model ID) does NOT bump this --
// model state lives in the places_semantic_models table and is reconciled by
// PlacesSemanticHistoryManager on startup.
//
// Bump this only when columns, table names, or stored data formats change.

// Remember to:
// 1. Bump up the version number
// 2. Add a migration function to migrate the data to the new schema.
// 3. Update #createDatabaseEntities and #checkDatabaseHealth
// 4. Add a test to check that the migration works correctly.

// Note downgrades are not supported, so when you bump up the version and the
// user downgrades, the database will be deleted and recreated.
// If a migration throws, the database will also be deleted and recreated.

const CURRENT_SCHEMA_VERSION = 4;

// Maximum percentage of wasted space before defragmenting the database.
const MAX_WASTED_SPACE_PERC = 0.6;

// Fixed table base name for the single live embedding table. Reserved as a
// column in places_semantic_models for forward-compat with multi-table.
const DEFAULT_TABLE_BASE_NAME = "vec_history";

// Legacy static-embeddings dimension
const STATIC_EMBEDDINGS_DEFAULT_DIM = 512;

/**
 * Handles the database connection, reading and writing for semantic history.
 */
export class PlacesSemanticHistoryDatabase {
  #asyncShutdownBlocker;
  #conn;
  #databaseFolderPath;
  #embeddingSize;
  databaseFileName;
  #schemaVersion = CURRENT_SCHEMA_VERSION;

  constructor({ embeddingSize, fileName }) {
    this.#embeddingSize = embeddingSize;
    this.databaseFileName = fileName;
    this.#databaseFolderPath = PathUtils.profileDir;
  }

  get currentSchemaVersion() {
    return this.#schemaVersion;
  }

  async setCurrentSchemaVersionForTests(version) {
    this.#schemaVersion = version;
    if (this.#conn) {
      await this.#conn.setSchemaVersion(version);
    }
  }

  /**
   * Connects to the semantic.sqlite database and attaches the Places DB.
   *
   * @returns {Promise<object>}
   *   A promise resolving to the database connection.
   */
  async getConnection() {
    if (this.#conn) {
      return this.#conn;
    }
    try {
      // Connect to the database
      this.#conn = await this.#openConnection();
    } catch (e) {
      if (
        e.result == Cr.NS_ERROR_FILE_CORRUPTED ||
        e.errors?.some(error => error.result == Ci.mozIStorageError.NOTADB)
      ) {
        lazy.logger.info("Removing corrupted database files");
        await this.removeDatabaseFiles();
        this.#conn = await this.#openConnection();
      } else {
        lazy.logger.error("Failed to open connection", e);
        // Re-throw the exception for the caller.
        throw e;
      }
    }

    // Add shutdown blocker to close connection gracefully
    this.#asyncShutdownBlocker = async () => {
      await this.closeConnection();
    };
    lazy.Sqlite.shutdown.addBlocker(
      "PlacesSemanticHistoryDatabase: Shutdown",
      this.#asyncShutdownBlocker
    );

    try {
      lazy.logger.info("Initializing schema");
      await this.#initializeSchema();
    } catch (e) {
      lazy.logger.warn(`Schema initialization failed: ${e}`);
      // If the schema cannot be initialized close the connection and create
      // a new database file.
      await this.closeConnection();
      await this.removeDatabaseFiles();
      this.#conn = await this.#openConnection();
      await this.#initializeSchema();
    }

    return this.#conn;
  }

  async #openConnection() {
    lazy.logger.info("Trying to open connection");
    let conn = await lazy.Sqlite.openConnection({
      path: this.databaseFilePath,
      extensions: ["vec"],
    });

    // WAL is generally faster and allows for concurrent reads and writes.
    await conn.execute("PRAGMA journal_mode = WAL");
    await conn.execute("PRAGMA wal_autocheckpoint = 16");

    // We're not hooking up this to the vacuum manager yet, but let's start
    // storing vacuum information, in case we want to do that in the future.
    await conn.execute("PRAGMA auto_vacuum = INCREMENTAL");

    // Attach the Places database, as we need to join on it.
    let placesDbPath = PathUtils.join(
      this.#databaseFolderPath,
      "places.sqlite"
    );
    await conn.attachDatabase(placesDbPath, "places");
    return conn;
  }

  /**
   * Closes the connection to the database, if it's open.
   *
   * @returns {Promise<void>} resolves when done.
   */
  async closeConnection() {
    if (this.#conn) {
      lazy.logger.info("Closing connection");
      lazy.Sqlite.shutdown.removeBlocker(this.#asyncShutdownBlocker);
      await this.#conn.close();
      this.#conn = null;
    }
  }

  /**
   * Initializes the semantic database, creating virtual tables if needed.
   * Any exception thrown here should be handled by the caller replacing the
   * database.
   */
  async #initializeSchema() {
    let version = await this.#conn.getSchemaVersion();
    lazy.logger.debug(`Database schema version: ${version}`);
    if (version > CURRENT_SCHEMA_VERSION) {
      lazy.logger.warn(`Database schema downgrade`);
      throw new Error("Downgrade of the schema is not supported");
    }
    if (version == CURRENT_SCHEMA_VERSION) {
      let healthy = await this.#checkDatabaseHealth();
      if (!healthy) {
        lazy.logger.error(`Database schema is not healthy`);
        throw new Error("Database schema is not healthy");
      }
      return;
    }

    await this.#conn.executeTransaction(async () => {
      if (version == 0) {
        // This is a newly created database, just create the entities.
        lazy.logger.info("Creating database schema");
        await this.#createDatabaseEntities();
        await this.#conn.setSchemaVersion(CURRENT_SCHEMA_VERSION);
        // eslint-disable-next-line no-useless-return
        return;
      }

      lazy.logger.info("Migrating database schema");

      // Put migrations here with a brief description of what they do.
      // If you want to fully replace the database with a new one, as the data
      // cannot be easily migrated, just throw an Error from the migration.

      if (version < 2) {
        // We found a critical issue in the relations between embeddings
        // and URLs, so we need to replace the database.
        throw new Error("Replacing semantic history database");
      }

      if (version == 2) {
        lazy.logger.info(
          "Migrating from v2 sqlite-vec database schema with native coarse (bit) embedding search"
        );
        await this.reindexDatabase();
        lazy.logger.info("Database migration reindex completed");
      }

      if (version < 4) {
        // Schema v3: add places_semantic_models. If the on-disk vec_history
        // is at the legacy static-embeddings dim we can safely assume that
        // data and keep it. Any other dim means an unknown earlier
        // configuration, so throw to drop and recreate the DB.
        let onDiskDim = null;
        const rows = await this.#conn.execute(
          `SELECT vec_length(embedding) AS dim FROM vec_history LIMIT 1`
        );
        if (rows.length) {
          onDiskDim = rows?.[0]?.getResultByName("dim");
        }
        if (onDiskDim !== STATIC_EMBEDDINGS_DEFAULT_DIM) {
          throw new Error(
            "Replacing semantic history database for v4+ migration due to embedding size mismatch"
          );
        }
        await this.#createModelConfigTable();
        await this.#insertModelConfigRow({
          featureId: "simple-text-embedder",
          modelId: "mozilla/static-embeddings",
          embeddingDimension: STATIC_EMBEDDINGS_DEFAULT_DIM,
        });
      }
      let healthy = await this.#checkDatabaseHealth();
      if (!healthy) {
        lazy.logger.error(
          `sqlite-vec database schema is not healthy after migration from ${version}`
        );
        throw new Error("Database schema is not healthy after migration");
      }
      await this.#conn.setSchemaVersion(CURRENT_SCHEMA_VERSION);
    });
  }

  async #createModelConfigTable() {
    await this.#conn.execute(`
      CREATE TABLE IF NOT EXISTS places_semantic_models (
        table_base_name TEXT PRIMARY KEY,
        feature_id TEXT,
        model_id TEXT,
        embedding_dimension INTEGER NOT NULL,
        target_locales TEXT,
        created_at INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
      ) WITHOUT ROWID;
    `);
  }

  async #createMappingTable() {
    await this.#conn.execute(`
      CREATE TABLE vec_history_mapping (
        rowid INTEGER PRIMARY KEY,
        url_hash INTEGER NOT NULL UNIQUE
      );
    `);
  }

  async #insertModelConfigRow(modelConfig) {
    await this.#conn.execute(
      `INSERT OR REPLACE INTO places_semantic_models (
         table_base_name, feature_id, model_id,
         embedding_dimension, target_locales, created_at, status
       ) VALUES (
         :table_base_name, :feature_id, :model_id,
         :embedding_dimension, :target_locales, :created_at,
         'active'
       )`,
      {
        table_base_name: DEFAULT_TABLE_BASE_NAME,
        feature_id: modelConfig.featureId ?? null,
        model_id: modelConfig.modelId ?? null,
        embedding_dimension: modelConfig.embeddingDimension,
        target_locales: modelConfig.targetLocales
          ? JSON.stringify(modelConfig.targetLocales)
          : null,
        created_at: Date.now(),
      }
    );
  }

  /**
   * Get SQL to create the embeddings virtual table.
   */
  get #createVirtualTableSQL() {
    return `
      CREATE VIRTUAL TABLE vec_history USING vec0(
        embedding FLOAT[${this.#embeddingSize}]
        distance_metric=cosine
            INDEXED BY rescore(
          quantizer=bit,
          oversample=50
        )
      );
    `;
  }

  /**
   * Creates the necessary virtual tables in the semantic.sqlite database.
   *
   * @returns {Promise<void>} resolves when done.
   */
  async #createDatabaseEntities() {
    // Modifying this will also require to modify #defragmentDatabase.
    await this.#conn.execute(this.#createVirtualTableSQL);
    await this.#createMappingTable();
    await this.#createModelConfigTable();
    // Synthesise a default row matching the dim vec_history was created at.
    // The manager's reconciliation runs immediately after and will call
    // replaceEmbeddingTables() if the active config differs.
    await this.#insertModelConfigRow({
      featureId: "simple-text-embedder",
      modelId: "mozilla/static-embeddings",
      embeddingDimension: this.#embeddingSize,
    });
  }

  /**
   * Verifies that the schema is current, there's no missing entities or
   * changed embedding size, and there's not excessive fragmentation.
   *
   * @returns {Promise<boolean>} whether the schema is consistent or not.
   */
  async #checkDatabaseHealth() {
    let tables = await this.#conn.execute(
      `SELECT name FROM sqlite_master WHERE type='table'`
    );
    let tableNames = tables.map(row => row.getResultByName("name"));
    if (
      !tableNames.includes("vec_history") ||
      !tableNames.includes("vec_history_mapping") ||
      !tableNames.includes("places_semantic_models")
    ) {
      lazy.logger.error(`Missing tables in the database`);
      return false;
    }

    // Dimension mismatch is detected by the manager comparing
    // getActiveModelConfig() against the resolved modelConfig, not here. Any
    // mismatch triggers replaceEmbeddingTables() which keeps row + tables
    // in sync.

    // Verify the vec0 index is configured with cosine distance and a
    // bit-quantized rescore index. If the create SQL is missing either, the
    // table is not the one we expect and should be recreated.
    let indexConfigMatches = (
      await this.#conn.execute(
        `SELECT INSTR(sql, :distance) > 0 AND INSTR(sql, :quantizer) > 0
       FROM sqlite_master WHERE name = 'vec_history'`,
        {
          distance: "distance_metric=cosine",
          quantizer: "quantizer=bit",
        }
      )
    )[0].getResultByIndex(0);
    if (!indexConfigMatches) {
      lazy.logger.error(
        `vec_history index config doesn't match (expected cosine + bit-quantized rescore)`
      );
      return false;
    }

    try {
      let wasted = await this.#measureDatabaseFragmentation();
      lazy.logger.info(
        `Database initialized, wasted space: ${Math.round(wasted * 100)}%`
      );
      if (wasted > MAX_WASTED_SPACE_PERC) {
        await this.#defragmentDatabase();
      }
    } catch (e) {
      lazy.logger.error(`Error checking database fragmentation: ${e}`);
      return false;
    }

    return true;
  }

  /**
   * Evaluates space wasted in the database
   *
   * @returns {Promise<number>} The percentage of space wasted.
   */
  async #measureDatabaseFragmentation() {
    // Evaluate space wasted by the database.
    // The last chunk is the one being filled, it is expected to be mostly empty
    // so we don't consider it.
    let rows = await this.#conn.execute(`
      WITH chunks (chunk_id, size) AS (
        SELECT chunk_id, size FROM vec_history_chunks ORDER BY chunk_id DESC LIMIT -1 OFFSET 1
      )
      SELECT 1 - IFNULL(
        CAST((
            SELECT count(*) FROM vec_history_rowids JOIN chunks USING (chunk_id)
          ) AS REAL)
        / (SELECT SUM(size) FROM chunks)
        , 1)
    `);
    let wasted = rows[0].getResultByIndex(0);
    Glean.places.databaseSemanticHistoryWastedPercentage.set(
      Math.round(wasted * 100)
    );
    return wasted;
  }

  /**
   * Defragments the database contents.
   *
   * The database only removes a chunk when all vectors in the chunk have been removed.
   *
   * Given the frecency cleanup behavior it may be unlikely for that to happen.
   *
   * A workaround for now is to create a new virtual table and copy the data over.
   * Then a VACUUM is necessary to compact the leftover space.
   *
   * This may be removed when Sqlite-vec merges this PR or similar:
   * https://github.com/asg017/sqlite-vec/pull/269
   *
   */
  async #defragmentDatabase() {
    let timer = Glean.places.databaseSemanticHistoryDefragmentTime.start();
    await this.#conn.executeTransaction(async () => {
      await this.#conn.execute(`
          ALTER TABLE vec_history RENAME TO old_vec_history
          `);

      await this.#conn.execute(this.#createVirtualTableSQL);

      await this.#conn.execute(`
            INSERT INTO vec_history(rowid, embedding)
            SELECT rowid, embedding
            FROM old_vec_history
          `);

      await this.#conn.execute(`
          DROP TABLE old_vec_history
        `);
    });
    await this.#conn.execute(`
      VACUUM
    `);
    Glean.places.databaseSemanticHistoryDefragmentTime.stopAndAccumulate(timer);
  }

  /**
   * Recreate the database contents. This is typically called inside a transaction
   * during a migration.
   *
   * This is used in the V3 migration to create the internal bit index.
   */
  async reindexDatabase() {
    let timer = Glean.places.databaseSemanticHistoryReindexTime.start();
    await this.#conn.execute(`
        ALTER TABLE vec_history RENAME TO old_vec_history
        `);
    await this.#conn.execute(this.#createVirtualTableSQL);
    await this.#conn.execute(`
          INSERT INTO vec_history(rowid, embedding)
          SELECT rowid, embedding
          FROM old_vec_history
        `);
    await this.#conn.execute(`
        DROP TABLE old_vec_history
      `);
    Glean.places.databaseSemanticHistoryReindexTime.stopAndAccumulate(timer);
  }

  /**
   * Returns the path to the semantic database.
   *
   * @returns {string} The path to the semantic database.
   */
  get databaseFilePath() {
    return PathUtils.join(PathUtils.profileDir, this.databaseFileName);
  }

  /**
   * Returns the currently active model row from places_semantic_models, or
   * null if no active row exists.
   *
   * @param {object} connection
   * @returns {Promise<object | null>}
   */
  async getActiveModelConfig(connection) {
    const rows = await connection.execute(
      `SELECT table_base_name, feature_id, model_id,
              embedding_dimension, target_locales, created_at, status
       FROM places_semantic_models
       WHERE status = 'active'
       LIMIT 1`
    );
    if (!rows.length) {
      return null;
    }
    const row = rows[0];
    return {
      tableBaseName: row.getResultByName("table_base_name"),
      featureId: row.getResultByName("feature_id"),
      modelId: row.getResultByName("model_id"),
      embeddingDimension: row.getResultByName("embedding_dimension"),
      targetLocales: row.getResultByName("target_locales"),
      createdAt: row.getResultByName("created_at"),
      status: row.getResultByName("status"),
    };
  }

  /**
   * Drops the embedding-bearing tables (vec_history + mapping) and recreates
   * them at the new dimension, then upserts the matching row in
   * places_semantic_models. The schema version and other Places state are
   * preserved -- only the embedding data is replaced.
   *
   * @param {object} modelConfig
   *   Resolved engine options ({ featureId, modelId,
   *   embeddingDimension, targetLocales? }).
   * @param {object} connection Database connection
   * @returns {Promise<void>}
   */
  async replaceEmbeddingTables(modelConfig, connection) {
    lazy.logger.info(
      `Replacing embedding tables for model switch -> ${modelConfig.featureId} dim=${modelConfig.embeddingDimension}`
    );
    this.#embeddingSize = modelConfig.embeddingDimension;
    await connection.executeTransaction(async () => {
      await connection.execute(`DROP TABLE IF EXISTS vec_history`);
      await connection.execute(`DROP TABLE IF EXISTS vec_history_mapping`);
      await connection.execute(this.#createVirtualTableSQL);
      await this.#createMappingTable();
      await this.#insertModelConfigRow(modelConfig);
    });
  }

  /**
   * Removes the semantic database file and auxiliary files.
   *
   * @returns {Promise<void>} resolves when done.
   */
  async removeDatabaseFiles() {
    lazy.logger.info("Removing database files");
    await this.closeConnection();
    try {
      for (let file of [
        this.databaseFilePath,
        PathUtils.join(
          this.#databaseFolderPath,
          this.databaseFileName + "-wal"
        ),
        PathUtils.join(
          this.#databaseFolderPath,
          this.databaseFileName + "-shm"
        ),
      ]) {
        await IOUtils.remove(file, {
          retryReadonly: true,
          recursive: true,
          ignoreAbsent: true,
        });
      }
    } catch (e) {
      // Try to clear on next startup.
      Services.prefs.setBoolPref(
        "places.semanticHistory.removeOnStartup",
        true
      );
      // Re-throw the exception for the caller.
      throw e;
    }
  }
}
