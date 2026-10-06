/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests for adaptive autofill backspace dismissal.
//
// When a user consecutively backspaces away an adaptive autofill suggestion
// enough times (default: 3), the system temporarily blocks the origin or URL
// from autofilling by setting block_until_ms or block_pages_until_ms on
// moz_origins.

"use strict";

add_setup(adaptiveAutofillSetup);

const TEST_PAGE_URL = "https://example.com/some/path";
const TEST_ORIGIN_URL = "https://example.com/";
const TEST_INPUT = "exam";
const BACKSPACE_THRESHOLD = UrlbarPrefs.get("autoFill.backspaceThreshold");

add_task(async function test_threshold_triggers_block() {
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);
  await backspaces(BACKSPACE_THRESHOLD);

  let state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.ok(state, "Origin row should exist");
  Assert.greater(
    state.blockPagesUntilMs,
    Date.now() - 1000,
    "block_pages_until_ms should be set to a future time for a page URL"
  );
  Assert.equal(state.blockUntilMs, 0, "block_until_ms should be 0");

  await PlacesUtils.history.clear();
  resetBackspaceState();
});

add_task(async function test_threshold_triggers_block_forward_delete() {
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);
  await backspaces(BACKSPACE_THRESHOLD, TEST_INPUT, window, "KEY_Delete");

  let state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.ok(state, "Origin row should exist");
  Assert.greater(
    state.blockPagesUntilMs,
    Date.now() - 1000,
    "block_pages_until_ms should be set after forward-delete dismissals"
  );
  Assert.equal(state.blockUntilMs, 0, "block_until_ms should be 0");

  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// Fewer than threshold backspaces should NOT trigger a block.
add_task(async function test_below_threshold_no_block() {
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);
  await backspaces(BACKSPACE_THRESHOLD - 1);

  let state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.ok(state, "Origin row should exist");
  Assert.equal(
    state.blockPagesUntilMs,
    0,
    "block_pages_until_ms should not be set below threshold"
  );

  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// Custom threshold pref: setting it to 5 means 4 backspaces don't trigger,
// but 5 do.
add_task(async function test_custom_threshold() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.autoFill.backspaceThreshold", 5]],
  });

  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);

  // 4 backspaces: below the custom threshold of 5.
  await backspaces(4);

  let state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.ok(state, "Origin row should exist");
  Assert.equal(
    state.blockPagesUntilMs,
    0,
    "block_pages_until_ms should not be set below custom threshold"
  );

  // 5th backspace should trigger.
  await backspaces(5);

  state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.greater(
    state.blockPagesUntilMs,
    Date.now() - 1000,
    "block_pages_until_ms should be set after reaching custom threshold"
  );

  await SpecialPowers.popPrefEnv();
  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// After blocking, the adaptive page autofill should not appear.
add_task(async function test_blocked_adaptive_autofill_not_autofilled() {
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);
  await backspaces(BACKSPACE_THRESHOLD);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });

  // Origins autofill is the backup when no adaptive autofill result is present.
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    details.autofill && details.result.autofill.type === "origin",
    "Autofill will appear for origin"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
  resetBackspaceState();
});

