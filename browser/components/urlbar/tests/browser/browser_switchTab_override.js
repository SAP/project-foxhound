/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This test ensures that overriding switch-to-tab correctly loads the page
 * rather than switching to it.
 */

"use strict";

const TEST_URL = `${TEST_BASE_URL}dummy_page.html`;

add_task(async function test_switchtab_override() {
  info("Opening first tab");
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  info("Opening and selecting second tab");
  let secondTab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  info("Wait for autocomplete");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "dummy_page",
  });

  info("Select second autocomplete popup entry");
  EventUtils.synthesizeKey("KEY_ArrowDown");
  let result = await UrlbarTestUtils.getDetailsOfResultAt(
    window,
    UrlbarTestUtils.getSelectedRowIndex(window)
  );
  Assert.equal(result.type, UrlbarUtils.RESULT_TYPE.TAB_SWITCH);

  // Check to see if the switchtab label is visible and
  // all other labels are hidden
  const allLabels = document.getElementById("urlbar-label-box").children;
  for (let label of allLabels) {
    if (label.id == "urlbar-label-switchtab") {
      Assert.ok(BrowserTestUtils.isVisible(label));
    } else {
      Assert.ok(BrowserTestUtils.isHidden(label));
    }
  }

  info("Override switch-to-tab");
  let deferred = Promise.withResolvers();
  // In case of failure this would switch tab.
  let onTabSelect = () => {
    deferred.reject(new Error("Should have overridden switch to tab"));
  };
  gBrowser.tabContainer.addEventListener("TabSelect", onTabSelect);
  registerCleanupFunction(() => {
    gBrowser.tabContainer.removeEventListener("TabSelect", onTabSelect);
  });
  // Otherwise it would load the page.
  BrowserTestUtils.browserLoaded(secondTab.linkedBrowser).then(
    deferred.resolve
  );

  EventUtils.synthesizeKey("KEY_Shift", { type: "keydown" });

  // Checks that all labels are hidden when Shift is held down on the SwitchToTab result
  for (let label of allLabels) {
    Assert.ok(BrowserTestUtils.isHidden(label));
  }

  let attribute = "action-override";
  Assert.ok(
    gURLBar.view.panel.hasAttribute(attribute),
    "We should be overriding"
  );

  EventUtils.synthesizeKey("KEY_Enter");
  info(`gURLBar.value = ${gURLBar.value}`);
  await deferred.promise;

  // Blurring the urlbar should have cleared the override.
  Assert.ok(
    !gURLBar.view.panel.hasAttribute(attribute),
    "We should not be overriding anymore"
  );

  EventUtils.synthesizeKey("KEY_Shift", { type: "keyup" });
  await PlacesUtils.history.clear();
  gBrowser.removeTab(tab);
  gBrowser.removeTab(secondTab);
});

