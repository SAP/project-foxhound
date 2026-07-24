/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

do_get_profile();

const { ChatConversation } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs"
);
const { SYSTEM_PROMPT_TYPE, MESSAGE_ROLE } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatConstants.sys.mjs"
);
const { Chat } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Chat.sys.mjs"
);
const { MODEL_FEATURES, openAIEngine, FEATURE_MAJOR_VERSIONS } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
  );

function getVersionForFeature(feature) {
  const major = FEATURE_MAJOR_VERSIONS[feature] || 1;
  return `${major}.0`;
}

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

// Prefs for aiwindow
const PREF_API_KEY = "browser.smartwindow.apiKey";
const PREF_ENDPOINT = "browser.smartwindow.endpoint";
const PREF_MODEL = "browser.smartwindow.model";

// Clean prefs after all tests
registerCleanupFunction(() => {
  for (let pref of [PREF_API_KEY, PREF_ENDPOINT, PREF_MODEL]) {
    if (Services.prefs.prefHasUserValue(pref)) {
      Services.prefs.clearUserPref(pref);
    }
  }
});

add_task(async function test_Chat_real_tools_are_registered() {
  Assert.strictEqual(
    typeof Chat.toolMap.get_open_tabs,
    "function",
    "get_open_tabs should be registered in toolMap"
  );
  Assert.strictEqual(
    typeof Chat.toolMap.search_browsing_history,
    "function",
    "search_browsing_history should be registered in toolMap"
  );
  Assert.strictEqual(
    typeof Chat.toolMap.get_page_content,
    "function",
    "get_page_content should be registered in toolMap"
  );
  Assert.strictEqual(
    typeof Chat.toolMap.get_user_memories,
    "function",
    "get_user_memories should be registered in the toolMap"
  );
});

add_task(
  async function test_openAIEngine_build_with_chat_feature_and_nonexistent_model() {
    Services.prefs.setStringPref(PREF_API_KEY, "test-key-123");
    Services.prefs.setStringPref(PREF_ENDPOINT, "https://example.test/v1");
    Services.prefs.setStringPref(PREF_MODEL, "nonexistent-model");

    const sb = sinon.createSandbox();
    try {
      const fakeEngineInstance = {
        runWithGenerator() {
          throw new Error("not used");
        },
      };
      const stub = sb
        .stub(openAIEngine, "_createEngine")
        .resolves(fakeEngineInstance);

      const engine = await openAIEngine.build(MODEL_FEATURES.CHAT);

      Assert.ok(
        engine instanceof openAIEngine,
        "Should return openAIEngine instance"
      );
      Assert.strictEqual(
        engine.engineInstance,
        fakeEngineInstance,
        "Should store engine instance"
      );
      Assert.ok(stub.calledOnce, "_createEngine should be called once");

      const opts = stub.firstCall.args[0];
      Assert.equal(opts.apiKey, "test-key-123", "apiKey should come from pref");
      Assert.equal(
        opts.baseURL,
        "https://example.test/v1",
        "baseURL should come from pref"
      );
      Assert.equal(
        opts.modelId,
        "nonexistent-model",
        "modelId should use custom model with custom endpoint"
      );
    } finally {
      sb.restore();
    }
  }
);

