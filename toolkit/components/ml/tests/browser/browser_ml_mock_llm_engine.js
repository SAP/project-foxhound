/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/** @type {import("../MLTestUtils.sys.mjs")} */
const { MLTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/MLTestUtils.sys.mjs"
);

add_task(async function test_mock_llm_engine_run() {
  const engine = new MLTestUtils.MockLLMEngine();

  const resultPromise = engine.run({
    args: [
      { role: "system", content: "You are a test assistant." },
      { role: "user", content: "What is up?" },
    ],
  });

  const [requestId] = engine.getNextRequest();
  engine.respond(requestId, "Hello there.");

  const { finalOutput } = await resultPromise;

  Assert.equal(finalOutput, "Hello there.");
  Assert.equal(engine.runRequests.size, 0, "No run requests remain.");
});

add_task(async function test_mock_llm_engine_run_with_generator() {
  const engine = new MLTestUtils.MockLLMEngine();

  const fullText = MLTestUtils.gatherText(
    engine.runWithGenerator({
      args: [
        { role: "system", content: "You are a test assistant." },
        { role: "user", content: "What is up?" },
      ],
    })
  );

  const [requestId] = engine.getNextRequest();

  engine.respond(requestId, "Hello there.");

  Assert.equal(await fullText, "Hello there.");
  Assert.equal(engine.runRequests.size, 0, "No run requests remain.");
});

add_task(async function test_mock_llm_engine_with_tool_calls() {
  const engine = new MLTestUtils.MockLLMEngine();

  const generator = engine.runWithGenerator({
    args: [
      { role: "system", content: "You have access to tools." },
      { role: "user", content: "Search for news" },
    ],
  });

  const chunksPromise = MLTestUtils.gatherChunks(generator);
  const [requestId] = engine.getNextRequest();

  engine.respond(requestId, [
    {
      text: "",
      tokens: null,
      isPrompt: false,
      toolCalls: [
        {
          id: "call_1",
          function: {
            name: "search_news",
            arguments: ["Firefox", "2026"],
          },
        },
      ],
    },
  ]);

  const chunks = await chunksPromise;

  Assert.equal(chunks.length, 1, "Should have one chunk");
  Assert.equal(chunks[0].toolCalls.length, 1, "Should have one tool call");
  Assert.equal(chunks[0].toolCalls[0].id, "call_1");
  Assert.equal(chunks[0].toolCalls[0].function.name, "search_news");
  Assert.deepEqual(chunks[0].toolCalls[0].function.arguments, [
    "Firefox",
    "2026",
  ]);
});

add_task(async function test_mock_llm_engine_with_chunked_tool_calls() {
  const engine = new MLTestUtils.MockLLMEngine();

  const chunks = [];
  const generator = engine.runWithGenerator({
    args: [
      { role: "system", content: "You have access to tools." },
      { role: "user", content: "Get the weather" },
    ],
  });

  const collectionPromise = (async () => {
    for await (const chunk of generator) {
      chunks.push(chunk);
    }
  })();

  const [requestId] = engine.getNextRequest();

  engine.respond(requestId, [
    {
      text: "",
      tokens: null,
      isPrompt: false,
      toolCalls: [
        {
          id: "call_1",
          function: {
            name: "get_wea",
            arguments: ["San"],
          },
        },
      ],
    },
    {
      text: "",
      tokens: null,
      isPrompt: false,
      toolCalls: [
        {
          id: "call_1",
          function: {
            name: "get_weather",
            arguments: ["San Francisco"],
          },
        },
      ],
    },
  ]);

  await collectionPromise;

  Assert.equal(chunks.length, 2, "Should have two chunks");
  Assert.equal(
    chunks[1].toolCalls[0].function.name,
    "get_weather",
    "Final chunk should have complete function name"
  );
  Assert.deepEqual(
    chunks[1].toolCalls[0].function.arguments,
    ["San Francisco"],
    "Final chunk should have complete arguments"
  );
});
