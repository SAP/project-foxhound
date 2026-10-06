/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { PromiseTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PromiseTestUtils.sys.mjs"
);
// AI chat content loads Fluent strings asynchronously, which may not complete
// before the test finishes. This is expected and doesn't affect test behavior.
PromiseTestUtils.allowMatchingRejectionsGlobally(
  /Missing message.*smartwindow-messages-document-title/
);

// Toggling AI window flips BROWSER_NEW_TAB_URL, which can leave a preloaded
// about:newtab browser dangling until shutdown if preload kicks in afterward.
registerCleanupFunction(() => {
  NewTabPagePreloading.removePreloadedBrowser(window);
});

// Ensure Window Switcher button is visible when AI Window is enabled in prefs
add_task(async function test_window_switcher_button_visibility() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", false],
    ],
  });

  let button = document.getElementById("ai-window-toggle");
  Assert.ok(
    button?.hidden,
    "Window switcher button should be hidden when AI Window is disabled"
  );

  await SpecialPowers.popPrefEnv();

  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  button = document.getElementById("ai-window-toggle");
  Assert.ok(
    button && !button.hidden,
    "Window switcher button should be visible when AI Window is enabled"
  );

  await SpecialPowers.popPrefEnv();
});

// if (browser.smartwindow.enabled) Classic Window should switch to AI Window on click
add_task(async function test_switch_to_ai_window() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", true],
    ],
  });

  const restoreSignIn = skipSignIn();

  if (document.documentElement.hasAttribute("ai-window")) {
    document.documentElement.removeAttribute("ai-window");
  }

  let button = document.getElementById("ai-window-toggle");
  let view = PanelMultiView.getViewNode(document, "ai-window-toggle-view");

  let viewShownPromise = BrowserTestUtils.waitForEvent(view, "ViewShown");
  button.click();
  await viewShownPromise;

  let aiButton = view.querySelector("#ai-window-switch-ai");
  aiButton.click();

  await TestUtils.waitForCondition(
    () => document.documentElement.hasAttribute("ai-window"),
    "Window should have ai-window attribute after switching"
  );

  Assert.ok(
    document.documentElement.hasAttribute("ai-window"),
    "Window should be in AI Window mode"
  );

  let iconListImage = window.getComputedStyle(button)["list-style-image"];
  Assert.ok(
    iconListImage.includes("smart-window-simplified.svg"),
    "Button icon should change to AI Window icon"
  );

  await TestUtils.waitForCondition(
    () => PanelUI.panel.state === "closed",
    "Panel should close after switching"
  );

  restoreSignIn();
  await SpecialPowers.popPrefEnv();
});

// if (browser.smartwindow.enabled) AI Window should switch to Classic Window on click
add_task(async function test_switch_to_classic_window() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", true],
    ],
  });

  if (!AIWindow.isAIWindowActive(window)) {
    AIWindow.toggleAIWindow(window, true);
  }

  let button = document.getElementById("ai-window-toggle");
  let view = PanelMultiView.getViewNode(document, "ai-window-toggle-view");

  let viewShownPromise = BrowserTestUtils.waitForEvent(view, "ViewShown");
  button.click();
  await viewShownPromise;

  let classicButton = view.querySelector("#ai-window-switch-classic");
  classicButton.click();

  await TestUtils.waitForCondition(
    () => !document.documentElement.hasAttribute("ai-window"),
    "Window should not have ai-window attribute after switching"
  );

  Assert.ok(
    !document.documentElement.hasAttribute("ai-window"),
    "Window should be in Classic Window mode"
  );

  let iconListImage = window.getComputedStyle(button)["list-style-image"];
  Assert.ok(
    iconListImage.includes("icon32.png"),
    "Button icon should change to Classic Window icon"
  );

  await TestUtils.waitForCondition(
    () => PanelUI.panel.state === "closed",
    "Panel should close after switching"
  );

  await SpecialPowers.popPrefEnv();
});

// Window switcher should be positioned in TabsToolbar when vertical tabs are disabled
add_task(async function test_switcher_position_horizontal_tabs() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", true],
      ["sidebar.verticalTabs", false],
    ],
  });

  let button = document.getElementById("ai-window-toggle");
  Assert.ok(button, "Window switcher button should exist");

  let tabsToolbar = document.getElementById("TabsToolbar");
  Assert.ok(tabsToolbar, "TabsToolbar should exist");

  Assert.equal(
    button.closest("#TabsToolbar"),
    tabsToolbar,
    "Window switcher should be in TabsToolbar when vertical tabs are disabled"
  );

  Assert.ok(
    !button.closest("#nav-bar"),
    "Window switcher should not be in nav-bar when vertical tabs are disabled"
  );

  await SpecialPowers.popPrefEnv();
});

