/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
  AIWindowUI:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs",
  AIWindowAccountAuth:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowAccountAuth.sys.mjs",
  Chat: "moz-src:///browser/components/aiwindow/models/Chat.sys.mjs",
  ChatConversation:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs",
  getModelForChoice:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowConstants.sys.mjs",
  IntentClassifier:
    "moz-src:///browser/components/aiwindow/models/IntentClassifier.sys.mjs",
  openAIEngine: "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs",
  SessionStore: "resource:///modules/sessionstore/SessionStore.sys.mjs",
  SessionWindowUI: "resource:///modules/sessionstore/SessionWindowUI.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

/**
 * @import { SmartbarAction } from "chrome://browser/content/aiwindow/components/input-cta/input-cta.mjs"
 */

async function modelFor(choiceId) {
  return (await getModelForChoice(choiceId)).model;
}

const AIWINDOW_URL = "chrome://browser/content/aiwindow/aiWindow.html";

let gIntentEngineStub;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", true],
      ["browser.smartwindow.chat.interactionCount", 0],
    ],
  });

  // Stub intent engine so it doesn't attempt network requests
  const fakeIntentEngine = {
    run() {
      return [
        { label: "chat", score: 0.95 },
        { label: "search", score: 0.05 },
      ];
    },
  };
  gIntentEngineStub = sinon
    .stub(IntentClassifier, "_createEngine")
    .resolves(fakeIntentEngine);
  registerCleanupFunction(() => gIntentEngineStub.restore());
});

/**
 * Opens a new AI Window
 *
 * @param {object} options
 * @param {string|boolean} options.waitForTabURL - URL to wait for or false to skip waiting
 * @returns {Promise<Window>}
 */
async function openAIWindow({ waitForTabURL = AIWINDOW_URL } = {}) {
  info("Opening new AI Window");
  const win = await BrowserTestUtils.openNewBrowserWindow({
    aiWindow: true,
    waitForTabURL,
  });
  info("Waiting for AI window attr");
  await BrowserTestUtils.waitForMutationCondition(
    win.document.documentElement,
    { attributes: true },
    () => win.document.documentElement.hasAttribute("ai-window")
  );
  info("Promising focus");
  await SimpleTest.promiseFocus(win);
  return win;
}

/**
 * Opens a new AI Window with about:blank
 * and the chat assistant sidebar open
 *
 * @returns {Promise<{win: Window, sidebarBrowser: MozBrowser}>}
 */
async function openAIWindowWithSidebar() {
  const win = await openAIWindow();
  BrowserTestUtils.startLoadingURIString(
    win.gBrowser.selectedBrowser,
    "about:blank"
  );
  await BrowserTestUtils.browserLoaded(win.gBrowser.selectedBrowser, {
    wantLoad: "about:blank",
  });
  if (!AIWindowUI.isSidebarOpen(win)) {
    info("Opening sidebar");
    AIWindowUI.toggleSidebar(win);
  }
  const sidebarBrowser = win.document.getElementById("ai-window-browser");
  await BrowserTestUtils.waitForCondition(
    () => sidebarBrowser.contentDocument?.querySelector("ai-window:defined"),
    "Sidebar ai-window should be loaded"
  );
  return { win, sidebarBrowser };
}

/**
 * NOTE: If using to navigate to https://example.com/ make sure
 * to use a trailing slash in the URL or this function will hang.
 *
 * @param {MozBrowser} browser
 * @param {string} url
 */
function promiseNavigateAndLoad(browser, url) {
  let loaded = BrowserTestUtils.browserLoaded(browser, {
    wantLoad: url,
  });
  BrowserTestUtils.startLoadingURIString(browser, url);
  return loaded;
}

async function getPromptButtons(browser) {
  const aiWindow = await TestUtils.waitForCondition(
    () => browser.contentDocument?.querySelector("ai-window"),
    "Wait for ai-window element"
  );
  const promptsEl = await TestUtils.waitForCondition(
    () => aiWindow.shadowRoot.querySelector("smartwindow-prompts"),
    "Wait for smartwindow-prompts element"
  );
  return promptsEl.shadowRoot.querySelectorAll(".sw-prompt-button");
}

