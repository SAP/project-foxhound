/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BASE_ENGINE_OPTIONS = {
  featureId: "about-inference",
  taskName: "text-generation",
  modelId: "qwen3:0.6b",
  modelRevision: "main",
};

const SHARED_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_open_tabs",
      description: "Search open tabs by type.",
      parameters: {
        type: "object",
        properties: { type: { type: "string" } },
        required: ["type"],
      },
    },
  },
];

/**
 * Test that createEngine successfully talks to the OpenAI client.
 */
add_task(async function test_openai_client() {
  const records = [
    {
      featureId: "about-inference",
      taskName: "text-generation",
      modelId: "qwen3:0.6b",
      modelRevision: "main",
      id: "74a71cfd-1734-44e6-85c0-69cf3e874138",
    },
  ];
  const { cleanup } = await setup({ records });
  const { server: mockServer, port } = startMockOpenAI({
    echo: "This gets echoed.",
  });

  const engineInstance = await createEngine({
    featureId: "about-inference",
    task: "text-generation",
    modelId: "qwen3:0.6b",
    modelRevision: "main",
    apiKey: "ollama",
    baseURL: `http://localhost:${port}/v1`,
    backend: "openai",
  });

  const request = {
    args: [
      {
        role: "system",
        content:
          "You are a helpful assistant that summarizes text clearly and concisely.",
      },
      {
        role: "user",
        content: `Please summarize the following text:\n\n blah bla`,
      },
    ],
  };

  try {
    info("Run the inference");
    const inferencePromise = engineInstance.run(request);

    const result = await inferencePromise;

    Assert.equal(
      result.finalOutput,
      "This is a mock summary for testing end-to-end flow."
    );
  } finally {
    await EngineProcess.destroyMLEngine();
    await cleanup();
    await stopMockOpenAI(mockServer);
  }
});

add_task(async function test_openai_client_tools_non_streaming() {
  const records = [
    {
      ...BASE_ENGINE_OPTIONS,
      id: "74a71cfd-1734-44e6-85c0-69cf3e874138",
    },
  ];
  const { cleanup } = await setup({ records });
  const { server: mockServer, port } = startMockOpenAI();

  const engineInstance = await createEngine({
    ...BASE_ENGINE_OPTIONS,
    apiKey: "ollama",
    baseURL: `http://localhost:${port}/v1`,
    backend: "openai",
  });

  // First request: ask with tools; server responds with tool_calls
  const requestWithTools = {
    args: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Find my open news tabs." },
    ],
    tools: SHARED_TOOLS,
  };

  try {
    info("Run request that triggers tool calls");
    const result1 = await engineInstance.run(requestWithTools);

    // The pipeline should surface toolCalls from the OpenAI message
    Assert.ok(result1.toolCalls, "toolCalls should exist on the result");
    Assert.equal(result1.toolCalls.length, 1, "Exactly one tool call");
    Assert.equal(
      result1.toolCalls[0].function.name,
      "search_open_tabs",
      "Tool name should match"
    );

    // Second request: append assistant tool_calls + our tool result
    const assistantToolCallsMsg = {
      role: "assistant",
      tool_calls: result1.toolCalls.map(tc => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
    };

    const toolResultMsg = {
      role: "tool",
      tool_call_id: result1.toolCalls[0].id,
      content: JSON.stringify({ query: "news", allTabs: [] }),
    };

    const followup = await engineInstance.run({
      args: [...requestWithTools.args, assistantToolCallsMsg, toolResultMsg],
      tools: requestWithTools.tools, // still valid to include
    });

    Assert.equal(
      followup.finalOutput,
      "Here are the tabs I found for you.",
      "Should get assistant follow-up after tool result"
    );
  } finally {
    await EngineProcess.destroyMLEngine();
    await cleanup();
    await stopMockOpenAI(mockServer);
  }
});

