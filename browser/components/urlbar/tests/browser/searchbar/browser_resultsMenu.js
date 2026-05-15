/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_SEARCHES = ["Bob Vylan", "Glasgow Weather", "Joy Formidable"];

let searchbar;

async function addSearches() {
  for (let search of TEST_SEARCHES) {
    let historyUpdated = TestUtils.topicObserved("satchel-storage-changed");
    searchbar.focus();
    EventUtils.sendString(search);
    EventUtils.synthesizeKey("KEY_Enter");
    await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
    searchbar.handleRevert();
    await historyUpdated;
  }
}

add_setup(async function () {
  searchbar = document.getElementById("searchbar-new");
  await SearchTestUtils.updateRemoteSettingsConfig([{ identifier: "engine" }]);
  await addSearches();
});

add_task(async function testDismissRecentSearch() {
  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "",
  });

  let row = SearchbarTestUtils.getRowAt(window, 0);
  Assert.equal(row.result.providerName, "UrlbarProviderRecentSearches");
  Assert.equal(
    SearchbarTestUtils.getResultCount(window),
    TEST_SEARCHES.length,
    "All recent searches are visible"
  );
  Assert.equal(
    row.result.payload.title,
    TEST_SEARCHES[2],
    "Most recent search is first"
  );

  await SearchbarTestUtils.openResultMenuAndClickItem(window, "dismiss", {
    resultIndex: 0,
  });
  Assert.ok(
    searchbar.view.isOpen,
    "The view should remain open after clicking the command"
  );
  await SearchbarTestUtils.promisePopupClose(window, () => searchbar.blur());

  // Do the same search again. The suggestion should not appear.
  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "",
  });
  row = SearchbarTestUtils.getRowAt(window, 0);
  Assert.equal(
    SearchbarTestUtils.getResultCount(window),
    TEST_SEARCHES.length - 1,
    "Suggestion did not appear"
  );
  Assert.equal(
    row.result.payload.title,
    TEST_SEARCHES[1],
    "Second most recent search is first now"
  );
});

// This is the same test as before but the result we're deleting is from
// UrlbarProviderSearchSuggestions instead of UrlbarProviderRecentSearches.
add_task(async function testDismisSearchSuggestion() {
  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_SEARCHES[1].slice(0, 5),
  });

  // First result is the heuristic result, so we look at the second one.
  let row = SearchbarTestUtils.getRowAt(window, 1);
  Assert.equal(
    row.result.providerName,
    "UrlbarProviderSearchSuggestions",
    "Found the result from form history"
  );
  Assert.equal(row.result.payload.title, TEST_SEARCHES[1], "Is the right one");
  await SearchbarTestUtils.openResultMenuAndClickItem(window, "dismiss", {
    resultIndex: 1,
  });

  // We need a keyup event to avoid breaking other tests due to bug 2017838.
  searchbar.focus();
  EventUtils.synthesizeKey("KEY_Escape");

  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: TEST_SEARCHES[1].slice(0, 5),
  });
  Assert.equal(
    SearchbarTestUtils.getResultCount(window),
    1,
    "Only suggests the heuristic result"
  );

  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "",
  });
  row = SearchbarTestUtils.getRowAt(window, 0);
  Assert.equal(
    SearchbarTestUtils.getResultCount(window),
    TEST_SEARCHES.length - 2,
    "Suggestion did not appear"
  );
  Assert.equal(
    row.result.payload.title,
    TEST_SEARCHES[0],
    "Second most recent search is first now"
  );
});
