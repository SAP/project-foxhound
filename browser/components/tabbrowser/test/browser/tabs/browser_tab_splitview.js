/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["sidebar.verticalTabs", true]],
  });
});

registerCleanupFunction(async function () {
  Services.prefs.clearUserPref("sidebar.revamp");
  Services.prefs.clearUserPref(
    "browser.toolbarbuttons.introduced.sidebar-button"
  );
  Services.prefs.clearUserPref("browser.tabs.splitview.hasUsed");
});

const urlbarButton = document.getElementById("split-view-button");

async function addTabAndLoadBrowser() {
  const tab = BrowserTestUtils.addTab(gBrowser, "https://example.com");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  return tab;
}

async function checkSplitViewPanelVisible(tab, isVisible) {
  const panel = document.getElementById(tab.linkedPanel);
  await BrowserTestUtils.waitForMutationCondition(
    panel,
    { attributes: true },
    () => panel.classList.contains("split-view-panel-active") == isVisible
  );
}

function dragSplitter(deltaX, splitter) {
  AccessibilityUtils.setEnv({ mustHaveAccessibleRule: false });
  EventUtils.synthesizeMouseAtCenter(splitter, { type: "mousedown" });
  EventUtils.synthesizeMouse(splitter, deltaX, 0, { type: "mousemove" });
  EventUtils.synthesizeMouse(splitter, 0, 0, { type: "mouseup" });
  AccessibilityUtils.resetEnv();
}

add_task(async function test_splitViewCreateAndAddTabs() {
  let tab1 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  let tab2 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  let tab3 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  let tab4 = BrowserTestUtils.addTab(gBrowser, "about:blank");

  // Add tabs to split view
  let splitview = gBrowser.addTabSplitView([tab1, tab2]);
  let splitview2 = gBrowser.addTabSplitView([tab3, tab4]);
  let tabbrowserTabs = document.getElementById("tabbrowser-tabs");
  await BrowserTestUtils.waitForMutationCondition(
    tabbrowserTabs,
    { childList: true },
    () => tabbrowserTabs.querySelectorAll("tab-split-view-wrapper").length === 2
  );

  Assert.ok(splitview.splitViewId, "Split view has id");
  Assert.equal(splitview.tabs.length, 2, "Split view has 2 tabs");
  Assert.ok(splitview.tabs.includes(tab1), "tab1 is in split view wrapper");
  Assert.ok(splitview.tabs.includes(tab2), "tab2 is in split view wrapper");

  await BrowserTestUtils.waitForMutationCondition(
    splitview2,
    { attributeFilter: ["splitViewId"] },
    () => splitview2.hasAttribute("splitViewId")
  );
  Assert.notEqual(
    splitview.splitViewId,
    splitview2.splitViewId,
    "Split view has different id than split view 2"
  );
  Assert.equal(splitview2.tabs.length, 2, "Split view 2 has 2 tabs");
  Assert.ok(splitview2.tabs.includes(tab3), "tab3 is in split view wrapper");
  Assert.ok(splitview2.tabs.includes(tab4), "tab4 is in split view wrapper");

  Assert.ok(
    !splitview.hasAttribute("hasactivetab"),
    "The split view wrapper has the expected attribute when it does not contain the selected tab"
  );

  // Verify ARIA labels for split view tabs
  const splitViewLeft = gBrowser.tabLocalization.formatValueSync(
    "tabbrowser-tab-label-tab-split-view-left",
    { label: "" }
  );
  const splitViewRight = gBrowser.tabLocalization.formatValueSync(
    "tabbrowser-tab-label-tab-split-view-right",
    { label: "" }
  );
  Assert.ok(
    tab1.getAttribute("aria-label").includes(splitViewLeft),
    "Left tab has the correct ARIA label."
  );
  Assert.ok(
    tab2.getAttribute("aria-label").includes(splitViewRight),
    "Right tab has the correct ARIA label."
  );

  gBrowser.selectTabAtIndex(tab1._tPos);
  await BrowserTestUtils.waitForMutationCondition(
    splitview,
    { attributes: true, attributeFilter: ["hasactivetab"] },
    () => splitview.hasAttribute("hasactivetab")
  );
  Assert.ok(
    splitview.hasAttribute("hasactivetab"),
    "The split view wrapper has the expected attribute when it contains the selected tab"
  );

  // Unsplit tabs
  splitview.unsplitTabs();
  await BrowserTestUtils.waitForMutationCondition(
    tabbrowserTabs,
    { childList: true },
    () => tabbrowserTabs.querySelectorAll("tab-split-view-wrapper").length === 1
  );
  Assert.strictEqual(
    document.querySelectorAll("tab-split-view-wrapper").length,
    1,
    "Tabs have been unsplit from split view"
  );
  Assert.ok(
    !tab1.hasAttribute("aria-label"),
    "ARIA label was removed from the left tab."
  );
  Assert.ok(
    !tab2.hasAttribute("aria-label"),
    "ARIA label was removed from the right tab."
  );

  let tab3Panel = tab3.linkedBrowser.closest(".browserSidebarContainer");
  let tab4Panel = tab4.linkedBrowser.closest(".browserSidebarContainer");

  Assert.ok(
    !tab3Panel.classList.contains("split-view-panel-active") &&
      !tab4Panel.classList.contains("split-view-panel-active"),
    "Split view active classes have been removed from the tab panels"
  );

  // Add tabs back to split view
  splitview = gBrowser.addTabSplitView([tab1, tab2]);

  // Remove split view and close tabs
  splitview.close();
  splitview2.close();
});

