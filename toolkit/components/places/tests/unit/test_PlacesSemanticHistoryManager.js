/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
  getPlacesSemanticHistoryManager:
    "resource://gre/modules/PlacesSemanticHistoryManager.sys.mjs",
  PlacesSemanticHistoryDatabase:
    "resource://gre/modules/PlacesSemanticHistoryDatabase.sys.mjs",
  Region: "resource://gre/modules/Region.sys.mjs",
});

ChromeUtils.defineLazyGetter(this, "QuickSuggestTestUtils", () => {
  const { QuickSuggestTestUtils: module } = ChromeUtils.importESModule(
    "resource://testing-common/QuickSuggestTestUtils.sys.mjs"
  );
  module.init(this);
  return module;
});

function approxEqual(a, b, tolerance = 1e-6) {
  return Math.abs(a - b) < tolerance;
}

function createPlacesSemanticHistoryManager(options = {}) {
  return getPlacesSemanticHistoryManager(
    Object.assign(
      {
        rowLimit: 10,
      },
      options
    ),
    true
  );
}

/**
 * Mock engine that simulates an ML embedding engine.
 */
class MockMLEngine {
  #embeddingSize;
  #entries;
  /**
   * @param {number} embeddingSize - Length of generated fallback vectors;
   *   must match the manager's resolved `embedder.embeddingSize` or inserts
   *   into vec_history will fail.
   * @param {Array} entries - Array of entries with title and vector properties.
   */
  constructor(embeddingSize, entries = []) {
    this.#embeddingSize = embeddingSize;
    this.#entries = entries;
  }

