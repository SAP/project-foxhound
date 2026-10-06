"use strict";

// TODO bug 1938594: test_move_tabs_of_splitview_to_other_window may trigger
// this error. See https://bugzilla.mozilla.org/show_bug.cgi?id=2023037#c4
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

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.splitView.enabled", true]],
  });
});

add_task(async function test_existing_adjacent_tabs_in_splitview() {
  let extension = loadExtensionForSplitViewTest({
    background: async createSplit => {
      const { id: windowId } = await browser.windows.create({});
      // tabId0 not declared; the first tab exists so we can test its existence
      // via tabs.query(), but we do not do anything else with it.
      const { id: tabId1 } = await browser.tabs.create({ windowId });
      const { id: tabId2 } = await browser.tabs.create({ windowId });

      browser.tabs.onMoved.addListener((movedTabId, moveInfo) => {
        // We are going to wrap existing tabs in a split view. Their indexes do
        // not change, so we are not expecting a tabs.onMoved event.
        browser.test.fail(
          `Unexpected tabs.onMoved: ${movedTabId}, ${JSON.stringify(moveInfo)}`
        );
      });
      const changes = [];
      browser.tabs.onUpdated.addListener(
        (tabId, changeInfo) => {
          changes.push({ tabId, changeInfo });
        },
        { properties: ["splitViewId"] }
      );

      const splitViewId = await createSplit([tabId1, tabId2]);
      browser.test.assertTrue(
        Number.isSafeInteger(splitViewId) && splitViewId > 0,
        `Created split view and got integer ID: ${splitViewId}`
      );

      browser.test.assertDeepEq(
        [-1, splitViewId, splitViewId],
        (await browser.tabs.query({ windowId })).map(t => t.splitViewId),
        "splitViewId values after creating split of adjacent tabs"
      );

      // After creating the split, and doing a roundtrip to the parent, we
      // should have received all tabs.onUpdated related to the split view
      // creation. Verify the observed events:
      browser.test.assertDeepEq(
        [
          { tabId: tabId1, changeInfo: { splitViewId } },
          { tabId: tabId2, changeInfo: { splitViewId } },
        ],
        changes.splice(0),
        "Got expected tabs.onUpdated events after creating split"
      );

      // Removing a tab would leave one tab remaining, which cannot happen
      // because a split contains two tabs. The split should therefore unsplit.
      await browser.tabs.remove(tabId2);
      browser.test.assertEq(
        -1,
        (await browser.tabs.get(tabId1)).splitViewId,
        "When the other tab in the split closes, the first tab unsplits"
      );
      browser.test.assertDeepEq(
        [{ tabId: tabId1, changeInfo: { splitViewId: -1 } }],
        changes.splice(0),
        "Got expected tabs.onUpdated events after unsplit"
      );

      await browser.windows.remove(windowId);
      browser.test.sendMessage("done");
    },
  });
  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});

