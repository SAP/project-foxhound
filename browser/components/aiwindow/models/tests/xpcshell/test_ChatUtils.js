/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

do_get_profile();

const {
  constructRealTimeInfoInjectionMessage,
  getLocalIsoTime,
  getCurrentTabMetadata,
  constructRelevantMemoriesContextMessage,
  parseContentWithTokens,
  detectTokens,
  sanitizeUntrustedContent,
  expandUrlTokens,
  replaceUrlsWithTokens,
} = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/ChatUtils.sys.mjs"
);

const { ChatConversation } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs"
);
const { MemoriesManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs"
);
const { MemoryStore } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/services/MemoryStore.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

/**
 * Constants for test memories
 */
const TEST_MEMORIES = [
  {
    memory_summary: "Loves drinking coffee",
    category: "Food & Drink",
    intent: "Plan / Organize",
    score: 3,
  },
  {
    memory_summary: "Buys dog food online",
    category: "Pets & Animals",
    intent: "Buy / Acquire",
    score: 4,
  },
];

/**
 * Helper function bulk-add memories
 */
async function clearAndAddMemories() {
  const memories = await MemoryStore.getMemories();
  for (const memory of memories) {
    await MemoryStore.hardDeleteMemory(memory.id);
  }
  for (const memory of TEST_MEMORIES) {
    await MemoryStore.addMemory(memory);
  }
}

/**
 * Constants for preference keys and test values
 */
const PREF_API_KEY = "browser.smartwindow.apiKey";
const PREF_ENDPOINT = "browser.smartwindow.endpoint";
const PREF_MODEL = "browser.smartwindow.model";

const API_KEY = "fake-key";
const ENDPOINT = "https://api.fake-endpoint.com/v1";
const MODEL = "fake-model";

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

add_task(function test_getLocalIsoTime_returns_offset_timestamp() {
  const sb = sinon.createSandbox();
  const clock = sb.useFakeTimers({ now: Date.UTC(2025, 11, 27, 14, 0, 0) });
  try {
    const iso = getLocalIsoTime();
    Assert.ok(
      typeof iso === "string" && !!iso.length,
      "Should return a non-empty string"
    );
    Assert.ok(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(iso),
      "Should include date, time (up to seconds), without timezone offset"
    );
  } finally {
    clock.restore();
    sb.restore();
  }
});

add_task(async function test_getCurrentTabMetadata_returns_browser_info() {
  const contextMentions = [
    {
      type: "currentTab",
      url: "https://example.com/article",
      label: "Example Article",
    },
  ];

  const result = await getCurrentTabMetadata(contextMentions);

  Assert.equal(result.url, "https://example.com/article", "Should return URL");
  Assert.equal(
    result.title,
    sanitizeUntrustedContent("Example Article"),
    "Should return title from contextMentions label"
  );
  Assert.equal(
    result.description,
    "",
    "Description should be empty (not yet implemented)"
  );
});

add_task(
  async function test_getCurrentTabMetadata_returns_empty_when_no_currentTab() {
    const contextMentions = [
      { type: "tab", url: "https://other.com", label: "Other" },
    ];

    const result = await getCurrentTabMetadata(contextMentions);

    Assert.equal(result.url, "", "Should return empty URL");
    Assert.equal(result.title, "", "Should return empty title");
    Assert.equal(result.description, "", "Should return empty description");
  }
);

add_task(
  async function test_getCurrentTabMetadata_constructRealTimeInfoInjectionMessage() {
    const contextMentions = [
      {
        type: "currentTab",
        url: "https://example.com/page",
        label: "Example Page",
      },
    ];
    const locale = Services.locale.appLocaleAsBCP47;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const mapping =
      await constructRealTimeInfoInjectionMessage(contextMentions);

    Assert.equal(mapping.url, "https://example.com/page", "Should include URL");
    Assert.equal(
      mapping.title,
      sanitizeUntrustedContent("Example Page"),
      "Should include title"
    );
    Assert.equal(mapping.description, "", "Should include description");

    Assert.equal(mapping.locale, locale, "Should include locale");
    Assert.equal(mapping.timezone, timezone, "Should include timezone");
    Assert.ok(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(mapping.isoTimestamp),
      `Should have valid ISO timestamp format (YYYY-MM-DDTHH:MM:SS), got: ${mapping.isoTimestamp}`
    );
    Assert.ok(
      /^\d{4}-\d{2}-\d{2}$/.test(mapping.todayDate),
      `Should have valid date format (YYYY-MM-DD), got: ${mapping.todayDate}`
    );
    Assert.equal(
      mapping.hasTabInfo,
      true,
      "Should indicate tab info is present"
    );
  }
);

