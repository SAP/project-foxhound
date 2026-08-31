"use strict";

// TODO bug 1938594: moving a tab to another window sometimes triggers this
// error.
PromiseTestUtils.allowMatchingRejectionsGlobally(
  /Unexpected undefined tabState for onMoveToNewWindow/
);

function getNativeTabByExtensionTabId(tabId) {
  const {
    Management: {
      global: { tabTracker },
    },
  } = ChromeUtils.importESModule("resource://gre/modules/Extension.sys.mjs");
  return tabTracker.getTab(tabId);
}

function loadExtensionForSplitViewTest({ background }) {
  async function createSplit(tabIds) {
    return new Promise(resolve => {
      browser.test.onMessage.addListener(function l(msg, splitViewId) {
        browser.test.assertEq("createSplit:done", msg, "createSplit done");
        browser.test.onMessage.removeListener(l);
        resolve(splitViewId);
      });
      browser.test.sendMessage("createSplit", tabIds);
    });
  }
  const extension = ExtensionTestUtils.loadExtension({
    background: `(${background})(${createSplit})`,
  });
  extension.onMessage("createSplit", tabIds => {
    const tab1 = getNativeTabByExtensionTabId(tabIds[0]);
    const tab2 = getNativeTabByExtensionTabId(tabIds[1]);
    const splitview = tab1.documentGlobal.gBrowser.addTabSplitView(
      [tab1, tab2],
      { insertBefore: tab1 }
    );
    extension.sendMessage("createSplit:done", splitview.splitViewId);
  });
  return extension;
}

