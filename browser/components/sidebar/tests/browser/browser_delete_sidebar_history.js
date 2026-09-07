/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let URLs, dates, today, component, contentWindow;

add_setup(async () => {
  const historyInfo = await populateHistory();
  URLs = historyInfo.URLs;
  dates = historyInfo.dates;
  today = dates[0];

  const sidebarInfo = await showHistorySidebar();
  component = sidebarInfo.component;
  contentWindow = sidebarInfo.contentWindow;
});

registerCleanupFunction(() => {
  SidebarController.hide();
  cleanUpExtraTabs();
});

add_task(async function test_history_deletion_with_delete_or_backspace_key() {
  const tabList = component.lists[0];

  // Wait for history rows to be fully rendered before interacting with them.
  await BrowserTestUtils.waitForMutationCondition(
    tabList.shadowRoot,
    { childList: true, subtree: true },
    () => tabList.rowEls.length === URLs.length
  );
  Assert.equal(tabList.rowEls.length, URLs.length, "History rows are shown.");

  info("Focus the first row and delete it with the Delete key.");
  const deleteHistoryRowPromise = BrowserTestUtils.waitForMutationCondition(
    tabList.shadowRoot,
    { childList: true, subtree: true },
    () => tabList.rowEls.length === URLs.length - 1
  );
  tabList.rowEls[0].focus();
  EventUtils.synthesizeKey("KEY_Delete", {}, contentWindow);
  await deleteHistoryRowPromise;
  Assert.equal(
    tabList.rowEls.length,
    URLs.length - 1,
    "Delete key deletes one history row."
  );

  info("Focus the first row and delete it with the Backspace key.");
  const backspaceHistoryRowPromise = BrowserTestUtils.waitForMutationCondition(
    tabList.shadowRoot,
    { childList: true, subtree: true },
    () => tabList.rowEls.length === URLs.length - 2
  );
  tabList.rowEls[0].focus();
  EventUtils.synthesizeKey("KEY_Backspace", {}, contentWindow);
  await backspaceHistoryRowPromise;
  Assert.equal(
    tabList.rowEls.length,
    URLs.length - 2,
    "Backspace key deletes one history row."
  );
});
