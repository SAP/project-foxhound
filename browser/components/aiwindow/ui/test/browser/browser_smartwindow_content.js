/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_smartwindow_browser_content_attribute() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.firstrun.hasCompleted", true]],
  });

  const win = await openAIWindow();

  await BrowserTestUtils.waitForMutationCondition(
    win.gBrowser.selectedBrowser,
    { attributes: true, attributeFilter: ["smartwindow-content"] },
    () => win.gBrowser.selectedBrowser.hasAttribute("smartwindow-content")
  );

  // Open new tab - regular page
  const newTab = await BrowserTestUtils.openNewForegroundTab(
    win.gBrowser,
    "https://example.com/"
  );

  Assert.ok(
    !win.gBrowser.selectedBrowser.hasAttribute("smartwindow-content"),
    "Regular browser shouldn't have the smartwindow-content attribute"
  );

  BrowserTestUtils.removeTab(newTab);
  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
});