async function getConversationId(browser) {
  const aiWindow = await TestUtils.waitForCondition(
    () => browser.contentDocument?.querySelector("ai-window"),
    "Wait for ai-window element"
  );
  return aiWindow.conversationId.toString();
}

/**
 * @typedef {object} EngineRunResponse
 * @property {string} [finalOutput] - The text content returned by the mock
 *   engine's run() method. Used by non-chat features like title generation.
 */

/**
 * @typedef {object} StubEngineNetworkBoundariesConfig
 * @property {Set<string>} [passthroughFeatures] - Feature names that use the
 *   real openAIEngine.build (going through RemoteSettings, ML engine creation,
 *   and the mock HTTP server). All other features get a mock engine that
 *   resolves immediately. Defaults to new Set(["chat"]).
 * @property {string} [fxAccountToken] - Value that the stubbed
 *   getFxAccountToken resolves with. Defaults to "mock-fxa-token".
 * @property {EngineRunResponse} [engineRunResponse] - What the mock engine's
 *   run() resolves with for non-passthrough features. Defaults to
 *   { finalOutput: "Mock" }.
 * @property {MockOpenAIServerOptions|null} [serverOptions] - Options passed
 *   to startMockOpenAI. When non-null, a mock server is started and the
 *   endpoint pref is pushed so passthrough features route to it. Defaults to
 *   {} which starts a server with startMockOpenAI defaults (single-chunk
 *   "Hello from mock." stream). Pass null to skip starting a server.
 */

/**
 * @typedef {object} StubEngineNetworkBoundariesResult
 * @property {Function} restore - Async cleanup function that restores all
 *   stubs, pops the endpoint pref, and stops the mock server.
 * @property {number|null} port - The mock server's port number, or null when
 *   no server was started.
 * @property {Array<object>} capturedRequests - Array that collects every
 *   parsed request body sent to the mock server. Empty when no server was
 *   started. Mutate .length = 0 to clear between phases of a test.
 */

/**
 * Stubs openAIEngine.build and openAIEngine.getFxAccountToken so that
 * background async operations (title generation, conversation starters, etc.)
 * resolve immediately instead of going through RemoteSettings / ML engine
 * creation / FxA token fetching. Without this, fire-and-forget calls like
 * #addConversationTitle() can leave suspended async chains that prevent
 * window GC, causing leaked-window failures under --verify.
 *
 * Features listed in passthroughFeatures still use the real build path
 * (e.g. "chat" needs to hit the mock HTTP server).
 *
 * By default starts a mock OpenAI HTTP server and pushes the endpoint pref
 * so passthrough features route to it. Pass serverOptions: null to skip.
 *
 * Call the returned async restore function to clean up stubs, pop prefs, and
 * stop the server.
 *
 * @param {StubEngineNetworkBoundariesConfig} [config]
 * @returns {Promise<StubEngineNetworkBoundariesResult>}
 */
async function stubEngineNetworkBoundaries({
  passthroughFeatures = new Set(["chat"]),
  fxAccountToken = "mock-fxa-token",
  engineRunResponse = { finalOutput: "Mock" },
  serverOptions = {},
} = {}) {
  // Save the original build before stubbing so passthrough features (e.g.
  // "chat") can still create a real engine that routes requests to the mock
  // HTTP server via RemoteSettings + EngineProcess.
  const originalBuild = openAIEngine.build.bind(openAIEngine);
  const buildStub = sinon
    .stub(openAIEngine, "build")
    .callsFake(async (feature, ...rest) => {
      if (passthroughFeatures.has(feature)) {
        return originalBuild(feature, ...rest);
      }
      // Non-passthrough features get a mock engine whose methods resolve
      // synchronously, preventing dangling async chains.
      return {
        loadPrompt: () => "",
        getConfig: () => ({}),
        feature,
        async run() {
          return engineRunResponse;
        },
      };
    });

  const tokenStub = sinon
    .stub(openAIEngine, "getFxAccountToken")
    .resolves(fxAccountToken);

  const capturedRequests = [];
  let server = null;
  let port = null;
  if (serverOptions) {
    const callerOnRequest = serverOptions.onRequest;
    ({ server, port } = startMockOpenAI({
      ...serverOptions,
      onRequest(body) {
        capturedRequests.push(body);
        callerOnRequest?.(body);
      },
    }));
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.endpoint", `http://localhost:${port}/v1`]],
    });
  }

  async function restore() {
    buildStub.restore();
    tokenStub.restore();
    if (server) {
      await SpecialPowers.popPrefEnv();
      await stopMockOpenAI(server);
    }
  }

  return { restore, port, capturedRequests };
}

