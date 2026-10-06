/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

const { AIWindowUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs"
);

const { ChatConversation } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs"
);

const { ChatMessage } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs"
);

const { ChatStore, MESSAGE_ROLE } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
);

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

function createMockConversation(id = "test-conv-id") {
  const conversation = new ChatConversation({
    id,
    title: "Test Conversation",
    pageUrl: new URL("https://example.com/"),
  });

  conversation.messages = [
    new ChatMessage({
      ordinal: 0,
      role: MESSAGE_ROLE.USER,
      content: { text: "Hello" },
    }),
    new ChatMessage({
      ordinal: 1,
      role: MESSAGE_ROLE.ASSISTANT,
      content: { text: "Hi there" },
    }),
  ];

  return conversation;
}

/**
 * Waits for the sidebar's ai-window element to be ready.
 *
 * @param {Window} win
 * @returns {Promise<XULElement>} The sidebar browser element
 */
async function waitForSidebarAIWindow(win) {
  const sidebarBrowser = win.document.getElementById(AIWindowUI.BROWSER_ID);
  await TestUtils.waitForCondition(
    () => sidebarBrowser.contentDocument?.querySelector("ai-window:defined"),
    "Sidebar ai-window should be defined"
  );
  return sidebarBrowser;
}

/**
 * Presses Enter in the sidebar's smartbar to commit the current input,
 * exercising the full keydown -> handleCommand -> smartbar-commit flow.
 *
 * @param {XULElement} browser - The sidebar browser element
 */
async function submitSmartbar(browser) {
  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const editor = smartbar.querySelector("moz-multiline-editor");
    editor.focus();
    EventUtils.synthesizeKey("KEY_Enter", {}, content);
    await ContentTaskUtils.waitForCondition(
      () => smartbar.value === "",
      "Smartbar should be cleared after commit"
    );
  });
}

/**
 * Reads the current smartbar input value directly from the sidebar.
 *
 * @param {Window} win
 * @returns {string|null} The smartbar value, or null if sidebar is unavailable
 */
async function getSidebarInputValue(win) {
  if (!AIWindowUI.isSidebarOpen(win)) {
    return null;
  }

  const sidebarBrowser = win.document.getElementById(AIWindowUI.BROWSER_ID);
  return SpecialPowers.spawn(sidebarBrowser, [], async () => {
    const aiWindowEl = content.document.querySelector("ai-window");
    await ContentTaskUtils.waitForCondition(
      () => aiWindowEl.shadowRoot?.querySelector("#ai-window-smartbar"),
      "Smartbar should be rendered"
    );
    const smartbar = aiWindowEl.shadowRoot.querySelector("#ai-window-smartbar");
    return smartbar?.value ?? "";
  });
}

/**
 * Switches away from the current tab to a blank tab and back, forcing
 * the sidebar to close and reopen. Useful for verifying that the tab
 * state manager correctly restores sidebar state on tab select.
 *
 * @param {Window} win
 * @param {MozTabbrowserTab} tab - The tab to switch back to
 */
async function switchAwayAndBack(win, tab) {
  const blankTab = await BrowserTestUtils.openNewForegroundTab(
    win.gBrowser,
    "about:blank"
  );
  await BrowserTestUtils.switchTab(win.gBrowser, tab);
  await TestUtils.waitForCondition(
    () => AIWindowUI.isSidebarOpen(win),
    "Sidebar should reopen after switching back"
  );
  await BrowserTestUtils.removeTab(blankTab);
}

/**
 * Opens a conversation in the fullpage AI Window, then navigates away
 * to trigger the sidebar to open.
 *
 * @param {Window} win
 * @param {XULElement} browser - The tab's browser element
 * @param {ChatConversation} conversation - The conversation to open
 */
