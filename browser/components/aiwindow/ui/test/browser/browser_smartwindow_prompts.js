/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for conversation starter prompts in the AI Window.
 *
 * These tests verify that:
 * - Prompts are rendered correctly in both sidebar and fullpage modes
 * - Submitting starter prompts respects the memories preference
 * - Prompts are removed after selection
 */

"use strict";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AIWindowUI:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs",
});

function getSidebarPromptButtons(win) {
  const sidebarBrowser = win.document.getElementById("ai-window-browser");
  const aiWindowEl =
    sidebarBrowser?.contentDocument?.querySelector("ai-window");
  const promptsEl = aiWindowEl?.shadowRoot?.querySelector(
    "smartwindow-prompts"
  );
  if (!promptsEl) {
    return [];
  }
  const buttons = promptsEl.shadowRoot.querySelectorAll(".sw-prompt-button");
  return Array.from(buttons).map(b => b.textContent.trim());
}

async function navigateTo(url, window) {
  const parentBrowser = window.gBrowser.selectedBrowser;
  const loaded = BrowserTestUtils.browserLoaded(parentBrowser);
  BrowserTestUtils.startLoadingURIString(parentBrowser, url);
  await loaded;
}

async function openBackgroundTab(url, window) {
  let tab = BrowserTestUtils.addTab(window.gBrowser, url);
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  return tab;
}

function startMockNonStreamingServer(responseContent) {
  const mockServer = new HttpServer();
  mockServer.delay = 1;
  let reqCount = 0;
  const pendingResponses = [];

  mockServer.registerPathHandler("/v1/chat/completions", (_req, res) => {
    reqCount++;
    res.processAsync();

    const body = JSON.stringify({
      id: "chatcmpl-mock",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "mock",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: responseContent[0] },
          finish_reason: "stop",
        },
      ],
    });

    const entry = { timerId: null, res };
    pendingResponses.push(entry);

    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    entry.timerId = setTimeout(() => {
      const idx = pendingResponses.indexOf(entry);
      if (idx !== -1) {
        pendingResponses.splice(idx, 1);
      }
      try {
        res.setStatusLine(_req.httpVersion, 200, "OK");
        res.setHeader("Content-Type", "application/json", false);
        res.write(body);
        res.finish();
      } catch (e) {
        // Connection may have closed before the delayed response was sent
        // or connection already torn down.
      }
    }, mockServer.delay);
  });

  mockServer.start(-1);
  return {
    pendingResponses,
    server: mockServer,
    port: mockServer.identity.primaryPort,
    get requestCount() {
      return reqCount;
    },
    cleanup() {
      for (const { timerId, res } of pendingResponses) {
        clearTimeout(timerId);
        try {
          res.finish();
        } catch (e) {
          // Already finished or connection gone.
        }
      }
      pendingResponses.length = 0;
    },
  };
}