/**
 * Stubs AIWindowAccountAuth.ensureAIWindowAccess to skip sign-in flow
 * Call the returned restore function to clean up the stub
 *
 * @returns {Function} restore function to clean up the stub
 */
function skipSignIn() {
  const stub = sinon
    .stub(AIWindowAccountAuth, "ensureAIWindowAccess")
    .resolves(true);
  return () => stub.restore();
}

/**
 * Clicks the New Chat button in the sidebar
 *
 * @param {Window} win
 */
async function clickNewChatButton(win) {
  const sidebarBrowser = win.document.getElementById("ai-window-browser");
  await TestUtils.waitForCondition(
    () => sidebarBrowser.contentDocument?.querySelector("ai-window:defined"),
    "Wait for ai-window to be defined in sidebar"
  );
  const aiWindow = sidebarBrowser.contentDocument.querySelector("ai-window");
  const newChatBtn = aiWindow.shadowRoot.querySelector(".new-chat-icon-button");
  newChatBtn.click();
}

/**
 * Opens the Smartbar's context menu via the "+" button and clicks the
 * panel item whose visible text matches the given label. Waits for the
 * panel to populate before selecting.
 *
 * @param {MozBrowser} sidebarBrowser - The sidebar browser element
 *   (e.g. win.document.getElementById("ai-window-browser"))
 * @param {string} label - The visible text label of the tab to select
 *   (e.g. the tab's title)
 */
async function openTabContextMenuAndClickTabByLabel(sidebarBrowser, label) {
  await SpecialPowers.spawn(sidebarBrowser, [label], async tabLabel => {
    const aiWindowElement = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("ai-window"),
      "Wait for ai-window"
    );
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar"
    );
    const contextButton = smartbar.querySelector("context-icon-button");
    const button = contextButton.shadowRoot.querySelector("moz-button");
    button.click();

    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");
    await ContentTaskUtils.waitForMutationCondition(
      panel,
      { childList: true, subtree: true },
      () => panel.querySelector("panel-item:not(.panel-section-header)")
    );

    const items = panel.querySelectorAll(
      "panel-item:not(.panel-section-header)"
    );
    let targetItem;
    for (const item of items) {
      if (item.textContent.trim() === tabLabel) {
        targetItem = item;
        break;
      }
    }
    Assert.ok(
      targetItem,
      `Should find a tab labeled '${tabLabel}' in the context menu`
    );
    targetItem.click();
  });
}

async function getSmartbarContextChipLabels(browser, expectedUrl) {
  await BrowserTestUtils.waitForCondition(
    () => browser.contentDocument?.querySelector("ai-window:defined"),
    "Sidebar ai-window should be loaded"
  );

  return SpecialPowers.spawn(browser, [expectedUrl], async url => {
    const aiWindowElement = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("ai-window"),
      "Wait for ai-window to be rendered"
    );
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    const chipContainer = await ContentTaskUtils.waitForCondition(
      () => smartbar.querySelector(".smartbar-context-chips-header"),
      "Wait for chip container to be rendered"
    );

    if (url) {
      await ContentTaskUtils.waitForCondition(
        () =>
          Array.isArray(chipContainer.websites) &&
          chipContainer.websites.some(site => site.url.includes(url)),
        `Wait for chip with URL containing "${url}"`
      );
    } else {
      await ContentTaskUtils.waitForCondition(
        () =>
          Array.isArray(chipContainer.websites) &&
          chipContainer.websites.length,
        "Wait for at least one chip"
      );
    }

    const chips = chipContainer.shadowRoot.querySelectorAll("ai-website-chip");
    const chipLabels = Array.from(chips).map(
      chip => chip.shadowRoot?.querySelector(".chip-label")?.textContent ?? ""
    );

    return chipLabels;
  });
}

/**
 * Submits the current smartbar input.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {object} [options] - Options for submission
 * @param {boolean} [options.useButton=false] - If true, submit via CTA button
 */