add_task(async function test_split_view_panels() {
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  const originalTab = gBrowser.selectedTab;
  await BrowserTestUtils.switchTab(gBrowser, tab1);

  info("Activate split view.");
  const splitView = gBrowser.addTabSplitView([tab1, tab2]);
  for (const tab of splitView.tabs) {
    await checkSplitViewPanelVisible(tab, true);
  }
  await BrowserTestUtils.waitForMutationCondition(
    urlbarButton,
    { attributes: true, attributeFilter: ["hidden"] },
    () => BrowserTestUtils.isVisible(urlbarButton)
  );

  info("Open split view menu.");
  const menu = document.getElementById("split-view-menu");
  const promiseMenuShown = BrowserTestUtils.waitForPopupEvent(menu, "shown");
  EventUtils.synthesizeMouseAtCenter(urlbarButton, {});
  await promiseMenuShown;
  menu.hidePopup();

  info("Select tabs using tab panels.");
  await SimpleTest.promiseFocus(tab1.linkedBrowser);
  let panel = document.getElementById(tab1.linkedPanel);
  Assert.ok(
    panel.classList.contains("deck-selected"),
    "First panel is selected."
  );
  await BrowserTestUtils.waitForMutationCondition(
    urlbarButton,
    { attributes: true, attributeFilter: ["data-active-index"] },
    () => urlbarButton.dataset.activeIndex == "0"
  );

  await SimpleTest.promiseFocus(tab2.linkedBrowser);
  panel = document.getElementById(tab2.linkedPanel);
  Assert.ok(
    panel.classList.contains("deck-selected"),
    "Second panel is selected."
  );
  await BrowserTestUtils.waitForMutationCondition(
    urlbarButton,
    { attributes: true },
    () => urlbarButton.dataset.activeIndex == "1"
  );

  info("Switch to a non-split view tab.");
  await BrowserTestUtils.switchTab(gBrowser, originalTab);
  for (const tab of splitView.tabs) {
    await checkSplitViewPanelVisible(tab, false);
  }

  info("Switch back to a split view tab.");
  await BrowserTestUtils.switchTab(gBrowser, tab1);
  for (const tab of splitView.tabs) {
    await checkSplitViewPanelVisible(tab, true);
  }

  info("Remove the split view, keeping tabs intact.");
  splitView.unsplitTabs();
  await checkSplitViewPanelVisible(tab1, false);
  await checkSplitViewPanelVisible(tab2, false);
  await BrowserTestUtils.waitForMutationCondition(
    urlbarButton,
    { attributes: true },
    () => BrowserTestUtils.isHidden(urlbarButton)
  );

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});

