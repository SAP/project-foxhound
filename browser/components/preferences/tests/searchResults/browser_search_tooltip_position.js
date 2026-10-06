/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Bug 2001667: search tooltips were positioned against an intermediate layout
// (while the "no results" message was still visible) and never repositioned
// once it was hidden, leaving them vertically misaligned after a
// results -> no-results -> results round trip.
//
// This test injects a synthetic anchor element (rather than relying on real
// pane content) so it does not break if specific preference strings are
// removed or renamed.  It also stubs performance.now() so that the
// FRAME_THRESHOLD branch fires deterministically on every loop iteration,
// ensuring the tooltip is created mid-loop (the exact condition the fix
// addresses) regardless of machine speed.
//
// Structural requirement: the injected anchor must sit AFTER #no-results-message
// in the mainPrefPane vbox.  #search-tooltip-container lives inside
// #header-searchResults which precedes #no-results-message, so anchors below
// the message shift vertically when it toggles while the container does not.
// That asymmetry is what makes a stale tooltip top incorrect. An anchor
// prepended to the top of #mainPrefPane (above the message) would never shift
// and the regression would be undetectable.

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

add_task(async function test_tooltip_realigned_after_no_results_roundtrip() {
  await openPreferencesViaOpenPreferencesAPI(DEFAULT_PANE, { leaveOpen: true });

  let win = gBrowser.contentWindow;
  let doc = gBrowser.contentDocument;
  let pane = win.gSearchResultsPane;
  let container = doc.getElementById("search-tooltip-container");
  let searchInput = doc.getElementById("searchInput");

  // A token that exists only in our synthetic element (all lowercase because
  // searchFunction lowercases the query at findInPage.js:278).
  const TOKEN = "zzztooltipmocktoken";
  const NOMATCH = "zzznomatchquery";

  // Insert immediately after #no-results-message so the anchor sits below it
  // in the mainPrefPane vbox. This is required: toggling the no-results
  // message shifts elements below it (adding/removing its height from the
  // normal flow), so the anchor moves while #search-tooltip-container (above
  // the message) stays put. The tooltip top formula is
  //   anchorRect.top - containerRect.top
  // and that delta changes with the message's visibility, which is exactly
  // what the fix corrects.
  let noResultsEl = doc.getElementById("no-results-message");
  let anchor = doc.createElement("button");
  anchor.setAttribute("searchkeywords", TOKEN);
  anchor.textContent = "mock tooltip anchor";
  noResultsEl.after(anchor);
  registerCleanupFunction(() => anchor.remove());

  // Structural guard: if this fails, the anchor is not immediately after the
  // no-results message and the position assertion will pass vacuously without
  // the fix.
  Assert.strictEqual(
    noResultsEl.nextElementSibling,
    anchor,
    "mock anchor is the immediate next sibling of #no-results-message"
  );

  // sendString appends to existing text; select-all first so each call
  // replaces the query rather than extending it.
  async function setSearch(query) {
    searchInput.focus();
    EventUtils.synthesizeKey("a", { accelKey: true }, win);
    let completed = BrowserTestUtils.waitForEvent(
      win,
      "PreferencesSearchCompleted",
      e => e.detail == query
    );
    EventUtils.sendString(query, win);
    await completed;
  }

  // 1. Query that matches the synthetic anchor. Confirm it receives a tooltip.
  await setSearch(TOKEN);
  ok(
    pane.listSearchTooltips.has(anchor),
    "mock anchor got a tooltip on first search"
  );

  // 2. Switch to a no-results query so the "no results" message appears above
  //    the anchor (this shifts the anchor downward relative to the container).
  await setSearch(NOMATCH);
  is_element_visible(
    noResultsEl,
    "no-results message is visible for the unmatched query"
  );

  // 3. Return to the original results query which is the regression path.
  //
  //    Stub performance.now() to return monotonically increasing values far
  //    above any real rAF timestamp.  This makes `performance.now() - ts >
  //    FRAME_THRESHOLD` (findInPage.js:335) true on every loop iteration:
  //      - Iteration 1: listSearchTooltips is empty -> mid-loop creation is a
  //        no-op; our anchor (third child of mainPrefPane) is then processed
  //        and added to listSearchTooltips.
  //      - Iteration 2+: the anchor's tooltip is created MID-LOOP while
  //        #no-results-message is still in the layout (shifted anchor,
  //        unshifted container) -> stale top pre-fix.
  //    The post-loop pass (findInPage.js:434) is blocked by the tooltipNode
  //    guard, so without the fix the stale position is never corrected.
  let base = win.performance.now() + 1e9;
  let callCount = 0;
  let stub = sinon
    .stub(win.performance, "now")
    .callsFake(() => base + ++callCount * 1000);

  let calls;
  try {
    await setSearch(TOKEN);
    calls = stub.callCount;
  } finally {
    stub.restore();
  }

  // Timing guard: if callCount is 0 or tiny, the stub did not intercept the
  // search's performance.now() calls and the mid-loop path was not exercised.
  Assert.greater(
    calls,
    2,
    `performance.now() was intercepted by the stub (callCount=${calls})`
  );

  ok(
    pane.listSearchTooltips.has(anchor),
    "mock anchor got a tooltip on regression-path search"
  );

  // Every tooltip's stored top must equal the position computed against the
  // now-settled layout.  The formula mirrors _computeTooltipPosition exactly:
  //   top = anchorRect.top - tooltipContainerRect.top
  // A stale tooltip is off by approximately the height of the no-results message.
  let containerTop = container.getBoundingClientRect().top;
  let tooltip = anchor.tooltipNode;
  ok(tooltip, "mock anchor has an associated tooltip node");
  let expectedTop = anchor.getBoundingClientRect().top - containerTop;
  let actualTop = parseFloat(tooltip.style.top);
  Assert.lessOrEqual(
    Math.abs(actualTop - expectedTop),
    1,
    `tooltip top (${actualTop}px) matches settled anchor offset (${expectedTop}px)`
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
