/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_addTokens_builds_followupSuggestions_array() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.aiwindow.enabled", true]],
  });

  // Open AI Window to get access to ChatMessage class
  const newAIWindow = await BrowserTestUtils.openNewBrowserWindow({
    openerWindow: null,
    aiWindow: true,
  });
  const browser = newAIWindow.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    // Import ChatMessage class
    const { ChatMessage } = ChromeUtils.importESModule(
      "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs"
    );

    // Create a ChatMessage instance with required initial arrays
    const mockMessage = new ChatMessage({
      ordinal: 0,
      role: 1, // ASSISTANT
      content: { body: "Test message" },
      memoriesApplied: [],
      webSearchQueries: [],
      followUpSuggestions: [],
    });

    // Test tokens including followup and non-followup tokens
    const testTokens = [
      { key: "followup", value: "What are the best cat breeds?" },
      { key: "search", value: "cat behavior" }, // non-followup token
      { key: "followup", value: "How do I train my cat?" },
      { key: "existing_memory", value: "user has a pet cat" }, // non-followup token
      { key: "followup", value: "What foods are safe for cats?" },
    ];

    // Call the actual addTokens method
    mockMessage.addTokens(testTokens);

    // Verify followup questions were added to followUpSuggestions
    Assert.equal(
      mockMessage.followUpSuggestions.length,
      3,
      "Should have 3 followup questions in followUpSuggestions"
    );
    Assert.equal(
      mockMessage.followUpSuggestions[0],
      "What are the best cat breeds",
      "First followup question should match (trailing '?' stripped by normalization)"
    );
    Assert.equal(
      mockMessage.followUpSuggestions[1],
      "How do I train my cat",
      "Second followup question should match (trailing '?' stripped by normalization)"
    );
    Assert.equal(
      mockMessage.followUpSuggestions[2],
      "What foods are safe for cats",
      "Third followup question should match (trailing '?' stripped by normalization)"
    );

    // Verify all tokens (including non-followup) were added to tokens object
    Assert.equal(
      mockMessage.tokens.followup.length,
      3,
      "Should have 3 followup tokens in tokens object"
    );
    Assert.equal(
      mockMessage.tokens.search.length,
      1,
      "Should have 1 search token"
    );
    Assert.equal(
      mockMessage.tokens.existing_memory.length,
      1,
      "Should have 1 existing_memory token"
    );
    Assert.equal(
      mockMessage.tokens.search[0],
      "cat behavior",
      "Search token should match"
    );
    Assert.equal(
      mockMessage.tokens.existing_memory[0],
      "user has a pet cat",
      "Memory token should match"
    );

    // Verify non-followup tokens were NOT added to followUpSuggestions
    Assert.ok(
      !mockMessage.followUpSuggestions.includes("cat behavior"),
      "Search tokens should not be in followUpSuggestions"
    );
    Assert.ok(
      !mockMessage.followUpSuggestions.includes("user has a pet cat"),
      "Memory tokens should not be in followUpSuggestions"
    );

    // Verify followup tokens were added to the tokens.followup array
    Assert.equal(
      mockMessage.tokens.followup[0],
      "What are the best cat breeds",
      "First followup token should match in tokens array (normalized)"
    );
    Assert.equal(
      mockMessage.tokens.followup[1],
      "How do I train my cat",
      "Second followup token should match in tokens array (normalized)"
    );
    Assert.equal(
      mockMessage.tokens.followup[2],
      "What foods are safe for cats",
      "Third followup token should match in tokens array (normalized)"
    );
  });

  await BrowserTestUtils.closeWindow(newAIWindow);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_addTokens_normalizes_followup_values() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.aiwindow.enabled", true]],
  });

  const newAIWindow = await BrowserTestUtils.openNewBrowserWindow({
    openerWindow: null,
    aiWindow: true,
  });
  const browser = newAIWindow.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    const { ChatMessage } = ChromeUtils.importESModule(
      "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs"
    );

    const mockMessage = new ChatMessage({
      ordinal: 0,
      role: 1, // ASSISTANT
      content: { body: "Test message" },
      memoriesApplied: [],
      webSearchQueries: [],
      followUpSuggestions: [],
    });

    mockMessage.addTokens([
      // whitespace before terminal punctuation + trailing period
      { key: "followup", value: "What is this ." },
      // surrounding whitespace + trailing question mark
      { key: "followup", value: "  How are you?  " },
      // doubled internal whitespace + multiple trailing terminals
      { key: "followup", value: "Tell me  more!!!" },
      // trailing ellipsis (single codepoint)
      { key: "followup", value: "Wait…" },
      // internal comma must be preserved, only trailing period stripped
      { key: "followup", value: "Hello, world." },
      // empty / whitespace-only / punctuation-only entries should be dropped
      { key: "followup", value: "" },
      { key: "followup", value: "   " },
      { key: "followup", value: "..." },
    ]);

    Assert.deepEqual(
      mockMessage.followUpSuggestions,
      ["What is this", "How are you", "Tell me more", "Wait", "Hello, world"],
      "Follow-ups should be normalized: whitespace before punctuation removed, doubled whitespace collapsed, trailing terminal punctuation stripped, empty entries dropped"
    );

    Assert.deepEqual(
      mockMessage.tokens.followup,
      mockMessage.followUpSuggestions,
      "tokens.followup should hold the same normalized values as followUpSuggestions"
    );
  });

  await BrowserTestUtils.closeWindow(newAIWindow);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_chatMessage_with_null_followUpSuggestions() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.aiwindow.enabled", true]],
  });

  // Open AI Window to get access to ChatMessage class
  const newAIWindow = await BrowserTestUtils.openNewBrowserWindow({
    openerWindow: null,
    aiWindow: true,
  });
  const browser = newAIWindow.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    // Import ChatMessage class
    const { ChatMessage } = ChromeUtils.importESModule(
      "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs"
    );

    // Create a ChatMessage instance with default followUpSuggestions
    const mockMessage = new ChatMessage({
      ordinal: 0,
      role: 1, // ASSISTANT
      content: { body: "Test message" },
      memoriesApplied: [],
      webSearchQueries: [],
    });

    // Verify followUpSuggestions defaults to empty array and doesn't crash
    Assert.deepEqual(
      mockMessage.followUpSuggestions,
      [],
      "Should handle default empty array for followUpSuggestions in constructor"
    );

    // Test that addTokens handles followup tokens properly with empty array start
    const testTokens = [{ key: "followup", value: "What should I do next?" }];

    // This should not throw an error and should add to the existing array
    try {
      mockMessage.addTokens(testTokens);
      Assert.ok(
        true,
        "Should handle adding tokens when followUpSuggestions starts as empty array"
      );
    } catch (ex) {
      Assert.ok(false, `Should not throw error: ${ex.message}`);
    }

    // Verify followup question was added
    Assert.equal(
      mockMessage.followUpSuggestions.length,
      1,
      "Should have 1 followup question"
    );
    Assert.equal(
      mockMessage.followUpSuggestions[0],
      "What should I do next",
      "Followup question should match (trailing '?' stripped by normalization)"
    );
  });

  await BrowserTestUtils.closeWindow(newAIWindow);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_load_conversation_from_db_without_followups() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.aiwindow.enabled", true]],
  });

  const restoreSignIn = skipSignIn();

  const { ChatStore, MESSAGE_ROLE } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
  );
  const { ChatConversation } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs"
  );
  const { ChatMessage } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs"
  );

  async function cleanUpTestConversation(conversationId) {
    try {
      await ChatStore.deleteConversationById(conversationId);
    } catch {
      // Ignore cleanup errors
    }
  }

  let win;
  let conversationId;
  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await SpecialPowers.spawn(browser, [], async () => {
      await content.customElements.whenDefined("ai-window");
      const aiWindow = content.document.querySelector("ai-window");
      Assert.ok(aiWindow, "ai-window should exist");
    });

    await BrowserTestUtils.waitForMutationCondition(
      browser,
      { attributes: true, attributeFilter: ["data-conversation-id"] },
      () => browser.hasAttribute("data-conversation-id")
    );

    conversationId = browser.getAttribute("data-conversation-id");
    Assert.ok(conversationId, "Should have a conversation ID");

    const conversation = new ChatConversation({
      id: conversationId,
      title: "Test Conversation",
      pageUrl: new URL("https://example.com/"),
    });

    conversation.messages.push(
      new ChatMessage({
        ordinal: 0,
        role: MESSAGE_ROLE.USER,
        content: { body: "Hello, how are you?" },
        memoriesApplied: [],
        webSearchQueries: [],
        followUpSuggestions: [],
      })
    );

    conversation.messages.push(
      new ChatMessage({
        ordinal: 1,
        role: MESSAGE_ROLE.ASSISTANT,
        content: { body: "I'm doing well, thank you for asking!" },
        memoriesApplied: [],
        webSearchQueries: [],
        // followUpSuggestions intentionally omitted
      })
    );

    await ChatStore.updateConversation(conversation);

    const savedConversation =
      await ChatStore.findConversationById(conversationId);
    Assert.ok(savedConversation, "Conversation should be saved to database");
    Assert.equal(
      savedConversation.messages.length,
      2,
      "Saved conversation should have 2 messages"
    );

    await promiseNavigateAndLoad(browser, AIWINDOW_URL);

    await SpecialPowers.spawn(
      browser,
      [conversationId],
      async conversationIdArg => {
        await content.customElements.whenDefined("ai-window");

        const aiWindow = content.document.querySelector("ai-window");
        Assert.ok(aiWindow, "ai-window should exist after reload");

        await ContentTaskUtils.waitForCondition(() => {
          const chatBrowser =
            aiWindow.shadowRoot?.querySelector("#aichat-browser");
          return !!chatBrowser?.browsingContext;
        }, "Nested aichat browser should exist");

        const chatBrowser =
          aiWindow.shadowRoot.querySelector("#aichat-browser");
        Assert.ok(chatBrowser, "Nested aichat browser should exist");

        const innerBC = chatBrowser.browsingContext;
        Assert.ok(innerBC, "Nested aichat browser should have browsingContext");

        await SpecialPowers.spawn(innerBC, [], async () => {
          await ContentTaskUtils.waitForCondition(() => {
            return content.document.querySelector("ai-chat-content");
          }, "ai-chat-content should exist");

          const chatContent = content.document.querySelector("ai-chat-content");
          Assert.ok(chatContent, "ai-chat-content should exist");

          const chatContentJS = chatContent.wrappedJSObject || chatContent;

          await ContentTaskUtils.waitForCondition(() => {
            const messages =
              chatContent.shadowRoot?.querySelectorAll("ai-chat-message");
            return messages && messages.length >= 2;
          }, "Saved conversation messages should be rendered in ai-chat-content");

          const renderedMessages = [
            ...chatContent.shadowRoot.querySelectorAll("ai-chat-message"),
          ];
          Assert.greaterOrEqual(
            renderedMessages.length,
            2,
            "Should render at least 2 chat messages"
          );

          const renderedText = renderedMessages
            .map(msg => {
              const root = msg.shadowRoot || msg;
              return root.textContent || "";
            })
            .join(" ");

          info(`Rendered message text: ${renderedText}`);

          Assert.ok(
            renderedText.includes("Hello, how are you?"),
            "User message text should be rendered from saved DB conversation"
          );

          Assert.ok(
            renderedText.includes("I'm doing well, thank you for asking!"),
            "Assistant message text should be rendered from saved DB conversation"
          );

          Assert.ok(
            Array.isArray(chatContentJS.followUpSuggestions),
            "followUpSuggestions should be an array after loading saved conversation"
          );
          Assert.equal(
            chatContentJS.followUpSuggestions.length,
            0,
            "followUpSuggestions should be empty for saved conversation with none"
          );
        });

        Assert.equal(
          content.docShell.chromeEventHandler.getAttribute(
            "data-conversation-id"
          ),
          conversationIdArg,
          "Reloaded AI Window should still be associated with the expected conversation ID"
        );
      }
    );
  } finally {
    if (conversationId) {
      await cleanUpTestConversation(conversationId);
    }
    if (win) {
      await BrowserTestUtils.closeWindow(win);
    }
    restoreSignIn();
    await SpecialPowers.popPrefEnv();
  }
});
