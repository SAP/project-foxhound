/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function setup() {
  let path = await setupPlacesDatabase("places_v83.sqlite");
  let db = await Sqlite.openConnection({ path });

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const NOW = Date.now() * 1000; // Microseconds
  const RECENT = NOW - 1 * ONE_DAY * 1000;
  const OLD = NOW - 91 * ONE_DAY * 1000; // 91 days ago (outside 90 day window)

  // 1. Setup Moz Origins
  // Note: We use distinct IDs to make verification easy.
  await db.execute(`
    INSERT INTO moz_origins (id, prefix, host, frecency, recalc_frecency)
    VALUES
      -- Frecency above 1, recent visit. Should recalc.
      (100, 'https://', 'high-frecency-recent.com', 2, 0),

      -- Frecency above 1, old visit. Should recalc.
      (101, 'https://', 'high-frecency-old.com', 2, 0),

      -- Frecency above 1, no visits. Should recalc.
      (102, 'https://', 'high-frecency-empty.com', 2, 0),

      -- Frecency at 1, recent visit. Should skip.
      (103, 'https://', 'low-frecency-recent.com', 1, 0),

      -- Frecency at 1, old visit. Should skip.
      (104, 'https://', 'low-frecency-old.com', 1, 0),

      -- Frecency at 1, no visits. Should skip.
      (105, 'https://', 'low-frecency-empty.com', 1, 0),

      -- Already marked. Should remain 1.
      (106, 'https://', 'already-marked.com', -1, 1)
  `);

  // 2. Setup Moz Places (Visits)
  await db.execute(`
    INSERT INTO moz_places
      (url, url_hash, frecency, last_visit_date, origin_id, guid)
    VALUES
      ('https://high-frecency-recent.com/', 'hashA', 2000, ${RECENT}, 100, 'guid0000000A'),
      ('https://high-frecency-old.com/',    'hashB', 2000, ${OLD},    101, 'guid0000000B'),
      ('https://high-frecency-empty.com/',  'hashC', 2000, null,      102, 'guid0000000C'),
      ('https://low-frecency-recent.com/',  'hashD', 10,   ${RECENT}, 103, 'guid0000000D'),
      ('https://low-frecency-old.com/',     'hashE', 10,   ${OLD},    104, 'guid0000000E'),
      ('https://low-frecency-empty.com/',   'hashF', 10,   null,      105, 'guid0000000F'),
      ('https://already-marked.com/',       'hashG', 10,   null,      106, 'guid0000000G')
  `);

  await db.close();
});

add_task(async function database_is_valid() {
  // Trigger migration
  Assert.equal(
    PlacesUtils.history.databaseStatus,
    PlacesUtils.history.DATABASE_STATUS_UPGRADED
  );

  const db = await PlacesUtils.promiseDBConnection();
  Assert.equal(await db.getSchemaVersion(), CURRENT_SCHEMA_VERSION);

  // Check results
  let rows = await db.execute(`
    SELECT id, host, recalc_frecency
    FROM moz_origins
    WHERE id >= 100
    ORDER BY id ASC
  `);

  // Map results by ID for easy lookup
  let results = new Map();
  for (let row of rows) {
    results.set(
      row.getResultByName("id"),
      row.getResultByName("recalc_frecency")
    );
  }

  const expectedResults = [
    {
      id: 100,
      shouldRecalc: 1,
      desc: "High frecency should be marked for recalc to decay.",
    },
    {
      id: 101,
      shouldRecalc: 1,
      desc: "High frecency with old visit (<30 days) should be marked for recalc.",
    },
    {
      id: 102,
      shouldRecalc: 1,
      desc: "High frecency with no visits should be marked for recalc.",
    },
    {
      id: 103,
      shouldRecalc: 0,
      desc: "Low frecency with recent visit should not be marked for recalc.",
    },
    {
      id: 104,
      shouldRecalc: 0,
      desc: "Low frecency with old visit should not be marked for recalc.",
    },
    {
      id: 105,
      shouldRecalc: 0,
      desc: "Low frecency with no visits should not be marked for recalc.",
    },
    {
      id: 106,
      shouldRecalc: 1,
      desc: "Already marked rows should remain marked.",
    },
  ];

  for (let test of expectedResults) {
    Assert.equal(
      results.get(test.id),
      test.shouldRecalc,
      `Origin ${test.id}: ${test.desc}`
    );
  }
});
