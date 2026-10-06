/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function setup() {
  let path = await setupPlacesDatabase("places_v85.sqlite");

  let db = await Sqlite.openConnection({ path });

  // Verify the new columns don't exist yet on moz_origins.
  let columns = await db.execute(
    "SELECT name FROM pragma_table_info('moz_origins')"
  );
  let columnNames = columns.map(r => r.getResultByName("name"));
  Assert.ok(
    !columnNames.includes("block_until_ms"),
    "block_until_ms should not exist on moz_origins before migration"
  );
  Assert.ok(
    !columnNames.includes("block_pages_until_ms"),
    "block_pages_until_ms should not exist on moz_origins before migration"
  );

  // Seed an existing moz_origins row to verify it survives migration.
  await db.execute(`
    INSERT OR IGNORE INTO moz_origins (prefix, host, frecency)
    VALUES ('https://', 'example.com', 100)
  `);

  await db.close();
});

add_task(async function database_is_valid() {
  // Accessing the database for the first time triggers migration.
  Assert.equal(
    PlacesUtils.history.databaseStatus,
    PlacesUtils.history.DATABASE_STATUS_UPGRADED
  );

  const db = await PlacesUtils.promiseDBConnection();
  Assert.equal(await db.getSchemaVersion(), CURRENT_SCHEMA_VERSION);

  // Verify both new columns exist on moz_origins.
  let columns = await db.execute(
    "SELECT name FROM pragma_table_info('moz_origins')"
  );
  let columnNames = columns.map(r => r.getResultByName("name"));
  Assert.ok(
    columnNames.includes("block_until_ms"),
    "block_until_ms column should exist on moz_origins after migration"
  );
  Assert.ok(
    columnNames.includes("block_pages_until_ms"),
    "block_pages_until_ms column should exist on moz_origins after migration"
  );

  // Verify existing rows survived with NULL defaults for the new columns.
  let rows = await db.execute(
    `SELECT host, block_until_ms, block_pages_until_ms
     FROM moz_origins
     WHERE host = 'example.com'`
  );
  Assert.equal(
    rows.length,
    1,
    "Existing moz_origins row should survive migration"
  );
  Assert.equal(
    rows[0].getResultByName("block_until_ms"),
    null,
    "block_until_ms should default to NULL for existing rows"
  );
  Assert.equal(
    rows[0].getResultByName("block_pages_until_ms"),
    null,
    "block_pages_until_ms should default to NULL for existing rows"
  );
});
