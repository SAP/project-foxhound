/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

// TODO bug 1938594: test_move_all_except_one_tabs_of_window sometimes triggers
// this error. See https://bugzilla.mozilla.org/show_bug.cgi?id=1938594#c5
PromiseTestUtils.allowMatchingRejectionsGlobally(
  /Unexpected undefined tabState for onMoveToNewWindow/
);

add_task(async function test_move_multiple_in_different_windows() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["tabs"],
    },

    async background() {
      const URL = "https://example.com/";
      let mainWin = await browser.windows.getCurrent();
      let tab1 = await browser.tabs.create({ url: URL });
      let tab2 = await browser.tabs.create({ url: URL });

      let newWin = await browser.windows.create({ url: [URL, URL] });
      browser.test.assertEq(newWin.tabs.length, 2, "New window has 2 tabs");
      let [tab3, tab4] = newWin.tabs;

      // move tabs in both windows to index 0 in a single call
      await browser.tabs.move([tab2.id, tab4.id], { index: 0 });

      tab1 = await browser.tabs.get(tab1.id);
      browser.test.assertEq(
        tab1.windowId,
        mainWin.id,
        "tab 1 is still in main window"
      );

      tab2 = await browser.tabs.get(tab2.id);
      browser.test.assertEq(
        tab2.windowId,
        mainWin.id,
        "tab 2 is still in main window"
      );
      browser.test.assertEq(tab2.index, 0, "tab 2 moved to index 0");

      tab3 = await browser.tabs.get(tab3.id);
      browser.test.assertEq(
        tab3.windowId,
        newWin.id,
        "tab 3 is still in new window"
      );

      tab4 = await browser.tabs.get(tab4.id);
      browser.test.assertEq(
        tab4.windowId,
        newWin.id,
        "tab 4 is still in new window"
      );
      browser.test.assertEq(tab4.index, 0, "tab 4 moved to index 0");

      await browser.tabs.remove([tab1.id, tab2.id]);
      await browser.windows.remove(newWin.id);

      browser.test.notifyPass("tabs.move.multiple");
    },
  });

  await extension.startup();
  await extension.awaitFinish("tabs.move.multiple");
  await extension.unload();
});

// Regression test for https://bugzilla.mozilla.org/show_bug.cgi?id=2017768
// When multiple tabs are moved, and there are tabs after the active tab, we
// internally dispatch TabSelect events for the tab after the active tab, but
// that event ends up being dispatched on an obsolete tab element after
// adoption. We used to try to prepare tabs.onActivated for that obsolete
// already-adopted tab, causing "Cannot attach ID to a tab in a closed window"
// to be raised when the window was removed.
add_task(async function test_move_all_tabs_of_window() {
  let extension = ExtensionTestUtils.loadExtension({
    async background() {
      const destWin = await browser.windows.create({
        url: "https://example.com/?0",
      });

      const win = await browser.windows.create({
        url: ["https://example.com/?1", "https://example.com/?2"],
      });
      let tabs = await browser.tabs.query({ windowId: win.id, active: true });
      browser.test.assertEq(win.tabs[0].id, tabs[0].id, "Tab 1 is active");

      browser.tabs.onActivated.addListener(activeInfo => {
        browser.test.fail(
          `Unexpected onActivated: ${JSON.stringify(activeInfo)}`
        );
      });

      await browser.tabs.move([win.tabs[0].id, win.tabs[1].id], {
        windowId: destWin.id,
        index: -1,
      });

      let destWinTabs = await browser.tabs.query({ windowId: destWin.id });
      browser.test.assertDeepEq(
        [true, false, false],
        destWinTabs.map(t => t.active),
        "Destination window's active tab has not changed"
      );

      await browser.windows.remove(destWin.id);
      browser.test.notifyPass("tabs.move.all_tabs_in_window");
    },
  });
  await extension.startup();
  await extension.awaitFinish("tabs.move.all_tabs_in_window");
  await extension.unload();
});