// This test verifies that split views can enter or leave tab groups. For
// simplicity, the group membership is the only change in this test task;
// all other fields (index, splitViewId) are not expected to change by group()
// and ungroup().
add_task(async function test_tab_group_of_splitview() {
  let extension = loadExtensionForSplitViewTest({
    background: async createSplit => {
      const { id: windowId, tabs } = await browser.windows.create({
        url: ["about:blank#0", "about:blank#1"],
      });
      const tabId0 = tabs[0].id;
      const tabId1 = tabs[1].id;

      async function queryTabsByWindowId(windowId) {
        return Array.from(await browser.tabs.query({ windowId }), t => ({
          index: t.index,
          tabId: t.id,
          groupId: t.groupId,
          splitViewId: t.splitViewId,
        }));
      }

      // This test repeats the following checks for each scenario:
      // 1. group() create
      // 2. group() again (replacing existing group)
      // 3. group() again given groupId (keep existing group)
      // 4. Ungroup
      async function testGrouping({
        description,
        groupedTabIds,
        expectedGroupedTabIds = groupedTabIds,
        initialTabs,
      }) {
        // In this test, the only expected change are to a tab's groupId.
        // Notably, index and splitViewId should not change.
        const getExpectedTabsWithGroupId = groupId => {
          return initialTabs.map(t => {
            if (expectedGroupedTabIds.includes(t.tabId)) {
              return { ...t, groupId };
            }
            return t;
          });
        };

        // Sanity check: Initial tab strip matches reality.
        browser.test.assertDeepEq(
          initialTabs,
          await queryTabsByWindowId(windowId),
          `${description} - initialTabs matches`
        );

        const gid1 = await browser.tabs.group({ tabIds: groupedTabIds });
        browser.test.assertTrue(gid1 !== -1, `Created new group: ${gid1}`);
        browser.test.assertDeepEq(
          getExpectedTabsWithGroupId(gid1),
          await queryTabsByWindowId(windowId),
          `${description} - group() of ungrouped tab creates new group`
        );
        const gid2 = await browser.tabs.group({ tabIds: groupedTabIds });
        browser.test.assertFalse(
          [-1, gid1].includes(gid2),
          `Created different group: ${gid2}`
        );
        browser.test.assertDeepEq(
          getExpectedTabsWithGroupId(gid2),
          await queryTabsByWindowId(windowId),
          `${description} - group() of tabs in existing group replaces group`
        );
        const gid3 = await browser.tabs.group({
          groupId: gid2,
          tabIds: groupedTabIds,
        });
        browser.test.assertEq(gid2, gid3, "Keeps group given by groupId");
        browser.test.assertDeepEq(
          getExpectedTabsWithGroupId(gid2), // Note: gid2 === gid3.
          await queryTabsByWindowId(windowId),
          `${description} - group() of tabs with groupId keeps group`
        );
        await browser.tabs.ungroup(groupedTabIds);
        browser.test.assertDeepEq(
          getExpectedTabsWithGroupId(-1),
          await queryTabsByWindowId(windowId),
          `${description} - ungroup() drops group from tab strip`
        );
      }

      // We create one split view, which should stay constant through this test.
      const splitViewId = await createSplit([tabId0, tabId1]);

      await testGrouping({
        description: "solitary split view",
        groupedTabIds: [tabId0, tabId1],
        initialTabs: [
          { index: 0, tabId: tabId0, groupId: -1, splitViewId },
          { index: 1, tabId: tabId1, groupId: -1, splitViewId },
        ],
      });

      // Add two tabs at each side of the split, resulting behavior should be
      // identical.
      const { id: tabId2 } = await browser.tabs.create({
        windowId: windowId,
        index: 0,
        url: "about:blank#2",
      });
      const { id: tabId3 } = await browser.tabs.create({
        windowId: windowId,
        index: 3,
        url: "about:blank#3",
      });
      await testGrouping({
        description: "split view with other tabs at each side",
        groupedTabIds: [tabId2, tabId0, tabId1, tabId3],
        initialTabs: [
          { index: 0, tabId: tabId2, groupId: -1, splitViewId: -1 },
          { index: 1, tabId: tabId0, groupId: -1, splitViewId },
          { index: 2, tabId: tabId1, groupId: -1, splitViewId },
          { index: 3, tabId: tabId3, groupId: -1, splitViewId: -1 },
        ],
      });

      // Now try again with a single split view, but exclude the surrounding
      // tabs from the group.
      await testGrouping({
        description: "Split view excluding other tabs at each side",
        groupedTabIds: [tabId0, tabId1],
        initialTabs: [
          { index: 0, tabId: tabId2, groupId: -1, splitViewId: -1 },
          { index: 1, tabId: tabId0, groupId: -1, splitViewId },
          { index: 2, tabId: tabId1, groupId: -1, splitViewId },
          { index: 3, tabId: tabId3, groupId: -1, splitViewId: -1 },
        ],
      });

      // When an individual tab of a split view is grouped, the entire split
      // view should be affected.
      await testGrouping({
        description: "Split view's left tab only",
        groupedTabIds: [tabId0],
        expectedGroupedTabIds: [tabId0, tabId1],
        initialTabs: [
          { index: 0, tabId: tabId2, groupId: -1, splitViewId: -1 },
          { index: 1, tabId: tabId0, groupId: -1, splitViewId },
          { index: 2, tabId: tabId1, groupId: -1, splitViewId },
          { index: 3, tabId: tabId3, groupId: -1, splitViewId: -1 },
        ],
      });
      await testGrouping({
        description: "Split view's right tab only",
        groupedTabIds: [tabId1],
        expectedGroupedTabIds: [tabId0, tabId1],
        initialTabs: [
          { index: 0, tabId: tabId2, groupId: -1, splitViewId: -1 },
          { index: 1, tabId: tabId0, groupId: -1, splitViewId },
          { index: 2, tabId: tabId1, groupId: -1, splitViewId },
          { index: 3, tabId: tabId3, groupId: -1, splitViewId: -1 },
        ],
      });

      // When a split view is given with the tabs reversed, we should not
      // reverse the tabs in the split.
      await testGrouping({
        description: "Split view (reversed tabs)",
        groupedTabIds: [tabId1, tabId0],
        expectedGroupedTabIds: [tabId0, tabId1],
        initialTabs: [
          { index: 0, tabId: tabId2, groupId: -1, splitViewId: -1 },
          { index: 1, tabId: tabId0, groupId: -1, splitViewId },
          { index: 2, tabId: tabId1, groupId: -1, splitViewId },
          { index: 3, tabId: tabId3, groupId: -1, splitViewId: -1 },
        ],
      });

      // Now start with a group at the end and try to join a split view with it.
      const groupStart = await browser.tabs.group({ tabIds: [tabId2] });
      const groupEnd = await browser.tabs.group({ tabIds: [tabId3] });

      // Test what happens when a split view tries to join the group at the
      // right of the split view, or at the left of the split view.
      // Through this test, only groupId is expected to change.
      async function testJoinExistingGroup(tabIds, whichTab) {
        await browser.tabs.group({ tabIds, groupId: groupEnd });
        browser.test.assertDeepEq(
          [
            { index: 0, tabId: tabId2, groupId: groupStart, splitViewId: -1 },
            { index: 1, tabId: tabId0, groupId: groupEnd, splitViewId },
            { index: 2, tabId: tabId1, groupId: groupEnd, splitViewId },
            { index: 3, tabId: tabId3, groupId: groupEnd, splitViewId: -1 },
          ],
          await queryTabsByWindowId(windowId),
          `group() adds split view to group at right (given ${whichTab})`
        );
        await browser.tabs.ungroup(tabIds);
        browser.test.assertDeepEq(
          [
            { index: 0, tabId: tabId2, groupId: groupStart, splitViewId: -1 },
            { index: 1, tabId: tabId0, groupId: -1, splitViewId },
            { index: 2, tabId: tabId1, groupId: -1, splitViewId },
            { index: 3, tabId: tabId3, groupId: groupEnd, splitViewId: -1 },
          ],
          await queryTabsByWindowId(windowId),
          `ungroup() removes split view from group (given ${whichTab})`
        );

        await browser.tabs.group({ tabIds, groupId: groupStart });
        browser.test.assertDeepEq(
          [
            { index: 0, tabId: tabId2, groupId: groupStart, splitViewId: -1 },
            { index: 1, tabId: tabId0, groupId: groupStart, splitViewId },
            { index: 2, tabId: tabId1, groupId: groupStart, splitViewId },
            { index: 3, tabId: tabId3, groupId: groupEnd, splitViewId: -1 },
          ],
          await queryTabsByWindowId(windowId),
          `group() adds split view to group at the left (given ${whichTab})`
        );
        await browser.tabs.ungroup(tabIds);
        browser.test.assertDeepEq(
          [
            { index: 0, tabId: tabId2, groupId: groupStart, splitViewId: -1 },
            { index: 1, tabId: tabId0, groupId: -1, splitViewId },
            { index: 2, tabId: tabId1, groupId: -1, splitViewId },
            { index: 3, tabId: tabId3, groupId: groupEnd, splitViewId: -1 },
          ],
          await queryTabsByWindowId(windowId),
          `ungroup() removes split view from group (given ${whichTab})`
        );

        // Now verify the behavior when creating a new group for the split view
        // while the other tab of the group is left behind.

        // Create group with tab + split view (transition already asserted
        // above) and try to create a new group for the given split. The
        // relative order of tabs should not change. This is worth verifying
        // because the position of the new group depends on whether the removed
        // groups were at the edge (e.g. start) of the previous group.
        await browser.tabs.group({ tabIds, groupId: groupStart });
        let groupMid1 = await browser.tabs.group({ tabIds });
        browser.test.assertDeepEq(
          [
            { index: 0, tabId: tabId2, groupId: groupStart, splitViewId: -1 },
            { index: 1, tabId: tabId0, groupId: groupMid1, splitViewId },
            { index: 2, tabId: tabId1, groupId: groupMid1, splitViewId },
            { index: 3, tabId: tabId3, groupId: groupEnd, splitViewId: -1 },
          ],
          await queryTabsByWindowId(windowId),
          `group() split view, leaving old group at left (given ${whichTab})`
        );
        await browser.tabs.group({ tabIds, groupId: groupEnd });
        browser.test.assertDeepEq(
          [
            { index: 0, tabId: tabId2, groupId: groupStart, splitViewId: -1 },
            { index: 1, tabId: tabId0, groupId: groupEnd, splitViewId },
            { index: 2, tabId: tabId1, groupId: groupEnd, splitViewId },
            { index: 3, tabId: tabId3, groupId: groupEnd, splitViewId: -1 },
          ],
          await queryTabsByWindowId(windowId),
          `group() of split view entering a different group (given ${whichTab})`
        );
        let groupMid2 = await browser.tabs.group({ tabIds });
        browser.test.assertDeepEq(
          [
            { index: 0, tabId: tabId2, groupId: groupStart, splitViewId: -1 },
            { index: 1, tabId: tabId0, groupId: groupMid2, splitViewId },
            { index: 2, tabId: tabId1, groupId: groupMid2, splitViewId },
            { index: 3, tabId: tabId3, groupId: groupEnd, splitViewId: -1 },
          ],
          await queryTabsByWindowId(windowId),
          `group() split view, leaving old group at right (given ${whichTab})`
        );

        await browser.tabs.ungroup(tabIds);
        browser.test.assertDeepEq(
          [
            // Note: this is the initial state before we ran the tests.
            { index: 0, tabId: tabId2, groupId: groupStart, splitViewId: -1 },
            { index: 1, tabId: tabId0, groupId: -1, splitViewId },
            { index: 2, tabId: tabId1, groupId: -1, splitViewId },
            { index: 3, tabId: tabId3, groupId: groupEnd, splitViewId: -1 },
          ],
          await queryTabsByWindowId(windowId),
          `ungroup() removes split view between other groups (given ${whichTab})`
        );
      }
      // All of the following behaviors should be equivalent: the full split
      // view joins a group when any or all of its tabs are passed to group(),
      // or leaves a group when ungroup() is called. The order of tabs is
      // maintained.
      await testJoinExistingGroup([tabId0], "split view's left tab");
      await testJoinExistingGroup([tabId1], "split view's right tab");
      await testJoinExistingGroup([tabId0, tabId1], "split view (both tabs)");
      await testJoinExistingGroup([tabId1, tabId0], "split view (reversed)");

      await browser.windows.remove(windowId);

      browser.test.sendMessage("done");
    },
  });
  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});