// Window switcher should be positioned in nav-bar when vertical tabs are enabled
add_task(async function test_switcher_position_vertical_tabs() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", true],
      ["sidebar.verticalTabs", true],
    ],
  });

  let button = document.getElementById("ai-window-toggle");
  Assert.ok(button, "Window switcher button should exist");

  let navBar = document.getElementById("nav-bar");
  Assert.ok(navBar, "nav-bar should exist");

  Assert.equal(
    button.closest("#nav-bar"),
    navBar,
    "Window switcher should be in nav-bar when vertical tabs are enabled"
  );

  Assert.ok(
    !button.closest("#TabsToolbar"),
    "Window switcher should not be in TabsToolbar when vertical tabs are enabled"
  );

  let panelUIButton = document.getElementById("PanelUI-button");
  Assert.ok(panelUIButton, "PanelUI button should exist");

  await SpecialPowers.popPrefEnv();
});

// Window switcher should dynamically reposition when horizontal/vertical tabs preference changes
add_task(async function test_switcher_repositions_on_pref_change() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", true],
      ["sidebar.verticalTabs", false],
    ],
  });

  let button = document.getElementById("ai-window-toggle");
  let tabsToolbar = document.getElementById("TabsToolbar");
  let navBar = document.getElementById("nav-bar");

  Assert.equal(
    button.closest("#TabsToolbar"),
    tabsToolbar,
    "Window switcher should initially be in TabsToolbar"
  );

  await SpecialPowers.pushPrefEnv({
    set: [["sidebar.verticalTabs", true]],
  });

  await BrowserTestUtils.waitForMutationCondition(
    navBar,
    { childList: true, subtree: true },
    () => button.closest("#nav-bar") === navBar
  );

  Assert.equal(
    button.closest("#nav-bar"),
    navBar,
    "Window switcher should be in nav-bar after enabling vertical tabs"
  );

  await SpecialPowers.pushPrefEnv({
    set: [["sidebar.verticalTabs", false]],
  });

  await BrowserTestUtils.waitForMutationCondition(
    tabsToolbar,
    { childList: true, subtree: true },
    () => button.closest("#TabsToolbar") === tabsToolbar
  );

  Assert.equal(
    button.closest("#TabsToolbar"),
    tabsToolbar,
    "Window switcher should be back in TabsToolbar after disabling vertical tabs"
  );

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_switcher_button_appears_in_classic_mode() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    Assert.ok(
      aiWindowElement && !aiWindowElement.hidden,
      "ai-window element should be visible pre-toggle"
    );

    // Simulate active chat
    aiWindowElement.classList.add("chat-active");
  });

  AIWindow.toggleAIWindow(win, false);

  await BrowserTestUtils.waitForMutationCondition(
    win.document.documentElement,
    { attributes: true, attributeFilter: ["ai-window"] },
    () => !win.document.documentElement.hasAttribute("ai-window")
  );

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    Assert.ok(
      aiWindowElement && !aiWindowElement.hidden,
      "ai-window element should be visible in Classic Window after toggle from Smart Window"
    );

    const button = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot.querySelector("#smartbar-toggle-button"),
      "Toggle button should be in DOM in Classic Window"
    );

    Assert.ok(
      !button.hidden,
      "Toggle button should be visible in Classic Window"
    );

    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    Assert.ok(smartbar?.hidden, "Smartbar should be hidden in Classic Window");

    button.click();
  });

  await BrowserTestUtils.waitForMutationCondition(
    win.document.documentElement,
    { attributes: true, attributeFilter: ["ai-window"] },
    () => win.document.documentElement.hasAttribute("ai-window")
  );

  Assert.ok(
    win.document.documentElement.hasAttribute("ai-window"),
    "Window should have ai-window attribute after toggling back to Smart Window"
  );

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    Assert.ok(
      aiWindowElement && !aiWindowElement.hidden,
      "ai-window element should still be visible after toggling back to Smart Window"
    );

    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    await ContentTaskUtils.waitForCondition(
      () => smartbar && !smartbar.hidden,
      "Smartbar should be visible after toggling back to Smart Window"
    );

    const toggleButton = aiWindowElement.shadowRoot.querySelector(
      "#smartbar-toggle-button"
    );
    Assert.ok(
      toggleButton?.hidden,
      "Toggle button should be hidden in Smart Window"
    );
  });

  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.flushPrefEnv();
});

