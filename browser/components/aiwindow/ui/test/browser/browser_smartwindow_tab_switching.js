/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const { AIWindowUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs"
);

const { Chat } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Chat.sys.mjs"
);

const { openAIEngine } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
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

function hasAiWindowAttribute() {
  return window.document.documentElement.hasAttribute("ai-window");
}

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

function createEmptyMockConversation(id = "test-empty-conv-id") {
  return new ChatConversation({
    id,
    pageUrl: new URL("https://example.com/"),
  });
}

async function open_ai_window() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  const newAIWindow = await BrowserTestUtils.openNewBrowserWindow({
    openerWindow: null,
    aiWindow: true,
  });

  const isAIWindow =
    newAIWindow.document.documentElement.hasAttribute("ai-window");

  if (!isAIWindow) {
    throw new Error("Did not open a new AIWindow");
  }

  return newAIWindow;
}

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
    ],
  });
});

// Switching to a new AIWindow tab from a tab with the sidebar open closes the sidebar
add_task(async function test_new_tab_closes_opened_sidebar_convo() {
  let win, newTab;
  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

    AIWindowUI.openSidebar(win);
    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should be opened by AIWindowUI.openSidebar()"
    );

    newTab = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "about:blank"
    );
    await TestUtils.waitForCondition(
      () => !AIWindowUI.isSidebarOpen(win),
      "Sidebar should close when switching to new tab"
    );

    Assert.ok(
      !AIWindowUI.isSidebarOpen(win),
      "Sidebar should not be opened after switching to a fresh AIWindow tab"
    );
  } finally {
    await BrowserTestUtils.removeTab(newTab);
    await BrowserTestUtils.closeWindow(win);
  }
});

// Navigating to a website moves an active fullwindow chat to the sidebar
add_task(
  async function test_navigate_to_url_with_active_chat_move_convo_to_sidebar() {
    const sb = lazy.sinon.createSandbox();

    let win, tab;
    try {
      const mockConversation = createMockConversation();
      sb.stub(ChatStore, "findConversationById").resolves(mockConversation);

      win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;
      tab = win.gBrowser.selectedTab;

      await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

      // Simulate a conversation started in fullpage mode
      win.dispatchEvent(
        new win.CustomEvent("ai-window:opened-conversation", {
          detail: {
            mode: "fullpage",
            conversationId: mockConversation.id,
            tab,
          },
        })
      );

      // Navigate to a URL
      const loaded = BrowserTestUtils.browserLoaded(browser);
      BrowserTestUtils.startLoadingURIString(browser, "https://example.com/");
      await loaded;

      await TestUtils.waitForCondition(
        () => AIWindowUI.isSidebarOpen(win),
        "Sidebar should be open after navigating away with active conversation"
      );

      Assert.ok(AIWindowUI.isSidebarOpen(win), "The sidebar should be open");
    } finally {
      await BrowserTestUtils.removeTab(tab);
      await BrowserTestUtils.closeWindow(win);
      sb.restore();
    }
  }
);