// Tests what happens when we use tabs.move() to move a tab into an existing
// split view. Because a split view can contain only two tabs, it is not
// possible for the tab to end up at the specified position AND for it to enter
// the existing split. The result is therefore to move the tab to the left of
// the split. This behavior differs from Chrome (bug 2016751).
add_task(async function test_move_another_tab_into_splitview() {
  let extension = loadExtensionForSplitViewTest({
    background: async createSplit => {
      const { id: windowId, tabs } = await browser.windows.create({});
      const { id: tabId0 } = tabs[0];
      const { id: tabId1 } = await browser.tabs.create({ windowId });
      const { id: tabId2 } = await browser.tabs.create({ windowId });
      const { id: tabId3 } = await browser.tabs.create({ windowId });
      const { id: tabId4 } = await browser.tabs.create({ windowId });

      const changes = [];
      browser.tabs.onMoved.addListener((movedTabId, moveInfo) => {
        changes.push({ movedTabId, moveInfo });
      });
      browser.tabs.onUpdated.addListener(
        (tabId, changeInfo) => {
          changes.push({ tabId, changeInfo });
        },
        { properties: ["splitViewId"] }
      );

      const splitViewId = await createSplit([tabId1, tabId2]);

      // Move tab from the right of split "into" the split.
      const [movedTab] = await browser.tabs.move(tabId3, { index: 2 });
      browser.test.assertEq(-1, movedTab.splitViewId, "Cannot move into split");
      browser.test.assertEq(1, movedTab.index, "Appears at left of split");
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabId0, splitViewId: -1 },
          { index: 1, tabId: tabId3, splitViewId: -1 }, // Moved from index 3.
          { index: 2, tabId: tabId1, splitViewId },
          { index: 3, tabId: tabId2, splitViewId },
          { index: 4, tabId: tabId4, splitViewId: -1 },
        ],
        Array.from(await browser.tabs.query({ windowId }), t => ({
          index: t.index,
          tabId: t.id,
          splitViewId: t.splitViewId,
        })),
        // Apparently, we expect to push the tab to the left of a split view
        // when we attempt to move a tab to to a position between split views.
        // This behavior differs from Chrome (bug 2016751).
        "Result of attempt to move a tab (from right) between tabs in split view"
      );
      browser.test.assertDeepEq(
        [
          { tabId: tabId1, changeInfo: { splitViewId } },
          { tabId: tabId2, changeInfo: { splitViewId } },
          {
            movedTabId: tabId3,
            moveInfo: { windowId, fromIndex: 3, toIndex: 1 },
          },
        ],
        changes.splice(0),
        "Got expected tabs events after moving tab to new split"
      );

      // Move tab from the left of split "into" the split.
      await browser.tabs.move(tabId0, { index: 2 });
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabId3, splitViewId: -1 },
          { index: 1, tabId: tabId1, splitViewId },
          { index: 2, tabId: tabId2, splitViewId },
          { index: 3, tabId: tabId0, splitViewId: -1 }, // Moved from index 0.
          { index: 4, tabId: tabId4, splitViewId: -1 },
        ],
        Array.from(await browser.tabs.query({ windowId }), t => ({
          index: t.index,
          tabId: t.id,
          splitViewId: t.splitViewId,
        })),
        // Apparently, we expect to push the tab to the right of a split view
        // when we attempt to move a tab to to a position between split views.
        // This behavior differs from Chrome (bug 2016751).
        "Result of attempt to move a tab (from left) between tabs in split view"
      );
      browser.test.assertDeepEq(
        [
          {
            movedTabId: tabId0,
            moveInfo: { windowId, fromIndex: 0, toIndex: 3 },
          },
        ],
        changes.splice(0),
        "Got expected tabs events after moving tab to new split"
      );

      await browser.windows.remove(windowId);
      browser.test.sendMessage("done");
    },
  });
  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});

