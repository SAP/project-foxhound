/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests for BrowserWindowTracker behavior around minimized windows. Covers:
 *  - Minimizing the top window promotes the next OS-activated window.
 *  - Restoring and focusing a minimized window promotes it.
 *  - getTopWindow() filters out windows currently in STATE_MINIMIZED, even
 *    if such a window is at the front of the internal tracking list. This
 *    is the scenario from bug 2007691 on macOS, where `activate` fires
 *    before the window state transitions out of STATE_MINIMIZED.
 *  - getTopWindow() still returns a minimized window when no non-minimized
 *    window matches the requested options, rather than returning null.
 *  - getOrderedWindows() returns minimized windows after non-minimized
 *    windows.
 */

"use strict";

async function openWindow() {
  return BrowserWindowTracker.promiseOpenWindow();
}

async function minimizeWindow(win) {
  const minimized = BrowserTestUtils.waitForEvent(win, "sizemodechange");
  win.minimize();
  await minimized;
  Assert.equal(
    win.windowState,
    win.STATE_MINIMIZED,
    "Window should be in STATE_MINIMIZED after minimize()"
  );
}

async function restoreWindow(win) {
  const restored = BrowserTestUtils.waitForEvent(win, "sizemodechange");
  win.restore();
  await restored;
  Assert.notEqual(
    win.windowState,
    win.STATE_MINIMIZED,
    "Window should not be in STATE_MINIMIZED after restore()"
  );
}

// Minimizing the top window causes the OS to activate the next window, which
// is then promoted to the front via the onActivate path.
add_task(
  async function test_minimizing_top_window_promotes_next_activated_window() {
    const win1 = await openWindow();
    const win2 = await openWindow();

    await minimizeWindow(win2);

    Assert.equal(
      BrowserWindowTracker.getTopWindow(),
      win1,
      "win1 should be the top window after win2 is minimized and the OS activates win1"
    );

    await BrowserTestUtils.closeWindow(win1);
    await BrowserTestUtils.closeWindow(win2);
  }
);

// Restoring a minimized window should promote it. This is the cross-platform
// black-box version of the bug 2007691 STR.
add_task(async function test_restore_promotes_window() {
  const win1 = await openWindow();
  const win2 = await openWindow();

  await SimpleTest.promiseFocus(win1);

  Assert.equal(
    BrowserWindowTracker.getTopWindow(),
    win1,
    "win1 should be the top window"
  );

  await minimizeWindow(win2);
  await restoreWindow(win2);

  Assert.equal(
    BrowserWindowTracker.getTopWindow(),
    win2,
    "win2 should be the top window after being restored"
  );

  await BrowserTestUtils.closeWindow(win1);
  await BrowserTestUtils.closeWindow(win2);
});

// Simulates the macOS-specific scenario from bug 2007691: activate fires on
// a window while it is still STATE_MINIMIZED. Even though that window is at
// the front of the internal tracked list, getTopWindow() should skip it
// while it remains minimized. Once the state transitions out of
// STATE_MINIMIZED, getTopWindow() should return it.
add_task(async function test_activate_while_minimized_is_filtered() {
  const win1 = await openWindow();
  const win2 = await openWindow();

  await SimpleTest.promiseFocus(win1);

  Assert.equal(
    BrowserWindowTracker.getTopWindow(),
    win1,
    "win1 should be the top window before the test"
  );

  await minimizeWindow(win2);

  Assert.equal(
    win2.windowState,
    win2.STATE_MINIMIZED,
    "win2 should be minimized before the synthetic activate"
  );

  // Dispatch a synthetic activate on the still-minimized win2. With the new
  // design, this unshifts win2 to the front of the tracked list.
  win2.dispatchEvent(new win2.Event("activate", { bubbles: false }));

  // getTopWindow() should still skip win2 because it is STATE_MINIMIZED,
  // returning win1 instead.
  Assert.equal(
    BrowserWindowTracker.getTopWindow(),
    win1,
    "win1 should still be returned by getTopWindow() while win2 remains minimized"
  );

  // Restore win2 so it is no longer in STATE_MINIMIZED.
  await restoreWindow(win2);

  // win2 is at the front of the tracked list (from the synthetic activate)
  // and is no longer minimized, so getTopWindow() should return it.
  Assert.equal(
    BrowserWindowTracker.getTopWindow(),
    win2,
    "win2 should be the top window once it is no longer minimized"
  );

  await BrowserTestUtils.closeWindow(win1);
  await BrowserTestUtils.closeWindow(win2);
});

// getOrderedWindows() should sort minimized windows to the back, regardless
// of the relative activation order of the non-minimized windows.
add_task(async function test_orderedWindows_sorts_minimized_to_back() {
  const win1 = await openWindow();
  const win2 = await openWindow();
  const win3 = await openWindow();

  // Dispatch synthetic activate events so the windows are known to the
  // tracker. We don't assert on their relative order: it is platform
  // dependent (e.g. on Windows the OS may interleave additional activate
  // events around minimize), and the invariant under test is only that
  // the minimized window ends up behind the non-minimized ones.
  win1.dispatchEvent(new win1.Event("activate", { bubbles: false }));
  win2.dispatchEvent(new win2.Event("activate", { bubbles: false }));
  win3.dispatchEvent(new win3.Event("activate", { bubbles: false }));

  await minimizeWindow(win1);

  const ordered = BrowserWindowTracker.orderedWindows;
  const idx1 = ordered.indexOf(win1);
  const idx2 = ordered.indexOf(win2);
  const idx3 = ordered.indexOf(win3);

  Assert.notEqual(idx1, -1, "win1 should be present in orderedWindows");
  Assert.notEqual(idx2, -1, "win2 should be present in orderedWindows");
  Assert.notEqual(idx3, -1, "win3 should be present in orderedWindows");

  Assert.greater(
    idx1,
    idx2,
    "Minimized win1 should appear after non-minimized win2 in orderedWindows"
  );
  Assert.greater(
    idx1,
    idx3,
    "Minimized win1 should appear after non-minimized win3 in orderedWindows"
  );

  await BrowserTestUtils.closeWindow(win1);
  await BrowserTestUtils.closeWindow(win2);
  await BrowserTestUtils.closeWindow(win3);
});

// When every window that matches the requested options is minimized,
// getTopWindow() should fall back to one of them rather than returning null.
// Uses private windows so the non-private test runner window is excluded by
// the `private: true` option.
add_task(async function test_getTopWindow_falls_back_to_minimized() {
  const win1 = await BrowserWindowTracker.promiseOpenWindow({ private: true });
  const win2 = await BrowserWindowTracker.promiseOpenWindow({ private: true });

  await minimizeWindow(win1);
  await minimizeWindow(win2);

  const top = BrowserWindowTracker.getTopWindow({ private: true });

  Assert.ok(
    top === win1 || top === win2,
    "getTopWindow({ private: true }) should fall back to one of the minimized private windows"
  );

  await BrowserTestUtils.closeWindow(win1);
  await BrowserTestUtils.closeWindow(win2);
});
