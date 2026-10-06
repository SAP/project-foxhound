/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Exercises the three spec scenarios for switching the active embedding model.
 * The reconciliation logic is split across PlacesSemanticHistoryManager and
 * PlacesSemanticHistoryDatabase; these tests drive the DB-level building
 * blocks (getActiveModelConfig + replaceEmbeddingTables) directly, mirroring
 * the comparison that the manager performs on startup.
 */

const { PlacesSemanticHistoryDatabase } = ChromeUtils.importESModule(
  "resource://gre/modules/PlacesSemanticHistoryDatabase.sys.mjs"
);

const FILE = "places_semantic.sqlite";

// Mirrors the resolved-options shape produced by EmbeddingsGenerator. The DB
// layer compares the three fields modelConfigMatches uses.
const STATIC_CONFIG = dim => ({
  featureId: "simple-text-embedder",
  modelId: "mozilla/static-embeddings",
  embeddingDimension: dim,
});
const ONNX_CONFIG = dim => ({
  featureId: "simple-text-embedder",
  modelId: null,
  embeddingDimension: dim,
});

function eq(x, y) {
  return (x ?? null) === (y ?? null);
}

function modelConfigMatches(a, b) {
  return (
    eq(a.featureId, b.featureId) &&
    eq(a.modelId, b.modelId) &&
    eq(a.embeddingDimension, b.embeddingDimension)
  );
}

async function withDb(initialModelConfig, callback) {
  const db = new PlacesSemanticHistoryDatabase({
    embeddingSize: initialModelConfig.embeddingDimension,
    fileName: FILE,
  });
  try {
    let conn = await db.getConnection();
    // Clean install inserts a default static row; align it with the
    // desired starting config for the test.
    await db.replaceEmbeddingTables(initialModelConfig, conn);
    await callback(db);
  } finally {
    await db.closeConnection();
    await db.removeDatabaseFiles();
  }
}

async function insertOneTensor(db, dim) {
  const conn = await db.getConnection();
  await conn.execute(
    `INSERT INTO vec_history (rowid, embedding)
     VALUES (1, :vector)`,
    { vector: PlacesUtils.tensorToSQLBindable(Array(dim).fill(0.5)) }
  );
}

async function countTensors(db) {
  const conn = await db.getConnection();
  const rows = await conn.execute(`SELECT count(*) FROM vec_history`);
  return rows[0].getResultByIndex(0);
}

add_task(async function test_staticToTransformerDropsAndRebuilds() {
  const initial = STATIC_CONFIG(128);
  const desired = ONNX_CONFIG(384);

  await withDb(initial, async db => {
    await insertOneTensor(db, 128);
    Assert.equal(await countTensors(db), 1, "Inserted starting tensor");
    let conn = await db.getConnection();

    const onDisk = await db.getActiveModelConfig(conn);
    Assert.ok(
      !modelConfigMatches(onDisk, desired),
      "Initial config should not match desired"
    );

    await db.replaceEmbeddingTables(desired, conn);

    const after = await db.getActiveModelConfig(conn);
    Assert.equal(after.modelId, null);
    Assert.equal(after.embeddingDimension, 384);
    Assert.equal(
      await countTensors(db),
      0,
      "Embeddings should have been dropped"
    );
    await db.closeConnection();
  });
});

add_task(async function test_transformerToStaticDropsAndRebuilds() {
  const initial = ONNX_CONFIG(384);
  const desired = STATIC_CONFIG(256);

  await withDb(initial, async db => {
    await insertOneTensor(db, 384);
    let conn = await db.getConnection();

    const onDisk = await db.getActiveModelConfig(conn);
    Assert.ok(
      !modelConfigMatches(onDisk, desired),
      "Initial config should not match desired"
    );

    await db.replaceEmbeddingTables(desired, conn);

    const after = await db.getActiveModelConfig(conn);
    Assert.equal(after.modelId, "mozilla/static-embeddings");
    Assert.equal(after.embeddingDimension, 256);
    Assert.equal(
      await countTensors(db),
      0,
      "Embeddings should have been dropped"
    );
    await db.closeConnection();
  });
});

add_task(async function test_matchingConfigIsNoOp() {
  const config = ONNX_CONFIG(384);

  await withDb(config, async db => {
    await insertOneTensor(db, 384);
    Assert.equal(await countTensors(db), 1);

    let conn = await db.getConnection();

    const onDisk = await db.getActiveModelConfig(conn);
    Assert.ok(
      modelConfigMatches(onDisk, config),
      "On-disk config matches desired"
    );
    // Manager would skip replaceEmbeddingTables here; embeddings stay.
    Assert.equal(await countTensors(db), 1, "Tensor should still be present");
    await db.closeConnection();
  });
});
