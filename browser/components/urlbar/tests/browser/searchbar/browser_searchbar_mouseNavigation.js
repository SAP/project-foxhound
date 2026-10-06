/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const QUERY = "kitten";

let searchbar;
let contextMenu;

// Simulates the full set of events for a context click
function context_click(target) {
  for (let event of ["mousedown", "contextmenu"]) {
    EventUtils.synthesizeMouseAtCenter(target, { type: event, button: 2 });
  }
}

add_setup(async function () {
  searchbar = document.getElementById("searchbar-new");
  contextMenu = searchbar.querySelector("moz-input-box").menupopup;

  await SearchTestUtils.updateRemoteSettingsConfig([
    { identifier: "engine1" },
    { identifier: "engine2" },
  ]);
});

add_task(async function test_clickResult() {
  await SearchbarTestUtils.formHistory.add([QUERY]);
  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: QUERY.slice(0, 3),
  });
  Assert.equal(
    SearchbarTestUtils.getResultCount(window),
    2,
    "Expected 2 results"
  );

  let formHistoryRow = SearchbarTestUtils.getRowAt(window, 1);
  EventUtils.synthesizeMouseAtCenter(formHistoryRow, {});
  await SearchbarTestUtils.promisePopupClose(window, async () => {
    EventUtils.synthesizeKey("KEY_Enter");
    await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser, {
      wantLoad: SearchService.defaultEngine.getSubmission(QUERY).uri.spec,
    });
  });
  Assert.equal(searchbar.value, QUERY, "Searched for the selected result");

  searchbar.handleRevert();
  await SearchbarTestUtils.formHistory.clear();
});

add_task(async function test_rightClickDoesntOpenPanel() {
  // Enter something to make sure there are results and the panel can open.
  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: QUERY,
  });
  await SearchbarTestUtils.promisePopupClose(window);

  let promise = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");
  context_click(searchbar.inputField);
  await promise;
  // Wait a few ticks to allow any handlers to show the panel.
  await TestUtils.waitForTick();
  await TestUtils.waitForTick();
  await TestUtils.waitForTick();
  Assert.ok(!searchbar.view.isOpen, "Didn't open panel");

  promise = BrowserTestUtils.waitForEvent(contextMenu, "popuphidden");
  contextMenu.hidePopup();
  await promise;
});

add_task(async function test_contextMenuClosesPanel() {
  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: QUERY,
  });

  await SearchbarTestUtils.promisePopupClose(window, async () => {
    context_click(searchbar.inputField);
  });
  Assert.ok(!searchbar.view.isOpen, "Panel was closed");

  let promise = BrowserTestUtils.waitForEvent(contextMenu, "popuphidden");
  contextMenu.hidePopup();
  await promise;
});

add_task(async function test_goDoesntOpenPanel() {
  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: QUERY,
  });
  await SearchbarTestUtils.promisePopupClose(window);
  EventUtils.synthesizeMouseAtCenter(searchbar.goButton, {});
  await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
  Assert.ok(!searchbar.view.isOpen, "Go button didn't open panel");

  await SearchbarTestUtils.formHistory.clear();
});

add_task(async function test_focusChangeClosesPopup() {
  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: QUERY,
  });

  await SearchbarTestUtils.promisePopupClose(window, async () => {
    EventUtils.synthesizeMouseAtCenter(gURLBar.inputField, {});
  });
  Assert.ok(!searchbar.view.isOpen, "Clicking something else closes popup");
  await SearchbarTestUtils.promisePopupOpen(window, async () => {
    EventUtils.synthesizeMouseAtCenter(searchbar.inputField, {});
  });
  Assert.ok(searchbar.view.isOpen, "Clicking searchbar re-opens popup");
});
