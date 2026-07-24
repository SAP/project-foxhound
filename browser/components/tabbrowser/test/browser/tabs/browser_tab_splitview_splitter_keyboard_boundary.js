/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_setup(() =>
  SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  })
);

/**
 * Helper function to move splitter to a boundary using arrow keys.
 *
 * @param {Element} splitter - The splitter element
 * @param {Element} panel - The panel to measure
 * @param {"right"|"left"} direction
 */
async function moveToBoundary(splitter, panel, direction) {
  const key = direction === "right" ? "KEY_ArrowRight" : "KEY_ArrowLeft";
  info(`Moving splitter to maximum ${direction} position`);

  let beforeWidth, afterWidth;
  do {
    beforeWidth = panel.getBoundingClientRect().width;
    let cmdEventPromise = BrowserTestUtils.waitForEvent(splitter, "command");
    EventUtils.synthesizeKey(key);
    await cmdEventPromise;
    afterWidth = panel.getBoundingClientRect().width;
  } while (Math.abs(afterWidth - beforeWidth) > 0);

  info(`Reached ${direction} boundary at width ${afterWidth}`);
}

/**
 * @returns {Promise<[Element, Element, Element, Element]>}
 */
async function setupSplitView() {
  const tab1 = BrowserTestUtils.addTab(
    gBrowser,
    "data:text/html,<title>Tab 1</title>"
  );
  const tab2 = BrowserTestUtils.addTab(
    gBrowser,
    "data:text/html,<title>Tab 2</title>"
  );
  await BrowserTestUtils.switchTab(gBrowser, tab1);
  const splitView = gBrowser.addTabSplitView([tab1, tab2], {
    insertBefore: tab1,
  });
  const splitter = gBrowser.tabpanels.splitViewSplitter;
  await BrowserTestUtils.waitForMutationCondition(
    splitter,
    { attributes: true },
    () => !splitter.hidden
  );
  return [splitView, splitter, tab1, tab2];
}

async function check_SplitterKeyboard_RightBoundary(isRTL) {
  const [splitView, splitter, tab1, tab2] = await setupSplitView();
  const leftMostPanel = gBrowser.getPanel(
    isRTL ? tab2.linkedBrowser : tab1.linkedBrowser
  );

  info("Move focus to the splitter");
  Services.focus.setFocus(splitter, Services.focus.FLAG_BYKEY);
  Assert.equal(document.activeElement, splitter, "Splitter has focus");

  // Move splitter all the way to the left and check the left-hand panel grows
  await moveToBoundary(splitter, leftMostPanel, "right");

  // Now try to move the splitter back to the left
  let beforeWidth = leftMostPanel.getBoundingClientRect().width;
  let cmdEventPromise = BrowserTestUtils.waitForEvent(splitter, "command");

  EventUtils.synthesizeKey("KEY_ArrowLeft");
  await cmdEventPromise;

  let afterWidth = leftMostPanel.getBoundingClientRect().width;
  let widthChange = Math.abs(afterWidth - beforeWidth);

  info(`Width before: ${beforeWidth}, after: ${afterWidth}`);
  Assert.less(
    afterWidth,
    beforeWidth,
    `Left panel should shrink when pressing left arrow`
  );
  // The width should change by approximately 5px (the keyboard delta)
  Assert.ok(
    widthChange >= 4 && widthChange <= 6,
    `Width should change by ~5px, actual change: ${widthChange}px`
  );

  splitView.close();
}

async function check_SplitterKeyboard_LeftBoundary(isRTL) {
  const [splitView, splitter, tab1, tab2] = await setupSplitView();
  const rightMostPanel = gBrowser.getPanel(
    isRTL ? tab1.linkedBrowser : tab2.linkedBrowser
  );

  info("Move focus to the splitter");
  Services.focus.setFocus(splitter, Services.focus.FLAG_BYKEY);
  Assert.equal(document.activeElement, splitter, "Splitter has focus");

  // Move splitter all the way to the left and check the right-hand panel grows
  await moveToBoundary(splitter, rightMostPanel, "left");

  // Now try to move the splitter back to the right
  let beforeWidth = rightMostPanel.getBoundingClientRect().width;
  let cmdEventPromise = BrowserTestUtils.waitForEvent(splitter, "command");

  EventUtils.synthesizeKey("KEY_ArrowRight");
  await cmdEventPromise;

  let afterWidth = rightMostPanel.getBoundingClientRect().width;
  let widthChange = Math.abs(afterWidth - beforeWidth);

  info(`Width before: ${beforeWidth}, after: ${afterWidth}`);
  Assert.less(
    afterWidth,
    beforeWidth,
    `Right panel should shrink when pressing right arrow`
  );
  // The width should change by approximately 5px (the keyboard delta)
  Assert.ok(
    widthChange >= 4 && widthChange <= 6,
    `Width should change by ~5px, actual change: ${widthChange}px`
  );

  splitView.close();
}

add_task(async function test_SplitterKeyboard_RightBoundary_LTR() {
  // In LTR the tab order from left to right is tab1, tab2.
  // So moving the splitter right should grow the left-most tab which is tab1.
  await check_SplitterKeyboard_RightBoundary(false);
});

add_task(async function test_SplitterKeyboard_RightBoundary_RTL() {
  // In RTL the tab order from left to right is tab2, tab1.
  // So moving the splitter right should grow the left-most tab which is tab2.
  await SpecialPowers.pushPrefEnv({ set: [["intl.l10n.pseudo", "bidi"]] });
  await check_SplitterKeyboard_RightBoundary(true);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_SplitterKeyboard_LeftBoundary_LTR() {
  // In LTR the tab order from left to right is tab1, tab2.
  // So moving the splitter left should grow the right-most tab which is tab2.
  await check_SplitterKeyboard_LeftBoundary(false);
});

add_task(async function test_SplitterKeyboard_LeftBoundary_RTL() {
  // In RTL the tab order from left to right is tab2, tab1.
  // So moving the splitter left should grow the right-most tab which is tab1.
  await SpecialPowers.pushPrefEnv({ set: [["intl.l10n.pseudo", "bidi"]] });
  await check_SplitterKeyboard_LeftBoundary(true);
  await SpecialPowers.popPrefEnv();
});