add_task(async function test_split_view_preserves_multiple_pairings() {
  info("Create four tabs for two split view pairings.");
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  const tab3 = await addTabAndLoadBrowser();
  const tab4 = await addTabAndLoadBrowser();

  info("Create two split views (Tab 1 + Tab 2) & (Tab 3 + Tab 4).");
  const splitView1 = gBrowser.addTabSplitView([tab1, tab2]);
  const splitView2 = gBrowser.addTabSplitView([tab3, tab4]);

  info("Switch to Tab 1 to activate the first split view.");
  await BrowserTestUtils.switchTab(gBrowser, tab1);
  await checkSplitViewPanelVisible(tab1, true);
  await checkSplitViewPanelVisible(tab2, true);
  await checkSplitViewPanelVisible(tab3, false);
  await checkSplitViewPanelVisible(tab4, false);

  info("Switch to Tab 3 to activate the second split view.");
  await BrowserTestUtils.switchTab(gBrowser, tab3);
  await checkSplitViewPanelVisible(tab1, false);
  await checkSplitViewPanelVisible(tab2, false);
  await checkSplitViewPanelVisible(tab3, true);
  await checkSplitViewPanelVisible(tab4, true);

  info("Switch back to the first split view.");
  await BrowserTestUtils.switchTab(gBrowser, tab1);
  await checkSplitViewPanelVisible(tab1, true);
  await checkSplitViewPanelVisible(tab2, true);
  await checkSplitViewPanelVisible(tab3, false);
  await checkSplitViewPanelVisible(tab4, false);

  splitView1.close();
  splitView2.close();
});

add_task(async function test_resize_split_view_panels() {
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  const originalTab = gBrowser.selectedTab;
  await BrowserTestUtils.switchTab(gBrowser, tab1);

  info("Activate split view.");
  const splitView = gBrowser.addTabSplitView([tab1, tab2]);
  const { tabpanels } = gBrowser;
  await BrowserTestUtils.waitForMutationCondition(
    tabpanels,
    { childList: true },
    () => tabpanels.querySelector(".split-view-splitter")
  );
  await BrowserTestUtils.waitForMutationCondition(
    tabpanels.splitViewSplitter,
    { attributes: true },
    () => BrowserTestUtils.isVisible(tabpanels.splitViewSplitter)
  );

  info("Resize split view panels.");
  const leftPanel = document.getElementById(tab1.linkedPanel);
  const rightPanel = document.getElementById(tab2.linkedPanel);
  const originalLeftWidth = leftPanel.getBoundingClientRect().width;
  const originalRightWidth = rightPanel.getBoundingClientRect().width;
  dragSplitter(-100, tabpanels.splitViewSplitter);
  Assert.less(
    leftPanel.getBoundingClientRect().width,
    originalLeftWidth,
    "Left panel is smaller."
  );
  Assert.greater(
    rightPanel.getBoundingClientRect().width,
    originalRightWidth,
    "Right panel is larger."
  );

  info("Ensure that custom width persists after switching tabs.");
  await BrowserTestUtils.switchTab(gBrowser, originalTab);
  await BrowserTestUtils.switchTab(gBrowser, tab1);
  Assert.less(
    leftPanel.getBoundingClientRect().width,
    originalLeftWidth,
    "Left panel is smaller."
  );
  Assert.greater(
    rightPanel.getBoundingClientRect().width,
    originalRightWidth,
    "Right panel is larger."
  );

  info("Reverse split view panels and resize.");
  splitView.reverseTabs();
  dragSplitter(-100, tabpanels.splitViewSplitter);
  await BrowserTestUtils.waitForMutationCondition(
    leftPanel,
    { attributeFilter: ["width"] },
    () => !leftPanel.hasAttribute("width")
  );

  info("Separate split view panels to remove the custom width.");
  splitView.unsplitTabs();
  for (const panel of [leftPanel, rightPanel]) {
    await BrowserTestUtils.waitForMutationCondition(
      panel,
      { attributeFilter: ["width"] },
      () => !panel.hasAttribute("width")
    );
  }

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});

