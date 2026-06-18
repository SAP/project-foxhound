/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Helper function to safely get the aichat browser element
 * Waits for ai-window, then shadowRoot, then #aichat-browser
 *
 * @param {object} browser - The browser element
 * @returns {Promise<object>} The aichat browser element
 */
async function getAichatBrowser(browser) {
  // Wait for ai-window element to exist
  const aiWindowEl = await TestUtils.waitForCondition(
    () => browser.contentDocument?.querySelector("ai-window"),
    "Wait for ai-window element to exist"
  );

  // Wait for shadowRoot to be available
  await TestUtils.waitForCondition(
    () => aiWindowEl.shadowRoot,
    "Wait for ai-window shadowRoot to be ready"
  );

  // Wait for aichat-browser to be available
  const aichatBrowser = await TestUtils.waitForCondition(
    () => aiWindowEl.shadowRoot.querySelector("#aichat-browser"),
    "Wait for aichat-browser element"
  );

  // Ensure it's loaded with the correct URL
  if (aichatBrowser.currentURI?.spec !== "about:aichatcontent") {
    await BrowserTestUtils.browserLoaded(
      aichatBrowser,
      false,
      "about:aichatcontent"
    );
  }

  Assert.equal(
    aichatBrowser.currentURI.spec,
    "about:aichatcontent",
    "aichat-browser should be loaded with about:aichatcontent"
  );

  return aichatBrowser;
}

/**
 * Helper function to set up a conversation with tool UI data
 * This simulates the LLM response containing tool UI information
 * without directly manipulating implementation details
 *
 * @param {object} aichatBrowser - The aichat browser element
 * @param {object} toolUIData - The tool UI data configuration
 */
async function setupConversationWithToolUI(aichatBrowser, toolUIData) {
  await SpecialPowers.spawn(aichatBrowser, [toolUIData], async data => {
    const chatContent = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("ai-chat-content"),
      "Wait for ai-chat-content element"
    );

    const chatContentJS = chatContent.wrappedJSObject || chatContent;
    await chatContent.updateComplete;

    // Simulate receiving tool UI data from the LLM
    // This represents the state after the LLM has responded with tool information
    const messages = [
      {
        role: "user",
        body: data.userMessage,
        ordinal: 0,
        convId: "test-conv",
      },
      {
        role: "assistant",
        body: data.assistantMessage,
        ordinal: 1,
        convId: "test-conv",
        messageId: data.messageId,
        appliedMemories: [],
        isLastChunk: true,
        toolUIData: data.toolUIData,
      },
    ];

    chatContentJS.conversationState = Cu.cloneInto(messages, content);
    await chatContent.updateComplete;
  });
}

/**
 * Test that ai-website-confirmation component renders correctly
 */
add_task(async function test_website_confirmation_renders() {
  const restoreSignIn = skipSignIn();
  const { restore } = await stubEngineNetworkBoundaries({
    serverOptions: { streamChunks: ["Please confirm which tabs to close."] },
  });
  const win = await openAIWindow();

  try {
    const browser = win.gBrowser.selectedBrowser;
    const aichatBrowser = await getAichatBrowser(browser);

    // Set up conversation with website confirmation UI
    await setupConversationWithToolUI(aichatBrowser, {
      userMessage: "Close some tabs",
      assistantMessage: "Please confirm which tabs to close.",
      messageId: "msg-123",
      toolUIData: {
        toolCallId: "tool-123",
        uiType: "website-confirmation",
        properties: {
          tabs: [
            {
              linkedPanel: "panel-1",
              url: "https://example.com",
              title: "Example Site",
              iconSrc: "chrome://branding/content/icon16.png",
              checked: true,
            },
            {
              linkedPanel: "panel-2",
              url: "https://mozilla.org",
              title: "Mozilla",
              iconSrc: "chrome://branding/content/icon16.png",
              checked: false,
            },
          ],
        },
      },
    });

    // Verify the confirmation UI renders
    await SpecialPowers.spawn(aichatBrowser, [], async () => {
      const chatContent = content.document.querySelector("ai-chat-content");

      await ContentTaskUtils.waitForCondition(
        () => chatContent.shadowRoot.querySelector("ai-website-confirmation"),
        "Wait for ai-website-confirmation to render"
      );

      const confirmation = chatContent.shadowRoot.querySelector(
        "ai-website-confirmation"
      );
      Assert.ok(
        confirmation,
        "ai-website-confirmation component should be rendered"
      );

      // Verify it's in the correct location
      const parent = confirmation.parentElement;
      Assert.ok(
        parent?.classList.contains("chat-bubble-assistant"),
        "ai-website-confirmation should be inside assistant message bubble"
      );
    });
  } finally {
    await BrowserTestUtils.closeWindow(win);
    restoreSignIn();
    await restore();
  }
});