add_task(async function test_blocked_origins_autofill_not_autofilled() {
  await PlacesTestUtils.addVisits({
    url: TEST_PAGE_URL,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();
  await backspaces(BACKSPACE_THRESHOLD);

  let state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.ok(state, "Origin row should exist");
  Assert.greater(
    state.blockUntilMs,
    0,
    "block_until_ms should be greater than 0"
  );

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });

  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(!details.autofill, "Autofill should not be present");

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// An origin URL should set block_until_ms on moz_origins,
// not block_pages_until_ms.
add_task(async function test_origin_url_blocks_origin() {
  await seedAdaptiveHistory(TEST_ORIGIN_URL, TEST_INPUT);

  await backspaces(BACKSPACE_THRESHOLD);

  let state = await getOriginBlockState(TEST_ORIGIN_URL);
  Assert.ok(state, "Origin row should exist");
  Assert.greater(
    state.blockUntilMs,
    Date.now() - 1000,
    "block_until_ms should be set for an origin URL"
  );
  Assert.equal(
    state.blockPagesUntilMs,
    0,
    "block_pages_until_ms should NOT be set for an origin URL"
  );

  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// A page URL should set block_pages_until_ms, not block_until_ms.
add_task(async function test_page_url_blocks_pages() {
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);

  await backspaces(BACKSPACE_THRESHOLD);

  let state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.ok(state, "Origin row should exist");
  Assert.greater(
    state.blockPagesUntilMs,
    Date.now() - 1000,
    "block_pages_until_ms should be set for a page URL"
  );
  // block_until_ms should remain unset.
  Assert.equal(
    state.blockUntilMs,
    0,
    "block_until_ms should NOT be set for a page URL"
  );

  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// Backspace-blocking a www. adaptive origin should also block the non-www.
// variant.
add_task(async function test_www_origin_block_applies_to_non_www() {
  const WWW_ORIGIN_URL = "https://www.example.com/";
  await seedAdaptiveHistory(WWW_ORIGIN_URL, TEST_INPUT);
  await PlacesTestUtils.addVisits({
    url: TEST_ORIGIN_URL,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  await backspaces(BACKSPACE_THRESHOLD, TEST_INPUT);

  let state = await getOriginBlockState(WWW_ORIGIN_URL);
  Assert.ok(state, "www. origin row should exist");
  Assert.greater(
    state.blockUntilMs,
    0,
    "block_until_ms should be set on www. origin after backspaces"
  );

  // The non-www. variant should also be blocked.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    !details.autofill,
    "Autofill should not appear for non-www. origin after blocking www. variant"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// Backspace-blocking a www. adaptive page URL should also block the non-www.
// page variant.
add_task(async function test_www_page_block_applies_to_non_www() {
  const WWW_PAGE_URL = "https://www.example.com/some/path";
  await seedAdaptiveHistory(WWW_PAGE_URL, TEST_INPUT);
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);

  await backspaces(BACKSPACE_THRESHOLD, TEST_INPUT);

  let state = await getOriginBlockState(WWW_PAGE_URL);
  Assert.ok(state, "www. origin row should exist");
  Assert.greater(
    state.blockPagesUntilMs,
    0,
    "block_pages_until_ms should be set on www. origin after backspaces"
  );

  // The non-www. page variant should also be blocked.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  // Origin autofill might appear for this.
  Assert.notEqual(
    details.autofill?.type,
    "adaptive_url",
    "Adaptive autofill url should not appear for non-www. page after blocking www. variant"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// Backspace-blocking a non-www. adaptive origin should also block the www.
// variant.
add_task(async function test_non_www_origin_block_applies_to_www() {
  const WWW_ORIGIN_URL = "https://www.example.com/";
  await seedAdaptiveHistory(TEST_ORIGIN_URL, TEST_INPUT);
  await PlacesTestUtils.addVisits({
    url: WWW_ORIGIN_URL,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  await backspaces(BACKSPACE_THRESHOLD, TEST_INPUT);

  let state = await getOriginBlockState(TEST_ORIGIN_URL);
  Assert.ok(state, "Non-www. origin row should exist");
  Assert.greater(
    state.blockUntilMs,
    0,
    "block_until_ms should be set on non-www. origin after backspaces"
  );

  // The www. variant should also be blocked.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    !details.autofill,
    "Autofill should not appear for www. origin after blocking non-www. variant"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
  resetBackspaceState();
});

// Backspace-blocking a non-www. adaptive page URL should also block the www.
// page variant.
add_task(async function test_non_www_page_block_applies_to_www() {
  const WWW_PAGE_URL = "https://www.example.com/some/path";
  await seedAdaptiveHistory(TEST_PAGE_URL, TEST_INPUT);
  await seedAdaptiveHistory(WWW_PAGE_URL, TEST_INPUT);

  await backspaces(BACKSPACE_THRESHOLD, TEST_INPUT);

  let state = await getOriginBlockState(TEST_PAGE_URL);
  Assert.ok(state, "Non-www. origin row should exist");
  Assert.greater(
    state.blockPagesUntilMs,
    0,
    "block_pages_until_ms should be set on non-www. origin after backspaces"
  );

  // The www. page variant should also be blocked.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_INPUT,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.notEqual(
    details.autofill?.type,
    "adaptive_url",
    "Adaptive autofill url should not appear for www. page after blocking non-www variant."
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
  resetBackspaceState();
});