add_task(
  async function test_constructRealTimeInfoInjectionMessage_without_tab_info() {
    const sb = sinon.createSandbox();
    const clock = sb.useFakeTimers({ now: Date.UTC(2025, 11, 27, 14, 0, 0) });

    try {
      const mapping = await constructRealTimeInfoInjectionMessage([]);

      Assert.equal(mapping.url, "", "Should not have URL");
      Assert.equal(mapping.title, "", "Should not have title");
      Assert.equal(mapping.description, "", "Should not have description");
      Assert.equal(
        mapping.hasTabInfo,
        false,
        "Should indicate no tab info present"
      );
      Assert.ok(mapping.locale, "Should still include locale");
      Assert.ok(mapping.timezone, "Should still include timezone");
      Assert.ok(mapping.isoTimestamp, "Should still include timestamp");
      Assert.ok(mapping.todayDate, "Should still include date");
    } finally {
      clock.restore();
      sb.restore();
    }
  }
);

add_task(async function test_constructRelevantMemoriesContextMessage() {
  await clearAndAddMemories();
  MemoriesManager._clearEmbeddingsCache();

  const sb = sinon.createSandbox();
  try {
    // Mock getRelevantMemories to return coffee memory
    const stub = sb.stub(MemoriesManager, "getRelevantMemories").resolves([
      {
        id: "food_drink.16ec1838",
        memory_summary: "Loves drinking coffee",
        category: "Food & Drink",
        intent: "Plan / Organize",
        score: 3,
        similarity: 0.95,
      },
    ]);

    const relevantMemoriesContextMessage =
      await constructRelevantMemoriesContextMessage(
        "I love drinking coffee",
        {}
      );
    Assert.ok(stub.calledOnce, "getRelevantMemories should be called once");

    // Check relevantMemoriesContextMessage's top level structure
    Assert.strictEqual(
      typeof relevantMemoriesContextMessage,
      "object",
      "Should return an object"
    );
    Assert.equal(
      Object.keys(relevantMemoriesContextMessage).length,
      2,
      "Should have 2 keys"
    );

    // Check specific fields
    Assert.equal(
      relevantMemoriesContextMessage.role,
      "system",
      "Should have role 'system'"
    );
    Assert.ok(
      relevantMemoriesContextMessage.content.includes("# Existing Memories"),
      "Should include prompt template text"
    );
    Assert.ok(
      relevantMemoriesContextMessage.content.includes("Loves drinking coffee"),
      "Should include memory content about coffee"
    );
  } finally {
    sb.restore();
  }
});

add_task(
  async function test_constructRelevantMemoriesContextMessage_no_relevant_memories() {
    await clearAndAddMemories();
    MemoriesManager._clearEmbeddingsCache();

    const sb = sinon.createSandbox();
    try {
      // Mock getRelevantMemories to return empty array (no matches)
      const stub = sb.stub(MemoriesManager, "getRelevantMemories").resolves([]);

      const relevantMemoriesContextMessage =
        await constructRelevantMemoriesContextMessage(
          "I love drinking coffee",
          {}
        );
      Assert.ok(stub.calledOnce, "getRelevantMemories should be called once");

      // No relevant memories, so returned value should be null
      Assert.equal(
        relevantMemoriesContextMessage,
        null,
        "Should return null when there are no relevant memories"
      );
    } finally {
      sb.restore();
    }
  }
);

add_task(async function test_parseContentWithTokens_no_tokens() {
  const content = "This is a regular message with no special tokens.";
  const result = await parseContentWithTokens(content);

  Assert.equal(
    result.cleanContent,
    content,
    "Clean content should match original when no tokens present"
  );
  Assert.equal(result.searchQueries.length, 0, "Should have no search queries");
  Assert.equal(result.usedMemories.length, 0, "Should have no used memories");
});

add_task(async function test_parseContentWithTokens_single_search_token() {
  const content =
    "You can find great coffee in the downtown area.§search: best coffee shops near me§";
  const result = await parseContentWithTokens(content);

  Assert.equal(
    result.cleanContent,
    "You can find great coffee in the downtown area.",
    "Should remove search token from content"
  );
  Assert.equal(result.searchQueries.length, 1, "Should have one search query");
  Assert.equal(
    result.searchQueries[0],
    "best coffee shops near me",
    "Should extract correct search query"
  );
  Assert.equal(result.usedMemories.length, 0, "Should have no used memories");
});

add_task(async function test_parseContentWithTokens_single_memory_token() {
  const content =
    "I recommend trying herbal tea blends.§existing_memory: food_drink.e45w65§";
  const result = await parseContentWithTokens(content);

  Assert.equal(
    result.cleanContent,
    "I recommend trying herbal tea blends.",
    "Should remove memory token from content"
  );
  Assert.equal(result.searchQueries.length, 0, "Should have no search queries");
  Assert.equal(result.usedMemories.length, 1, "Should have one used memory");
  Assert.equal(
    result.usedMemories[0],
    "food_drink.e45w65",
    "Should extract correct memory"
  );
});

