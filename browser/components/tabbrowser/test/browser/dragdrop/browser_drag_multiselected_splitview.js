/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

add_setup(() => {
  // Disable tab animations
  gReduceMotionOverride = true;
});

add_task(async function test_drag_mulitselected_splitview_as_target() {
  let tab0 = gBrowser.selectedTab;
  let tab1 = await addTab();
  let tab2 = await addTab();
  let tab3 = await addTab();
  let splitview = gBrowser.addTabSplitView([tab2, tab3]);
  Assert.equal(splitview.tabs.length, 2, "Split view has 2 tabs");
  let tab4 = await addTab();
  let tab5 = await addTab();
  let tabs = [tab0, tab1, tab2, tab3, tab4, tab5];

  await BrowserTestUtils.switchTab(gBrowser, tab1);
  await triggerClickOn(tab3, { ctrlKey: true });
  await triggerClickOn(tab5, { ctrlKey: true });

  is(gBrowser.selectedTab, tab1, "Tab1 is active");
  is(gBrowser.selectedTabs.length, 3, "Three selected tabs");
  ok(splitview.multiselected, "Splitview is multiselected");

  for (let i of [1, 3, 5]) {
    ok(tabs[i].multiselected, "Tab" + i + " is multiselected");
  }
  for (let i of [0, 2, 4]) {
    ok(!tabs[i].multiselected, "Tab" + i + " is not multiselected");
  }
  for (let i of [0, 1, 2, 3, 4, 5]) {
    is(tabs[i]._tPos, i, "Tab" + i + " position is :" + i);
  }

  await customDragAndDrop(tab3, tab4);

  ok(splitview.hasActiveTab, "Splitview has the selected tab");
  is(
    gBrowser.selectedTab,
    tab3,
    "Dragged tab (tab3) in splitview is now active"
  );
  is(gBrowser.selectedTabs.length, 3, "Three selected tabs");
  is(gBrowser.selectedElements.length, 3, "Three selected elements");

  ok(splitview.multiselected, "Splitview is still multiselected");
  for (let i of [1, 3, 5]) {
    ok(tabs[i].multiselected, "Tab" + i + " is still multiselected");
  }
  for (let i of [0, 2, 4]) {
    ok(!tabs[i].multiselected, "Tab" + i + " is still not multiselected");
  }

  is(tab0._tPos, 0, "Tab0 position (0) doesn't change");

  // Multiselected tabs gets grouped at the start of the slide.
  is(
    tab1._tPos,
    tab2._tPos - 1,
    "Tab1 is located right at the left of the dragged splitview"
  );
  is(
    tab5._tPos,
    tab3._tPos + 1,
    "Tab5 is located right at the right of the dragged splitview"
  );
  is(tab3._tPos, 4, "Dragged tab (tab3) of splitview position is 4");
  is(tab2._tPos, 3, "Dragged tab (tab2) of splitview position is 3");

  is(tab4._tPos, 1, "Drag target (tab4) has shifted to position 1");

  for (let tab of tabs.filter(t => t != tab0)) {
    BrowserTestUtils.removeTab(tab);
  }
});

add_task(async function test_drag_mulitselected_splitview_as_selection() {
  let tab0 = gBrowser.selectedTab;
  let tab1 = await addTab();
  let tab2 = await addTab();
  let tab3 = await addTab();
  let splitview = gBrowser.addTabSplitView([tab2, tab3]);
  Assert.equal(splitview.tabs.length, 2, "Split view has 2 tabs");
  let tab4 = await addTab();
  let tab5 = await addTab();
  let tabs = [tab0, tab1, tab2, tab3, tab4, tab5];

  await BrowserTestUtils.switchTab(gBrowser, tab1);
  await triggerClickOn(tab3, { ctrlKey: true });
  await triggerClickOn(tab5, { ctrlKey: true });

  is(gBrowser.selectedTab, tab1, "Tab1 is active");
  is(gBrowser.selectedTabs.length, 3, "Three selected tabs");
  ok(splitview.multiselected, "Splitview is multiselected");

  for (let i of [1, 3, 5]) {
    ok(tabs[i].multiselected, "Tab" + i + " is multiselected");
  }
  for (let i of [0, 2, 4]) {
    ok(!tabs[i].multiselected, "Tab" + i + " is not multiselected");
  }
  for (let i of [0, 1, 2, 3, 4, 5]) {
    is(tabs[i]._tPos, i, "Tab" + i + " position is :" + i);
  }

  await customDragAndDrop(tab1, tab4);

  is(gBrowser.selectedTab, tab1, "Dragged tab (tab1) is now active");
  is(gBrowser.selectedTabs.length, 3, "Three selected tabs");
  is(gBrowser.selectedElements.length, 3, "Three selected elements");

  ok(splitview.multiselected, "Splitview is still multiselected");
  for (let i of [1, 3, 5]) {
    ok(tabs[i].multiselected, "Tab" + i + " is still multiselected");
  }
  for (let i of [0, 2, 4]) {
    ok(!tabs[i].multiselected, "Tab" + i + " is still not multiselected");
  }

  is(tab0._tPos, 0, "Tab0 position (0) doesn't change");

  // Multiselected tabs gets grouped at the start of the slide.
  is(
    tab1._tPos,
    tab2._tPos - 1,
    "Tab1 is located right at the left of the dragged splitview"
  );
  is(
    tab5._tPos,
    tab3._tPos + 1,
    "Tab5 is located right at the right of the dragged splitview"
  );
  is(tab3._tPos, 4, "Dragged tab (tab3) of splitview position is 4");
  is(tab2._tPos, 3, "Dragged tab (tab2) of splitview position is 3");

  is(tab4._tPos, 1, "Drag target (tab4) has shifted to position 1");

  for (let tab of tabs.filter(t => t != tab0)) {
    BrowserTestUtils.removeTab(tab);
  }
});

add_task(async function test_drag_multiple_split_views_after_last_tab() {
  // Setup: T0 (T1 | T2) (T3 | T4) T5
  let tab0 = gBrowser.selectedTab;
  let tab1 = await addTab();
  let tab2 = await addTab();
  let splitView1 = gBrowser.addTabSplitView([tab1, tab2]);

  let tab3 = await addTab();
  let tab4 = await addTab();
  let splitView2 = gBrowser.addTabSplitView([tab3, tab4]);

  let tab5 = await addTab();
  let tabs = [tab0, tab1, tab2, tab3, tab4, tab5];

  // Select and move both (T1 | T2) and (T3 | T4) after T5.
  info("Select both split views.");
  await BrowserTestUtils.switchTab(gBrowser, tab1);
  await triggerClickOn(tab3, { ctrlKey: true });
  Assert.ok(splitView1.multiselected, "First splitview is multiselected");
  Assert.ok(splitView2.multiselected, "Second splitview is multiselected");

  info("Drag both split views to the end of the tabstrip.");
  await customDragAndDrop(tab3, tab5);

  // Expected Result: T0 T5 (T1 | T2) (T3 | T4)
  Assert.deepEqual(
    gBrowser.tabs,
    [tab0, tab5, tab1, tab2, tab3, tab4],
    "Both split views moved to the end of the tabstrip."
  );

  for (let tab of tabs.filter(t => t != tab0)) {
    BrowserTestUtils.removeTab(tab);
  }
});
