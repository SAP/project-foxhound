/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests the the re-integration metric.
 */

"use strict";

const ADAPTIVE_URL = "https://example.com/adaptive-page";
const ORIGIN_URL = "https://example.com/";
const SEARCH_STRING = "exa";
const ADAPTIVE_INPUT = "exa";
const BACKSPACE_THRESHOLD = UrlbarPrefs.get("autoFill.backspaceThreshold");

add_setup(async function () {
  await PlacesUtils.history.clear();
  await PlacesUtils.bookmarks.eraseEverything();

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.autoFill", true],
      ["browser.urlbar.autoFill.adaptiveHistory.enabled", true],
      ["browser.urlbar.autoFill.adaptiveHistory.minCharsThreshold", 0],
      ["browser.urlbar.autoFill.adaptiveHistory.useCountThreshold", 0],
      ["browser.urlbar.autoFill.backspaceThreshold", BACKSPACE_THRESHOLD],
      ["browser.urlbar.suggest.quicksuggest.sponsored", false],
      ["browser.urlbar.suggest.quicksuggest.nonsponsored", false],
    ],
  });

  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
    await PlacesUtils.bookmarks.eraseEverything();
  });
});

async function addAdaptiveHistoryEntry(url, input, useCount = 3) {
  await PlacesTestUtils.addVisits({
    uri: url,
    transition: PlacesUtils.history.TRANSITIONS.TYPED,
  });
  for (let i = 0; i < useCount; i++) {
    await UrlbarUtils.addToInputHistory(url, input);
  }
}

async function backspaces(n, input) {
  for (let i = 0; i < n; i++) {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: input,
    });
    EventUtils.synthesizeKey("KEY_Backspace");
  }
  await UrlbarUtils._lastRecordAutofillBackspacePromise;
}

async function pickHistoryResult(url) {
  let resultCount = UrlbarTestUtils.getResultCount(window);
  let historyIndex = -1;
  for (let i = 0; i < resultCount; i++) {
    let d = await UrlbarTestUtils.getDetailsOfResultAt(window, i);
    if (
      !d.autofill &&
      d.result.payload.url === url &&
      d.result.type === UrlbarUtils.RESULT_TYPE.URL
    ) {
      historyIndex = i;
      break;
    }
  }
  Assert.notEqual(historyIndex, -1, "Should find the history result in panel");

  let loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
  while (UrlbarTestUtils.getSelectedRowIndex(window) !== historyIndex) {
    EventUtils.synthesizeKey("KEY_ArrowDown");
  }
  EventUtils.synthesizeKey("KEY_Enter");
  await loadPromise;
  await TestUtils.waitForTick();
}

