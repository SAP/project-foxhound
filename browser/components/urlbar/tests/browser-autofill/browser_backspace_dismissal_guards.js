/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests that backspace dismissal does NOT trigger a block under various
// conditions.

"use strict";

add_setup(adaptiveAutofillSetup);

const TEST_PAGE_URL = "https://example.com/some/path";
const TEST_ORIGIN_URL = "https://example.com/";
const TEST_INPUT = "exam";
const BACKSPACE_THRESHOLD = UrlbarPrefs.get("autoFill.backspaceThreshold");

// Backspace dismissal should not fire when adaptive history is disabled.
add_task(async function test_disabled_adaptive_history_no_block() {
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);

  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.autoFill.adaptiveHistory.enabled", false]],
  });

  // Add typed visits so origin autofill kicks in.
  await PlacesTestUtils.addVisits({
    url: "https://example.com/",
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "exam",
  });

  // Backspace several times; with adaptive history disabled, the backspace
  // state tracking should be completely skipped.
  await backspaces(BACKSPACE_THRESHOLD);

  let state = await getOriginBlockState("https://example.com/");
  Assert.ok(
    !state || (state.blockUntilMs === 0 && state.blockPagesUntilMs === 0),
    "No block should be set when adaptive history is disabled"
  );

  await SpecialPowers.popPrefEnv();
  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// Backspace dismissal should not write to the DB in private browsing mode.
add_task(async function test_private_browsing_no_block() {
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);

  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  await backspaces(BACKSPACE_THRESHOLD, TEST_INPUT, privateWin);

  let state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.ok(
    !state || state.blockPagesUntilMs === 0,
    "block_pages_until_ms should not be set from private browsing"
  );

  await BrowserTestUtils.closeWindow(privateWin);
  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// Backspacing after arrowing down to a non-autofill result should not trigger
// a block, because the autofill suggestion is no longer visible.
add_task(async function test_no_block_when_non_autofill_result_selected() {
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);

  // Also add a second history entry so there's a non-autofill result to arrow
  // down to.
  const OTHER_URL = "https://example.com/other/page";
  await PlacesTestUtils.addVisits({ url: OTHER_URL });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });

  // Confirm the first result is an adaptive autofill.
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_url",
    "First result should be adaptive autofill"
  );

  // Arrow down to a non-autofill result.
  EventUtils.synthesizeKey("KEY_ArrowDown");
  let selectedIndex = UrlbarTestUtils.getSelectedRowIndex(window);
  Assert.greater(
    selectedIndex,
    0,
    "Should have moved to a non-autofill result"
  );

  // Backspace BACKSPACE_THRESHOLD times — this should NOT block anything
  // because the autofill suggestion is no longer visible.
  for (let i = 0; i < BACKSPACE_THRESHOLD; i++) {
    EventUtils.synthesizeKey("KEY_Backspace");
    await UrlbarTestUtils.promiseSearchComplete(window);
  }
  await UrlbarTestUtils.promisePopupClose(window);

  let state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.ok(state, "Origin row should exist");
  Assert.equal(
    state.blockPagesUntilMs,
    0,
    "block_pages_until_ms should not be set after backspacing a non-autofill result"
  );
  Assert.equal(
    state.blockUntilMs,
    0,
    "block_until_ms should not be set after backspacing a non-autofill result"
  );

  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// Backspacing, then arrowing to a non-autofill result, then continuing to
// backspace should not trigger a block. The partial backspace count should be
// reset when the user navigates away from the autofill result.
add_task(
  async function test_no_block_when_backspace_then_arrow_then_backspace() {
    await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);

    const OTHER_URL = "https://example.com/other/page";
    await PlacesTestUtils.addVisits({ url: OTHER_URL });

    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: TEST_INPUT,
    });

    let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
    Assert.equal(
      details.result.autofill?.type,
      "adaptive_url",
      "First result should be adaptive autofill"
    );

    // Backspace once while autofill is shown, starting the count.
    EventUtils.synthesizeKey("KEY_Backspace");
    await UrlbarTestUtils.promiseSearchComplete(window);

    // Arrow down to a non-autofill result, which should reset the count.
    EventUtils.synthesizeKey("KEY_ArrowDown");
    let selectedIndex = UrlbarTestUtils.getSelectedRowIndex(window);
    Assert.greater(
      selectedIndex,
      0,
      "Should have moved to a non-autofill result"
    );

    // Backspace the remaining times to reach the threshold. This should NOT
    // trigger a block because we aren't focused on an autofill result.
    for (let i = 0; i < BACKSPACE_THRESHOLD; i++) {
      EventUtils.synthesizeKey("KEY_Backspace");
      await UrlbarTestUtils.promiseSearchComplete(window);
    }

    await UrlbarTestUtils.promisePopupClose(window);

    let state = await getOriginBlockState(TEST_PAGE_URL);
    Assert.ok(state, "Origin row should exist");
    Assert.equal(
      state.blockPagesUntilMs,
      0,
      "block_pages_until_ms should not be set when arrow interrupted backspaces"
    );
    Assert.equal(
      state.blockUntilMs,
      0,
      "block_until_ms should not be set when arrow interrupted backspaces"
    );

    await PlacesUtils.history.clear();
    resetBackspaceState();
  }
);

// Picking an autofill result clears the accumulated count for that target.
add_task(async function test_pick_clears_count() {
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);
  await backspaces(BACKSPACE_THRESHOLD - 1);

  // Pick the autofill result — this should clear the count. The autofill row
  // is auto-selected, so press Enter directly. (pickResultAndWaitForLoad
  // deliberately skips autofill rows and can't be used here.)
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_url",
    "First result should be adaptive autofill"
  );
  let loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
  EventUtils.synthesizeKey("KEY_Enter");
  await loadPromise;

  // Subsequent (threshold - 1) backspaces should not be enough to block.
  await backspaces(BACKSPACE_THRESHOLD - 1);
  let state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.equal(
    state.blockPagesUntilMs,
    0,
    "Count was reset by pick; threshold not reached"
  );

  await BrowserTestUtils.loadURIString({
    browser: gBrowser.selectedBrowser,
    uriString: "about:blank",
  });
  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// A hard dismiss via the result menu clears the in-memory count for the
// dismissed URL's scope, so a previously-accumulated count is not preserved
// past a user-initiated dismissal.
add_task(async function test_hard_dismiss_clears_count() {
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);
  await backspaces(BACKSPACE_THRESHOLD - 1);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_url",
    "First result should be adaptive autofill page URL"
  );
  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
  });
  await TestUtils.waitForCondition(
    () => !UrlbarUtils._backspaceBlocks.has("page:example.com"),
    "Hard dismiss removes the page-scope entry"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// Backspaces that delete user-typed content after the autofill is deleted
// must not count toward the threshold.
add_task(async function test_backspace_into_user_content_does_not_count() {
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  for (let i = 0; i < TEST_INPUT.length + 1; i++) {
    EventUtils.synthesizeKey("KEY_Backspace");
    await UrlbarTestUtils.promiseSearchComplete(window);
  }
  await UrlbarTestUtils.promisePopupClose(window);

  let state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.equal(
    state.blockPagesUntilMs,
    0,
    "Within-session backspaces past the autofill extension must not block"
  );

  await PlacesUtils.history.clear();
  resetBackspaceState();
});
