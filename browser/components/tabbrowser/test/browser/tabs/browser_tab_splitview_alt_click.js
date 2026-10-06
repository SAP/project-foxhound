/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

registerCleanupFunction(async function () {
  Services.prefs.clearUserPref("browser.tabs.splitview.hasUsed");
});

async function addTabAndLoadBrowser() {
  const tab = BrowserTestUtils.addTab(gBrowser, "https://example.com");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  return tab;
}

add_task(async function test_alt_click_creates_split_view() {
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  const tabContainer = document.getElementById("tabbrowser-arrowscrollbox");

  EventUtils.synthesizeMouseAtCenter(tab1, {});
  Assert.ok(tab1.selected, "tab1 is selected");

  let splitViewCreated = BrowserTestUtils.waitForEvent(
    gBrowser.tabContainer,
    "SplitViewCreated"
  );
  EventUtils.synthesizeMouseAtCenter(tab2, { altKey: true });
  await splitViewCreated;

  await BrowserTestUtils.waitForMutationCondition(
    tabContainer,
    { childList: true },
    () => tab1.splitview && tab2.splitview,
    "Both tabs are in a split view"
  );

  Assert.ok(tab1.splitview, "tab1 is in a split view");
  Assert.ok(tab2.splitview, "tab2 is in a split view");
  Assert.equal(
    tab1.splitview,
    tab2.splitview,
    "tabs are in the same split view"
  );
  Assert.equal(
    tab1.splitview.tabs[0],
    tab1,
    "tab1 (the originally selected tab) is first in the split view"
  );
  Assert.equal(
    tab1.splitview.tabs[1],
    tab2,
    "tab2 is second in the split view"
  );

  tab1.splitview.close();
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }
});

add_task(async function test_alt_click_on_selected_tab_does_nothing() {
  const tab1 = await addTabAndLoadBrowser();
  const tabContainer = document.getElementById("tabbrowser-arrowscrollbox");

  EventUtils.synthesizeMouseAtCenter(tab1, {});
  Assert.ok(tab1.selected, "tab1 is selected");

  EventUtils.synthesizeMouseAtCenter(tab1, { altKey: true });

  Assert.ok(
    !tab1.splitview,
    "Alt+clicking the selected tab does not create a split view"
  );
  Assert.ok(
    !Array.from(tabContainer.children).some(
      child => child.tagName === "tab-split-view-wrapper"
    ),
    "No split view wrapper in tab container"
  );

  BrowserTestUtils.removeTab(tab1);
});

add_task(async function test_alt_click_on_tab_in_split_view_does_nothing() {
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  const tab3 = await addTabAndLoadBrowser();

  let splitViewCreated = BrowserTestUtils.waitForEvent(
    gBrowser.tabContainer,
    "SplitViewCreated"
  );
  gBrowser.addTabSplitView([tab2, tab3]);
  await splitViewCreated;

  Assert.ok(tab2.splitview, "tab2 is in a split view");
  Assert.ok(tab3.splitview, "tab3 is in a split view");

  EventUtils.synthesizeMouseAtCenter(tab1, {});
  Assert.ok(tab1.selected, "tab1 is selected");

  EventUtils.synthesizeMouseAtCenter(tab2, { altKey: true });

  Assert.ok(
    !tab1.splitview,
    "Alt+clicking a tab already in a split view does not create a new split view for tab1"
  );

  tab2.splitview.close();
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }
});

add_task(async function test_alt_click_on_pinned_tab_does_nothing() {
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();

  gBrowser.pinTab(tab2);
  Assert.ok(tab2.pinned, "tab2 is pinned");

  EventUtils.synthesizeMouseAtCenter(tab1, {});
  Assert.ok(tab1.selected, "tab1 is selected");

  EventUtils.synthesizeMouseAtCenter(tab2, { altKey: true });

  Assert.ok(
    !tab1.splitview,
    "Alt+clicking a pinned tab does not create a split view"
  );
  Assert.ok(!tab2.splitview, "Pinned tab is not in a split view");

  gBrowser.unpinTab(tab2);
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }
});

add_task(async function test_alt_click_when_pref_disabled_does_nothing() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.splitView.enabled", false]],
  });

  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();

  EventUtils.synthesizeMouseAtCenter(tab1, {});
  Assert.ok(tab1.selected, "tab1 is selected");

  EventUtils.synthesizeMouseAtCenter(tab2, { altKey: true });

  Assert.ok(
    !tab1.splitview,
    "Alt+click with pref disabled does not create a split view"
  );
  Assert.ok(!tab2.splitview, "tab2 is not in a split view");

  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_alt_click_when_pref_disabled_selects_tab() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.splitView.enabled", false]],
  });

  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();

  EventUtils.synthesizeMouseAtCenter(tab1, {});
  Assert.ok(tab1.selected, "tab1 is selected");

  EventUtils.synthesizeMouseAtCenter(tab2, { altKey: true });

  Assert.ok(tab2.selected, "Alt+clicking tab2 with pref disabled selects tab2");

  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs.at(-1));
  }

  await SpecialPowers.popPrefEnv();
});
