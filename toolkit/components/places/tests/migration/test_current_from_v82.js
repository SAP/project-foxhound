/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function setup() {
  let path = await setupPlacesDatabase("places_v82.sqlite");
  let db = await Sqlite.openConnection({ path });

  await db.execute(`
    INSERT INTO moz_places (url, guid, url_hash, frecency, recalc_frecency)
    VALUES
      -- Zero frecency
      ('https://example1.com', '___________1', '123456', 0, 0),
      -- Positive frecency
      ('https://example2.com', '___________2', '123456', 1, 0),
      -- Negative frecency
      ('https://example3.com', '___________3', '123456', -1, 0)
  `);

  let rows = await db.execute(`
    SELECT frecency, recalc_frecency
    FROM moz_places
    WHERE url_hash = '123456'
  `);

  Assert.equal(rows.length, 3, "There should be three rows.");
  for (let row of rows) {
    Assert.equal(
      row.getResultByName("recalc_frecency"),
      0,
      "Row should have recalc_frecency equal to 0."
    );
  }

  Assert.equal(
    rows[0].getResultByName("frecency"),
    0,
    "Should have zero frecency."
  );
  Assert.greater(
    rows[1].getResultByName("frecency"),
    0,
    "Should have a frecency greater than 0."
  );
  Assert.less(
    rows[2].getResultByName("frecency"),
    0,
    "Should have a frecency less than 0."
  );

  await db.close();
});

add_task(async function database_is_valid() {
  // trigger migration
  Assert.equal(
    PlacesUtils.history.databaseStatus,
    PlacesUtils.history.DATABASE_STATUS_UPGRADED
  );

  const db = await PlacesUtils.promiseDBConnection();
  Assert.equal(await db.getSchemaVersion(), CURRENT_SCHEMA_VERSION);

  let rows = await db.execute(`
    SELECT recalc_frecency FROM moz_places
    WHERE url_hash = '123456'
  `);
  Assert.equal(
    rows[0].getResultByName("recalc_frecency"),
    0,
    "Recalc frecency should still be 0."
  );
  Assert.equal(
    rows[1].getResultByName("recalc_frecency"),
    1,
    "Recalc frecency should be 1."
  );
  Assert.equal(
    rows[2].getResultByName("recalc_frecency"),
    0,
    "Recalc frecency should still be 0."
  );
});
