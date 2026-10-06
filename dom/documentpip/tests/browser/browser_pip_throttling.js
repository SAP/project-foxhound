/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

async function getVisibility(tab) {
  return SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    () => content.document.visibilityState
  );
}

async function isThrottled(tab) {
  return SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    () => SpecialPowers.DOMWindowUtils.effectivelyThrottlesFrameRequests
  );
}

// Wait for the tab to be active / inactive
async function ensureActivity(tab, activity = true) {
  await TestUtils.waitForCondition(
    () => tab.linkedBrowser.browsingContext.isActive == activity,
    `Waiting for tab isActive = ${activity}`
  );
}

add_task(async function test_pip_opener_not_throttled() {
  const [tab, chromePiP] = await newTabWithPiP();

  // Baseline: Active tab with PiP
  ok(tab.linkedBrowser.browsingContext.isActive, "Foreground opener is active");
  ok(!(await isThrottled(tab)), "Foreground opener not throttled");

  // Background tab with PiP, i.e. switch away from opener
  info("Move opener to background by switching tabs");
  const tab2 = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });
  ok(tab.linkedBrowser.browsingContext.isActive, "Background opener is active");
  ok(!(await isThrottled(tab)), "Background opener not throttled");
  is(await getVisibility(tab), "visible", "Background opener is visible");

  // Verify switching back keeps opener visible, active etc.
  info("Switch back to opener to ensure nothing breaks");
  await BrowserTestUtils.switchTab(gBrowser, tab);
  ok(
    tab.linkedBrowser.browsingContext.isActive,
    "Foreground opener stays active"
  );
  ok(!(await isThrottled(tab)), "Foreground opener stays unthrottled");
  is(await getVisibility(tab), "visible", "Foreground opener stays visible");

  // Move opener to background again and close PiP
  info("Move back to other tab, close PiP, ensure throttling");
  await BrowserTestUtils.switchTab(gBrowser, tab2);
  ok(tab.linkedBrowser.browsingContext.isActive, "Background opener is active");
  await BrowserTestUtils.closeWindow(chromePiP);
  await ensureActivity(tab, false);
  ok(!tab.linkedBrowser.browsingContext.isActive, "Background tab is inactive");
  ok(await isThrottled(tab), "Background tab throttled");
  is(await getVisibility(tab), "hidden", "Background tab is hidden");

  // Verify switching back makes tab visible, active etc.
  info("Move back to opener tab, ensure it becomes active");
  await BrowserTestUtils.switchTab(gBrowser, tab);
  await ensureActivity(tab);
  ok(tab.linkedBrowser.browsingContext.isActive, "Tab becomes active again");
  ok(!(await isThrottled(tab)), "Tab stopes being throttled");
  is(await getVisibility(tab), "visible", "Tab becomes visible");

  // Cleanup
  BrowserTestUtils.removeTab(tab);
  BrowserTestUtils.removeTab(tab2);
});

// Minimize / Restore app window
async function setMinimized(window, minimized = true) {
  const promiseSizeModeChange = BrowserTestUtils.waitForEvent(
    window,
    "sizemodechange"
  );
  if (minimized) {
    window.minimize();
  } else {
    window.restore();
  }
  await promiseSizeModeChange;
}

add_task(async function test_pip_throttling_window_hidden() {
  const [tab, chromePiP] = await newTabWithPiP();

  // Hide app window
  await setMinimized(tab.documentGlobal);
  ok(tab.linkedBrowser.browsingContext.isActive, "Hidden opener is active");
  ok(!(await isThrottled(tab)), "Hidden opener not throttled");
  is(await getVisibility(tab), "visible", "Hidden opener is visible");

  // Restore visibility
  await setMinimized(tab.documentGlobal, false);
  ok(tab.linkedBrowser.browsingContext.isActive, "Visible opener is active");
  ok(!(await isThrottled(tab)), "Visible opener not throttled");
  is(await getVisibility(tab), "visible", "Visible opener is visible");

  // Hide and close PiP
  await setMinimized(tab.documentGlobal);
  ok(tab.linkedBrowser.browsingContext.isActive, "Hidden opener is active");
  await BrowserTestUtils.closeWindow(chromePiP);
  await ensureActivity(tab, false);
  ok(!tab.linkedBrowser.browsingContext.isActive, "Hidden tab is inactive");
  ok(await isThrottled(tab), "Hidden tab throttled");
  is(await getVisibility(tab), "hidden", "Hidden tab is hidden");

  // Restore visibility
  await setMinimized(tab.documentGlobal, false);
  // Tab isn't immediately unthrottled after window is restored
  await TestUtils.waitForCondition(
    async () => !(await isThrottled(tab)),
    "Wait for tab not throttled"
  );
  ok(tab.linkedBrowser.browsingContext.isActive, "Visible tab is active");
  ok(!(await isThrottled(tab)), "Visible tab not throttled");
  is(await getVisibility(tab), "visible", "Visible tab is visible");

  // Cleanup
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_pip_throttling_opener_tab_adoption() {
  // Open a PiP and adopt the opener into a new window
  // Request a small window to avoid timeouts from the other window not getting visible.
  const [originalTab, chromePiP] = await newTabWithPiP({
    width: 100,
    height: 100,
  });
  const tab2win1 = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });
  const win2 = await BrowserTestUtils.openNewBrowserWindow();
  const adoptedTab = win2.gBrowser.adoptTab(originalTab, 0, true);

  // Minimize old window to ensure it's being throttled as the PiP was adopted away
  await setMinimized(tab2win1.documentGlobal);
  ok(
    !tab2win1.linkedBrowser.browsingContext.isActive,
    "Hidden tab is inactive"
  );
  ok(await isThrottled(tab2win1), "Hidden tab throttled");
  is(await getVisibility(tab2win1), "hidden", "Hidden tab is hidden");

  // Adoping the opener currently closes the PiP (bug 2009192).
  // So we cannot test that the new window isn't throttled.

  // Cleanup
  await setMinimized(tab2win1.documentGlobal, false);
  if (chromePiP && !chromePiP.closed) {
    // See bug 2009192
    await BrowserTestUtils.closeWindow(chromePiP);
  }
  BrowserTestUtils.removeTab(adoptedTab);
  await BrowserTestUtils.closeWindow(win2);
  BrowserTestUtils.removeTab(tab2win1);
});
