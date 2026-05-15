/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

const { ActionsProviderQuickActions } = ChromeUtils.importESModule(
  "moz-src:///browser/components/urlbar/ActionsProviderQuickActions.sys.mjs"
);

const { CustomizableUITestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/CustomizableUITestUtils.sys.mjs"
);

const CONFIG = [
  {
    identifier: "default-engine",
    base: {
      urls: {
        search: { base: "https://example.com", searchTermParamName: "q" },
      },
    },
  },
  {
    identifier: "non-default-engine",
    base: {
      urls: {
        search: { base: "https://example.net", searchTermParamName: "q" },
      },
    },
  },
  {
    identifier: "config-engine",
    base: {
      urls: {
        search: { base: "https://example.org", searchTermParamName: "q" },
      },
    },
    // Only enable in particular locale so it is not installed by default.
    variants: [{ environment: { locales: ["sl"] } }],
  },
  {
    identifier: "de-engine",
    base: {
      urls: {
        search: { base: "https://mochi.test/", searchTermParamName: "q" },
      },
    },
    // Only enable in particular locale so it is not installed by default.
    variants: [{ environment: { locales: ["de"] } }],
  },
];

let loadUri = async uri => {
  gBrowser.selectedBrowser.stop();
  return BrowserTestUtils.loadURIString({
    browser: gBrowser.selectedBrowser,
    uriString: uri,
    wantLoad: uri,
  });
};

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.scotchBonnet.enableOverride", true],
      ["browser.urlbar.quickactions.timesToShowOnboardingLabel", 0],
    ],
  });

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref(
      "browser.urlbar.quickactions.timesShownOnboardingLabel"
    );
  });
});

add_task(async function test_no_engine() {
  await loadUri("https://example.org/");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "test",
  });

  Assert.greater(
    UrlbarTestUtils.getResultCount(window),
    0,
    "At least one result is shown"
  );
  await UrlbarTestUtils.promisePopupClose(window);
});

add_task(async function test_engine_match() {
  let promiseClearHistory =
    PlacesTestUtils.waitForNotification("history-cleared");
  await PlacesUtils.history.clear();
  await promiseClearHistory;
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG);
  await loadUri("https://example.org/");

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "non",
  });

  Assert.ok(
    !(await hasActions(1)),
    "Contextual result does not match because site has not been visited"
  );
  await UrlbarTestUtils.promisePopupClose(window, () => {
    gURLBar.blur();
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.net/"
  );
  BrowserTestUtils.removeTab(tab);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "non",
  });

  Assert.ok(await hasActions(1), "Contextual search is matched after visit");

  let onLoad = BrowserTestUtils.browserLoaded(
    gBrowser.selectedBrowser,
    false,
    "https://example.net/?q=test"
  );
  let btn = window.document.querySelector(".urlbarView-action-btn");
  EventUtils.synthesizeMouseAtCenter(btn, {}, window);
  EventUtils.sendString("test");
  EventUtils.synthesizeKey("KEY_Enter");

  await onLoad;
});

add_task(async function test_alias_match() {
  let newConfig = [CONFIG[0]].concat([
    {
      identifier: "alias-engine",
      base: {
        urls: {
          search: { base: "https://example.net", searchTermParamName: "q" },
        },
        aliases: ["test"],
      },
    },
  ]);
  await SearchTestUtils.updateRemoteSettingsConfig(newConfig);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "test",
  });

  let onLoad = BrowserTestUtils.browserLoaded(
    gBrowser.selectedBrowser,
    false,
    "https://example.net/?q=test"
  );

  EventUtils.synthesizeKey("KEY_Tab");
  await UrlbarTestUtils.assertSearchMode(window, {
    engineName: "alias-engine",
    entry: "keywordoffer",
    isPreview: true,
    source: 3,
  });

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.sendString("test");
    EventUtils.synthesizeKey("KEY_Enter");
  });

  await onLoad;
});

add_task(async function test_actions() {
  let testActionCalled = 0;
  await loadUri("https://example.net/");

  ActionsProviderQuickActions.addAction("testaction", {
    commands: ["example"],
    label: "quickactions-downloads2",
    onPick: () => testActionCalled++,
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "example.net",
  });

  EventUtils.synthesizeKey("KEY_Tab");
  EventUtils.synthesizeKey("KEY_Tab");
  EventUtils.synthesizeKey("KEY_Enter");
  await UrlbarTestUtils.promisePopupClose(window);

  Assert.equal(testActionCalled, 1, "Test action was called");

  info("Check whether the URI on the original tab is not changed");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(r => setTimeout(r, 100));
  Assert.equal(
    gBrowser.selectedBrowser.currentURI.spec,
    "https://example.net/"
  );

  ActionsProviderQuickActions.removeAction("testaction");
});

