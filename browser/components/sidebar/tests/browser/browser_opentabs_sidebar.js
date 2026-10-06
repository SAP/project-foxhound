/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [["sidebar.openTabsPanel.enabled", true]],
  });
});

async function showOpenTabsPanel() {
  await SidebarController.show("viewOpenTabsSidebar");
  const { contentDocument } = SidebarController.browser;
  const component = contentDocument.querySelector("sidebar-opentabs");
  Assert.ok(component, "Open tabs panel is shown.");
  return component;
}

function getTabList(component) {
  return component.shadowRoot.querySelector("sidebar-tab-list");
}

// Mirror the filtering done by OpenTabsController.getTabListItems.
function getVisibleTabCount() {
  return gBrowser.openTabs.filter(tab => !tab.hidden && !tab.closing).length;
}

async function waitForRowCount(tabList, expected) {
  await BrowserTestUtils.waitForMutationCondition(
    tabList.shadowRoot,
    { childList: true, subtree: true },
    () => tabList.rowEls?.length === expected
  );
}

add_task(async function test_opentabs_lists_current_window_tabs() {
  const tab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );
  const tab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  const component = await showOpenTabsPanel();
  const tabList = getTabList(component);
  const expected = getVisibleTabCount();
  await waitForRowCount(tabList, expected);

  Assert.equal(
    tabList.rowEls.length,
    expected,
    "Row count matches the number of visible tabs in the window."
  );

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
  SidebarController.hide();
});

add_task(async function test_clicking_row_selects_tab() {
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );
  // Select a different tab so clicking the row actually changes selection.
  gBrowser.selectedTab = gBrowser.tabs[0];

  const component = await showOpenTabsPanel();
  const tabList = getTabList(component);
  await waitForRowCount(tabList, getVisibleTabCount());

  const row = [...tabList.rowEls].find(rowEl => rowEl.tabElement === tab);
  Assert.ok(row, "Found the row for the opened tab.");

  const content = SidebarController.browser.contentWindow;
  await content.promiseDocumentFlushed(() => {});

  AccessibilityUtils.setEnv({ focusableRule: false });
  await EventUtils.synthesizeMouseAtCenter(row.mainEl, { button: 0 }, content);
  AccessibilityUtils.resetEnv();

  Assert.equal(
    gBrowser.selectedTab,
    tab,
    "Clicking a row selects the corresponding tab."
  );

  BrowserTestUtils.removeTab(tab);
  SidebarController.hide();
});

add_task(async function test_list_updates_on_open_and_close() {
  const component = await showOpenTabsPanel();
  const tabList = getTabList(component);

  const initialCount = getVisibleTabCount();
  await waitForRowCount(tabList, initialCount);

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );
  await waitForRowCount(tabList, initialCount + 1);
  Assert.equal(
    tabList.rowEls.length,
    initialCount + 1,
    "Opening a tab adds a row."
  );

  BrowserTestUtils.removeTab(tab);
  await waitForRowCount(tabList, initialCount);
  Assert.equal(
    tabList.rowEls.length,
    initialCount,
    "Closing a tab removes its row."
  );

  SidebarController.hide();
});

add_task(async function test_close_button_closes_tab() {
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:robots"
  );

  const component = await showOpenTabsPanel();
  const tabList = getTabList(component);
  const initialCount = getVisibleTabCount();

  const row = await TestUtils.waitForCondition(
    () => [...tabList.rowEls].find(rowEl => rowEl.url === "about:robots"),
    "Row for the opened tab should render."
  );

  const content = SidebarController.browser.contentWindow;
  await content.promiseDocumentFlushed(() => {});

  // Hover the row so its close button is interactable, then click it.
  await EventUtils.synthesizeMouseAtCenter(
    row.mainEl,
    { type: "mouseover" },
    content
  );
  const closeButton = await TestUtils.waitForCondition(
    () => row.secondaryButtonEl,
    "Close button should render on the row."
  );
  EventUtils.synthesizeMouseAtCenter(closeButton, {}, content);

  await TestUtils.waitForCondition(
    () => !gBrowser.tabs.includes(tab),
    "Clicking the close button should close the tab."
  );
  await waitForRowCount(tabList, initialCount - 1);

  SidebarController.hide();
});

