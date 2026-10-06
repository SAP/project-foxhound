/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests that a backspace-induced block is restored ("reintegrated") after the
// user explicitly picks the same destination as a history result. Covers
// adaptive page URL, adaptive origin, and non-adaptive origins autofill.

"use strict";

add_setup(adaptiveAutofillSetup);

const TEST_PAGE_URL = "https://example.com/some/path";
const TEST_ORIGIN_URL = "https://example.com/";
const TEST_INPUT = "exam";
const BACKSPACE_THRESHOLD = UrlbarPrefs.get("autoFill.backspaceThreshold");

// Backspace-blocked adaptive page autofill should be restored after picking the
// same URL as a history result.
add_task(async function test_reintegration_adaptive_page_url() {
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);

  // Verify adaptive autofill works before blocking.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_url",
    "Should have adaptive url autofill before blocking"
  );
  await UrlbarTestUtils.promisePopupClose(window);

  // Block via backspaces.
  await backspaces(BACKSPACE_THRESHOLD);
  let state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.greater(
    state.blockPagesUntilMs,
    0,
    "block_pages_until_ms should be set after backspaces"
  );

  // Verify adaptive autofill is gone.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    !details.result.autofill ||
      (details.result.autofill.type !== "adaptive_url" &&
        details.result.autofill.type !== "adaptive_origin"),
    "Adaptive autofill should not appear while blocked"
  );

  await UrlbarTestUtils.pickResultAndWaitForLoad(window, TEST_PAGE_URL);

  // The block should be cleared after reintegration.
  state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.equal(
    state.blockPagesUntilMs,
    0,
    "block_pages_until_ms should be cleared after picking a history result"
  );

  // Adaptive autofill should work again.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_url",
    "Adaptive autofill url should be restored after reintegration"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// Backspace-blocked adaptive origin autofill should be restored after picking
// the same origin as a history result.
add_task(async function test_reintegration_adaptive_origin() {
  await seedAdaptiveHistory(TEST_ORIGIN_URL, TEST_INPUT);

  // Verify adaptive autofill works before blocking.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_origin",
    "Should have adaptive autofill before blocking"
  );
  await UrlbarTestUtils.promisePopupClose(window);

  // Block via backspaces.
  await backspaces(BACKSPACE_THRESHOLD);

  let state = await getOriginBlockState(TEST_ORIGIN_URL);
  Assert.greater(
    state.blockUntilMs,
    0,
    "block_until_ms should be set after backspacing an origin"
  );

  // Verify autofill is gone.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(!details.autofill, "Autofill should not appear while blocked");

  await UrlbarTestUtils.pickResultAndWaitForLoad(window, TEST_ORIGIN_URL);

  // The block should be cleared.
  state = await getOriginBlockState(TEST_ORIGIN_URL);
  Assert.equal(
    state.blockUntilMs,
    0,
    "block_until_ms should be cleared after picking the origin as a history result"
  );

  // Adaptive autofill should work again.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_origin",
    "Adaptive origin autofill should be restored after reintegration"
  );

  // Make sure we navigate away or else in other tests, a result macthing the
  // URL the user on will be suppressed.
  await BrowserTestUtils.loadURIString({
    browser: gBrowser.selectedBrowser,
    uriString: "about:blank",
  });

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// Backspace-blocked origins autofill (non-adaptive) should be restored after
// picking the origin as a history result.
add_task(async function test_reintegration_origins_autofill() {
  // Create a typed visit for origins autofill (no adaptive history).
  await PlacesTestUtils.addVisits({
    url: TEST_ORIGIN_URL,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  // Verify origins autofill works.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(details.autofill, "Should have origins autofill before blocking");
  Assert.notEqual(
    details.result.autofill?.type,
    "adaptive_origin",
    "Should be regular origin autofill, not adaptive origin"
  );
  await UrlbarTestUtils.promisePopupClose(window);

  // Block via backspaces.
  await backspaces(BACKSPACE_THRESHOLD);

  let state = await getOriginBlockState(TEST_ORIGIN_URL);
  Assert.greater(
    state.blockUntilMs,
    0,
    "block_until_ms should be set after backspaces on origins autofill"
  );

  // Verify autofill is gone.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(!details.autofill, "Autofill should not appear while blocked");

  // Re-pick the URL to unblock it.
  await UrlbarTestUtils.pickResultAndWaitForLoad(window, TEST_ORIGIN_URL);

  state = await getOriginBlockState(TEST_ORIGIN_URL);
  Assert.equal(
    state.blockUntilMs,
    0,
    "block_until_ms should be cleared after picking the origin as history"
  );

  // Origins autofill should work again.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    details.autofill,
    "Origins autofill should be restored after reintegration"
  );

  // Make sure we navigate away or else in other tests, a result macthing the
  // URL the user on will be suppressed.
  await BrowserTestUtils.loadURIString({
    browser: gBrowser.selectedBrowser,
    uriString: "about:blank",
  });

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
  resetBackspaceState();
});
