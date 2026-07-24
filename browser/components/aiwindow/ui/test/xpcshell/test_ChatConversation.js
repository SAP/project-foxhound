/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

do_get_profile();

const { ChatConversation, MESSAGE_ROLE, ChatMessage } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
  );

const { MEMORIES_FLAG_SOURCE, SYSTEM_PROMPT_TYPE } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatEnums.sys.mjs"
);

const { UserRoleOpts, AssistantRoleOpts, ToolRoleOpts } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs"
  );

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

add_task(function test_ChatConversation_constructor_defaults() {
  const conversation = new ChatConversation({});

  Assert.withSoftAssertions(function (soft) {
    soft.equal(conversation.id.length, 12);
    soft.ok(Array.isArray(conversation.messages));
    soft.ok(!isNaN(conversation.createdDate));
    soft.ok(!isNaN(conversation.updatedDate));
    soft.strictEqual(conversation.title, undefined);
    soft.strictEqual(conversation.description, undefined);
    soft.strictEqual(conversation.pageUrl, undefined);
    soft.strictEqual(conversation.pageMeta, undefined);
  });
});

add_task(function test_ChatConversation_addMessage() {
  const conversation = new ChatConversation({});

  const content = {
    type: "text",
    content: "hello world",
    userContext: {},
  };

  conversation.addMessage(
    MESSAGE_ROLE.USER,
    content,
    new URL("https://www.mozilla.com"),
    0
  );

  const message = conversation.messages[0];

  Assert.withSoftAssertions(function (soft) {
    soft.strictEqual(message.role, MESSAGE_ROLE.USER);
    soft.strictEqual(message.content, content);
    soft.strictEqual(message.pageUrl.href, "https://www.mozilla.com/");
    soft.strictEqual(message.turnIndex, 0);
  });
});

add_task(function test_invalidRole_ChatConversation_addMessage() {
  const conversation = new ChatConversation({});

  const content = {
    type: "text",
    content: "hello world",
    userContext: {},
  };

  conversation.addMessage(313, content, new URL("https://www.mozilla.com"), 0);

  Assert.equal(conversation.messages.length, 0);
});

add_task(function test_negativeTurnIndex_ChatConversation_addMessage() {
  const conversation = new ChatConversation({});

  const content = {
    type: "text",
    content: "hello world",
    userContext: {},
  };

  conversation.addMessage(
    MESSAGE_ROLE.USER,
    content,
    new URL("https://www.mozilla.com"),
    -1
  );
  const message = conversation.messages[0];

  Assert.equal(message.turnIndex, 0);
});

add_task(function test_parentMessageId_ChatConversation_addMessage() {
  const conversation = new ChatConversation({});

  const content = {
    type: "text",
    content: "hello world",
    userContext: {},
  };

  conversation.addMessage(
    MESSAGE_ROLE.USER,
    content,
    new URL("https://www.mozilla.com"),
    0
  );

  conversation.addMessage(
    MESSAGE_ROLE.ASSISTANT,
    content,
    new URL("https://www.mozilla.com"),
    0
  );

  const userMsg = conversation.messages[0];
  const assistantMsg = conversation.messages[1];

  Assert.equal(assistantMsg.parentMessageId, userMsg.id);
});

add_task(function test_ordinal_ChatConversation_addMessage() {
  const conversation = new ChatConversation({});

  const content = {
    type: "text",
    content: "hello world",
    userContext: {},
  };

  conversation.addMessage(
    MESSAGE_ROLE.USER,
    content,
    new URL("https://www.mozilla.com"),
    0
  );

  conversation.addMessage(
    MESSAGE_ROLE.ASSISTANT,
    content,
    new URL("https://www.mozilla.com"),
    0
  );

  const userMsg = conversation.messages[0];
  const assistantMsg = conversation.messages[1];

  Assert.withSoftAssertions(function (soft) {
    soft.equal(userMsg.ordinal, 1);
    soft.equal(assistantMsg.ordinal, 2);
  });
});

