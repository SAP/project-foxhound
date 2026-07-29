/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

registerCleanupFunction(() => {
  Services.prefs.clearUserPref("browser.tabs.splitview.hasUsed");
});

async function waitForSplitterMoved(splitter) {
  const valueBefore = splitter.getAttribute("aria-valuenow");
  await BrowserTestUtils.waitForMutationCondition(
    splitter,
    { attributes: true, attributeFilter: ["aria-valuenow"] },
    () => splitter.getAttribute("aria-valuenow") != valueBefore
  );
}

async function dragSplitter(deltaX, splitter) {
  const movedPromise = waitForSplitterMoved(splitter);
  AccessibilityUtils.setEnv({ mustHaveAccessibleRule: false });
  EventUtils.synthesizeMouseAtCenter(splitter, { type: "mousedown" });
  EventUtils.synthesizeMouse(splitter, deltaX, 0, { type: "mousemove" });
  EventUtils.synthesizeMouse(splitter, 0, 0, { type: "mouseup" });
  AccessibilityUtils.resetEnv();
  await movedPromise;
}

add_task(async function test_resize_split_view_panels() {
  const tab1 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  const tab2 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  const originalTab = gBrowser.selectedTab;
  await BrowserTestUtils.switchTab(gBrowser, tab1);

  info("Activate split view.");
  const splitView = gBrowser.addTabSplitView([tab1, tab2]);
  const { tabpanels } = gBrowser;
  await BrowserTestUtils.waitForMutationCondition(
    tabpanels,
    { childList: true },
    () => tabpanels.querySelector(".split-view-splitter")
  );
  await BrowserTestUtils.waitForMutationCondition(
    tabpanels.splitViewSplitter,
    { attributes: true },
    () => BrowserTestUtils.isVisible(tabpanels.splitViewSplitter)
  );

  info("Resize split view panels.");
  const leftPanel = document.getElementById(tab1.linkedPanel);
  const rightPanel = document.getElementById(tab2.linkedPanel);
  const originalLeftWidth = leftPanel.getBoundingClientRect().width;
  const originalRightWidth = rightPanel.getBoundingClientRect().width;
  await dragSplitter(-100, tabpanels.splitViewSplitter);
  Assert.less(
    leftPanel.getBoundingClientRect().width,
    originalLeftWidth,
    "Left panel is smaller."
  );
  Assert.greater(
    rightPanel.getBoundingClientRect().width,
    originalRightWidth,
    "Right panel is larger."
  );

  info("Ensure that custom width persists after switching tabs.");
  await BrowserTestUtils.switchTab(gBrowser, originalTab);
  await BrowserTestUtils.switchTab(gBrowser, tab1);
  Assert.less(
    leftPanel.getBoundingClientRect().width,
    originalLeftWidth,
    "Left panel is smaller."
  );
  Assert.greater(
    rightPanel.getBoundingClientRect().width,
    originalRightWidth,
    "Right panel is larger."
  );

  info("Reverse split view panels and resize.");
  splitView.reverseTabs();
  await dragSplitter(-100, tabpanels.splitViewSplitter);
  await BrowserTestUtils.waitForMutationCondition(
    leftPanel,
    { attributeFilter: ["width"] },
    () => !leftPanel.hasAttribute("width")
  );

  info("Separate split view panels to remove the custom width.");
  splitView.unsplitTabs();
  for (const panel of [leftPanel, rightPanel]) {
    await BrowserTestUtils.waitForMutationCondition(
      panel,
      { attributeFilter: ["width"] },
      () => !panel.hasAttribute("width")
    );
  }

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});

