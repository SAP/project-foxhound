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

// Every time the schema or the underlying data changes, you must bump up the
// schema version. This is also necessary for example if we change the embedding
// size.

// Remember to:
// 1. Bump up the version number
// 2. Add a migration function to migrate the data to the new schema.
// 3. Update #createDatabaseEntities and #checkDatabaseHealth
// 4. Add a test to check that the migration works correctly.

// Note downgrades are not supported, so when you bump up the version and the
// user downgrades, the database will be deleted and recreated.
// If a migration throws, the database will also be deleted and recreated.

const CURRENT_SCHEMA_VERSION = 2;

// Maximum percentage of wasted space before defragmenting the database.
const MAX_WASTED_SPACE_PERC = 0.6;

// Maximum number of _chunksNN tables in sqlite-vec.
const MAX_CHUNKS_TABLES = 100;

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
    await conn.execute(`ATTACH DATABASE '${placesDbPath}' AS places`);
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

      await this.#conn.setSchemaVersion(CURRENT_SCHEMA_VERSION);
    });
  }

  /**
   * Get SQL to create the embeddings virtual table.
   */
  get #createVirtualTableSQL() {
    return `
      CREATE VIRTUAL TABLE vec_history USING vec0(
        embedding FLOAT[${this.#embeddingSize}],
        embedding_coarse bit[${this.#embeddingSize}]
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
    await this.#conn.execute(`
      CREATE TABLE vec_history_mapping (
        rowid INTEGER PRIMARY KEY,
        url_hash INTEGER NOT NULL UNIQUE
      );
    `);
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
      !tableNames.includes("vec_history_mapping")
    ) {
      lazy.logger.error(`Missing tables in the database`);
      return false;
    }

    // If the embedding size changed the database should be recreated. This
    // should be handled by a migration, but we check to be overly safe.
    let embeddingSizeMatches = (
      await this.#conn.execute(
        `SELECT INSTR(sql, :needle) > 0
       FROM sqlite_master WHERE name = 'vec_history'`,
        { needle: `FLOAT[${this.#embeddingSize}]` }
      )
    )[0].getResultByIndex(0);
    if (!embeddingSizeMatches) {
      lazy.logger.error(`Embeddings size doesn't match`);
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
   * Due to https://github.com/asg017/sqlite-vec/issues/220 the database may
   * grow unbound if continuous insertions and removals are made, because the
   * space left by embeddings removed from chunks is not reused. The only
   * workaround for now is to create a new virtual table and copy the data over.
   * Then a VACUUM is necessary to compact the leftover space.
   *
   * Updating sqlite-vec in the future may make this obsolete, or require deep
   * changes.
   */
  async #defragmentDatabase() {
    lazy.logger.info(`Defragmenting the database`);
    let timer = Glean.places.databaseSemanticHistoryDefragmentTime.start();
    await this.#conn.executeTransaction(async () => {
      // sqlite-vec supports removing shadow tables on DROP, but unfortunately
      // doesn't rename them on ALTER, so we must do it manually.
      for (let suffix of ["", "_info", "_chunks", "_rowids"]) {
        await this.#conn.execute(`
          ALTER TABLE vec_history${suffix} RENAME TO old_vec_history${suffix}
        `);
      }
      for (let i = 0; i < MAX_CHUNKS_TABLES; ++i) {
        try {
          await this.#conn.execute(`
              ALTER TABLE vec_history_vector_chunks${`${i}`.padStart(2, "0")}
              RENAME TO old_vec_history_vector_chunks${`${i}`.padStart(2, "0")}
            `);
        } catch (e) {
          break;
        }
      }
      await this.#conn.execute(this.#createVirtualTableSQL);
      await this.#conn.execute(`
          INSERT INTO vec_history(rowid, embedding, embedding_coarse)
          SELECT rowid, embedding, embedding_coarse FROM old_vec_history
        `);
      await this.#conn.execute(`
          DROP TABLE old_vec_history
        `);
    });

    // Cannot VACUUM from within a transaction.
    await this.#conn.execute(`
      VACUUM
    `);

    Glean.places.databaseSemanticHistoryDefragmentTime.stopAndAccumulate(timer);
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