describe("sidebar conversation starter prompts", () => {
  let responseContent, mock, gAiWindow, backgroundTab;

  beforeEach(async () => {
    responseContent = ["prompt 1\nprompt 2"];
    mock = startMockNonStreamingServer(responseContent);

    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.endpoint", `http://localhost:${mock.port}/v1`],
      ],
    });

    gAiWindow = await openAIWindow();
  });

  afterEach(async () => {
    mock.cleanup();
    if (backgroundTab) {
      BrowserTestUtils.removeTab(backgroundTab);
    }

    await BrowserTestUtils.closeWindow(gAiWindow);
    await SpecialPowers.popPrefEnv();
    await stopMockOpenAI(mock.server);

    gAiWindow = null;
  });

  describe("when switching tabs while starter prompts load", () => {
    let firstTab, secondTab;
    afterEach(async () => {
      if (firstTab) {
        await BrowserTestUtils.removeTab(firstTab);
      }

      if (secondTab) {
        await BrowserTestUtils.removeTab(secondTab);
      }
    });

    it("should not load prompts to the wrong tab", async () => {
      // Trigger opening the sidebar so initial starter prompts display
      await navigateTo("https://example.com", gAiWindow);
      firstTab = gAiWindow.gBrowser.selectedTab;

      await TestUtils.waitForCondition(
        () => AIWindowUI.isSidebarOpen(gAiWindow),
        "Sidebar should be open"
      );
      await TestUtils.waitForCondition(
        () => getSidebarPromptButtons(gAiWindow).includes("prompt 1"),
        "First set of prompts should be rendered"
      );

      Assert.deepEqual(
        getSidebarPromptButtons(gAiWindow),
        ["prompt 1", "prompt 2"],
        "Should display first set of prompts"
      );

      // Open up second tab
      secondTab = await BrowserTestUtils.openNewForegroundTab({
        gBrowser: gAiWindow.gBrowser,
        opening: "https://example.net",
        waitForLoad: true,
      });

      // Start a conversation so that starter prompts should not be displayed
      const sidebarBrowser =
        gAiWindow.document.getElementById("ai-window-browser");
      await typeInSmartbar(sidebarBrowser, "Hello world");
      await submitSmartbar(sidebarBrowser);
      await TestUtils.waitForCondition(
        () => !getSidebarPromptButtons(gAiWindow).length,
        "Starter prompts should be hidden after starting a conversation on tab 2"
      );

      // Navigate tab 1 in the background so switching back to it triggers
      // an uncached starter request instead of reusing the starters cached
      // for the initial example.com load.
      const firstTabLoaded = BrowserTestUtils.browserLoaded(
        firstTab.linkedBrowser
      );
      BrowserTestUtils.startLoadingURIString(
        firstTab.linkedBrowser,
        "https://example.com"
      );
      await firstTabLoaded;

      // wait for conversation messages
      await TestUtils.waitForCondition(() => {
        const el = sidebarBrowser?.contentDocument?.querySelector("ai-window");
        return el && el.conversationMessageCount > 0;
      }, "Tab 2's conversation should have messages after submit");

      // Add an artificial delay on the starter prompts mocked response
      mock.server.delay = 200;

      // Switch back to tab 1 to trigger loading starter prompts, and before
      // the 200 ms delay switch back to tab 2 where starter prompts should
      // not display
      await BrowserTestUtils.switchTab(gAiWindow.gBrowser, firstTab);
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      await new Promise(resolve => gAiWindow.setTimeout(resolve, 10));
      await BrowserTestUtils.switchTab(gAiWindow.gBrowser, secondTab);

      await TestUtils.waitForCondition(
        () => mock.pendingResponses.length === 0,
        "Waiting for all starter prompt requests/etc to resolve"
      );

      // Wait for conversation to start and starters to hide
      const sidebarBrowser2 =
        gAiWindow.document.getElementById("ai-window-browser");
      await TestUtils.waitForCondition(() => {
        const aiWindowEl =
          sidebarBrowser2?.contentDocument?.querySelector("ai-window");
        return (
          aiWindowEl &&
          aiWindowEl.conversationMessageCount > 0 &&
          !aiWindowEl.showStarters
        );
      }, "Sidebar should have settled on tab 2's conversation with starters hidden");

      // Verify that starter prompts aren't being displayed on tab 2
      Assert.deepEqual(
        getSidebarPromptButtons(gAiWindow),
        [],
        "Starter prompts from tab 1 should not appear on tab 2"
      );
    });
  });

  describe("when the conversation is empty", () => {
    it("should load new prompts when the tab changes URL", async () => {
      await navigateTo("https://example.com", gAiWindow);

      await TestUtils.waitForCondition(
        () => AIWindowUI.isSidebarOpen(gAiWindow),
        "Sidebar should be open"
      );
      await TestUtils.waitForCondition(
        () => getSidebarPromptButtons(gAiWindow).includes("prompt 1"),
        "First set of prompts should be rendered"
      );

      Assert.deepEqual(
        getSidebarPromptButtons(gAiWindow),
        ["prompt 1", "prompt 2"],
        "Should display first set of prompts"
      );

      responseContent[0] = "prompt 3\nprompt 4";

      await navigateTo("https://example.org", gAiWindow);
      await TestUtils.waitForCondition(
        () => getSidebarPromptButtons(gAiWindow).includes("prompt 3"),
        "Second set of prompts should be rendered"
      );
      Assert.deepEqual(
        getSidebarPromptButtons(gAiWindow),
        ["prompt 3", "prompt 4"],
        "Should display updated prompts after URL change"
      );
    });

    it("should not reload prompts when background tabs change URL", async () => {
      const updateStarterPromptsSpy = sinon.spy(
        lazy.AIWindowUI,
        "updateStarterPrompts"
      );

      try {
        await navigateTo("https://example.com", gAiWindow);

        await TestUtils.waitForCondition(
          () => AIWindowUI.isSidebarOpen(gAiWindow),
          "Sidebar should be open"
        );
        await TestUtils.waitForCondition(
          () => getSidebarPromptButtons(gAiWindow).includes("prompt 1"),
          "First set of prompts should be rendered"
        );

        Assert.deepEqual(
          getSidebarPromptButtons(gAiWindow),
          ["prompt 1", "prompt 2"],
          "Should display first set of prompts"
        );

        responseContent[0] = "prompt 3\nprompt 4";
        updateStarterPromptsSpy.resetHistory();

        backgroundTab = await openBackgroundTab(
          "https://example.org",
          gAiWindow
        );

        Assert.deepEqual(
          getSidebarPromptButtons(gAiWindow),
          ["prompt 1", "prompt 2"],
          "Should continue to display initial starter prompts after background URL load"
        );
        Assert.equal(
          0,
          updateStarterPromptsSpy.callCount,
          "There should not be any more calls to update starter prompts"
        );
      } finally {
        updateStarterPromptsSpy.restore();
      }
    });

    it("should load new prompts when navigating back to a previously visited URI", async () => {
      await navigateTo("https://example.com", gAiWindow);

      await TestUtils.waitForCondition(
        () => AIWindowUI.isSidebarOpen(gAiWindow),
        "Sidebar should be open"
      );
      await TestUtils.waitForCondition(
        () => getSidebarPromptButtons(gAiWindow).includes("prompt 1"),
        "First set of prompts should be rendered"
      );

      const requestCountAfterFirstLoad = mock.requestCount;

      responseContent[0] = "prompt 3\nprompt 4";
      await navigateTo("https://example.org", gAiWindow);
      await TestUtils.waitForCondition(
        () => getSidebarPromptButtons(gAiWindow).includes("prompt 3"),
        "Second set of prompts should be rendered"
      );
      Assert.equal(
        mock.requestCount,
        requestCountAfterFirstLoad + 1,
        "Navigating to a new URI should generate a new starter request"
      );

      responseContent[0] = "prompt 5\nprompt 6";
      await navigateTo("https://example.com", gAiWindow);
      await TestUtils.waitForCondition(
        () => getSidebarPromptButtons(gAiWindow).includes("prompt 5"),
        "New prompts should be rendered when navigating back"
      );
      Assert.deepEqual(
        getSidebarPromptButtons(gAiWindow),
        ["prompt 5", "prompt 6"],
        "Should display newly generated prompts when navigating back"
      );
      Assert.equal(
        mock.requestCount,
        requestCountAfterFirstLoad + 2,
        "Navigating back to a previously visited URI should generate a new starter request"
      );
    });

    it("should evict the oldest cached prompts after exceeding the cache limit", async () => {
      for (let i = 0; i <= 20; i++) {
        responseContent[0] = `prompt ${i}a\nprompt ${i}b`;
        await navigateTo(`https://example.com/${i}`, gAiWindow);
        await TestUtils.waitForCondition(
          () => getSidebarPromptButtons(gAiWindow).includes(`prompt ${i}a`),
          `Prompts for URI ${i} should be rendered`
        );
      }

      const requestCountAfterFillingCache = mock.requestCount;

      responseContent[0] = "prompt evicted a\nprompt evicted b";
      await navigateTo("https://example.com/0", gAiWindow);
      await TestUtils.waitForCondition(
        () => getSidebarPromptButtons(gAiWindow).includes("prompt evicted a"),
        "Evicted prompts should be regenerated for the oldest URI"
      );

      Assert.equal(
        mock.requestCount,
        requestCountAfterFillingCache + 1,
        "Revisiting the oldest URI after the cache limit should generate a new starter request"
      );
    });
  });
});

