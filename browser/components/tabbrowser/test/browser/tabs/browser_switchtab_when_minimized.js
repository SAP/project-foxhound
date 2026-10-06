/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function minimize(window) {
  const minimized = BrowserTestUtils.waitForEvent(
    window,
    "sizemodechange",
    false,
    () => window.windowState === window.STATE_MINIMIZED
  );

  window.minimize();
  return minimized;
}

async function doTest() {
  const win = await BrowserTestUtils.openNewBrowserWindow();

  const tab1 = win.gBrowser.selectedTab;
  const tab2 = await BrowserTestUtils.addTab(win.gBrowser);

  await minimize(win);
  is(win.windowState, win.STATE_MINIMIZED, "Window is minimized");

  is(win.gBrowser.selectedTab, tab1, "Initial tab is selected");
  await BrowserTestUtils.switchTab(win.gBrowser, tab2);
  is(win.gBrowser.selectedTab, tab2, "Tab was switched while hidden");

  await BrowserTestUtils.closeWindow(win);
}

add_task(async function tab_switch_while_minimized_TabSwitchDone() {
  await SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  });
  await doTest();
  await SpecialPowers.popPrefEnv();
});

add_task(async function tab_switch_while_minimized_TabSwitched() {
  await doTest();
});
