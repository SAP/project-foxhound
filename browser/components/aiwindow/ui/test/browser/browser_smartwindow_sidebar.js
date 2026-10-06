/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

/* global promiseNavigateAndLoad, AIWINDOW_URL, openAIWindow */

const { AIWindowUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs"
);

// Switching to a new AIWindow tab from a tab with the sidebar open closes the sidebar
add_task(async function test_new_tab_closes_opened_sidebar_convo() {
  const { restore } = await stubEngineNetworkBoundaries();

  let win, newTab;
  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await typeInSmartbar(browser, "hello");
    await submitSmartbar(browser);
    await promiseNavigateAndLoad(browser, "https://example.com/");
    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should be opened by AIWindowUI.openSidebar()"
    );

    newTab = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      AIWINDOW_URL
    );
    Assert.ok(
      !AIWindowUI.isSidebarOpen(win),
      "Sidebar should not be opened after switching to a fresh AIWindow tab"
    );
  } finally {
    if (newTab) {
      BrowserTestUtils.removeTab(newTab);
    }

    await BrowserTestUtils.closeWindow(win);
    await restore();
  }
});

// Navigating to a website moves an active fullwindow chat to the sidebar
add_task(
  async function test_navigate_to_url_with_active_chat_move_convo_to_sidebar() {
    const { restore } = await stubEngineNetworkBoundaries();

    let win;
    try {
      win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;

      await typeInSmartbar(browser, "hello");
      await submitSmartbar(browser);
      await promiseNavigateAndLoad(browser, "https://example.com/");

      Assert.ok(AIWindowUI.isSidebarOpen(win), "The sidebar should be open");
    } finally {
      await BrowserTestUtils.closeWindow(win);
      await restore();
    }
  }
);

add_task(async function test_navigate_back_to_aiwindow_closes_sidebar() {
  const { restore } = await stubEngineNetworkBoundaries();

  let win;
  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await typeInSmartbar(browser, "hello");
    await submitSmartbar(browser);
    await promiseNavigateAndLoad(browser, "https://example.com/");
    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should be open after navigating away"
    );

    // Navigate back to Smart Window URL
    await promiseNavigateAndLoad(browser, AIWINDOW_URL);
    Assert.ok(
      !AIWindowUI.isSidebarOpen(win),
      "Sidebar should close when navigating back to Smart Window URL"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    await restore();
  }
});

// Navigating with an empty conversation (no messages) opens the sidebar
add_task(async function test_navigate_with_empty_conversation_opens_sidebar() {
  let win;

  const { restore } = await stubEngineNetworkBoundaries();

  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    await promiseNavigateAndLoad(browser, "https://example.com/");

    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "The sidebar should be open even with an empty conversation"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    await restore();
  }
});

// Cleared conversations keep sidebar open but without conversation content
add_task(
  async function test_cleared_conversation_keeps_sidebar_open_on_tab_switch() {
    let win, newTab, originalTab;

    const { restore } = await stubEngineNetworkBoundaries();

    try {
      win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;
      originalTab = win.gBrowser.selectedTab;

      await typeInSmartbar(browser, "hello");
      await submitSmartbar(browser);
      await promiseNavigateAndLoad(browser, "https://example.com/");
      Assert.ok(
        AIWindowUI.isSidebarOpen(win),
        "Sidebar should be open after navigating away"
      );

      await clickNewChatButton(win);

      // Open a new AI Window tab - sidebar should close
      newTab = await BrowserTestUtils.openNewForegroundTab(
        win.gBrowser,
        AIWINDOW_URL
      );
      Assert.ok(
        !AIWindowUI.isSidebarOpen(win),
        "Sidebar should be closed when switching to new tab"
      );

      // Switch back to the original tab - sidebar should stay open but without conversation
      await BrowserTestUtils.switchTab(win.gBrowser, originalTab);
      Assert.ok(
        AIWindowUI.isSidebarOpen(win),
        "Sidebar should remain open when switching back to tab with cleared conversation"
      );
    } finally {
      if (newTab) {
        BrowserTestUtils.removeTab(newTab);
      }

      await BrowserTestUtils.closeWindow(win);
      await restore();
    }
  }
);