// Picking a non-blocked URL as a history result should not record telemetry.
add_task(async function no_telemetry_when_not_blocked() {
  Services.fog.testResetFOG();

  await addAdaptiveHistoryEntry(ADAPTIVE_URL, ADAPTIVE_INPUT);

  await BrowserTestUtils.withNewTab("", async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "e",
      fireInputEvent: true,
    });

    // Pick the URL result (non-autofill) without dismissing first.
    await pickHistoryResult(ADAPTIVE_URL);
  });

  Assert.equal(
    Glean.urlbarAutofill.reintegration.origin.testGetValue(),
    null,
    "Origin reintegration should not be recorded"
  );
  Assert.equal(
    Glean.urlbarAutofill.reintegration.url.testGetValue(),
    null,
    "URL reintegration should not be recorded"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

// Reintegrating a blocked page URL should record the "url" label.
add_task(async function reintegration_page_url_telemetry() {
  Services.fog.testResetFOG();

  await addAdaptiveHistoryEntry(ADAPTIVE_URL, ADAPTIVE_INPUT);

  // Verify adaptive autofill works.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_url",
    "Should have adaptive url autofill before dismissal"
  );

  // Dismiss via result menu to block the page.
  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
    openByMouse: true,
  });

  // Wait for the async onEngagement handler to finish writing to the DB.
  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: ADAPTIVE_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_pages_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_pages_until_ms should be set");

  Assert.equal(
    Glean.urlbarAutofill.reintegration.url.testGetValue(),
    null,
    "URL reintegration should not be recorded before picking"
  );

  // Search again and pick the URL as a history result to reintegrate.
  await BrowserTestUtils.withNewTab("", async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: SEARCH_STRING,
      fireInputEvent: true,
    });
    await pickHistoryResult(ADAPTIVE_URL);
  });

  Assert.equal(
    Glean.urlbarAutofill.reintegration.url.testGetValue(),
    1,
    "URL reintegration should be recorded once"
  );
  Assert.equal(
    Glean.urlbarAutofill.reintegration.origin.testGetValue(),
    null,
    "Origin reintegration should not be recorded for a page URL"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

// Reintegrating a blocked origin should record the "origin" label.
add_task(async function reintegration_origin_telemetry() {
  Services.fog.testResetFOG();

  await addAdaptiveHistoryEntry(ORIGIN_URL, ADAPTIVE_INPUT);

  // Verify adaptive autofill works.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_origin",
    "Should have adaptive origin autofill before dismissal"
  );

  // Dismiss via result menu to block the origin.
  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
    openByMouse: true,
  });

  // Wait for the async onEngagement handler to finish writing to the DB.
  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: ORIGIN_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_until_ms should be set");

  Assert.equal(
    Glean.urlbarAutofill.reintegration.origin.testGetValue(),
    null,
    "Origin reintegration should not be recorded before picking"
  );

  await BrowserTestUtils.withNewTab("", async () => {
    // Search again and pick the origin as a history result to reintegrate.
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: SEARCH_STRING,
      fireInputEvent: true,
    });
    await pickHistoryResult(ORIGIN_URL);
  });

  Assert.equal(
    Glean.urlbarAutofill.reintegration.origin.testGetValue(),
    1,
    "Origin reintegration should be recorded once"
  );
  Assert.equal(
    Glean.urlbarAutofill.reintegration.url.testGetValue(),
    null,
    "URL reintegration should not be recorded for an origin"
  );

  await BrowserTestUtils.loadURIString({
    browser: gBrowser.selectedBrowser,
    uriString: "about:blank",
  });

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