async function submitSmartbar(browser, { useButton = false } = {}) {
  await SpecialPowers.spawn(browser, [useButton], async clickButton => {
    const aiWindow = content.document.querySelector("ai-window");
    await ContentTaskUtils.waitForMutationCondition(
      aiWindow.shadowRoot,
      { childList: true, subtree: true },
      () => aiWindow.shadowRoot.querySelector("#ai-window-smartbar")
    );
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    if (clickButton) {
      const inputCta = smartbar.querySelector("input-cta");
      const mozButton = inputCta.shadowRoot.querySelector("moz-button");
      const button = mozButton.shadowRoot.querySelector("button");
      button.click();
    } else {
      const inputCta = smartbar.querySelector("input-cta");
      await ContentTaskUtils.waitForCondition(
        () => inputCta.getAttribute("action") !== "stop",
        "Wait for generation to complete before submitting via Enter"
      );
      const inputField = smartbar.inputField;
      inputField.focus();
      EventUtils.synthesizeKey("KEY_Enter", {}, content);
    }
  });
}

/**
 * Select an explicit action from the smartbar CTA dropdown menu.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {SmartbarAction} action - The action to select
 */
async function selectExplicitSmartbarAction(browser, action) {
  await SpecialPowers.spawn(browser, [action], async actionType => {
    const aiWindow = content.document.querySelector("ai-window");
    await ContentTaskUtils.waitForMutationCondition(
      aiWindow.shadowRoot,
      { childList: true, subtree: true },
      () => aiWindow.shadowRoot.querySelector("#ai-window-smartbar")
    );
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    const inputCta = smartbar.querySelector("input-cta");
    const mozButton = inputCta.shadowRoot.querySelector("moz-button");

    await ContentTaskUtils.waitForMutationCondition(
      mozButton.shadowRoot,
      { childList: true, subtree: true },
      () => mozButton.shadowRoot.querySelector("#chevron-button")
    );
    const chevronButton = mozButton.shadowRoot.querySelector("#chevron-button");
    const panelList = inputCta.shadowRoot.querySelector("panel-list");
    const shownPromise = ContentTaskUtils.waitForEvent(panelList, "shown");
    chevronButton.click();
    await shownPromise;

    const actionItem = panelList.querySelector(
      `panel-item[icon="${actionType}"]`
    );
    actionItem.click();
  });
}

/**
 * Wait for the smartbar action to be set.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {string} expectedAction - The expected action value
 */
async function waitForSmartbarAction(browser, expectedAction) {
  await SpecialPowers.spawn(browser, [expectedAction], async action => {
    const aiWindow = content.document.querySelector("ai-window");
    await ContentTaskUtils.waitForMutationCondition(
      aiWindow.shadowRoot,
      { childList: true, subtree: true },
      () => aiWindow.shadowRoot.querySelector("#ai-window-smartbar")
    );
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    await ContentTaskUtils.waitForCondition(
      () => smartbar.smartbarAction === action,
      `Wait for smartbar action to be "${action}"`
    );
  });
}

/**
 * Stub the smartbar method _loadURL to prevent navigation.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {object} [options] - Options for the stub
 * @param {boolean} [options.captureURL=false] - If true, capture the URL
 */
async function stubLoadURL(browser, { captureURL = false } = {}) {
  await SpecialPowers.spawn(browser, [captureURL], async capture => {
    const aiWindow = content.document.querySelector("ai-window");
    await ContentTaskUtils.waitForMutationCondition(
      aiWindow.shadowRoot,
      { childList: true, subtree: true },
      () => aiWindow.shadowRoot.querySelector("#ai-window-smartbar")
    );
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    if (capture) {
      content._stubLoadURLCalled = false;
      content._stubLoadedURL = null;
      smartbar._loadURL = url => {
        content._stubLoadURLCalled = true;
        content._stubLoadedURL = url;
      };
    } else {
      smartbar._loadURL = () => {};
    }
  });
}

/**
 * Get the result of a stubbed and captured stubLoadURL call.
 *
 * @param {MozBrowser} browser - The browser element
 * @returns {Promise<{called: boolean, url: string|null}>}
 */