add_task(async function test_selectContextualSearchResult_already_installed() {
  let ext = await SearchTestUtils.installSearchExtension({
    name: "Contextual",
    search_url: "https://example.com/browser",
  });
  await AddonTestUtils.waitForSearchProviderStartup(ext);

  await loadUri("https://example.com/");

  const query = "search";
  let engine = SearchService.getEngineByName("Contextual");
  const [expectedUrl] = UrlbarUtils.getSearchQueryUrl(engine, query);

  Assert.ok(
    expectedUrl.includes(`?q=${query}`),
    "Expected URL should be a search URL"
  );

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "contextual",
  });

  let result = (await UrlbarTestUtils.waitForAutocompleteResultAt(window, 1))
    .result;
  Assert.equal(
    result.providerName,
    "UrlbarProviderGlobalActions",
    "We are shown contextual search action"
  );
  info("Focus and select the contextual search result");
  EventUtils.synthesizeKey("KEY_Tab");
  EventUtils.synthesizeKey("KEY_Enter");
  await UrlbarTestUtils.promisePopupClose(window);

  await UrlbarTestUtils.assertSearchMode(window, {
    engineName: "Contextual",
    entry: "keywordoffer",
  });

  let onLoad = BrowserTestUtils.browserLoaded(
    gBrowser.selectedBrowser,
    false,
    expectedUrl
  );

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: query,
  });
  EventUtils.synthesizeKey("KEY_Enter");
  await onLoad;

  Assert.equal(
    gBrowser.selectedBrowser.currentURI.spec,
    expectedUrl,
    "Selecting the contextual search result opens the search URL"
  );
  await UrlbarTestUtils.exitSearchMode(window, {
    clickClose: true,
    waitForSearch: false,
  });
});

add_task(async function test_tab_to_search_engine() {
  let newConfig = [CONFIG[0]].concat([
    {
      identifier: "namematch-engine",
      base: {
        urls: {
          search: { base: "https://example.net", searchTermParamName: "q" },
        },
      },
    },
  ]);
  await SearchTestUtils.updateRemoteSettingsConfig(newConfig);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "namematch",
  });

  let onLoad = BrowserTestUtils.browserLoaded(
    gBrowser.selectedBrowser,
    false,
    "https://example.net/?q=test"
  );

  EventUtils.synthesizeKey("KEY_Tab");
  await UrlbarTestUtils.assertSearchMode(window, {
    engineName: "namematch-engine",
    entry: "keywordoffer",
    isPreview: true,
    source: 3,
  });

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.sendString("test");
    EventUtils.synthesizeKey("KEY_Enter");
  });

  await onLoad;
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG);
});

add_task(async function test_dont_suggest_default_engine() {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "default",
  });

  Assert.ok(
    await hasActions(1),
    "Default engine is suggested when it matches the query"
  );

  // Load a URI from the host of the default engine.
  await loadUri("https://example.com/");

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "something",
  });

  Assert.ok(
    !(await hasActions(1)),
    "Default engine is not suggested based on current host"
  );

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });
});

add_task(async function test_dont_suggest_default_engine() {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "default",
  });

  Assert.ok(
    await hasActions(1),
    "Default engine is suggested when it matches the query"
  );

  // Load a URI from the host of the default engine.
  await loadUri("https://example.com/");

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "something",
  });

  Assert.ok(
    !(await hasActions(1)),
    "Default engine is not suggested based on current host"
  );

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });
});

add_task(async function test_onboarding() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.quickactions.timesToShowOnboardingLabel", 3]],
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "non-default",
  });

  Assert.ok(
    BrowserTestUtils.isVisible(
      window.document.querySelector(".urlbarView-press-tab-label")
    ),
    "Tip for user to press TAB to select action is visible"
  );

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });
});

add_task(async function keep_search_query_searchbar() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.search.widget.new", true]],
  });

  let gCUITestUtils = new CustomizableUITestUtils(window);
  let searchbar = await gCUITestUtils.addSearchBar();

  // Visit page where de-engine will be suggested.
  await BrowserTestUtils.loadURIString({
    browser: gBrowser.selectedBrowser,
    uriString: "https://mochi.test/",
  });

  await SearchbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "kitten",
  });

  EventUtils.synthesizeKey("KEY_Tab");
  EventUtils.synthesizeKey("KEY_Enter"); // Select "Seach with de-engine"
  await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser, {
    wantLoad: "https://mochi.test/?q=kitten",
  });

  Assert.equal(
    searchbar.value,
    "kitten",
    "Search query should stay after contextual search was executed"
  );

  gCUITestUtils.removeSearchBar();
  await SpecialPowers.popPrefEnv();
});

async function hasActions(index) {
  if (UrlbarTestUtils.getResultCount(window) <= index) {
    return false;
  }
  let result = (await UrlbarTestUtils.waitForAutocompleteResultAt(window, 1))
    .result;
  return result.providerName == "UrlbarProviderGlobalActions";
}
