/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { TabProvider } = ChromeUtils.importESModule(
  "resource://services-sync/engines/tabs.sys.mjs"
);

const TEST_URL1 = "https://example.com/page1";
const TEST_URL2 = "https://example.com/page2";
const TEST_URL3 = "https://example.com/page3";
const TEST_URL4 = "https://example.com/page4";

add_task(async function test_basic() {
  let win = await BrowserTestUtils.openNewBrowserWindow();
  try {
    // Note: Window starts with one "about:blank" tab at index 0
    let tab1 = BrowserTestUtils.addTab(win.gBrowser, TEST_URL1);
    let tab2 = BrowserTestUtils.addTab(win.gBrowser, TEST_URL2);
    let tab3 = BrowserTestUtils.addTab(win.gBrowser, TEST_URL3);

    await Promise.all([
      BrowserTestUtils.browserLoaded(tab1.linkedBrowser),
      BrowserTestUtils.browserLoaded(tab2.linkedBrowser),
      BrowserTestUtils.browserLoaded(tab3.linkedBrowser),
    ]);

    // Pin one tab.
    win.gBrowser.pinTab(tab2);

    let result = await TabProvider.getLocalTabsInfo(1000000);

    Assert.ok(result.tabs, "Result has tabs array");
    let winInfo = result.windows.get("window-0");
    Assert.equal(winInfo.id, "window-0");
    Assert.equal(winInfo.index, 1);
    Assert.equal(result.tabGroups.size, 0, "No tab groups in this test");
    Assert.equal(result.tabs.length, 3, "3 tabs returned");

    let syncedTabs = result.tabs.filter(
      t =>
        t.urlHistory[0] === TEST_URL1 ||
        t.urlHistory[0] === TEST_URL2 ||
        t.urlHistory[0] === TEST_URL3
    );
    Assert.equal(syncedTabs.length, 3, "All test tabs are included");

    for (let tab of syncedTabs) {
      Assert.ok(tab.windowId, winInfo.id);
      Assert.equal(
        tab.tabGroupId,
        "",
        "Tab has empty tabGroupId (not in group)"
      );
      Assert.strictEqual(
        typeof tab.pinned,
        "boolean",
        "Tab has boolean pinned field"
      );
      Assert.greater(tab.urlHistory.length, 0, "Tab has URL history");
      Assert.notStrictEqual(tab.title, undefined, "Tab has title");
    }

    // Check specific tab indices match their position in the window
    let tab1Data = syncedTabs.find(t => t.urlHistory[0] === TEST_URL1);
    let tab2Data = syncedTabs.find(t => t.urlHistory[0] === TEST_URL2);
    let tab3Data = syncedTabs.find(t => t.urlHistory[0] === TEST_URL3);

    Assert.ok(tab1Data, "Found tab1");
    Assert.ok(tab2Data, "Found tab2");
    Assert.ok(tab3Data, "Found tab3");

    // Indices and pinned states - we expect pinned tabs first.
    Assert.ok(tab2Data.pinned);
    Assert.equal(tab2Data.index, 0);

    Assert.ok(!tab1Data.pinned);
    // verify about:blank is now the first non-pinned tab.
    Assert.equal(
      win.gBrowser.tabs[1].linkedBrowser.currentURI.spec,
      "about:blank"
    );
    // which explains why tab1 has the index of 2
    Assert.equal(tab1Data.index, 2);

    Assert.ok(!tab3Data.pinned);
    Assert.equal(tab3Data.index, 3);
  } finally {
    await BrowserTestUtils.closeWindow(win);
  }
});

add_task(async function test_with_groups() {
  let win = await BrowserTestUtils.openNewBrowserWindow();
  try {
    let tab1 = BrowserTestUtils.addTab(win.gBrowser, TEST_URL1);
    let tab2 = BrowserTestUtils.addTab(win.gBrowser, TEST_URL2);
    let tab3 = BrowserTestUtils.addTab(win.gBrowser, TEST_URL3);
    await Promise.all([
      BrowserTestUtils.browserLoaded(tab1.linkedBrowser),
      BrowserTestUtils.browserLoaded(tab2.linkedBrowser),
      BrowserTestUtils.browserLoaded(tab3.linkedBrowser),
    ]);

    let tabGroup = win.gBrowser.addTabGroup([tab2, tab3], {
      label: "Test Group",
      color: "blue",
    });

    let result = await TabProvider.getLocalTabsInfo(1000000);

    let groupedTabs = result.tabs.filter(
      t => t.urlHistory[0] === TEST_URL2 || t.urlHistory[0] === TEST_URL3
    );
    Assert.equal(groupedTabs.length, 2, "Both grouped tabs are included");

    for (let tab of groupedTabs) {
      Assert.equal(tab.tabGroupId, tabGroup.id, "Tab has correct group ID");
    }

    let tabGroupInfo = result.tabGroups.get(tabGroup.id);
    Assert.equal(tabGroupInfo.id, tabGroup.id);
    Assert.equal(tabGroupInfo.name, "Test Group");
    Assert.equal(tabGroupInfo.color, "blue");

    let ungroupedTab = result.tabs.find(t => t.urlHistory[0] === TEST_URL1);
    if (ungroupedTab) {
      Assert.equal(
        ungroupedTab.tabGroupId,
        "",
        "Ungrouped tab has empty group ID"
      );
    }
  } finally {
    await BrowserTestUtils.closeWindow(win);
  }
});

