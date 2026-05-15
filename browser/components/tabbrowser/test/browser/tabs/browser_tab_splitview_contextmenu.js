/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["sidebar.verticalTabs", true]],
  });
});

registerCleanupFunction(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["sidebar.verticalTabs", false],
      ["sidebar.revamp", false],
      ["browser.tabs.splitView.enabled", false],
    ],
  });
});

async function addTabAndLoadBrowser() {
  const tab = BrowserTestUtils.addTab(gBrowser, "https://example.com");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  return tab;
}

/**
 * @param {MozTabbrowserTab} tab
 * @param {function(splitViewMenuItem: Element, unsplitMenuItem: Element) => Promise<void>} callback
 */
const withTabMenu = async function (tab, callback) {
  const tabContextMenu = document.getElementById("tabContextMenu");
  Assert.equal(
    tabContextMenu.state,
    "closed",
    "context menu is initially closed"
  );
  const contextMenuShown = BrowserTestUtils.waitForPopupEvent(
    tabContextMenu,
    "shown"
  );

  EventUtils.synthesizeMouseAtCenter(
    tab,
    { type: "contextmenu", button: 2 },
    window
  );
  await contextMenuShown;

  const moveTabToNewSplitViewItem = document.getElementById(
    "context_moveTabToSplitView"
  );
  const unsplitTabItem = document.getElementById("context_separateSplitView");
  const addSplitViewToNewGroup = document.getElementById(
    "context_moveSplitViewToNewGroup"
  );
  const removeSplitViewFromGroup = document.getElementById(
    "context_ungroupSplitView"
  );

  let contextMenuHidden = BrowserTestUtils.waitForPopupEvent(
    tabContextMenu,
    "hidden"
  );
  await callback(
    moveTabToNewSplitViewItem,
    unsplitTabItem,
    addSplitViewToNewGroup,
    removeSplitViewFromGroup
  );
  tabContextMenu.hidePopup();
  info("Hide popup");
  return await contextMenuHidden;
};

