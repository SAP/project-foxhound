/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Test for result explanations in the urlbar view ("You last visited", etc.).

"use strict";

const SEARCH_STRING = "explanation-strings";
const URL = "https://example.com/" + SEARCH_STRING;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.resultExplanations.featureGate", true]],
  });

  // Add a visit so we can test its explanation in the view.
  await PlacesTestUtils.addVisits({
    url: URL,
    visitDate: new Date("May 11, 2013 04:00:00 PDT"),
  });

  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
  });
});

// The explanation string should be shown on hover.
add_task(async function hover() {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
  });

  let row = await getHistoryResult();
  await assertExplanationVisibility(row, false);

  // Hover over the history row.
  EventUtils.synthesizeMouseAtCenter(row, { type: "mouseover" }, window);

  await assertExplanationVisibility(row, true);

  // Hover over something other than the history row.
  EventUtils.synthesizeMouseAtCenter(gURLBar, { type: "mouseover" }, window);

  await assertExplanationVisibility(row, false);

  await UrlbarTestUtils.promisePopupClose(window);
});

// The explanation string should be shown on keyboard selection.
add_task(async function selection() {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
  });

  let row = await getHistoryResult();
  await assertExplanationVisibility(row, false);

  // Select the history row.
  EventUtils.synthesizeKey("KEY_ArrowDown");
  Assert.equal(
    UrlbarTestUtils.getSelectedRow(window),
    row,
    "The history row should be selected"
  );

  await assertExplanationVisibility(row, true);

  // Press Down one more time to deselect the row.
  EventUtils.synthesizeKey("KEY_ArrowDown");
  Assert.notEqual(
    UrlbarTestUtils.getSelectedRow(window),
    row,
    "The history row should not be selected"
  );

  await assertExplanationVisibility(row, false);

  await UrlbarTestUtils.promisePopupClose(window);
});

async function getHistoryResult() {
  // Assume the history result is at index 1.
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);
  Assert.equal(details.url, URL, "The expected result should be found");

  let { row } = details.element;
  return row;
}

function assertExplanationVisibility(row, shouldBeVisible) {
  let explanationElement = row.querySelector(".urlbarView-explanation");
  Assert.ok(explanationElement, "Explanation element should be present");

  let urlElement = row.querySelector(".urlbarView-url");
  Assert.ok(urlElement, "URL element should be present");

  Assert.equal(
    BrowserTestUtils.isVisible(urlElement),
    !shouldBeVisible,
    "The URL visibility should be as expected"
  );
  Assert.equal(
    BrowserTestUtils.isVisible(explanationElement),
    shouldBeVisible,
    "The explanation visibility should be as expected"
  );
}