add_task(async function test_switchtab_override_scotch_bonnet() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.secondaryActions.switchToTab", true]],
  });

  info("Opening first tab");
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  info("Opening and selecting second tab");
  let secondTab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  info("Wait for autocomplete");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "dummy_page",
  });

  info("Select second autocomplete popup entry");
  EventUtils.synthesizeKey("KEY_ArrowDown");
  let result = await UrlbarTestUtils.getDetailsOfResultAt(
    window,
    UrlbarTestUtils.getSelectedRowIndex(window)
  );
  Assert.equal(result.type, UrlbarUtils.RESULT_TYPE.TAB_SWITCH);

  info("Check the current status");
  let actionButton = result.element.row.querySelector(
    ".urlbarView-action-btn[data-action=tabswitch]"
  );
  let urlLabel = result.element.url;
  Assert.ok(BrowserTestUtils.isVisible(actionButton));
  Assert.ok(BrowserTestUtils.isHidden(urlLabel));

  info("Enable action-override");
  EventUtils.synthesizeKey("KEY_Shift", { type: "keydown" });
  Assert.ok(BrowserTestUtils.isHidden(actionButton));
  Assert.ok(BrowserTestUtils.isVisible(urlLabel));

  info("Disable action-override");
  EventUtils.synthesizeKey("KEY_Shift", { type: "keyup" });
  Assert.ok(BrowserTestUtils.isVisible(actionButton));
  Assert.ok(BrowserTestUtils.isHidden(urlLabel));

  info("Cleanup");
  gBrowser.removeTab(tab);
  gBrowser.removeTab(secondTab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_switchtab_override_scotch_bonnet_for_split_view() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.secondaryActions.switchToTab", false]],
  });

  info("Opening first tab");
  let tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  let tab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:opentabs"
  );

  info("Opening and selecting second tab");
  let tab3 = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  gBrowser.addTabSplitView([tab2, tab3]);
  let tabbrowserTabs = document.getElementById("tabbrowser-tabs");
  await BrowserTestUtils.waitForMutationCondition(
    tabbrowserTabs,
    { childList: true },
    () => tabbrowserTabs.querySelectorAll("tab-split-view-wrapper").length === 1
  );

  info("Wait for autocomplete");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "dummy_page",
  });

  info("Select second autocomplete popup entry");
  EventUtils.synthesizeKey("KEY_ArrowDown");
  let result = await UrlbarTestUtils.getDetailsOfResultAt(
    window,
    UrlbarTestUtils.getSelectedRowIndex(window)
  );
  Assert.equal(result.type, UrlbarUtils.RESULT_TYPE.TAB_SWITCH);

  info("Check the current status");
  let actionLabel = result.element.row.querySelector(".urlbarView-action");
  Assert.ok(BrowserTestUtils.isVisible(actionLabel));
  Assert.ok(actionLabel.textContent, "Move tab to Split View");

  info("Cleanup");
  gBrowser.removeTab(tab1);
  gBrowser.removeTab(tab2);
  gBrowser.removeTab(tab3);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_move_tab_to_split_view_from_another_window() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.secondaryActions.switchToTab", false]],
  });

  info("Opening first window with a tab");
  let win1 = await BrowserTestUtils.openNewBrowserWindow();
  await BrowserTestUtils.openNewForegroundTab(win1.gBrowser, TEST_URL);

  info("Opening second window with split view");
  let win2 = await BrowserTestUtils.openNewBrowserWindow();
  let tab2 = await BrowserTestUtils.openNewForegroundTab(
    win2.gBrowser,
    "about:opentabs"
  );
  let tab3 = await BrowserTestUtils.openNewForegroundTab(win2.gBrowser);

  let tabbrowserTabs = win2.gBrowser.tabContainer;
  let splitViewCreated = BrowserTestUtils.waitForEvent(
    tabbrowserTabs,
    "SplitViewCreated"
  );
  let splitView = win2.gBrowser.addTabSplitView([tab2, tab3], { id: 1 });
  await splitViewCreated;

  info("Wait for autocomplete in second window");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window: win2,
    value: "dummy_page",
  });

  info("Select autocomplete entry for tab in first window");
  EventUtils.synthesizeKey("KEY_ArrowDown", {}, win2);
  let result = await UrlbarTestUtils.getDetailsOfResultAt(
    win2,
    UrlbarTestUtils.getSelectedRowIndex(win2)
  );
  Assert.equal(result.type, UrlbarUtils.RESULT_TYPE.TAB_SWITCH);

  info("Check that action shows 'Move tab to Split View'");
  let actionLabel = result.element.row.querySelector(".urlbarView-action");
  Assert.ok(BrowserTestUtils.isVisible(actionLabel));
  Assert.ok(actionLabel.textContent.includes("Move"));

  info("Count tabs in both windows before action");
  let win1TabCountBefore = win1.gBrowser.tabs.length;
  let win2TabCountBefore = win2.gBrowser.tabs.length;

  info("Press Enter to move tab to split view");
  EventUtils.synthesizeKey("KEY_Enter", {}, win2);

  await BrowserTestUtils.waitForCondition(
    () =>
      win1.gBrowser.tabs.length === win1TabCountBefore - 1 &&
      win2.gBrowser.tabs.length === win2TabCountBefore,
    "Wait for tab to be moved from window 1 and replaced in window 2 split view"
  );

  info("Verify tab was replaced in split view, not added as third tab");
  Assert.equal(
    win2.gBrowser.tabs.length,
    win2TabCountBefore,
    "Second window should still have same number of tabs (tab replaced, not added)"
  );

  info("Verify original tab was moved from first window");
  Assert.equal(
    win1.gBrowser.tabs.length,
    win1TabCountBefore - 1,
    "First window should have one fewer tab (tab was moved)"
  );

  info("Verify the moved tab has the expected URL in split view");
  let tabWithTestUrl = splitView.tabs.find(
    tab => tab.linkedBrowser.currentURI.spec === TEST_URL
  );
  Assert.ok(
    tabWithTestUrl,
    "One of the split view tabs should have the moved tab's URL"
  );

  info(
    "Verify split view panels have correct attributes after cross-window move"
  );
  const [firstTab, secondTab] = splitView.tabs;
  const firstPanel = win2.document.getElementById(firstTab.linkedPanel);
  const secondPanel = win2.document.getElementById(secondTab.linkedPanel);

  await BrowserTestUtils.waitForMutationCondition(
    firstPanel,
    { attributes: true },
    () => firstPanel.classList.contains("split-view-panel-active")
  );
  await BrowserTestUtils.waitForMutationCondition(
    secondPanel,
    { attributes: true },
    () => secondPanel.classList.contains("split-view-panel-active")
  );

  Assert.ok(
    firstPanel.classList.contains("split-view-panel"),
    "First panel has split-view-panel class after cross-window move"
  );
  Assert.ok(
    secondPanel.classList.contains("split-view-panel"),
    "Second panel has split-view-panel class after cross-window move"
  );
  Assert.ok(
    firstPanel.classList.contains("split-view-panel-active"),
    "First panel has split-view-panel-active class after cross-window move"
  );
  Assert.ok(
    secondPanel.classList.contains("split-view-panel-active"),
    "Second panel has split-view-panel-active class after cross-window move"
  );

  info("Verify panels are displayed at roughly half width");
  const tabpanels = win2.document.getElementById("tabbrowser-tabpanels");
  const tabpanelsWidth = tabpanels.getBoundingClientRect().width;
  const firstPanelWidth = firstPanel.getBoundingClientRect().width;
  const secondPanelWidth = secondPanel.getBoundingClientRect().width;
  const expectedWidth = tabpanelsWidth / 2;
  const tolerance = 50;

  Assert.less(
    Math.abs(firstPanelWidth - expectedWidth),
    tolerance,
    `First panel width (${firstPanelWidth}px) is roughly half of tabpanels width (${tabpanelsWidth}px)`
  );
  Assert.less(
    Math.abs(secondPanelWidth - expectedWidth),
    tolerance,
    `Second panel width (${secondPanelWidth}px) is roughly half of tabpanels width (${tabpanelsWidth}px)`
  );

  info("Cleanup");
  await BrowserTestUtils.closeWindow(win1);
  await BrowserTestUtils.closeWindow(win2);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_move_tab_to_split_view_with_collapsed_group() {
  info(
    "Opening target tab that will be moved to split view AFTER collapsed group"
  );
  let targetTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_URL
  );

  info("Create split view");
  let splitTab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:opentabs"
  );
  let splitTab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  let tabbrowserTabs = gBrowser.tabContainer;
  let splitViewCreated = BrowserTestUtils.waitForEvent(
    tabbrowserTabs,
    "SplitViewCreated"
  );
  let splitView = gBrowser.addTabSplitView([splitTab1, splitTab2], {
    id: 1,
  });
  await splitViewCreated;

  info("Create a tab group, add the split view to it, and collapse the group");
  let tabGroup = gBrowser.addTabGroup([splitView], {
    color: "blue",
    label: "Test Group",
  });
  tabGroup.collapsed = true;

  info("Wait for autocomplete");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "dummy_page",
  });

  info("Select autocomplete entry for target tab");
  EventUtils.synthesizeKey("KEY_ArrowDown");
  let result = await UrlbarTestUtils.getDetailsOfResultAt(
    window,
    UrlbarTestUtils.getSelectedRowIndex(window)
  );
  Assert.equal(result.type, UrlbarUtils.RESULT_TYPE.TAB_SWITCH);

  info("Verify result is for the correct tab");
  Assert.equal(
    result.url,
    TEST_URL,
    "Autocomplete result should be for the target tab"
  );

  info("Check that action shows 'Move tab to Split View'");
  let actionLabel = result.element.row.querySelector(".urlbarView-action");
  Assert.ok(BrowserTestUtils.isVisible(actionLabel));
  Assert.ok(actionLabel.textContent.includes("Move"));

  info("Verify initial split view state");
  Assert.equal(
    splitView.tabs.length,
    2,
    "Should have 2 tabs in split view initially"
  );

  info("Press Enter to move tab to split view");
  EventUtils.synthesizeKey("KEY_Enter");

  info("Wait for tab to be moved to split view");
  await BrowserTestUtils.waitForCondition(
    () =>
      splitView.tabs.some(
        tab => tab.linkedBrowser.currentURI.spec === TEST_URL
      ),
    "Wait for target tab to be moved and replaced in split view"
  );

  let tabWithTestUrl = splitView.tabs.find(
    tab => tab.linkedBrowser.currentURI.spec === TEST_URL
  );
  Assert.ok(
    tabWithTestUrl,
    "One of the split view tabs should have the target URL"
  );

  info("Cleanup");
  splitView.close();
  gBrowser.removeTab(targetTab);
});