add_task(function test_ChatConversation_addUserMessage() {
  const conversation = new ChatConversation({});

  const content = "user to assistant msg";
  conversation.addUserMessage(content, new URL("https://www.mozilla.com"));

  const message = conversation.messages[0];

  Assert.withSoftAssertions(function (soft) {
    soft.equal(message.role, MESSAGE_ROLE.USER);
    soft.equal(message.turnIndex, 1);
    soft.deepEqual(message.pageUrl, new URL("https://www.mozilla.com"));
    soft.deepEqual(message.content, {
      type: "text",
      body: "user to assistant msg",
      userContext: {},
    });
  });
});

add_task(function test_revisionRootMessageId_ChatConversation_addUserMessage() {
  const conversation = new ChatConversation({});

  const content = "user to assistant msg";
  conversation.addUserMessage(content, "https://www.firefox.com");

  const message = conversation.messages[0];

  Assert.equal(message.revisionRootMessageId, message.id);
});

add_task(function test_opts_ChatConversation_addUserMessage() {
  const conversation = new ChatConversation({});

  const content = "user to assistant msg";
  conversation.addUserMessage(
    content,
    "https://www.firefox.com",
    new UserRoleOpts({ revisionRootMessageId: "321" })
  );

  const message = conversation.messages[0];

  Assert.equal(message.revisionRootMessageId, "321");
});

add_task(async function test_userContext_ChatConversation_addUserMessage() {
  const conversation = new ChatConversation({});

  const content = "user to assistant msg";
  const userContext = { testContextInfo: "123" };
  conversation.addUserMessage(
    content,
    "https://www.firefox.com",
    new UserRoleOpts({ revisionRootMessageId: "321" }),
    userContext
  );

  const message = conversation.messages[0];

  Assert.deepEqual(message.content.userContext, userContext);
});

add_task(function test_ChatConversation_addAssistantMessage() {
  const conversation = new ChatConversation({});

  const content = "response from assistant";
  conversation.addAssistantMessage("text", content);

  const message = conversation.messages[0];

  Assert.withSoftAssertions(function (soft) {
    soft.equal(message.role, MESSAGE_ROLE.ASSISTANT);
    soft.equal(message.turnIndex, 0);
    soft.deepEqual(message.pageUrl, null);
    soft.deepEqual(message.content, {
      type: "text",
      body: "response from assistant",
    });
    soft.strictEqual(message.modelId, null, "modelId should default to false");
    soft.strictEqual(message.params, null, "params should default to null");
    soft.strictEqual(message.usage, null, "usage should default to null");
    soft.strictEqual(
      message.memoriesEnabled,
      false,
      "memoriesEnabled should default to false"
    );
    soft.strictEqual(
      message.memoriesFlagSource,
      null,
      "memoriesFlagSource should default to null"
    );
    soft.deepEqual(
      message.memoriesApplied,
      [],
      "memoriesApplied should default to emtpy array"
    );
    soft.deepEqual(
      message.webSearchQueries,
      [],
      "webSearchQueries should default to emtpy array"
    );
  });
});

add_task(function test_opts_ChatConversation_addAssistantMessage() {
  const conversation = new ChatConversation({});

  const content = "response from assistant";
  const assistantOpts = new AssistantRoleOpts(
    "the-model-id",
    { some: "params for model" },
    { usage: "data" },
    true,
    1,
    ["memory"],
    ["search"]
  );
  conversation.addAssistantMessage("text", content, assistantOpts);

  const message = conversation.messages[0];

  Assert.withSoftAssertions(function (soft) {
    soft.equal(message.role, MESSAGE_ROLE.ASSISTANT);
    soft.equal(message.turnIndex, 0);
    soft.deepEqual(message.pageUrl, null);
    soft.deepEqual(message.content, {
      type: "text",
      body: "response from assistant",
    });
    soft.strictEqual(
      message.modelId,
      "the-model-id",
      "modelId should be 'the-model-id'"
    );
    soft.deepEqual(
      message.params,
      { some: "params for model" },
      'params should equal { some: "params for model"}'
    );
    soft.deepEqual(
      message.usage,
      { usage: "data" },
      'usage should equal {"usage": "data"}'
    );
    soft.strictEqual(
      message.memoriesEnabled,
      true,
      "memoriesEnabled should equal true"
    );
    soft.strictEqual(
      message.memoriesFlagSource,
      1,
      "memoriesFlagSource equal 1"
    );
    soft.deepEqual(
      message.memoriesApplied,
      ["memory"],
      "memoriesApplied should equal ['memory']"
    );
    soft.deepEqual(
      message.webSearchQueries,
      ["search"],
      "memoriesApplied should equal ['search']"
    );
  });
});

