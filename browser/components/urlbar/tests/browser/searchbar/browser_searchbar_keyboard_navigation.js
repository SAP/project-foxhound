/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const QUERY = "kitten";

let searchbar;
let widgetAfterSearchbar;

add_setup(async function () {
  searchbar = document.getElementById("searchbar-new");
  await SearchTestUtils.updateRemoteSettingsConfig([
    { identifier: "engine1" },
    { identifier: "engine2" },
  ]);

  // Place a widget after the searchbar to test the tab order.
  let id = "my-widget-id";
  CustomizableUI.createWidget({
    id,
    type: "button",
    removable: true,
    defaultArea: CustomizableUI.AREA_NAVBAR,
  });

  CustomizableUI.addWidgetToArea(
    id,
    CustomizableUI.AREA_NAVBAR,
    CustomizableUI.getPlacementOfWidget("search-container").position + 1
  );
  widgetAfterSearchbar = document.getElementById(id);

  registerCleanupFunction(() => {
    CustomizableUI.destroyWidget(id);
  });
});

add_task(async function test_tabOrder() {
  let searchModeSwitcher = searchbar.querySelector(".searchmode-switcher");
  searchbar.focus();
  Assert.ok(searchbar.focused);

  EventUtils.synthesizeKey("KEY_Tab");
  EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true });
  Assert.ok(searchbar.focused);

  EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true });
  Assert.equal(document.activeElement, searchModeSwitcher);
  EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true });
  Assert.ok(gURLBar.focused);
  EventUtils.synthesizeKey("KEY_Tab");
  EventUtils.synthesizeKey("KEY_Tab");
  Assert.ok(searchbar.focused);

  EventUtils.sendString(QUERY);
  EventUtils.synthesizeKey("KEY_Tab");
  Assert.equal(
    document.activeElement,
    widgetAfterSearchbar,
    "Skips revert button and go button"
  );
  searchbar.handleRevert();
});

add_task(async function test_openCloseResultsPanel() {
  await SearchbarTestUtils.promisePopupOpen(window, () => {
    searchbar.focus();
    EventUtils.sendString(QUERY);
  });
  Assert.ok(searchbar.view.isOpen, "Panel opens when typing");

  EventUtils.synthesizeKey("KEY_ArrowLeft");
  EventUtils.synthesizeKey("KEY_ArrowRight");
  Assert.ok(searchbar.view.isOpen, "Panel stays open when moving caret");

  let loadPromise;
  await SearchbarTestUtils.promisePopupClose(window, async () => {
    EventUtils.synthesizeKey("KEY_Enter");
    loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
  });
  Assert.ok(!searchbar.view.isOpen, "Panel closes when opening result");
  await loadPromise;
  searchbar.handleRevert();

  await SearchbarTestUtils.promisePopupOpen(window, () => {
    searchbar.focus();
    EventUtils.sendString(QUERY);
  });
  await SearchbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  await SearchbarTestUtils.promisePopupOpen(window, () => {
    EventUtils.synthesizeKey("KEY_ArrowDown");
  });
  Assert.ok(searchbar.view.isOpen, "Arrow down opens popup");
  await SearchbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });
  Assert.ok(!searchbar.view.isOpen, "Escape closes popup");
  EventUtils.synthesizeKey("KEY_Escape");
  Assert.ok(!searchbar.value, "Searchbar was cleared after escape");
  Assert.ok(searchbar.focused, "Searchbar is still focused");
  EventUtils.synthesizeKey("KEY_Escape");
  Assert.equal(
    document.activeElement,
    gBrowser.selectedBrowser,
    "Content was focused"
  );

  await SearchbarTestUtils.formHistory.clear();
});

add_task(async function test_refocusWindowDoesntOpenPanel() {
  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: QUERY,
  });
  let win;
  await SearchbarTestUtils.promisePopupClose(window, async () => {
    win = await BrowserTestUtils.openNewBrowserWindow();
  });
  Assert.ok(!searchbar.view.isOpen, "Focusing other window closes panel");

  await BrowserTestUtils.closeWindow(win);

  // Wait a few ticks to allow any handlers to show the panel.
  await TestUtils.waitForTick();
  await TestUtils.waitForTick();
  await TestUtils.waitForTick();
  Assert.ok(!searchbar.view.isOpen, "Panel stays closed on refocus");
});

add_task(async function test_navigateResults() {
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
  Assert.equal(
    SearchbarTestUtils.getSelectedRowIndex(window),
    0,
    "The search result should be selected initially"
  );

  EventUtils.synthesizeKey("KEY_ArrowDown");
  Assert.equal(
    SearchbarTestUtils.getSelectedRowIndex(window),
    1,
    "The search history result is selected"
  );

  EventUtils.synthesizeKey("KEY_ArrowDown");
  Assert.equal(
    SearchbarTestUtils.getSelectedRowIndex(window),
    0,
    "Wrapped around and selected the search result again"
  );

  EventUtils.synthesizeKey("KEY_ArrowDown");
  await SearchbarTestUtils.promisePopupClose(window, async () => {
    EventUtils.synthesizeKey("KEY_Enter");
    await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
  });
  Assert.equal(searchbar.value, QUERY, "Searched for the selected result");

  searchbar.handleRevert();
  await SearchbarTestUtils.formHistory.clear();
});

add_task(async function test_searchModeSwitcher() {
  await SearchbarTestUtils.openSearchModeSwitcher(window, () => {
    searchbar.focus();
    EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true });
    EventUtils.synthesizeKey("KEY_ArrowDown");
  });
  Assert.ok(true, "Search mode switcher opens on arrow down");

  EventUtils.synthesizeKey("KEY_ArrowDown");
  EventUtils.synthesizeKey("KEY_Enter");

  await SearchbarTestUtils.searchModeSwitcherPopupClosed(window);
  Assert.ok(true, "Selecting an engine closes the popup");

  await SearchbarTestUtils.assertSearchMode(window, {
    engineName: "engine2",
    isGeneralPurposeEngine: true,
    source: UrlbarUtils.RESULT_SOURCE.SEARCH,
    isPreview: false,
    entry: "searchbutton",
  });
  EventUtils.synthesizeKey("KEY_Backspace");
  await SearchbarTestUtils.assertSearchMode(window, null);
});
