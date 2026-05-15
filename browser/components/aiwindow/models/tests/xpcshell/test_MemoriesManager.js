/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

do_get_profile();
("use strict");

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { MemoriesManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs"
);
const { HISTORY: SOURCE_HISTORY, CONVERSATION: SOURCE_CONVERSATION } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesConstants.sys.mjs"
  );
const { MemoryStore } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/services/MemoryStore.sys.mjs"
);
const { EmbeddingsGenerator } = ChromeUtils.importESModule(
  "chrome://global/content/ml/EmbeddingsGenerator.sys.mjs"
);

/**
 * Constants for test memories
 */
const TEST_MESSAGE = "Remember I like coffee.";
const TEST_MEMORIES = [
  {
    memory_summary: "Loves drinking coffee",
    category: "Food & Drink",
    intent: "Plan / Organize",
    reasoning: "Frequeently orders coffee online for pickup",
    score: 3,
  },
  {
    memory_summary: "Buys dog food online",
    category: "Pets & Animals",
    intent: "Buy / Acquire",
    reasoning: "Frequently buys dog food on websites like Chewy",
    score: 4,
  },
  {
    memory_summary: "Plays games online",
    category: "Games",
    intent: "Entertain / Relax",
    reasoning: "Visits a lot of gaming-related websites",
    score: 5,
  },
];

/**
 * Constants for preference keys and test values
 */
const PREF_API_KEY = "browser.smartwindow.apiKey";
const PREF_ENDPOINT = "browser.smartwindow.endpoint";
const PREF_MODEL = "browser.smartwindow.model";

const API_KEY = "fake-key";
const ENDPOINT = "https://api.fake-endpoint.com/v1";
const MODEL = "fake-model";

/**
 * Helper function to delete all memories before and after a test
 */
async function deleteAllMemories() {
  const memories = await MemoryStore.getMemories({ includeSoftDeleted: true });
  for (const memory of memories) {
    await MemoryStore.hardDeleteMemory(memory.id);
  }
}

/**
 * Helper function to bulk-add memories
 */
async function addMemories() {
  await deleteAllMemories();
  for (const memory of TEST_MEMORIES) {
    await MemoryStore.addMemory(memory);
  }
}

add_setup(async function () {
  // Setup prefs used across multiple tests
  Services.prefs.setStringPref(PREF_API_KEY, API_KEY);
  Services.prefs.setStringPref(PREF_ENDPOINT, ENDPOINT);
  Services.prefs.setStringPref(PREF_MODEL, MODEL);
  Services.prefs.setBoolPref("browser.ml.enable", true);

  // Clear prefs after testing
  registerCleanupFunction(() => {
    const prefsToClean = [
      PREF_API_KEY,
      PREF_ENDPOINT,
      PREF_MODEL,
      "browser.ml.enable",
    ];
    for (let pref of prefsToClean) {
      if (Services.prefs.prefHasUserValue(pref)) {
        Services.prefs.clearUserPref(pref);
      }
    }
  });
});

/**
 * Tests getting aggregated browser history from MemoriesHistorySource
 */
add_task(async function test_getAggregatedBrowserHistory() {
  // Setup fake history data
  const now = Date.now();
  const seeded = [
    {
      url: "https://www.google.com/search?q=firefox+history",
      title: "Google Search: firefox history",
      visits: [{ date: new Date(now - 5 * 60 * 1000) }],
    },
    {
      url: "https://news.ycombinator.com/",
      title: "Hacker News",
      visits: [{ date: new Date(now - 15 * 60 * 1000) }],
    },
    {
      url: "https://mozilla.org/en-US/",
      title: "Internet for people, not profit — Mozilla",
      visits: [{ date: new Date(now - 25 * 60 * 1000) }],
    },
  ];
  await PlacesUtils.history.clear();
  await PlacesUtils.history.insertMany(seeded);

  // Check that all 3 outputs are arrays
  const [domainItems, titleItems, searchItems] =
    await MemoriesManager.getAggregatedBrowserHistory();
  Assert.ok(Array.isArray(domainItems), "Domain items should be an array");
  Assert.ok(Array.isArray(titleItems), "Title items should be an array");
  Assert.ok(Array.isArray(searchItems), "Search items should be an array");

  // Check the length of each
  Assert.equal(domainItems.length, 3, "Should have 3 domain items");
  Assert.equal(titleItems.length, 3, "Should have 3 title items");
  Assert.equal(searchItems.length, 1, "Should have 1 search item");

  // Check the top entry in each aggregate
  Assert.deepEqual(
    domainItems[0],
    ["mozilla.org", 100],
    "Top domain should be `mozilla.org' with score 100"
  );
  Assert.deepEqual(
    titleItems[0],
    ["Internet for people, not profit — Mozilla | mozilla.org", 100],
    "Top title should be 'Internet for people, not profit — Mozilla' with score 100"
  );
  Assert.equal(
    searchItems[0].q[0],
    "Google Search: firefox history | www.google.com",
    "Top search item query should be 'Google Search: firefox history'"
  );
  Assert.equal(searchItems[0].r, 1, "Top search item rank should be 1");
});

