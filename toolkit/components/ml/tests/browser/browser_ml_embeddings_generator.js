/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Test for EmbeddingsGenerator.sys.mjs
 */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
  EMBEDDING_TYPE: "chrome://global/content/ml/EmbeddingsGenerator.sys.mjs",
  EmbeddingsGenerator: "chrome://global/content/ml/EmbeddingsGenerator.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

const EMBEDDING_SIZE = 256;

async function setup() {
  const { removeMocks, remoteClients } = await createAndMockMLRemoteSettings({
    autoDownloadFromRemoteSettings: false,
  });

  await SpecialPowers.pushPrefEnv({
    set: [
      // Enabled by default.
      ["browser.ml.enable", true],
      ["browser.ml.logLevel", "All"],
      ["browser.ml.modelCacheTimeout", 1000],
    ],
  });

  return {
    remoteClients,
    async cleanup() {
      await removeMocks();
      await waitForCondition(
        () => EngineProcess.areAllEnginesTerminated(),
        "Waiting for all of the engines to be terminated.",
        100,
        200
      );
    },
  };
}

add_task(async function test_EmbeddingsGenerator_for_minimum_physical_memory() {
  let embeddingsGenerator = EmbeddingsGenerator.forGeneral();
  Assert.ok(
    embeddingsGenerator.isEnoughPhysicalMemoryAvailable(),
    "Physical Memory size < 7GiB."
  );
});

add_task(async function test_EmbeddingsGenerator_for_minimum_cpu_cores() {
  let embeddingsGenerator = EmbeddingsGenerator.forGeneral();
  Assert.ok(
    embeddingsGenerator.isEnoughCpuCoresAvailable(),
    "Number CPU cores < 2."
  );
});

class MockMLEngineForEmbedMany {
  constructor(is_static_embedding = false) {
    this.is_static_embedding = is_static_embedding;
  }

  async run(request) {
    // Contextual embedding engine has an additional array wrapping
    let texts = this.is_static_embedding ? request.args : request.args[0];
    return texts.map(text => {
      if (typeof text !== "string" || text.trim() === "") {
        throw new Error("Invalid input: text must be a non-empty string");
      }
      // Return a mock embedding vector (e.g., an array of zeros)
      return Array(EMBEDDING_SIZE).fill(0);
    });
  }
}

add_task(async function test_embedMany_valid_inputs() {
  const embeddingsGenerator = EmbeddingsGenerator.forPlaces();
  sinon.stub(embeddingsGenerator, "createEngineIfNotPresent").callsFake(() => {
    return new MockMLEngineForEmbedMany(true);
  });
  embeddingsGenerator.setEngine(new MockMLEngineForEmbedMany(true));

  const texts = ["mdn documentation", "jira board"];
  const result = await embeddingsGenerator.embedMany(texts);

  Assert.ok(Array.isArray(result), "Result should be an array");
  Assert.equal(result.length, 2, "Should return 2 embeddings");
  for (const vector of result) {
    Assert.equal(vector.length, EMBEDDING_SIZE, "Check embeddings dimension");
  }

  sinon.restore();
});

add_task(async function test_embedMany_empty_array_input() {
  const embeddingsGenerator = EmbeddingsGenerator.forGeneral();
  sinon.stub(embeddingsGenerator, "createEngineIfNotPresent").callsFake(() => {
    return new MockMLEngineForEmbedMany();
  });
  embeddingsGenerator.setEngine(new MockMLEngineForEmbedMany());

  let threw = false;
  try {
    await embeddingsGenerator.embedMany([]);
  } catch (e) {
    threw = true;
    Assert.ok(
      e.message.includes("empty array"),
      "Should throw for empty array input"
    );
  }
  Assert.ok(threw, "Error should be thrown for empty array input");

  sinon.restore();
});

add_task(async function test_embedMany_invalid_input_null() {
  const embeddingsGenerator = EmbeddingsGenerator.forGeneral();
  sinon.stub(embeddingsGenerator, "createEngineIfNotPresent").callsFake(() => {
    return new MockMLEngineForEmbedMany();
  });
  embeddingsGenerator.setEngine(new MockMLEngineForEmbedMany());

  let caught = false;
  try {
    await embeddingsGenerator.embedMany([null, "hello"]);
  } catch (e) {
    caught = true;
    Assert.ok(e.message.includes("Invalid input"), "Should throw for null");
  }
  Assert.ok(caught, "Error should be thrown");

  sinon.restore();
});

add_task(async function test_embedMany_invalid_input_nonstring() {
  const embeddingsGenerator = EmbeddingsGenerator.forGeneral();
  sinon.stub(embeddingsGenerator, "createEngineIfNotPresent").callsFake(() => {
    return new MockMLEngineForEmbedMany();
  });
  embeddingsGenerator.setEngine(new MockMLEngineForEmbedMany());

  let caught = false;
  try {
    await embeddingsGenerator.embedMany(["hello", 123]);
  } catch (e) {
    caught = true;
    Assert.ok(
      e.message.includes("Invalid input"),
      "Should throw for non-string"
    );
  }
  Assert.ok(caught, "Error should be thrown");

  sinon.restore();
});

class MockMLEngineForEmbed {
  async run(request) {
    const texts = [request.args[0]];
    return texts.map(text => {
      if (typeof text !== "string" || text.trim() === "") {
        throw new Error("Invalid input: text must be a non-empty string");
      }
      // Return a mock embedding vector (e.g., an array of zeros)
      return Array(EMBEDDING_SIZE).fill(0);
    });
  }
}