// Switching back to a tab with an active conversation reopens the sidebar
add_task(
  async function test_switch_back_to_tab_with_conversation_reopens_sidebar() {
    const sb = lazy.sinon.createSandbox();
    let win, newTab, originalTab;

    try {
      const mockConversation = createMockConversation();
      sb.stub(ChatStore, "findConversationById").resolves(mockConversation);

      win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;
      originalTab = win.gBrowser.selectedTab;

      await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

      // Set up conversation state for the original tab
      win.dispatchEvent(
        new win.CustomEvent("ai-window:opened-conversation", {
          detail: {
            mode: "fullpage",
            conversationId: mockConversation.id,
            tab: originalTab,
          },
        })
      );

      // Navigate away from AIWINDOW_URL (simulates user browsing after starting a chat)
      const loaded = BrowserTestUtils.browserLoaded(browser);
      BrowserTestUtils.startLoadingURIString(browser, "https://example.com/");
      await loaded;

      Assert.ok(
        AIWindowUI.isSidebarOpen(win),
        "Sidebar should be open after navigating away"
      );

      // Open a new tab - sidebar should close
      newTab = await BrowserTestUtils.openNewForegroundTab(
        win.gBrowser,
        "about:blank"
      );
      await TestUtils.waitForCondition(
        () => !AIWindowUI.isSidebarOpen(win),
        "Sidebar should close when switching to new tab"
      );

      // Switch back to the original tab - sidebar should reopen
      await BrowserTestUtils.switchTab(win.gBrowser, originalTab);
      await TestUtils.waitForCondition(
        () => AIWindowUI.isSidebarOpen(win),
        "Sidebar should reopen when switching back to tab with conversation"
      );
    } finally {
      await BrowserTestUtils.removeTab(originalTab);
      await BrowserTestUtils.removeTab(newTab);
      await BrowserTestUtils.closeWindow(win);
      sb.restore();
    }
  }
);

// Switching between tabs with different conversations maintains correct state
add_task(
  async function test_switch_between_tabs_with_different_conversations() {
    const sb = lazy.sinon.createSandbox();

    let tabA, tabB, win;
    try {
      const conversationA = createMockConversation("conv-a");
      const conversationB = createMockConversation("conv-b");

      const findStub = sb.stub(ChatStore, "findConversationById");
      findStub.withArgs("conv-a").resolves(conversationA);
      findStub.withArgs("conv-b").resolves(conversationB);

      win = await openAIWindow();
      const browserA = win.gBrowser.selectedBrowser;
      tabA = win.gBrowser.selectedTab;

      await BrowserTestUtils.browserLoaded(browserA, false, AIWINDOW_URL);

      // Set up conversation A for tab A
      win.dispatchEvent(
        new win.CustomEvent("ai-window:opened-conversation", {
          detail: {
            mode: "fullpage",
            conversationId: "conv-a",
            tab: tabA,
          },
        })
      );

      // Navigate tab A away from AIWINDOW_URL (simulates user browsing after starting a chat)
      let loaded = BrowserTestUtils.browserLoaded(browserA);
      BrowserTestUtils.startLoadingURIString(browserA, "https://example.com/");
      await loaded;

      // Open tab B with a different conversation
      tabB = await BrowserTestUtils.openNewForegroundTab(
        win.gBrowser,
        "https://example.org/"
      );

      win.dispatchEvent(
        new win.CustomEvent("ai-window:opened-conversation", {
          detail: {
            mode: "fullpage",
            conversationId: "conv-b",
            tab: tabB,
          },
        })
      );

      // Open sidebar for tab B
      AIWindowUI.openSidebar(win, conversationB);
      Assert.ok(
        AIWindowUI.isSidebarOpen(win),
        "Sidebar should be open for tab B"
      );

      // Switch to tab A - sidebar should update to conversation A
      await BrowserTestUtils.switchTab(win.gBrowser, tabA);

      Assert.ok(
        AIWindowUI.isSidebarOpen(win),
        "Sidebar should remain open when switching to tab A with conversation"
      );

      // Switch back to tab B
      await BrowserTestUtils.switchTab(win.gBrowser, tabB);

      Assert.ok(
        AIWindowUI.isSidebarOpen(win),
        "Sidebar should remain open when switching back to tab B"
      );
    } finally {
      await BrowserTestUtils.removeTab(tabA);
      await BrowserTestUtils.removeTab(tabB);
      await BrowserTestUtils.closeWindow(win);
      sb.restore();
    }
  }
);

