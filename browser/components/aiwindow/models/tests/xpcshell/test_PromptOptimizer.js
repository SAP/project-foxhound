/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Testing Strategy for compactMessages (Prompt Compaction)
 *
 * This suite verifies the middleware's structural safety and inter-turn
 * deduplication logic. Coverage includes:
 *
 * - test_no_tool_calls_bypass: Verifies arrays without tool calls are safely deep-cloned and passed through unmodified.
 * - test_basic_deduplication: Verifies older page reads are replaced with placeholders when the exact same URL is read in a later turn.
 * - test_multi_url_partial_deduplication: Verifies precise index-matching when only a subset of URLs overlap across multi-URL requests.
 * - test_global_failsafe_non_array: Verifies invalid non-array inputs are safely bypassed without throwing errors.
 * - test_granular_failsafe_bad_json: Verifies malformed JSON arguments/contents are skipped gracefully without crashing the pipeline.
 */

const { compactMessages } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/PromptOptimizer.sys.mjs"
);

// test: No tool calls present, should return the exact same array
add_task(async function test_no_tool_calls_bypass() {
  const originalMessages = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" },
    { role: "assistant", content: "Hi there!" },
  ];

  const optimized = compactMessages(originalMessages);

  Assert.deepEqual(
    optimized,
    originalMessages,
    "Array without tool calls should remain completely unchanged."
  );
  Assert.notEqual(
    optimized,
    originalMessages,
    "The returned array must be a deep clone, not the same reference."
  );
});

// test: Basic deduplication of a single URL read twice
add_task(async function test_basic_deduplication() {
  const url = "https://example.com/article";

  const originalMessages = [
    {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: "call_older",
          type: "function",
          function: {
            name: "get_page_content",
            arguments: JSON.stringify({ url_list: [url] }),
          },
        },
      ],
    },
    {
      role: "tool",
      name: "get_page_content",
      tool_call_id: "call_older",
      content: JSON.stringify(["[Heavy DOM Content - Older]"]),
    },
    {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: "call_newer",
          type: "function",
          function: {
            name: "get_page_content",
            arguments: JSON.stringify({ url_list: [url] }),
          },
        },
      ],
    },
    {
      role: "tool",
      name: "get_page_content",
      tool_call_id: "call_newer",
      content: JSON.stringify(["[Heavy DOM Content - Newer]"]),
    },
  ];

  const optimized = compactMessages(originalMessages);

  const oldToolResponse = JSON.parse(optimized[1].content);
  const newToolResponse = JSON.parse(optimized[3].content);

  Assert.ok(
    oldToolResponse[0].includes("Content omitted"),
    "Older redundant payload should be replaced with the omitted placeholder."
  );
  Assert.equal(
    newToolResponse[0],
    "[Heavy DOM Content - Newer]",
    "The newest payload must remain fully intact."
  );
});

// test: Multi-URL array where only one URL overlaps
add_task(async function test_multi_url_partial_deduplication() {
  const urlA = "https://site.com/a";
  const urlB = "https://site.com/b";
  const urlC = "https://site.com/c";

  const originalMessages = [
    {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: "call_multi_1",
          type: "function",
          function: {
            name: "get_page_content",
            arguments: JSON.stringify({ url_list: [urlA, urlB] }),
          },
        },
      ],
    },
    {
      role: "tool",
      name: "get_page_content",
      tool_call_id: "call_multi_1",
      content: JSON.stringify(["[Content A1]", "[Content B1]"]),
    },
    // Later in the chat, the AI rereads URL B, but introduces a new URL C
    {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: "call_multi_2",
          type: "function",
          function: {
            name: "get_page_content",
            arguments: JSON.stringify({ url_list: [urlB, urlC] }),
          },
        },
      ],
    },
    {
      role: "tool",
      name: "get_page_content",
      tool_call_id: "call_multi_2",
      content: JSON.stringify(["[Content B2]", "[Content C1]"]),
    },
  ];

  const optimized = compactMessages(originalMessages);

  const firstToolResponse = JSON.parse(optimized[1].content);
  const secondToolResponse = JSON.parse(optimized[3].content);

  // Assertions for Call 1
  Assert.equal(
    firstToolResponse[0],
    "[Content A1]",
    "URL A was not reread, so its original content should be preserved."
  );
  Assert.ok(
    firstToolResponse[1].includes("Content omitted"),
    "URL B was reread later, so the older Content B1 should be dropped."
  );

  // Assertions for Call 2
  Assert.equal(
    secondToolResponse[0],
    "[Content B2]",
    "The newer Content B2 must be preserved."
  );
  Assert.equal(
    secondToolResponse[1],
    "[Content C1]",
    "The new Content C1 must be preserved."
  );
});

// test: Global Failsafe - Returns input if not an array
add_task(async function test_global_failsafe_non_array() {
  const invalidInput = {
    role: "user",
    content: "I am an object, not an array",
  };
  const optimized = compactMessages(invalidInput);

  Assert.equal(
    optimized,
    invalidInput,
    "Should safely return the original input if it is not an array."
  );
});

// test: Granular Failsafe - Gracefully handles hallucinated/malformed JSON
add_task(async function test_granular_failsafe_bad_json() {
  const originalMessages = [
    {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: "call_bad_json",
          type: "function",
          function: {
            name: "get_page_content",
            arguments: "{ bad_json: missing_quotes }", // Invalid JSON string
          },
        },
      ],
    },
    {
      role: "tool",
      name: "get_page_content",
      tool_call_id: "call_bad_json",
      content: "{ not_an_array_anyway }", // Invalid JSON content
    },
  ];

  let optimized;
  let errorThrown = false;
  try {
    optimized = compactMessages(originalMessages);
  } catch (e) {
    errorThrown = true;
  }

  Assert.ok(
    !errorThrown,
    "Optimizer should catch bad JSON and not throw an error."
  );
  Assert.deepEqual(
    optimized,
    originalMessages,
    "Optimizer should skip malformed tools and return the array structurally intact."
  );
});