add_task(async function test_click_findbar_to_select_panel() {
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  const panel1 = document.getElementById(tab1.linkedPanel);
  const panel2 = document.getElementById(tab2.linkedPanel);
  await BrowserTestUtils.switchTab(gBrowser, tab1);

  info("Activate split view with the first panel selected.");
  const splitView = gBrowser.addTabSplitView([tab1, tab2]);
  await SimpleTest.promiseFocus(tab1.linkedBrowser);
  Assert.ok(
    panel1.classList.contains("deck-selected"),
    "First panel is selected."
  );

  info("Activate Find in Page within the second panel.");
  const findbar = await gBrowser.getFindBar(tab2);
  const promiseFindbarOpen = BrowserTestUtils.waitForEvent(
    findbar,
    "findbaropen"
  );
  findbar.open();
  await promiseFindbarOpen;

  info("Select the second panel by clicking the find bar.");
  findbar.getElement("findbar-textbox").click();
  await BrowserTestUtils.waitForMutationCondition(
    panel2,
    { attributeFilter: ["class"] },
    () => panel2.classList.contains("deck-selected")
  );

  splitView.close();
});

add_task(async function test_moving_tabs() {
  let [tab1, tab2, tab3, tab4] = await Promise.all(
    Array.from({ length: 4 }).map((_, index) =>
      addTab(`data:text/plain,tab${index + 1}`)
    )
  );
  let startingTab = gBrowser.tabs[0];

  let splitview = gBrowser.addTabSplitView([tab1, tab2], {
    insertBefore: tab1,
  });
  Assert.equal(splitview.tabs.length, 2, "Split view has 2 tabs");

  Assert.deepEqual(
    gBrowser.tabs,
    [startingTab, tab1, tab2, tab3, tab4],
    "Confirm starting order of tabs"
  );

  gBrowser.moveTabTo(startingTab, { tabIndex: 2 });

  Assert.deepEqual(
    gBrowser.tabs,
    [tab1, tab2, startingTab, tab3, tab4],
    "Starting tab is moved after splitview tabs"
  );
  ok(
    tab1.splitview && tab2.splitview && !startingTab.splitview,
    "Tab 1 and tab 2 are still in a splitview and starting tab isn't"
  );

  gBrowser.moveTabTo(tab1, { tabIndex: 3 });
  Assert.deepEqual(
    gBrowser.tabs,
    [startingTab, tab1, tab2, tab3, tab4],
    "Moving a splitview tab moves both tabs in the splitview"
  );
  ok(
    tab1.splitview && tab2.splitview,
    "Tab 1 and tab 2 are still in a splitview"
  );

  gBrowser.selectedTab = startingTab;
  gBrowser.moveTabForward();
  Assert.deepEqual(
    gBrowser.tabs,
    [tab1, tab2, startingTab, tab3, tab4],
    "Selected tab moves forward but after splitview tabs"
  );
  ok(
    tab1.splitview && tab2.splitview && !startingTab.splitview,
    "Tab 1 and tab 2 are still in a splitview and starting tab isn't"
  );

  gBrowser.moveTabBackward();
  Assert.deepEqual(
    gBrowser.tabs,
    [startingTab, tab1, tab2, tab3, tab4],
    "Selected tab moves backward but before splitview tabs"
  );
  ok(
    tab1.splitview && tab2.splitview && !startingTab.splitview,
    "Tab 1 and tab 2 are still in a splitview and starting tab isn't"
  );

  gBrowser.selectedTab = tab1;
  gBrowser.moveTabForward();

  Assert.deepEqual(
    gBrowser.tabs,
    [startingTab, tab3, tab1, tab2, tab4],
    "Selected tab in a splitview moves both splitview tabs forward"
  );
  ok(
    tab1.splitview && tab2.splitview,
    "Tab 1 and tab 2 are still in a splitview"
  );

  gBrowser.selectedTab = tab2;
  gBrowser.moveTabBackward();
  Assert.deepEqual(
    gBrowser.tabs,
    [startingTab, tab1, tab2, tab3, tab4],
    "Selected tab in a splitview moves both splitview tabs backward"
  );
  ok(
    tab1.splitview && tab2.splitview,
    "Tab 1 and tab 2 are still in a splitview"
  );

  // Create a tabgroup with tabs and a splitview
  let group = gBrowser.addTabGroup([tab1, tab2, tab3], { insertBefore: tab3 });
  Assert.deepEqual(
    gBrowser.tabs,
    [startingTab, tab1, tab2, tab3, tab4],
    "Selected tab in a splitview moves both splitview tabs backward"
  );

  // Add another splitview to the existing group, so two splitviews are in the group
  let splitview2 = gBrowser.addTabSplitView([tab3, tab4], {
    insertBefore: tab3,
  });
  ok(
    tab3.splitview && tab4.splitview && splitview2.group,
    "Tab 3 and tab 4 are in a splitview and in a tab group"
  );

  gBrowser.selectedTab = tab2;
  gBrowser.moveTabForward();

  Assert.deepEqual(
    gBrowser.tabs,
    [startingTab, tab3, tab4, tab1, tab2],
    "First splitview tabs are moved after the second splitview but within the group"
  );

  Assert.equal(
    splitview.group,
    splitview2.group,
    "Both splitviews are still in the same tab group"
  );

  gBrowser.selectedTab = tab4;
  gBrowser.moveTabBackward();

  // The order doesn't change, the splitview tabs just moved outside of the group.
  Assert.deepEqual(
    gBrowser.tabs,
    [startingTab, tab3, tab4, tab1, tab2],
    "Splitview tabs are moved together and in the correct order"
  );
  ok(
    tab3.splitview && tab4.splitview && !splitview2.group,
    "Tab 3 and tab 4 are still in a splitview but no longer in a tab group"
  );

  group.addTabs([startingTab]);
  Assert.deepEqual(
    gBrowser.tabs,
    [tab3, tab4, tab1, tab2, startingTab],
    "StartingTab is moved to the end of the tabstrip"
  );
  ok(
    !startingTab.splitview && startingTab.group,
    "Starting tab was added to the group but not the splitview"
  );
  gBrowser.moveTabsBefore([startingTab], tab1);
  Assert.deepEqual(
    gBrowser.tabs,
    [tab3, tab4, startingTab, tab1, tab2],
    "StartingTab is moved in front of tab1"
  );
  ok(
    !startingTab.splitview && startingTab.group,
    "Starting tab is still in the group but not added to the splitview"
  );

  for (let tab of [tab1, tab2, tab3, tab4]) {
    BrowserTestUtils.removeTab(tab);
  }
});