add_task(async function test_Chat_fetchWithHistory_streams_and_forwards_args() {
  const sb = sinon.createSandbox();
  try {
    let capturedArgs = null;
    let capturedOptions = null;

    // Fake openAIEngine instance that directly has runWithGenerator method
    const fakeEngine = {
      runWithGenerator(options) {
        capturedArgs = options.args;
        capturedOptions = options;
        async function* gen() {
          yield { text: "Hello" };
          yield { text: " from" };
          yield { text: " fake engine!" };
          yield {}; // ignored by Chat
          // No toolCalls yielded, so loop will exit after first iteration
        }
        return gen();
      },
      getConfig() {
        return {};
      },
    };

    sb.stub(openAIEngine, "build").resolves(fakeEngine);
    // sb.stub(Chat, "_getFxAccountToken").resolves("mock_token");

    const conversation = new ChatConversation({
      title: "chat title",
      description: "chat desc",
      pageUrl: new URL("https://www.firefox.com"),
      pageMeta: {},
    });
    conversation.addSystemMessage(
      SYSTEM_PROMPT_TYPE.TEXT,
      "You are helpful",
      0
    );
    conversation.addUserMessage("Hi there", "https://www.firefox.com", 0);

    // Build engine
    const engineInstance = await openAIEngine.build(MODEL_FEATURES.CHAT);
    // Collect streamed output
    let acc = "";
    for await (const chunk of Chat.fetchWithHistory(
      conversation,
      engineInstance
    )) {
      if (typeof chunk === "string") {
        acc += chunk;
      }
    }

    Assert.equal(
      acc,
      "Hello from fake engine!",
      "Should concatenate streamed chunks"
    );
    Assert.deepEqual(
      [capturedArgs[0].body, capturedArgs[1].body],
      [conversation.messages[0].body, conversation.messages[1].body],
      "Should forward messages as args to runWithGenerator()"
    );
    Assert.deepEqual(
      capturedOptions.streamOptions.enabled,
      true,
      "Should enable streaming in runWithGenerator()"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_Chat_fetchWithHistory_handles_tool_calls() {
  const sb = sinon.createSandbox();
  try {
    let callCount = 0;
    const fakeEngine = {
      runWithGenerator(_options) {
        callCount++;
        async function* gen() {
          if (callCount === 1) {
            // First call: yield text and tool call
            yield { text: "I'll help you with that. " };
            yield {
              toolCalls: [
                {
                  id: "call_123",
                  function: {
                    name: "test_tool",
                    arguments: JSON.stringify({ param: "value" }),
                  },
                },
              ],
            };
          } else {
            // Second call: after tool execution
            yield { text: "Tool executed successfully!" };
          }
        }
        return gen();
      },
      getConfig() {
        return {};
      },
    };

    // Mock tool function
    Chat.toolMap.test_tool = sb.stub().resolves("tool result");

    sb.stub(openAIEngine, "build").resolves(fakeEngine);
    // sb.stub(Chat, "_getFxAccountToken").resolves("mock_token");

    const conversation = new ChatConversation({
      title: "chat title",
      description: "chat desc",
      pageUrl: new URL("https://www.firefox.com"),
      pageMeta: {},
    });
    conversation.addUserMessage(
      "Use the test tool",
      "https://www.firefox.com",
      0
    );

    // Build engine
    const engineInstance = await openAIEngine.build(MODEL_FEATURES.CHAT);
    let textOutput = "";
    for await (const chunk of Chat.fetchWithHistory(
      conversation,
      engineInstance
    )) {
      if (typeof chunk === "string") {
        textOutput += chunk;
      }
    }

    const toolCalls = conversation.messages.filter(
      message =>
        message.role === MESSAGE_ROLE.ASSISTANT &&
        message?.content?.type === "function"
    );

    Assert.equal(
      textOutput,
      "I'll help you with that. Tool executed successfully!",
      "Should yield text from both model calls"
    );
    Assert.equal(toolCalls.length, 1, "Should have one tool call");
    Assert.ok(
      toolCalls[0].content.body.tool_calls[0].function.name.includes(
        "test_tool"
      ),
      "Tool call log should mention tool name"
    );
    Assert.ok(Chat.toolMap.test_tool.calledOnce, "Tool should be called once");
    Assert.deepEqual(
      Chat.toolMap.test_tool.firstCall.args[0],
      { param: "value" },
      "Tool should receive correct parameters"
    );
    Assert.equal(
      callCount,
      2,
      "Engine should be called twice (initial + after tool)"
    );
  } finally {
    sb.restore();
    delete Chat.toolMap.test_tool;
  }
});

add_task(
  async function test_Chat_fetchWithHistory_propagates_engine_build_error() {
    const sb = sinon.createSandbox();
    try {
      const err = new Error("engine build failed");
      const fakeEngine = {
        getConfig() {
          return {};
        },
        runWithGenerator() {
          throw err; // throwing error in generation
        },
      };

      sb.stub(openAIEngine, "build").resolves(fakeEngine);
      // sb.stub(Chat, "_getFxAccountToken").resolves("mock_token");

      const conversation = new ChatConversation({
        title: "chat title",
        description: "chat desc",
        pageUrl: new URL("https://www.firefox.com"),
        pageMeta: {},
      });
      conversation.addUserMessage("Hi", "https://www.firefox.com", 0);

      // Build engine
      const engineInstance = await openAIEngine.build(MODEL_FEATURES.CHAT);
      const consume = async () => {
        for await (const _chunk of Chat.fetchWithHistory(
          conversation,
          engineInstance
        )) {
          void _chunk;
        }
      };

      await Assert.rejects(
        consume(),
        e => e === err,
        "Should propagate the same error thrown by openAIEngine.build"
      );
    } finally {
      sb.restore();
    }
  }
);

add_task(
  async function test_Chat_fetchWithHistory_handles_invalid_tool_arguments() {
    const sb = sinon.createSandbox();
    try {
      let callCount = 0;
      const fakeEngine = {
        runWithGenerator(_options) {
          callCount++;
          async function* gen() {
            if (callCount === 1) {
              // First call: yield text and invalid tool call
              yield { text: "Using tool with bad args: " };
              yield {
                toolCalls: [
                  {
                    id: "call_456",
                    function: {
                      name: "test_tool",
                      arguments: "invalid json {",
                    },
                  },
                ],
              };
            } else {
              // Second call: no more tool calls, should exit loop
              yield { text: "Done." };
            }
          }
          return gen();
        },
        getConfig() {
          return {};
        },
      };

      Chat.toolMap.test_tool = sb.stub().resolves("should not be called");

      sb.stub(openAIEngine, "build").resolves(fakeEngine);
      // sb.stub(Chat, "_getFxAccountToken").resolves("mock_token");

      const conversation = new ChatConversation({
        title: "chat title",
        description: "chat desc",
        pageUrl: new URL("https://www.firefox.com"),
        pageMeta: {},
      });
      conversation.addUserMessage(
        "Test bad JSON",
        "https://www.firefox.com",
        0
      );

      const engineInstance = await openAIEngine.build(MODEL_FEATURES.CHAT);
      let textOutput = "";
      for await (const chunk of Chat.fetchWithHistory(
        conversation,
        engineInstance
      )) {
        if (typeof chunk === "string") {
          textOutput += chunk;
        }
      }

      Assert.equal(
        textOutput,
        "Using tool with bad args: Done.",
        "Should yield text from both calls"
      );
      Assert.ok(
        Chat.toolMap.test_tool.notCalled,
        "Tool should not be called with invalid JSON"
      );
    } finally {
      sb.restore();
      delete Chat.toolMap.test_tool;
    }
  }
);

add_task(
  async function test_Chat_fetchWithHistory_handles_tool_call_with_empty_arguments() {
    const sb = sinon.createSandbox();
    try {
      let callCount = 0;
      const fakeEngine = {
        runWithGenerator(_options) {
          callCount++;
          async function* gen() {
            if (callCount === 1) {
              // First call: yield tool call with empty string arguments
              yield { text: "Calling tool with no args: " };
              yield {
                toolCalls: [
                  {
                    id: "call_empty_args",
                    function: {
                      name: "get_open_tabs",
                      arguments: "", // Empty string instead of "{}"
                    },
                  },
                ],
              };
            } else {
              // Second call: after tool execution
              yield { text: "Tool completed." };
            }
          }
          return gen();
        },
        getConfig() {
          return {};
        },
      };

      sb.stub(Chat.toolMap, "get_open_tabs").resolves([]);
      sb.stub(openAIEngine, "build").resolves(fakeEngine);

      const conversation = new ChatConversation({
        title: "chat title",
        description: "chat desc",
        pageUrl: new URL("https://www.firefox.com"),
        pageMeta: {},
      });
      conversation.addUserMessage(
        "Get my open tabs",
        "https://www.firefox.com",
        0
      );

      const engineInstance = await openAIEngine.build(MODEL_FEATURES.CHAT);
      let textOutput = "";
      for await (const chunk of Chat.fetchWithHistory(
        conversation,
        engineInstance
      )) {
        if (typeof chunk === "string") {
          textOutput += chunk;
        }
      }

      // Find the assistant message with tool_calls
      const assistantToolCallMessage = conversation.messages.find(
        message =>
          message.role === MESSAGE_ROLE.ASSISTANT &&
          message?.content?.type === "function" &&
          message?.content?.body?.tool_calls
      );

      Assert.ok(
        assistantToolCallMessage,
        "Should have assistant message with tool_calls"
      );
      Assert.equal(
        assistantToolCallMessage.content.body.tool_calls[0].function.arguments,
        "{}",
        "Empty arguments string should be converted to '{}'"
      );
      Assert.ok(
        Chat.toolMap.get_open_tabs.calledOnce,
        "Tool should be called once even with empty args"
      );
      Assert.equal(
        textOutput,
        "Calling tool with no args: Tool completed.",
        "Should yield text from both calls"
      );
    } finally {
      sb.restore();
    }
  }
);

add_task(async function test_Chat_modelId_reads_from_pref() {
  const defaultModelId = "";
  const customModelId = "custom-model-id";

  Services.prefs.clearUserPref(PREF_MODEL);

  Assert.equal(
    Chat.modelId,
    defaultModelId,
    "Should be '' when pref is not set"
  );

  Services.prefs.setStringPref(PREF_MODEL, customModelId);

  Assert.equal(
    Chat.modelId,
    customModelId,
    "Should read modelId from pref after it is set"
  );

  Services.prefs.clearUserPref(PREF_MODEL);

  Assert.equal(
    Chat.modelId,
    defaultModelId,
    "Should revert to default modelId after pref is cleared"
  );
});

add_task(async function test_Chat_fetchWithHistory_uses_modelId_from_pref() {
  const sb = sinon.createSandbox();
  try {
    const customModelId = "test-custom-model-123";
    Services.prefs.setStringPref(PREF_MODEL, customModelId);

    const fakeRecords = [
      {
        feature: MODEL_FEATURES.CHAT,
        version: getVersionForFeature(MODEL_FEATURES.CHAT),
        model: customModelId,
        is_default: true,
      },
    ];

    const fakeClient = {
      get: sb.stub().resolves(fakeRecords),
    };
    sb.stub(openAIEngine, "getRemoteClient").returns(fakeClient);

    const fakeEngineInstance = {
      runWithGenerator(_options) {
        async function* gen() {
          yield { text: "Test response" };
        }
        return gen();
      },
    };

    const createEngineStub = sb
      .stub(openAIEngine, "_createEngine")
      .resolves(fakeEngineInstance);

    const conversation = new ChatConversation({
      title: "chat title",
      description: "chat desc",
      pageUrl: new URL("https://www.firefox.com"),
      pageMeta: {},
    });

    const engineInstance = await openAIEngine.build(MODEL_FEATURES.CHAT);
    const generator = Chat.fetchWithHistory(conversation, engineInstance);
    await generator.next();

    Assert.ok(
      createEngineStub.calledOnce,
      "_createEngine should be called once"
    );
    const createEngineArgs = createEngineStub.firstCall.args[0];
    Assert.equal(
      createEngineArgs.modelId,
      customModelId,
      "Engine should be created with the custom model from pref"
    );
  } finally {
    sb.restore();
    Services.prefs.clearUserPref(PREF_MODEL);
  }
});
