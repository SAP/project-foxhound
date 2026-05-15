/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { TabStateFlusher } = ChromeUtils.importESModule(
  "resource:///modules/sessionstore/TabStateFlusher.sys.mjs"
);

// Move a tab to a new window, check the new window is also an AI window.
add_task(async function test() {
  let tab1 = await BrowserTestUtils.addTab(gBrowser, "about:blank");
  let tab2 = await BrowserTestUtils.addTab(gBrowser, "about:blank");

  is(gBrowser.multiSelectedTabsCount, 0, "Zero multiselected tabs");

  AIWindow.toggleAIWindow(window, true);
  registerCleanupFunction(() => {
    AIWindow.toggleAIWindow(window, false);
  });
  await BrowserTestUtils.switchTab(gBrowser, tab1);
  let prevBrowser = tab1.linkedBrowser;

  let delayedStartupPromise = BrowserTestUtils.waitForNewWindow();
  let newWindow = gBrowser.replaceTabsWithWindow(tab1);
  await delayedStartupPromise;

  ok(
    !prevBrowser.frameLoader,
    "the swapped-from browser's frameloader has been destroyed"
  );

  let gBrowser2 = newWindow.gBrowser;
  ok(AIWindow.isAIWindowActive(newWindow), "The new window is an AI window");

  is(gBrowser.visibleTabs.length, 2, "Two tabs now in the old window");
  is(gBrowser2.visibleTabs.length, 1, "One tab in the new window");

  tab1 = gBrowser2.visibleTabs[0];
  ok(tab1, "Got a tab1");
  await tab1.focus();

  await TabStateFlusher.flush(tab1.linkedBrowser);

  await BrowserTestUtils.closeWindow(newWindow);
  await BrowserTestUtils.removeTab(tab2);
});