add_task(async function test_move_tabs_of_splitview_within_same_window() {
  let extension = loadExtensionForSplitViewTest({
    background: async createSplit => {
      const { id: windowId, tabs } = await browser.windows.create({});
      const { id: tabId0 } = tabs[0];
      const { id: tabId1 } = await browser.tabs.create({ windowId });
      const { id: tabId2 } = await browser.tabs.create({ windowId });

      // Create split before tabs.onUpdated to avoid detecting the splitViewId
      // mutations on creation (already covered elsewhere).
      const splitViewId = await createSplit([tabId1, tabId2]);

      const changes = [];
      browser.tabs.onMoved.addListener((movedTabId, moveInfo) => {
        changes.push({ movedTabId, moveInfo });
      });
      browser.tabs.onUpdated.addListener(
        (tabId, changeInfo) => {
          changes.push({ tabId, changeInfo });
        },
        { properties: ["splitViewId"] }
      );

      async function queryTabsInWindow() {
        return Array.from(await browser.tabs.query({ windowId }), t => ({
          index: t.index,
          tabId: t.id,
          splitViewId: t.splitViewId,
        }));
      }

      // Move single tab in split view: right to left.
      let moved = await browser.tabs.move(tabId2, { index: 1 });
      browser.test.assertDeepEq(
        [tabId2],
        moved.map(t => t.id),
        "tabs.move() returned tabs after moving right tab in split view"
      );
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabId0, splitViewId: -1 },
          { index: 1, tabId: tabId2, splitViewId },
          { index: 2, tabId: tabId1, splitViewId },
        ],
        await queryTabsInWindow(),
        "splitViewId preserved when right tab in split swaps with the left tab"
      );
      browser.test.assertDeepEq(
        [
          {
            movedTabId: tabId2,
            moveInfo: { windowId, fromIndex: 2, toIndex: 1 },
          },
        ],
        changes.splice(0),
        "Got expected tabs events when right tab in split swaps with left tab"
      );

      // Move single tab in split view: left to right.
      moved = await browser.tabs.move(tabId2, { index: 2 });
      browser.test.assertDeepEq(
        [tabId2],
        moved.map(t => t.id),
        "tabs.move() return value after moving left tab in split view"
      );
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabId0, splitViewId: -1 },
          { index: 1, tabId: tabId1, splitViewId },
          { index: 2, tabId: tabId2, splitViewId },
        ],
        await queryTabsInWindow(),
        "splitViewId preserved when left tab in split swaps with the right tab"
      );

      browser.test.assertDeepEq(
        [
          // NOTE: Although we requested tabs.move() with tabId2 to index 1,
          // we are observing tabId1 being moved instead, because the tabs
          // are internally swapped via splitview.reverseTabs(), which always
          // moves the first tab of the split to the second tab's position.
          // This is strange, but to extensions observing the event, the result
          // is equivalent. That is what matters most.
          {
            movedTabId: tabId1,
            moveInfo: { windowId, fromIndex: 2, toIndex: 1 },
          },
        ],
        changes.splice(0),
        "Got expected tabs events when left tab in split view swaps with right tab"
      );

      // Now move both tabs in the split view, to another position.
      moved = await browser.tabs.move([tabId1, tabId2], { index: 0 });
      browser.test.assertDeepEq(
        [tabId1, tabId2],
        moved.map(t => t.id),
        "tabs.move() return value after moving both tabs of split view"
      );
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabId1, splitViewId },
          { index: 1, tabId: tabId2, splitViewId },
          { index: 2, tabId: tabId0, splitViewId: -1 },
        ],
        await queryTabsInWindow(),
        // Note: Chrome (144) unsplits, we intentionally keep it (bug 2016868).
        "splitViewId preserved when moving two tabs of split view at once"
      );
      browser.test.assertDeepEq(
        [
          {
            movedTabId: tabId1,
            moveInfo: { windowId, fromIndex: 1, toIndex: 0 },
          },
          {
            movedTabId: tabId2,
            moveInfo: { windowId, fromIndex: 2, toIndex: 1 },
          },
        ],
        changes.splice(0),
        "Got expected tabs events after moving the tabs in split view elsewhere"
      );

      // In fact, the split is kept together not because of the request to move
      // two tabs at once, but because moving any one of the two tabs causes
      // the whole split view to move together. Intentionally (bug 2016868).
      await browser.tabs.move(tabId1, { index: 2 });
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabId0, splitViewId: -1 },
          // tabId1 is at index 1 instead of the requested 2 because there is
          // no other tab that we can put before tabId1. tabId2 is not an
          // option because then we would have to reverse the split view, which
          // we do not want to do if not explicitly requested.
          { index: 1, tabId: tabId1, splitViewId },
          { index: 2, tabId: tabId2, splitViewId },
        ],
        await queryTabsInWindow(),
        "Moving one tab of split view moves both"
      );
      browser.test.assertDeepEq(
        [
          // When a split view moves forward, TabMove (and tabs.move) is
          // dispatched in the reverse order, to allow extensions to accurately
          // reconstruct the current state of the tabs collection.
          {
            movedTabId: tabId2,
            moveInfo: { windowId, fromIndex: 1, toIndex: 2 },
          },
          {
            movedTabId: tabId1,
            moveInfo: { windowId, fromIndex: 0, toIndex: 1 },
          },
        ],
        changes.splice(0),
        "Got expected tabs events after moving one tab in split view elsewhere"
      );

      // The above test checks the tabs.move() behavior with the minimal number
      // of tabs. Confirm the behavior when there are more tabs at the right.
      const { id: tabId3 } = await browser.tabs.create({ windowId });
      const { id: tabId4 } = await browser.tabs.create({ windowId });
      const { id: tabId5 } = await browser.tabs.create({ windowId });
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabId0, splitViewId: -1 },
          { index: 1, tabId: tabId1, splitViewId },
          { index: 2, tabId: tabId2, splitViewId },
          { index: 3, tabId: tabId3, splitViewId: -1 },
          { index: 4, tabId: tabId4, splitViewId: -1 },
          { index: 5, tabId: tabId5, splitViewId: -1 },
        ],
        await queryTabsInWindow(),
        "Expected order of tabs after creating a few extra new tabs"
      );
      browser.test.assertDeepEq([], changes, "Not expecting any events");

      await browser.tabs.move([tabId1, tabId2], { index: 3 });
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabId0, splitViewId: -1 },
          { index: 1, tabId: tabId3, splitViewId: -1 },
          { index: 2, tabId: tabId4, splitViewId: -1 },
          { index: 3, tabId: tabId1, splitViewId },
          { index: 4, tabId: tabId2, splitViewId },
          { index: 5, tabId: tabId5, splitViewId: -1 },
        ],
        await queryTabsInWindow(),
        "Moved split view to the pair of tabs after it"
      );
      browser.test.assertDeepEq(
        [
          // When a split view moves forward, TabMove (and tabs.move) is
          // dispatched in the reverse order, to allow extensions to accurately
          // reconstruct the current state of the tabs collection.
          {
            movedTabId: tabId2,
            moveInfo: { windowId, fromIndex: 2, toIndex: 4 },
          },
          {
            movedTabId: tabId1,
            moveInfo: { windowId, fromIndex: 1, toIndex: 3 },
          },
        ],
        changes.splice(0),
        "Got expected tabs events after moving both splitview tabs forward"
      );

      await browser.windows.remove(windowId);
      browser.test.sendMessage("done");
    },
  });
  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});