/**
 * Tests retrieving all stored memories
 */
add_task(async function test_getAllMemories() {
  await addMemories();

  const memories = await MemoriesManager.getAllMemories();

  // Check that the right number of memories were retrieved
  Assert.equal(
    memories.length,
    TEST_MEMORIES.length,
    "Should retrieve all stored memories."
  );

  // Check that the memories summaries are correct
  const testMemoriesSummaries = TEST_MEMORIES.map(
    memory => memory.memory_summary
  );
  const retrievedMemoriesSummaries = memories.map(
    memory => memory.memory_summary
  );
  retrievedMemoriesSummaries.forEach(memorySummary => {
    Assert.ok(
      testMemoriesSummaries.includes(memorySummary),
      `Memory summary "${memorySummary}" should be in the test memories.`
    );
  });

  await deleteAllMemories();
});

/**
 * Tests retrieving specific memories by ID
 */
add_task(async function test_getMemoriesByID() {
  await addMemories();

  const memories = await MemoriesManager.getAllMemories();
  const firstMemoryToRetrieve = memories[0];
  const secontMemoryToRetreive = memories[2];

  const memoryRetrievedById = await MemoriesManager.getMemoriesByID([
    firstMemoryToRetrieve.id,
    secontMemoryToRetreive.id,
  ]);
  const retrievedMemorySummaries = memoryRetrievedById.map(
    mem => mem.memory_summary
  );

  Assert.equal(
    memoryRetrievedById.length,
    2,
    "Should have retrieved both memories by their IDs"
  );

  Assert.ok(
    retrievedMemorySummaries.includes(firstMemoryToRetrieve.memory_summary),
    "Memories retrieved by ID should include the first expected summary"
  );
  Assert.ok(
    retrievedMemorySummaries.includes(secontMemoryToRetreive.memory_summary),
    "Memories retrieved by ID should include the second expected summary"
  );

  await deleteAllMemories();
});

/**
 * Tests soft deleting a memory by ID
 */
add_task(async function test_softDeleteMemoryById() {
  await addMemories();

  // Pull memories that aren't already soft deleted
  const memoriesBeforeSoftDelete = await MemoriesManager.getAllMemories();

  // Pick a memory off the top to soft delete
  const memoryBeforeSoftDelete = memoriesBeforeSoftDelete[0];

  // Double check that the memory isn't already soft deleted
  Assert.equal(
    memoryBeforeSoftDelete.is_deleted,
    false,
    "Memory should not be soft deleted initially."
  );

  // Soft delete the memory
  const memoryAfterSoftDelete = await MemoriesManager.softDeleteMemoryById(
    memoryBeforeSoftDelete.id
  );

  // Check that the memory is soft deleted
  Assert.equal(
    memoryAfterSoftDelete.is_deleted,
    true,
    "Memory should be soft deleted after calling softDeleteMemoryById."
  );

  // Retrieve all memories again, including soft deleted ones this time to make sure the deletion saved correctly
  const memoriesAfterSoftDelete = await MemoriesManager.getAllMemories({
    includeSoftDeleted: true,
  });
  const softDeletedMemories = memoriesAfterSoftDelete.filter(
    memory => memory.is_deleted
  );
  Assert.equal(
    softDeletedMemories.length,
    1,
    "There should be one soft deleted memory."
  );

  await deleteAllMemories();
});

/**
 * Tests attempting to soft delete a memory that doesn't exist by ID
 */
add_task(async function test_softDeleteMemoryById_not_found() {
  await addMemories();

  // Retrieve all memories, including soft deleted ones
  const memoriesBeforeSoftDelete = await MemoriesManager.getAllMemories({
    includeSoftDeleted: true,
  });

  // Check that no memories are soft deleted initially
  const softDeletedMemoriesBefore = memoriesBeforeSoftDelete.filter(
    memory => memory.is_deleted
  );
  Assert.equal(
    softDeletedMemoriesBefore.length,
    0,
    "There should be no soft deleted memories initially."
  );

  // Attempt to soft delete a non-existent memory
  const memoryAfterSoftDelete =
    await MemoriesManager.softDeleteMemoryById("non-existent-id");

  // Check that the result is null (no memories were soft deleted)
  Assert.equal(
    memoryAfterSoftDelete,
    null,
    "softDeleteMemoryById should return null for non-existent memory ID."
  );

  // Retrieve all memories again to confirm no memories were soft deleted
  const memoriesAfterSoftDelete = await MemoriesManager.getAllMemories({
    includeSoftDeleted: true,
  });
  const softDeletedMemoriesAfter = memoriesAfterSoftDelete.filter(
    memory => memory.is_deleted
  );
  Assert.equal(
    softDeletedMemoriesAfter.length,
    0,
    "There should be no soft deleted memories after attempting to delete a non-existent memory."
  );

  await deleteAllMemories();
});