add_task(async function test_move_group_with_splitview_to_new_window() {
  info("Create tabs for split view");
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  const tab3 = await addTabAndLoadBrowser();

  info("Create a split view with tab1 and tab2");
  const splitView = gBrowser.addTabSplitView([tab1, tab2]);
  Assert.ok(splitView, "Split view was created");

  info("Create a tab group containing the split view and tab3");
  const group = gBrowser.addTabGroup([splitView, tab3]);
  Assert.ok(group, "Tab group was created");
  Assert.equal(group.tabs.length, 3, "Group has 3 tabs");

  info("Move the group to a new window");
  const promiseNewWindow = BrowserTestUtils.waitForNewWindow();
  gBrowser.replaceGroupWithWindow(group);
  const newWindow = await promiseNewWindow;

  info("Verify the new window contains the expected tabs");
  Assert.ok(newWindow, "New window was created");
  Assert.equal(
    newWindow.gBrowser.tabs.length,
    3,
    "New window has 3 tabs from the group"
  );

  info("Verify the split view was preserved in the new window");
  const movedTabs = newWindow.gBrowser.tabs;
  Assert.equal(movedTabs.length, 3, "Three tabs were moved");
  Assert.ok(
    movedTabs[0].splitview && movedTabs[1].splitview,
    "First two tabs are still in a split view"
  );
  Assert.equal(
    movedTabs[0].splitview,
    movedTabs[1].splitview,
    "Tabs are in the same split view"
  );

  await BrowserTestUtils.closeWindow(newWindow);
});

