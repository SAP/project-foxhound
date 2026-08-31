/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests that picking an origin autofill result records it so that future
// searches produce an adaptive autofill result instead.

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.autoFill.adaptiveHistory.enabled", true]],
  });

  await PlacesUtils.bookmarks.eraseEverything();
  await PlacesUtils.history.clear();

  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
    await PlacesTestUtils.clearInputHistory();
  });
});

// Returns the autofill type ("origin", "adaptive", etc.) of the first result
// for the given search string, or null if the first result is not autofill.
async function getAutofillType(searchString) {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: searchString,
    fireInputEvent: true,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  await UrlbarTestUtils.promisePopupClose(window);
  if (!details.autofill) {
    return null;
  }
  return details.result.autofill.type;
}

async function triggerAutofillAndPickResult(searchString, autofilledValue) {
  await BrowserTestUtils.withNewTab("about:blank", async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: searchString,
      fireInputEvent: true,
    });

    let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
    Assert.ok(details.autofill, "First result should be an autofill result");
    Assert.equal(gURLBar.value, autofilledValue, "Autofilled value");

    let loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
    EventUtils.synthesizeKey("KEY_Enter");
    await loadPromise;
  });
}

// Picking an origin autofill result should cause the next search with the same
// string to produce an adaptive autofill result.
add_task(async function origin_becomes_adaptive_after_pick() {
  let url = "https://example.com/";
  let input = "exam";

  await PlacesTestUtils.addVisits({
    url,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  // The first search should be origin autofill since there's no input history.
  await BrowserTestUtils.withNewTab("about:blank", async () => {
    let type = await getAutofillType(input);
    Assert.equal(type, "origin", "Should be origin autofill before any pick");

    // Pick the origin autofill result.
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: input,
      fireInputEvent: true,
    });
    Assert.equal(gURLBar.value, "example.com/", "Autofilled value");

    let loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
    EventUtils.synthesizeKey("KEY_Enter");
    await loadPromise;

    // The next search should now be adaptive autofill.
    let newType = await getAutofillType(input);
    Assert.equal(
      newType,
      "adaptive_origin",
      "Should be adaptive origin autofill after picking origin autofill"
    );
  });

  await PlacesUtils.history.clear();
  await PlacesTestUtils.clearInputHistory();
});

// Picking an origin autofill for one origin should not cause a different
// origin to become adaptive.
add_task(async function origin_adaptive_does_not_affect_other_origins() {
  let url1 = "https://example.com/";
  let url2 = "https://mozilla.org/";

  await PlacesTestUtils.addVisits([
    { url: url1, transition: PlacesUtils.history.TRANSITION_TYPED },
    { url: url2, transition: PlacesUtils.history.TRANSITION_TYPED },
  ]);
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  // Pick example.com via "exam".
  await triggerAutofillAndPickResult("exam", "example.com/");

  await BrowserTestUtils.withNewTab("about:blank", async () => {
    let exampleType = await getAutofillType("exam");
    Assert.equal(
      exampleType,
      "adaptive_origin",
      "Picked origin should become adaptive"
    );

    // mozilla.org was never picked, so it should still be origin autofill.
    let mozillaType = await getAutofillType("moz");
    Assert.equal(
      mozillaType,
      "origin",
      "Unpicked origin should remain origin autofill"
    );
  });

  await PlacesUtils.history.clear();
  await PlacesTestUtils.clearInputHistory();
});

// When adaptive autofill is disabled, picking an origin autofill result should
// NOT convert it to adaptive on the next search.
add_task(async function no_conversion_when_adaptive_disabled() {
  let url = "https://example.com/";
  let input = "exam";

  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.autoFill.adaptiveHistory.enabled", false]],
  });

  await PlacesTestUtils.addVisits({
    url,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  await triggerAutofillAndPickResult(input, "example.com/");

  await BrowserTestUtils.withNewTab("about:blank", async () => {
    let type = await getAutofillType(input);
    Assert.equal(
      type,
      "origin",
      "Should remain origin autofill when adaptive history is disabled"
    );
  });

  await SpecialPowers.popPrefEnv();
  await PlacesUtils.history.clear();
  await PlacesTestUtils.clearInputHistory();
});

// When the origin URL (e.g. https://example.com/) is not in moz_places but
// origin autofill is available because a subpage was visited, picking the
// origin autofill result should still upgrade it to adaptive autofill.
add_task(async function origin_without_visit_becomes_adaptive() {
  let subpageUrl = "https://example.com/deep/page";
  let originUrl = "https://example.com/";
  let input = "exam";

  // Visit only the subpage. This creates a moz_origins entry for
  // example.com (enabling origin autofill) but does NOT create a
  // moz_places row for the root origin URL.
  await PlacesTestUtils.addVisits({
    url: subpageUrl,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  // Verify the root origin URL is not in moz_places.
  Assert.ok(
    !(await PlacesUtils.history.hasVisits(originUrl)),
    "Root origin URL should not be in history"
  );

  // The first search should be origin autofill.
  await BrowserTestUtils.withNewTab("about:blank", async () => {
    let type = await getAutofillType(input);
    Assert.equal(type, "origin", "Should be origin autofill before any pick");

    // Pick the origin autofill result. This navigates to example.com/,
    // creating the moz_places entry, and addToInputHistoryWhenReady
    // records input history once the visit lands.
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: input,
      fireInputEvent: true,
    });
    Assert.equal(gURLBar.value, "example.com/", "Autofilled value");

    let loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
    EventUtils.synthesizeKey("KEY_Enter");
    await loadPromise;

    // addToInputHistoryWhenReady is fire-and-forget: it waits for the
    // page-visited event and then writes to the DB asynchronously.
    // BrowserTestUtils.browserLoaded resolves before that write finishes,
    // so poll until the input history row lands.
    await TestUtils.waitForCondition(async () => {
      let rows = await PlacesUtils.withConnectionWrapper(
        "waitForInputHistory",
        db =>
          db.executeCached(
            `SELECT 1 FROM moz_inputhistory i
             JOIN moz_places h ON h.id = i.place_id
             WHERE h.url_hash = hash(:url) AND h.url = :url`,
            { url: originUrl }
          )
      );
      return rows.length;
    }, "Waiting for input history to be recorded for the origin URL");

    // The next search should now be adaptive autofill.
    let newType = await getAutofillType(input);
    Assert.equal(
      newType,
      "adaptive_origin",
      "Should be adaptive autofill after picking origin autofill without prior visit"
    );
  });

  await PlacesUtils.history.clear();
  await PlacesTestUtils.clearInputHistory();
});

// Picking an origin autofill result multiple times should keep producing
// adaptive autofill on subsequent searches.
add_task(async function repeated_picks_stay_adaptive() {
  let url = "https://example.com/";
  let input = "exam";

  await PlacesTestUtils.addVisits({
    url,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  // First pick: origin -> creates input history.
  await triggerAutofillAndPickResult(input, "example.com/");

  // Second pick: should now be adaptive.
  await triggerAutofillAndPickResult(input, "example.com/");

  // Third search: should still be adaptive.
  await BrowserTestUtils.withNewTab("about:blank", async () => {
    let type = await getAutofillType(input);
    Assert.equal(
      type,
      "adaptive_origin",
      "Should still be adaptive after multiple picks"
    );
  });

  await PlacesUtils.history.clear();
  await PlacesTestUtils.clearInputHistory();
});
