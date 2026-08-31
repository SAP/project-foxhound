/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.splitView.enabled", true]],
  });
});

add_task(async function () {
  const tab1 = await addTab();
  const tab2 = await addTab();
  ok(!tab1.selected, "Tab 1 is initially not selected");
  ok(!tab2.selected, "Tab 2 is initially not selected");
  gBrowser.addTabSplitView([tab1, tab2]);

  ok(!tab1.selected, "Tab 1 is still not selected");
  ok(!tab2.selected, "Tab 2 is still not selected");

  let delayedStartupPromise = BrowserTestUtils.waitForNewWindow();
  let win = gBrowser.replaceTabsWithWindow(tab1);
  await delayedStartupPromise;

  ok(
    win.gBrowser.tabs[0].splitview,
    "Splitview has been moved to a new window"
  );

  // It does not really matter which tab, as long as any tab is now selected
  // after adoption.
  ok(win.gBrowser.tabs[1].selected, "Tab 2 is now selected after adoption");

  let delayedStartupPromise2 = BrowserTestUtils.waitForNewWindow();
  let win2 = win.gBrowser.replaceTabsWithWindow(win.gBrowser.tabs[0]);
  await delayedStartupPromise2;

  ok(win2.gBrowser.tabs[1].selected, "Tab 2 still selected after adoption");

  win2.gBrowser.selectedTab = win2.gBrowser.tabs[0];
  ok(win2.gBrowser.tabs[0].selected, "Tab 1 is now selected (manually)");

  let delayedStartupPromise3 = BrowserTestUtils.waitForNewWindow();
  let win3 = win2.gBrowser.replaceTabsWithWindow(win2.gBrowser.tabs[0]);
  await delayedStartupPromise3;
  ok(win3.gBrowser.tabs[0].selected, "Tab 1 still selected after adoption");

  await BrowserTestUtils.closeWindow(win3);
});