add_task(async function test_contextMenuMoveTabsToNewSplitView() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.splitView.enabled", true]],
  });
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  const tab3 = await addTabAndLoadBrowser();
  let tabs = [tab1, tab2, tab3];

  // Click the first tab in our test split view to make sure the default tab at the
  // start of the tab strip is deselected
  EventUtils.synthesizeMouseAtCenter(tab1, {});

  tabs.forEach(t => {
    EventUtils.synthesizeMouseAtCenter(
      t,
      { ctrlKey: true, metaKey: true },
      window
    );
  });

  let tabToClick = tab3;
  await withTabMenu(
    tabToClick,
    async (moveTabToNewSplitViewItem, unsplitTabItem) => {
      await BrowserTestUtils.waitForMutationCondition(
        moveTabToNewSplitViewItem,
        { attributes: true },
        () =>
          !moveTabToNewSplitViewItem.hidden &&
          moveTabToNewSplitViewItem.disabled,
        "moveTabToNewSplitViewItem is visible and disabled"
      );
      Assert.ok(
        !moveTabToNewSplitViewItem.hidden && moveTabToNewSplitViewItem.disabled,
        "moveTabToNewSplitViewItem is visible and disabled"
      );
      await BrowserTestUtils.waitForMutationCondition(
        unsplitTabItem,
        { attributes: true },
        () => unsplitTabItem.hidden,
        "unsplitTabItem is hidden"
      );
      Assert.ok(unsplitTabItem.hidden, "unsplitTabItem is hidden");
    }
  );

  // Test opening split view from 2 non-consecutive tabs
  let tabContainer = document.getElementById("tabbrowser-arrowscrollbox");
  let tab3Index = Array.from(tabContainer.children).indexOf(tab3);
  EventUtils.synthesizeMouseAtCenter(tab3, {});
  tabToClick = tab3;

  [tabs[0], tabs[2]].forEach(t => {
    gBrowser.addToMultiSelectedTabs(t);
    ok(t.multiselected, "added tab to multiselection");
  });

  await withTabMenu(
    tabToClick,
    async (moveTabToNewSplitViewItem, unsplitTabItem) => {
      await BrowserTestUtils.waitForMutationCondition(
        moveTabToNewSplitViewItem,
        { attributes: true },
        () =>
          !moveTabToNewSplitViewItem.hidden &&
          !moveTabToNewSplitViewItem.disabled,
        "moveTabToNewSplitViewItem is visible and not disabled"
      );
      Assert.ok(
        !moveTabToNewSplitViewItem.hidden &&
          !moveTabToNewSplitViewItem.disabled,
        "moveTabToNewSplitViewItem is visible and not disabled"
      );
      await BrowserTestUtils.waitForMutationCondition(
        unsplitTabItem,
        { attributes: true },
        () => unsplitTabItem.hidden,
        "unsplitTabItem is hidden"
      );
      Assert.ok(unsplitTabItem.hidden, "unsplitTabItem is hidden");

      info("Click menu option to add new split view");
      moveTabToNewSplitViewItem.click();
    }
  );

  await BrowserTestUtils.waitForMutationCondition(
    tabContainer,
    { childList: true },
    () => {
      return (
        Array.from(tabContainer.children).some(
          tabChild => tabChild.tagName === "tab-split-view-wrapper"
        ) &&
        tab1.splitview &&
        tab3.splitview
      );
    },
    "Split view has been added"
  );
  info("Split view has been added");

  let splitview = tab1.splitview;
  [tab1, tab3].forEach((t, idx) => {
    Assert.equal(t.splitview, splitview, `tabs[${idx}] is in split view`);
  });
  Assert.equal(
    Array.from(tabContainer.children).indexOf(splitview),
    tab3Index - 1,
    "Non-consecutive tabs have been added to split view and moved to active tab location"
  );

  info("Unsplit split view");
  splitview.unsplitTabs();

  await BrowserTestUtils.waitForMutationCondition(
    tabContainer,
    { childList: true },
    () => {
      return (
        !Array.from(tabContainer.children).some(
          tabChild => tabChild.tagName === "tab-split-view-wrapper"
        ) &&
        !tab1.splitview &&
        !tab3.splitview
      );
    },
    "Split view has been removed"
  );
  info("Split view has been removed");

  // Test adding consecutive tabs to a new split view

  EventUtils.synthesizeMouseAtCenter(tab1, {});

  [tab1, tab2].forEach(t => {
    EventUtils.synthesizeMouseAtCenter(
      t,
      { ctrlKey: true, metaKey: true },
      window
    );
  });

  tabToClick = tab2;
  await withTabMenu(
    tabToClick,
    async (moveTabToNewSplitViewItem, unsplitTabItem) => {
      await BrowserTestUtils.waitForMutationCondition(
        moveTabToNewSplitViewItem,
        { attributes: true },
        () =>
          !moveTabToNewSplitViewItem.hidden &&
          !moveTabToNewSplitViewItem.disabled,
        "moveTabToNewSplitViewItem is visible and not disabled"
      );
      Assert.ok(
        !moveTabToNewSplitViewItem.hidden &&
          !moveTabToNewSplitViewItem.disabled,
        "moveTabToNewSplitViewItem is visible and not disabled"
      );
      await BrowserTestUtils.waitForMutationCondition(
        unsplitTabItem,
        { attributes: true },
        () => unsplitTabItem.hidden,
        "unsplitTabItem is hidden"
      );
      Assert.ok(unsplitTabItem.hidden, "unsplitTabItem is hidden");

      info("Click menu option to add new split view");
      moveTabToNewSplitViewItem.click();
    }
  );

  await BrowserTestUtils.waitForMutationCondition(
    tabContainer,
    { childList: true },
    () => {
      return (
        Array.from(tabContainer.children).some(
          tabChild => tabChild.tagName === "tab-split-view-wrapper"
        ) &&
        tab1.splitview &&
        tab2.splitview
      );
    },
    "Split view has been added"
  );
  info("Split view has been added");

  splitview = tab1.splitview;

  Assert.ok(tab1.splitview, "tab is in split view");
  [tab1, tab2].forEach((t, idx) => {
    Assert.equal(t.splitview, splitview, `tabs[${idx}] is in split view`);
  });

  // Test unsplitting tabs using context menu

  await withTabMenu(
    tabToClick,
    async (moveTabToNewSplitViewItem, unsplitTabItem) => {
      await BrowserTestUtils.waitForMutationCondition(
        moveTabToNewSplitViewItem,
        { attributes: true },
        () => moveTabToNewSplitViewItem.hidden,
        "moveTabToNewSplitViewItem is hidden"
      );
      Assert.ok(
        moveTabToNewSplitViewItem.hidden,
        "moveTabToNewSplitViewItem is hidden"
      );
      await BrowserTestUtils.waitForMutationCondition(
        unsplitTabItem,
        { attributes: true },
        () => !unsplitTabItem.hidden,
        "unsplitTabItem is visible"
      );
      Assert.ok(!unsplitTabItem.hidden, "unsplitTabItem is visible");

      info("Unsplit split view using menu option");
      unsplitTabItem.click();
    }
  );

  await BrowserTestUtils.waitForMutationCondition(
    tabContainer,
    { childList: true },
    () => {
      return (
        !Array.from(tabContainer.children).some(
          tabChild => tabChild.tagName === "tab-split-view-wrapper"
        ) &&
        !tab1.splitview &&
        !tab2.splitview
      );
    },
    "Split view has been removed"
  );
  info("Split view has been removed");

  // Test adding split view with one tab and new tab

  tabToClick = tab1;
  EventUtils.synthesizeMouseAtCenter(tab1, {});

  await withTabMenu(
    tabToClick,
    async (moveTabToNewSplitViewItem, unsplitTabItem) => {
      await BrowserTestUtils.waitForMutationCondition(
        moveTabToNewSplitViewItem,
        { attributes: true },
        () =>
          !moveTabToNewSplitViewItem.hidden &&
          !moveTabToNewSplitViewItem.disabled,
        "moveTabToNewSplitViewItem is visible and not disabled"
      );
      Assert.ok(
        !moveTabToNewSplitViewItem.hidden &&
          !moveTabToNewSplitViewItem.disabled,
        "moveTabToNewSplitViewItem is visible and not disabled"
      );
      await BrowserTestUtils.waitForMutationCondition(
        unsplitTabItem,
        { attributes: true },
        () => unsplitTabItem.hidden,
        "unsplitTabItem is hidden"
      );
      Assert.ok(unsplitTabItem.hidden, "unsplitTabItem is hidden");

      info("Click menu option to add new split view");
      moveTabToNewSplitViewItem.click();
    }
  );

  await BrowserTestUtils.waitForMutationCondition(
    tabContainer,
    { childList: true },
    () => {
      return (
        Array.from(tabContainer.children).some(
          tabChild => tabChild.tagName === "tab-split-view-wrapper"
        ) && tab1.splitview
      );
    },
    "Split view has been added"
  );
  info("Split view has been added");

  splitview = tab1.splitview;

  Assert.equal(tab1.splitview, splitview, `tab1 is in split view`);
  Assert.equal(
    splitview.tabs[1],
    gBrowser.selectedTab,
    "New tab is active in split view"
  );
  Assert.ok(!tab2.splitview, "tab2 is not in split view");
  Assert.ok(!tab3.splitview, "tab3 is not in split view");

  splitview.close();
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }
});