add_task(async function test_embed_valid_input() {
  const embeddingsGenerator = EmbeddingsGenerator.forGeneral();
  sinon.stub(embeddingsGenerator, "createEngineIfNotPresent").callsFake(() => {
    return new MockMLEngineForEmbed();
  });
  embeddingsGenerator.setEngine(new MockMLEngineForEmbed());

  const result = await embeddingsGenerator.embed("test string");

  Assert.ok(Array.isArray(result), "Embedding result should be an array");
  Assert.equal(result[0].length, EMBEDDING_SIZE, "Check embedding dimension");

  sinon.restore();
});

add_task(async function test_embed_invalid_input_empty_string() {
  const embeddingsGenerator = EmbeddingsGenerator.forGeneral();
  sinon.stub(embeddingsGenerator, "createEngineIfNotPresent").callsFake(() => {
    return new MockMLEngineForEmbed();
  });
  embeddingsGenerator.setEngine(new MockMLEngineForEmbed());

  let threw = false;
  try {
    await embeddingsGenerator.embed("");
  } catch (e) {
    threw = true;
    Assert.ok(
      e.message.includes("Invalid input"),
      "Should throw for empty string"
    );
  }
  Assert.ok(threw, "Error should be thrown for empty string");

  sinon.restore();
});

add_task(async function test_onnx() {
  const embeddingsGenerator = EmbeddingsGenerator.forTest({
    type: EMBEDDING_TYPE.CONTEXTUAL,
  });

  Assert.equal(
    embeddingsGenerator.options.backend,
    "onnx-native",
    "Check other backend"
  );
  Assert.equal(
    embeddingsGenerator.embeddingSize,
    384,
    "Default contextual dim comes from the engine's preferredDimension"
  );
});

add_task(async function test_forPlaces_prefDrivesContextual() {
  // forPlaces() reads `places.semanticHistory.embeddingType`. Setting it to
  // "contextual" picks the onnx-native engine only on Mac/Windows; on other
  // platforms (e.g. Linux) it falls back to static-embeddings. The default
  // ("static") always picks static-embeddings.
  const isMacOrWindows =
    AppConstants.platform === "macosx" || AppConstants.platform === "win";

  await SpecialPowers.pushPrefEnv({
    set: [["places.semanticHistory.embeddingType", "contextual"]],
  });
  try {
    const contextual = EmbeddingsGenerator.forPlaces();
    if (isMacOrWindows) {
      Assert.equal(
        contextual.options.backend,
        "onnx-native",
        "forPlaces + 'contextual' pref resolves to onnx-native on Mac/Windows"
      );
      Assert.equal(
        contextual.embeddingSize,
        384,
        "Contextual dim defaults to 384 when no override pref is set"
      );
    } else {
      Assert.equal(
        contextual.options.backend,
        "static-embeddings",
        "forPlaces + 'contextual' falls back to static on non-Mac/Windows"
      );
    }
  } finally {
    await SpecialPowers.popPrefEnv();
  }

  // With the pref cleared (back to the default "static"), forPlaces should
  // fall back to the static engine.
  const staticGen = EmbeddingsGenerator.forPlaces();
  Assert.equal(
    staticGen.options.backend,
    "static-embeddings",
    "forPlaces + default pref resolves to static-embeddings"
  );
});

add_task(async function test_forGeneral_returnsContextualEmbeddings() {
  const eg = EmbeddingsGenerator.forGeneral();
  Assert.ok(
    ["onnx-native", "onnx-wasm"].includes(eg.options.backend),
    `backend should be one of onnx-native or onnx-wasm, got ${eg.options.backend}`
  );
  Assert.equal(
    eg.options.embeddingDimension,
    384,
    "forGeneral uses the contextual (384)"
  );
});

add_task(async function test_forPlaces_defaultIsStatic() {
  await SpecialPowers.pushPrefEnv({
    set: [["places.semanticHistory.embeddingType", "static"]],
  });
  try {
    const eg = EmbeddingsGenerator.forPlaces();
    Assert.equal(
      eg.options.backend,
      "static-embeddings",
      "forPlaces with embeddingType=static resolves to the static engine"
    );
    Assert.equal(
      eg.options.embeddingDimension,
      512,
      "forPlaces static path uses the engine's preferredDimension (512)"
    );
  } finally {
    await SpecialPowers.popPrefEnv();
  }
});

add_task(
  async function test_ensureEngine_all_concurrent_callers_reject_on_failure() {
    const embeddingsGenerator = EmbeddingsGenerator.forGeneral();

    sinon
      .stub(embeddingsGenerator, "createEngineIfNotPresent")
      .callsFake(async () => {
        throw new Error("Engine init failed");
      });

    const p1 = embeddingsGenerator.ensureEngine();
    const p2 = embeddingsGenerator.ensureEngine();
    const p3 = embeddingsGenerator.ensureEngine();

    const [r1, r2, r3] = await Promise.allSettled([p1, p2, p3]);

    for (const result of [r1, r2, r3]) {
      Assert.equal(
        result.status,
        "rejected",
        "All callers should reject on failure"
      );
      Assert.ok(
        result.reason.message.includes("Engine init failed"),
        "All callers should receive the original error"
      );
    }

    sinon.restore();
  }
);

add_task(async function test_ensureEngine_allows_retry_after_failure() {
  const embeddingsGenerator = EmbeddingsGenerator.forGeneral();

  let callCount = 0;
  sinon
    .stub(embeddingsGenerator, "createEngineIfNotPresent")
    .callsFake(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Engine init failed");
      }
    });

  let threw = false;
  try {
    await embeddingsGenerator.ensureEngine();
  } catch (e) {
    threw = true;
  }
  Assert.ok(threw, "First call should reject on failure");
  Assert.equal(callCount, 1, "createEngineIfNotPresent was called once");

  await embeddingsGenerator.ensureEngine();
  Assert.equal(
    callCount,
    2,
    "createEngineIfNotPresent should be retried after failure"
  );

  sinon.restore();
});
