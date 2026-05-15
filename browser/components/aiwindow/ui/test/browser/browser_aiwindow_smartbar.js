/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the Smartbar integration in the Smart Window.
 *
 * These tests focus on the Smartbar integration with the Smart Window rather
 * than covering Smartbar functionality itself in depth.
 */

"use strict";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  IntentClassifier:
    "moz-src:///browser/components/aiwindow/models/IntentClassifier.sys.mjs",
});

let gIntentEngineStub;

add_setup(async function () {
  // Prevent network requests for remote search suggestions during testing.
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
    ],
  });
});

/**
 * Submit the smartbar by pressing Enter.
 *
 * @param {MozBrowser} browser - The browser element
 */
async function submitSmartbar(browser) {
  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const inputField = smartbar.inputField;
    inputField.focus();
    EventUtils.synthesizeKey("KEY_Enter", {}, content);
  });
}

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

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.search.suggest.enabled", false]],
  });

  const fakeIntentEngine = {
    run({ args: [[query]] }) {
      const searchKeywords = ["search", "hello"];
      const formattedPrompt = query.toLowerCase();
      const isSearch = searchKeywords.some(keyword =>
        formattedPrompt.includes(keyword)
      );

      // Simulate model confidence scores
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

  gIntentEngineStub = sinon
    .stub(lazy.IntentClassifier, "_createEngine")
    .resolves(fakeIntentEngine);
  registerCleanupFunction(() => {
    sinon.restore();
  });
});

add_task(async function test_smartbar_submit_chat() {
  const sb = this.sinon.createSandbox();

  try {
    const fetchWithHistoryStub = sb.stub(this.Chat, "fetchWithHistory");
    // prevent title generation network requests
    sb.stub(this.openAIEngine, "build").resolves({
      loadPrompt: () => Promise.resolve("Mock system prompt"),
    });
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);
    await dispatchSmartbarCommit(browser, "Test prompt", "chat");
    await TestUtils.waitForTick();

    Assert.ok(
      fetchWithHistoryStub.calledOnce,
      "Should call fetchWithHistory once"
    );

    const conversation = fetchWithHistoryStub.firstCall.args[0];
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

    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

    const loaded = BrowserTestUtils.browserLoaded(
      browser,
      false,
      "https://example.com/"
    );

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );
      smartbar.value = "https://example.com/";
      smartbar.smartbarAction = "navigate";
      smartbar.handleNavigation({});
    });

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

  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

  const testURL = "https://example.org/";
  const loaded = BrowserTestUtils.browserLoaded(browser, false, testURL);
  await SpecialPowers.spawn(browser, [testURL], async url => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );

    smartbar.value = url;
    smartbar.smartbarAction = "navigate";
    smartbar.smartbarActionIsUserInitiated = true;
    smartbar.handleNavigation({});
  });

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

  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

  const searchQuery = "Test";
  const searchResult = await SpecialPowers.spawn(
    browser,
    [searchQuery],
    async query => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = await ContentTaskUtils.waitForCondition(
        () => aiWindowElement.shadowRoot.querySelector("#ai-window-smartbar"),
        "Wait for Smartbar to be rendered"
      );

      let loadURLCalled = false;
      let loadedURL = null;
      // TODO (Bug 2016696): Ideally, we would use Sinon here to stub `_loadURL`.
      // I did not have success getting it to work with the Smartbar inside of
      // `SpecialPowers.spawn` here.
      smartbar._loadURL = url => {
        loadURLCalled = true;
        loadedURL = url;
      };

      smartbar.value = query;
      smartbar.smartbarAction = "search";
      smartbar.smartbarActionIsUserInitiated = true;
      smartbar.handleNavigation({});

      return {
        loadURLCalled,
        loadedURL,
      };
    }
  );

  Assert.ok(
    searchResult.loadURLCalled,
    "_loadURL should get called for explicit search action"
  );
  Assert.ok(
    searchResult.loadedURL.includes(searchQuery),
    `Search URL should contain the query: ${searchResult.loadedURL}`
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_empty_submit() {
  const sb = this.sinon.createSandbox();

  try {
    const fetchWithHistoryStub = sb.stub(this.Chat, "fetchWithHistory");
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);
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

add_task(async function test_smartbar_cta_default_search_engine_label() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

  const defaultSearchEngineInfo = await SpecialPowers.spawn(
    browser,
    [],
    async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );
      const inputCta = smartbar.querySelector("input-cta");
      await ContentTaskUtils.waitForMutationCondition(
        inputCta,
        { attributes: true, subtree: true },
        () => inputCta.searchEngineInfo.name
      );
      const searchEngineName = inputCta.searchEngineInfo.name;
      inputCta.action = "search";
      await inputCta.updateComplete;
      const searchLabel = await content.document.l10n.formatValue(
        "aiwindow-input-cta-menu-label-search",
        { searchEngineName }
      );

      return {
        name: searchEngineName,
        hasIcon: !!inputCta.searchEngineInfo.icon,
        searchLabel,
      };
    }
  );

  Assert.ok(defaultSearchEngineInfo.name, "Search engine name should be set");
  Assert.ok(
    defaultSearchEngineInfo.hasIcon,
    "Search engine icon should be set"
  );
  Assert.equal(
    defaultSearchEngineInfo.searchLabel,
    `Search with ${defaultSearchEngineInfo.name}`,
    `Search label should include engine name: [${defaultSearchEngineInfo.searchLabel}]`
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_cta_intent() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const inputCta = smartbar.querySelector("input-cta");
    const TEST_QUERIES = [
      { query: "Search for weather", expectedAction: "search" },
      { query: "Hello, how are you?", expectedAction: "chat" },
      { query: "mozilla.com", expectedAction: "navigate" },
    ];
    for (const { query, expectedAction } of TEST_QUERIES) {
      smartbar.focus();

      info("Waiting for action to update to " + expectedAction);
      let mutate = ContentTaskUtils.waitForMutationCondition(
        inputCta,
        { attributes: true, subtree: true },
        () => inputCta.action == expectedAction
      );
      EventUtils.sendString(query, content);
      info("Backspace the whole string to reset the state for the next query.");
      smartbar.setSelectionRange(0, query.length);
      mutate = ContentTaskUtils.waitForMutationCondition(
        inputCta,
        { attributes: true, subtree: true },
        () => inputCta.action == ""
      );
      EventUtils.sendKey("BACK_SPACE", content);
      await mutate;
    }
  });

  await BrowserTestUtils.closeWindow(win);
});