add_task(async function test_parseContentWithTokens_multiple_mixed_tokens() {
  const content =
    "I recommend checking out organic coffee options.§existing_memory: food_drink.e45w65§ They have great flavor profiles.§search: organic coffee beans reviews§§search: best organic cafes nearby§";
  const result = await parseContentWithTokens(content);

  Assert.equal(
    result.cleanContent,
    "I recommend checking out organic coffee options. They have great flavor profiles.",
    "Should remove all tokens from content"
  );
  Assert.equal(
    result.searchQueries.length,
    2,
    "Should have two search queries"
  );
  Assert.deepEqual(
    result.searchQueries,
    ["organic coffee beans reviews", "best organic cafes nearby"],
    "Should extract search queries in correct order"
  );
  Assert.equal(result.usedMemories.length, 1, "Should have one used memory");
  Assert.equal(
    result.usedMemories[0],
    "food_drink.e45w65",
    "Should extract correct memory"
  );
});

add_task(async function test_parseContentWithTokens_tokens_with_whitespace() {
  const content =
    "You can find more details online.§search:   coffee brewing methods   §";
  const result = await parseContentWithTokens(content);

  Assert.equal(
    result.cleanContent,
    "You can find more details online.",
    "Should remove token with whitespace"
  );
  Assert.equal(result.searchQueries.length, 1, "Should have one search query");
  Assert.equal(
    result.searchQueries[0],
    "coffee brewing methods",
    "Should trim whitespace from extracted query"
  );
});

add_task(async function test_parseContentWithTokens_adjacent_tokens() {
  const content =
    "Here are some great Italian dining options.§existing_memory: food_drink.e45w65§§search: local italian restaurants§";
  const result = await parseContentWithTokens(content);

  Assert.equal(
    result.cleanContent,
    "Here are some great Italian dining options.",
    "Should remove adjacent tokens"
  );
  Assert.equal(result.searchQueries.length, 1, "Should have one search query");
  Assert.equal(
    result.searchQueries[0],
    "local italian restaurants",
    "Should extract search query"
  );
  Assert.equal(result.usedMemories.length, 1, "Should have one memory");
  Assert.equal(
    result.usedMemories[0],
    "food_drink.e45w65",
    "Should extract memory"
  );
});

add_task(function test_detectTokens_basic_pattern() {
  const content =
    "There are many great options available.§search: coffee shops near downtown§§search: best rated restaurants§";
  const searchRegex = /§search:\s*([^§]+)§/gi;
  const result = detectTokens(content, searchRegex, "query");

  Assert.equal(result.length, 2, "Should find two matches");
  Assert.equal(
    result[0].query,
    "coffee shops near downtown",
    "First match should extract correct query"
  );
  Assert.equal(
    result[0].fullMatch,
    "§search: coffee shops near downtown§",
    "First match should include full match"
  );
  Assert.equal(
    result[0].startIndex,
    39,
    "First match should have correct start index"
  );
  Assert.equal(
    result[1].query,
    "best rated restaurants",
    "Second match should extract correct query"
  );
});

add_task(function test_detectTokens_custom_key() {
  const content =
    "I recommend trying the Thai curry.§memory: prefers spicy food§";
  const memoryRegex = /§memory:\s*([^§]+)§/gi;
  const result = detectTokens(content, memoryRegex, "customKey");

  Assert.equal(result.length, 1, "Should find one match");
  Assert.equal(
    result[0].customKey,
    "prefers spicy food",
    "Should use custom key for extracted value"
  );
  Assert.ok(
    result[0].hasOwnProperty("customKey"),
    "Result should have the custom key property"
  );
  Assert.ok(
    !result[0].hasOwnProperty("query"),
    "Result should not have default 'query' property"
  );
});

// expandUrlTokens tests

add_task(function test_expandUrlTokens_bare_token() {
  const mapping = new Map([["GITHUB_COM_1", "https://github.com/foo"]]);
  const result = expandUrlTokens(
    "Check out §url_token: GITHUB_COM_1§ for details.",
    mapping
  );
  Assert.equal(
    result,
    "Check out https://github.com/foo for details.",
    "Bare token should be replaced with full URL"
  );
});

add_task(function test_expandUrlTokens_bracketed_id_in_href_resolved() {
  const mapping = new Map([["GITHUB_COM_1", "https://github.com/foo"]]);
  const result = expandUrlTokens(
    "[Click here](§url_token: GITHUB_COM_1§)",
    mapping
  );
  Assert.equal(
    result,
    "[Click here](https://github.com/foo)",
    "Bracketed ID in href should be expanded to full URL"
  );
});