add_task(
  async function test_hamburger_menu_position_depends_on_smartwindow_pref() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["sidebar.verticalTabs", false],
        ["browser.smartwindow.enabled", false],
      ],
    });

    const restoreSignIn = skipSignIn();
    const hamburgerMenu = document.getElementById("PanelUI-button");
    const modeSwitcherButton = document.getElementById("ai-window-toggle");
    const navBar = document.getElementById("nav-bar");

    // smartwindow.enabled is false, and is classic window
    Assert.ok(
      hamburgerMenu.closest("#nav-bar"),
      "Hamburger menu should remain in nav-bar when smartwindow.enabled pref is false with horizontal tabs"
    );
    Assert.notEqual(
      hamburgerMenu,
      modeSwitcherButton.nextElementSibling,
      "Hamburger menu should NOT be adjacent to Window Switcher when smartwindow.enabled pref is false with horizontal tabs"
    );

    // Smartwindow.enabled is true
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.enabled", true]],
    });

    // smartwindow.enabled is true, and is classic window
    Assert.equal(
      hamburgerMenu,
      modeSwitcherButton.nextElementSibling,
      "Hamburger menu should be positioned after Window Switcher when smartwindow.enabled pref is true with horizontal tabs in classic mode"
    );

    AIWindow.toggleAIWindow(window, true);

    // smartwindow.enabled is true, and is smart window
    Assert.equal(
      hamburgerMenu,
      modeSwitcherButton.nextElementSibling,
      "Hamburger menu should be positioned after Window Switcher when smartwindow.enabled pref is true with horizontal tabs in smart/ai mode"
    );

    // Switch to vertical tabs - hamburger should stay beside switcher
    await SpecialPowers.pushPrefEnv({
      set: [["sidebar.verticalTabs", true]],
    });

    await BrowserTestUtils.waitForMutationCondition(
      navBar,
      { childList: true, subtree: true },
      () => hamburgerMenu === modeSwitcherButton.nextElementSibling
    );

    // smartwindow.enabled is true, and is smart window, vertical tabs
    Assert.equal(
      hamburgerMenu,
      modeSwitcherButton.nextElementSibling,
      "Hamburger menu should be positioned after Window Switcher with vertical tabs"
    );

    await SpecialPowers.pushPrefEnv({
      set: [["sidebar.verticalTabs", false]],
    });

    AIWindow.toggleAIWindow(window, false);

    // smartwindow.enabled is true, and switched back to classic window
    Assert.equal(
      hamburgerMenu,
      modeSwitcherButton.nextElementSibling,
      "Hamburger menu should be positioned after Window Switcher when smartwindow.enabled pref is true with horizontal tabs in classic mode"
    );

    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.enabled", false]],
    });

    // smartwindow.enabled is false, and is classic window
    Assert.ok(
      hamburgerMenu.closest("#nav-bar"),
      "Hamburger menu should return to nav-bar when smartwindow.enabled flips back to false"
    );

    /* cleanup to avoid window leaks */
    if (document.documentElement.hasAttribute("ai-window")) {
      AIWindow.toggleAIWindow(window, false);
      await TestUtils.waitForCondition(
        () => !document.documentElement.hasAttribute("ai-window"),
        "Window should return to classic mode"
      );
    }

    restoreSignIn();
    await SpecialPowers.flushPrefEnv();
  }
);

// Test that _onAccountLogout switches AI windows to classic mode
add_task(async function test_onAccountLogout_switches_windows() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", true],
    ],
  });

  const win = await openAIWindow();
  Assert.ok(AIWindow.isAIWindowActive(win), "Window should start in AI mode");

  AIWindow._onAccountLogout();

  Assert.ok(
    !AIWindow.isAIWindowActive(win),
    "Window should switch to classic mode after logout"
  );

  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
});

