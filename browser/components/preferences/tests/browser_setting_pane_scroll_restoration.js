/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Ensure `.main-content` overflows so `scrollTop` assignments take effect.
 * Resizing the window down doesn't work on every window manager, so we add
 * a tall padding element instead — it stays put across pane changes and
 * gets torn down with the tab.
 *
 * @param {Window} win
 * @returns {HTMLElement} The `.main-content` element.
 */
function ensureScrollableContent(win) {
  let mainContent = win.document.querySelector(".main-content");
  let padding = win.document.createElement("div");
  padding.style.marginBlock = "100vh";
  padding.textContent = "Padding for scroll area";
  mainContent.append(padding);
  return mainContent;
}

function scrollClose(actual, expected, msg) {
  // scrollTop reports CSS pixels that may include subpixel rounding under
  // non-100% DPI scale.
  Assert.less(
    Math.abs(actual - expected),
    1,
    `${msg} (got ${actual}, expected ~${expected})`
  );
}

/**
 * Navigate to `category` via `gotoPref()` and (optionally) set the
 * main content's scrollTop. Returns the main-content element so callers
 * can keep poking at it.
 *
 * @param {Window} win
 * @param {string} category Friendly pane id (e.g. "privacy").
 * @param {number} [scrollTop] If provided, scroll the pane to this offset.
 * @returns {Promise<void>}
 */
async function gotoPrefAndScroll(win, category, scrollTop) {
  /**
   * `gotoPref` short-circuits without firing `paneshown` when called for the
   *  pane that's already current, so only await the event when we're actually
   *  changing panes.
   */
  let internalName = `pane${category[0].toUpperCase()}${category.substring(1)}`;
  if (win.gLastCategory?.category !== internalName) {
    let paneShown = waitForPaneChange(category, win);
    await win.gotoPref(category);
    await paneShown;
  }
  let mainContent = win.document.querySelector(".main-content");
  if (scrollTop != null) {
    mainContent.scrollTop = scrollTop;
  }
}

/**
 * Walk through history by `delta` entries and assert the resulting
 * scroll position matches `expectedScroll` on `expectedCategory`.
 *
 * @param {Window} win
 * @param {number} delta Argument passed to `history.go()`.
 * @param {string} expectedCategory Friendly pane id we expect to land on.
 * @param {number} expectedScroll Expected `scrollTop` after restore.
 */
async function historyGoAndVerify(
  win,
  delta,
  expectedCategory,
  expectedScroll
) {
  let paneShown = waitForPaneChange(expectedCategory, win);
  win.history.go(delta);
  await paneShown;
  let mainContent = win.document.querySelector(".main-content");
  scrollClose(
    mainContent.scrollTop,
    expectedScroll,
    `history.go(${delta}) -> ${expectedCategory} restored ~${expectedScroll}px`
  );
}

/**
 * Click the sub-pane back arrow (the moz-page-header back button) for the
 * pane currently shown.
 */
async function clickBackArrow(win, paneId) {
  let doc = win.document;
  let pane = doc.querySelector(`setting-pane[data-category="${paneId}"]`);
  await pane.updateComplete;
  let backButton = pane.pageHeaderEl.backButtonEl;
  ok(backButton, `Back button present on ${paneId}`);
  backButton.click();
}

/**
 * Covers top-level pane back/forward across multi-hop history, scroll
 * captured at navigation time (including mutated offsets on already-
 * created entries), and `location.hash` assignment pushing a fresh
 * entry that starts at scrollTop 0.
 */
