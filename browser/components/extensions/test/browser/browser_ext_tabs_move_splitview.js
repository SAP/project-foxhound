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
  async function separateSplit(splitViewId) {
    return new Promise(resolve => {
      browser.test.onMessage.addListener(function l(msg) {
        browser.test.assertEq("separateSplit:done", msg, "separateSplit done");
        browser.test.onMessage.removeListener(l);
        resolve();
      });
      browser.test.sendMessage("separateSplit", splitViewId);
    });
  }
  const extension = ExtensionTestUtils.loadExtension({
    background: `(${background})(${createSplit},${separateSplit})`,
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
  extension.onMessage("separateSplit", splitViewId => {
    let found = false;
    for (const win of Services.wm.getEnumerator("navigator:browser")) {
      for (const splitview of win.gBrowser.splitViews) {
        if (splitview.splitViewId === splitViewId) {
          splitview.unsplitTabs();
          found = true;
          break;
        }
      }
    }
    if (!found) {
      Assert.ok(false, `Did not find splitview with ID ${splitViewId}`);
    }
    extension.sendMessage("separateSplit:done");
  });
  return extension;
}

add_task(async function test_tabs_move() {
  let extension = loadExtensionForSplitViewTest({
    background: async (createSplit, separateSplit) => {
      const firstTab = await browser.tabs.create({ url: "about:blank#0" });

      // In this test we are going to reuse many tabs; to make tests easier to
      // understand, the tests are going to reference tabs by their initial
      // index in the tabstrip. This array maps the tabs at the "initial index"
      // to the actual tab ID.
      let reusableTabIds = [firstTab.id];

      // We are also going to reuse the window. When there are more tabs than
      // we need, we'll put the excess tabs in the initial window.
      const nonTestWindowId = firstTab.windowId;
      const testWindow = await browser.windows.create({ tabId: firstTab.id });
      const windowId = testWindow.id; // Used in the whole test!
      let numberOfTabsInTestWindow = 1;

      async function prepareTestWindow(tabCount) {
        for (let tabId of reusableTabIds) {
          let tab = await browser.tabs.get(tabId);
          if (tab.splitViewId !== -1) {
            await separateSplit(tab.splitViewId);
          }
          if (tab.pinned) {
            await browser.tabs.update(tabId, { pinned: false });
          }
        }
        for (let i = 0; i < tabCount; ++i) {
          if (i in reusableTabIds) {
            await browser.tabs.move(reusableTabIds[i], { windowId, index: i });
          } else {
            const tab = await browser.tabs.create({
              url: `about:blank#${i}`,
              windowId,
              index: i,
            });
            reusableTabIds[i] = tab.id;
          }
        }
        // Move excess tabs to another window.
        for (let i = tabCount; i < numberOfTabsInTestWindow; ++i) {
          await browser.tabs.move(reusableTabIds[i], {
            windowId: nonTestWindowId,
            index: -1,
          });
        }
        numberOfTabsInTestWindow = tabCount;
      }

      // Test the behavior of tabs.move, for a given initial tab strip,
      // in the format [0, 1, 2, [3, 4], 5, 6, etc], where the numbers reflect
      // the tabs (by their initial index), and the nested array of two tabs
      // marks a split view.
      async function testTabsMove(testCase) {
        const testCaseStr = JSON.stringify(testCase);
        browser.test.log(`testTabsMove: ${testCaseStr}`);
        const DUMMY_TAB_MOVE_NO_ERROR = "(tabs.move succeeded)";
        const {
          description,
          starting_tabstrip,
          pinned_count = 0,
          tabIds_to_move, // mapped to real tabIds and passed to tabs.move().
          index,
          expected_tabstrip = starting_tabstrip,
          expected_error = DUMMY_TAB_MOVE_NO_ERROR,
        } = testCase;
        let allTabIndexes = starting_tabstrip.flatMap(num => num);
        // Sanity check: each number reflects the initial index.
        if (allTabIndexes.some((num, i) => num !== i)) {
          browser.test.fail(`Bad index in starting_tabstrip: ${testCaseStr}`);
        }
        // Sanity check: each array has 2 elements
        if (starting_tabstrip.some(v => Array.isArray(v) && v.length !== 2)) {
          browser.test.fail(`Bad array in starting_tabstrip: ${testCaseStr}`);
        }
        // Sanity check: tabIds_to_move resolves to known tab(s).
        if ([].concat(tabIds_to_move).some(i => i >= allTabIndexes.length)) {
          browser.test.fail(`Bad unknown in tabIds_to_move: ${testCaseStr}`);
        }

        // Setup: Prepare window as specified by starting_tabstrip, with a
        // split view for each array.
        await prepareTestWindow(/* tabCount */ allTabIndexes.length);
        for (let v of starting_tabstrip) {
          if (Array.isArray(v)) {
            await createSplit(v.map(i => reusableTabIds[i]));
          }
        }
        for (let i = 0; i < pinned_count; ++i) {
          let tabId = reusableTabIds[i];
          await browser.tabs.update(tabId, { pinned: true });
        }

        let actualError;
        try {
          let tabIdOrTabIds;
          if (Array.isArray(tabIds_to_move)) {
            tabIdOrTabIds = tabIds_to_move.map(i => reusableTabIds[i]);
          } else {
            tabIdOrTabIds = reusableTabIds[tabIds_to_move];
          }
          await browser.tabs.move(tabIdOrTabIds, { index });
          actualError = DUMMY_TAB_MOVE_NO_ERROR;
        } catch (e) {
          actualError = e.message;
        }
        browser.test.assertEq(
          expected_error,
          actualError,
          `expected_error matches - ${description}`
        );

        const actualTabstrip = [];
        let lastSplitViewId;
        for (const tab of await browser.tabs.query({ windowId })) {
          let initialTabStripIndex = reusableTabIds.indexOf(tab.id);
          if (tab.splitViewId == -1) {
            actualTabstrip.push(initialTabStripIndex);
          } else if (lastSplitViewId == tab.splitViewId) {
            actualTabstrip.at(-1).push(initialTabStripIndex);
          } else {
            actualTabstrip.push([initialTabStripIndex]);
          }
          lastSplitViewId = tab.splitViewId;
        }
        browser.test.assertDeepEq(
          expected_tabstrip,
          actualTabstrip,
          `Got expected tabstrip after move - ${description}`
        );
      }

      browser.test.log("Initial test window created - running tests now.");

      // Basics ///////////////////////////////////////////////////////////////

      // When the only two tabs in the window belong to a split view, tabs.move
      // behaves identically for index 0, 1 and -1.
      for (let index of [0, 1, -1]) {
        await testTabsMove({
          description: `Immovable lonely split to index ${index}`,
          starting_tabstrip: [[0, 1]],
          tabIds_to_move: [0, 1],
          index,
          expected_tabstrip: [[0, 1]],
        });

        await testTabsMove({
          description: `Swap tabs in lonely split to index ${index}`,
          starting_tabstrip: [[0, 1]],
          tabIds_to_move: [1, 0],
          index,
          expected_tabstrip: [[1, 0]],
        });
      }

      // Verify that tabs can swap when there are no neighbors.

      await testTabsMove({
        description: "Swap tabs in lonely split (left tab + other index)",
        starting_tabstrip: [[0, 1]],
        tabIds_to_move: 0,
        index: 1,
        expected_tabstrip: [[1, 0]],
      });

      await testTabsMove({
        description: "Swap tabs in lonely split (right tab + other index)",
        starting_tabstrip: [[0, 1]],
        tabIds_to_move: 1,
        index: 0,
        expected_tabstrip: [[1, 0]],
      });

      await testTabsMove({
        description: "Swap tabs in split that has neighbors",
        starting_tabstrip: [0, [1, 2], 3],
        tabIds_to_move: [2, 1],
        index: 1,
        expected_tabstrip: [0, [2, 1], 3],
      });

      await testTabsMove({
        description: "Swap tabs in split (left tab + other index)",
        starting_tabstrip: [0, [1, 2], 3],
        tabIds_to_move: 1,
        index: 2,
        expected_tabstrip: [0, [2, 1], 3],
      });

      await testTabsMove({
        description: "Swap tabs in split (right tab + other index)",
        starting_tabstrip: [0, [1, 2], 3],
        tabIds_to_move: 2,
        index: 1,
        expected_tabstrip: [0, [2, 1], 3],
      });

      // Moving single splits /////////////////////////////////////////////////

      async function testMoveSingleSplitAcrossTabStrip(leftTabOnly) {
        await testTabsMove({
          description: "Move split to left, first position",
          starting_tabstrip: [0, 1, [2, 3], 4, 5],
          tabIds_to_move: leftTabOnly ? 2 : [2, 3],
          index: 0,
          expected_tabstrip: [[2, 3], 0, 1, 4, 5],
        });

        await testTabsMove({
          description: "Move split to left, second position (before split)",
          starting_tabstrip: [0, 1, [2, 3], 4, 5],
          tabIds_to_move: leftTabOnly ? 2 : [2, 3],
          index: 1,
          expected_tabstrip: [0, [2, 3], 1, 4, 5],
        });

        await testTabsMove({
          description: "Move split to same, third position (split's left)",
          starting_tabstrip: [0, 1, [2, 3], 4, 5],
          tabIds_to_move: leftTabOnly ? 2 : [2, 3],
          index: 2,
          expected_tabstrip: [0, 1, [2, 3], 4, 5],
        });

        if (!leftTabOnly) {
          await testTabsMove({
            description: "Move split to right, fourth position (split's right)",
            starting_tabstrip: [0, 1, [2, 3], 4, 5],
            tabIds_to_move: [2, 3],
            index: 3,
            expected_tabstrip: [0, 1, 4, [2, 3], 5],
          });
        } else {
          // When we only pass 1 tab and the destination is within the split,
          // we move the tab within the split instead of moving the whole split.
          await testTabsMove({
            description: "Move split's left to fourth position (split's right)",
            starting_tabstrip: [0, 1, [2, 3], 4, 5],
            tabIds_to_move: 2,
            index: 3,
            expected_tabstrip: [0, 1, [3, 2], 4, 5],
          });
        }

        await testTabsMove({
          description: "Move split to right, fifth position (after split)",
          starting_tabstrip: [0, 1, [2, 3], 4, 5],
          tabIds_to_move: leftTabOnly ? 2 : [2, 3],
          index: 4,
          expected_tabstrip: [0, 1, 4, 5, [2, 3]],
        });

        await testTabsMove({
          description: "Move split to right, sixth position (clamped to end)",
          starting_tabstrip: [0, 1, [2, 3], 4, 5],
          tabIds_to_move: leftTabOnly ? 2 : [2, 3],
          index: 5,
          // Although index 5 exists, the split cannot be there because there is
          // no other tab to be put in front of it.
          expected_tabstrip: [0, 1, 4, 5, [2, 3]],
        });

        await testTabsMove({
          description: "Move split to right, far past end (clamped to end)",
          starting_tabstrip: [0, 1, [2, 3], 4, 5],
          tabIds_to_move: leftTabOnly ? 2 : [2, 3],
          index: 1234,
          expected_tabstrip: [0, 1, 4, 5, [2, 3]],
        });

        await testTabsMove({
          description: "Move split to right, last position by index -1",
          starting_tabstrip: [0, 1, [2, 3], 4, 5],
          tabIds_to_move: leftTabOnly ? 2 : [2, 3],
          index: -1,
          expected_tabstrip: [0, 1, 4, 5, [2, 3]],
        });

        await testTabsMove({
          description: "Index below -1 is invalid",
          starting_tabstrip: [0, 1, [2, 3], 4, 5],
          tabIds_to_move: leftTabOnly ? 2 : [2, 3],
          index: -2,
          expected_tabstrip: [0, 1, [2, 3], 4, 5],
          expected_error:
            "Type error for parameter moveProperties (Error processing index: Integer -2 is too small (must be at least -1)) for tabs.move.",
        });
      }

      // There is no difference in tab moving behavior between requesting to
      // move two tabs of a split, vs only the left tabs of a split.
      await testMoveSingleSplitAcrossTabStrip(/* leftTabOnly */ false);
      await testMoveSingleSplitAcrossTabStrip(/* leftTabOnly */ true);

      // Moving split's right tab (without left tab) //////////////////////////
      // When tabs.move() is called for a single split, the whole split moves.
      // The question is, should the index signify the new position of the
      // given tab, or the new position of the split it is contained in?
      // The answer is: if left tab is not explicitly specified, it is moved
      // along to the specified index, so the specified tab is at index + 1.

      await testTabsMove({
        description: "Move split's right tab, to left, first position",
        starting_tabstrip: [0, 1, [2, 3], 4, 5],
        tabIds_to_move: 3,
        index: 0,
        expected_tabstrip: [[2, 3], 0, 1, 4, 5],
      });

      await testTabsMove({
        description: "Move split's right tab, to position before split",
        starting_tabstrip: [0, 1, [2, 3], 4, 5],
        tabIds_to_move: 3,
        index: 1,
        expected_tabstrip: [0, [2, 3], 1, 4, 5],
        // Alternative, if the given tab were to be at the given index:
        // expected_tabstrip: [[2, 3], 0, 1, 4, 5],
      });

      // Special case: moving within split does not move split, but swaps tab.
      await testTabsMove({
        description: "Move split's right to fourth position (split's left)",
        starting_tabstrip: [0, 1, [2, 3], 4, 5],
        tabIds_to_move: 3,
        index: 2, // Note: this is the index of the same split's other tab.
        expected_tabstrip: [0, 1, [3, 2], 4, 5],
        // The above is expected because the target index is within the same
        // split view. The following alternatives were not chosen:
        // - Move whole split to given index:
        //   expected_tabstrip: [0, 1, [2, 3], 4, 5], // effectively not moved.
        // - Move whole split such that the right tab is at the given index:
        //   expected_tabstrip: [0, [2, 3], 1, 4, 5],
      });

      // Special case: moving within split does not move split, and does not
      // move the tab either if the tab is already at the given index.
      await testTabsMove({
        description: "Move split's right tab, to index of split's right tab",
        starting_tabstrip: [0, 1, [2, 3], 4, 5],
        tabIds_to_move: 3,
        index: 3, // Note: this is the index that the tab is already at.
        expected_tabstrip: [0, 1, [2, 3], 4, 5],
        // The above is expected because the target index is within the same
        // split view. The following alternatives were not chosen:
        // - Move whole split to given index:
        //   expected_tabstrip: [0, 1, 4, [2, 3], 5],
      });

      await testTabsMove({
        description: "Move split's right tab, to fifth position (=last tab)",
        starting_tabstrip: [0, 1, [2, 3], 4, 5],
        tabIds_to_move: 3,
        index: 4,
        // Compared to the first test cases in the sequence, the index now
        // specifies the final position of the given right tab, instead of the
        // whole split.
        expected_tabstrip: [0, 1, 4, 5, [2, 3]],
      });

      await testTabsMove({
        description: "Move split's right tab, to fifth position (out of six)",
        // Should behave identical to previous test case, even with extra tab.
        starting_tabstrip: [0, 1, [2, 3], 4, 5, 6],
        tabIds_to_move: 3,
        index: 4,
        expected_tabstrip: [0, 1, 4, 5, [2, 3], 6],
      });

      await testTabsMove({
        description: "Move split's right tab, to sixth position (=last tab)",
        starting_tabstrip: [0, 1, [2, 3], 4, 5],
        tabIds_to_move: 3,
        index: 5,
        expected_tabstrip: [0, 1, 4, 5, [2, 3]],
      });

      await testTabsMove({
        description: "Move split's right tab, to non-adjacent index at right",
        starting_tabstrip: [0, 1, [2, 3], 4, 5, 6],
        tabIds_to_move: 3,
        index: 6,
        expected_tabstrip: [0, 1, 4, 5, 6, [2, 3]],
      });

      // Moving into position of another split ////////////////////////////////

      await testTabsMove({
        description: "Move tab before split",
        starting_tabstrip: [0, 1, [2, 3], 4, 5],
        tabIds_to_move: 0,
        index: 1,
        expected_tabstrip: [1, 0, [2, 3], 4, 5],
      });

      // An attempt to move a single tab forwards, to the left tab of a split
      // causes the tab to appear at the right of the split view, because it is
      // not possible to keep the split view intact AND put the moved tab at
      // the requested index.
      await testTabsMove({
        description: "Move tab to split's left tab index (append)",
        starting_tabstrip: [0, 1, [2, 3], 4, 5],
        tabIds_to_move: 0,
        index: 2,
        expected_tabstrip: [1, [2, 3], 0, 4, 5],
      });

      await testTabsMove({
        description: "Move tab to split's right tab index (append)",
        starting_tabstrip: [0, 1, [2, 3], 4, 5],
        tabIds_to_move: 0,
        index: 3,
        expected_tabstrip: [1, [2, 3], 0, 4, 5],
      });

      await testTabsMove({
        description: "Move split, keep same position",
        starting_tabstrip: [0, [1, 2], 3, [4, 5], 6],
        tabIds_to_move: [1, 2],
        index: 1,
        expected_tabstrip: [0, [1, 2], 3, [4, 5], 6],
      });

      await testTabsMove({
        description: "Move split to its right index, shift one to the right",
        starting_tabstrip: [0, [1, 2], 3, [4, 5], 6],
        tabIds_to_move: [1, 2],
        index: 2,
        expected_tabstrip: [0, 3, [1, 2], [4, 5], 6],
      });

      // An attempt to move to the right causes a conflict with the adjacent
      // split. This is resolved by moving the split past the adjacent split.
      await testTabsMove({
        description: "Move split to its right index, overlap with other split",
        starting_tabstrip: [0, [1, 2], [3, 4], 5],
        tabIds_to_move: [1, 2],
        index: 2,
        expected_tabstrip: [0, [3, 4], [1, 2], 5],
      });

      await testTabsMove({
        description: "Move split to index of other split's left tab",
        starting_tabstrip: [0, [1, 2], [3, 4], 5],
        tabIds_to_move: [1, 2],
        index: 3,
        expected_tabstrip: [0, [3, 4], [1, 2], 5],
      });

      await testTabsMove({
        description: "Move split to index of other split's right tab",
        starting_tabstrip: [0, [1, 2], [3, 4], 5],
        tabIds_to_move: [1, 2],
        index: 4,
        expected_tabstrip: [0, [3, 4], 5, [1, 2]],
      });

      // Moving multiple at once //////////////////////////////////////////////
      await testTabsMove({
        description: "Move multiple at once",
        starting_tabstrip: [0, 1, [2, 3], [4, 5], 6, [7, 8], 9],
        // 0 not specified, at the left, so does not move.
        // 1 not specified, so appended at end of all specified tabs.
        // [2, 3] move together.
        // [4, 5] are reversed.
        // [7, 8] are listed apart from each other, so they unsplit.
        // 9 not specified, so kept at end.
        tabIds_to_move: [2, 3, 7, 6, 5, 4, 8],
        index: 1,
        expected_tabstrip: [0, [2, 3], 7, 6, [5, 4], 8, 1, 9],
      });

      // Pinned tabs ///////////////////////////////////////////////////////////
      // tabs.move() is documented to silently ignore requests to move unpinned
      // tabs to a pinned tab.

      for (let index of [0, 1]) {
        await testTabsMove({
          description: `Ignore move of split to pinned tab at index ${index}`,
          starting_tabstrip: [0, 1, 2, [3, 4], 5],
          pinned_count: 2,
          tabIds_to_move: [3, 4],
          index,
          expected_tabstrip: [0, 1, 2, [3, 4], 5],
          // The following would have been a reasonable alternative:
          // expected_tabstrip: [0, 1, [3, 4], 2, 5], // Clamp to unpinned tab.
        });
      }

      await testTabsMove({
        description: "Ignoring move of split's left tab between pinned tabs",
        starting_tabstrip: [0, 1, 2, [3, 4], 5],
        pinned_count: 2,
        tabIds_to_move: 3,
        index: 1,
        expected_tabstrip: [0, 1, 2, [3, 4], 5],
        // The following would have been a reasonable alternative:
        // expected_tabstrip: [0, 1, [3, 4], 2, 5], // Clamp to unpinned tab.
      });

      await testTabsMove({
        description: "Move split's right tab between pinned tabs",
        starting_tabstrip: [0, 1, 2, [3, 4], 5],
        pinned_count: 2,
        tabIds_to_move: 4,
        index: 1,
        expected_tabstrip: [0, 1, 2, [3, 4], 5],
        // The following would have been a reasonable alternative:
        // expected_tabstrip: [0, 1, [3, 4], 2, 5], // Clamp to unpinned tab.
      });

      await testTabsMove({
        description: "Move split's right tab to position after pinned tab",
        starting_tabstrip: [0, 1, 2, [3, 4], 5],
        pinned_count: 2,
        tabIds_to_move: 4,
        index: 2,
        expected_tabstrip: [0, 1, [3, 4], 2, 5],
      });

      browser.test.log("Tests done - cleaning up.");
      for (let tabId of reusableTabIds) {
        // This also closes testWindow.
        await browser.tabs.remove(tabId);
      }

      browser.test.sendMessage("done");
    },
  });
  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});