  async run(request) {
    const texts = request.args;
    // add small delay for test
    await new Promise(resolve => do_timeout(10, resolve));
    return texts.map(text => {
      if (typeof text !== "string" || text.trim() === "") {
        throw new Error("Invalid input: text must be a non-empty string");
      }
      let entry = this.#entries.find(e => e.title === text);
      if (entry) {
        return entry.vector;
      }
      return Array(this.#embeddingSize).fill(0);
    });
  }
}

add_setup(async function () {
  Services.fog.initializeFOG();
  let cleanup = await QuickSuggestTestUtils.setRegionAndLocale({
    region: "US",
    locale: "en-US",
  });
  registerCleanupFunction(cleanup);
});

add_task(async function test_tensorToSQLBindable() {
  let tensor = [0.3, 0.3, 0.3, 0.3];
  let bindable = PlacesUtils.tensorToSQLBindable(tensor);
  Assert.equal(
    Object.prototype.toString.call(bindable),
    "[object Uint8ClampedArray]",
    "tensorToSQLBindable should return a Uint8ClampedArray"
  );
  let floatArray = new Float32Array(bindable.buffer);
  Assert.equal(
    floatArray.length,
    4,
    "Float32Array should have the same length as tensor"
  );
  for (let i = 0; i < 4; i++) {
    Assert.ok(
      approxEqual(floatArray[i], tensor[i]),
      "Element " +
        i +
        " matches expected value within tolerance. " +
        "Expected: " +
        tensor[i] +
        ", got: " +
        floatArray[i]
    );
  }
});

add_task(async function test_shutdown_no_error() {
  const semanticManager = createPlacesSemanticHistoryManager();

  sinon.stub(semanticManager.semanticDB, "closeConnection").resolves();
  await semanticManager.shutdown();

  Assert.ok(
    semanticManager.semanticDB.closeConnection.called,
    "Connection close() should be invoked"
  );
  sinon.reset();
});

add_task(async function test_canUseSemanticSearch_all_conditions_met() {
  const semanticManager = createPlacesSemanticHistoryManager();

  Services.prefs.setBoolPref("browser.ml.enable", true);
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", true);

  semanticManager.qualifiedForSemanticSearch = true;
  semanticManager.enoughEntries = true;

  Assert.ok(
    semanticManager.canUseSemanticSearch,
    "Semantic search should be enabled when all conditions met."
  );
});

add_task(async function test_canUseSemanticSearch_ml_disabled() {
  const semanticManager = createPlacesSemanticHistoryManager();

  Services.prefs.setBoolPref("browser.ml.enable", false);
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", true);

  semanticManager.qualifiedForSemanticSearch = true;
  semanticManager.enoughEntries = true;

  Assert.ok(
    !semanticManager.canUseSemanticSearch,
    "Semantic search should be disabled when ml disabled."
  );
});

add_task(async function test_canUseSemanticSearch_featureGate_disabled() {
  const semanticManager = createPlacesSemanticHistoryManager();

  Services.prefs.setBoolPref("browser.ml.enable", true);
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", false);

  semanticManager.qualifiedForSemanticSearch = true;
  semanticManager.enoughEntries = true;

  Assert.ok(
    !semanticManager.canUseSemanticSearch,
    "Semantic search should be disabled when featureGate disabled."
  );
});

add_task(async function test_canUseSemanticSearch_not_qualified() {
  const semanticManager = createPlacesSemanticHistoryManager();

  Services.prefs.setBoolPref("browser.ml.enable", true);
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", true);

  semanticManager.qualifiedForSemanticSearch = false;
  semanticManager.enoughEntries = true;

  Assert.ok(
    !semanticManager.canUseSemanticSearch,
    "Semantic search should be disabled when not qualified."
  );
});

add_task(async function test_canUseSemanticSearch_region_locale() {
  const semanticManager = createPlacesSemanticHistoryManager();

  Services.prefs.setBoolPref("browser.ml.enable", true);
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", true);

  semanticManager.qualifiedForSemanticSearch = true;
  semanticManager.enoughEntries = true;

  let tests = [
    { region: "US", locale: "en-US", supported: true },
    { region: "FR", locale: "fr-FR", supported: false },
    {
      region: "IT",
      locale: "it-IT",
      supported: true,
      setPref: '[["IT",["it-*"]]]',
    },
    {
      region: "US",
      locale: "en-US",
      supported: false,
      setPref: '[["IT",["it-*"]]]',
    },
    {
      region: "US",
      locale: "en-US",
      supported: false,
      setPref: "[]", // empty list means disable
    },
    {
      region: "US",
      locale: "en-US",
      supported: false,
      setPref: "", // empty string means disable
    },
    {
      region: "US",
      locale: "en-US",
      supported: true,
      setPref: "invalid json", // invalid, should use default.
    },
    {
      region: "IT",
      locale: "it", // short locale format
      supported: true,
      setPref: '[["IT",["it-*"]]]',
    },
    {
      region: "US",
      locale: "en-US",
      supported: true,
      setPref: '[["US",["en-US"]]]',
    },
    {
      region: "US",
      locale: "es-MX",
      supported: false,
      setPref: '[["US",["en-US"]]]',
    },
    {
      region: "US",
      locale: "es-MX",
      supported: true,
      setPref: '[["US",["en-*","es-*"]]]',
    },
    {
      region: "US",
      locale: "en-US",
      supported: true,
      setPref: '[["US",["en-*","es-*"]]]',
    },
  ];
  for (let { region, locale, supported, setPref } of tests) {
    if (setPref !== undefined) {
      info("Setting `supportedRegions` pref to " + setPref);
      Services.prefs.setCharPref(
        "places.semanticHistory.supportedRegions",
        setPref
      );
    }
    await QuickSuggestTestUtils.withRegionAndLocale({
      region,
      locale,
      skipSuggestReset: true,
      callback() {
        Assert.equal(
          semanticManager.canUseSemanticSearch,
          supported,
          `Check region ${region} and locale ${locale}`
        );
      },
    });
    if (setPref !== undefined) {
      Services.prefs.clearUserPref("places.semanticHistory.supportedRegions");
    }
  }
});

add_task(async function test_removeDatabaseFilesOnDisable() {
  // Ensure Places has been initialized.
  Assert.equal(
    PlacesUtils.history.databaseStatus,
    PlacesUtils.history.DATABASE_STATUS_CREATE,
    "Places database should be initialized."
  );
  let semanticManager = createPlacesSemanticHistoryManager();
  await semanticManager.getConnection();

  Assert.ok(await IOUtils.exists(semanticManager.semanticDB.databaseFilePath));
  Assert.ok(
    await IOUtils.exists(semanticManager.semanticDB.databaseFilePath + "-wal")
  );

  Services.fog.testResetFOG();
  await PlacesDBUtils.telemetry();
  Assert.equal(
    Glean.places.databaseSemanticHistoryFilesize.testGetValue().count,
    1,
    "Check for file size being collected"
  );

  await semanticManager.shutdown();

  // Create a new instance of the manager after disabling the feature.
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", false);
  semanticManager = createPlacesSemanticHistoryManager();

  Assert.ok(
    !semanticManager.canUseSemanticSearch,
    "Semantic search should be disabled."
  );

  await TestUtils.waitForCondition(async () => {
    return (
      !(await IOUtils.exists(semanticManager.semanticDB.databaseFilePath)) &&
      !(await IOUtils.exists(
        semanticManager.semanticDB.databaseFilePath + "-wal"
      ))
    );
  }, "Wait for database files to be removed");
});

add_task(async function test_removeDatabaseFilesOnStartup() {
  // Ensure Places has been initialized.
  Assert.equal(
    PlacesUtils.history.databaseStatus,
    PlacesUtils.history.DATABASE_STATUS_CREATE,
    "Places database should be initialized."
  );

  Services.prefs.setBoolPref("places.semanticHistory.featureGate", true);
  let semanticManager = createPlacesSemanticHistoryManager();

  Assert.ok(
    semanticManager.canUseSemanticSearch,
    "Semantic search should be enabled."
  );
  await semanticManager.getConnection();

  Assert.ok(await IOUtils.exists(semanticManager.semanticDB.databaseFilePath));
  Assert.ok(
    await IOUtils.exists(semanticManager.semanticDB.databaseFilePath + "-wal")
  );
  await semanticManager.shutdown();

  // Create a new instance of the manager after setting the pref.
  Services.prefs.setBoolPref("places.semanticHistory.removeOnStartup", true);
  semanticManager = createPlacesSemanticHistoryManager();

  Assert.ok(
    !Services.prefs.getBoolPref(
      "places.semanticHistory.removeOnStartup",
      false
    ),
    "Pref should have been reset."
  );
});

add_task(async function test_managerReconcilesModelOnConnect() {
  // Pre-seed the DB with a model row whose embeddingDimension differs from
  // what the manager will resolve on construction. On first getConnection()
  // the manager's #reconcileModelState() should detect the mismatch and call
  // replaceEmbeddingTables, rewriting both the row and vec_history.
  const PRESEED_DIM = 64;

  let seedDb = new PlacesSemanticHistoryDatabase({
    embeddingSize: PRESEED_DIM,
    fileName: "places_semantic.sqlite",
  });
  let conn = await seedDb.getConnection();
  await seedDb.replaceEmbeddingTables(
    {
      featureId: "simple-text-embedder",
      modelId: "test/legacy",
      embeddingDimension: PRESEED_DIM,
    },
    conn
  );
  let preseeded = await seedDb.getActiveModelConfig(conn);
  Assert.equal(preseeded.embeddingDimension, PRESEED_DIM, "Pre-seeded dim");
  Assert.equal(preseeded.modelId, "test/legacy", "Pre-seeded modelId");
  await seedDb.closeConnection();

  Services.prefs.setBoolPref("browser.ml.enable", true);
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", true);
  let semanticManager = createPlacesSemanticHistoryManager();
  semanticManager.qualifiedForSemanticSearch = true;
  semanticManager.enoughEntries = true;
  Assert.ok(
    semanticManager.canUseSemanticSearch,
    "canUseSemanticSearch must be true for getConnection to run reconcile"
  );

  const desired = semanticManager.embedder.modelContext;
  Assert.notEqual(
    desired.embeddingDimension,
    PRESEED_DIM,
    "Desired must differ from pre-seeded to exercise reconcile"
  );

  conn = await semanticManager.getConnection();
  Assert.ok(conn, "Connection should be returned");

  const after = await semanticManager.semanticDB.getActiveModelConfig(conn);
  Assert.equal(
    after.embeddingDimension,
    desired.embeddingDimension,
    "Reconciliation should rewrite the row to the manager's dim"
  );
  Assert.equal(
    after.modelId,
    desired.modelId,
    "Reconciliation should rewrite modelId to match the manager"
  );
  Assert.ok(
    !!(
      await conn.execute(
        `SELECT INSTR(sql, :needle) > 0
         FROM sqlite_master WHERE name = 'vec_history'`,
        { needle: `FLOAT[${desired.embeddingDimension}]` }
      )
    )[0].getResultByIndex(0),
    "vec_history should be at the manager's dim"
  );
  Assert.equal(
    (
      await conn.execute(`SELECT count(*) FROM vec_history`)
    )[0].getResultByIndex(0),
    0,
    "Embeddings from the pre-seeded DB should have been dropped"
  );

  await semanticManager.shutdown();
});

add_task(async function test_empty_region() {
  // Test that if region is empty (uninitialized) creating a semantic manager
  // will try to initialize Region.
  let stub = sinon.stub(Region, "home").get(() => "");
  let spy = sinon.spy(Region, "init");
  let semanticManager = createPlacesSemanticHistoryManager();
  Assert.ok(
    !semanticManager.canUseSemanticSearch,
    `Check semantic search disabled when region not set`
  );
  Assert.ok(spy.calledOnce, "Region.init should have been called");
  spy.restore();
  stub.restore();
});

add_task(async function test_chunksTelemetry() {
  await PlacesTestUtils.addVisits([
    { url: "https://test1.moz.com/", title: "test 1" },
    { url: "https://test2.moz.com/", title: "test 2" },
  ]);

  Services.fog.testResetFOG();

  Assert.strictEqual(
    Glean.places.semanticHistoryFindChunksTime.testGetValue(),
    null,
    "No value initially"
  );
  Assert.strictEqual(
    Glean.places.semanticHistoryChunkCalculateTime.testGetValue(),
    null,
    "No value initially"
  );
  Assert.strictEqual(
    Glean.places.semanticHistoryMaxChunksCount.testGetValue(),
    null,
    "No value initially"
  );
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", true);

  let semanticManager = createPlacesSemanticHistoryManager({
    deferredTaskInterval: 100, // lower time to avoid timeouts.
  });
  await semanticManager.getConnection();
  semanticManager.embedder.setEngine(
    new MockMLEngine(semanticManager.embedder.embeddingSize)
  );
  await TestUtils.topicObserved(
    "places-semantichistorymanager-update-complete"
  );

  Assert.equal(
    Glean.places.semanticHistoryFindChunksTime.testGetValue().count,
    1
  );
  Assert.greater(
    Glean.places.semanticHistoryFindChunksTime.testGetValue().sum,
    0
  );

  Assert.equal(
    Glean.places.semanticHistoryChunkCalculateTime.testGetValue().count,
    1
  );
  Assert.greater(
    Glean.places.semanticHistoryChunkCalculateTime.testGetValue().sum,
    0
  );

  Assert.equal(Glean.places.semanticHistoryMaxChunksCount.testGetValue(), 1);

  Assert.notEqual(
    Glean.places.databaseSemanticHistoryNumEntries.testGetValue(),
    null,
    "Number of embeddings should be reported to telemetry"
  );

  await semanticManager.shutdown();
});

add_task(async function test_duplicate_urlhash() {
  const urls = [
    { url: "https://test1.moz.com/", title: "test 1" },
    { url: "https://test2.moz.com/", title: "test 2" },
    { url: "https://test3.moz.com/", title: "test 3" },
  ];
  await PlacesTestUtils.addVisits(urls);
  // We're manually editing the database to create a duplicate url hash.
  const urlHash = PlacesUtils.history.hashURL(urls[0].url);
  await PlacesUtils.withConnectionWrapper("test", async db => {
    await db.execute(
      `UPDATE moz_places SET url_hash = :urlHash WHERE url = :url`,
      { urlHash, url: urls[1].url }
    );
  });

  let semanticManager = createPlacesSemanticHistoryManager({
    deferredTaskInterval: 100, // lower time to avoid timeouts.
  });
  let conn = await semanticManager.getConnection();
  semanticManager.embedder.setEngine(
    new MockMLEngine(semanticManager.embedder.embeddingSize)
  );
  await TestUtils.topicObserved(
    "places-semantichistorymanager-update-complete"
  );

  // Check the update continued despite the duplicate url hash.
  let rows = await conn.execute(`SELECT url_hash FROM vec_history_mapping`);
  Assert.equal(rows.length, 2, "There should be two entries");
  Assert.equal(
    rows[0].getResultByName("url_hash"),
    PlacesUtils.history.hashURL(urls[0].url),
    "First URL hash should match"
  );
  Assert.equal(
    rows[1].getResultByName("url_hash"),
    PlacesUtils.history.hashURL(urls[2].url),
    "Third URL hash should match"
  );
  await semanticManager.shutdown();
});

add_task(async function test_rowid_relations() {
  await PlacesUtils.history.clear();

  let semanticManager = createPlacesSemanticHistoryManager({
    changeThresholdCount: 1,
    deferredTaskInterval: 100, // lower time to avoid timeouts.
  });
  const embeddingSize = semanticManager.embedder.embeddingSize;
  const entries = Array(6)
    .fill(0)
    .map((r, i) => ({
      url: `https://test${i}.moz.com/`,
      urlHash: PlacesUtils.history.hashURL(`https://test${i}.moz.com/`),
      title: `test ${i}`,
      vector: Array(embeddingSize).fill(i / 10),
    }));

  // Add the first 5 entries to history.
  await PlacesTestUtils.addVisits(entries.slice(0, 5));

  // Ensure we start from an empty database.
  await semanticManager.semanticDB.removeDatabaseFiles();
  let conn = await semanticManager.getConnection();
  semanticManager.embedder.setEngine(new MockMLEngine(embeddingSize, entries));
  await TestUtils.topicObserved(
    "places-semantichistorymanager-update-complete"
  );

  async function checkRowids(count) {
    // Collect the rowids of the entries and verify the relations.
    let rows = await conn.execute(`
      SELECT m.rowid, url_hash, vec_to_json(embedding) vector
      FROM vec_history_mapping m
      JOIN vec_history USING (rowid)
    `);
    Assert.equal(rows.length, count, "Found the expected amount of matches");
    for (let i = 0; i < rows.length; i++) {
      let rowid = rows[i].getResultByName("rowid");
      let urlHash = rows[i].getResultByName("url_hash");
      info("Found rowid: " + rowid + ", urlHash: " + urlHash);
      let vector = JSON.parse(rows[i].getResultByName("vector"));
      let entry = entries.find(e => e.urlHash === urlHash);
      entry.rowid = rowid;
      Assert.deepEqual(entry.vector, vector, "Vector should match");
    }
  }

  info("Check initial rowids after adding entries.");
  await checkRowids(5);

  info("Remove a URL from history and insert a new one.");
  await PlacesUtils.history.remove(entries[2].url);
  await PlacesTestUtils.addVisits(entries[5]);
  await TestUtils.topicObserved(
    "places-semantichistorymanager-update-complete"
  );
  info("Check rowids after removal and insertion.");
  await checkRowids(5);

  info("Remove and reinsert the last entry");
  await PlacesUtils.history.remove(entries[5].url);
  await TestUtils.topicObserved(
    "places-semantichistorymanager-update-complete"
  );
  await PlacesTestUtils.addVisits(entries[5]);
  await TestUtils.topicObserved(
    "places-semantichistorymanager-update-complete"
  );
  info("Check rowids after second removal and insertion.");
  await checkRowids(5);

  await semanticManager.shutdown();
});

add_task(async function test_rowid_conflict() {
  // Test management of a rowid conflict.
  await PlacesUtils.history.clear();

  let semanticManager = createPlacesSemanticHistoryManager({
    changeThresholdCount: 1,
    deferredTaskInterval: 100, // lower time to avoid timeouts.
  });
  const embeddingSize = semanticManager.embedder.embeddingSize;
  let entry = {
    url: `https://test.moz.com/`,
    urlHash: PlacesUtils.history.hashURL(`https://test.moz.com/`),
    title: `test page`, // must be at least 5 characters long
    vector: Array(embeddingSize).fill(0.15),
  };

  // Ensure we start from an empty database.
  await semanticManager.semanticDB.removeDatabaseFiles();
  let conn = await semanticManager.getConnection();
  semanticManager.embedder.setEngine(new MockMLEngine(embeddingSize, [entry]));
  // Let's insert a vector to ensure we will end up reinserting with the same
  // rowid.
  await conn.execute(
    `
    INSERT INTO vec_history (rowid, embedding)
    VALUES (1, :vector)
    `,
    {
      vector: PlacesUtils.tensorToSQLBindable(Array(embeddingSize).fill(0.1)),
    }
  );

  await PlacesTestUtils.addVisits(entry);
  await TestUtils.topicObserved(
    "places-semantichistorymanager-update-complete"
  );

  let rows = await conn.execute(`
    SELECT m.rowid, vec_to_json(embedding) vector
    FROM vec_history_mapping m
    JOIN vec_history USING (rowid)
  `);
  Assert.equal(rows.length, 1, "There should be one entry");
  let rowid = rows[0].getResultByName("rowid");
  Assert.equal(rowid, 1, "Rowid should be the one we inserted");
  let vector = JSON.parse(rows[0].getResultByName("vector"));
  Assert.deepEqual(entry.vector, vector, "Vector should be the new one");

  await semanticManager.shutdown();
});

add_task(async function test_infer_respects_distance_threshold() {
  await PlacesUtils.history.clear();
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", true);

  // Build a query vector and two entries: one pointing in nearly the same
  // direction (cosine distance ~0) and one orthogonal to it (cosine distance
  // ~1).
  const makeVector = (size, components) => {
    let v = Array(size).fill(0);
    for (let [i, val] of Object.entries(components)) {
      v[i] = val;
    }
    return v;
  };

  const searchString = "search query string";
  const embeddingSize =
    createPlacesSemanticHistoryManager().embedder.embeddingSize;
  const queryVector = makeVector(embeddingSize, { 0: 1 });
  const entries = [
    {
      url: "https://near.moz.com/",
      title: "near entry page",
      vector: makeVector(embeddingSize, { 0: 1, 1: 0.05 }),
    },
    {
      url: "https://far.moz.com/",
      title: "far entry page",
      vector: makeVector(embeddingSize, { 1: 1 }),
    },
  ];

  await PlacesTestUtils.addVisits(entries);

  // Run infer() with the given threshold and return the resulting URLs. On the
  // first call the entries are indexed into a fresh semantic database; later
  // calls reuse it. The "search query string" entry is only used to embed the
  // query and is not added to history.
  async function inferUrls(distanceThreshold, { index = false } = {}) {
    let manager = createPlacesSemanticHistoryManager({
      changeThresholdCount: 1,
      deferredTaskInterval: 100, // lower time to avoid timeouts.
      distanceThreshold,
    });
    if (index) {
      await manager.semanticDB.removeDatabaseFiles();
    }
    await manager.getConnection();
    manager.embedder.setEngine(
      new MockMLEngine(embeddingSize, [
        ...entries,
        { title: searchString, vector: queryVector },
      ])
    );
    if (index) {
      await TestUtils.topicObserved(
        "places-semantichistorymanager-update-complete"
      );
    }
    let { results } = await manager.infer({ searchString });
    await manager.shutdown();
    return results;
  }

  let results = await inferUrls(0.5, { index: true });
  let urls = results.map(r => r.url);
  Assert.ok(
    urls.includes("https://near.moz.com/"),
    "Entry within the distance threshold should be returned"
  );
  Assert.ok(
    !urls.includes("https://far.moz.com/"),
    "Entry beyond the distance threshold should be filtered out"
  );
  for (let r of results) {
    Assert.lessOrEqual(
      r.distance,
      0.5,
      "Every returned distance should be within the threshold"
    );
  }

  // With a permissive threshold the far entry should come back, proving the
  // threshold value is actually honored rather than ignored.
  let permissiveUrls = (await inferUrls(1.5)).map(r => r.url);
  Assert.ok(
    permissiveUrls.includes("https://far.moz.com/"),
    "Far entry should be returned when the threshold is permissive"
  );
});

// Adds enough history to require several indexing chunks. The throttle only
// evaluates once it has a full window (CHUNK_LATENCY_MONITORING_WINDOW, 9) of
// recent chunk samples, so with the default chunk size of 25 we need clearly
// more than 9 * 25 = 225 entries for the throttle check to run while work still
// remains.
async function addManyVisits(prefix, count = 275) {
  let entries = Array.from({ length: count }, (_, i) => ({
    url: `https://${prefix}${i}.moz.com/`,
    title: `${prefix} entry ${i}`,
  }));
  await PlacesTestUtils.addVisits(entries);
  return entries;
}

async function countMappings(conn) {
  let [row] = await conn.execute(
    `SELECT COUNT(*) AS c FROM vec_history_mapping`
  );
  return row.getResultByName("c");
}

add_task(async function test_failsafe_blocks_indexing() {
  await PlacesUtils.history.clear();
  let manager = createPlacesSemanticHistoryManager({
    rowLimit: 1000,
    changeThresholdCount: 1,
    deferredTaskInterval: 100,
  });
  await manager.semanticDB.removeDatabaseFiles();

  Services.prefs.setBoolPref("places.semanticHistory.featureGate", true);
  // Any non-zero chunk duration trips the failsafe.
  Services.prefs.setIntPref("places.semanticHistory.maxChunkTimeMsFailsafe", 0);
  Services.fog.testResetFOG();

  let entries = await addManyVisits("failsafe");

  let semanticManager = createPlacesSemanticHistoryManager({
    rowLimit: 1000,
    changeThresholdCount: 1,
    deferredTaskInterval: 100,
  });
  let conn = await semanticManager.getConnection();
  semanticManager.embedder.setEngine(
    new MockMLEngine(semanticManager.embedder.embeddingSize)
  );

  await TestUtils.waitForCondition(
    () => Glean.places.semanticHistoryIndexingStopped.failsafe.testGetValue(),
    "Indexing should stop because of the failsafe threshold"
  );

  Assert.equal(
    Glean.places.semanticHistoryIndexingStopped.failsafe.testGetValue(),
    1,
    "Failsafe stop should be recorded once"
  );

  let indexed = await countMappings(conn);
  Assert.greater(indexed, 0, "Some entries should have been indexed");
  Assert.less(
    indexed,
    entries.length,
    "Indexing should have stopped before completing"
  );

  // The failsafe is a hard block for the session: even relaxing the thresholds
  // and triggering the usual Places observer events must not resume indexing.
  Services.prefs.setIntPref(
    "places.semanticHistory.maxChunkTimeMsFailsafe",
    600000
  );
  let runsBefore = semanticManager.getUpdateTaskLatency().length;
  await PlacesTestUtils.addVisits([
    { url: "https://failsafe-blocked.moz.com/", title: "failsafe blocked" },
  ]);
  await semanticManager.onPagesRankChanged();
  // Give the deferred task several intervals to (not) run.
  await new Promise(resolve => do_timeout(600, resolve));

  Assert.equal(
    semanticManager.getUpdateTaskLatency().length,
    runsBefore,
    "Update task should not run again after the failsafe block"
  );
  Assert.equal(
    await countMappings(conn),
    indexed,
    "No further entries should be indexed while blocked"
  );

  Services.prefs.clearUserPref("places.semanticHistory.maxChunkTimeMsFailsafe");
  await semanticManager.shutdown();
});

add_task(async function test_soft_threshold_gated_by_min_entries() {
  // Median chunk time always exceeds the soft threshold; the failsafe stays out
  // of the way so only the soft logic can stop indexing.
  Services.prefs.setBoolPref("places.semanticHistory.featureGate", true);
  Services.prefs.setIntPref("places.semanticHistory.maxChunkTimeMs", 0);
  Services.prefs.setIntPref(
    "places.semanticHistory.maxChunkTimeMsFailsafe",
    600000
  );

  // Below the minimum: indexing keeps going until it completes.
  await PlacesUtils.history.clear();
  Services.prefs.setIntPref(
    "places.semanticHistory.minEntriesBeforeThrottle",
    100000
  );
  Services.fog.testResetFOG();
  let entries = await addManyVisits("softlow");

  let manager = createPlacesSemanticHistoryManager({
    rowLimit: 1000,
    changeThresholdCount: 1,
    deferredTaskInterval: 100,
  });
  manager.embedder.setEngine(new MockMLEngine(manager.embedder.embeddingSize));
  await manager.semanticDB.removeDatabaseFiles();
  let conn = await manager.getConnection();

  await TestUtils.topicObserved(
    "places-semantichistorymanager-update-complete"
  );
  Assert.strictEqual(
    Glean.places.semanticHistoryIndexingStopped.soft.testGetValue(),
    null,
    "Soft threshold should not stop indexing below the minimum"
  );
  Assert.greaterOrEqual(
    await countMappings(conn),
    entries.length,
    "All entries should be indexed when below the minimum"
  );
  await manager.shutdown();

  // Above the minimum: indexing stops once enough embeddings exist.
  await PlacesUtils.history.clear();
  Services.prefs.setIntPref(
    "places.semanticHistory.minEntriesBeforeThrottle",
    10
  );
  Services.fog.testResetFOG();
  entries = await addManyVisits("softhigh");

  manager = createPlacesSemanticHistoryManager({
    rowLimit: 1000,
    changeThresholdCount: 1,
    deferredTaskInterval: 100,
  });
  manager.embedder.setEngine(new MockMLEngine(manager.embedder.embeddingSize));
  await manager.semanticDB.removeDatabaseFiles();
  conn = await manager.getConnection();

  await TestUtils.waitForCondition(
    () => Glean.places.semanticHistoryIndexingStopped.soft.testGetValue(),
    "Indexing should stop because of the soft threshold"
  );
  Assert.equal(
    Glean.places.semanticHistoryIndexingStopped.soft.testGetValue(),
    1,
    "Soft stop should be recorded once"
  );
  Assert.less(
    await countMappings(conn),
    entries.length,
    "Indexing should have stopped before completing"
  );
  await manager.shutdown();

  Services.prefs.clearUserPref("places.semanticHistory.maxChunkTimeMs");
  Services.prefs.clearUserPref("places.semanticHistory.maxChunkTimeMsFailsafe");
  Services.prefs.clearUserPref(
    "places.semanticHistory.minEntriesBeforeThrottle"
  );
});