add_task(function test_ChatConversation_addToolCallMessage() {
  const conversation = new ChatConversation({});

  const content = {
    random: "tool call specific keys",
  };
  conversation.addToolCallMessage(content);

  const message = conversation.messages[0];

  Assert.withSoftAssertions(function (soft) {
    soft.equal(message.role, MESSAGE_ROLE.TOOL);
    soft.equal(message.turnIndex, 0);
    soft.deepEqual(message.pageUrl, null);
    soft.deepEqual(message.content, {
      random: "tool call specific keys",
    });
    soft.equal(message.modelId, null, "modelId should default to null");
  });
});

add_task(function test_opts_ChatConversation_addToolCallMessage() {
  const conversation = new ChatConversation({});

  const content = {
    random: "tool call specific keys",
  };
  conversation.addToolCallMessage(content, new ToolRoleOpts("the-model-id"));

  const message = conversation.messages[0];

  Assert.withSoftAssertions(function (soft) {
    soft.equal(message.role, MESSAGE_ROLE.TOOL);
    soft.equal(message.turnIndex, 0);
    soft.deepEqual(message.pageUrl, null);
    soft.deepEqual(message.content, {
      random: "tool call specific keys",
    });
    soft.equal(
      message.modelId,
      "the-model-id",
      "modelId should equal the-model-id"
    );
  });
});

add_task(function test_ChatConversation_addSystemMessage() {
  const conversation = new ChatConversation({});

  const content = {
    random: "system call specific keys",
  };
  conversation.addSystemMessage("text", content);

  const message = conversation.messages[0];

  Assert.withSoftAssertions(function (soft) {
    soft.equal(message.role, MESSAGE_ROLE.SYSTEM);
    soft.equal(message.turnIndex, 0);
    soft.deepEqual(message.pageUrl, null);
    soft.deepEqual(message.content, {
      type: "text",
      body: { random: "system call specific keys" },
    });
  });
});

add_task(function test_ChatConversation_getSitesList() {
  const conversation = new ChatConversation({});

  const content = "user to assistant msg";
  conversation.addUserMessage(content, new URL("https://www.mozilla.com"));
  conversation.addUserMessage(content, new URL("https://www.mozilla.com"));
  conversation.addUserMessage(content, new URL("https://www.firefox.com"));
  conversation.addUserMessage(content, new URL("https://www.cnn.com"));
  conversation.addUserMessage(content, new URL("https://www.espn.com"));
  conversation.addUserMessage(content, new URL("https://www.espn.com"));

  const sites = conversation.getSitesList();

  Assert.deepEqual(sites, [
    URL.parse("https://www.mozilla.com/"),
    URL.parse("https://www.firefox.com/"),
    URL.parse("https://www.cnn.com/"),
    URL.parse("https://www.espn.com/"),
  ]);
});

add_task(function test_ChatConversation_getMostRecentPageVisited() {
  const conversation = new ChatConversation({});

  const content = "user to assistant msg";
  conversation.addUserMessage(content, new URL("https://www.mozilla.com"));
  conversation.addUserMessage(content, new URL("https://www.mozilla.com"));
  conversation.addUserMessage(content, new URL("https://www.firefox.com"));
  conversation.addUserMessage(content, new URL("https://www.cnn.com"));
  conversation.addUserMessage(content, new URL("https://www.espn.com"));
  conversation.addUserMessage(content, new URL("https://www.espn.com"));

  const mostRecentPageVisited = conversation.getMostRecentPageVisited();

  Assert.equal(mostRecentPageVisited, "https://www.espn.com/");
});