// @todo Bug 2014929
// Navigating back to AI Window URL closes the sidebar
add_task(async function test_navigate_back_to_aiwindow_closes_sidebar() {
  const sb = lazy.sinon.createSandbox();

  try {
    const mockConversation = createMockConversation();
    sb.stub(ChatStore, "findConversationById").resolves(mockConversation);

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    const tab = win.gBrowser.selectedTab;

    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

    // Set up conversation state
    win.dispatchEvent(
      new win.CustomEvent("ai-window:opened-conversation", {
        detail: {
          mode: "fullpage",
          conversationId: mockConversation.id,
          tab,
        },
      })
    );

    // Navigate away to external URL
    let loaded = BrowserTestUtils.browserLoaded(browser);
    BrowserTestUtils.startLoadingURIString(browser, "https://example.com/");
    await loaded;

    // Give time for sidebar to open
    await new Promise(resolve => win.setTimeout(resolve, 100));
    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should be open after navigating away"
    );

    // Navigate back to AI Window URL
    loaded = BrowserTestUtils.browserLoaded(browser);
    BrowserTestUtils.startLoadingURIString(browser, AIWINDOW_URL);
    await loaded;

    // Give time for sidebar to close
    await new Promise(resolve => win.setTimeout(resolve, 100));
    Assert.ok(
      !AIWindowUI.isSidebarOpen(win),
      "Sidebar should close when navigating back to AI Window URL"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
}).skip();

// Navigating with an empty conversation (no messages) opens the sidebar
add_task(async function test_navigate_with_empty_conversation_opens_sidebar() {
  const sb = lazy.sinon.createSandbox();

  let win, tab;
  try {
    const emptyConversation = createEmptyMockConversation();
    sb.stub(ChatStore, "findConversationById").resolves(emptyConversation);

    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    tab = win.gBrowser.selectedTab;

    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

    // Simulate a conversation started in fullpage mode with no messages
    win.dispatchEvent(
      new win.CustomEvent("ai-window:opened-conversation", {
        detail: {
          mode: "fullpage",
          conversationId: emptyConversation.id,
          tab,
        },
      })
    );

    // Navigate to a URL
    const loaded = BrowserTestUtils.browserLoaded(browser);
    BrowserTestUtils.startLoadingURIString(browser, "https://example.com/");
    await loaded;

    await TestUtils.waitForCondition(
      () => AIWindowUI.isSidebarOpen(win),
      "Sidebar should open after navigating away with empty conversation"
    );

    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "The sidebar should be open even with an empty conversation"
    );
  } finally {
    await BrowserTestUtils.removeTab(tab);
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
  }
});

// @todo Bug 2018085
// Fix intermittent failures with this test
//
// Switching between tabs with empty and non-empty conversations
add_task(async function test_switch_between_empty_and_nonempty_conversations() {
  const sb = lazy.sinon.createSandbox();

  let tabA, tabB, win;
  try {
    const conversationA = createMockConversation("conv-a");
    const emptyConversationB = createEmptyMockConversation("conv-b-empty");

    const findStub = sb.stub(ChatStore, "findConversationById");
    findStub.withArgs("conv-a").resolves(conversationA);
    findStub.withArgs("conv-b-empty").resolves(emptyConversationB);

    win = await openAIWindow();
    const browserA = win.gBrowser.selectedBrowser;
    tabA = win.gBrowser.selectedTab;

    await BrowserTestUtils.browserLoaded(browserA, false, AIWINDOW_URL);

    // Set up conversation A (with messages) for tab A
    win.dispatchEvent(
      new win.CustomEvent("ai-window:opened-conversation", {
        detail: {
          mode: "fullpage",
          conversationId: "conv-a",
          tab: tabA,
        },
      })
    );

    // Navigate tab A away from AIWINDOW_URL
    let loaded = BrowserTestUtils.browserLoaded(browserA);
    BrowserTestUtils.startLoadingURIString(browserA, "https://example.com/");
    await loaded;

    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should be open for tab A with messages"
    );

    // Open tab B with an empty conversation
    tabB = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "https://example.org/"
    );

    win.dispatchEvent(
      new win.CustomEvent("ai-window:opened-conversation", {
        detail: {
          mode: "fullpage",
          conversationId: "conv-b-empty",
          tab: tabB,
        },
      })
    );

    // Open sidebar for tab B (empty conversation)
    AIWindowUI.openSidebar(win, emptyConversationB);
    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should be open for tab B with empty conversation"
    );

    // Switch to tab A - sidebar should remain open with conversation A
    await BrowserTestUtils.switchTab(win.gBrowser, tabA);

    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should remain open when switching to tab A"
    );

    // Switch back to tab B - sidebar should remain open
    await BrowserTestUtils.switchTab(win.gBrowser, tabB);

    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should remain open when switching to tab B with empty conversation"
    );
  } finally {
    await BrowserTestUtils.removeTab(tabA);
    await BrowserTestUtils.removeTab(tabB);
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
  }
}).skip();

