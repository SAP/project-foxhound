/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the Smartbar integration in the Smart Window.
 *
 * These tests focus on the Smartbar integration with the Smart Window rather
 * than covering Smartbar functionality itself in depth.
 */

"use strict";

add_setup(async function () {
  // Prevent network requests for remote search suggestions during testing.
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
    ],
  });

  const fakeIntentEngine = {
    run({ args: [[query]] }) {
      const searchKeywords = ["search", "find", "look up"];
      const navigateKeywords = ["https://", "www.", ".com"];
      const formattedPrompt = query.toLowerCase();

      const isSearch = searchKeywords.some(keyword =>
        formattedPrompt.includes(keyword)
      );
      const isNavigate = navigateKeywords.some(keyword =>
        formattedPrompt.includes(keyword)
      );

      if (isNavigate) {
        return [
          { label: "navigate", score: 0.95 },
          { label: "chat", score: 0.05 },
        ];
      }
      if (isSearch) {
        return [
          { label: "search", score: 0.95 },
          { label: "chat", score: 0.05 },
        ];
      }
      return [
        { label: "chat", score: 0.95 },
        { label: "search", score: 0.05 },
      ];
    },
  };

  gIntentEngineStub.resolves(fakeIntentEngine);
});

/**
 * Dispatch a `smartbar-commit` event.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {string} value - The value to submit
 * @param {string} action - The action type
 */
async function dispatchSmartbarCommit(browser, value, action) {
  await SpecialPowers.spawn(browser, [value, action], async (val, act) => {
    const aiWindowElement = content.document.querySelector("ai-window");

    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    const commitEvent = new content.CustomEvent("smartbar-commit", {
      detail: {
        value: val,
        action: act,
      },
      bubbles: true,
      composed: true,
    });

    smartbar.ownerDocument.dispatchEvent(commitEvent);
  });
}

