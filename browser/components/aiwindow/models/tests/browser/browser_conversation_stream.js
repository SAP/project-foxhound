/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ChatConversation } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs"
);
const { MESSAGE_ROLE } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/AIWindowConstants.sys.mjs"
);
const { Chat } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Chat.sys.mjs"
);
const { MemoryStore } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/services/MemoryStore.sys.mjs"
);
const { MODEL_FEATURES, SERVICE_TYPES, PURPOSES } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
);

const { PlacesTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PlacesTestUtils.sys.mjs"
);

const TEST_MODEL = "test-model";

function getLastAssistantResponse(conversation) {
  return conversation.messages
    .filter(m => m.role == MESSAGE_ROLE.ASSISTANT)
    .filter(m => m.content.type === "text")
    .at(-1);
}

add_task(async function test_chat_streams_end_to_end() {
  const requests = [];
  await withServer(
    {
      streamChunks: ["Hello ", "from mock server."],
      onRequest(body) {
        requests.push(body);
      },
    },
    async () => {
      const conversation = new ChatConversation({
        title: "chat title",
        description: "chat desc",
        pageUrl: new URL("https://example.com"),
        pageMeta: {},
      });
      conversation.addUserMessage("Please say hello", "https://example.com", 0);
      conversation.addAssistantMessage("text", "");

      // withServer sets up the mock HTTP server, so use the real engine
      const engineInstance = await openAIEngine.build({
        model: TEST_MODEL,
        serviceType: SERVICE_TYPES.AI,
        purpose: PURPOSES.CHAT,
        flowId: null,
        feature: MODEL_FEATURES.CHAT,
      });

      await Chat.fetchWithHistory({ conversation, engineInstance });

      Assert.equal(
        getLastAssistantResponse(conversation).content.body,
        "Hello from mock server.",
        "Assistant text streams end to end"
      );

      Assert.equal(requests.length, 1, "Single OpenAI request sent");
      Assert.ok(requests[0].stream, "Request uses streaming");
      Assert.equal(requests[0].messages?.length, 1, "User message forwarded");
      Assert.equal(
        requests[0].messages?.[0]?.content,
        "Please say hello",
        "User content forwarded"
      );
      Assert.equal(
        requests[0].messages?.[0]?.role,
        "user",
        "User role preserved"
      );

      const toolMessages = conversation.messages.filter(
        message => message.role === MESSAGE_ROLE.TOOL
      );
      Assert.equal(toolMessages.length, 0, "No tool calls for plain response");

      Assert.ok(Chat.lastUsage, "Usage should be captured from stream");
      Assert.equal(
        Chat.lastUsage.prompt_tokens,
        10,
        "prompt_tokens should be 10"
      );
      Assert.equal(
        Chat.lastUsage.completion_tokens,
        5,
        "completion_tokens should be 5"
      );
      Assert.equal(
        Chat.lastUsage.total_tokens,
        15,
        "total_tokens should be 15"
      );
    }
  );
});

add_task(async function test_chat_tool_call_get_open_tabs() {
  const { AIWindow } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs"
  );

  // Stubbing the isAIWindowActive check to allow tool calls to work in the test environment
  // Using a real AIWindow interferes with the openAIEngine
  // The stub will make the code think the current window is the active AIWindow which allows get_open_tabs to work
  const isAIWindowActiveStub = sinon
    .stub(AIWindow, "isAIWindowActive")
    .callsFake(win => win === window);

  let tab1, tab2;
  try {
    tab1 = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      "https://example.com/one",
      true
    );
    tab2 = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      "https://example.com/two",
      true
    );

    await withServer(
      {
        toolCall: { name: "get_open_tabs", args: "{}" },
        followupChunks: ["Here are your tabs."],
      },
      async () => {
        const engineInstance = await openAIEngine.build({
          model: TEST_MODEL,
          serviceType: SERVICE_TYPES.AI,
          purpose: PURPOSES.CHAT,
          flowId: null,
          feature: MODEL_FEATURES.CHAT,
        });

        const conversation = new ChatConversation({
          title: "chat title",
          description: "chat desc",
          pageUrl: new URL("https://example.com"),
          pageMeta: {},
        });
        conversation.addUserMessage("List tabs", "https://example.com", 0);
        conversation.addAssistantMessage("text", "");

        await Chat.fetchWithHistory({ conversation, engineInstance });

        Assert.equal(
          getLastAssistantResponse(conversation).content.body,
          "Here are your tabs.",
          "Assistant should stream follow-up text"
        );

        const toolMessages = conversation.messages.filter(
          message => message.role === MESSAGE_ROLE.TOOL
        );
        Assert.equal(toolMessages.length, 1, "Tool result recorded");
        Assert.ok(
          Array.isArray(toolMessages[0].content.body),
          "Tool result should be tab list"
        );
        info("got tabs: " + JSON.stringify(toolMessages[0].content.body));
        Assert.equal(
          toolMessages[0].content.body.length,
          2,
          "Returns both tabs"
        );

        Assert.ok(Chat.lastUsage, "Usage should be captured after tool call");
        Assert.equal(
          Chat.lastUsage.total_tokens,
          15,
          "total_tokens should be 15"
        );
      }
    );
  } finally {
    isAIWindowActiveStub.restore();
    BrowserTestUtils.removeTab(tab1);
    BrowserTestUtils.removeTab(tab2);
  }
});

