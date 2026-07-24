/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/*
 * Bug 1967136: Ensure that when hidden, unpinned tabs are present, a new pinned
 * tab is placed in the appropriate position in the tab strip. Buggy behavior
 * can ensue if there are hidden tabs in the tab strip before the pinned tab --
 * even though things may look visually correct, the `Tabbrowser.pinnedTabCount`
 * will be incorrect and that will break a wide number of features.
 */
add_task(async function test_pinned_and_hidden_tabs() {
  const startingTab = gBrowser.selectedTab;
  const tabToHide = BrowserTestUtils.addTab(
    gBrowser,
    "data:text/plain;hidden tab"
  );

  info("ensure that there is a hidden tab before a visible tab");
  gBrowser.moveTabBefore(tabToHide, startingTab);
  gBrowser.hideTab(tabToHide);

  info("create a new pinned tab without a specified tab index position");
  const pinnedTab = BrowserTestUtils.addTab(
    gBrowser,
    "data:text/plain;pinned tab",
    { pinned: true }
  );

  Assert.ok(pinnedTab.pinned, "Tab should have been created as a pinned tab");
  Assert.equal(
    pinnedTab._tPos,
    0,
    "Pinned tabs should come before all unpinned tabs"
  );
  Assert.equal(
    gBrowser.pinnedTabCount,
    1,
    "Pinned tab count should be correct"
  );

  BrowserTestUtils.removeTab(tabToHide);
  BrowserTestUtils.removeTab(pinnedTab);
});