add_task(async function test_smartbar_submit_chat() {
  const sb = this.sinon.createSandbox();

  try {
    const fetchWithHistoryStub = sb.stub(this.Chat, "fetchWithHistory");
    // prevent title generation network requests
    sb.stub(this.openAIEngine, "build").resolves({});
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await dispatchSmartbarCommit(browser, "Test prompt", "chat");
    await TestUtils.waitForCondition(
      () => fetchWithHistoryStub.calledOnce,
      "Should call fetchWithHistory once"
    );

    const conversation = fetchWithHistoryStub.firstCall.args[0].conversation;
    const messages = conversation.getMessagesInOpenAiFormat();
    const userMessage = messages.findLast(message => message.role === "user");

    Assert.equal(
      userMessage.content,
      "Test prompt",
      "Should submit correct value"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(async function test_smartbar_action_navigate() {
  const sb = this.sinon.createSandbox();

  try {
    const fetchWithHistoryStub = sb.stub(this.Chat, "fetchWithHistory");
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const loaded = BrowserTestUtils.browserLoaded(
      browser,
      false,
      "https://example.com/"
    );

    await typeInSmartbar(browser, "https://example.com/");
    await submitSmartbar(browser);

    await loaded;

    Assert.ok(
      !fetchWithHistoryStub.called,
      "fetchWithHistory should not be called for navigate action"
    );

    Assert.equal(
      browser.currentURI.spec,
      "https://example.com/",
      "Browser should navigate to the correct URL"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(async function test_smartbar_explicit_navigate_action() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const testURL = "https://example.org/";
  const loaded = BrowserTestUtils.browserLoaded(browser, false, testURL);

  await typeInSmartbar(browser, testURL);
  await selectExplicitSmartbarAction(browser, "navigate");

  await loaded;
  Assert.equal(
    browser.currentURI.spec,
    testURL,
    "Browser should navigate to the correct URL with explicit navigation"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_explicit_search_action() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const searchQuery = "tell me about cats";

  await stubLoadURL(browser, { captureURL: true });
  await typeInSmartbar(browser, searchQuery);
  await selectExplicitSmartbarAction(browser, "search");

  const searchResult = await getStubLoadURLResult(browser);
  Assert.ok(
    searchResult.called,
    "_loadURL should get called for explicit search action"
  );
  Assert.ok(
    searchResult.url.includes("cats"),
    `Search URL should contain the query: ${searchResult.url}`
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_empty_submit() {
  const sb = this.sinon.createSandbox();

  try {
    const fetchWithHistoryStub = sb.stub(this.Chat, "fetchWithHistory");
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await dispatchSmartbarCommit(browser, "", "chat");

    Assert.ok(
      !fetchWithHistoryStub.called,
      "fetchWithHistoryStub should not be called for empty prompts"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(async function test_smartbar_runs_search_for_initial_prompt() {
  const sb = this.sinon.createSandbox();

  try {
    sb.stub(this.Chat, "fetchWithHistory");
    sb.stub(this.openAIEngine, "build");

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    const aiWindowElement =
      browser.contentWindow.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );

    const lastSearchBefore = smartbar._lastSearchString;
    await typeInSmartbar(browser, "Initial prompt");
    const lastSearchAfter = smartbar._lastSearchString;

    Assert.notEqual(
      lastSearchBefore,
      lastSearchAfter,
      "_lastSearchString should change when search runs for initial prompt"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(async function test_smartbar_suppresses_search_for_followup_prompts() {
  const sb = this.sinon.createSandbox();

  try {
    sb.stub(this.Chat, "fetchWithHistory");
    sb.stub(this.openAIEngine, "build");

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const prompt = "Follow-up prompt";
    await typeInSmartbar(browser, prompt);
    await dispatchSmartbarCommit(browser, prompt, "chat");
    const aiWindowElement =
      browser.contentWindow.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );

    const lastSearchBefore = smartbar._lastSearchString;
    await typeInSmartbar(browser, prompt);
    const lastSearchAfter = smartbar._lastSearchString;

    Assert.equal(
      lastSearchBefore,
      lastSearchAfter,
      "_lastSearchString should not change when queries are suppressed"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(async function test_smartbar_can_submit_followup_prompts() {
  const sb = this.sinon.createSandbox();

  try {
    const fetchWithHistoryStub = sb.stub(this.Chat, "fetchWithHistory");
    // prevent title generation network requests
    sb.stub(this.openAIEngine, "build").resolves({});
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const intialPrompt = "First prompt";
    await typeInSmartbar(browser, intialPrompt);
    await submitSmartbar(browser);

    const followupPrompt = "Follow-up prompt";
    await typeInSmartbar(browser, followupPrompt);
    await submitSmartbar(browser);

    const conversation = fetchWithHistoryStub.firstCall.args[0].conversation;
    const messages = conversation.getMessagesInOpenAiFormat();
    const initialUserMessage = messages.find(
      message => message.content === intialPrompt
    );
    Assert.equal(
      initialUserMessage.content,
      intialPrompt,
      "Should submit correct value"
    );
    const followupUserMessage = messages.find(
      message => message.content === followupPrompt
    );
    Assert.equal(
      followupUserMessage.content,
      followupPrompt,
      "Should submit correct value"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(async function test_smartbar_cleared_after_chat_action() {
  const sb = this.sinon.createSandbox();

  try {
    sb.stub(this.Chat, "fetchWithHistory");
    // prevent title generation network requests
    sb.stub(this.openAIEngine, "build").resolves({});
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    const aiWindowElement =
      browser.contentWindow.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const intialPrompt = "First prompt";
    await typeInSmartbar(browser, intialPrompt);
    Assert.equal(smartbar.value, intialPrompt, "Smartbar should have value");

    await submitSmartbar(browser);
    Assert.equal(smartbar.value, "", "Smartbar should be cleared");

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(async function test_smartbar_cleared_after_search_action() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const searchQuery = "search for cats";

  await stubLoadURL(browser);
  await typeInSmartbar(browser, searchQuery);
  await waitForSmartbarAction(browser, "search");
  await assertSmartbarValue(browser, searchQuery, "Smartbar should have value");

  await submitSmartbar(browser, { useButton: true });
  await assertSmartbarValue(browser, "", "Smartbar should be cleared");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_cleared_after_navigate_action() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const testURL = "https://example.org/";

  await stubLoadURL(browser);
  await typeInSmartbar(browser, testURL);
  await waitForSmartbarAction(browser, "navigate");
  await assertSmartbarValue(browser, testURL, "Smartbar should have value");

  await submitSmartbar(browser);
  await assertSmartbarValue(browser, "", "Smartbar should be cleared");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_max_length_is_set() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const maxLength = await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    await ContentTaskUtils.waitForMutationCondition(
      aiWindowElement.shadowRoot,
      { childList: true, subtree: true },
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar")
    );
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const editor = smartbar.querySelector("moz-multiline-editor");
    await ContentTaskUtils.waitForMutationCondition(
      editor,
      { attributes: true },
      () => editor.maxLength > 0
    );

    return editor.maxLength;
  });

  // 32k is the MAX_INPUT_LENGTH from SmartbarInput.mjs
  Assert.equal(
    maxLength,
    32000,
    "Smartbar editor should have maxLength set to 32000"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_sidebar_element_order() {
  const { win, sidebarBrowser } = await openAIWindowWithSidebar();

  await SpecialPowers.spawn(sidebarBrowser, [], async () => {
    const aiWindow = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("ai-window"),
      "Wait for ai-window element"
    );
    const root = aiWindow.shadowRoot;

    const prompts = await ContentTaskUtils.waitForCondition(
      () => root.querySelector("smartwindow-prompts"),
      "Wait for smartwindow-prompts"
    );
    const smartbarSlot = await ContentTaskUtils.waitForCondition(
      () => root.querySelector("#smartbar-slot"),
      "Wait for #smartbar-slot"
    );

    Assert.ok(
      prompts.compareDocumentPosition(smartbarSlot) &
        content.Node.DOCUMENT_POSITION_FOLLOWING,
      "smartbar-slot should follow smartwindow-prompts in sidebar DOM order"
    );
  });

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_fullpage_element_order() {
  const win = await openAIWindow();

  await SpecialPowers.spawn(win.gBrowser.selectedBrowser, [], async () => {
    const aiWindow = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("ai-window"),
      "Wait for ai-window element"
    );
    const root = aiWindow.shadowRoot;

    const prompts = await ContentTaskUtils.waitForCondition(
      () => root.querySelector("smartwindow-prompts"),
      "Wait for smartwindow-prompts"
    );
    const smartbarSlot = await ContentTaskUtils.waitForCondition(
      () => root.querySelector("#smartbar-slot"),
      "Wait for #smartbar-slot"
    );

    Assert.ok(
      smartbarSlot.compareDocumentPosition(prompts) &
        content.Node.DOCUMENT_POSITION_FOLLOWING,
      "smartwindow-prompts should follow smartbar-slot in fullpage DOM order"
    );
  });

  await BrowserTestUtils.closeWindow(win);
});