add_task(async function test_chat_tool_call_search_browsing_history() {
  await PlacesUtils.history.clear();
  await PlacesTestUtils.addVisits([
    { uri: "https://example.com/llama", title: "Llama News" },
    { uri: "https://example.org/guide", title: "Llama Guide" },
  ]);

  try {
    await withServer(
      {
        toolCall: {
          name: "search_browsing_history",
          args: JSON.stringify({ searchTerm: "llama", historyLimit: 5 }),
        },
        followupChunks: ["History ready."],
      },
      async () => {
        const conversation = new ChatConversation({
          title: "chat title",
          description: "chat desc",
          pageUrl: new URL("https://example.com"),
          pageMeta: {},
        });
        conversation.addUserMessage("Search history", "https://example.com", 0);
        conversation.addAssistantMessage("text", "");

        const engineInstance = await openAIEngine.build({
          model: TEST_MODEL,
          serviceType: SERVICE_TYPES.AI,
          purpose: PURPOSES.CHAT,
          flowId: null,
          feature: MODEL_FEATURES.CHAT,
        });

        await Chat.fetchWithHistory({ conversation, engineInstance });

        Assert.equal(
          getLastAssistantResponse(conversation).content.body,
          "History ready.",
          "Assistant should stream follow-up text"
        );

        const toolMessages = conversation.messages.filter(
          message => message.role === MESSAGE_ROLE.TOOL
        );
        Assert.equal(toolMessages.length, 1, "Tool result recorded");
        const toolResult = toolMessages[0].content.body;
        info("got history: " + JSON.stringify(toolResult));
        Assert.greaterOrEqual(
          toolResult.results.length,
          1,
          "History tool returns stored visits"
        );
      }
    );
  } finally {
    await PlacesUtils.history.clear();
  }
});

add_task(async function test_chat_tool_call_get_page_content() {
  const html = `<!DOCTYPE html><html><body><article><h1>Headline</h1><p>Body text.</p></article></body></html>`;
  const { url, server: pageServer } = serveHTML(html);
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url, true);

  try {
    await withServer(
      {
        toolCall: {
          name: "get_page_content",
          args: JSON.stringify({ url_list: [url] }),
        },
        followupChunks: ["Content ready."],
      },
      async () => {
        const conversation = new ChatConversation({
          title: "chat title",
          description: "chat desc",
          pageUrl: new URL("https://example.com"),
          pageMeta: {},
        });
        conversation.addUserMessage("Read page", "https://example.com", 0);
        conversation.addAssistantMessage("text", "");

        const engineInstance = await openAIEngine.build({
          model: TEST_MODEL,
          serviceType: SERVICE_TYPES.AI,
          purpose: PURPOSES.CHAT,
          flowId: null,
          feature: MODEL_FEATURES.CHAT,
        });

        await Chat.fetchWithHistory({ conversation, engineInstance });

        Assert.equal(
          getLastAssistantResponse(conversation).content.body,
          "Content ready.",
          "Assistant should stream follow-up text"
        );

        const toolMessages = conversation.messages.filter(
          message => message.role === MESSAGE_ROLE.TOOL
        );
        Assert.equal(toolMessages.length, 1, "Tool result recorded");
        const contentArray = toolMessages[0].content.body;
        info("got content: " + contentArray);
        Assert.ok(
          Array.isArray(contentArray) &&
            typeof contentArray[0] === "string" &&
            contentArray[0].includes("Headline") &&
            contentArray[0].includes("Body text."),
          "Page content should be extracted"
        );
      }
    );
  } finally {
    window.document.documentElement.removeAttribute("ai-window");
    BrowserTestUtils.removeTab(tab);
    await new Promise(resolve => pageServer.stop(resolve));
  }
});

