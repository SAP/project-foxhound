import { MESSAGE_CONV_ID_INDEX } from "./ChatSql.sys.mjs";

/*
 This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Please refer to sql.mjs for details on creating new migrations.
 *
 * - List each change here and what it's for.
 *
 * @param {OpenedConnection} conn - The SQLite connection to use for the migration
 * @param {number} version - The version number of the current schema
 */
async function applyV2(conn, version) {
  if (version < 2) {
    await conn.execute(MESSAGE_CONV_ID_INDEX);
  }
}

/**
 * Retrieve column names for a table in order to determine whether
 * a schema migration is necessary.
 *
 * Uses PRAGMA table_info to inspect the schema directly instead of
 * relying on a SELECT error, which helps distinguish missing
 * columns from unrelated database errors.
 *
 * @param {Connection} conn
 * @param {string} tableName
 */
async function getColumns(conn, tableName) {
  const columns = await conn.execute(`PRAGMA table_info(${tableName})`);
  return new Set(columns.map(c => c.name));
}

// Rename insights to memories
async function applyV3(conn, version) {
  if (version >= 3) {
    return;
  }

  const columns = await getColumns(conn, "message");
  if (columns.has("memories_enabled")) {
    return;
  }

  await conn.execute(
    "ALTER TABLE message RENAME COLUMN insights_enabled TO memories_enabled"
  );

  await conn.execute(
    "ALTER TABLE message RENAME COLUMN insights_flag_source TO memories_flag_source"
  );

  await conn.execute(
    "ALTER TABLE message RENAME COLUMN insights_applied_jsonb TO memories_applied_jsonb"
  );
}

/**
 * Array of migration functions to run in the order they should be run in.
 *
 * @returns {Array<Function>}
 */
export const migrations = [applyV2, applyV3];