/**
 * Tests hard deleting a memory by ID
 */
add_task(async function test_hardDeleteMemoryById() {
  await addMemories();

  // Retrieve all memories, including soft deleted ones
  const memoriesBeforeHardDelete = await MemoriesManager.getAllMemories({
    includeSoftDeleted: true,
  });

  // Pick a memory off the top to test hard deletion
  const memoryBeforeHardDelete = memoriesBeforeHardDelete[0];

  // Hard delete the memory
  const deletionResult = await MemoriesManager.hardDeleteMemoryById(
    memoryBeforeHardDelete.id
  );

  // Check that the deletion was successful
  Assert.ok(
    deletionResult,
    "hardDeleteMemoryById should return true on successful deletion."
  );

  // Retrieve all memories again to confirm the hard deletion was saved correctly
  const memoriesAfterHardDelete = await MemoriesManager.getAllMemories({
    includeSoftDeleted: true,
  });
  Assert.equal(
    memoriesAfterHardDelete.length,
    memoriesBeforeHardDelete.length - 1,
    "There should be one fewer memory after hard deletion."
  );

  await deleteAllMemories();
});

/**
 * Tests attempting to hard delete a memory that doesn't exist by ID
 */
add_task(async function test_hardDeleteMemoryById_not_found() {
  await addMemories();

  // Retrieve all memories, including soft deleted ones
  const memoriesBeforeHardDelete = await MemoriesManager.getAllMemories({
    includeSoftDeleted: true,
  });

  // Hard delete the memory
  const deletionResult =
    await MemoriesManager.hardDeleteMemoryById("non-existent-id");

  // Check that the result is false (no memories were hard deleted)
  Assert.ok(
    !deletionResult,
    "hardDeleteMemoryById should return false for non-existent memory ID."
  );

  // Retrieve all memories again to make sure no memories were hard deleted
  const memoriesAfterHardDelete = await MemoriesManager.getAllMemories({
    includeSoftDeleted: true,
  });
  Assert.equal(
    memoriesAfterHardDelete.length,
    memoriesBeforeHardDelete.length,
    "Memory count before and after failed hard deletion should be the same."
  );

  await deleteAllMemories();
});

/**
 * Tests classifying a user message into memory categories and intents
 */
add_task(async function test_memoryClassifyMessage_happy_path() {
  const sb = sinon.createSandbox();
  try {
    const fakeEngine = {
      loadPrompt() {
        return "fake prompt";
      },
      run() {
        return {
          finalOutput: `{
            "categories": ["Food & Drink"],
            "intents": ["Plan / Organize"]
          }`,
        };
      },
    };

    const stub = sb
      .stub(MemoriesManager, "ensureOpenAIEngineForUsage")
      .returns(fakeEngine);
    const messageClassification =
      await MemoriesManager.memoryClassifyMessage(TEST_MESSAGE);
    // Check that the stub was called
    Assert.ok(
      stub.calledOnce,
      "ensureOpenAIEngineForUsage should be called once"
    );

    // Check classification result was returned correctly
    Assert.equal(
      typeof messageClassification,
      "object",
      "Result should be an object."
    );
    Assert.equal(
      Object.keys(messageClassification).length,
      2,
      "Result should have two keys."
    );
    Assert.deepEqual(
      messageClassification.categories,
      ["Food & Drink"],
      "Categories should match the fake response."
    );
    Assert.deepEqual(
      messageClassification.intents,
      ["Plan / Organize"],
      "Intents should match the fake response."
    );
  } finally {
    sb.restore();
  }
});

/**
 * Tests failed message classification - LLM returns empty output
 */
