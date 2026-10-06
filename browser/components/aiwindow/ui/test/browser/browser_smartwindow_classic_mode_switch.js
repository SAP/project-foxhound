/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

/* global promiseNavigateAndLoad, AIWINDOW_URL, openAIWindow */

const { AIWindowUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs"
);

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.sidebar.openByDefault", true],
    ],
  });
});

// Switching to classic mode tears down tab state management
add_task(async function test_classic_mode_disables_tab_state_events() {
  const { restore } = await stubEngineNetworkBoundaries();

  let win, newTab;
  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    const originalTab = win.gBrowser.selectedTab;

    await typeInSmartbar(browser, "hello");
    await submitSmartbar(browser);

    await SpecialPowers.spawn(browser, [], async () => {
      const el = content.document.querySelector("ai-window");
      await ContentTaskUtils.waitForCondition(
        () => el.conversationMessageCount > 0,
        "Wait for chat response before navigating"
      );
    });

    await promiseNavigateAndLoad(browser, "https://example.com/");

    Assert.ok(
      AIWindowUI.isSidebarOpen(win),
      "Sidebar should open in smart mode"
    );

    AIWindow.toggleAIWindow(win, false);

    Assert.ok(
      !AIWindowUI.isSidebarOpen(win),
      "Sidebar should be closed after switching to Classic Window"
    );

    // Wait for AIWINDOW_URL to finish loading before switching the tab
    // again to prevent an unhandled promise error that happens from
    // AsyncTabSwitch.sys.mjs:380
    //  let isLocalAbout = requestedBrowser.currentURI.schemeIs("about")
    //
    newTab = BrowserTestUtils.addTab(win.gBrowser, AIWINDOW_URL);
    await BrowserTestUtils.browserLoaded(newTab.linkedBrowser);
    await BrowserTestUtils.switchTab(win.gBrowser, newTab);
    await TestUtils.waitForTick();

    await BrowserTestUtils.switchTab(win.gBrowser, originalTab);
    await TestUtils.waitForTick();

    Assert.ok(
      !AIWindowUI.isSidebarOpen(win),
      "Sidebar should remain closed in Classic Window after tab switch"
    );
  } finally {
    if (newTab) {
      BrowserTestUtils.removeTab(newTab);
    }

    // Navigate away from the remote page before closing so the content
    // process shuts down cleanly and doesn't leave an unhandled rejection.
    await promiseNavigateAndLoad(win.gBrowser.selectedBrowser, "about:blank");

    await BrowserTestUtils.closeWindow(win);
    await restore();
  }
});