async function getStubLoadURLResult(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    return {
      called: content._stubLoadURLCalled,
      url: content._stubLoadedURL,
    };
  });
}

/**
 * Assert the current smartbar value.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {string} expectedValue - The expected value
 * @param {string} message - The assertion message
 */
async function assertSmartbarValue(browser, expectedValue, message) {
  await SpecialPowers.spawn(
    browser,
    [expectedValue, message],
    async (val, msg) => {
      const aiWindow = content.document.querySelector("ai-window");
      await ContentTaskUtils.waitForMutationCondition(
        aiWindow.shadowRoot,
        { childList: true, subtree: true },
        () => aiWindow.shadowRoot.querySelector("#ai-window-smartbar")
      );
      const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
      Assert.equal(smartbar.value, val, msg);
    }
  );
}

/**
 * Type text into the smartbar and wait for a pending query to complete.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {string} text - Text to type
 */
async function typeInSmartbar(browser, text) {
  await SpecialPowers.spawn(browser, [text], async searchText => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    info("typeInSmartbar: smartbar found, calling focus()");
    smartbar.focus();
    await ContentTaskUtils.waitForCondition(
      () => smartbar.matches(":focus-within"),
      "Wait for smartbar to receive focus"
    );
    info("typeInSmartbar: focus received, sending string");
    EventUtils.sendString(searchText, content);
    info("typeInSmartbar: string sent, awaiting lastQueryContextPromise");
    await smartbar.lastQueryContextPromise;
    info("typeInSmartbar: query complete");
  });
}

/**
 * Waits for the Smartbar suggestions view to open.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {Function} openFn - A function that should trigger the view opening
 */
async function promiseSmartbarSuggestionsOpen(browser, openFn) {
  if (!openFn) {
    throw new Error(
      "openFn should be supplied to promiseSmartbarSuggestionsOpen"
    );
  }

  const opened = SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    if (smartbar.view.isOpen) {
      return;
    }
    await ContentTaskUtils.waitForMutationCondition(
      smartbar,
      { attributes: true },
      () => smartbar.hasAttribute("open")
    );
  });
  await openFn();
  await opened;
}

/**
 * Waits for the Smartbar suggestions view to close.
 *
 * @param {MozBrowser} browser - The browser element
 */
async function promiseSmartbarSuggestionsClose(browser) {
  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    if (!smartbar.view.isOpen) {
      return;
    }
    await ContentTaskUtils.waitForMutationCondition(
      smartbar,
      { attributes: true },
      () => !smartbar.hasAttribute("open")
    );
  });
}

/**
 * Asserts the Smartbar suggestions view position and visibility.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {boolean} shouldBeVisible - Whether the suggestions view should be visible
 * @param {string} expectedPosition - The expected position
 */
async function assertSmartbarSuggestionsVisible(
  browser,
  shouldBeVisible,
  expectedPosition = "bottom"
) {
  const aiWindowElement =
    browser.contentWindow.document.querySelector("ai-window");
  const smartbarElement = aiWindowElement.shadowRoot.querySelector(
    "#ai-window-smartbar"
  );
  const urlbarView = smartbarElement.querySelector(".urlbarView");

  Assert.equal(
    BrowserTestUtils.isVisible(urlbarView),
    shouldBeVisible,
    `Suggestions view element should be visible: ${shouldBeVisible}`
  );
  Assert.equal(
    smartbarElement.getAttribute("suggestions-position"),
    expectedPosition,
    `Suggestions position should be: ${expectedPosition}`
  );
}

/**
 * Wait for panel list to be visible.
 *
 * @param {MozBrowser} browser - The browser element
 * @returns {Promise<boolean>} True if panel is visible
 */
async function waitForPanelOpen(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");

    await ContentTaskUtils.waitForMutationCondition(
      panel,
      { attributes: true, attributeFilter: ["open"] },
      () => panel.hasAttribute("open")
    );

    return panel.hasAttribute("open");
  });
}

/**
 * Wait for the mentions panel list to be visible.
 *
 * @param {MozBrowser} browser - The browser element
 * @returns {Promise<boolean>} True if mentions are open
 */
async function waitForMentionsOpen(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");

    await ContentTaskUtils.waitForMutationCondition(
      panel,
      { attributes: true, attributeFilter: ["open"] },
      () => panel.hasAttribute("open")
    );

    return panel.hasAttribute("open");
  });
}