// Closing a tab with an active sidebar cleans up properly
add_task(async function test_close_tab_with_active_sidebar() {
  const { restore } = await stubEngineNetworkBoundaries();

  let win, newTab;
  try {
    win = await openAIWindow();
    const originalTab = win.gBrowser.selectedTab;
    const browser = win.gBrowser.selectedBrowser;

    await typeInSmartbar(browser, "hello");
    await submitSmartbar(browser);
    await promiseNavigateAndLoad(browser, "https://example.com/");
    Assert.ok(AIWindowUI.isSidebarOpen(win), "Sidebar should be open");

    // Open a new tab to switch to before closing original
    newTab = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      AIWINDOW_URL
    );
    Assert.ok(
      !AIWindowUI.isSidebarOpen(win),
      "Sidebar should close when switching to new tab"
    );

    // Close the original tab with conversation - should not throw
    BrowserTestUtils.removeTab(originalTab);

    Assert.ok(
      !AIWindowUI.isSidebarOpen(win),
      "Sidebar should be closed after tab with conversation is removed"
    );
  } finally {
    if (newTab) {
      BrowserTestUtils.removeTab(newTab);
    }

    await BrowserTestUtils.closeWindow(win);
    await restore();
  }
});

// Switching to tab with no state keeps sidebar open by default
add_task(async function test_tab_with_no_state_should_keep_sidebar() {
  let win, newTab;

  const { restore } = await stubEngineNetworkBoundaries();

  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await typeInSmartbar(browser, "hello");
    await submitSmartbar(browser);
    await promiseNavigateAndLoad(browser, "https://example.com/");
    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should be opened by AIWindowUI.openSidebar()"
    );

    newTab = await BrowserTestUtils.openNewForegroundTab(
      win.gBrowser,
      "https://example.com/"
    );
    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should remain open when switching to tab with no state (shouldOpenSidebar defaults to true)"
    );
  } finally {
    if (newTab) {
      BrowserTestUtils.removeTab(newTab);
    }

    await BrowserTestUtils.closeWindow(win);
    await restore();
  }
});

// Closing sidebar via Ask button prevents reopening on same-tab navigation
add_task(async function test_ask_button_close_persists_across_navigation() {
  let win;

  const { restore } = await stubEngineNetworkBoundaries();

  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await typeInSmartbar(browser, "hello");
    await submitSmartbar(browser);
    await promiseNavigateAndLoad(browser, "https://example.com/");
    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should open after navigating away with active conversation"
    );

    AIWindowUI.toggleSidebar(win);

    await promiseNavigateAndLoad(browser, "https://example.org/");

    Assert.ok(
      !AIWindowUI.isSidebarOpen(win),
      "Sidebar should remain closed after navigating when user explicitly closed it"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    await restore();
  }
});

add_task(
  async function test_tabs_after_first_should_open_sidebar_on_site_navigation() {
    let gAiWindow, newTab;

    const { restore } = await stubEngineNetworkBoundaries();

    try {
      gAiWindow = await openAIWindow();

      await promiseNavigateAndLoad(gAiWindow.gBrowser, "https://example.com/");
      Assert.ok(
        AIWindowUI.isSidebarOpen(gAiWindow),
        "Sidebar should open after navigating away with active conversation"
      );

      newTab = await BrowserTestUtils.openNewForegroundTab(
        gAiWindow.gBrowser,
        "https://example.net/"
      );
      Assert.ok(
        AIWindowUI.isSidebarOpen(gAiWindow),
        "Sidebar should open after navigating away with active conversation"
      );
    } finally {
      if (newTab) {
        BrowserTestUtils.removeTab(newTab);
      }

      await BrowserTestUtils.closeWindow(gAiWindow);
      await restore();
    }
  }
);