add_task(async function test_createGroupFromPinnedTabWithSplitView() {
  info(
    "Test creating a tab group from a pinned tab when a split view follows it"
  );

  let pinnedTab = BrowserTestUtils.addTab(gBrowser, "about:blank");
  gBrowser.pinTab(pinnedTab);

  let tab1 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  let tab2 = BrowserTestUtils.addTab(gBrowser, "about:blank");

  let splitview = gBrowser.addTabSplitView([tab1, tab2], {
    insertBefore: tab1,
  });

  let tabScrollBoxChildren = Array.from(
    document.getElementById("tabbrowser-arrowscrollbox").children
  );
  let splitViewPosition = tabScrollBoxChildren.indexOf(splitview);

  Assert.ok(
    tab1.splitview && tab2.splitview,
    "Tab 1 and tab 2 are in a split view"
  );
  Assert.equal(pinnedTab._tPos, 0, "Pinned tab is at position 0");
  Assert.less(
    pinnedTab._tPos,
    splitViewPosition,
    "Pinned tab is before split view"
  );

  info("Create a tab group from the pinned tab using TabContextMenu");
  TabContextMenu.contextTab = pinnedTab;
  TabContextMenu.contextTabs = [pinnedTab];
  TabContextMenu.moveTabsToNewGroup();

  let group = pinnedTab.group;
  Assert.ok(group, "Pinned tab is now in a group");

  let groupPosition = tabScrollBoxChildren.indexOf(group);

  Assert.less(
    groupPosition,
    splitViewPosition,
    "Tab group is before split view"
  );

  Assert.equal(splitview.tabs.length, 2, "Split view still only has 2 tabs");

  await removeTabGroup(group);
  splitview.close();
  BrowserTestUtils.removeTab(pinnedTab);
});

add_task(async function test_move_splitview_to_end_and_start() {
  info("Create tabs");
  const startingTab = gBrowser.tabs[0];
  const tab1 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  const tab2 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  const tab3 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  const tab4 = BrowserTestUtils.addTab(gBrowser, "about:blank");

  let tabContainer = document.getElementById("tabbrowser-tabs");
  let splitViewCreated = BrowserTestUtils.waitForEvent(
    tabContainer,
    "SplitViewCreated"
  );
  const splitView = gBrowser.addTabSplitView([tab2, tab3], {
    insertBefore: tab2,
  });
  await splitViewCreated;

  Assert.deepEqual(
    gBrowser.tabs,
    [startingTab, tab1, tab2, tab3, tab4],
    "Confirm starting order of tabs"
  );

  info("Test moving splitview to end");
  gBrowser.moveTabToEnd(tab2);

  Assert.deepEqual(
    gBrowser.tabs,
    [startingTab, tab1, tab4, tab2, tab3],
    "Tabs are in expected order after moving splitview to end"
  );
  Assert.ok(
    tab2.splitview === splitView && tab3.splitview === splitView,
    "Tabs are still in the same splitview"
  );

  gBrowser.moveTabToStart(tab3);

  Assert.deepEqual(
    gBrowser.tabs,
    [tab2, tab3, startingTab, tab1, tab4],
    "Tabs are in expected order after moving splitview to start"
  );
  Assert.ok(
    tab2.splitview === splitView && tab3.splitview === splitView,
    "Tabs are still in the same splitview"
  );

  info("Add splitview to a tab group");
  let groupCreated = BrowserTestUtils.waitForEvent(window, "TabGroupCreate");
  const group = gBrowser.addTabGroup([splitView]);
  await groupCreated;
  Assert.strictEqual(tab2.group, group, "tab2 is in group");
  Assert.strictEqual(tab3.group, group, "tab3 is in group");

  info("Test moving splitview in group to end");
  gBrowser.moveTabToEnd(tab2);

  Assert.ok(!tab2.group, "tab2 is no longer in a group after moveTabToEnd");
  Assert.ok(!tab3.group, "tab3 is no longer in a group after moveTabToEnd");
  Assert.ok(
    tab2._tPos > startingTab._tPos && tab3._tPos > startingTab._tPos,
    "Splitview tabs are after startingTab"
  );
  Assert.ok(
    tab2._tPos > tab1._tPos && tab3._tPos > tab1._tPos,
    "Splitview tabs are after tab1"
  );
  Assert.ok(
    tab2._tPos > tab4._tPos && tab3._tPos > tab4._tPos,
    "Splitview tabs are after tab4"
  );
  Assert.ok(
    tab2.splitview === splitView && tab3.splitview === splitView,
    "Tabs are still in the same splitview after being ungrouped"
  );

  info("Clean up tabs");
  for (let tab of [tab1, tab2, tab3, tab4]) {
    BrowserTestUtils.removeTab(tab);
  }
});