add_task(async function test_top_level_back_forward_round_trip() {
  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });
  let win = gBrowser.contentWindow;
  let mainContent = ensureScrollableContent(win);

  // Three forward navigations build a stack: privacy(50) -> sync(75) -> search.
  await gotoPrefAndScroll(win, "privacy", 50);
  await gotoPrefAndScroll(win, "sync");
  scrollClose(mainContent.scrollTop, 0, "New pane starts at scrollTop 0");
  mainContent.scrollTop = 75;

  await gotoPrefAndScroll(win, "search");
  scrollClose(mainContent.scrollTop, 0, "Direct gotoPref resets scroll");

  // Walk back through the stack: each entry restores its captured scroll.
  await historyGoAndVerify(win, -1, "sync", 75);
  await historyGoAndVerify(win, -1, "privacy", 50);

  // Mutate scroll on the privacy entry, then go forward and back. The
  // mutated value should be captured on navigate-away and restored on
  // return.
  mainContent.scrollTop = 25;
  await historyGoAndVerify(win, 1, "sync", 75);
  await historyGoAndVerify(win, -1, "privacy", 25);

  // location.hash assignment pushes a new entry
  // and lands fresh with scrollTop 0.
  let syncShown = waitForPaneChange("sync", win);
  win.location.hash = "sync";
  await syncShown;
  scrollClose(
    mainContent.scrollTop,
    0,
    "location.hash assignment pushes a fresh entry at scrollTop 0"
  );

  gBrowser.removeCurrentTab();
});

/**
 * Covers sub-pane drill-down chains: back arrow restores each parent's
 * scroll, browser-forward re-enters and restores the child's scroll,
 * and a sub-pane loaded directly via the URL bar (no parent in history)
 * still falls back to a fresh navigation when the back arrow is clicked.
 */
add_task(async function test_sub_pane_back_arrow_chain() {
  // --- Part 1: drill-down chain with mid-stack mutation ---
  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });
  let win = gBrowser.contentWindow;
  let mainContent = ensureScrollableContent(win);

  await gotoPrefAndScroll(win, "privacy", 40);
  await gotoPrefAndScroll(win, "etp", 25);
  await gotoPrefAndScroll(win, "etpCustomize");

  // Back arrow walks up the chain, restoring each parent's saved scroll.
  let etpShown = waitForPaneChange("etp", win);
  await clickBackArrow(win, "paneEtpCustomize");
  await etpShown;
  scrollClose(mainContent.scrollTop, 25, "Back arrow restored etp scroll");

  let privacyShown = waitForPaneChange("privacy", win);
  await clickBackArrow(win, "paneEtp");
  await privacyShown;
  scrollClose(mainContent.scrollTop, 40, "Back arrow restored privacy scroll");

  // Browser-forward re-enters each sub-pane and restores its scroll.
  await historyGoAndVerify(win, 1, "etp", 25);
  await historyGoAndVerify(win, 1, "etpCustomize", 0);

  gBrowser.removeCurrentTab();

  // --- Part 2: sub-pane loaded directly via URL bar (no parent entry) ---
  await openPreferencesViaOpenPreferencesAPI("etpCustomize", {
    leaveOpen: true,
  });
  win = gBrowser.contentWindow;
  mainContent = ensureScrollableContent(win);

  etpShown = waitForPaneChange("etp", win);
  await clickBackArrow(win, "paneEtpCustomize");
  await etpShown;
  scrollClose(
    mainContent.scrollTop,
    0,
    "Back arrow from URL-bar-loaded sub-pane navigates parent fresh"
  );

  gBrowser.removeCurrentTab();
});

/**
 * Clicking a breadcrumb is a forward navigation (pushes a new entry),
 * not a back navigation. The new entry has no saved offset, so scroll
 * resets to 0 rather than restoring the previous parent visit's
 * position.
 */
add_task(async function test_breadcrumb_click_does_not_restore_scroll() {
  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });
  let win = gBrowser.contentWindow;
  let doc = win.document;
  let mainContent = ensureScrollableContent(win);

  await gotoPrefAndScroll(win, "privacy", 50);
  await gotoPrefAndScroll(win, "etp");

  let pane = doc.querySelector('setting-pane[data-category="paneEtp"]');
  await pane.updateComplete;
  let breadcrumbs = pane.pageHeaderEl.querySelectorAll("moz-breadcrumb");
  let parentBreadcrumb = [...breadcrumbs].find(c => c.href === "#privacy");
  ok(parentBreadcrumb, "Etp sub-pane has a breadcrumb pointing to privacy");
  let link = parentBreadcrumb.shadowRoot.querySelector("a");

  let privacyShown = waitForPaneChange("privacy", win);
  link.click();
  await privacyShown;
  scrollClose(
    mainContent.scrollTop,
    0,
    "Breadcrumb click does not restore prior scroll"
  );

  gBrowser.removeCurrentTab();
});