/**
 * Wait for a mention to be inserted.
 *
 * @param {MozBrowser} browser - The browser element
 * @returns {Promise<boolean>} True if the mention exists
 */
async function waitForMentionInserted(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const editor = smartbar.querySelector("moz-multiline-editor");

    await ContentTaskUtils.waitForMutationCondition(
      editor.shadowRoot,
      { childList: true, subtree: true },
      () => editor.shadowRoot.querySelector("ai-website-chip") !== null
    );

    return !!editor.shadowRoot.querySelector("ai-website-chip");
  });
}

/**
 * Click the first non-header item in the smartbar mention suggestions panel.
 *
 * @param {MozBrowser} browser - The browser element
 */
async function selectFirstMentionPanelItem(browser) {
  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");
    const firstItem = panel.querySelector(
      "panel-item:not(.panel-section-header)"
    );
    firstItem.click();
  });
}

/**
 * Type "@", wait for the mention panel, click the first suggestion, and wait
 * for the mention chip to appear in the editor.
 *
 * @param {MozBrowser} browser - The browser element
 */
async function insertInlineMention(browser) {
  await typeInSmartbar(browser, "@");
  await waitForPanelOpen(browser);
  await selectFirstMentionPanelItem(browser);
  await waitForMentionInserted(browser);
}

/**
 * Return inline @mention data from the editor's mentions plugin.
 *
 * @param {MozBrowser} browser - The browser element
 * @returns {Promise<Array<{type: string, id: string, label: string}>>}
 */
async function getEditorInlineMentions(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const editor = smartbar.querySelector("moz-multiline-editor");
    return editor.getAllMentions();
  });
}

/**
 * Get the context chips from the smartbar header.
 *
 * @param {MozBrowser} browser - The browser element
 * @returns {Promise<Array<{url: string, label: string}>>} The context chip data
 */
async function getSmartbarContextChips(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const chipContainer = smartbar.querySelector(
      ".smartbar-context-chips-header"
    );
    return chipContainer.websites.map(w => ({ url: w.url, label: w.label }));
  });
}

/**
 * Returns the chat messages currently displayed in the sidebar.
 *
 * @param {MozBrowser} sidebarBrowser - The sidebar browser element
 * @returns {Promise<Array<{role: string, message: string}>>}
 */
async function getSidebarChatMessages(sidebarBrowser) {
  const aiWindow = await TestUtils.waitForCondition(
    () => sidebarBrowser.contentDocument?.querySelector("ai-window"),
    "Wait for ai-window element"
  );
  const aichatBrowser = await TestUtils.waitForCondition(
    () => aiWindow.shadowRoot?.querySelector("#aichat-browser"),
    "Wait for #aichat-browser element"
  );
  return SpecialPowers.spawn(aichatBrowser, [], async () => {
    const contentEl = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("ai-chat-content"),
      "Wait for ai-chat-content element"
    );
    await contentEl.updateComplete;
    const messageEls = contentEl.shadowRoot.querySelectorAll("ai-chat-message");
    return Array.from(messageEls, el => {
      const elJS = el.wrappedJSObject || el;
      return {
        role: elJS.role,
        message: elJS.message,
        hasRendered: !!el.shadowRoot?.querySelector(
          ".message-assistant, .message-user"
        ),
      };
    });
  });
}

/**
 * Mock OpenAI server helpers
 */

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

function readRequestBody(request) {
  const stream = request.bodyInputStream;
  const available = stream.available();
  return NetUtil.readInputStreamToString(stream, available, {
    charset: "UTF-8",
  });
}

/**
 * @typedef {object} MockToolCall
 * @property {string} name - The tool function name (e.g. "run_search",
 *   "get_page_content").
 * @property {string} [args] - JSON-encoded arguments for the tool call.
 *   Defaults to "{}".
 */

