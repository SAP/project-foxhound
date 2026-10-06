/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests that when adaptive autofill suggests a deep URL, the root origin
// appears as a second result in the panel if it exists in history.

"use strict";

async function addInputHistory(url, input, useCount = 4) {
  await PlacesUtils.withConnectionWrapper("addInputHistory", async db => {
    await db.execute(
      `INSERT OR REPLACE INTO moz_inputhistory (place_id, input, use_count)
       VALUES (
         (SELECT id FROM moz_places WHERE url_hash = hash(:url) AND url = :url),
         :input,
         :useCount
       )`,
      { url, input: input.toLowerCase(), useCount }
    );
  });
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.autoFill.adaptiveHistory.enabled", true],
      ["browser.urlbar.suggest.engines", false],
      ["browser.urlbar.scotchBonnet.enableOverride", false],
    ],
  });

  await PlacesUtils.bookmarks.eraseEverything();
  await PlacesUtils.history.clear();

  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
    await PlacesTestUtils.clearInputHistory();
  });
});

async function cleanUp() {
  EventUtils.synthesizeKey("KEY_Escape");
  await UrlbarTestUtils.promisePopupClose(window, () => gURLBar.blur());
  await PlacesUtils.history.clear();
  await PlacesTestUtils.clearInputHistory();
}

// When adaptive autofill suggests a deep URL and the origin is in history,
// the origin should appear as the second result.
add_task(async function deep_url_shows_origin_fallback() {
  let deepUrl = "https://example.com/path";
  let originUrl = "https://example.com/";

  await PlacesTestUtils.addVisits([
    { url: deepUrl, transition: PlacesUtils.history.TRANSITION_TYPED },
    { url: originUrl, transition: PlacesUtils.history.TRANSITION_TYPED },
  ]);
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();
  await addInputHistory(deepUrl, "exa");

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "exa",
    fireInputEvent: true,
  });

  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(details.autofill, "First result should be autofill");
  Assert.equal(
    details.result.autofill.type,
    "adaptive_url",
    "Autofill type should be adaptive url"
  );
  Assert.equal(gURLBar.value, "example.com/path", "Autofilled value");

  let resultCount = UrlbarTestUtils.getResultCount(window);
  Assert.greaterOrEqual(resultCount, 2, "Should have at least 2 results");

  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);
  Assert.equal(
    details.url,
    originUrl,
    "Second result should be the origin URL"
  );
  Assert.equal(
    details.result.providerName,
    "UrlbarProviderAutofill",
    "Origin fallback should come from the autofill provider"
  );
  Assert.ok(!details.autofill, "Second result should not be autofill");

  await cleanUp();
});

// When the autofilled URL is already an origin, no extra fallback should be
// added by the autofill provider.
add_task(async function origin_autofill_no_extra_fallback() {
  let originUrl = "https://example.com/";

  await PlacesTestUtils.addVisits({
    url: originUrl,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();
  await addInputHistory(originUrl, "exa");

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "exa",
    fireInputEvent: true,
  });

  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(details.autofill, "First result should be autofill");
  Assert.equal(gURLBar.value, "example.com/", "Autofilled value");

  // There should be only 1 result since the origin is the autofill itself.
  let resultCount = UrlbarTestUtils.getResultCount(window);
  Assert.equal(resultCount, 1, "Should have exactly 1 result");

  await cleanUp();
});

// When the origin has not been visited, no fallback should appear from the
// autofill provider.
add_task(async function no_fallback_without_origin_visit() {
  let deepUrl = "https://example.com/path";

  await PlacesTestUtils.addVisits({
    url: deepUrl,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();
  await addInputHistory(deepUrl, "exa");

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "exa",
    fireInputEvent: true,
  });

  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(details.autofill, "First result should be autofill");
  Assert.equal(
    details.result.autofill.type,
    "adaptive_url",
    "Autofill type should be adaptive url"
  );
  Assert.equal(gURLBar.value, "example.com/path", "Autofilled value");

  // Only the autofill result should appear; no fallback origin.
  let resultCount = UrlbarTestUtils.getResultCount(window);
  Assert.equal(resultCount, 1, "Should have exactly 1 result");

  await cleanUp();
});

// The user should be able to arrow down to the fallback origin and select it.
add_task(async function arrow_to_fallback_and_enter() {
  let deepUrl = "https://example.com/path";
  let originUrl = "https://example.com/";

  await PlacesTestUtils.addVisits([
    { url: deepUrl, transition: PlacesUtils.history.TRANSITION_TYPED },
    { url: originUrl, transition: PlacesUtils.history.TRANSITION_TYPED },
  ]);
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();
  await addInputHistory(deepUrl, "exa");

  await BrowserTestUtils.withNewTab("about:blank", async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "exa",
      fireInputEvent: true,
    });

    Assert.equal(gURLBar.value, "example.com/path", "Autofilled value");

    // Arrow down to select the second result (origin fallback).
    EventUtils.synthesizeKey("KEY_ArrowDown");
    let selectedIndex = UrlbarTestUtils.getSelectedRowIndex(window);
    Assert.equal(selectedIndex, 1, "Second result should be selected");

    let details1 = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);
    Assert.equal(details1.url, originUrl, "Second result should be the origin");

    // Press Enter to navigate to the origin.
    let loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
    EventUtils.synthesizeKey("KEY_Enter");
    await loadPromise;

    Assert.equal(
      gBrowser.selectedBrowser.currentURI.spec,
      originUrl,
      "Should have navigated to the origin"
    );
  });

  await cleanUp();
});

// The "Remove from History" result menu item on the fallback origin result
// should actually remove the origin from history.
add_task(async function remove_fallback_origin_from_history() {
  let deepUrl = "https://example.com/path";
  let originUrl = "https://example.com/";

  await PlacesTestUtils.addVisits([
    { url: deepUrl, transition: PlacesUtils.history.TRANSITION_TYPED },
    { url: originUrl, transition: PlacesUtils.history.TRANSITION_TYPED },
  ]);
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();
  await addInputHistory(deepUrl, "exa");

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "exa",
    fireInputEvent: true,
  });

  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(details.autofill, "First result should be autofill");
  Assert.equal(
    details.result.autofill.type,
    "adaptive_url",
    "Autofill type should be adaptive url"
  );

  let resultCount = UrlbarTestUtils.getResultCount(window);
  Assert.greaterOrEqual(resultCount, 2, "Should have at least 2 results");

  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);
  Assert.equal(
    details.url,
    originUrl,
    "Second result should be the origin URL"
  );

  // Click "Remove from History" on the fallback origin result.
  let waitForHistoryRemoval =
    PlacesTestUtils.waitForNotification("page-removed");
  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss", {
    resultIndex: 1,
    openByMouse: true,
  });
  await waitForHistoryRemoval;

  // The origin should have been removed from history.
  Assert.ok(
    !(await PlacesTestUtils.isPageInDB(originUrl)),
    "Origin URL should be removed from history"
  );

  await cleanUp();
});