add_task(async function test_move_tab_from_split_view_to_another_split_view() {
  info(
    "Test that moving a tab from one split view to another via the urlbar " +
      "correctly shows both panels in the destination split view"
  );

  info("Create source split view tabs (tab1 will be moved, tab2 will be left)");
  let tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);
  let tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  info("Create destination split view");
  let aboutOpenTabsTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:opentabs"
  );
  let destTab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  let tabbrowserTabs = gBrowser.tabContainer;

  let splitViewCreated1 = BrowserTestUtils.waitForEvent(
    tabbrowserTabs,
    "SplitViewCreated"
  );
  let sourceSplitView = gBrowser.addTabSplitView([tab1, tab2]);
  await splitViewCreated1;

  let splitViewCreated2 = BrowserTestUtils.waitForEvent(
    tabbrowserTabs,
    "SplitViewCreated"
  );
  let destSplitView = gBrowser.addTabSplitView([aboutOpenTabsTab, destTab]);
  await splitViewCreated2;

  info("Select destTab so destSplitView is active");
  gBrowser.selectedTab = destTab;

  info("Wait for autocomplete");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "dummy_page",
  });

  info("Select autocomplete entry for tab1 (in the source split view)");
  EventUtils.synthesizeKey("KEY_ArrowDown");
  let result = await UrlbarTestUtils.getDetailsOfResultAt(
    window,
    UrlbarTestUtils.getSelectedRowIndex(window)
  );
  Assert.equal(result.type, UrlbarUtils.RESULT_TYPE.TAB_SWITCH);

  info("Check that action shows 'Move tab to Split View'");
  let actionLabel = result.element.row.querySelector(".urlbarView-action");
  Assert.ok(BrowserTestUtils.isVisible(actionLabel));
  Assert.equal(
    document.l10n.getAttributes(actionLabel).id,
    "urlbar-result-action-move-tab-to-split-view"
  );

  info(
    "Press Enter to move tab1 from source split view to destination split view"
  );
  EventUtils.synthesizeKey("KEY_Enter");

  info("Wait for tab1 to be moved to destSplitView");
  await BrowserTestUtils.waitForCondition(
    () =>
      destSplitView.tabs.some(
        tab => tab.linkedBrowser.currentURI.spec === TEST_URL
      ),
    "Wait for tab1 to be in destSplitView"
  );

  info("Wait for source split view to be unsplit (had only tab2 remaining)");
  await BrowserTestUtils.waitForCondition(
    () => !sourceSplitView.isConnected,
    "Source split view should be removed after tab1 was moved out"
  );

  let movedTab = destSplitView.tabs.find(
    tab => tab.linkedBrowser.currentURI.spec === TEST_URL
  );
  Assert.ok(movedTab, "tab1 should be in the destination split view");

  info("Verify both panels in destSplitView have split-view-panel class");
  const [firstTab, secondTab] = destSplitView.tabs;
  const firstPanel = document.getElementById(firstTab.linkedPanel);
  const secondPanel = document.getElementById(secondTab.linkedPanel);

  Assert.ok(
    firstPanel.classList.contains("split-view-panel"),
    "First panel in destSplitView should have split-view-panel class"
  );
  Assert.ok(
    secondPanel.classList.contains("split-view-panel"),
    "Second panel in destSplitView should have split-view-panel class"
  );
  Assert.ok(
    firstPanel.classList.contains("split-view-panel-active") ||
      secondPanel.classList.contains("split-view-panel-active"),
    "At least one panel in destSplitView should have split-view-panel-active class"
  );

  info("Cleanup");
  await destSplitView.close();
  if (gBrowser.tabs.includes(tab2)) {
    gBrowser.removeTab(tab2);
  }
  await UrlbarTestUtils.promisePopupClose(window);
});