// Reintegrating a backspace-blocked page URL should record a sample on the
// labeled timing distribution under the "url" label.
add_task(async function reintegration_after_backspace_page_url_telemetry() {
  Services.fog.testResetFOG();

  await addAdaptiveHistoryEntry(ADAPTIVE_URL, ADAPTIVE_INPUT);

  // Block via consecutive backspaces.
  await backspaces(BACKSPACE_THRESHOLD, ADAPTIVE_INPUT);

  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: ADAPTIVE_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_pages_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_pages_until_ms should be set after backspaces");

  Assert.equal(
    Glean.urlbarAutofill.reintegrationAfterBackspace.url.testGetValue(),
    null,
    "Timing distribution should be empty before re-integration"
  );

  await BrowserTestUtils.withNewTab("", async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: SEARCH_STRING,
      fireInputEvent: true,
    });
    await pickHistoryResult(ADAPTIVE_URL);
  });

  let distribution =
    Glean.urlbarAutofill.reintegrationAfterBackspace.url.testGetValue();
  Assert.ok(distribution, "Timing distribution should have a value");
  Assert.equal(
    distribution.count,
    1,
    "Should record exactly one sample for the url label"
  );
  Assert.equal(
    Glean.urlbarAutofill.reintegrationAfterBackspace.origin.testGetValue(),
    null,
    "Origin label should not be sampled for a page-URL re-integration"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

// Reintegrating a backspace-blocked origin should record a sample on the
// labeled timing distribution under the "origin" label.
add_task(async function reintegration_after_backspace_origin_telemetry() {
  Services.fog.testResetFOG();

  await addAdaptiveHistoryEntry(ORIGIN_URL, ADAPTIVE_INPUT);

  await backspaces(BACKSPACE_THRESHOLD, ADAPTIVE_INPUT);

  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: ORIGIN_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_until_ms should be set after backspaces");

  await BrowserTestUtils.withNewTab("", async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: SEARCH_STRING,
      fireInputEvent: true,
    });
    await pickHistoryResult(ORIGIN_URL);
  });

  let distribution =
    Glean.urlbarAutofill.reintegrationAfterBackspace.origin.testGetValue();
  Assert.ok(distribution, "Timing distribution should have a value");
  Assert.equal(
    distribution.count,
    1,
    "Should record exactly one sample for the origin label"
  );
  Assert.equal(
    Glean.urlbarAutofill.reintegrationAfterBackspace.url.testGetValue(),
    null,
    "URL label should not be sampled for an origin re-integration"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

// Backspace blocks for an origin and a page URL on the same host share a
// map key, but each level keeps its own timestamp. Reintegrating one level
// must not consume the other level's recorded timing.
add_task(async function backspace_blocks_same_host_distinct_levels() {
  Services.fog.testResetFOG();

  // Seed both an origin-level and a page-URL-level adaptive entry on the
  // same host so each can be backspace-blocked independently.
  await addAdaptiveHistoryEntry(ORIGIN_URL, ADAPTIVE_INPUT);
  await addAdaptiveHistoryEntry(ADAPTIVE_URL, ADAPTIVE_INPUT);

  // Block the page URL via backspaces first.
  await backspaces(BACKSPACE_THRESHOLD, ADAPTIVE_INPUT);

  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: ADAPTIVE_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_pages_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_pages_until_ms should be set after first backspaces");

  // Now block the origin via backspaces.
  await backspaces(BACKSPACE_THRESHOLD, ADAPTIVE_INPUT);

  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_until_ms should be set after second backspaces");

  // Reintegrate the origin first. This should use the origin timestamp.
  await BrowserTestUtils.withNewTab("", async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: SEARCH_STRING,
      fireInputEvent: true,
    });
    await pickHistoryResult(ORIGIN_URL);
  });

  let originDistribution =
    Glean.urlbarAutofill.reintegrationAfterBackspace.origin.testGetValue();
  Assert.ok(
    originDistribution,
    "Origin timing distribution should have a value"
  );
  Assert.equal(
    originDistribution.count,
    1,
    "Origin label should be sampled exactly once"
  );
  Assert.equal(
    Glean.urlbarAutofill.reintegrationAfterBackspace.url.testGetValue(),
    null,
    "URL label should not be sampled yet — the url slot must survive"
  );

  // Reintegrate the page URL. The url timestamp must still be present.
  await BrowserTestUtils.withNewTab("", async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: SEARCH_STRING,
      fireInputEvent: true,
    });
    await pickHistoryResult(ADAPTIVE_URL);
  });

  let urlDistribution =
    Glean.urlbarAutofill.reintegrationAfterBackspace.url.testGetValue();
  Assert.ok(
    urlDistribution,
    "URL timing distribution should have a value after the second reintegration"
  );
  Assert.equal(
    urlDistribution.count,
    1,
    "URL label should be sampled exactly once"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

// A re-integration of a block that was set via the result menu Dismiss
// should NOT contribute a sample to the timing distribution, even though
// the reintegration counter still increments.
add_task(async function no_timing_sample_for_result_menu_block() {
  Services.fog.testResetFOG();

  await addAdaptiveHistoryEntry(ADAPTIVE_URL, ADAPTIVE_INPUT);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });

  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
    openByMouse: true,
  });

  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: ADAPTIVE_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_pages_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_pages_until_ms should be set");

  await BrowserTestUtils.withNewTab("", async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: SEARCH_STRING,
      fireInputEvent: true,
    });
    await pickHistoryResult(ADAPTIVE_URL);
  });

  Assert.equal(
    Glean.urlbarAutofill.reintegration.url.testGetValue(),
    1,
    "Counter should still increment for result-menu-blocked re-integration"
  );
  Assert.equal(
    Glean.urlbarAutofill.reintegrationAfterBackspace.url.testGetValue(),
    null,
    "Timing distribution should not sample for result-menu-blocked re-integration"
  );
  Assert.equal(
    Glean.urlbarAutofill.reintegrationAfterBackspace.origin.testGetValue(),
    null,
    "Timing distribution origin label should also remain empty"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});
