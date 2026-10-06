/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

/**
 * Test that the print preview dialog is properly cleaned up when a tab is unloaded.
 * bug 1982444
 */
add_task(async function test_print_preview_cleanup_on_browser_discard() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    PrintHelper.defaultTestPageUrl
  );

  let browser = tab.linkedBrowser;
  let helper = new PrintHelper(browser);
  PrintUtils.startPrintWindow(browser.browsingContext);

  // Wait for the dialog to be fully ready. The initial preview will be
  // done at this point.
  await helper.waitForDialog();

  // Verify print preview is active
  let tabDialogBox = gBrowser.getTabDialogBox(browser);
  Assert.greater(
    tabDialogBox._tabDialogManager._dialogs.length,
    0,
    "Should have open dialogs"
  );

  // Create another tab and switch to it so we can discard the first one
  const otherTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    PrintHelper.defaultTestPageUrl
  );

  // Force discard the tab with print preview
  await gBrowser.explicitUnloadTabs([tab]);

  await BrowserTestUtils.switchTab(gBrowser, tab);

  // Verify print preview is cleaned up
  tabDialogBox = gBrowser.getTabDialogBox(browser);
  is(
    tabDialogBox._tabDialogManager._dialogs.length,
    0,
    "Should have no open dialogs"
  );

  // Clean up
  BrowserTestUtils.removeTab(tab);
  BrowserTestUtils.removeTab(otherTab);
});