add_task(async function test_move_tab_to_split_view_same_window_selection() {
  info("Test that moving a tab from the same window properly selects it");

  info("Create split view with two tabs");
  let splitTab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:opentabs"
  );
  let splitTab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  let tabbrowserTabs = gBrowser.tabContainer;
  let splitViewCreated = BrowserTestUtils.waitForEvent(
    tabbrowserTabs,
    "SplitViewCreated"
  );
  let splitView = gBrowser.addTabSplitView([splitTab1, splitTab2], {
    id: 1,
  });
  await splitViewCreated;

  info("Create target tab that will be moved to split view");
  await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  info("Open another regular tab");
  let otherTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  info("Select one of the split view tabs to enable 'Move tab to Split View'");
  gBrowser.selectedTab = splitTab2;

  info("Verify a split view tab is selected");
  Assert.ok(
    gBrowser.selectedTab.splitview,
    "A split view tab should be selected"
  );

  info("Wait for autocomplete");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "dummy_page",
  });

  info("Select autocomplete entry for target tab");
  EventUtils.synthesizeKey("KEY_ArrowDown");
  let result = await UrlbarTestUtils.getDetailsOfResultAt(
    window,
    UrlbarTestUtils.getSelectedRowIndex(window)
  );
  Assert.equal(result.type, UrlbarUtils.RESULT_TYPE.TAB_SWITCH);

  info("Check that action shows 'Move tab to Split View'");
  let actionLabel = result.element.row.querySelector(".urlbarView-action");
  Assert.ok(BrowserTestUtils.isVisible(actionLabel));
  Assert.ok(actionLabel.textContent.includes("Move"));

  info("Press Enter to move tab to split view");
  EventUtils.synthesizeKey("KEY_Enter");

  info("Wait for tab to be moved to split view");
  await BrowserTestUtils.waitForCondition(
    () =>
      splitView.tabs.some(
        tab => tab.linkedBrowser.currentURI.spec === TEST_URL
      ),
    "Wait for target tab to be moved and replaced in split view"
  );

  let movedTab = splitView.tabs.find(
    tab => tab.linkedBrowser.currentURI.spec === TEST_URL
  );
  Assert.ok(movedTab, "Target tab should be in the split view");

  info("Verify the moved tab is selected, not the other tab");
  Assert.equal(
    gBrowser.selectedTab,
    movedTab,
    "The moved tab should be selected"
  );
  Assert.notEqual(
    gBrowser.selectedTab,
    otherTab,
    "The other tab should not be selected"
  );

  info("Verify split view is active");
  Assert.ok(
    gBrowser.selectedTab.splitview,
    "Selected tab should be in a split view"
  );

  info("Cleanup");
  await splitView.close();
  if (gBrowser.tabs.includes(otherTab)) {
    gBrowser.removeTab(otherTab);
  }
  await UrlbarTestUtils.promisePopupClose(window);
});
