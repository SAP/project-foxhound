/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

do_get_profile();

const { sanitizeUntrustedContent } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/ChatUtils.sys.mjs"
);
const { ChatStore, ChatMessage, MESSAGE_ROLE } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
);
const {
  getRecentHistory,
  generateProfileInputs,
  aggregateSessions,
  topkAggregates,
} = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesHistorySource.sys.mjs"
);
const { getRecentChats } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesChatSource.sys.mjs"
);
const { MODEL_FEATURES, openAIEngine, SERVICE_TYPES, PURPOSES } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
  );
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const TEST_MODEL = "test-model";

const {
  renderRecentHistoryForPrompt,
  renderRecentConversationForPrompt,
  mapFilteredMemoriesToInitialList,
  generateInitialMemoriesList,
  deduplicateMemories,
  applyQualityAndSensitivityFilter,
} = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/Memories.sys.mjs"
);

/**
 * Constants for preference keys and test values
 */
const PREF_API_KEY = "browser.smartwindow.apiKey";
const PREF_ENDPOINT = "browser.smartwindow.endpoint";
const PREF_MODEL = "browser.smartwindow.model";

const API_KEY = "fake-key";
const ENDPOINT = "https://api.fake-endpoint.com/v1";
const MODEL = "fake-model";

const EXISTING_MEMORIES = [
  "Loves outdoor activities",
  "Enjoys cooking recipes",
  "Like sci-fi media",
];
const NEW_MEMORIES = [
  "Loves hiking and camping",
  "Reads science fiction novels",
  "Likes both dogs and cats",
  "Likes risky stock bets",
];

add_setup(async function () {
  // Setup prefs used across multiple tests
  Services.prefs.setStringPref(PREF_API_KEY, API_KEY);
  Services.prefs.setStringPref(PREF_ENDPOINT, ENDPOINT);
  Services.prefs.setStringPref(PREF_MODEL, MODEL);

  // Clear prefs after testing
  registerCleanupFunction(() => {
    for (let pref of [PREF_API_KEY, PREF_ENDPOINT, PREF_MODEL]) {
      if (Services.prefs.prefHasUserValue(pref)) {
        Services.prefs.clearUserPref(pref);
      }
    }
  });
});

/**
 * Shortcut for full browser history aggregation pipeline
 */
async function getBrowserHistoryAggregates() {
  const profileRecords = await getRecentHistory();
  const profilePreparedInputs = await generateProfileInputs(profileRecords);
  const [domainAgg, titleAgg, searchAgg] = aggregateSessions(
    profilePreparedInputs
  );

  return await topkAggregates(domainAgg, titleAgg, searchAgg);
}

/**
 * Builds fake chat history data for testing
 */
async function buildFakeChatHistory() {
  const fixedNow = 1_700_000_000_000;

  return [
    new ChatMessage({
      createdDate: fixedNow - 1_000,
      ordinal: 1,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "I like dogs." },
      pageUrl: "https://example.com/1",
      turnIndex: 0,
    }),
    new ChatMessage({
      createdDate: fixedNow - 10_000,
      ordinal: 2,
      role: MESSAGE_ROLE.USER,
      content: { type: "text", body: "I also like cats." },
      pageUrl: "https://example.com/2",
      turnIndex: 0,
    }),
    new ChatMessage({
      createdDate: fixedNow - 100_000,
      ordinal: 3,
      role: MESSAGE_ROLE.USER,
      content: {
        type: "text",
        body: "Tell me a joke about my favorite animals.",
      },
      pageUrl: "https://example.com/3",
      turnIndex: 0,
    }),
  ];
}

/**
 * Tests rendering history as CSV when only search data is present
 */