add_task(async function test_multiple_windows() {
  let win1 = await BrowserTestUtils.openNewBrowserWindow();
  let win2 = await BrowserTestUtils.openNewBrowserWindow();
  try {
    let tab1 = BrowserTestUtils.addTab(win1.gBrowser, TEST_URL1);
    let tab2 = BrowserTestUtils.addTab(win2.gBrowser, TEST_URL2);
    await Promise.all([
      BrowserTestUtils.browserLoaded(tab1.linkedBrowser),
      BrowserTestUtils.browserLoaded(tab2.linkedBrowser),
    ]);

    let result = await TabProvider.getLocalTabsInfo(1000000);

    Assert.equal(result.windows.size, 2, "both windows returned");

    let testTabs = result.tabs.filter(
      t => t.urlHistory[0] === TEST_URL1 || t.urlHistory[0] === TEST_URL2
    );
    Assert.equal(testTabs.length, 2, "Tabs from both windows included");

    let windowIds = new Set(testTabs.map(t => t.windowId));
    Assert.equal(windowIds.size, 2, "Tabs have different window IDs");

    let win1Tab = testTabs.find(t => t.urlHistory[0] === TEST_URL1);
    let win2Tab = testTabs.find(t => t.urlHistory[0] === TEST_URL2);
    let win1Id = win1Tab.windowId;
    let win2Id = win2Tab.windowId;

    // We want to make sure that the last window we opened has a lower "index" - ie, if we order the windows
    // by this index, the first should be the "most recent".
    Assert.less(
      result.windows.get(win2Id).index,
      result.windows.get(win1Id).index,
      "win2 (most recent) has lower index than win1"
    );
    // Further, they should not be zero, as that means the device didn't provide the value.
    Assert.notEqual(result.windows.get(win1Id).index, 0);
    Assert.notEqual(result.windows.get(win2Id).index, 0);
  } finally {
    await BrowserTestUtils.closeWindow(win1);
    await BrowserTestUtils.closeWindow(win2);
  }
});

add_task(
  async function test_getAllTabsWithEstimatedMax_only_references_used_groups() {
    let win = await BrowserTestUtils.openNewBrowserWindow();
    try {
      let tab1 = BrowserTestUtils.addTab(win.gBrowser, TEST_URL1);
      let tab2 = BrowserTestUtils.addTab(win.gBrowser, TEST_URL2);
      let tab3 = BrowserTestUtils.addTab(win.gBrowser, TEST_URL3);
      let tab4 = BrowserTestUtils.addTab(win.gBrowser, TEST_URL4);
      await Promise.all([
        BrowserTestUtils.browserLoaded(tab1.linkedBrowser),
        BrowserTestUtils.browserLoaded(tab2.linkedBrowser),
        BrowserTestUtils.browserLoaded(tab3.linkedBrowser),
        BrowserTestUtils.browserLoaded(tab4.linkedBrowser),
      ]);

      let group1 = win.gBrowser.addTabGroup([tab1, tab2], {
        label: "Group 1",
      });
      let group2 = win.gBrowser.addTabGroup([tab3, tab4], {
        label: "Group 2",
      });

      // Use a very small limit to ensure not all tabs fit
      let result = await TabProvider.getAllTabsWithEstimatedMax(true, 200);

      Assert.greater(result.tabs.length, 0, "Some tabs included");
      Assert.less(
        result.tabs.length,
        4,
        "Not all tabs included due to size limit"
      );

      let groupsInTabs = new Set(
        result.tabs.filter(t => t.tabGroupId).map(t => t.tabGroupId)
      );

      for (let groupId of groupsInTabs) {
        Assert.ok(
          result.referencedGroupIds.has(groupId),
          `Group ${groupId} is in referencedGroupIds`
        );
      }

      let allGroups = new Set([group1.id, group2.id]);
      for (let groupId of result.referencedGroupIds) {
        Assert.ok(
          allGroups.has(groupId),
          `Referenced group ${groupId} exists in window`
        );
      }
    } finally {
      await BrowserTestUtils.closeWindow(win);
    }
  }
);