// Blocking via AI control pref should hide switcher button
add_task(async function test_ai_control_block_hides_switcher() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", true],
      ["browser.ai.control.smartWindow", "default"],
    ],
  });

  let win = await openAIWindow();
  let button = win.document.getElementById("ai-window-toggle");

  Assert.ok(!button?.hidden, "Switcher button should be visible");

  await SpecialPowers.pushPrefEnv({
    set: [["browser.ai.control.smartWindow", "blocked"]],
  });

  await TestUtils.waitForCondition(
    () => button?.hidden,
    "Switcher button should be hidden when AI control is blocked"
  );

  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
  await SpecialPowers.popPrefEnv();
});

// Blocking via global AI control default should hide switcher button
add_task(async function test_ai_control_default_block_hides_switcher() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", true],
      ["browser.ai.control.smartWindow", "default"],
      ["browser.ai.control.default", "available"],
    ],
  });

  let win = await openAIWindow();
  let button = win.document.getElementById("ai-window-toggle");

  Assert.ok(!button?.hidden, "Switcher button should be visible");

  await SpecialPowers.pushPrefEnv({
    set: [["browser.ai.control.default", "blocked"]],
  });

  await TestUtils.waitForCondition(
    () => button?.hidden,
    "Switcher button should be hidden when global AI control default is blocked"
  );

  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
  await SpecialPowers.popPrefEnv();
});

// Custom homepage tabs should be reconciled when toggling to AI Window
add_task(async function test_reconcile_custom_homepage_on_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", true],
      [
        "browser.startup.homepage",
        "https://example.com|www.example.com|https://example.org",
      ],
    ],
  });

  const restoreSignIn = skipSignIn();
  const win = await openAIWindow();

  // Toggle to classic first so we can load custom homepage URLs
  AIWindow.toggleAIWindow(win, false);

  const tab1 = await BrowserTestUtils.openNewForegroundTab(
    win.gBrowser,
    "https://example.com/"
  );
  const tab2 = await BrowserTestUtils.openNewForegroundTab(
    win.gBrowser,
    "https://example.org/"
  );

  // Toggle to AI Window - custom homepage tabs should be reconciled.
  // The schemeless "www.example.com" entry is gracefully skipped.
  AIWindow.toggleAIWindow(win, true);

  await TestUtils.waitForCondition(
    () => tab1.linkedBrowser.currentURI.spec === AIWINDOW_URL,
    "Tab with first custom homepage URL should be reconciled to Smart Window URL"
  );
  await TestUtils.waitForCondition(
    () => tab2.linkedBrowser.currentURI.spec === AIWINDOW_URL,
    "Tab with second custom homepage URL should be reconciled to Smart Window URL"
  );

  Assert.equal(
    tab1.linkedBrowser.currentURI.spec,
    AIWINDOW_URL,
    "First custom homepage tab should now show Smart Window"
  );
  Assert.equal(
    tab2.linkedBrowser.currentURI.spec,
    AIWINDOW_URL,
    "Second custom homepage tab should now show Smart Window"
  );

  await BrowserTestUtils.removeTab(tab1);
  await BrowserTestUtils.removeTab(tab2);
  restoreSignIn();
  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
});
// Sidebar should be hidden when switching to Classic Window
add_task(async function test_hide_sidebar_when_switching_to_classic_window() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", true],
    ],
  });

  const win = await openAIWindow();
  const exampleUrl = "https://example.com/";

  await BrowserTestUtils.loadURIString({
    browser: win.gBrowser.selectedTab.linkedBrowser,
    uriString: exampleUrl,
  });

  // Show sidebar elements directly to avoid triggering AI network request
  let box = win.document.getElementById("ai-window-box");
  let splitter = win.document.getElementById("ai-window-splitter");
  box.hidden = false;
  splitter.hidden = false;

  Assert.ok(AIWindowUI.isSidebarOpen(win), "Sidebar should be open");

  // Switch to classic
  let button = win.document.getElementById("ai-window-toggle");
  let view = PanelMultiView.getViewNode(win.document, "ai-window-toggle-view");
  let viewShownPromise = BrowserTestUtils.waitForEvent(view, "ViewShown");
  EventUtils.synthesizeMouseAtCenter(button, {}, win);
  await viewShownPromise;

  let classicButton = view.querySelector("#ai-window-switch-classic");
  EventUtils.synthesizeMouseAtCenter(classicButton, {}, win);

  await TestUtils.waitForCondition(
    () => !win.document.documentElement.hasAttribute("ai-window"),
    "Window should be in Classic Window mode"
  );

  Assert.ok(
    !AIWindowUI.isSidebarOpen(win),
    "Sidebar should be closed after switching to Classic Window"
  );

  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
});
