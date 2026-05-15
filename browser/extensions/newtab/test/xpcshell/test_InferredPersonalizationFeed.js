/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  InferredPersonalizationFeed:
    "resource://newtab/lib/InferredPersonalizationFeed.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

/**
 * Test inferred personalization feed constructor from InferredPersonalizationFeed.sys.mjs.
 */
add_task(async function test_InferredPersonalizationFeed_constructor() {
  const sandbox = sinon.createSandbox();
  sandbox
    .stub(InferredPersonalizationFeed.prototype, "PersistentCache")
    .returns({
      set: () => {},
      get: () => {},
    });

  let feed = new InferredPersonalizationFeed();

  ok(feed instanceof InferredPersonalizationFeed, "Feed is constructed");
  sandbox.restore();
});

/**
 * Test inferred personalization feed method clearOldDataOfTable from InferredPersonalizationFeed.sys.mjs.
 * We pass a fake placesUtils to verify the SQL query and dates are correct.
 */
add_task(async function test_clearOldDataOfTable() {
  const sandbox = sinon.createSandbox();
  sandbox
    .stub(InferredPersonalizationFeed.prototype, "PersistentCache")
    .returns({
      set: () => {},
      get: () => {},
    });

  const FIXED_TIMESTAMP_MS = 1672531200000;
  sandbox.stub(InferredPersonalizationFeed.prototype, "Date").returns({
    now: () => FIXED_TIMESTAMP_MS,
  });

  const feed = new InferredPersonalizationFeed();

  let sqlUsed;
  let wrapperNameUsed;
  let wrapperCalled = 0;

  const fakePlacesUtils = {
    withConnectionWrapper: async (name, callback) => {
      wrapperCalled++;
      wrapperNameUsed = name;
      const fakeDB = {
        execute: async sql => {
          sqlUsed = sql;
          return [];
        },
      };
      return callback(fakeDB);
    },
  };

  const preserveAgeDays = 7;
  const table = "test_table";

  const expectedTimestamp =
    Math.floor(FIXED_TIMESTAMP_MS / 1000) - preserveAgeDays * 24 * 60 * 60;

  await feed.clearOldDataOfTable(preserveAgeDays, table, fakePlacesUtils);

  const expectedSQL = `DELETE FROM ${table}
      WHERE timestamp_s < ${expectedTimestamp}`;

  equal(wrapperCalled, 1, "withConnectionWrapper was called once");
  ok(
    wrapperNameUsed.includes("clearOldDataOfTable"),
    "withConnectionWrapper name includes clearOldDataOfTable"
  );
  equal(
    sqlUsed.replace(/\s+/g, " ").trim(),
    expectedSQL.replace(/\s+/g, " ").trim(),
    "SQL query is as expected"
  );

  sandbox.restore();
});