add_task(function test_noBrowsing_ChatConversation_getMostRecentPageVisited() {
  const conversation = new ChatConversation({});

  const content = "user to assistant msg";
  conversation.addUserMessage(content, new URL("about:aiwindow"));
  conversation.addUserMessage(content, null);
  conversation.addUserMessage(content, null);

  const mostRecentPageVisited = conversation.getMostRecentPageVisited();

  Assert.equal(mostRecentPageVisited, null);
});

add_task(function test_ChatConversation_renderState() {
  const conversation = new ChatConversation({});

  const content = "user to assistant msg";

  conversation.addUserMessage(content, "about:aiwindow");
  conversation.addToolCallMessage("some content");
  conversation.addAssistantMessage("text", "a response");
  conversation.addUserMessage(content, "about:aiwindow");
  conversation.addSystemMessage("text", "some system message");
  conversation.addAssistantMessage("text", "a response");

  const renderState = conversation.renderState();

  Assert.deepEqual(renderState, [
    conversation.messages[0],
    conversation.messages[2],
    conversation.messages[3],
    conversation.messages[5],
  ]);
});

add_task(function test_ChatConversation_currentTurnIndex() {
  const conversation = new ChatConversation({});

  const content = "user to assistant msg";

  conversation.addSystemMessage("text", "the system prompt");
  conversation.addUserMessage(content, "about:aiwindow");
  conversation.addAssistantMessage("text", "a response");
  conversation.addUserMessage(content, "about:aiwindow");
  conversation.addAssistantMessage("text", "a response");
  conversation.addUserMessage(content, "about:aiwindow");
  conversation.addAssistantMessage("text", "a response");
  conversation.addUserMessage(content, "about:aiwindow");
  conversation.addAssistantMessage("text", "a response");
  conversation.addUserMessage(content, "about:aiwindow");
  conversation.addAssistantMessage("text", "a response");

  Assert.deepEqual(conversation.currentTurnIndex(), 4);
});

add_task(function test_ChatConversation_helpersTurnIndexing() {
  const conversation = new ChatConversation({});

  conversation.addSystemMessage("text", "the system prompt");
  conversation.addUserMessage("a user's prompt", "https://www.somesite.com");
  conversation.addToolCallMessage({ some: "tool call details" });
  conversation.addAssistantMessage("text", "the llm response");
  conversation.addUserMessage(
    "a user's second prompt",
    "https://www.somesite.com"
  );
  conversation.addToolCallMessage({ some: "more tool call details" });
  conversation.addAssistantMessage("text", "the second llm response");

  Assert.withSoftAssertions(function (soft) {
    soft.equal(conversation.messages.length, 7);

    soft.equal(conversation.messages[0].turnIndex, 0);
    soft.equal(conversation.messages[1].turnIndex, 0);
    soft.equal(conversation.messages[2].turnIndex, 0);
    soft.equal(conversation.messages[3].turnIndex, 0);
    soft.equal(conversation.messages[4].turnIndex, 1);
    soft.equal(conversation.messages[5].turnIndex, 1);
    soft.equal(conversation.messages[6].turnIndex, 1);
  });
});