add_task(function test_expandUrlTokens_same_domain() {
  const mapping = new Map([
    ["GITHUB_COM_1", "https://github.com/foo"],
    ["GITHUB_COM_2", "https://github.com/foo/bar"],
  ]);
  const result = expandUrlTokens(
    "[Click here](§url_token: GITHUB_COM_2§)",
    mapping
  );
  Assert.equal(
    result,
    "[Click here](https://github.com/foo/bar)",
    "Bracketed ID in href should be expanded to longer URL"
  );
});

add_task(function test_expandUrlTokens_no_space() {
  const mapping = new Map([["GITHUB_COM_1", "https://github.com/foo"]]);
  const result = expandUrlTokens(
    "[Click here](§url_token:GITHUB_COM_1§)",
    mapping
  );
  Assert.equal(
    result,
    "[Click here](https://github.com/foo)",
    "Should handle missing space after token type and still expand to correct URL"
  );
});

add_task(function test_expandUrlTokens_no_mapping() {
  const mapping = new Map();
  const result = expandUrlTokens(
    "[Click here](§url_token: GITHUB_COM_2§)",
    mapping
  );
  Assert.equal(
    result,
    "[Click here](§url_token: GITHUB_COM_2§)",
    "ID should remain unchanged if not in mapping"
  );
});

add_task(function test_expandUrlTokens_lowercase() {
  const mapping = new Map([["github_com_1", "https://github.com/foo"]]);
  const result = expandUrlTokens(
    "[Click here](§url_token: github_com_1§)",
    mapping
  );
  Assert.equal(
    result,
    "[Click here](§url_token: github_com_1§)",
    "Shouldn't match lowercase ID"
  );
});

add_task(function test_expandUrlTokens_no_digits() {
  const mapping = new Map([["GITHUB_COM", "https://github.com/foo"]]);
  const result = expandUrlTokens(
    "[Click here](§url_token: GITHUB_COM§)",
    mapping
  );
  Assert.equal(
    result,
    "[Click here](§url_token: GITHUB_COM§)",
    "Shouldn't match tags missing digits"
  );
});

add_task(function test_expandUrlTokens_special_characters() {
  const mapping = new Map([["GITHUB_COM$_1", "https://github.com/foo"]]);
  const result = expandUrlTokens(
    "[Click here](§url_token: GITHUB_COM$_1§)",
    mapping
  );
  Assert.equal(
    result,
    "[Click here](§url_token: GITHUB_COM$_1§)",
    "Shouldn't match tags with special characters"
  );
});

add_task(function test_expandUrlTokens_missing_separator() {
  const mapping = new Map([["GITHUB_COM_1", "https://github.com/foo"]]);
  const result = expandUrlTokens(
    "[Click here](url_token: GITHUB_COM_1)",
    mapping
  );
  Assert.equal(
    result,
    "[Click here](url_token: GITHUB_COM_1)",
    "Shouldn't match missing § separators"
  );
});

add_task(function test_expandUrlTokens_wrong_tag_name() {
  const mapping = new Map([["GITHUB_COM_1", "https://github.com/foo"]]);
  const result = expandUrlTokens("[Click here](§url: GITHUB_COM_1§)", mapping);
  Assert.equal(
    result,
    "[Click here](§url: GITHUB_COM_1§)",
    "Shouldn't match wrong tag name"
  );
});

add_task(function test_replaceUrlsWithTokens_serp_content_format() {
  const conversation = new ChatConversation({});

  const serpUrl = "https://www.google.com/search?q=example";
  const inlineUrl = "https://github.com/mozilla/gecko-dev";
  replaceUrlsWithTokens(conversation, [
    {
      role: "tool",
      content: `Search results from <${serpUrl}>:\n\nSee ${inlineUrl} for the source.`,
    },
  ]);

  Assert.ok(
    conversation.urlToToken.has(serpUrl),
    "URL in angle-bracket header from #extractSerpContent should be extracted without trailing >"
  );
  Assert.ok(
    conversation.urlToToken.has(inlineUrl),
    "URL in SERP content body should also be extracted"
  );
});

add_task(function test_replaceUrlsWithTokens_runExtraction_content_format() {
  const conversation = new ChatConversation({});

  const pageUrl = "http://example.com/some/page";
  const inlineUrl = "https://mozilla.org/en-US/firefox";
  replaceUrlsWithTokens(conversation, [
    {
      role: "tool",
      content: `Content from <${pageUrl}>:\n\nVisit ${inlineUrl} for more info.`,
    },
  ]);

  Assert.ok(
    conversation.urlToToken.has(pageUrl),
    "URL in angle-bracket header from #runExtraction should be extracted without trailing >"
  );
  Assert.ok(
    conversation.urlToToken.has(inlineUrl),
    "URL in extracted page content body should also be extracted"
  );
});