// Switching between non-empty and empty conversations shows/hides starters
add_task(
  async function test_tab_switch_shows_starters_for_empty_conversation() {
    const sb = lazy.sinon.createSandbox();

    let tabA, tabB, win;
    try {
      const conversationA = createMockConversation("conv-a");

      const findStub = sb.stub(ChatStore, "findConversationById");
      findStub.withArgs("conv-a").resolves(conversationA);
      findStub.withArgs("conv-b-empty").resolves(null);

      win = await openAIWindow();
      const browserA = win.gBrowser.selectedBrowser;
      tabA = win.gBrowser.selectedTab;

      await BrowserTestUtils.browserLoaded(browserA, false, AIWINDOW_URL);

      // Set up conversation A (with messages) for tab A
      win.dispatchEvent(
        new win.CustomEvent("ai-window:opened-conversation", {
          detail: {
            mode: "fullpage",
            conversationId: "conv-a",
            tab: tabA,
          },
        })
      );

      // Navigate tab A away from AIWINDOW_URL to open sidebar
      let loaded = BrowserTestUtils.browserLoaded(browserA);
      BrowserTestUtils.startLoadingURIString(browserA, "https://example.com/");
      await loaded;

      await TestUtils.waitForCondition(
        () => AIWindowUI.isSidebarOpen(win),
        "Sidebar should open for tab A"
      );

      // Open tab B with an empty conversation
      tabB = await BrowserTestUtils.openNewForegroundTab(
        win.gBrowser,
        "https://example.org/"
      );

      win.dispatchEvent(
        new win.CustomEvent("ai-window:opened-conversation", {
          detail: {
            mode: "fullpage",
            conversationId: "conv-b-empty",
            tab: tabB,
          },
        })
      );

      AIWindowUI.openSidebar(win);

      const sidebarBrowser = win.document.getElementById(AIWindowUI.BROWSER_ID);
      await TestUtils.waitForCondition(
        () => !!sidebarBrowser.contentDocument.querySelector("ai-window"),
        "aiWindow element should be available"
      );

      const aiWindowEl =
        sidebarBrowser.contentDocument.querySelector("ai-window");

      // Switch to tab A (with messages) - starters should not show
      await BrowserTestUtils.switchTab(win.gBrowser, tabA);
      await TestUtils.waitForCondition(
        () => !aiWindowEl.showStarters,
        "Starters should be hidden for conversation with messages"
      );
      Assert.ok(!aiWindowEl.showStarters, "Starters should not be showing");

      // Switch to tab B (empty) - starters should show
      await BrowserTestUtils.switchTab(win.gBrowser, tabB);
      await TestUtils.waitForCondition(
        () => aiWindowEl.showStarters,
        "Starters should be displayed for empty conversation"
      );
      Assert.ok(aiWindowEl.showStarters, "Starters should be showing");

      // Switch back to tab A - starters should hide again
      await BrowserTestUtils.switchTab(win.gBrowser, tabA);
      await TestUtils.waitForCondition(
        () => !aiWindowEl.showStarters,
        "Starters should be hidden again for conversation with messages"
      );
      Assert.ok(!aiWindowEl.showStarters, "Starters should not be showing");

      // Switch to tab B again - starters should still show (regression test)
      await BrowserTestUtils.switchTab(win.gBrowser, tabB);
      await TestUtils.waitForCondition(
        () => aiWindowEl.showStarters,
        "Starters should still display on repeated switch to empty conversation"
      );
      Assert.ok(aiWindowEl.showStarters, "Starters should be showing");
    } finally {
      await BrowserTestUtils.removeTab(tabA);
      await BrowserTestUtils.removeTab(tabB);
      await BrowserTestUtils.closeWindow(win);
      sb.restore();
    }
  }
);