// Verify that we can move split views across windows when creating groups,
// given both or just one of the split view's tabIds, and also that the order
// of splits is maintained despite shuffling them.
add_task(async function test_tab_group_and_splitview_across_windows() {
  let extension = loadExtensionForSplitViewTest({
    background: async createSplit => {
      const destWin = await browser.windows.create({});
      const tabId0 = destWin.tabs[0].id;
      const windowId = destWin.id;

      async function queryTabsByWindowId(windowId) {
        return Array.from(await browser.tabs.query({ windowId }), t => ({
          index: t.index,
          tabId: t.id,
          groupId: t.groupId,
          splitViewId: t.splitViewId,
        }));
      }

      const win1 = await browser.windows.create({
        url: ["about:blank#0", "about:blank#1", "about:blank#2"],
      });
      const tabIds = win1.tabs.map(t => t.id);

      const splitViewId = await createSplit([tabIds[0], tabIds[1]]);

      let groupId = await browser.tabs.group({
        createProperties: { windowId },
        tabIds,
      });
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabId0, groupId: -1, splitViewId: -1 },
          { index: 1, tabId: tabIds[0], groupId, splitViewId },
          { index: 2, tabId: tabIds[1], groupId, splitViewId },
          { index: 3, tabId: tabIds[2], groupId, splitViewId: -1 },
        ],
        await queryTabsByWindowId(windowId),
        "Can move split view to a new group in another window"
      );

      // Setup: Move tab to a new window, in a new group.
      const win2 = await browser.windows.create({ tabId: tabIds[2] });
      const gid2 = await browser.tabs.group({
        createProperties: { windowId: win2.id },
        tabIds: [tabIds[2]],
      });
      // Specify the right tab of the split view.
      await browser.tabs.group({ groupId: gid2, tabIds: [tabIds[1]] });
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabIds[2], groupId: gid2, splitViewId: -1 },
          { index: 1, tabId: tabIds[0], groupId: gid2, splitViewId },
          { index: 2, tabId: tabIds[1], groupId: gid2, splitViewId },
        ],
        await queryTabsByWindowId(win2.id),
        "group() of one tab of a split moves the whole split across windows"
      );

      // windowId has only 1 tab (tabId0) at this point, add all from win2.
      groupId = await browser.tabs.group({
        createProperties: { windowId },
        // This is exactly the reverse order of the current tabs in win2.
        tabIds: [tabIds[1], tabIds[0], tabIds[2]],
      });
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabId0, groupId: -1, splitViewId: -1 },
          { index: 1, tabId: tabIds[0], groupId, splitViewId },
          { index: 2, tabId: tabIds[1], groupId, splitViewId },
          { index: 3, tabId: tabIds[2], groupId, splitViewId: -1 },
        ],
        await queryTabsByWindowId(windowId),
        "Preserve split order despite the specified order reversed"
      );

      await browser.windows.remove(windowId);

      browser.test.sendMessage("done");
    },
  });
  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});