add_task(async function test_move_tabs_of_splitview_to_other_window() {
  let extension = loadExtensionForSplitViewTest({
    background: async createSplit => {
      const oldWindow = await browser.windows.create({});
      const { id: tabId0 } = oldWindow.tabs[0];
      const { id: tabId1 } = await browser.tabs.create({
        windowId: oldWindow.id,
      });

      const newWindow = await browser.windows.create({});
      const { id: tabId2 } = newWindow.tabs[0];

      // Create split before tabs.onUpdated to avoid detecting the splitViewId
      // mutations on creation (already covered elsewhere).
      const splitViewId = await createSplit([tabId0, tabId1]);

      const changes = [];
      browser.tabs.onMoved.addListener((movedTabId, moveInfo) => {
        changes.push({ movedTabId, moveInfo });
      });
      browser.tabs.onDetached.addListener((movedTabId, detachInfo) => {
        changes.push({ movedTabId, detachInfo });
      });
      browser.tabs.onAttached.addListener((movedTabId, attachInfo) => {
        changes.push({ movedTabId, attachInfo });
      });
      browser.tabs.onUpdated.addListener(
        (tabId, changeInfo) => {
          changes.push({ tabId, changeInfo });
        },
        { properties: ["splitViewId"] }
      );

      async function queryTabsByWindowId(windowId) {
        return Array.from(await browser.tabs.query({ windowId }), t => ({
          index: t.index,
          tabId: t.id,
          splitViewId: t.splitViewId,
        }));
      }

      // Move the two tabs of a split view to another window.
      await browser.tabs.move([tabId0, tabId1], {
        windowId: newWindow.id,
        index: 0,
      });
      await browser.test.assertRejects(
        browser.windows.get(oldWindow.id),
        `Invalid window ID: ${oldWindow.id}`,
        "After moving the two tabs (in a split view), the old window closes"
      );
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabId0, splitViewId },
          { index: 1, tabId: tabId1, splitViewId },
          { index: 2, tabId: tabId2, splitViewId: -1 },
        ],
        await queryTabsByWindowId(newWindow.id),
        "splitViewId kept after moving two tabs in a split view to another window"
      );
      browser.test.assertDeepEq(
        [
          {
            movedTabId: tabId0,
            detachInfo: { oldWindowId: oldWindow.id, oldPosition: 0 },
          },
          {
            movedTabId: tabId0,
            attachInfo: { newWindowId: newWindow.id, newPosition: 0 },
          },
          {
            movedTabId: tabId1,
            detachInfo: { oldWindowId: oldWindow.id, oldPosition: 0 },
          },
          {
            movedTabId: tabId1,
            attachInfo: { newWindowId: newWindow.id, newPosition: 1 },
          },
          // Note: no tabs.onUpdated with changeInfo.splitViewId, because the
          // splitViewId does effectively not change.
        ],
        changes.splice(0),
        "Got expected tabs events after moving tab to new split"
      );

      // Now adopt one of the tabs in the split view in a new window. That
      // should adopt both tabs.

      // The observed outcome is expected to be identical independently of
      // whether one is adopting the split view's left tab vs its right tab.
      // This test temporarily tears off the split view to a separate window
      // and then puts it back in the same place where it started. That
      // enables us to reuse the test logic for both tabs.
      async function testAdoptOneTabOfSplitInNewWindow(tabId0or1) {
        const whichTab =
          tabId0or1 === tabId0 ? "left tab of split" : "left tab of split";
        const newWindow2 = await browser.windows.create({ tabId: tabId0or1 });
        browser.test.assertDeepEq(
          [
            { index: 0, tabId: tabId0, splitViewId },
            { index: 1, tabId: tabId1, splitViewId },
          ],
          await queryTabsByWindowId(newWindow2.id),
          `windows.create() with ${whichTab} should adopt both tabs`
        );
        browser.test.assertDeepEq(
          [
            {
              movedTabId: tabId0,
              detachInfo: { oldWindowId: newWindow.id, oldPosition: 0 },
            },
            {
              movedTabId: tabId0,
              attachInfo: { newWindowId: newWindow2.id, newPosition: 0 },
            },
            {
              movedTabId: tabId1,
              detachInfo: { oldWindowId: newWindow.id, oldPosition: 0 },
            },
            {
              movedTabId: tabId1,
              attachInfo: { newWindowId: newWindow2.id, newPosition: 1 },
            },
            // Note: no tabs.onUpdated with changeInfo.splitViewId, because the
            // splitViewId does effectively not change.
          ],
          changes.splice(0),
          `Got expected tabs events after moving ${whichTab} to new window`
        );

        // Moving one tab of the split view should result in moving both tabs.
        await browser.tabs.move(tabId0or1, {
          windowId: newWindow.id,
          index: 0,
        });
        browser.test.assertDeepEq(
          [
            { index: 0, tabId: tabId0, splitViewId },
            { index: 1, tabId: tabId1, splitViewId },
            { index: 2, tabId: tabId2, splitViewId: -1 },
          ],
          await queryTabsByWindowId(newWindow.id),
          `tabs.move of ${whichTab} to different window should move whole split`
        );

        browser.test.assertDeepEq(
          [
            {
              movedTabId: tabId0,
              detachInfo: { oldWindowId: newWindow2.id, oldPosition: 0 },
            },
            {
              movedTabId: tabId0,
              attachInfo: { newWindowId: newWindow.id, newPosition: 0 },
            },
            {
              movedTabId: tabId1,
              detachInfo: { oldWindowId: newWindow2.id, oldPosition: 0 },
            },
            {
              movedTabId: tabId1,
              attachInfo: { newWindowId: newWindow.id, newPosition: 1 },
            },
            // Note: no tabs.onUpdated with changeInfo.splitViewId, because the
            // splitViewId does effectively not change.
          ],
          changes.splice(0),
          `Got expected tabs events after moving ${whichTab} to existing window`
        );
      }

      // Test left side of split view (tabId0).
      await testAdoptOneTabOfSplitInNewWindow(tabId0);
      // Test right side of split view (tabId1).
      await testAdoptOneTabOfSplitInNewWindow(tabId1);

      // Now remove a tab from the split, which should force unsplit.
      await browser.tabs.remove(tabId0);
      browser.test.assertDeepEq(
        [
          { index: 0, tabId: tabId1, splitViewId: -1 },
          { index: 1, tabId: tabId2, splitViewId: -1 },
        ],
        await queryTabsByWindowId(newWindow.id),
        "tab unsplit after closing one of the adopted tabs"
      );
      browser.test.assertDeepEq(
        [
          // Above we verified that tabs.onUpdated is not fired while adopting
          // tabs, now we confirm that tabs.onUpdated can fire after adoption.
          { tabId: tabId1, changeInfo: { splitViewId: -1 } },
        ],
        changes.splice(0),
        "Got expected tabs events after unsplit due to tab removal"
      );

      await browser.windows.remove(newWindow.id);
      browser.test.sendMessage("done");
    },
  });
  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});