// Closing a tab with an active sidebar cleans up properly
add_task(async function test_close_tab_with_active_sidebar() {
  const sb = lazy.sinon.createSandbox();

  let win, newTab;
  try {
    const mockConversation = createMockConversation();
    sb.stub(ChatStore, "findConversationById").resolves(mockConversation);

    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    const originalTab = win.gBrowser.selectedTab;

    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

    // Set up conversation state
    win.dispatchEvent(
      new win.CustomEvent("ai-window:opened-conversation", {
        detail: {
          mode: "fullpage",
          conversationId: mockConversation.id,
          tab: originalTab,
        },
      })
    );

    // Open sidebar
    AIWindowUI.openSidebar(win, mockConversation);
    Assert.ok(AIWindowUI.isSidebarOpen(win), "Sidebar should be open");

    // Open a new tab to switch to before closing original
    newTab = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "about:blank"
    );
    await TestUtils.waitForCondition(
      () => !AIWindowUI.isSidebarOpen(win),
      "Sidebar should close when switching to new tab"
    );

    // Close the original tab with conversation - should not throw
    await BrowserTestUtils.removeTab(originalTab);
    await TestUtils.waitForCondition(
      () => !AIWindowUI.isSidebarOpen(win),
      "Sidebar should be closed after tab with conversation is removed"
    );
  } finally {
    await BrowserTestUtils.removeTab(newTab);
    await BrowserTestUtils.closeWindow(win);

    sb.restore();
  }
});

// @todo Bug 2014929
add_task(async function test_sidebar_state_after_multiple_navigations() {
  const sb = lazy.sinon.createSandbox();

  let win, tab;
  try {
    // Create a conversation with messages (simulating a started chat)
    const mockConversation = createMockConversation();
    sb.stub(ChatStore, "findConversationById").resolves(mockConversation);

    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    tab = win.gBrowser.selectedTab;

    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

    // Simulate a conversation started in fullpage mode with messages
    win.dispatchEvent(
      new win.CustomEvent("ai-window:opened-conversation", {
        detail: {
          mode: "fullpage",
          conversationId: mockConversation.id,
          tab,
        },
      })
    );

    Assert.ok(
      !AIWindowUI.isSidebarOpen(win),
      "Sidebar should be closed on AI Window URL"
    );

    // Navigate away - sidebar should open because conversation has messages
    let loaded = BrowserTestUtils.browserLoaded(browser);
    BrowserTestUtils.startLoadingURIString(browser, "https://example.com/");
    await loaded;
    await new Promise(resolve => win.setTimeout(resolve, 100));
    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should open when navigating away with active conversation"
    );

    // Navigate back to AI Window URL - sidebar should close
    loaded = BrowserTestUtils.browserLoaded(browser);
    BrowserTestUtils.startLoadingURIString(browser, AIWINDOW_URL);
    await loaded;
    await new Promise(resolve => win.setTimeout(resolve, 100));
    Assert.ok(
      !AIWindowUI.isSidebarOpen(win),
      "Sidebar should close when returning to AI Window URL"
    );

    // Navigate away again - sidebar should open again
    loaded = BrowserTestUtils.browserLoaded(browser);
    BrowserTestUtils.startLoadingURIString(browser, "https://example.org/");
    await loaded;
    await new Promise(resolve => win.setTimeout(resolve, 100));
    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should open again when navigating away"
    );
  } finally {
    await BrowserTestUtils.removeTab(tab);
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
  }
}).skip();
