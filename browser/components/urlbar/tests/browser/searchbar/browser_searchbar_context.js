/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let searchbar;

add_setup(async function () {
  searchbar = document.getElementById("searchbar-new");

  await SearchTestUtils.updateRemoteSettingsConfig([{ identifier: "engine1" }]);
});

add_task(async function test_clearSearchHistoryAvailability() {
  await UrlbarTestUtils.withContextMenu(window, popup => {
    let mozInputBox = popup.parentNode;
    let menuitem = mozInputBox.getMenuItem("clear-search-history");
    Assert.ok(!menuitem, "Menuitem is not available in urlbar");
  });
  await SearchbarTestUtils.withContextMenu(window, popup => {
    let mozInputBox = popup.parentNode;
    let menuitem = mozInputBox.getMenuItem("clear-search-history");
    Assert.ok(menuitem, "Menuitem is available in searchbar");
  });
});

add_task(async function test_clearSearchHistory() {
  // Add one form history entry by actually searching.
  searchbar.focus();
  EventUtils.sendString("search term 1");
  let promise = Promise.all([
    SearchbarTestUtils.formHistory.promiseChanged(),
    BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser),
  ]);
  EventUtils.synthesizeKey("KEY_Enter");
  await promise;
  searchbar.handleRevert();

  // Add one form history entry synthetically.
  await SearchbarTestUtils.formHistory.add(["search term 2"]);

  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "",
  });

  Assert.equal(
    SearchbarTestUtils.getResultCount(window),
    2,
    "Both form history entries are suggested"
  );

  info("Clearing form history via context menu.");
  promise = SearchbarTestUtils.formHistory.promiseChanged();
  await SearchbarTestUtils.activateContextMenuItem(
    window,
    "clear-search-history"
  );
  await promise;

  // Add something back so the results panel will appear.
  await SearchbarTestUtils.formHistory.add(["search term 3"]);
  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "",
  });
  Assert.equal(
    SearchbarTestUtils.getResultCount(window),
    1,
    "Form history entries were removed"
  );

  await SearchbarTestUtils.formHistory.clear();
});
