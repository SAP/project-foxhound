"use strict";

add_setup(() =>
  SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  })
);

async function expectFocusAfterKey(expectedActiveElement, keyName, keyOptions) {
  let focused = BrowserTestUtils.waitForEvent(expectedActiveElement, "focus");
  EventUtils.synthesizeKey(keyName, keyOptions);
  await focused;
  Assert.equal(
    document.activeElement,
    expectedActiveElement,
    `After ${keyName}, the expected element has focus`
  );
}

/* Test that
 * the splitter in a split view is focusable
 * arrow keys correctly move the splitter and cause panels to resize
 * when switching to a different splitview, the arrow keys move and affect the correct panels
 */

add_task(async function test_SplitterKeyboardA11Y() {
  const tab1 = BrowserTestUtils.addTab(
    gBrowser,
    "data:text/html,<title>Tab 1</title>"
  );
  const tab2 = BrowserTestUtils.addTab(
    gBrowser,
    "data:text/html,<title>Tab 2</title>"
  );
  const tab3 = BrowserTestUtils.addTab(
    gBrowser,
    "data:text/html,<title>Tab 3</title>"
  );
  const tab4 = BrowserTestUtils.addTab(
    gBrowser,
    "data:text/html,<title>Tab 4</title>"
  );

  await BrowserTestUtils.switchTab(gBrowser, tab1);
  const splitView = gBrowser.addTabSplitView([tab1, tab2], {
    insertBefore: tab1,
  });
  const splitter = gBrowser.tabpanels.splitViewSplitter;
  let leftPanel = gBrowser.getPanel(tab1.linkedBrowser);
  Assert.equal(
    leftPanel,
    document.getElementById(gBrowser.tabpanels.splitViewPanels[0]),
    "Sanity check the left panel is the correct tab's panel"
  );

  Assert.ok(splitter, "The splitview splitter was created");
  Assert.equal(
    splitter.getAttribute("role"),
    "separator",
    "The splitter has the separator role"
  );
  Assert.equal(
    splitter.getAttribute("aria-controls"),
    leftPanel.id,
    "The splitter's aria-controls attribute points to the left panel"
  );

  info("Move focus to the left-side browser");
  Services.focus.setFocus(gBrowser.selectedBrowser, Services.focus.FLAG_BYKEY);

  await expectFocusAfterKey(splitter, "KEY_Tab");
  await expectFocusAfterKey(tab2.linkedBrowser, "KEY_Tab");
  await expectFocusAfterKey(splitter, "KEY_Tab", { shiftKey: true });
  Assert.equal(document.activeElement, splitter, "Splitter has focus");

  let beforeWidth = leftPanel.getBoundingClientRect().width;
  let beforeValueNow = splitter.getAttribute("aria-valuenow");
  let cmdEventPromise = BrowserTestUtils.waitForEvent(splitter, "command");
  info(
    `Before the arrow key, aria-valuenow value: ${beforeValueNow}, beforeWidth: ${beforeWidth}`
  );

  await EventUtils.synthesizeKey("KEY_ArrowLeft");
  await cmdEventPromise;
  await BrowserTestUtils.waitForMutationCondition(
    splitter,
    { attributes: true, attributeFilter: ["aria-valuenow"] },
    () => splitter.getAttribute("aria-valuenow") != beforeValueNow
  );
  info("New aria-valuenow value: " + splitter.getAttribute("aria-valuenow"));

  let afterWidth = leftPanel.getBoundingClientRect().width;
  Assert.greater(
    beforeWidth,
    afterWidth,
    "The left panel shrank when the splitter was moved"
  );
  Assert.equal(
    parseInt(splitter.ariaValueNow),
    Math.floor(afterWidth),
    "The aria-valuenow attribute reflects the new width of the left panel"
  );
  Assert.ok(
    splitter.ariaValueMin,
    "The splitter has the aria-valuemin attribute"
  );
  Assert.ok(
    splitter.ariaValueMax,
    "The splitter has the aria-valuemax attribute"
  );

  await BrowserTestUtils.switchTab(gBrowser, tab3);
  const splitView2 = gBrowser.addTabSplitView([tab3, tab4], {
    insertBefore: tab3,
  });
  let controlledPanelId = splitter.getAttribute("aria-controls");
  Assert.equal(
    controlledPanelId,
    gBrowser.getPanel(tab3.linkedBrowser).id,
    "The splitter's aria-controls attribute points to the new left panel"
  );

  splitView2.close();
  await BrowserTestUtils.waitForMutationCondition(
    splitter,
    { attributes: true, attributeFilter: ["aria-controls"] },
    () => splitter.getAttribute("aria-controls") != controlledPanelId
  );
  // The initial split view should remain and the splitter now controls it
  Assert.equal(
    splitter.getAttribute("aria-controls"),
    leftPanel.id,
    "The splitter's aria-controls attribute points to the left panel"
  );

  splitView.close();
  Assert.ok(!splitter.ariaValueMin, "The aria-valuemin attribute was removed");
  Assert.ok(!splitter.ariaValueMax, "aria-valuemax attribute was removed");
  Assert.ok(!splitter.ariaValueNow, "aria-valuenow attribute was removed");
});