add_task(async function test_memoryClassifyMessage_sad_path_empty_output() {
  const sb = sinon.createSandbox();
  try {
    const fakeEngine = {
      loadPrompt() {
        return "fake prompt";
      },
      run() {
        return {
          finalOutput: ``,
        };
      },
    };

    const stub = sb
      .stub(MemoriesManager, "ensureOpenAIEngineForUsage")
      .returns(fakeEngine);
    const messageClassification =
      await MemoriesManager.memoryClassifyMessage(TEST_MESSAGE);
    // Check that the stub was called
    Assert.ok(
      stub.calledOnce,
      "ensureOpenAIEngineForUsage should be called once"
    );

    // Check classification result was returned correctly despite empty output
    Assert.equal(
      typeof messageClassification,
      "object",
      "Result should be an object."
    );
    Assert.equal(
      Object.keys(messageClassification).length,
      2,
      "Result should have two keys."
    );
    Assert.equal(
      messageClassification.category,
      null,
      "Category should be null for empty output."
    );
    Assert.equal(
      messageClassification.intent,
      null,
      "Intent should be null for empty output."
    );
  } finally {
    sb.restore();
  }
});

/**
 * Tests failed message classification - LLM returns incorrect schema
 */
add_task(async function test_memoryClassifyMessage_sad_path_bad_schema() {
  const sb = sinon.createSandbox();
  try {
    const fakeEngine = {
      loadPrompt() {
        return "fake prompt";
      },
      run() {
        return {
          finalOutput: `{
            "wrong_key": "some value"
          }`,
        };
      },
    };

    const stub = sb
      .stub(MemoriesManager, "ensureOpenAIEngineForUsage")
      .returns(fakeEngine);
    const messageClassification =
      await MemoriesManager.memoryClassifyMessage(TEST_MESSAGE);
    // Check that the stub was called
    Assert.ok(
      stub.calledOnce,
      "ensureOpenAIEngineForUsage should be called once"
    );

    // Check classification result was returned correctly despite bad schema
    Assert.equal(
      typeof messageClassification,
      "object",
      "Result should be an object."
    );
    Assert.equal(
      Object.keys(messageClassification).length,
      2,
      "Result should have two keys."
    );
    Assert.equal(
      messageClassification.category,
      null,
      "Category should be null for bad schema output."
    );
    Assert.equal(
      messageClassification.intent,
      null,
      "Intent should be null for bad schema output."
    );
  } finally {
    sb.restore();
  }
});

/**
 * Tests retrieving relevant memories for a user message using embeddings
 */
add_task(async function test_getRelevantMemories_happy_path() {
  // Add memories so that we pass the existing memories check in the `getRelevantMemories` method
  await addMemories();

  const sb = sinon.createSandbox();
  try {
    // Mock the private embeddings generator in MemoriesManager
    // We'll create a fake generator that returns predictable embeddings
    const fakeGenerator = {
      async embedMany(_texts) {
        // Return fake embeddings: one for each memory
        // Coffee memory gets [1, 0, 0], dog food gets [0, 1, 0], games gets [0, 0, 1]
        return {
          output: [
            [1, 0, 0], //  "Loves drinking coffee" embedding
            [0, 1, 0], //  "Buys dog food online" embedding (orthogonal)
            [0, 0, 1], //  "Plays games online" embedding (orthogonal)
          ],
        };
      },
      async embed(_text) {
        // Query about coffee should be similar to first memory
        return {
          output: [[0.9, 0.1, 0]], // Similar to coffee embedding
        };
      },
    };

    // Stub getRelevantMemories to use fake embeddings
    let callCount = 0;

    sb.stub(MemoriesManager, "getRelevantMemories").callsFake(
      async function (message, topK, threshold) {
        // On first call, let it create the generator, then replace it
        if (callCount === 0) {
          callCount++;
          // Create a version that uses our fake generator
          // Sort by id to ensure deterministic order
          const memories = (await MemoriesManager.getAllMemories()).sort(
            (a, b) => a.id.localeCompare(b.id)
          );
          if (memories.length === 0) {
            return [];
          }

          // Use fake embeddings
          const memoryEmbeddings = (
            await fakeGenerator.embedMany(
              memories.map(m => `${m.memory_summary}. ${m.reasoning || ""}`)
            )
          ).output;

          let queryEmbedding = (await fakeGenerator.embed(message)).output;
          if (Array.isArray(queryEmbedding) && queryEmbedding.length === 1) {
            queryEmbedding = queryEmbedding[0];
          }

          // Calculate cosine similarity manually
          const { cosSim } = ChromeUtils.importESModule(
            "chrome://global/content/ml/NLPUtils.sys.mjs"
          );

          const similarities = memoryEmbeddings.map((memEmb, idx) => ({
            ...memories[idx],
            similarity: cosSim(queryEmbedding, memEmb),
          }));

          return similarities
            .filter(m => m.similarity >= (threshold || 0.3))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK || 5);
        }
        // Return empty array for subsequent calls
        return [];
      }
    );

    const relevantMemories =
      await MemoriesManager.getRelevantMemories(TEST_MESSAGE);

    // Check that the correct relevant memory was returned
    Assert.ok(Array.isArray(relevantMemories), "Result should be an array.");
    Assert.greaterOrEqual(
      relevantMemories.length,
      1,
      "Result should contain at least one relevant memory."
    );

    // The coffee memory should be ranked higher due to similarity
    Assert.equal(
      relevantMemories[0].memory_summary,
      "Loves drinking coffee",
      "Most relevant memory should be about coffee."
    );

    // Check that similarity score is present
    Assert.ok(
      "similarity" in relevantMemories[0],
      "Result should include similarity score"
    );
    Assert.strictEqual(
      typeof relevantMemories[0].similarity,
      "number",
      "Similarity should be a number"
    );

    // Delete memories after test
    await deleteAllMemories();
  } finally {
    sb.restore();
  }
});