add_task(function test_ChatConversation_getMessagesInOpenAiFormat() {
  const conversation = new ChatConversation({});
  conversation.addSystemMessage("text", "the system prompt");
  conversation.addUserMessage(
    "a user's prompt",
    "https://www.somesite.com",
    new UserRoleOpts(),
    { testContext: "321" }
  );
  conversation.addToolCallMessage({
    tool_call_id: "123",
    name: "tool_1",
    body: [1, 2, 3],
  });
  conversation.addAssistantMessage("text", "the llm response");
  conversation.addUserMessage(
    "a user's second prompt",
    "some question",
    new UserRoleOpts(),
    { testContext: "654" }
  );
  conversation.addToolCallMessage({
    tool_call_id: "456",
    name: "tool_1",
    body: [4, 5, 6],
  });
  conversation.addAssistantMessage("text", "the second llm response");

  const openAiFormat = conversation.getMessagesInOpenAiFormat();

  Assert.deepEqual(openAiFormat, [
    { role: "system", content: "the system prompt" },
    { role: "user", content: "a user's prompt" },
    { role: "tool", content: "[1,2,3]", name: "tool_1", tool_call_id: "123" },
    { role: "assistant", content: "the llm response" },
    { role: "user", content: "654" },
    { role: "user", content: "a user's second prompt" },
    { role: "tool", content: "[4,5,6]", name: "tool_1", tool_call_id: "456" },
    { role: "assistant", content: "the second llm response" },
  ]);
});

add_task(async function test_unrelatedMessage_ChatConversation_retryMessage() {
  const conversation = new ChatConversation({});
  conversation.addSystemMessage("text", "the system prompt");
  conversation.addUserMessage("a user's prompt", "https://www.somesite.com");

  const unrelatedMessage = new ChatMessage({
    ordinal: 0,
    role: MESSAGE_ROLE.USER,
    content: "some content",
    turnIndex: 0,
  });

  await Assert.rejects(
    conversation.retryMessage(unrelatedMessage),
    /Unrelated message/
  );
});

add_task(async function test_nonUserMessage_ChatConversation_retryMessage() {
  const conversation = new ChatConversation({});
  conversation.addSystemMessage("text", "the system prompt");
  conversation.addUserMessage("a user's prompt", "https://www.somesite.com");

  await Assert.rejects(
    conversation.retryMessage(conversation.messages[0]),
    /Not a user message/
  );
});

add_task(
  async function test_ChatConversation_retryMessage_returnsRemovedMessages() {
    let sandbox = lazy.sinon.createSandbox();

    const conversation = new ChatConversation({});

    sandbox.stub(conversation, "getRealTimeInfo").callsFake(() => {
      conversation.addSystemMessage(
        SYSTEM_PROMPT_TYPE.REAL_TIME,
        "real time data"
      );
    });

    sandbox.stub(conversation, "getMemoriesContext").callsFake(() => {
      conversation.addSystemMessage(
        SYSTEM_PROMPT_TYPE.MEMORIES,
        "memories data"
      );
    });

    conversation.addSystemMessage("text", "the system prompt");
    conversation.addUserMessage("a user's prompt", "https://www.somesite.com");
    conversation.addToolCallMessage({ some: "tool call details" });
    conversation.addAssistantMessage("text", "the llm response");
    conversation.addUserMessage("a user's second prompt", "some question");
    conversation.addToolCallMessage({ some: "more tool call details" });
    conversation.addAssistantMessage("text", "the second llm response");

    const toDeleteMessages = await conversation.retryMessage(
      conversation.messages[1]
    );

    Assert.withSoftAssertions(function (soft) {
      soft.equal(toDeleteMessages.length, 6, "Incorrect number of messages");
      soft.equal(toDeleteMessages[0].content.body, "a user's prompt");
      soft.equal(toDeleteMessages[1].content.some, "tool call details");
      soft.equal(toDeleteMessages[2].content.body, "the llm response");
      soft.equal(toDeleteMessages[3].content.body, "a user's second prompt");
      soft.equal(toDeleteMessages[4].content.some, "more tool call details");
      soft.equal(toDeleteMessages[5].content.body, "the second llm response");
    });

    sandbox.restore();
  }
);