/**
 * Test that ai-action-result renders for closed tabs
 */
add_task(async function test_action_result_renders_for_closed_tabs() {
  const restoreSignIn = skipSignIn();
  const { restore } = await stubEngineNetworkBoundaries({
    serverOptions: { streamChunks: ["I've closed those tabs for you."] },
  });
  const win = await openAIWindow();

  try {
    const browser = win.gBrowser.selectedBrowser;
    const aichatBrowser = await getAichatBrowser(browser);

    // Set up conversation with action result for closed tabs
    await setupConversationWithToolUI(aichatBrowser, {
      userMessage: "Close the example and mozilla tabs",
      assistantMessage: "I've closed those tabs for you.",
      messageId: "msg-456",
      toolUIData: {
        toolCallId: "tool-456",
        uiType: "ai-action-result",
        properties: {
          confirmedData: {
            selectedTabs: [
              {
                linkedPanel: "panel-1",
                url: "https://example.com",
                title: "Example Site",
              },
              {
                linkedPanel: "panel-2",
                url: "https://mozilla.org",
                title: "Mozilla",
              },
            ],
            operationId: "op-123",
            requestedCount: 2,
            failedTabs: [],
          },
        },
      },
    });

    // Verify the action result renders
    await SpecialPowers.spawn(aichatBrowser, [], async () => {
      const chatContent = content.document.querySelector("ai-chat-content");

      await ContentTaskUtils.waitForCondition(
        () => chatContent.shadowRoot.querySelector("ai-action-result"),
        "Wait for ai-action-result to render"
      );

      const actionResult =
        chatContent.shadowRoot.querySelector("ai-action-result");
      Assert.ok(actionResult, "ai-action-result component should be rendered");

      // Verify location
      const parent = actionResult.parentElement;
      Assert.ok(
        parent?.classList.contains("chat-bubble-assistant"),
        "ai-action-result should be inside assistant message bubble"
      );
    });
  } finally {
    await BrowserTestUtils.closeWindow(win);
    restoreSignIn();
    await restore();
  }
});

/**
 * Test that ai-action-result renders for restored tabs
 */
add_task(async function test_action_result_renders_for_restored_tabs() {
  const restoreSignIn = skipSignIn();
  const { restore } = await stubEngineNetworkBoundaries({
    serverOptions: { streamChunks: ["I've restored the tabs."] },
  });
  const win = await openAIWindow();

  try {
    const browser = win.gBrowser.selectedBrowser;
    const aichatBrowser = await getAichatBrowser(browser);

    // Set up conversation with restored tabs result
    await setupConversationWithToolUI(aichatBrowser, {
      userMessage: "Undo close tabs",
      assistantMessage: "I've restored the tabs.",
      messageId: "msg-789",
      toolUIData: {
        toolCallId: "tool-789",
        uiType: "ai-action-result",
        properties: {
          confirmedData: {
            wasRestored: true,
            restoredCount: 2,
            originalClosedTabs: [
              {
                linkedPanel: "panel-1",
                url: "https://example.com",
                title: "Example Site",
              },
              {
                linkedPanel: "panel-2",
                url: "https://mozilla.org",
                title: "Mozilla",
              },
            ],
          },
        },
      },
    });

    // Verify the restored action result renders
    await SpecialPowers.spawn(aichatBrowser, [], async () => {
      const chatContent = content.document.querySelector("ai-chat-content");

      await ContentTaskUtils.waitForCondition(
        () => chatContent.shadowRoot.querySelector("ai-action-result"),
        "Wait for ai-action-result for restored tabs"
      );

      const actionResult =
        chatContent.shadowRoot.querySelector("ai-action-result");
      Assert.ok(
        actionResult,
        "ai-action-result should be rendered for restored tabs"
      );

      // Verify it's in the assistant bubble
      const parent = actionResult.parentElement;
      Assert.ok(
        parent?.classList.contains("chat-bubble-assistant"),
        "ai-action-result should be inside assistant message bubble"
      );
    });
  } finally {
    await BrowserTestUtils.closeWindow(win);
    restoreSignIn();
    await restore();
  }
});

