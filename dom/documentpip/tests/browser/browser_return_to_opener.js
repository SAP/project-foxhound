/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_click_return_to_opener_button() {
  // Open PiP and switch to another tab in the same window
  // Request a small window to avoid timeouts from the other window not getting visible.
  const [tab, chromePiP] = await newTabWithPiP({ width: 100, height: 100 });
  const win = tab.ownerGlobal;
  const tab2 = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });
  is(gBrowser.selectedTab, tab2, "Sanity: other tab is selected");

  // Focus a different window
  const otherWin = await BrowserTestUtils.openNewBrowserWindow();
  otherWin.focus();
  await BrowserTestUtils.waitForCondition(
    () => Services.focus.activeWindow === otherWin,
    "Wait for other window to be focused"
  );

  // Find return to opener button
  const returnBtn = chromePiP.document.querySelector(
    "#document-pip-return-to-opener-button"
  );
  ok(returnBtn.checkVisibility(), "Return to opener button is visible");

  const closedPromise = BrowserTestUtils.windowClosed(chromePiP);
  returnBtn.click();

  // PiP should be closed, tab switched, window focused
  await closedPromise;
  await BrowserTestUtils.waitForCondition(
    () => gBrowser.selectedTab === tab && Services.focus.activeWindow === win,
    "Waiting for opener to be switched to and focused"
  );
  ok(chromePiP.closed, "Return button closed PiP");
  is(gBrowser.selectedTab, tab, "Opener tab is selected");
  is(Services.focus.activeWindow, win, "Opener window is focused");

  // Cleanup.
  await BrowserTestUtils.closeWindow(otherWin);
  BrowserTestUtils.removeTab(tab2);
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_disable_return_to_opener_button() {
  const [tab, chromePiP] = await newTabWithPiP({
    disallowReturnToOpener: true,
  });

  ok(
    chromePiP.document.documentElement.hasAttribute("disallowReturnToOpener"),
    "Chrome PiP window root should have the disallow attribute"
  );

  const returnBtn = chromePiP.document.querySelector(
    "#document-pip-return-to-opener-button"
  );
  ok(!returnBtn.checkVisibility(), "Expect return button to be hidden");

  // Cleanup.
  await BrowserTestUtils.closeWindow(chromePiP);
  BrowserTestUtils.removeTab(tab);
});