add_task(async function test_chat_tool_call_get_navigation_info() {
  const { SmartWindowNavigationInfo } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/SmartWindowNavigationInfo.sys.mjs"
  );

  const FAKE_NAV_RESULTS = [
    {
      url: "about:preferences#manageMemories",
      label: "Manage memories",
      breadcrumb: "Settings > AI Controls > Smart Window > Manage memories",
      description: "Memories are what Smart Window learns from your activity.",
      similarity: 0.85,
    },
  ];

  const sb = sinon.createSandbox();
  sb.stub(SmartWindowNavigationInfo, "getRelevantNavigation").resolves(
    FAKE_NAV_RESULTS
  );

  try {
    await withServer(
      {
        toolCall: {
          name: "get_navigation_info",
          args: JSON.stringify({ query: "manage memories" }),
        },
        followupChunks: ["Navigation ready."],
      },
      async () => {
        const conversation = new ChatConversation({
          title: "chat title",
          description: "chat desc",
          pageUrl: new URL("https://example.com"),
          pageMeta: {},
        });
        conversation.addUserMessage(
          "How do I manage memories?",
          "https://example.com",
          0
        );
        conversation.addAssistantMessage("text", "");

        const engineInstance = await openAIEngine.build({
          model: TEST_MODEL,
          serviceType: SERVICE_TYPES.AI,
          purpose: PURPOSES.CHAT,
          flowId: null,
          feature: MODEL_FEATURES.CHAT,
        });

        await Chat.fetchWithHistory({ conversation, engineInstance });

        Assert.equal(
          getLastAssistantResponse(conversation).content.body,
          "Navigation ready.",
          "Assistant should stream follow-up text"
        );

        const toolMessages = conversation.messages.filter(
          message => message.role === MESSAGE_ROLE.TOOL
        );
        Assert.equal(toolMessages.length, 1, "Tool result recorded");

        const navResults = toolMessages[0].content.body;
        info("got nav results: " + JSON.stringify(navResults));
        Assert.equal(navResults.length, 1, "Returns the stubbed nav entry");
        Assert.equal(
          navResults[0].url,
          "about:preferences#manageMemories",
          "Nav entry url flows through"
        );
        Assert.ok(navResults[0].label, "Nav entry has label");
        Assert.ok(navResults[0].breadcrumb, "Nav entry has breadcrumb");
      }
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_chat_tool_call_get_user_memories() {
  // Clear existing memories
  const preTestMemories = await MemoryStore.getMemories({
    includeSoftDeleted: true,
  });
  for (const memory of preTestMemories) {
    await MemoryStore.hardDeleteMemory(memory.id);
  }

  // Add temp test memories
  const testMemories = [
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
  for (const memory of testMemories) {
    await MemoryStore.addMemory(memory);
  }

  try {
    await withServer(
      {
        toolCall: {
          name: "get_user_memories",
          args: "{}",
        },
        followupChunks: ["Memories ready."],
      },
      async () => {
        const conversation = new ChatConversation({
          title: "chat title",
          description: "chat desc",
          pageUrl: new URL("https://example.com"),
          pageMeta: {},
        });
        conversation.addUserMessage(
          "Tell me everything you know about me",
          "https://example.com",
          0
        );
        conversation.addAssistantMessage("text", "");

        const engineInstance = await openAIEngine.build({
          model: TEST_MODEL,
          serviceType: SERVICE_TYPES.AI,
          purpose: PURPOSES.CHAT,
          flowId: null,
          feature: MODEL_FEATURES.CHAT,
        });

        await Chat.fetchWithHistory({ conversation, engineInstance });

        Assert.equal(
          getLastAssistantResponse(conversation).content.body,
          "Memories ready.",
          "Assistant should stream follow-up text"
        );

        const toolMessages = conversation.messages.filter(
          message => message.role === MESSAGE_ROLE.TOOL
        );
        Assert.equal(toolMessages.length, 1, "Tool result recorded");
        const returnedMemories = toolMessages[0].content.body;
        info("got memories: " + returnedMemories);
        Assert.ok(
          returnedMemories.includes("Loves drinking coffee"),
          "Memories tool call should return the 1st expected memory"
        );
        Assert.ok(
          returnedMemories.includes("Buys dog food online"),
          "Memories tool call should return the 2nd expected memory"
        );
        Assert.equal(
          returnedMemories.length,
          2,
          "Memories tool call should return exactly 2 memories"
        );
      }
    );
  } finally {
    // Clear temp memories
    const postTestMemories = await MemoryStore.getMemories({
      includeSoftDeleted: true,
    });
    for (const memory of postTestMemories) {
      await MemoryStore.hardDeleteMemory(memory.id);
    }
  }
});