add_task(async function test_openai_client_tools_streaming() {
  const records = [
    {
      ...BASE_ENGINE_OPTIONS,
      id: "b3b2b661-daa6-4b7f-8d3c-7db0df0dbeef",
    },
  ];
  const { cleanup } = await setup({ records });
  const { server: mockServer, port } = startMockOpenAI();

  const engineInstance = await createEngine({
    ...BASE_ENGINE_OPTIONS,
    apiKey: "ollama",
    baseURL: `http://localhost:${port}/v1`,
    backend: "openai",
  });

  const starter = {
    args: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Find my open news tabs." },
    ],
    tools: SHARED_TOOLS,
    streamOptions: { enabled: true },
  };

  try {
    // --- First turn: expect tool_calls via streaming ---
    const gen = engineInstance.runWithGenerator(starter);

    let toolCalls = null;
    for await (const chunk of gen) {
      // Your MLEngineParent + OpenAIPipeline put toolCalls onto the yielded chunk
      if (chunk.toolCalls && chunk.toolCalls.length) {
        toolCalls = chunk.toolCalls;
        break; // we end the turn when model asks for tools
      }
      // (Optional) you could accumulate chunk.text here; expected empty in this turn
    }

    Assert.ok(toolCalls, "Should receive toolCalls via streaming");
    Assert.equal(toolCalls.length, 1, "One tool call");
    Assert.equal(
      toolCalls[0].function.name,
      "search_open_tabs",
      "Tool name should match"
    );

    // --- Second turn: send tool result, stream final answer ---
    const assistantToolCallsMsg = {
      role: "assistant",
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
    };

    const toolResultMsg = {
      role: "tool",
      tool_call_id: toolCalls[0].id,
      content: JSON.stringify({ query: "news", allTabs: [] }),
    };

    const gen2 = engineInstance.runWithGenerator({
      args: [...starter.args, assistantToolCallsMsg, toolResultMsg],
      tools: SHARED_TOOLS,
      streamOptions: { enabled: true },
    });

    let final = "";
    for await (const chunk of gen2) {
      if (chunk.text) {
        final += chunk.text;
      }
    }

    Assert.ok(final.length, "Should stream some final content");
    Assert.equal(
      final,
      "Here are the tabs I found for you.",
      "Should stream the expected assistant follow-up"
    );
  } finally {
    await EngineProcess.destroyMLEngine();
    await cleanup();
    await stopMockOpenAI(mockServer);
  }
});

/**
 * Test that fxAccountToken is properly passed to the OpenAI client
 */
add_task(async function test_openai_fxaccount_token() {
  const records = [
    {
      ...BASE_ENGINE_OPTIONS,
      id: "74a71cfd-1734-44e6-85c0-69cf3e874138",
    },
  ];
  const { cleanup } = await setup({ records });

  // Mock server that checks for fxAccount token in headers
  let capturedFxaHeader = null;
  let capturedServiceTypeHeader = null;
  const { server: mockServer, port } = startMockOpenAI({
    echo: "Response with FxA token",
    onRequest: req => {
      try {
        if (req.hasHeader("authorization")) {
          capturedFxaHeader = req.getHeader("authorization");
        }
        if (req.hasHeader("service-type")) {
          capturedServiceTypeHeader = req.getHeader("service-type");
        }
      } catch (e) {
        info("Failed to get header: " + e);
      }
    },
  });

  const fxAccountToken = "test_fxa_token_12345";
  const apiKey = "test-api-key";

  const engineInstance = await createEngine({
    ...BASE_ENGINE_OPTIONS,
    apiKey,
    baseURL: `http://localhost:${port}/v1`,
    backend: "openai",
  });

  const request = {
    args: [
      {
        role: "user",
        content: "Test request with FxA token",
      },
    ],
    fxAccountToken,
  };

  try {
    info("Run the inference with fxAccountToken");
    const result = await engineInstance.run(request);

    Assert.equal(
      result.finalOutput,
      "This is a mock summary for testing end-to-end flow.",
      "Should get expected response"
    );

    // Verify that the FxA token was sent in the request headers
    const expectedValue = `Bearer ${apiKey}`;

    Assert.equal(
      capturedFxaHeader,
      expectedValue,
      `FxA token should be included in request headers. Expected: ${expectedValue}, Got: ${capturedFxaHeader}`
    );

    Assert.equal(
      capturedServiceTypeHeader,
      "ai",
      "service-type header should be 'ai' when FxA token is provided"
    );

    info("Test without fxAccountToken - should not include header");

    // Create another engine without fxAccountToken
    const engineWithoutToken = await createEngine({
      ...BASE_ENGINE_OPTIONS,
      apiKey: "test-api-key",
      baseURL: `http://localhost:${port}/v1`,
      backend: "openai",
      // No fxAccountToken
    });

    capturedFxaHeader = null;
    capturedServiceTypeHeader = null;
    const requestWithoutToken = {
      args: [
        {
          role: "user",
          content: "Test request with FxA token",
        },
      ],
      // No fxAccountToken
    };
    await engineWithoutToken.run(requestWithoutToken);

    // Verify Authorization header is the API key when no FxA token is provided
    Assert.equal(
      capturedFxaHeader,
      "Bearer test-api-key",
      "Authorization should fall back to API key when no FxA token is provided"
    );

    Assert.equal(
      capturedServiceTypeHeader,
      "ai",
      "service-type header should be present"
    );
  } finally {
    await EngineProcess.destroyMLEngine();
    await cleanup();
    await stopMockOpenAI(mockServer);
  }
});
