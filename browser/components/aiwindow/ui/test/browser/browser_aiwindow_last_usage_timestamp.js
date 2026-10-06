/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PREF_LAST_USAGE_TIME = "browser.smartwindow.lastSmartWindowUsageTime";

// Toggling AI window flips BROWSER_NEW_TAB_URL, which can leave a preloaded
// about:newtab browser dangling until shutdown if preload kicks in afterward.
registerCleanupFunction(() => {
  NewTabPagePreloading.removePreloadedBrowser(window);
  Services.prefs.clearUserPref(PREF_LAST_USAGE_TIME);
});

async function withSmartWindowPrefs(fn) {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", true],
    ],
  });
  const restoreSignIn = skipSignIn();
  try {
    await fn();
  } finally {
    restoreSignIn();
    await SpecialPowers.popPrefEnv();
  }
}

// Switching a Smart Window back to classic records the current time (seconds).
add_task(async function test_switch_to_classic_records_usage() {
  await withSmartWindowPrefs(async () => {
    Services.prefs.clearUserPref(PREF_LAST_USAGE_TIME);

    const win = await openAIWindow();
    Assert.ok(AIWindow.isAIWindowActive(win), "Window should start in AI mode");

    const before = Math.floor(Date.now() / 1000);
    AIWindow.toggleAIWindow(win, false);

    Assert.ok(
      !AIWindow.isAIWindowActive(win),
      "Window should be in classic mode"
    );

    const stored = Services.prefs.getIntPref(PREF_LAST_USAGE_TIME, 0);
    const after = Math.floor(Date.now() / 1000);
    Assert.ok(
      stored >= before && stored <= after,
      `Stored timestamp (${stored}) should be around now (${before}-${after})`
    );

    await BrowserTestUtils.closeWindow(win);
  });
});

// Usage is recorded on any Smart Window exit, even while another Smart Window
// remains open.
add_task(async function test_switch_records_even_with_other_ai_window() {
  await withSmartWindowPrefs(async () => {
    Services.prefs.clearUserPref(PREF_LAST_USAGE_TIME);

    const win1 = await openAIWindow();
    const win2 = await openAIWindow();

    // Switch the first AI window to classic; the second is still open.
    AIWindow.toggleAIWindow(win1, false);
    Assert.ok(
      Services.prefs.prefHasUserValue(PREF_LAST_USAGE_TIME),
      "Usage should be recorded even while another AI window is open"
    );
    Assert.ok(
      AIWindow.hasActiveAIWindows(),
      "A Smart Window is still active while win2 remains"
    );

    await BrowserTestUtils.closeWindow(win1);
    await BrowserTestUtils.closeWindow(win2);
  });
});

// Closing a Smart Window (rather than switching it) records usage too.
add_task(async function test_close_smart_window_records_usage() {
  await withSmartWindowPrefs(async () => {
    Services.prefs.clearUserPref(PREF_LAST_USAGE_TIME);

    const win = await openAIWindow();
    Assert.ok(AIWindow.isAIWindowActive(win), "Window should be in AI mode");

    const before = Math.floor(Date.now() / 1000);
    await BrowserTestUtils.closeWindow(win);

    const stored = Services.prefs.getIntPref(PREF_LAST_USAGE_TIME, 0);
    const after = Math.floor(Date.now() / 1000);
    Assert.ok(
      stored >= before && stored <= after,
      `Stored timestamp (${stored}) should be around now (${before}-${after})`
    );
  });
});