// For comparison with test_move_all_tabs_of_window: tabs.onActivated fires for
// the remaining tab in the window.
add_task(async function test_move_all_except_one_tabs_of_window() {
  let extension = ExtensionTestUtils.loadExtension({
    async background() {
      const destWin = await browser.windows.create({
        url: "https://example.com/?0",
      });

      const win = await browser.windows.create({
        url: [
          "https://example.com/?1",
          "https://example.com/?2",
          "https://example.com/?3",
        ],
      });
      let tabs = await browser.tabs.query({ windowId: win.id, active: true });
      browser.test.assertEq(win.tabs[0].id, tabs[0].id, "Tab 1 is active");

      let count = 0;
      browser.tabs.onActivated.addListener(activeInfo => {
        browser.test.assertEq(1, ++count, "Expected one onActivated event");
        browser.test.assertDeepEq(
          // previousTabId is documented to be undefined if the previous tab is
          // closed. To the extension, the tab is not closed, even though we
          // internally have closed the source tab after adoption in destWin.
          // "previousTabId: win.tabs[0].id" would also have been reasonable.
          { tabId: win.tabs[2].id, previousTabId: undefined, windowId: win.id },
          activeInfo,
          "When two tabs move, the remaining tab is focused"
        );
      });

      browser.test.log("Moving 2 out of 3 tabs to destination window");
      await browser.tabs.move([win.tabs[0].id, win.tabs[1].id], {
        windowId: destWin.id,
        index: -1,
      });

      let destWinTabs = await browser.tabs.query({ windowId: destWin.id });
      browser.test.assertDeepEq(
        [true, false, false],
        destWinTabs.map(t => t.active),
        "Destination window's active tab has not changed"
      );

      await browser.windows.remove(destWin.id);
      await browser.windows.remove(win.id);
      browser.test.assertEq(1, count, "onActivated fired once");
      browser.test.notifyPass("tabs.move.all_except_one_tabs_in_window");
    },
  });
  await extension.startup();
  await extension.awaitFinish("tabs.move.all_except_one_tabs_in_window");
  await extension.unload();
});

// tabs.move() with the same tab listed is not super meaningful, but the
// outcome should make sense: no errors or wrong indexes.
add_task(async function test_move_same_tab_multiple_times() {
  let extension = ExtensionTestUtils.loadExtension({
    async background() {
      const destWin = await browser.windows.create({
        url: "https://example.com/?0",
      });
      const tabId0 = destWin.tabs[0].id;

      const win = await browser.windows.create({
        url: ["https://example.com/?1", "https://example.com/?2"],
      });
      const tabId1 = win.tabs[0].id;
      const tabId2 = win.tabs[1].id;
      const moved = await browser.tabs.move([tabId1, tabId1, tabId1, tabId2], {
        windowId: destWin.id,
        index: 0,
      });
      browser.test.assertDeepEq(
        [
          { tabId: tabId1, index: 0 },
          // Notably index should remain 0, not continue to 1.
          { tabId: tabId1, index: 0 },
          { tabId: tabId1, index: 0 },
          { tabId: tabId2, index: 1 },
        ],
        moved.map(t => ({ tabId: t.id, index: t.index })),
        "Return value of tabs.move() to new window with duplicate tabs"
      );
      let destWinTabs = await browser.tabs.query({ windowId: destWin.id });
      browser.test.assertDeepEq(
        [
          { tabId: tabId1, index: 0 },
          { tabId: tabId2, index: 1 },
          { tabId: tabId0, index: 2 },
        ],
        destWinTabs.map(t => ({ tabId: t.id, index: t.index })),
        "Final position of tabs in window after tabs.move()"
      );
      await browser.windows.remove(destWin.id);
      browser.test.notifyPass("tabs.move.same_tab_multiple_times");
    },
  });
  await extension.startup();
  await extension.awaitFinish("tabs.move.same_tab_multiple_times");
  await extension.unload();
});