add_task(async function test_starter_prompts_click_triggers_chat_on_new_tab() {
  const sb = sinon.createSandbox();

  try {
    const fetchWithHistoryStub = sb.stub(Chat, "fetchWithHistory");
    sb.stub(openAIEngine, "build").resolves({});

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const buttons = await getPromptButtons(browser);
    const firstPromptText = buttons[0].textContent.trim();
    buttons[0].click();

    await TestUtils.waitForCondition(
      () => fetchWithHistoryStub.calledOnce,
      "fetchWithHistory should be called after clicking prompt"
    );

    const conversation = fetchWithHistoryStub.firstCall.args[0].conversation;
    const messages = conversation.getMessagesInOpenAiFormat();
    const userMessage = messages.findLast(m => m.role === "user");

    Assert.equal(
      userMessage.content,
      firstPromptText,
      "Should submit starter prompt text as user message on New Tab"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(async function test_starter_prompts_click_triggers_chat_in_sidebar() {
  const sb = sinon.createSandbox();

  try {
    const fetchWithHistoryStub = sb.stub(Chat, "fetchWithHistory");
    sb.stub(openAIEngine, "build").resolves({});

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const buttons = await getPromptButtons(browser);
    const firstPromptText = buttons[0].textContent.trim();
    buttons[0].click();

    await TestUtils.waitForCondition(
      () => fetchWithHistoryStub.calledOnce,
      "fetchWithHistory should be called after clicking prompt"
    );

    const conversation = fetchWithHistoryStub.firstCall.args[0].conversation;
    const messages = conversation.getMessagesInOpenAiFormat();
    const userMessage = messages.findLast(m => m.role === "user");

    Assert.equal(
      userMessage.content,
      firstPromptText,
      "Should submit starter prompt text as user message in the sidebar"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(
  async function test_starter_prompts_click_fetches_memories_when_enabled() {
    const sb = sinon.createSandbox();

    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.memories.generateFromConversation", true],
        ["browser.smartwindow.memories.generateFromHistory", true],
      ],
    });

    try {
      sb.stub(Chat, "fetchWithHistory");
      sb.stub(openAIEngine, "build").resolves({});
      const memoriesStub = sb
        .stub(this.ChatConversation.prototype, "getMemoriesContext")
        .resolves(null);

      const win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;

      (await getPromptButtons(browser))[0].click();

      await TestUtils.waitForCondition(
        () => memoriesStub.called,
        "getMemoriesContext should be called with memories enabled"
      );

      Assert.ok(
        memoriesStub.calledOnce,
        "getMemoriesContext should be called once"
      );

      await BrowserTestUtils.closeWindow(win);
    } finally {
      sb.restore();
      await SpecialPowers.popPrefEnv();
    }
  }
);

add_task(
  async function test_starter_prompts_click_skips_memories_when_disabled() {
    const sb = sinon.createSandbox();

    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.memories.generateFromConversation", false],
        ["browser.smartwindow.memories.generateFromHistory", false],
      ],
    });

    try {
      const fetchWithHistoryStub = sb.stub(Chat, "fetchWithHistory");
      sb.stub(openAIEngine, "build").resolves({});
      const memoriesStub = sb
        .stub(this.ChatConversation.prototype, "getMemoriesContext")
        .resolves(null);

      const win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;

      (await getPromptButtons(browser))[0].click();

      await TestUtils.waitForCondition(
        () => fetchWithHistoryStub.calledOnce,
        "fetchWithHistory should be called after clicking prompt"
      );

      Assert.ok(
        memoriesStub.notCalled,
        "getMemoriesContext should not be called when memories are disabled"
      );

      await BrowserTestUtils.closeWindow(win);
    } finally {
      sb.restore();
      await SpecialPowers.popPrefEnv();
    }
  }
);

add_task(async function test_starter_prompts_hidden_after_click_on_new_tab() {
  const sb = sinon.createSandbox();

  try {
    sb.stub(Chat, "fetchWithHistory");
    sb.stub(openAIEngine, "build").resolves({});

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    (await getPromptButtons(browser))[0].click();

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      await ContentTaskUtils.waitForMutationCondition(
        aiWindowElement.shadowRoot,
        { childList: true, subtree: true },
        () => !aiWindowElement.shadowRoot.querySelector("smartwindow-prompts")
      );
    });

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(async function test_starter_prompts_hidden_after_click_in_sidebar() {
  const sb = sinon.createSandbox();

  try {
    sb.stub(Chat, "fetchWithHistory");
    sb.stub(openAIEngine, "build").resolves({});

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    (await getPromptButtons(browser))[0].click();

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      await ContentTaskUtils.waitForMutationCondition(
        aiWindowElement.shadowRoot,
        { childList: true, subtree: true },
        () => !aiWindowElement.shadowRoot.querySelector("smartwindow-prompts")
      );
    });

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});