add_task(async function test_resize_split_view_panels_exceeds_max_width() {
  const tab1 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  const tab2 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  await BrowserTestUtils.switchTab(gBrowser, tab1);

  info("Activate split view.");
  const splitView = gBrowser.addTabSplitView([tab1, tab2]);
  const splitter = gBrowser.tabpanels.splitViewSplitter;

  const leftPanel = document.getElementById(tab1.linkedPanel);
  await dragSplitter(9000, splitter);
  Assert.lessOrEqual(
    Number(leftPanel.getAttribute("width")),
    Number(splitter.getAttribute("aria-valuemax")),
    "Stored width should not exceed max width after resizing."
  );

  splitView.close();
  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});

add_task(async function test_resize_non_contiguous_tabs() {
  const tab1 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  const tab2 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  const tab3 = BrowserTestUtils.addTab(gBrowser, "about:blank");
  const tab4 = BrowserTestUtils.addTab(gBrowser, "about:blank");

  const panel1 = document.getElementById(tab1.linkedPanel);
  const panel2 = document.getElementById(tab2.linkedPanel);
  const panel3 = document.getElementById(tab3.linkedPanel);
  const panel4 = document.getElementById(tab4.linkedPanel);
  const { tabpanels } = gBrowser;

  await BrowserTestUtils.switchTab(gBrowser, tab1);

  info("Create first split view from tab1 + tab3.");
  const splitView1 = gBrowser.addTabSplitView([tab1, tab3]);
  await BrowserTestUtils.waitForMutationCondition(
    tabpanels,
    { childList: true },
    () => tabpanels.querySelector(".split-view-splitter")
  );
  const splitter = tabpanels.splitViewSplitter;
  await BrowserTestUtils.waitForMutationCondition(
    splitter,
    { attributes: true },
    () => BrowserTestUtils.isVisible(splitter)
  );

  info("Create second split view from tab2 + tab4.");
  await BrowserTestUtils.switchTab(gBrowser, tab2);
  const splitView2 = gBrowser.addTabSplitView([tab2, tab4]);
  let originalPanel2Width = panel2.getBoundingClientRect().width;
  let originalPanel4Width = panel4.getBoundingClientRect().width;

  info("Drag the splitter in the second split view.");
  await dragSplitter(-100, splitter);

  Assert.less(
    panel2.getBoundingClientRect().width,
    originalPanel2Width,
    "Active split view's left panel is smaller after dragging."
  );
  Assert.greater(
    panel4.getBoundingClientRect().width,
    originalPanel4Width,
    "Active split view's right panel is larger after dragging."
  );
  Assert.ok(
    !panel1.hasAttribute("width"),
    "Inactive split view's left panel was not resized."
  );
  Assert.ok(
    !panel3.hasAttribute("width"),
    "Inactive split view's right panel was not resized."
  );

  info("Switch back to the first split view.");
  const splitterValue = splitter.getAttribute("aria-valuenow");
  await BrowserTestUtils.switchTab(gBrowser, tab1);
  await BrowserTestUtils.waitForMutationCondition(
    splitter,
    { attributes: true },
    () => splitterValue != splitter.getAttribute("aria-valuenow")
  );

  let originalPanel1Width = panel1.getBoundingClientRect().width;
  originalPanel2Width = panel2.getAttribute("width");
  let originalPanel3Width = panel3.getBoundingClientRect().width;

  info("Drag the splitter in the first split view.");
  await dragSplitter(-100, splitter);

  Assert.less(
    panel1.getBoundingClientRect().width,
    originalPanel1Width,
    "Active split view's left panel is smaller after dragging."
  );
  Assert.greater(
    panel3.getBoundingClientRect().width,
    originalPanel3Width,
    "Active split view's right panel is larger after dragging."
  );
  Assert.equal(
    panel2.getAttribute("width"),
    originalPanel2Width,
    "Inactive split view's left panel was not resized."
  );
  Assert.ok(
    !panel4.hasAttribute("width"),
    "Inactive split view's right panel was not resized."
  );

  splitView1.close();
  splitView2.close();
  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
  BrowserTestUtils.removeTab(tab3);
  BrowserTestUtils.removeTab(tab4);
});
