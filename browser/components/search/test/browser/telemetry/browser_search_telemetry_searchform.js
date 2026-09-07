/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests the sap.search_form_counts event on
 * the old and new searchbars and the urlbar.
 */

const CONFIG = [
  {
    identifier: "defaultEngine",
  },
  {
    identifier: "second_engine",
    base: {
      name: "Second Engine",
      urls: {
        search_form: {
          base: "https://www.example.com/searchform",
        },
      },
    },
  },
];
const TEST_ENGINE_BASENAME = "testEngine.xml";
const TEST_ENGINE_NAME = "Foo";

function findOneOff(engineName) {
  let oneOffButtons = document.getElementById("PopupSearchAutoComplete")
    .oneOffButtons.buttons;
  let oneOffChildren = [...oneOffButtons.children];
  let oneOffButton = oneOffChildren.find(
    node => node.engine?.name == engineName
  );
  Assert.notEqual(
    oneOffButton,
    undefined,
    `One-off for ${engineName} should exist`
  );
  return oneOffButton;
}

async function openSearchbarPopup(searchBarValue) {
  let searchBar = document.getElementById("searchbar");

  searchBar.focus();
  searchBar.value = searchBarValue;
  if (searchBar.textbox.popupOpen) {
    info("searchPanel is already open");
    return;
  }
  let searchPopup = document.getElementById("PopupSearchAutoComplete");
  let shownPromise = BrowserTestUtils.waitForEvent(searchPopup, "popupshown");

  let searchIcon = searchBar.querySelector(".searchbar-search-button");
  let oneOffInstance = searchPopup.oneOffButtons;
  let builtPromise = BrowserTestUtils.waitForEvent(oneOffInstance, "rebuild");

  info("Opening search panel");
  EventUtils.synthesizeMouseAtCenter(searchIcon, {});
  await Promise.all([shownPromise, builtPromise]);
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.scotchBonnet.enableOverride", true]],
  });
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG);
  await SearchTestUtils.installOpenSearchEngine({
    url: getRootDirectory(gTestPath) + "../" + TEST_ENGINE_BASENAME,
  });
  await gCUITestUtils.addSearchBar();
  // Add something to form history so the searchbar results panel opens.
  await SearchbarTestUtils.formHistory.add(["kitten"]);

  registerCleanupFunction(async () => {
    gCUITestUtils.removeSearchBar();
    await SearchbarTestUtils.formHistory.clear();
    resetTelemetry();
  });
});

add_task(async function test_appProvidedOldSearchbar() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.search.widget.new", false]],
  });
  await TestUtils.waitForCondition(
    () => BrowserTestUtils.isVisible(document.getElementById("searchbar")),
    "Waiting for old searchbar to become visible"
  );
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  await openSearchbarPopup("");
  let oneOff = findOneOff("Second Engine");
  EventUtils.synthesizeMouseAtCenter(oneOff, { shiftKey: true });
  await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

  let events = Glean.sap.searchFormCounts.testGetValue();
  Assert.equal(events.length, 1, "Event was recorded.");
  Assert.equal(events[0].extra.source, "searchbar", "Source is correct");
  Assert.equal(events[0].extra.provider_id, "second_engine", "Id is correct");

  resetTelemetry();
  BrowserTestUtils.removeTab(tab);
  // Keeping pref env for next test.
});

add_task(async function test_extensionOldSearchbar() {
  // Old searchbar is still enabled from last test.
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  await openSearchbarPopup("");
  let oneOff = findOneOff(TEST_ENGINE_NAME);
  EventUtils.synthesizeMouseAtCenter(oneOff, { shiftKey: true });
  await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

  let events = Glean.sap.searchFormCounts.testGetValue();
  Assert.equal(events.length, 1, "Event was recorded");
  Assert.equal(events[0].extra.source, "searchbar", "Source is correct");
  Assert.equal(events[0].extra.provider_id, "other", "Id is correct");

  resetTelemetry();
  BrowserTestUtils.removeTab(tab);
  // Keeping pref env for next test.
});

add_task(async function test_actualSearchOldSearchbar() {
  // Old searchbar is still enabled from last test.
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  // Enter something in the searchbar to start an actual search.
  await openSearchbarPopup("foo");
  let oneOff = findOneOff("Second Engine");
  EventUtils.synthesizeMouseAtCenter(oneOff, { shiftKey: true });
  await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

  let events = Glean.sap.searchFormCounts.testGetValue();
  // Since we used the one off button to search (not to open the search form),
  // no event should be recorded in `sap.searchFormCounts`.
  Assert.equal(events, null, "No search form event is recorded for searches");

  resetTelemetry();
  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_appProvided() {
  for (let sap of ["urlbar", "searchbar"]) {
    let testUtils = sap == "urlbar" ? UrlbarTestUtils : SearchbarTestUtils;
    let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
    let popup = await testUtils.openSearchModeSwitcher(window);
    info("Choose Second Engine in the unified search button popup.");
    let item = popup.querySelector(
      'panel-item[data-engine-name="Second Engine"]'
    );
    let popupHidden = testUtils.searchModeSwitcherPopupClosed(window);
    EventUtils.synthesizeMouseAtCenter(item, { shiftKey: true });
    await popupHidden;
    await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

    let events = Glean.sap.searchFormCounts.testGetValue();
    Assert.equal(events.length, 1, "Event was recorded");
    Assert.equal(events[0].extra.source, sap, "Source is correct");
    Assert.equal(events[0].extra.provider_id, "second_engine", "Id is correct");

    resetTelemetry();
    BrowserTestUtils.removeTab(tab);
  }
});

add_task(async function test_extension() {
  for (let sap of ["urlbar", "searchbar"]) {
    let testUtils = sap == "urlbar" ? UrlbarTestUtils : SearchbarTestUtils;
    let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
    let popup = await testUtils.openSearchModeSwitcher(window);
    info("Choose extension engine in the unified search button popup.");
    let item = popup.querySelector(
      `panel-item[data-engine-name="${TEST_ENGINE_NAME}"]`
    );
    let popupHidden = testUtils.searchModeSwitcherPopupClosed(window);
    EventUtils.synthesizeMouseAtCenter(item, { shiftKey: true });
    await popupHidden;
    await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

    let events = Glean.sap.searchFormCounts.testGetValue();
    Assert.equal(events.length, 1, "Event was recorded");
    Assert.equal(events[0].extra.source, sap, "Source is correct");
    Assert.equal(events[0].extra.provider_id, "other");

    resetTelemetry();
    BrowserTestUtils.removeTab(tab);
  }
});

add_task(async function test_actualSearch() {
  for (let sap of ["urlbar", "searchbar"]) {
    let testUtils = sap == "urlbar" ? UrlbarTestUtils : SearchbarTestUtils;
    let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
    await testUtils.promiseAutocompleteResultPopup({
      window,
      value: "foo",
    });
    let popup = await testUtils.openSearchModeSwitcher(window);
    info("Shift-click Second Engine in the unified search button popup.");
    let item = popup.querySelector(
      'panel-item[data-engine-name="Second Engine"]'
    );
    let popupHidden = testUtils.searchModeSwitcherPopupClosed(window);
    EventUtils.synthesizeMouseAtCenter(item, { shiftKey: true });
    await popupHidden;
    await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

    let events = Glean.sap.searchFormCounts.testGetValue();
    // Since we used the unified search button to search (not to open the search
    // form), no event should be recorded in `sap.searchFormCounts`.
    Assert.equal(events, null, "No search form event was recorded");

    resetTelemetry();
    BrowserTestUtils.removeTab(tab);
  }
});
