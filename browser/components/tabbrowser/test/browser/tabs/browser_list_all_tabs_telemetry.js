/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

async function resetTelemetry() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
}

add_setup(async () => {
  await resetTelemetry();
});

registerCleanupFunction(async () => {
  await resetTelemetry();
});

add_task(async function test_list_all_tabs_telemetry_close_duplicate_tabs() {
  // Prevent a confirmation message from showing up during the test because
  // this test doesn't need to exercise that functionality.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.haveShownCloseAllDuplicateTabsWarning", true]],
  });

  // Create 2 tabs with the same URL so that there are duplicate tabs present.
  await Promise.all([addTab(), addTab()]);

  window.gTabsPanel.init();

  Assert.equal(
    Glean.browserUiInteraction.listAllTabsAction.close_all_duplicates.testGetValue(),
    undefined,
    "interaction count for close duplicate tabs starts unset"
  );

  const button = window.document.getElementById("alltabs-button");

  const allTabsView = window.document.getElementById("allTabsMenu-allTabsView");
  const allTabsPopupShownPromise = BrowserTestUtils.waitForEvent(
    allTabsView,
    "ViewShown"
  );
  button.click();
  await allTabsPopupShownPromise;

  const closeDuplicateTabsButton = window.document.getElementById(
    "allTabsMenu-closeDuplicateTabs"
  );
  closeDuplicateTabsButton.click();

  await BrowserTestUtils.waitForCondition(() => {
    return (
      Glean.browserUiInteraction.listAllTabsAction.close_all_duplicates.testGetValue() ==
      1
    );
  }, "Wait for metric to increment");
  Assert.equal(
    Glean.browserUiInteraction.listAllTabsAction.close_all_duplicates.testGetValue(),
    1,
    "interaction count for close duplicate tabs should be 1 after clicking on the menu item"
  );

  BrowserTestUtils.removeTab(gBrowser.tabs[1]);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_list_all_tabs_telemetry_search_tabs() {
  window.gTabsPanel.init();

  Assert.equal(
    Glean.browserUiInteraction.listAllTabsAction.search_tabs.testGetValue(),
    undefined,
    "interaction count for search tabs starts unset"
  );

  const button = window.document.getElementById("alltabs-button");

  const allTabsView = window.document.getElementById("allTabsMenu-allTabsView");
  const allTabsPopupShownPromise = BrowserTestUtils.waitForEvent(
    allTabsView,
    "ViewShown"
  );
  button.click();
  await allTabsPopupShownPromise;

  const searchTabsButton = window.document.getElementById(
    "allTabsMenu-searchTabs"
  );
  searchTabsButton.click();

  await BrowserTestUtils.waitForCondition(() => {
    return (
      Glean.browserUiInteraction.listAllTabsAction.search_tabs.testGetValue() ==
      1
    );
  }, "Wait for metric to increment");
  Assert.equal(
    Glean.browserUiInteraction.listAllTabsAction.search_tabs.testGetValue(),
    1,
    "interaction count for search tabs should be 1 after clicking on the menu item"
  );
});