// Tabs in a split view stick together as much as possible. One of the ways to
// unsplit tabs explicitly is if an extension explicitly lists the order.
// This test checks that a split view can be unsplit by a single `tabs.move()`
// when the tabs are explicitly listed with other tabs in between.
//
// In contrast, if `tabs.move()` were to be called individually for each tabId
// (instead of all at once in one `tabs.move()` call), then their split views
// would not unsplit. That is verified in test_move_another_tab_into_splitview.
add_task(async function test_bulk_move_reorder_unsplit_splitview() {
  let extension = loadExtensionForSplitViewTest({
    background: async createSplit => {
      const { id: windowId, tabs } = await browser.windows.create({
        url: [
          "https://example.com/?1",
          "https://example.com/?2",
          "https://example.com/?3",
          "https://example.com/?4",
          "https://example.com/?5",
        ],
      });
      const [tabId1, tabId2, tabId3, tabId4, tabId5] = tabs.map(t => t.id);
      await createSplit([tabId1, tabId2]);
      const splitViewId2 = await createSplit([tabId3, tabId4]);

      const changes = [];
      browser.tabs.onUpdated.addListener(
        (tabId, changeInfo) => {
          changes.push({ tabId, changeInfo });
        },
        { properties: ["splitViewId"] }
      );
      browser.tabs.onMoved.addListener((movedTabId, moveInfo) => {
        changes.push({ movedTabId, moveInfo });
      });

      // Move tabId3 + tabId4 (part of splitViewId2) between the tabs of the
      // other split view (of tabId1 + tabId2).
      let moved = await browser.tabs.move([tabId1, tabId3, tabId4, tabId2], {
        index: 0,
      });
      browser.test.assertDeepEq(
        [tabId1, tabId3, tabId4, tabId2],
        moved.map(t => t.id),
        "tabs.move() returned tabs in the given order"
      );
      browser.test.assertDeepEq(
        [
          // tabId1,tabId2 were part of the same split but forcibly unsplit
          // because we inserted other tabs in between.
          { index: 0, tabId: tabId1, splitViewId: -1 },
          // We moved tabId3,tabId4 together, and since they are adjacent in a
          // split view, their split should be preserved.
          { index: 1, tabId: tabId3, splitViewId: splitViewId2 },
          { index: 2, tabId: tabId4, splitViewId: splitViewId2 },
          { index: 3, tabId: tabId2, splitViewId: -1 },
          { index: 4, tabId: tabId5, splitViewId: -1 },
        ],
        Array.from(await browser.tabs.query({ windowId }), t => ({
          index: t.index,
          tabId: t.id,
          splitViewId: t.splitViewId,
        })),
        "Split view unsplits when tabs.move() puts other tabs in between"
      );
      browser.test.assertDeepEq(
        [
          {
            movedTabId: tabId3,
            moveInfo: { windowId, fromIndex: 2, toIndex: 1 },
          },
          {
            movedTabId: tabId4,
            moveInfo: { windowId, fromIndex: 3, toIndex: 2 },
          },
          // splitViewId onUpdated changes are detected via TabMove, which
          // fires events in the reverse order for bulk moves of multiple tabs
          // in a split view. The order is not tabId1,tabId2, but reversed:
          { tabId: tabId2, changeInfo: { splitViewId: -1 } },
          { tabId: tabId1, changeInfo: { splitViewId: -1 } },
        ],
        changes,
        "Got expected events after tabs.move() unsplit a split view"
      );

      await browser.windows.remove(windowId);
      browser.test.sendMessage("done");
    },
  });
  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});
