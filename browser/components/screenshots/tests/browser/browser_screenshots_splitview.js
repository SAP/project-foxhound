/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  });
});

async function cancelPanel(helper) {
  let exitObserved = TestUtils.topicObserved("screenshots-exit");
  await SimpleTest.promiseFocus(helper.browser.documentGlobal);
  EventUtils.synthesizeKey("KEY_Escape");
  await helper.waitForPanelClosed();
  await exitObserved;
}

function assertPanelWithinRect(panel, refRect) {
  // the positioned box has 0 width; its the buttons we want to measure
  const rect = panel.firstElementChild.getBoundingClientRect();
  Assert.greater(rect.width, 1, "Panel has width");
  Assert.greaterOrEqual(
    rect.left,
    refRect.left,
    "Left edge is >= reference edge"
  );
  Assert.lessOrEqual(
    rect.right,
    refRect.right,
    "Right edge is <= the reference edge"
  );
}

add_task(async function test_buttonsPanelWithSplitView() {
  let buttonsPanel;

  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  const tab3 = await addTabAndLoadBrowser();
  await BrowserTestUtils.switchTab(gBrowser, tab1);

  const helper1 = new ScreenshotsHelper(tab1.linkedBrowser);
  const helper2 = new ScreenshotsHelper(tab2.linkedBrowser);
  const helper3 = new ScreenshotsHelper(tab3.linkedBrowser);

  const tabToTabPanels = new WeakMap();
  for (let tab of [tab1, tab2, tab3]) {
    tabToTabPanels.set(tab, document.getElementById(tab.linkedPanel));
  }

  gBrowser.addTabSplitView([tab1, tab2]);
  helper1.triggerUIFromToolbar();
  await helper1.waitForOverlay();
  buttonsPanel = helper1.panel;

  // make sure the buttons panel is visually associated with the selected tab
  assertPanelWithinRect(
    buttonsPanel,
    tabToTabPanels.get(tab1).getBoundingClientRect()
  );
  info("Waiting for cancelPanel");
  await cancelPanel(helper1);
  info("/Waiting for cancelPanel");

  // switch to the other side of the splitview
  await BrowserTestUtils.switchTab(gBrowser, tab2);
  helper2.triggerUIFromToolbar();
  info("Waiting for panel on tab2");
  await helper2.waitForOverlay();
  buttonsPanel = helper2.panel;

  // make sure the buttons panel is visually associated with the selected tab
  assertPanelWithinRect(
    buttonsPanel,
    tabToTabPanels.get(tab2).getBoundingClientRect()
  );

  // With the panel still open, close the selected tab. The open panel means
  // screenshots-exit fires as part of the removal — observe it now so it is
  // consumed before cancelPanel sets up its own observer for tab3 below.
  let exitObserved = TestUtils.topicObserved("screenshots-exit");
  const tab2closed = BrowserTestUtils.waitForTabClosing(tab2);
  BrowserTestUtils.removeTab(tab2);
  await tab2closed;
  await exitObserved;

  // Remove tab1 now so tab3 is standalone with no splitview context.
  // Without this, tab1 remains as the left side of the dissolved splitview;
  // pressing Escape on tab3's panel would see the left-side already closed
  // and skip emitting screenshots-exit, causing cancelPanel to hang.
  BrowserTestUtils.removeTab(tab1);

  await BrowserTestUtils.switchTab(gBrowser, tab3);

  // Verify screenshots can be re-opened after being implicitly closed by the
  // removal of the other splitview tab — this is the crux of the bug fix.
  helper3.triggerUIFromToolbar();
  await helper3.waitForOverlay();
  buttonsPanel = helper3.panel;
  ok(
    BrowserTestUtils.isVisible(buttonsPanel),
    "Screenshots panel can be opened after the other splitview tab was closed"
  );

  // make sure the buttons panel is visually associated with the selected tab
  assertPanelWithinRect(
    buttonsPanel,
    tabToTabPanels.get(tab3).getBoundingClientRect()
  );
  await cancelPanel(helper3);

  BrowserTestUtils.removeTab(tab3);
});

add_task(async function test_cancelSelectionClosesInitialSibling() {
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  await BrowserTestUtils.switchTab(gBrowser, tab1);

  gBrowser.addTabSplitView([tab1, tab2]);

  const helper1 = new ScreenshotsHelper(tab1.linkedBrowser);
  const helper2 = new ScreenshotsHelper(tab2.linkedBrowser);

  // In the left browser, open screenshots and draw a selection.
  helper1.triggerUIFromToolbar();
  await helper1.waitForOverlay();
  await helper1.dragOverlay(10, 10, 300, 300);
  await helper1.assertStateChange("selected");

  // Switch to the right browser and open screenshots there (INITIAL state).
  await BrowserTestUtils.switchTab(gBrowser, tab2);
  helper2.triggerUIFromToolbar();
  await helper2.waitForOverlay();
  await BrowserTestUtils.waitForCondition(
    async () => await helper2.isOverlayInitialized(),
    "Right browser overlay should be initialized"
  );

  // Verify that tab1 is still in OVERLAYSELECTION - the selection made in the
  // left browser should be preserved while the right browser is active.
  await helper1.assertStateChange("selected");
  ok(
    await helper1.isOverlayInitialized(),
    "Left browser overlay should still be visible "
  );

  // Without explicitly switching tabs, click the [X] button in the left browser to clear
  // the selection. This returns the left browser to the initial state. Because
  // the right browser is also in the initial state, it should be cancelled.
  let exitObserved = TestUtils.topicObserved("screenshots-exit");
  await helper1.clickCancelButton();

  // In real user interaction, clicking the [X] in the left browser also selects
  // tab1. Synthetic events don't trigger the tab switch, so do it manually.
  if (gBrowser.selectedTab !== tab1) {
    await BrowserTestUtils.switchTab(gBrowser, tab1);
  }
  await helper1.assertStateChange("crosshairs");
  Assert.equal(gBrowser.selectedTab, tab1, "tab1 selected");

  info("Waiting for exitObserved");
  await exitObserved;
  info("exitObserved, Waiting for tab2 to be not initialized");
  await BrowserTestUtils.waitForCondition(
    async () => !(await helper2.isOverlayInitialized()),
    "Right browser overlay should be closed after left browser cancelled its selection"
  );
  gBrowser.removeTab(tab1);
  gBrowser.removeTab(tab2);
});