async function navigateFromFullpage(win, browser, conversation) {
  AIWindowUI.openInFullWindow(browser, conversation);

  const loaded = BrowserTestUtils.browserLoaded(browser);
  BrowserTestUtils.startLoadingURIString(browser, "https://example.com/");
  await loaded;

  await TestUtils.waitForCondition(
    () => AIWindowUI.isSidebarOpen(win),
    "Sidebar should open after navigating away with active conversation"
  );
}

describe("Smartbar tab state input tracking", () => {
  describe("when one tab has a sidebar", () => {
    let win, browser, tab, sandbox, sidebarBrowser;

    beforeEach(async () => {
      sandbox = lazy.sinon.createSandbox();

      const mockConversation = createMockConversation();
      sandbox
        .stub(ChatStore, "findConversationById")
        .resolves(mockConversation);
      sandbox.stub(Chat, "fetchWithHistory");
      sandbox.stub(openAIEngine, "build").resolves({});

      win = await openAIWindow();
      browser = win.gBrowser.selectedBrowser;
      tab = win.gBrowser.selectedTab;

      await navigateFromFullpage(win, browser, mockConversation);

      sidebarBrowser = await waitForSidebarAIWindow(win);
    });

    afterEach(async () => {
      await BrowserTestUtils.removeTab(tab);
      await BrowserTestUtils.closeWindow(win);
      sandbox.restore();
      win = null;
      browser = null;
      tab = null;
      sidebarBrowser = null;
      sandbox = null;
    });

    it("should start with empty input after navigating from fullpage", async () => {
      await switchAwayAndBack(win, tab);
      Assert.equal(
        await getSidebarInputValue(win),
        "",
        "Input should be empty after navigating from fullpage"
      );
    });

    it("should track input from smartbar-input events", async () => {
      await typeInSmartbar(sidebarBrowser, "hello world");

      await switchAwayAndBack(win, tab);
      Assert.equal(
        await getSidebarInputValue(win),
        "hello world",
        "Input should reflect the last smartbar-input event value"
      );
    });

    it("should clear input when a sidebar navigation is triggered", async () => {
      await typeInSmartbar(sidebarBrowser, "https://example.org/");
      await submitSmartbar(sidebarBrowser);

      await switchAwayAndBack(win, tab);
      Assert.equal(
        await getSidebarInputValue(win),
        "",
        "Input should be cleared after sidebar navigation"
      );
    });

    it("should clear input after a chat submission", async () => {
      await typeInSmartbar(sidebarBrowser, "hello");
      await submitSmartbar(sidebarBrowser);

      await switchAwayAndBack(win, tab);
      Assert.equal(
        await getSidebarInputValue(win),
        "",
        "Input should be empty after chat submission"
      );
    });

    it("should submit when re-selecting the current action from the dropdown", async () => {
      await typeInSmartbar(sidebarBrowser, "hello");
      await SpecialPowers.spawn(sidebarBrowser, [], async () => {
        const aiWindowElement = content.document.querySelector("ai-window");
        const smartbar = await ContentTaskUtils.waitForCondition(
          () =>
            aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
          "Wait for Smartbar to be rendered"
        );
        const inputCta = smartbar.querySelector("input-cta");
        inputCta.shadowRoot
          .querySelector("panel-list")
          .querySelector(`panel-item[icon="chat"]`)
          .click();
        await ContentTaskUtils.waitForCondition(
          () => smartbar.value === "",
          "Smartbar should be cleared after re-selecting the same action"
        );
      });
    });

    it("should preserve input from URL bar navigation", async () => {
      await typeInSmartbar(sidebarBrowser, "hello");

      const loaded = BrowserTestUtils.browserLoaded(browser);
      BrowserTestUtils.startLoadingURIString(browser, "https://example.net/");
      await loaded;

      Assert.equal(
        await getSidebarInputValue(win),
        "hello",
        "Input should be preserved after URL bar navigation"
      );
    });
  });

  describe("when navigating away from the fullpage AI window", () => {
    let win, browser, tab, sandbox;

    beforeEach(async () => {
      sandbox = lazy.sinon.createSandbox();

      const mockConversation = createMockConversation();
      sandbox
        .stub(ChatStore, "findConversationById")
        .resolves(mockConversation);
      sandbox.stub(Chat, "fetchWithHistory");
      sandbox.stub(openAIEngine, "build").resolves({});

      win = await openAIWindow();
      browser = win.gBrowser.selectedBrowser;
      tab = win.gBrowser.selectedTab;
    });

    afterEach(async () => {
      sandbox.restore();
      sandbox = null;
      await BrowserTestUtils.removeTab(tab);
      await BrowserTestUtils.closeWindow(win);
      win = null;
      browser = null;
      tab = null;
    });

    it("should not leak fullpage smartbar input into the sidebar", async () => {
      const mockConversation = createMockConversation();
      AIWindowUI.openInFullWindow(browser, mockConversation);

      win.dispatchEvent(
        new win.CustomEvent("ai-window:smartbar-input", {
          bubbles: true,
          detail: {
            tab,
            mode: "fullpage",
            input: { text: "youtube.com", mentions: [] },
            conversationId: mockConversation.id,
          },
        })
      );

      const loaded = BrowserTestUtils.browserLoaded(browser);
      BrowserTestUtils.startLoadingURIString(browser, "https://example.com/");
      await loaded;

      await TestUtils.waitForCondition(
        () => AIWindowUI.isSidebarOpen(win),
        "Sidebar should open after navigating away with active conversation"
      );
      await waitForSidebarAIWindow(win);

      Assert.equal(
        await getSidebarInputValue(win),
        "",
        "Sidebar should not show text typed in the fullpage smartbar"
      );
    });
  });

  describe("when switching between two tabs with sidebars", () => {
    let win, tabA, tabB, browserA, conversationA, sandbox, sidebarBrowser;

    beforeEach(async () => {
      sandbox = lazy.sinon.createSandbox();

      conversationA = createMockConversation("conv-a");
      const conversationB = createMockConversation("conv-b");

      const findStub = sandbox.stub(ChatStore, "findConversationById");
      findStub.withArgs("conv-a").resolves(conversationA);
      findStub.withArgs("conv-b").resolves(conversationB);

      sandbox.stub(Chat, "fetchWithHistory");
      sandbox.stub(openAIEngine, "build").resolves({});

      win = await openAIWindow();
      browserA = win.gBrowser.selectedBrowser;
      tabA = win.gBrowser.selectedTab;

      await navigateFromFullpage(win, browserA, conversationA);

      sidebarBrowser = await waitForSidebarAIWindow(win);

      tabB = await BrowserTestUtils.openNewForegroundTab(
        win.gBrowser,
        "https://example.org/"
      );

      AIWindowUI.openSidebar(win, conversationB);
    });

    afterEach(async () => {
      await BrowserTestUtils.removeTab(tabA);
      await BrowserTestUtils.removeTab(tabB);
      await BrowserTestUtils.closeWindow(win);
      sandbox.restore();
      win = null;
      tabA = null;
      tabB = null;
      browserA = null;
      conversationA = null;
      sidebarBrowser = null;
      sandbox = null;
    });

    it("should restore each tab's stored input on switch", async () => {
      await typeInSmartbar(sidebarBrowser, "world");

      await BrowserTestUtils.switchTab(win.gBrowser, tabA);
      await TestUtils.waitForCondition(
        async () => (await getSidebarInputValue(win)) === "",
        "Tab A should start with empty input"
      );
      await typeInSmartbar(sidebarBrowser, "hello");

      await BrowserTestUtils.switchTab(win.gBrowser, tabB);
      await TestUtils.waitForCondition(
        async () => (await getSidebarInputValue(win)) === "world",
        "Tab B should restore its stored input"
      );

      await BrowserTestUtils.switchTab(win.gBrowser, tabA);
      await TestUtils.waitForCondition(
        async () => (await getSidebarInputValue(win)) === "hello",
        "Tab A should restore its stored input"
      );
    });
  });
});
