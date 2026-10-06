/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let searchbar;
let engine1;
let engine2;
let suggestionEngine;

function resetTelemetry() {
  Services.telemetry.clearScalars();
  Services.telemetry.clearEvents();
  Services.fog.testResetFOG();
  TelemetryTestUtils.getAndClearKeyedHistogram("SEARCH_COUNTS");
}

/**
 * Finds the index of a result row in the searchbar.
 *
 * @param {string} pattern
 *   Substring of the desired row's textContent.
 * @returns {?number}
 *   The index of the matching row or null of no row matches.
 */
function findRowIndex(pattern) {
  for (let i = 0; i < 10; i++) {
    let row = SearchbarTestUtils.getRowAt(window, i);
    if (row?.textContent.includes(pattern)) {
      return i;
    }
  }
  return null;
}

add_setup(async function () {
  SearchUITestUtils.init(this);
  searchbar = document.getElementById("searchbar-new");

  await SearchTestUtils.updateRemoteSettingsConfig([
    { identifier: "engine1" },
    { identifier: "engine2" },
  ]);
  engine1 = SearchService.defaultEngine;
  engine2 = SearchService.getEngineById("engine2");

  let url = getRootDirectory(gTestPath) + "../searchSuggestionEngine.xml";
  suggestionEngine = await SearchTestUtils.installOpenSearchEngine({ url });
});

add_task(async function test_plainQuery() {
  resetTelemetry();

  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "simple query",
  });
  EventUtils.synthesizeKey("KEY_Enter");
  await BrowserTestUtils.browserLoaded(gBrowser);

  await SearchUITestUtils.assertSAPTelemetry({
    engineName: engine1.name,
    engineId: engine1.id,
    source: "searchbar",
    count: 1,
  });
  searchbar.handleRevert();
});

add_task(async function test_pasteAndGo() {
  resetTelemetry();
  let searchTerm = "another query";

  await SimpleTest.promiseClipboardChange(searchTerm, () => {
    clipboardHelper.copyString(searchTerm);
  });
  await SearchbarTestUtils.activateContextMenuItem(window, "paste-and-go");
  await BrowserTestUtils.browserLoaded(gBrowser);

  await SearchUITestUtils.assertSAPTelemetry({
    engineName: engine1.name,
    engineId: engine1.id,
    source: "searchbar",
    count: 1,
  });
  searchbar.handleRevert();
});

add_task(async function test_searchMode() {
  resetTelemetry();

  info("Enter search mode for engine2.");
  await SearchbarTestUtils.activateSearchModeSwitcherItem(
    window,
    "panel-item[data-engine-id=engine2]"
  );

  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "kitten",
  });
  EventUtils.synthesizeKey("KEY_Enter");
  await BrowserTestUtils.browserLoaded(gBrowser);

  await SearchUITestUtils.assertSAPTelemetry({
    engineName: engine2.name,
    engineId: engine2.id,
    source: "searchbar",
    count: 1,
  });

  searchbar.handleRevert();
});

add_task(async function test_suggestionClick() {
  resetTelemetry();
  await SearchService.setDefault(
    suggestionEngine,
    SearchService.CHANGE_REASON.UNKNOWN
  );

  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "fox",
  });
  // suggestionEngine suggests query + "foo".
  let rowIndex = findRowIndex("foxfoo");
  let row = SearchbarTestUtils.getRowAt(window, rowIndex);
  info("Clicking the searchbar suggestion.");
  EventUtils.synthesizeMouseAtCenter(row, {});
  await BrowserTestUtils.browserLoaded(gBrowser);

  await SearchUITestUtils.assertSAPTelemetry({
    engineName: suggestionEngine.name,
    source: "searchbar",
    count: 1,
  });
});

add_task(async function test_suggestionEnter() {
  resetTelemetry();

  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "foo",
  });
  info("Clicking the searchbar suggestion.");
  // suggestionEngine suggests query + "foo".
  let rowIndex = findRowIndex("foofoo");
  for (let i = 0; i <= rowIndex; i++) {
    EventUtils.synthesizeKey("KEY_ArrowDown");
  }
  EventUtils.synthesizeKey("KEY_Enter");
  await BrowserTestUtils.browserLoaded(gBrowser);

  await SearchUITestUtils.assertSAPTelemetry({
    engineName: suggestionEngine.name,
    source: "searchbar",
    count: 1,
  });

  await SearchService.setDefault(engine1, SearchService.CHANGE_REASON.UNKNOWN);
});
