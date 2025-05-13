/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
  These tests check the behavior of the Urlbar when search terms are shown
  and the tab with the default SERP moves from one window to another.

  Unlike other searchTerm tests, these modify the currentURI to ensure
  that the currentURI has a different spec than the default SERP so that
  the search terms won't show if the originalURI wasn't properly copied
  during the tab swap.
*/

let originalEngine, defaultTestEngine;

// The main search keyword used in tests
const SEARCH_STRING = "chocolate cake";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.showSearchTerms.featureGate", true]],
  });

  await SearchTestUtils.installSearchExtension({
    name: "MozSearch",
    search_url: "https://www.example.com/",
    search_url_get_params: "q={searchTerms}&pc=fake_code",
  });
  defaultTestEngine = Services.search.getEngineByName("MozSearch");

  originalEngine = await Services.search.getDefault();
  await Services.search.setDefault(
    defaultTestEngine,
    Ci.nsISearchService.CHANGE_REASON_UNKNOWN
  );

  registerCleanupFunction(async function () {
    await Services.search.setDefault(
      originalEngine,
      Ci.nsISearchService.CHANGE_REASON_UNKNOWN
    );
    await PlacesUtils.history.clear();
  });
});

async function searchWithTab(
  searchString,
  tab = null,
  engine = defaultTestEngine
) {
  if (!tab) {
    tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  }

  let [expectedSearchUrl] = UrlbarUtils.getSearchQueryUrl(engine, searchString);
  let browserLoadedPromise = BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    false,
    expectedSearchUrl
  );

  gURLBar.focus();
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    waitForFocus,
    value: searchString,
    fireInputEvent: true,
  });
  EventUtils.synthesizeKey("KEY_Enter");
  await browserLoadedPromise;

  return { tab, expectedSearchUrl };
}

// Move a tab showing the search term into its own window.
add_task(async function move_tab_into_new_window() {
  let { tab, expectedSearchUrl } = await searchWithTab(SEARCH_STRING);

  // Mock the default SERP modifying the existing url
  // so that the originalURI and currentURI differ.
  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [expectedSearchUrl],
    async url => {
      content.history.pushState({}, "", url + "&pc2=firefox");
    }
  );

  // Move the tab into its own window.
  let newWindow = gBrowser.replaceTabWithWindow(tab);
  await BrowserTestUtils.waitForEvent(tab.linkedBrowser, "SwapDocShells");

  assertSearchStringIsInUrlbar(SEARCH_STRING, { win: newWindow });

  // Clean up.
  await BrowserTestUtils.closeWindow(newWindow);
});

// Move a tab from its own window into an existing window.
add_task(async function move_tab_into_existing_window() {
  // Load a second window with the default SERP.
  let win = await BrowserTestUtils.openNewBrowserWindow({ remote: true });
  let browser = win.gBrowser.selectedBrowser;
  let tab = win.gBrowser.tabs[0];

  // Load the default SERP into the second window.
  let [expectedSearchUrl] = UrlbarUtils.getSearchQueryUrl(
    defaultTestEngine,
    SEARCH_STRING
  );
  let browserLoadedPromise = BrowserTestUtils.browserLoaded(
    browser,
    false,
    expectedSearchUrl
  );
  BrowserTestUtils.startLoadingURIString(browser, expectedSearchUrl);
  await browserLoadedPromise;

  // Mock the default SERP modifying the existing url
  // so that the originalURI and currentURI differ.
  await SpecialPowers.spawn(browser, [expectedSearchUrl], async url => {
    content.history.pushState({}, "", url + "&pc2=firefox");
  });

  // Make the first window adopt and switch to that tab.
  tab = gBrowser.adoptTab(tab);
  await BrowserTestUtils.switchTab(gBrowser, tab);
  assertSearchStringIsInUrlbar(SEARCH_STRING);

  // Clean up.
  BrowserTestUtils.removeTab(tab);
});
