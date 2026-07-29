/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { SearchTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/SearchTestUtils.sys.mjs"
);

const MAIN_PREF = "browser.search.suggest.enabled";
const URLBAR_PREF = "browser.urlbar.suggest.searches";
const TRENDING_PREF = "browser.urlbar.trending.featureGate";

const TRENDING_CHECKBOX_ID = "showTrendingSuggestionsCheckbox";
const SUGGESTIONED_CHECKBOX_ID = "suggestionsInSearchFieldsCheckbox";

SearchTestUtils.init(this);

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      [MAIN_PREF, true],
      [URLBAR_PREF, true],
      [TRENDING_PREF, true],
    ],
  });

  await SearchTestUtils.installSearchExtension({
    name: "engine1",
    search_url: "https://example.com/engine1",
    search_url_get_params: "search={searchTerms}",
  });
  const defaultEngine = await SearchService.getDefault();

  registerCleanupFunction(async () => {
    await SearchService.setDefault(
      defaultEngine,
      SearchService.CHANGE_REASON.UNKNOWN
    );
  });
});

add_task(async function testSuggestionsDisabled() {
  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });
  let doc = gBrowser.selectedBrowser.contentDocument;
  let trendingCheckbox = doc.getElementById(TRENDING_CHECKBOX_ID);
  let suggestionsCheckbox = doc.getElementById(SUGGESTIONED_CHECKBOX_ID);

  Assert.ok(trendingCheckbox.checked, "Checkbox should be visible and checked");
  Assert.ok(!trendingCheckbox.disabled, "Checkbox should not be disabled");

  // Disable search suggestions.
  suggestionsCheckbox.click();

  await BrowserTestUtils.waitForCondition(
    () => trendingCheckbox.disabled,
    "Trending checkbox should be disabled when search suggestions are disabled"
  );

  // Clean up.
  Services.prefs.clearUserPref(MAIN_PREF);
  gBrowser.removeCurrentTab();
});

add_task(async function testNonTrendingEngine() {
  // Set engine that does not support trending suggestions as default.
  const engine1 = SearchService.getEngineByName("engine1");
  SearchService.setDefault(engine1, SearchService.CHANGE_REASON.UNKNOWN);
  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });
  let doc = gBrowser.selectedBrowser.contentDocument;
  let trendingCheckbox = doc.getElementById(TRENDING_CHECKBOX_ID);

  Assert.ok(
    trendingCheckbox.disabled,
    "Checkbox should be disabled when an engine that doesnt support trending suggestions is default"
  );
  gBrowser.removeCurrentTab();
});

add_task(async function testEnabledTrendingEngine() {
  const engine1 = SearchService.getEngineByName("Google");
  SearchService.setDefault(engine1, SearchService.CHANGE_REASON.UNKNOWN);
  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });
  let doc = gBrowser.selectedBrowser.contentDocument;
  let trendingCheckbox = doc.getElementById(TRENDING_CHECKBOX_ID);

  Assert.ok(
    !trendingCheckbox.disabled,
    "Checkbox should not be disabled when an engine that supports trending suggestions is default"
  );
  gBrowser.removeCurrentTab();
});