add_task(async function test_pinned_tabs_show_as_icons_above_regular_list() {
  const tabToPin = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/"
  );

  const component = await showOpenTabsPanel();
  const tabList = getTabList(component);
  const initialVisible = getVisibleTabCount();
  await waitForRowCount(tabList, initialVisible);

  // Pin the tab; the pinned-tabs row should appear with one moz-button, and
  // the regular sidebar-tab-list should drop by one.
  gBrowser.pinTab(tabToPin);
  await BrowserTestUtils.waitForMutationCondition(
    component.shadowRoot,
    { childList: true, subtree: true },
    () =>
      component.shadowRoot.querySelectorAll(".pinned-tabs moz-button")
        .length === 1
  );
  await waitForRowCount(tabList, initialVisible - 1);

  const pinnedButtons = component.shadowRoot.querySelectorAll(
    ".pinned-tabs moz-button"
  );
  Assert.equal(
    pinnedButtons.length,
    1,
    "One pinned button rendered for the pinned tab."
  );
  Assert.equal(
    pinnedButtons[0].title,
    tabToPin.label,
    "Pinned button title matches the tab title."
  );
  Assert.ok(
    [...tabList.rowEls].every(row => row.tabElement !== tabToPin),
    "Pinned tab is no longer present in the regular tab list."
  );

  // Clicking the pinned button should activate the pinned tab.
  gBrowser.selectedTab = gBrowser.tabs[0];
  const content = SidebarController.browser.contentWindow;
  await content.promiseDocumentFlushed(() => {});
  AccessibilityUtils.setEnv({ focusableRule: false });
  EventUtils.synthesizeMouseAtCenter(pinnedButtons[0], {}, content);
  AccessibilityUtils.resetEnv();

  await TestUtils.waitForCondition(
    () => gBrowser.selectedTab === tabToPin,
    "Clicking the pinned button should activate the corresponding tab."
  );

  // Unpinning should remove the pinned-tabs row and reinsert the tab into the
  // regular sidebar-tab-list.
  gBrowser.unpinTab(tabToPin);
  await BrowserTestUtils.waitForMutationCondition(
    component.shadowRoot,
    { childList: true, subtree: true },
    () => !component.shadowRoot.querySelector(".pinned-tabs")
  );
  await waitForRowCount(tabList, initialVisible);

  Assert.ok(
    !component.shadowRoot.querySelector(".pinned-tabs"),
    "Pinned-tabs row is removed when no tabs are pinned."
  );
  Assert.ok(
    [...tabList.rowEls].some(row => row.tabElement === tabToPin),
    "Unpinned tab reappears in the regular tab list."
  );

  BrowserTestUtils.removeTab(tabToPin);
  SidebarController.hide();
});

add_task(async function test_keyboard_shortcut_toggles_open_tabs_panel() {
  // Ensure sidebar starts closed so the first keystroke is an unambiguous open.
  SidebarController.hide();
  Assert.ok(!SidebarController.isOpen, "Sidebar starts closed.");

  // On macOS the shortcut is literal Ctrl+U; on Windows/Linux it is Ctrl+Alt+U.
  const isMac = AppConstants.platform === "macosx";
  const modifiers = isMac ? { ctrlKey: true } : { ctrlKey: true, altKey: true };

  EventUtils.synthesizeKey("u", modifiers);

  await BrowserTestUtils.waitForCondition(
    () =>
      SidebarController.isOpen &&
      SidebarController.currentID === "viewOpenTabsSidebar",
    "The Open Tabs sidebar shortcut opens the panel."
  );
  Assert.equal(
    SidebarController.currentID,
    "viewOpenTabsSidebar",
    "Open Tabs panel is the active sidebar."
  );

  // Press the shortcut again — toggle should close the sidebar.
  EventUtils.synthesizeKey("u", modifiers);
  await BrowserTestUtils.waitForCondition(
    () => !SidebarController.isOpen,
    "Pressing the shortcut again closes the sidebar."
  );
  Assert.ok(!SidebarController.isOpen, "Sidebar is closed.");
});

add_task(async function test_multiple_windows_render_separate_cards() {
  const component = await showOpenTabsPanel();

  // Wait for the initial card (current window) to render.
  await BrowserTestUtils.waitForMutationCondition(
    component.shadowRoot,
    { childList: true, subtree: true },
    () => component.shadowRoot.querySelectorAll("moz-card").length === 1
  );

  const secondWindow = await BrowserTestUtils.openNewBrowserWindow();

  await BrowserTestUtils.waitForMutationCondition(
    component.shadowRoot,
    { childList: true, subtree: true },
    () => component.shadowRoot.querySelectorAll("moz-card").length === 2
  );

  let cards = component.shadowRoot.querySelectorAll("moz-card");
  Assert.equal(cards.length, 2, "Two cards rendered for two open windows.");

  // The current window's card should be rendered first.
  Assert.equal(
    cards[0].getAttribute("data-inner-id"),
    String(window.windowGlobalChild.innerWindowId),
    "Current window's card is rendered first."
  );
  Assert.equal(
    cards[1].getAttribute("data-inner-id"),
    String(secondWindow.windowGlobalChild.innerWindowId),
    "Second window's card uses its own inner window id."
  );

  await BrowserTestUtils.closeWindow(secondWindow);

  await BrowserTestUtils.waitForMutationCondition(
    component.shadowRoot,
    { childList: true, subtree: true },
    () => component.shadowRoot.querySelectorAll("moz-card").length === 1
  );

  Assert.equal(
    component.shadowRoot.querySelectorAll("moz-card").length,
    1,
    "Closing the second window removes its card."
  );

  SidebarController.hide();
});
