/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ChatConversation } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs"
);
const { MESSAGE_ROLE } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatConstants.sys.mjs"
);
const { Chat } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Chat.sys.mjs"
);
const { MemoryStore } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/services/MemoryStore.sys.mjs"
);
const { openAIEngine, MODEL_FEATURES } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
);

const { PlacesTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PlacesTestUtils.sys.mjs"
);

add_setup(function () {
  // Some tools only access tabs, etc. from ai windows
  AIWindow.toggleAIWindow(window);
  registerCleanupFunction(() => AIWindow.toggleAIWindow(window));
});

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

      // withServer sets up the mock HTTP server, so use the real engine
      const engineInstance = await openAIEngine.build(MODEL_FEATURES.CHAT);

      let responseText = "";
      for await (const chunk of Chat.fetchWithHistory(
        conversation,
        engineInstance
      )) {
        if (typeof chunk === "string") {
          responseText += chunk;
        }
      }

      Assert.equal(
        responseText,
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
    }
  );
});

add_task(async function test_chat_tool_call_get_open_tabs() {
  const tab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/one",
    true
  );
  const tab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/two",
    true
  );

  try {
    await withServer(
      {
        toolCall: { name: "get_open_tabs", args: "{}" },
        followupChunks: ["Here are your tabs."],
      },
      async () => {
        const conversation = new ChatConversation({
          title: "chat title",
          description: "chat desc",
          pageUrl: new URL("https://example.com"),
          pageMeta: {},
        });
        conversation.addUserMessage("List tabs", "https://example.com", 0);

        const engineInstance = await openAIEngine.build(MODEL_FEATURES.CHAT);

        let responseText = "";
        for await (const chunk of Chat.fetchWithHistory(
          conversation,
          engineInstance
        )) {
          if (typeof chunk === "string") {
            responseText += chunk;
          }
        }

        Assert.equal(
          responseText,
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
      }
    );
  } finally {
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

        const engineInstance = await openAIEngine.build(MODEL_FEATURES.CHAT);

        let responseText = "";
        for await (const chunk of Chat.fetchWithHistory(
          conversation,
          engineInstance
        )) {
          if (typeof chunk === "string") {
            responseText += chunk;
          }
        }

        Assert.equal(
          responseText,
          "History ready.",
          "Assistant should stream follow-up text"
        );

        const toolMessages = conversation.messages.filter(
          message => message.role === MESSAGE_ROLE.TOOL
        );
        Assert.equal(toolMessages.length, 1, "Tool result recorded");
        const parsed = JSON.parse(toolMessages[0].content.body);
        info("got history: " + toolMessages[0].content.body);
        Assert.greaterOrEqual(
          parsed.results.length,
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

        const engineInstance = await openAIEngine.build(MODEL_FEATURES.CHAT);

        let responseText = "";
        for await (const chunk of Chat.fetchWithHistory(
          conversation,
          engineInstance
        )) {
          if (typeof chunk === "string") {
            responseText += chunk;
          }
        }

        Assert.equal(
          responseText,
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
            contentArray[0].includes("Headline Body text."),
          "Page content should be extracted"
        );
      }
    );
  } finally {
    BrowserTestUtils.removeTab(tab);
    await new Promise(resolve => pageServer.stop(resolve));
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

        const engineInstance = await openAIEngine.build(MODEL_FEATURES.CHAT);

        let responseText = "";
        for await (const chunk of Chat.fetchWithHistory(
          conversation,
          engineInstance
        )) {
          if (typeof chunk === "string") {
            responseText += chunk;
          }
        }

        Assert.equal(
          responseText,
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