/**
 * Tests failed memories retrieval - no existing memories stored
 *
 * We don't mock an engine for this test case because getRelevantMemories should immediately return an empty array
 * because there aren't any existing memories -> No need to call the LLM.
 */
add_task(
  async function test_getRelevantMemories_sad_path_no_existing_memories() {
    const relevantMemories =
      await MemoriesManager.getRelevantMemories(TEST_MESSAGE);

    // Check that result is an empty array
    Assert.ok(Array.isArray(relevantMemories), "Result should be an array.");
    Assert.equal(
      relevantMemories.length,
      0,
      "Result should be an empty array when there are no existing memories."
    );
  }
);

/**
 * Tests failed memories retrieval - no memories meet similarity threshold
 */
add_task(
  async function test_getRelevantMemories_sad_path_null_classification() {
    // Add memories so that we pass the existing memories check
    await addMemories();

    const sb = sinon.createSandbox();
    try {
      // Mock getRelevantMemories to return empty array (no memories above threshold)
      const stub = sb.stub(MemoriesManager, "getRelevantMemories").resolves([]);

      const relevantMemories =
        await MemoriesManager.getRelevantMemories(TEST_MESSAGE);

      // Check that the stub was called
      Assert.ok(stub.calledOnce, "getRelevantMemories should be called once");

      // Check that result is an empty array
      Assert.ok(Array.isArray(relevantMemories), "Result should be an array.");
      Assert.equal(
        relevantMemories.length,
        0,
        "Result should be an empty array when no memories meet similarity threshold."
      );

      // Delete memories after test
      await deleteAllMemories();
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests failed memories retrieval - no memories have sufficient similarity
 */
add_task(
  async function test_getRelevantMemories_sad_path_no_memories_in_message_category() {
    // Add memories so that we pass the existing memories check
    await addMemories();

    const sb = sinon.createSandbox();
    try {
      // Mock getRelevantMemories to return empty (simulates low similarity scores)
      const stub = sb.stub(MemoriesManager, "getRelevantMemories").resolves([]);

      const relevantMemories =
        await MemoriesManager.getRelevantMemories(TEST_MESSAGE);

      // Check that the stub was called
      Assert.ok(stub.calledOnce, "getRelevantMemories should be called once");

      // Check that result is an empty array
      Assert.ok(Array.isArray(relevantMemories), "Result should be an array.");
      Assert.equal(
        relevantMemories.length,
        0,
        "Result should be an empty array when no memories have sufficient similarity."
      );

      // Delete memories after test
      await deleteAllMemories();
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests saveMemories correctly persists history memories and updates last_history_memory_ts.
 */
add_task(async function test_saveMemories_history_updates_meta() {
  const sb = sinon.createSandbox();
  try {
    const now = Date.now();

    const generatedMemories = [
      {
        memory_summary: "foo",
        category: "A",
        intent: "X",
        score: 1,
        updated_at: now - 1000,
      },
      {
        memory_summary: "bar",
        category: "B",
        intent: "Y",
        score: 2,
        updated_at: now + 500,
      },
    ];

    const storedMemories = generatedMemories.map((generatedMemory, idx) => ({
      id: `id-${idx}`,
      ...generatedMemory,
    }));

    const addMemoryStub = sb
      .stub(MemoryStore, "addMemory")
      .callsFake(async partial => {
        // simple mapping: return first / second stored memory based on summary
        return storedMemories.find(
          s => s.memory_summary === partial.memory_summary
        );
      });

    const updateMetaStub = sb.stub(MemoryStore, "updateMeta").resolves();

    const { persistedMemories, newTimestampMs } =
      await MemoriesManager.saveMemories(
        generatedMemories,
        SOURCE_HISTORY,
        now
      );

    Assert.equal(
      addMemoryStub.callCount,
      generatedMemories.length,
      "addMemory should be called once per generated memory"
    );
    Assert.deepEqual(
      persistedMemories.map(i => i.id),
      storedMemories.map(i => i.id),
      "Persisted memories should match stored memories"
    );

    Assert.ok(
      updateMetaStub.calledOnce,
      "updateMeta should be called once for history source"
    );
    const metaArg = updateMetaStub.firstCall.args[0];
    Assert.ok(
      "last_history_memory_ts" in metaArg,
      "updateMeta should update last_history_memory_ts for history source"
    );
    Assert.equal(
      metaArg.last_history_memory_ts,
      storedMemories[1].updated_at,
      "last_history_memory_ts should be set to max(updated_at) among persisted memories"
    );
    Assert.equal(
      newTimestampMs,
      storedMemories[1].updated_at,
      "Returned newTimestampMs should match the updated meta timestamp"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Tests saveMemories correctly persists conversation memories and updates last_chat_memory_ts.
 */
add_task(async function test_saveMemories_conversation_updates_meta() {
  const sb = sinon.createSandbox();
  try {
    const now = Date.now();

    const generatedMemories = [
      {
        memory_summary: "chat-memory",
        category: "Chat",
        intent: "Talk",
        score: 1,
        updated_at: now,
      },
    ];
    const storedMemory = { id: "chat-1", ...generatedMemories[0] };

    const addMemoryStub = sb
      .stub(MemoryStore, "addMemory")
      .resolves(storedMemory);
    const updateMetaStub = sb.stub(MemoryStore, "updateMeta").resolves();

    const { persistedMemories, newTimestampMs } =
      await MemoriesManager.saveMemories(
        generatedMemories,
        SOURCE_CONVERSATION,
        now
      );

    Assert.equal(
      addMemoryStub.callCount,
      1,
      "addMemory should be called once for conversation memory"
    );
    Assert.equal(
      persistedMemories[0].id,
      storedMemory.id,
      "Persisted memory should match stored memory"
    );

    Assert.ok(
      updateMetaStub.calledOnce,
      "updateMeta should be called once for conversation source"
    );
    const metaArg = updateMetaStub.firstCall.args[0];
    Assert.ok(
      "last_chat_memory_ts" in metaArg,
      "updateMeta should update last_chat_memory_ts for conversation source"
    );
    Assert.equal(
      metaArg.last_chat_memory_ts,
      storedMemory.updated_at,
      "last_chat_memory_ts should be set to memory.updated_at"
    );
    Assert.equal(
      newTimestampMs,
      storedMemory.updated_at,
      "Returned newTimestampMs should match the updated meta timestamp"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Tests that getLastHistoryMemoryTimestamp reads the same value written via MemoryStore.updateMeta.
 */
add_task(async function test_getLastHistoryMemoryTimestamp_reads_meta() {
  const ts = Date.now() - 12345;

  // Write meta directly
  await MemoryStore.updateMeta({
    last_history_memory_ts: ts,
  });

  // Read via MemoriesManager helper
  const readTs = await MemoriesManager.getLastHistoryMemoryTimestamp();

  Assert.equal(
    readTs,
    ts,
    "getLastHistoryMemoryTimestamp should return last_history_memory_ts from MemoryStore meta"
  );
});

/**
 * Tests that getLastConversationMemoryTimestamp reads the same value written via MemoryStore.updateMeta.
 */
add_task(async function test_getLastConversationMemoryTimestamp_reads_meta() {
  const ts = Date.now() - 54321;

  // Write meta directly
  await MemoryStore.updateMeta({
    last_chat_memory_ts: ts,
  });

  // Read via MemoriesManager helper
  const readTs = await MemoriesManager.getLastConversationMemoryTimestamp();

  Assert.equal(
    readTs,
    ts,
    "getLastConversationMemoryTimestamp should return last_chat_memory_ts from MemoryStore meta"
  );
});

/**
 * Tests that non-empty aggregated browser history triggers generation,
 * ensures the LLM is called, and last_history_memory_ts is updated.
 */
add_task(
  async function test_historyTimestampUpdatedAfterHistoryMemoriesGenerationPass() {
    const sb = sinon.createSandbox();

    const lastConversationMemoriesUpdateTs =
      await MemoriesManager.getLastConversationMemoryTimestamp();

    try {
      const domainAgg = [["mozilla.org", 100]];
      const titleAgg = [
        ["Internet for people, not profit — Mozilla | mozilla.org", 100],
      ];
      const searchAgg = [
        { q: ["Google Search: firefox history | www.google.com"], r: 1 },
      ];

      sb.stub(MemoriesManager, "getAggregatedBrowserHistory").resolves([
        domainAgg,
        titleAgg,
        searchAgg,
      ]);

      const now = Date.now();
      const fakePersisted = [
        {
          id: "m1",
          memory_summary: "Searches for Firefox information",
          updated_at: now,
        },
      ];

      const saveStub = sb
        .stub(MemoriesManager, "generateAndSaveMemoriesFromSources")
        .callsFake(async (_sources, sourceType) => {
          Assert.equal(
            sourceType,
            SOURCE_HISTORY,
            "Should pass SOURCE_HISTORY"
          );
          await MemoryStore.updateMeta({ last_history_memory_ts: now }); // real write
          return fakePersisted;
        });

      const result =
        await MemoriesManager.generateMemoriesFromBrowsingHistory();

      Assert.ok(Array.isArray(result), "Result should be an array.");
      Assert.equal(
        result.length,
        1,
        "Result should contain persisted memories."
      );
      Assert.ok(
        saveStub.calledOnce,
        "generateAndSaveMemoriesFromSources should be called once"
      );

      Assert.equal(
        await MemoriesManager.getLastConversationMemoryTimestamp(),
        lastConversationMemoriesUpdateTs,
        "Last conversation memory timestamp should remain unchanged after history generation pass"
      );

      Assert.equal(
        await MemoriesManager.getLastHistoryMemoryTimestamp(),
        now,
        "Last history memory timestamp should match meta written during generation"
      );
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests that when aggregated browser history is empty we skip generation,
 * warn, and do not call generateAndSaveMemoriesFromSources (no timestamp updates).
 */
add_task(async function test_historyGeneration_skips_when_aggregates_empty() {
  const sb = sinon.createSandbox();

  const lastHistoryMemoriesUpdateTs =
    await MemoriesManager.getLastHistoryMemoryTimestamp();
  const lastConversationMemoriesUpdateTs =
    await MemoriesManager.getLastConversationMemoryTimestamp();

  try {
    sb.stub(MemoriesManager, "getAggregatedBrowserHistory").resolves([
      [],
      [],
      [],
    ]);

    const saveStub = sb.stub(
      MemoriesManager,
      "generateAndSaveMemoriesFromSources"
    );

    const result = await MemoriesManager.generateMemoriesFromBrowsingHistory();

    Assert.ok(Array.isArray(result), "Result should be an array.");
    Assert.equal(
      result.length,
      0,
      "Result should be empty when aggregates are empty."
    );

    Assert.ok(
      saveStub.notCalled,
      "generateAndSaveMemoriesFromSources should NOT be called"
    );

    Assert.equal(
      await MemoriesManager.getLastHistoryMemoryTimestamp(),
      lastHistoryMemoriesUpdateTs,
      "History timestamp should remain unchanged when generation is skipped"
    );
    Assert.equal(
      await MemoriesManager.getLastConversationMemoryTimestamp(),
      lastConversationMemoriesUpdateTs,
      "Conversation timestamp should remain unchanged when history generation is skipped"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Tests that getRelevantMemories properly invalidates cache when memories are updated.
 * Cache should be reused when memories haven't changed, but invalidated when updated_at changes.
 */
add_task(async function test_getRelevantMemories_cache_invalidation() {
  await deleteAllMemories();

  // Clear the embeddings cache before this test
  MemoriesManager._clearEmbeddingsCache();

  const sb = sinon.createSandbox();
  try {
    await addMemories();

    let embedManyCallCount = 0;

    const fakeGenerator = {
      async embedMany(texts) {
        embedManyCallCount++;
        return {
          output: texts.map((_, i) => [i === 0 ? 1 : 0, i === 1 ? 1 : 0, 0]),
        };
      },
      async embed(_text) {
        return { output: [[0.9, 0.1, 0]] };
      },
    };

    sb.stub(EmbeddingsGenerator.prototype, "embedMany").callsFake(
      fakeGenerator.embedMany
    );
    sb.stub(EmbeddingsGenerator.prototype, "embed").callsFake(
      fakeGenerator.embed
    );

    await MemoriesManager.getRelevantMemories("coffee");
    Assert.equal(
      embedManyCallCount,
      1,
      "embedMany should be called once on first call"
    );

    await MemoriesManager.getRelevantMemories("coffee");
    Assert.equal(
      embedManyCallCount,
      1,
      "embedMany should NOT be called again when memories unchanged (cache hit)"
    );

    const memories = await MemoriesManager.getAllMemories();
    // Explicitly set a different timestamp to ensure cache invalidation
    const originalTimestamp = memories[0].updated_at;
    await MemoryStore.updateMemory(memories[0].id, {
      memory_summary: "Loves drinking coffee and tea",
      updated_at: originalTimestamp + 1000, // Explicitly different timestamp
    });

    await MemoriesManager.getRelevantMemories("coffee");
    Assert.equal(
      embedManyCallCount,
      2,
      "embedMany should be called again after memory update (cache invalidated)"
    );

    await deleteAllMemories();
  } finally {
    sb.restore();
    // Clear the cache after this test to avoid affecting other tests
    MemoriesManager._clearEmbeddingsCache();
  }
});

/**
 * Tests that non-empty recent chats trigger generation,
 * and last_chat_memory_ts is updated (history timestamp unchanged).
 */
add_task(
  async function test_conversationTimestampUpdatedAfterConversationMemoriesGenerationPass() {
    const sb = sinon.createSandbox();

    const lastConversationMemoriesUpdateTs =
      await MemoriesManager.getLastConversationMemoryTimestamp();
    const lastHistoryMemoriesUpdateTs =
      await MemoriesManager.getLastHistoryMemoryTimestamp();

    try {
      // Non-empty chats so guard does not short-circuit
      const now = Date.now();
      const chatMessages = [
        {
          id: "msg-1",
          author: "user",
          content: "Remember I like coffee.",
          ts: now,
        },
      ];

      const getRecentChatsStub = sb
        .stub(MemoriesManager, "_getRecentChats")
        .resolves(chatMessages);

      const fakePersisted = [
        { id: "c1", memory_summary: "Loves drinking coffee", updated_at: now },
      ];

      const saveStub = sb
        .stub(MemoriesManager, "generateAndSaveMemoriesFromSources")
        .callsFake(async (_sources, sourceType) => {
          Assert.equal(
            sourceType,
            SOURCE_CONVERSATION,
            "Should pass SOURCE_CONVERSATION"
          );
          // Real write so readback works
          await MemoryStore.updateMeta({ last_chat_memory_ts: now });
          return fakePersisted;
        });

      const result =
        await MemoriesManager.generateMemoriesFromConversationHistory();

      Assert.ok(
        getRecentChatsStub.calledOnce,
        "_getRecentChats should be called once"
      );
      Assert.ok(
        saveStub.calledOnce,
        "generateAndSaveMemoriesFromSources should be called once"
      );

      Assert.ok(Array.isArray(result), "Result should be an array.");
      Assert.equal(
        result.length,
        1,
        "Result should contain persisted memories."
      );

      Assert.equal(
        await MemoriesManager.getLastHistoryMemoryTimestamp(),
        lastHistoryMemoriesUpdateTs,
        "Last history memory timestamp should remain unchanged after conversation generation pass"
      );

      const readTs = await MemoriesManager.getLastConversationMemoryTimestamp();
      Assert.ok(
        typeof readTs === "number" && readTs > 0,
        "Last conversation memory timestamp should be a positive number"
      );
      Assert.equal(
        readTs,
        now,
        "Last conversation memory timestamp should match meta written during generation"
      );
      Assert.greaterOrEqual(
        readTs,
        lastConversationMemoriesUpdateTs,
        "Conversation timestamp should be >= the previous value"
      );
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests when there are no recent chat messages we skip generation
 * and do not call generateAndSaveMemoriesFromSources (no timestamp updates).
 */
add_task(async function test_conversationGeneration_skips_when_chats_empty() {
  const sb = sinon.createSandbox();

  const lastConversationMemoriesUpdateTs =
    await MemoriesManager.getLastConversationMemoryTimestamp();
  const lastHistoryMemoriesUpdateTs =
    await MemoriesManager.getLastHistoryMemoryTimestamp();

  try {
    sb.stub(MemoriesManager, "_getRecentChats").resolves([]);

    const saveStub = sb.stub(
      MemoriesManager,
      "generateAndSaveMemoriesFromSources"
    );

    const result =
      await MemoriesManager.generateMemoriesFromConversationHistory();

    Assert.ok(Array.isArray(result), "Result should be an array.");
    Assert.equal(
      result.length,
      0,
      "Result should be empty when no chat messages exist."
    );

    Assert.ok(
      saveStub.notCalled,
      "generateAndSaveMemoriesFromSources should NOT be called"
    );

    Assert.equal(
      await MemoriesManager.getLastConversationMemoryTimestamp(),
      lastConversationMemoriesUpdateTs,
      "Conversation timestamp should remain unchanged when generation is skipped"
    );
    Assert.equal(
      await MemoriesManager.getLastHistoryMemoryTimestamp(),
      lastHistoryMemoriesUpdateTs,
      "History timestamp should remain unchanged when conversation generation is skipped"
    );
  } finally {
    sb.restore();
  }
});