add_task(
  async function test_smartbar_shows_suggestions_on_input_below_in_fullpage() {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);
    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, "test")
    );
    await assertSmartbarSuggestionsVisible(browser, true, "bottom");

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(
  async function test_smartbar_shows_suggestions_on_input_above_in_sidebar() {
    const win = await openAIWindow();
    AIWindowUI.toggleSidebar(win);
    const browser = win.document.getElementById("ai-window-browser");

    await BrowserTestUtils.waitForCondition(
      () => browser.contentDocument.querySelector("ai-window"),
      "Sidebar ai-window should be loaded"
    );

    const sidebarAIWindow = browser.contentDocument.querySelector("ai-window");
    await BrowserTestUtils.waitForCondition(
      () => sidebarAIWindow.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Sidebar smartbar should be rendered"
    );

    const smartbar = sidebarAIWindow.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );

    await promiseSmartbarSuggestionsOpen(browser, async () => {
      smartbar.value = "test";
      smartbar.startQuery({ searchString: "test" });
      await smartbar.lastQueryContextPromise;
    });

    Assert.ok(smartbar.view.isOpen, "Suggestions view should be open");
    Assert.equal(
      smartbar.getAttribute("suggestions-position"),
      "top",
      "Suggestions position should be: top"
    );

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(
  async function test_smartbar_hides_suggestions_on_submitting_initial_prompt() {
    const sb = this.sinon.createSandbox();

    try {
      sb.stub(this.Chat, "fetchWithHistory");
      sb.stub(this.openAIEngine, "build");

      const win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;

      await promiseSmartbarSuggestionsOpen(browser, () =>
        typeInSmartbar(browser, "test")
      );
      await assertSmartbarSuggestionsVisible(browser, true);
      await submitSmartbar(browser);
      await promiseSmartbarSuggestionsClose(browser);
      await assertSmartbarSuggestionsVisible(browser, false);

      await BrowserTestUtils.closeWindow(win);
    } finally {
      sb.restore();
    }
  }
);

add_task(async function test_smartbar_runs_search_for_initial_prompt() {
  const sb = this.sinon.createSandbox();

  try {
    sb.stub(this.Chat, "fetchWithHistory");
    sb.stub(this.openAIEngine, "build");

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);
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
    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

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
    sb.stub(this.openAIEngine, "build").resolves({
      loadPrompt: () => Promise.resolve("Mock system prompt"),
    });
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const intialPrompt = "First prompt";
    await typeInSmartbar(browser, intialPrompt);
    await submitSmartbar(browser);

    const followupPrompt = "Follow-up prompt";
    await typeInSmartbar(browser, followupPrompt);
    await submitSmartbar(browser);

    const conversation = fetchWithHistoryStub.firstCall.args[0];
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
    sb.stub(this.openAIEngine, "build").resolves({
      loadPrompt: () => Promise.resolve("Mock system prompt"),
    });
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

  const searchQuery = "Test";
  const aiWindowElement =
    browser.contentWindow.document.querySelector("ai-window");
  const smartbar = aiWindowElement.shadowRoot.querySelector(
    "#ai-window-smartbar"
  );

  smartbar.value = searchQuery;
  Assert.equal(smartbar.value, searchQuery, "Smartbar should have value");
  smartbar.smartbarAction = "search";
  smartbar.smartbarActionIsUserInitiated = true;
  smartbar.handleNavigation({});

  Assert.equal(smartbar.value, "", "Smartbar should be cleared");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_cleared_after_navigate_action() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const testURL = "https://example.org/";
  const aiWindowElement =
    browser.contentWindow.document.querySelector("ai-window");
  const smartbar = aiWindowElement.shadowRoot.querySelector(
    "#ai-window-smartbar"
  );
  smartbar.value = testURL;
  Assert.equal(smartbar.value, testURL, "Smartbar should have value");
  smartbar.smartbarAction = "navigate";
  smartbar.smartbarActionIsUserInitiated = true;
  smartbar.handleNavigation({});

  Assert.equal(smartbar.value, "", "Smartbar should be cleared");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_click_on_suggestion_is_registered() {
  const sb = this.sinon.createSandbox();

  try {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, "test")
    );

    // TODO (Bug 2016696): `SpecialPowers.spawn` would be more reliable and is
    // preferred over accessing content via cross-process wrappers like
    // `browser.contentWindow`.
    const aiWindowElement =
      browser.contentWindow.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const pickElementStub = sb.stub(smartbar, "pickElement");
    const firstSuggestion = smartbar.querySelector(".urlbarView-row");

    EventUtils.synthesizeMouseAtCenter(
      firstSuggestion,
      {},
      browser.contentWindow
    );

    Assert.ok(
      pickElementStub.calledOnce,
      "pickElement should be called when clicking a suggestion"
    );
    pickElementStub.restore();

    await BrowserTestUtils.closeWindow(win);
  } catch (error) {
    sb.restore();
  }
});

add_task(async function test_smartbar_click_on_suggestion_navigates() {
  const sb = sinon.createSandbox();

  try {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const testUrl = "https://example.com/";
    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, testUrl)
    );

    const aiWindowElement =
      browser.contentWindow.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const loadURLStub = sb.stub(smartbar, "_loadURL");
    const firstSuggestion = smartbar.querySelector(".urlbarView-row");

    EventUtils.synthesizeMouseAtCenter(
      firstSuggestion,
      {},
      browser.contentWindow
    );

    Assert.ok(
      loadURLStub.calledOnce,
      "_loadURL should be called when clicking a suggestion"
    );
    Assert.equal(
      loadURLStub.firstCall.args[0],
      testUrl,
      "Should navigate to the test URL"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});