add_task(async function test_contextMenuAddSplitViewToNewTabGroup() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.splitView.enabled", true]],
  });
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  let tabContainer = document.getElementById("tabbrowser-arrowscrollbox");

  gBrowser.addTabSplitView([tab1, tab2]);

  await BrowserTestUtils.waitForMutationCondition(
    tabContainer,
    { childList: true },
    () => {
      return (
        Array.from(tabContainer.children).some(
          tabChild => tabChild.tagName === "tab-split-view-wrapper"
        ) &&
        tab1.splitview &&
        tab2.splitview
      );
    },
    "Split view has been added"
  );
  info("Split view has been added");

  let splitview = tab1.splitview;

  Assert.ok(tab1.splitview, "tab is in split view");
  [tab1, tab2].forEach((t, idx) => {
    Assert.equal(t.splitview, splitview, `tabs[${idx}] is in split view`);
  });

  EventUtils.synthesizeMouseAtCenter(tab1, {});

  let tabToClick = tab2;
  await withTabMenu(
    tabToClick,
    async (
      moveTabToNewSplitViewItem,
      unsplitTabItem,
      addSplitViewToNewGroupItem
    ) => {
      await BrowserTestUtils.waitForMutationCondition(
        addSplitViewToNewGroupItem,
        { attributes: true },
        () =>
          !addSplitViewToNewGroupItem.hidden &&
          addSplitViewToNewGroupItem.textContent ===
            "Add Split View to New Group",
        "addSplitViewToNewGroupItem is visible and has the expected label"
      );

      info("Click menu option to add split view to new group");
      addSplitViewToNewGroupItem.click();
    }
  );

  await BrowserTestUtils.waitForMutationCondition(
    tabContainer,
    { childList: true },
    () => {
      return Array.from(tabContainer.children).some(
        tabChild => tabChild.tagName === "tab-group"
      );
    },
    "Split view has been added to a new tab group"
  );
  Assert.ok(
    tab1.splitview.group && tab2.splitview.group,
    "Split view is within a tab group"
  );
  info("Split view has been added to new group");

  await withTabMenu(
    tabToClick,
    async (
      moveTabToNewSplitViewItem,
      unsplitTabItem,
      addSplitViewToNewGroupItem,
      removeSplitViewFromGroupItem
    ) => {
      await BrowserTestUtils.waitForMutationCondition(
        removeSplitViewFromGroupItem,
        // `attributes` catches `.hidden`
        // `characterData` and `subtree` catches when the l10n engine modifies
        // the text content in menuitem > label::before
        { subtree: true, attributes: true, characterData: true },
        () => {
          return (
            !removeSplitViewFromGroupItem.hidden &&
            removeSplitViewFromGroupItem.textContent === "Remove from Group"
          );
        },
        "removeSplitViewFromGroupItem is visible and has the expected label"
      );

      info("Click menu option to remove split view from group");
      removeSplitViewFromGroupItem.click();
    }
  );

  await BrowserTestUtils.waitForMutationCondition(
    tabContainer,
    { childList: true },
    () => {
      return !Array.from(tabContainer.children).some(
        tabChild => tabChild.tagName === "tab-group"
      );
    },
    "Split view has been removed from tab group"
  );
  Assert.ok(
    !tab1.splitview.group && !tab2.splitview.group,
    "Split view is no longer within a tab group"
  );
  info("Split view has been removed from group");

  splitview.close();
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }
});