add_task(async function test_buildRecentHistoryCSV_only_search() {
  const now = Date.now();
  const seeded = [
    {
      url: "https://www.google.com/search?q=firefox+history",
      title: "Google Search: firefox history",
      visits: [{ date: new Date(now - 5 * 60 * 1000) }],
    },
  ];
  await PlacesUtils.history.clear();
  await PlacesUtils.history.insertMany(seeded);

  const [domainItems, titleItems, searchItems] =
    await getBrowserHistoryAggregates();
  const renderedBrowserHistory = await renderRecentHistoryForPrompt(
    domainItems,
    titleItems,
    searchItems
  );
  Assert.equal(
    renderedBrowserHistory,
    `# Website Titles
Website Title,Importance Score
${sanitizeUntrustedContent("Google Search: firefox history | www.google.com", true)},100

# Web Searches
Search Query,Importance Score
${sanitizeUntrustedContent("Google Search: firefox history | www.google.com", true)},1`.trim()
  );
});

/**
 * Tests rendering history as CSV when only history data is present
 */
add_task(async function test_buildRecentHistoryCSV_only_browsing_history() {
  const now = Date.now();
  const seeded = [
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
  for (const { url, visits } of seeded) {
    await insertPlacesMetadata(url, visits[0].date.getTime());
  }

  const [domainItems, titleItems, searchItems] =
    await getBrowserHistoryAggregates();
  const renderedBrowserHistory = await renderRecentHistoryForPrompt(
    domainItems,
    titleItems,
    searchItems
  );
  Assert.equal(
    renderedBrowserHistory,
    `# Website Titles
Website Title,Importance Score
${sanitizeUntrustedContent("Hacker News | news.ycombinator.com", true)},100
${sanitizeUntrustedContent("Internet for people, not profit — Mozilla | mozilla.org", true)},100`.trim()
  );
});

/**
 * Tests generating initial memories from conversation/chat data
 */
add_task(async function test_generateInitialMemoriesList_only_chat() {
  const messages = await buildFakeChatHistory();
  const sb = sinon.createSandbox();
  const maxResults = 3;
  const halfLifeDays = 7;
  const startTime = 1_700_000_000_000 - 1_000_000;

  try {
    // Stub the method
    const chatStub = sb
      .stub(ChatStore, "findMessagesByDate")
      .callsFake(async () => {
        return messages;
      });

    const recentMessages = await getRecentChats(
      startTime,
      maxResults,
      halfLifeDays
    );

    // Assert stub was actually called
    Assert.equal(
      chatStub.callCount,
      1,
      "findMessagesByDate should be called once"
    );

    // Double check we get only the 3 expected messages back
    Assert.equal(recentMessages.length, 3, "Should return 3 chat messages");

    // Render the messages into CSV format and check correctness
    const renderedConversationHistory =
      await renderRecentConversationForPrompt(recentMessages);
    Assert.equal(
      renderedConversationHistory,
      `# Chat History
Message
I like dogs.
I also like cats.
Tell me a joke about my favorite animals.`.trim(),
      "Rendered conversation history should match expected CSV format"
    );

    // Test generateInitialMemoriesList with conversation sources
    const fakeEngine = {
      run() {
        return {
          finalOutput: `[
  {
    "reasoning": "User likes dogs and cats.",
    "category": "Pets & Animals",
    "intent": "Entertain / Relax",
    "memory_summary": "Likes both dogs and cats",
    "score": 4,
    "evidence": []
  }
]`,
        };
      },
    };

    const engineStub = sb
      .stub(openAIEngine, "_createEngine")
      .resolves(fakeEngine);

    const engine = await openAIEngine.build({
      model: TEST_MODEL,
      serviceType: SERVICE_TYPES.MEMORIES,
      purpose: PURPOSES.MEMORY_GENERATION,
      flowId: null,
      feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
    });

    Assert.ok(engineStub.calledOnce, "_createEngine should be called once");

    const sources = { conversation: recentMessages };
    const memoriesList = await generateInitialMemoriesList(engine, sources);

    // Verify memories were generated from conversation data
    Assert.ok(
      Array.isArray(memoriesList),
      "Should return an array of memories"
    );
    Assert.equal(memoriesList.length, 1, "Should generate 1 memory from chat");
    Assert.equal(
      memoriesList[0].memory_summary,
      "Likes both dogs and cats",
      "Memory should be generated from chat content"
    );
    Assert.equal(
      memoriesList[0].category,
      "Pets & Animals",
      "Memory should have correct category"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Test successful initial memories generation
 */
add_task(async function test_generateInitialMemoriesList_happy_path() {
  const sb = sinon.createSandbox();
  try {
    /**
     * The fake engine returns canned LLM response.
     * The main `generateInitialMemoriesList` function should modify this heavily, cutting it back to only the required fields.
     */
    const fakeEngine = {
      run() {
        return {
          finalOutput: `[
  {
    "reasoning": "User has recently searched for Firefox history and visited mozilla.org.",
    "category": "Internet & Telecom",
    "intent": "Research / Learn",
    "memory_summary": "Searches for Firefox information",
    "score": 7,
    "evidence": [
      {
        "type": "search",
        "value": "Google Search: firefox history"
      },
      {
        "type": "domain",
        "value": "mozilla.org"
      }
    ]
  },
  {
    "reasoning": "User buys dog food online regularly from multiple sources.",
    "category": "Pets & Animals",
    "intent": "Buy / Acquire",
    "memory_summary": "Purchases dog food online",
    "score": -1,
    "evidence": [
      {
        "type": "domain",
        "value": "example.com"
      }
    ]
  }
]`,
        };
      },
    };

    // Check that the stub was called
    const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
    const engine = await openAIEngine.build({
      model: TEST_MODEL,
      serviceType: SERVICE_TYPES.MEMORIES,
      purpose: PURPOSES.MEMORY_GENERATION,
      flowId: null,
      feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
    });
    Assert.ok(stub.calledOnce, "_createEngine should be called once");

    const [domainItems, titleItems, searchItems] =
      await getBrowserHistoryAggregates();
    const sources = { history: [domainItems, titleItems, searchItems] };
    const memoriesList = await generateInitialMemoriesList(engine, sources);

    // Check top level structure
    Assert.ok(
      Array.isArray(memoriesList),
      "Should return an array of memories"
    );
    Assert.equal(memoriesList.length, 2, "Array should contain 2 memories");

    // Check first memory structure and content
    const firstMemory = memoriesList[0];
    Assert.equal(
      typeof firstMemory,
      "object",
      "First memory should be an object/map"
    );
    Assert.equal(
      Object.keys(firstMemory).length,
      5,
      "First memory should have 5 keys"
    );
    Assert.equal(
      firstMemory.category,
      "Internet & Telecom",
      "First memory should have expected category (Internet & Telecom)"
    );
    Assert.equal(
      firstMemory.intent,
      "Research / Learn",
      "First memory should have expected intent (Research / Learn)"
    );
    Assert.equal(
      firstMemory.memory_summary,
      "Searches for Firefox information",
      "First memory should have expected summary"
    );
    Assert.equal(
      firstMemory.score,
      5,
      "First memory should have expected score, clamping 7 to 5"
    );

    // Check that the second memory's score was clamped to the minimum
    const secondMemory = memoriesList[1];
    Assert.equal(
      secondMemory.score,
      1,
      "Second memory should have expected score, clamping -1 to 1"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Tests failed initial memories generation - Empty output
 */
add_task(
  async function test_generateInitialMemoriesList_sad_path_empty_output() {
    const sb = sinon.createSandbox();
    try {
      // LLM returns an empty memories list
      const fakeEngine = {
        run() {
          return {
            finalOutput: `[]`,
          };
        },
      };

      // Check that the stub was called
      const stub = sb.stub(openAIEngine, "_createEngine").returns(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const [domainItems, titleItems, searchItems] =
        await getBrowserHistoryAggregates();
      const sources = { history: [domainItems, titleItems, searchItems] };
      const memoriesList = await generateInitialMemoriesList(engine, sources);

      Assert.equal(Array.isArray(memoriesList), true, "Should return an array");
      Assert.equal(memoriesList.length, 0, "Array should contain 0 memories");
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests failed initial memories generation - Output not array
 */
add_task(
  async function test_generateInitialMemoriesList_sad_path_output_not_array() {
    const sb = sinon.createSandbox();
    try {
      // LLM doesn't return an array
      const fakeEngine = {
        run() {
          return {
            finalOutput: `testing`,
          };
        },
      };

      // Check that the stub was called
      const stub = sb.stub(openAIEngine, "_createEngine").returns(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const [domainItems, titleItems, searchItems] =
        await getBrowserHistoryAggregates();
      const sources = { history: [domainItems, titleItems, searchItems] };
      const memoriesList = await generateInitialMemoriesList(engine, sources);

      Assert.equal(Array.isArray(memoriesList), true, "Should return an array");
      Assert.equal(memoriesList.length, 0, "Array should contain 0 memories");
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests failed initial memories generation - Output not array of maps
 */
add_task(
  async function test_generateInitialMemoriesList_sad_path_output_not_array_of_maps() {
    const sb = sinon.createSandbox();
    try {
      // LLM doesn't return an array of maps
      const fakeEngine = {
        run() {
          return {
            finalOutput: `["testing1", "testing2", ["testing3"]]`,
          };
        },
      };

      // Check that the stub was called
      const stub = sb.stub(openAIEngine, "_createEngine").returns(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const [domainItems, titleItems, searchItems] =
        await getBrowserHistoryAggregates();
      const sources = { history: [domainItems, titleItems, searchItems] };
      const memoriesList = await generateInitialMemoriesList(engine, sources);

      Assert.equal(Array.isArray(memoriesList), true, "Should return an array");
      Assert.equal(memoriesList.length, 0, "Array should contain 0 memories");
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests failed initial memories generation - Some correct memories
 */
add_task(
  async function test_generateInitialMemoriesList_sad_path_some_correct_memories() {
    const sb = sinon.createSandbox();
    try {
      // LLM returns a memories list where:
      // - 1 is missing required keys (category), so it should be rejected
      // - 1 has a memory_summary exceeding MAX_MEMORY_SUMMARY_LENGTH (100 chars), so it should be rejected
      // - 1 is fully correct and should be kept
      const fakeEngine = {
        run() {
          return {
            finalOutput: `[
  {
    "reasoning": "User has recently searched for Firefox history and visited mozilla.org.",
    "intent": "Research / Learn",
    "memory_summary": "Searches for Firefox information",
    "score": 7,
    "evidence": [
      {
        "type": "search",
        "value": "Google Search: firefox history"
      },
      {
        "type": "domain",
        "value": "mozilla.org"
      }
    ]
  },
  {
    "reasoning": "User buys dog food online regularly from multiple sources.",
    "category": "Pets & Animals",
    "intent": "Buy / Acquire",
    "memory_summary": "Purchases dog food online",
    "score": -1,
    "evidence": [
      {
        "type": "domain",
        "value": "example.com"
      }
    ]
  },
  {
    "reasoning": "User visited many travel sites.",
    "category": "Travel",
    "intent": "Research / Learn",
    "memory_summary": "This memory summary is intentionally way too long and exceeds the one hundred character maximum limit set",
    "score": 3,
    "evidence": [
      {
        "type": "domain",
        "value": "travel.example.com"
      }
    ]
  }
]`,
          };
        },
      };

      // Check that the stub was called
      const stub = sb.stub(openAIEngine, "_createEngine").returns(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const [domainItems, titleItems, searchItems] =
        await getBrowserHistoryAggregates();
      const sources = { history: [domainItems, titleItems, searchItems] };
      const memoriesList = await generateInitialMemoriesList(engine, sources);

      Assert.equal(
        Array.isArray(memoriesList),
        true,
        "Should return an array of memories"
      );
      Assert.equal(memoriesList.length, 1, "Array should contain 1 memory");
      Assert.equal(
        memoriesList[0].memory_summary,
        "Purchases dog food online",
        "Memory summary should match the valid memory"
      );
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests successful memories deduplication
 */
add_task(async function test_deduplicateMemoriesList_happy_path() {
  const sb = sinon.createSandbox();
  try {
    /**
     * The fake engine that returns a canned LLM response for deduplication.
     * The `deduplicateMemories` function should return an array containing only the `main_memory` values.
     */
    const fakeEngine = {
      run() {
        return {
          finalOutput: `{
            "unique_memories": [
              {
                "main_memory": "Loves outdoor activities",
                "duplicates": ["Loves hiking and camping"]
              },
              {
                "main_memory": "Enjoys cooking recipes",
                "duplicates": []
              },
              {
                "main_memory": "Like sci-fi media",
                "duplicates": ["Reads science fiction novels"]
              },
              {
                "main_memory": "Likes both dogs and cats",
                "duplicates": []
              },
              {
                "main_memory": "Likes risky stock bets",
                "duplicates": []
              }
            ]
          }`,
        };
      },
    };

    // Check that the stub was called
    const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
    const engine = await openAIEngine.build({
      model: TEST_MODEL,
      serviceType: SERVICE_TYPES.MEMORIES,
      purpose: PURPOSES.MEMORY_GENERATION,
      flowId: null,
      feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
    });
    Assert.ok(stub.calledOnce, "_createEngine should be called once");

    const dedupedMemoriesList = await deduplicateMemories(
      engine,
      EXISTING_MEMORIES,
      NEW_MEMORIES
    );

    // Check that the deduplicated list contains only unique memories (`main_memory` values)
    Assert.equal(
      dedupedMemoriesList.length,
      5,
      "Deduplicated memories list should contain 5 unique memories"
    );
    Assert.ok(
      dedupedMemoriesList.includes("Loves outdoor activities"),
      "Deduplicated memories should include 'Loves outdoor activities'"
    );
    Assert.ok(
      dedupedMemoriesList.includes("Enjoys cooking recipes"),
      "Deduplicated memories should include 'Enjoys cooking recipes'"
    );
    Assert.ok(
      dedupedMemoriesList.includes("Like sci-fi media"),
      "Deduplicated memories should include 'Like sci-fi media'"
    );
    Assert.ok(
      dedupedMemoriesList.includes("Likes both dogs and cats"),
      "Deduplicated memories should include 'Likes both dogs and cats'"
    );
    Assert.ok(
      dedupedMemoriesList.includes("Likes risky stock bets"),
      "Deduplicated memories should include 'Likes risky stock bets'"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Tests failed memories deduplication - Empty output
 */
add_task(async function test_deduplicateMemoriesList_sad_path_empty_output() {
  const sb = sinon.createSandbox();
  try {
    // LLM returns the correct schema but with an empty unique_memories array
    const fakeEngine = {
      run() {
        return {
          finalOutput: `{
            "unique_memories": []
          }`,
        };
      },
    };

    // Check that the stub was called
    const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
    const engine = await openAIEngine.build({
      model: TEST_MODEL,
      serviceType: SERVICE_TYPES.MEMORIES,
      purpose: PURPOSES.MEMORY_GENERATION,
      flowId: null,
      feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
    });
    Assert.ok(stub.calledOnce, "_createEngine should be called once");

    const dedupedMemoriesList = await deduplicateMemories(
      engine,
      EXISTING_MEMORIES,
      NEW_MEMORIES
    );

    Assert.ok(Array.isArray(dedupedMemoriesList), "Should return an array");
    Assert.equal(dedupedMemoriesList.length, 0, "Should return an empty array");
  } finally {
    sb.restore();
  }
});

/**
 * Tests failed memories deduplication - Wrong top-level data type
 */
add_task(
  async function test_deduplicateMemoriesList_sad_path_wrong_top_level_data_type() {
    const sb = sinon.createSandbox();
    try {
      // LLM returns an incorrect data type
      const fakeEngine = {
        run() {
          return {
            finalOutput: `testing`,
          };
        },
      };

      // Check that the stub was called
      const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const dedupedMemoriesList = await deduplicateMemories(
        engine,
        EXISTING_MEMORIES,
        NEW_MEMORIES
      );

      Assert.ok(Array.isArray(dedupedMemoriesList), "Should return an array");
      Assert.equal(
        dedupedMemoriesList.length,
        0,
        "Should return an empty array"
      );
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests failed memories deduplication - Wrong inner data type
 */
add_task(
  async function test_deduplicateMemoriesList_sad_path_wrong_inner_data_type() {
    const sb = sinon.createSandbox();
    try {
      // LLM returns a map with the right top-level key, but the inner structure is wrong
      const fakeEngine = {
        run() {
          return {
            finalOutput: `{
            "unique_memories": "testing"
          }`,
          };
        },
      };

      // Check that the stub was called
      const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const dedupedMemoriesList = await deduplicateMemories(
        engine,
        EXISTING_MEMORIES,
        NEW_MEMORIES
      );

      Assert.ok(Array.isArray(dedupedMemoriesList), "Should return an array");
      Assert.equal(
        dedupedMemoriesList.length,
        0,
        "Should return an empty array"
      );
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests failed memories deduplication - Wrong inner array structure
 */
add_task(
  async function test_deduplicateMemoriesList_sad_path_wrong_inner_array_structure() {
    const sb = sinon.createSandbox();
    try {
      // LLM returns a map of nested arrays, but the array structure is wrong
      const fakeEngine = {
        run() {
          return {
            finalOutput: `{
            "unique_memories": ["testing1", "testing2"]
          }`,
          };
        },
      };

      // Check that the stub was called
      const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const dedupedMemoriesList = await deduplicateMemories(
        engine,
        EXISTING_MEMORIES,
        NEW_MEMORIES
      );

      Assert.ok(Array.isArray(dedupedMemoriesList), "Should return an array");
      Assert.equal(
        dedupedMemoriesList.length,
        0,
        "Should return an empty array"
      );
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests failed memories deduplication - Incorrect top-level schema key
 */
add_task(
  async function test_deduplicateMemoriesList_sad_path_bad_top_level_key() {
    const sb = sinon.createSandbox();
    try {
      // LLm returns correct output except that the top-level key is wrong
      const fakeEngine = {
        run() {
          return {
            finalOutput: `{
            "correct_memories": [
              {
                "main_memory": "Loves outdoor activities",
                "duplicates": ["Loves hiking and camping"]
              },
              {
                "main_memory": "Enjoys cooking recipes",
                "duplicates": []
              },
              {
                "main_memory": "Like sci-fi media",
                "duplicates": ["Reads science fiction novels"]
              },
              {
                "main_memory": "Likes both dogs and cats",
                "duplicates": []
              },
              {
                "main_memory": "Likes risky stock bets",
                "duplicates": []
              }
            ]
          }`,
          };
        },
      };

      // Check that the stub was called
      const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const dedupedMemoriesList = await deduplicateMemories(
        engine,
        EXISTING_MEMORIES,
        NEW_MEMORIES
      );

      Assert.ok(Array.isArray(dedupedMemoriesList), "Should return an array");
      Assert.equal(
        dedupedMemoriesList.length,
        0,
        "Should return an empty array"
      );
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests failed memories deduplication - Some correct inner schema
 */
add_task(
  async function test_deduplicateMemoriesList_sad_path_bad_some_correct_inner_schema() {
    const sb = sinon.createSandbox();
    try {
      // LLm returns correct output except that 1 of the inner maps is wrong and 1 main_memory is the wrong data type
      const fakeEngine = {
        run() {
          return {
            finalOutput: `{
            "unique_memories": [
              {
                "primary_memory": "Loves outdoor activities",
                "duplicates": ["Loves hiking and camping"]
              },
              {
                "main_memory": "Enjoys cooking recipes",
                "duplicates": []
              },
              {
                "main_memory": 12345,
                "duplicates": []
              }
            ]
          }`,
          };
        },
      };

      // Check that the stub was called
      const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const dedupedMemoriesList = await deduplicateMemories(
        engine,
        EXISTING_MEMORIES,
        NEW_MEMORIES
      );

      Assert.ok(Array.isArray(dedupedMemoriesList), "Should return an array");
      Assert.equal(
        dedupedMemoriesList.length,
        1,
        "Should return an array with one valid memory"
      );
      Assert.equal(
        dedupedMemoriesList[0],
        "Enjoys cooking recipes",
        "Should return the single valid memory"
      );
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests successful memories quality + sensitivity filtering
 */
add_task(async function test_applyQualityAndSensitivityFilter_happy_path() {
  const sb = sinon.createSandbox();
  try {
    /**
     * Fake engine that returns three of the four NEW_MEMORIES as kept memories.
     * `applyQualityAndSensitivityFilter` should return those three verbatim.
     */
    const fakeEngine = {
      run() {
        return {
          finalOutput: `{
  "kept_memories": [
    "Loves hiking and camping",
    "Reads science fiction novels",
    "Likes both dogs and cats"
  ]
}`,
        };
      },
    };

    const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
    const engine = await openAIEngine.build({
      model: TEST_MODEL,
      serviceType: SERVICE_TYPES.MEMORIES,
      purpose: PURPOSES.MEMORY_GENERATION,
      flowId: null,
      feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
    });
    Assert.ok(stub.calledOnce, "_createEngine should be called once");

    const keptMemoriesList = await applyQualityAndSensitivityFilter(
      engine,
      NEW_MEMORIES
    );

    Assert.equal(
      keptMemoriesList.length,
      3,
      "Kept memories list should contain 3 memories"
    );
    Assert.ok(
      keptMemoriesList.includes("Loves hiking and camping"),
      "Kept memories should include 'Loves hiking and camping'"
    );
    Assert.ok(
      keptMemoriesList.includes("Reads science fiction novels"),
      "Kept memories should include 'Reads science fiction novels'"
    );
    Assert.ok(
      keptMemoriesList.includes("Likes both dogs and cats"),
      "Kept memories should include 'Likes both dogs and cats'"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Tests failed fused filter - Empty output
 */
add_task(
  async function test_applyQualityAndSensitivityFilter_sad_path_empty_output() {
    const sb = sinon.createSandbox();
    try {
      const fakeEngine = {
        run() {
          return {
            finalOutput: `{
  "kept_memories": []
}`,
          };
        },
      };

      const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const keptMemoriesList = await applyQualityAndSensitivityFilter(
        engine,
        NEW_MEMORIES
      );

      Assert.ok(Array.isArray(keptMemoriesList), "Should return an array");
      Assert.equal(keptMemoriesList.length, 0, "Should return an empty array");
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests failed filter - Wrong outer data type (not JSON)
 */
add_task(
  async function test_applyQualityAndSensitivityFilter_sad_path_wrong_data_type() {
    const sb = sinon.createSandbox();
    try {
      const fakeEngine = {
        run() {
          return {
            finalOutput: `testing`,
          };
        },
      };

      const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const keptMemoriesList = await applyQualityAndSensitivityFilter(
        engine,
        NEW_MEMORIES
      );

      Assert.ok(Array.isArray(keptMemoriesList), "Should return an array");
      Assert.equal(keptMemoriesList.length, 0, "Should return an empty array");
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests failed filter - Wrong inner data type
 */
add_task(
  async function test_applyQualityAndSensitivityFilter_sad_path_wrong_inner_data_type() {
    const sb = sinon.createSandbox();
    try {
      const fakeEngine = {
        run() {
          return {
            finalOutput: `{
  "kept_memories": "testing"
}`,
          };
        },
      };

      const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const keptMemoriesList = await applyQualityAndSensitivityFilter(
        engine,
        NEW_MEMORIES
      );

      Assert.ok(Array.isArray(keptMemoriesList), "Should return an array");
      Assert.equal(keptMemoriesList.length, 0, "Should return an empty array");
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests failed filter - Wrong outer schema (top-level key mismatch)
 */
add_task(
  async function test_applyQualityAndSensitivityFilter_sad_path_wrong_outer_schema() {
    const sb = sinon.createSandbox();
    try {
      const fakeEngine = {
        run() {
          return {
            finalOutput: `{
  "these_are_kept_memories": [
    "testing1", "testing2", "testing3"
  ]
}`,
          };
        },
      };

      const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const keptMemoriesList = await applyQualityAndSensitivityFilter(
        engine,
        NEW_MEMORIES
      );

      Assert.ok(Array.isArray(keptMemoriesList), "Should return an array");
      Assert.equal(keptMemoriesList.length, 0, "Should return an empty array");
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests that reworded memories are dropped
 */
add_task(
  async function test_applyQualityAndSensitivityFilter_drops_reworded_memories() {
    const sb = sinon.createSandbox();
    try {
      // LLM reworded one memory and returned a verbatim-correct one
      const fakeEngine = {
        run() {
          return {
            finalOutput: `{
  "kept_memories": [
    "Loves hiking and camping",
    "Reads sci-fi novels"
  ]
}`,
          };
        },
      };

      const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
      const engine = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.MEMORIES,
        purpose: PURPOSES.MEMORY_GENERATION,
        flowId: null,
        feature: MODEL_FEATURES.MEMORIES_INITIAL_GENERATION_SYSTEM,
      });
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const keptMemoriesList = await applyQualityAndSensitivityFilter(
        engine,
        NEW_MEMORIES
      );

      Assert.equal(
        keptMemoriesList.length,
        1,
        "Only the verbatim memory should be kept"
      );
      Assert.equal(
        keptMemoriesList[0],
        "Loves hiking and camping",
        "Reworded memory should be dropped"
      );
    } finally {
      sb.restore();
    }
  }
);

/**
 * Tests mapping filtered memories back to full memory objects
 */
add_task(async function test_mapFilteredMemoriesToInitialList() {
  // Raw mock full memories object list
  const initialMemoriesList = [
    // Imagined duplicate - should have been filtered out
    {
      category: "Pets & Animals",
      intent: "Buy / Acquire",
      memory_summary: "Buys dog food online",
      score: 4,
    },
    // Sensitive content (stocks) - should have been filtered out
    {
      category: "News",
      intent: "Research / Learn",
      memory_summary: "Likes to invest in risky stocks",
      score: 5,
    },
    {
      category: "Games",
      intent: "Entertain / Relax",
      memory_summary: "Enjoys strategy games",
      score: 3,
    },
  ];

  // Mock list of good memories to keep
  const filteredMemoriesList = ["Enjoys strategy games"];

  const finalMemoriesList = await mapFilteredMemoriesToInitialList(
    initialMemoriesList,
    filteredMemoriesList
  );

  // Check that only the non-duplicate, non-sensitive memory remains
  Assert.equal(
    finalMemoriesList.length,
    1,
    "Final memories should contain 1 memory"
  );
  Assert.equal(
    finalMemoriesList[0].category,
    "Games",
    "Final memory should have the correct category"
  );
  Assert.equal(
    finalMemoriesList[0].intent,
    "Entertain / Relax",
    "Final memory should have the correct intent"
  );
  Assert.equal(
    finalMemoriesList[0].memory_summary,
    "Enjoys strategy games",
    "Final memory should match the filtered memory"
  );
  Assert.equal(
    finalMemoriesList[0].score,
    3,
    "Final memory should have the correct score"
  );
});