/**
 * Test that confirmation UI can dispatch submit events that bubble correctly
 */
add_task(async function test_confirmation_events_bubble_correctly() {
  const restoreSignIn = skipSignIn();
  const { restore } = await stubEngineNetworkBoundaries({
    serverOptions: { streamChunks: ["Please confirm the tabs to close."] },
  });
  const win = await openAIWindow();

  try {
    const browser = win.gBrowser.selectedBrowser;
    const aichatBrowser = await getAichatBrowser(browser);

    // Set up conversation with confirmation UI
    await setupConversationWithToolUI(aichatBrowser, {
      userMessage: "Close tabs",
      assistantMessage: "Please confirm the tabs to close.",
      messageId: "msg-confirm",
      toolUIData: {
        toolCallId: "tool-confirm",
        uiType: "website-confirmation",
        properties: {
          tabs: [
            {
              linkedPanel: "panel-1",
              url: "https://example.com",
              title: "Example",
              checked: true,
            },
          ],
        },
      },
    });

    // Test event dispatch and bubbling
    await SpecialPowers.spawn(aichatBrowser, [], async () => {
      const chatContent = content.document.querySelector("ai-chat-content");

      await ContentTaskUtils.waitForCondition(
        () => chatContent.shadowRoot.querySelector("ai-website-confirmation"),
        "Wait for confirmation component"
      );

      const confirmation = chatContent.shadowRoot.querySelector(
        "ai-website-confirmation"
      );
      Assert.ok(confirmation, "Confirmation component should exist");

      // Set up event listeners to verify bubbling
      let eventBubbledToChatContent = false;
      let eventBubbledToDocument = false;
      let receivedDetail = null;

      // Add listener on chat-content element
      const chatContentHandler = event => {
        eventBubbledToChatContent = true;
        receivedDetail = event.detail;
      };
      chatContent.addEventListener(
        "ai-website-confirmation:submit",
        chatContentHandler,
        { once: true }
      );

      // Add listener on document
      const documentHandler = () => {
        eventBubbledToDocument = true;
      };
      content.document.addEventListener(
        "ai-website-confirmation:submit",
        documentHandler,
        { once: true }
      );

      // Create and dispatch the submit event
      const expectedTabs = [
        {
          linkedPanel: "panel-1",
          url: "https://example.com",
          title: "Example",
        },
      ];

      const submitEvent = new content.CustomEvent(
        "ai-website-confirmation:submit",
        {
          bubbles: true,
          composed: true,
          detail: {
            selectedTabs: expectedTabs,
          },
        }
      );

      // Dispatch the event
      confirmation.dispatchEvent(submitEvent);

      // Give event time to bubble (synchronous but just to be safe)
      await new Promise(resolve => content.setTimeout(resolve, 0));

      // Verify event bubbled correctly
      Assert.ok(
        eventBubbledToChatContent,
        "Submit event should bubble to ai-chat-content"
      );

      Assert.ok(
        eventBubbledToDocument,
        "Submit event should bubble to document"
      );

      Assert.ok(
        receivedDetail && receivedDetail.selectedTabs,
        "Event detail should contain selectedTabs"
      );

      Assert.equal(
        receivedDetail.selectedTabs.length,
        1,
        "Should have one selected tab"
      );

      Assert.equal(
        receivedDetail.selectedTabs[0].url,
        "https://example.com",
        "Selected tab should have correct URL"
      );

      // Clean up listeners (in case they didn't fire)
      chatContent.removeEventListener(
        "ai-website-confirmation:submit",
        chatContentHandler
      );
      content.document.removeEventListener(
        "ai-website-confirmation:submit",
        documentHandler
      );
    });
  } finally {
    await BrowserTestUtils.closeWindow(win);
    restoreSignIn();
    await restore();
  }
});