add_task(async function test_move_to_split_view_disabled_in_customize_mode() {
  await SpecialPowers.pushPrefEnv({
    set: [["sidebar.verticalTabs", false]],
  });

  info("Enter customize mode.");
  let customizeStateChange = BrowserTestUtils.waitForEvent(
    gNavToolbox,
    "customizationready"
  );
  gCustomizeMode.enter();
  await customizeStateChange;

  await withTabMenu(gBrowser.selectedTab, moveTabToNewSplitViewItem =>
    BrowserTestUtils.waitForMutationCondition(
      moveTabToNewSplitViewItem,
      { attributes: true },
      () =>
        !moveTabToNewSplitViewItem.hidden && moveTabToNewSplitViewItem.disabled,
      "moveTabToNewSplitViewItem is visible and disabled."
    )
  );

  info("Exit customize mode.");
  customizeStateChange = BrowserTestUtils.waitForEvent(
    gNavToolbox,
    "aftercustomization"
  );
  gCustomizeMode.exit();
  await customizeStateChange;

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_new_tab_to_right_of_tab_before_splitview() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.newtab.preload", false]],
  });
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  const tab3 = await addTabAndLoadBrowser();

  let splitViewCreated = BrowserTestUtils.waitForEvent(
    gBrowser.tabContainer,
    "SplitViewCreated"
  );
  gBrowser.addTabSplitView([tab2, tab3]);
  await splitViewCreated;

  info("Split view has been added");

  let splitview = tab2.splitview;

  let tab1Index = tab1.elementIndex;
  let splitviewIndex = splitview.elementIndex;
  Assert.equal(
    splitviewIndex,
    tab1Index + 1,
    "Split view is directly after tab1"
  );

  gBrowser.selectedTab = tab1;

  const newTabPromise = BrowserTestUtils.waitForNewTab(gBrowser);

  const tabContextMenu = document.getElementById("tabContextMenu");
  const contextMenuShown = BrowserTestUtils.waitForPopupEvent(
    tabContextMenu,
    "shown"
  );

  EventUtils.synthesizeMouseAtCenter(
    tab1,
    { type: "contextmenu", button: 2 },
    window
  );
  await contextMenuShown;

  const openNewTabItem = document.getElementById("context_openANewTab");
  tabContextMenu.activateItem(openNewTabItem);

  let newTab = await newTabPromise;

  let newTabIndex = newTab.elementIndex;
  let updatedTab1Index = tab1.elementIndex;
  let updatedSplitviewIndex = splitview.elementIndex;

  Assert.equal(
    newTabIndex,
    updatedTab1Index + 1,
    "New tab is directly after tab1"
  );
  Assert.equal(
    updatedSplitviewIndex,
    newTabIndex + 1,
    "Split view is directly after new tab"
  );
  Assert.ok(!newTab.splitview, "New tab is not part of the split view");

  info("New tab was correctly inserted between tab1 and the split view");

  splitview.close();
  BrowserTestUtils.removeTab(newTab);
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }
});