add_task(async function test_filtersEphemeral_ChatConversation_retryMessage() {
  const conversation = new ChatConversation({});

  conversation.addSystemMessage(SYSTEM_PROMPT_TYPE.TEXT, "the system prompt");
  conversation.addSystemMessage(SYSTEM_PROMPT_TYPE.REAL_TIME, "real time data");
  conversation.addSystemMessage(SYSTEM_PROMPT_TYPE.MEMORIES, "memories data");
  conversation.addUserMessage("a user's prompt", "https://www.somesite.com");
  conversation.addAssistantMessage("text", "the llm response");

  const retryTarget = conversation.messages.find(
    m => m.role === MESSAGE_ROLE.USER
  );
  const deleted = await conversation.retryMessage(retryTarget);

  Assert.withSoftAssertions(function (soft) {
    soft.equal(
      conversation.messages.length,
      1,
      "Only the base system prompt should remain"
    );
    soft.equal(
      conversation.messages[0].content.type,
      SYSTEM_PROMPT_TYPE.TEXT,
      "Remaining message should be the base system prompt"
    );
    soft.equal(
      deleted.length,
      4,
      "Should return ephemeral messages and spliced messages"
    );
    soft.equal(
      deleted[0].content.type,
      SYSTEM_PROMPT_TYPE.REAL_TIME,
      "First deleted should be the real time message"
    );
    soft.equal(
      deleted[1].content.type,
      SYSTEM_PROMPT_TYPE.MEMORIES,
      "Second deleted should be the memories message"
    );
    soft.equal(
      deleted[2].content.body,
      "a user's prompt",
      "Third deleted should be the retried user message"
    );
    soft.equal(
      deleted[3].content.body,
      "the llm response",
      "Fourth deleted should be the assistant message"
    );
  });
});

add_task(
  async function test_uniqueOrdinalsWithoutMemories_ChatConversation_retryMessage() {
    const conversation = new ChatConversation({});

    conversation.addSystemMessage(SYSTEM_PROMPT_TYPE.TEXT, "the system prompt");
    conversation.addSystemMessage(
      SYSTEM_PROMPT_TYPE.REAL_TIME,
      "real time data"
    );
    conversation.addSystemMessage(SYSTEM_PROMPT_TYPE.MEMORIES, "memories data");
    conversation.addUserMessage("a user's prompt", "https://www.somesite.com");
    conversation.addAssistantMessage("text", "the llm response");

    const retryTarget = conversation.messages.find(
      m => m.role === MESSAGE_ROLE.USER
    );
    const originalUserOrdinal = retryTarget.ordinal;
    await conversation.retryMessage(retryTarget);

    conversation.addSystemMessage(
      SYSTEM_PROMPT_TYPE.REAL_TIME,
      "new real time data"
    );
    conversation.addUserMessage("a user's prompt", "https://www.somesite.com");
    conversation.addAssistantMessage("text", "the new llm response");

    const ordinals = conversation.messages.map(m => m.ordinal);
    const uniqueOrdinals = new Set(ordinals);

    Assert.withSoftAssertions(function (soft) {
      soft.equal(
        ordinals.length,
        uniqueOrdinals.size,
        "All ordinals should be unique after retry without memories"
      );
      soft.ok(
        conversation.messages
          .filter(m => m.role === MESSAGE_ROLE.ASSISTANT)
          .at(-1).ordinal > originalUserOrdinal,
        "New assistant ordinal must be greater than original user ordinal"
      );
    });
  }
);

add_task(async function test_returnsContent_ChatConversation_getRealTimeInfo() {
  console.log(Object.keys(lazy.sinon));
  const mockGetRealTimeMapping = lazy.sinon.stub().resolves({
    todayDate: "2024-01-15",
    url: "https://example.com",
    title: "Example",
    hasTabInfo: false,
    locale: "en-US",
    timezone: "America/Los_Angeles",
    isoTimestamp: "2024-01-15T10:30:00",
  });
  const mockEngineInstance = {
    loadPrompt: lazy.sinon
      .stub()
      .resolves("Current date: {todayDate}\nLocale: {locale}"),
  };

  const conversation = new ChatConversation({});
  const realTimeInfo = await conversation.getRealTimeInfo(mockEngineInstance, {
    getRealTimeMapping: mockGetRealTimeMapping,
  });

  Assert.withSoftAssertions(function (soft) {
    soft.ok(
      mockEngineInstance.loadPrompt.called,
      "loadPrompt should be called"
    );
  });
  Assert.equal(
    realTimeInfo,
    "Current date: 2024-01-15\nLocale: en-US",
    "getRealTimeInfo returns the expected contexutal information"
  );
});