/**
 * @typedef {object} MockOpenAIServerOptions
 * @property {string[]} [streamChunks] - Array of content strings sent as
 *   individual SSE chunks in the streaming response. Defaults to
 *   ["Hello from mock."].
 * @property {MockToolCall|null} [toolCall] - When non-null, the first
 *   streaming request that includes tools will respond with this tool call
 *   instead of text content. A subsequent request containing the tool result
 *   will receive followupChunks as the response. Defaults to null.
 * @property {string[]} [followupChunks] - Content chunks sent in the
 *   streaming response after a tool result is received. Only used when
 *   toolCall is set. Defaults to ["Tool complete."].
 * @property {Function} [onRequest] - Callback invoked with the parsed
 *   request body for every request to /v1/chat/completions.
 */

/**
 * Starts a local HTTP server that mimics the OpenAI chat completions API.
 *
 * Handles both streaming (SSE) and non-streaming (JSON) requests to
 * /v1/chat/completions. When toolCall is configured, the server simulates
 * a tool-use round-trip: the first request returns the tool call, and the
 * follow-up request (containing the tool result) returns followupChunks.
 *
 * @param {MockOpenAIServerOptions} [options]
 * @returns {{ server: HttpServer, port: number }} The running server and
 *   its port number.
 */
function startMockOpenAI({
  streamChunks = ["Hello from mock."],
  streamChunkDelayMs = 0,
  toolCall = null,
  followupChunks = ["Tool complete."],
  onRequest,
} = {}) {
  const server = new HttpServer();

  server.registerPathHandler("/v1/chat/completions", (request, response) => {
    let bodyText = "";
    if (request.method === "POST") {
      try {
        bodyText = readRequestBody(request);
      } catch (_) {}
    }

    let body;
    try {
      body = JSON.parse(bodyText || "{}");
    } catch (_) {
      body = {};
    }

    onRequest?.(body);

    const wantsStream = !!body.stream;
    const tools = Array.isArray(body.tools) ? body.tools : [];
    const askedForTools = tools.length;
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const hasToolResult = messages.some(m => m && m.role === "tool");
    const timestamp = Math.floor(Date.now() / 1000);

    const startSSE = () => {
      response.setStatusLine(request.httpVersion, 200, "OK");
      response.setHeader(
        "Content-Type",
        "text/event-stream; charset=utf-8",
        false
      );
      response.setHeader("Cache-Control", "no-cache", false);
      response.setHeader("Access-Control-Allow-Origin", "*", false);
      response.processAsync();
    };

    const sendSSE = obj => {
      // Encode data so special §followup:§-type tokens preserves utf-8
      response.write(
        Array.from(
          new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`),
          b => String.fromCharCode(b)
        ).join("")
      );
    };

    if (wantsStream && toolCall && askedForTools && !hasToolResult) {
      startSSE();

      sendSSE({
        id: "chatcmpl-aiwindow-stream-tool-1",
        object: "chat.completion.chunk",
        created: timestamp,
        model: "aiwindow-mock",
        choices: [
          {
            index: 0,
            delta: {
              content: "",
              tool_calls: [
                {
                  index: 0,
                  id: "call_1",
                  type: "function",
                  function: {
                    name: toolCall.name,
                    arguments: toolCall.args ?? "{}",
                  },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      });

      sendSSE({
        id: "chatcmpl-aiwindow-stream-tool-2",
        object: "chat.completion.chunk",
        created: timestamp,
        model: "aiwindow-mock",
        choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
      });

      response.write("data: [DONE]\n\n");
      response.finish();
      return;
    }

    if (wantsStream && toolCall && askedForTools && hasToolResult) {
      startSSE();

      followupChunks.forEach((chunk, index) => {
        sendSSE({
          id: `chatcmpl-aiwindow-stream-tool-followup-${index}`,
          object: "chat.completion.chunk",
          created: timestamp,
          model: "aiwindow-mock",
          choices: [
            {
              index: 0,
              delta: { content: chunk },
              finish_reason:
                index === followupChunks.length - 1 ? "stop" : null,
            },
          ],
        });
      });

      response.write("data: [DONE]\n\n");
      response.finish();
      return;
    }

    if (wantsStream) {
      startSSE();

      (async () => {
        for (const [index, chunk] of streamChunks.entries()) {
          if (streamChunkDelayMs) {
            await new Promise(resolve =>
              setTimeout(resolve, streamChunkDelayMs)
            );
          }
          sendSSE({
            id: `chatcmpl-aiwindow-stream-${index}`,
            object: "chat.completion.chunk",
            created: timestamp,
            model: "aiwindow-mock",
            choices: [
              {
                index: 0,
                delta: { content: chunk },
                finish_reason:
                  index === streamChunks.length - 1 ? "stop" : null,
              },
            ],
          });
        }

        response.write("data: [DONE]\n\n");
        response.finish();
      })();
      return;
    }

    // Non-streaming fallback for conversation starters, title generation, etc.
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "application/json", false);
    response.write(
      JSON.stringify({
        id: "chatcmpl-aiwindow-non-stream",
        object: "chat.completion",
        created: timestamp,
        model: "aiwindow-mock",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "Mock response" },
            finish_reason: "stop",
          },
        ],
      })
    );
  });

  server.start(-1);
  return { server, port: server.identity.primaryPort };
}

/**
 * Stops a running mock OpenAI server.
 *
 * @param {HttpServer} server - The server instance returned by startMockOpenAI.
 * @returns {Promise<void>} Resolves when the server has fully stopped.
 */
function stopMockOpenAI(server) {
  return new Promise(resolve => server.stop(resolve));
}

/**
 * Retrieves the context chip labels from a user message rendered in the
 * ai-chat-content area. Waits for the aichat-browser, chat content, and
 * chips to be available before reading labels.
 *
 * @param {MozBrowser} sidebarBrowser - The sidebar browser element
 *   (e.g. win.document.getElementById("ai-window-browser"))
 * @param {number} [messageIndex=0] - Zero-based index selecting which user
 *   message to read chips from (0 = first user message, 1 = second, etc.)
 * @returns {Promise<string[]>} Array of chip label strings from the
 *   website-chip-container in the selected user message
 */
async function getUserMessageChipLabels(sidebarBrowser, messageIndex = 0) {
  await BrowserTestUtils.waitForCondition(
    () => sidebarBrowser.contentDocument?.querySelector("ai-window:defined"),
    "Sidebar ai-window should be loaded"
  );

  const aiWindowEl = sidebarBrowser.contentDocument.querySelector("ai-window");
  const aichatBrowser = await BrowserTestUtils.waitForCondition(
    () => aiWindowEl.shadowRoot?.querySelector("#aichat-browser"),
    "Wait for aichat-browser"
  );

  return SpecialPowers.spawn(aichatBrowser, [messageIndex], async msgIndex => {
    const chatContent = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("ai-chat-content"),
      "Wait for ai-chat-content"
    );

    const containers = await ContentTaskUtils.waitForCondition(() => {
      const found = chatContent.shadowRoot.querySelectorAll(
        ".chat-bubble-user website-chip-container"
      );
      return found.length > msgIndex ? found : null;
    }, `Wait for user message at index ${msgIndex}`);

    const chipContainer = containers[msgIndex];

    const chips = await ContentTaskUtils.waitForCondition(() => {
      const found =
        chipContainer.shadowRoot.querySelectorAll("ai-website-chip");
      return found.length ? found : null;
    }, "Wait for context chips to render");

    return Array.from(chips).map(
      chip => chip.shadowRoot?.querySelector(".chip-label")?.textContent ?? ""
    );
  });
}

/**
 * Convenience wrapper that starts a mock OpenAI server, pushes the endpoint
 * pref, stubs getFxAccountToken, runs a task, then tears everything down.
 *
 * Consider using stubEngineNetworkBoundaries instead for new tests — it
 * additionally stubs openAIEngine.build to prevent leaked-window issues from
 * background async operations, and its setup/restore pattern fits
 * beforeEach/afterEach without requiring a callback wrapper.
 *
 * @param {MockOpenAIServerOptions} serverOptions - Options for the mock server.
 * @param {Function} task - Async callback receiving { port }.
 */
async function withServer(serverOptions, task) {
  const { server, port } = startMockOpenAI(serverOptions);
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.endpoint", `http://localhost:${port}/v1`]],
  });

  const getFxAccountTokenStub = sinon
    .stub(openAIEngine, "getFxAccountToken")
    .resolves("mock-fxa-token");

  try {
    await task({ port });
  } finally {
    getFxAccountTokenStub.restore();
    await SpecialPowers.popPrefEnv();
    await stopMockOpenAI(server);
  }
}