add_task(
  async function test_returnsNoContent_ChatConversation_getRealTimeInfo() {
    const mockEngineInstance = {
      loadPrompt: lazy.sinon.stub().resolves("prompt text"),
    };

    const mockGetRealTimeMapping = lazy.sinon.stub().resolves(null);

    const conversation = new ChatConversation({});
    const realTimeInfo = await conversation.getRealTimeInfo(
      mockEngineInstance,
      {
        getRealTimeMapping: mockGetRealTimeMapping,
      }
    );

    Assert.equal(
      realTimeInfo,
      null,
      "getRealTimeInfo returns null if constructRealTime returns an empty object"
    );
  }
);

add_task(
  async function test_returnsContent_ChatConversation_getMemoriesContext() {
    console.log(Object.keys(lazy.sinon));
    const mockEngineInstance = {
      loadPrompt: lazy.sinon.stub().resolves("prompt text"),
    };
    const constructMemories = lazy.sinon
      .stub()
      .resolves({ content: "memories data" });

    const conversation = new ChatConversation({});
    const memoriesContext = await conversation.getMemoriesContext(
      "hello",
      mockEngineInstance,
      constructMemories
    );

    Assert.withSoftAssertions(function (soft) {
      soft.ok(
        constructMemories.calledWith("hello", mockEngineInstance),
        "constructMemories should be called with message and engineInstance"
      );
    });
    Assert.equal(
      memoriesContext,
      "memories data",
      "getMemoriesContext returns the expected memories information"
    );
  }
);

add_task(
  async function test_returnsNoContent_ChatConversation_getMemoriesContext() {
    console.log(Object.keys(lazy.sinon));
    const constructMemories = lazy.sinon.stub().resolves({});

    const conversation = new ChatConversation({});
    const memoriesContext = await conversation.getMemoriesContext(
      "hello",
      constructMemories
    );

    Assert.equal(
      memoriesContext,
      null,
      "getMemoriesContext returns null if constructMemories returns an empty object"
    );
  }
);

add_task(function test_ChatConversation_renderState_filters_phantom_messages() {
  const conversation = new ChatConversation({});

  conversation.addUserMessage("What's the weather?", "about:aiwindow");
  conversation.addAssistantMessage("text", "");
  conversation.addAssistantMessage("function", {
    tool_calls: [
      {
        id: "call_1",
        function: {
          name: "run_search",
          arguments: '{"query":"weather"}',
        },
      },
    ],
  });
  conversation.addAssistantMessage("text", "Here is the weather forecast.");

  const renderState = conversation.renderState();

  Assert.equal(
    renderState.length,
    2,
    "Should only contain user message and real assistant message"
  );
  Assert.equal(renderState[0].role, MESSAGE_ROLE.USER);
  Assert.equal(renderState[1].role, MESSAGE_ROLE.ASSISTANT);
  Assert.equal(renderState[1].content.body, "Here is the weather forecast.");
});

add_task(async function test_addUserMessage_sets_memories_fields() {
  const conversation = new ChatConversation({});

  const userOpts = new UserRoleOpts({
    memoriesEnabled: false,
    memoriesFlagSource: MEMORIES_FLAG_SOURCE.CONVERSATION,
  });

  await conversation.addUserMessage("hello", null, userOpts);

  const lastUserMessage = conversation.messages
    .filter(m => m.role === MESSAGE_ROLE.USER)
    .at(-1);

  Assert.ok(lastUserMessage, "Last user message exists");
  Assert.equal(
    lastUserMessage.memoriesEnabled,
    false,
    "memoriesEnabled is persisted on the user message"
  );
  Assert.equal(
    lastUserMessage.memoriesFlagSource,
    MEMORIES_FLAG_SOURCE.CONVERSATION,
    "memoriesFlagSource is persisted on the user message"
  );
});
