/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
  UrlbarPrefs: "moz-src:///browser/components/urlbar/UrlbarPrefs.sys.mjs",
});

let ENABLED_PREF = "recentsearches.featureGate";
let EXPIRE_PREF = "recentsearches.expirationMs";
let SUGGESTS_PREF = "suggest.recentsearches";

let TEST_SEARCHES = ["Bob Vylan", "Glasgow Weather", "Joy Formidable"];
let defaultEngine;

function makeRecentSearchResult(context, engine, suggestion) {
  let result = makeFormHistoryResult(context, {
    suggestion,
    engineName: engine.name,
  });
  delete result.payload.lowerCaseSuggestion;
  return result;
}

async function addSearches(searches = TEST_SEARCHES) {
  // Add the searches sequentially so they get a new timestamp
  // and we can order by the time added.
  for (let search of searches) {
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(r => setTimeout(r, 10));
    await UrlbarTestUtils.formHistory.add([
      { value: search, source: defaultEngine.name },
    ]);
  }
}

add_setup(async () => {
  defaultEngine = await addTestSuggestionsEngine();
  await SearchService.setDefault(
    defaultEngine,
    SearchService.CHANGE_REASON.ADDON_INSTALL
  );

  let oldCurrentEngine = SearchService.defaultEngine;

  registerCleanupFunction(async () => {
    await SearchService.setDefault(
      oldCurrentEngine,
      SearchService.CHANGE_REASON.ADDON_INSTALL
    );
    UrlbarPrefs.clear(ENABLED_PREF);
    UrlbarPrefs.clear(SUGGESTS_PREF);
  });
});

add_task(async function test_enabled() {
  UrlbarPrefs.set(ENABLED_PREF, true);
  UrlbarPrefs.set(SUGGESTS_PREF, true);
  await addSearches();
  let context = createContext("", { isPrivate: false });
  await check_results({
    context,
    matches: [
      makeRecentSearchResult(context, defaultEngine, "Joy Formidable"),
      makeRecentSearchResult(context, defaultEngine, "Glasgow Weather"),
      makeRecentSearchResult(context, defaultEngine, "Bob Vylan"),
    ],
  });
});

add_task(async function test_disabled() {
  UrlbarPrefs.set(ENABLED_PREF, false);
  UrlbarPrefs.set(SUGGESTS_PREF, false);
  await addSearches();
  await check_results({
    context: createContext("", { isPrivate: false }),
    matches: [],
  });
});

add_task(async function test_most_recent_shown() {
  UrlbarPrefs.set(ENABLED_PREF, true);
  UrlbarPrefs.set(SUGGESTS_PREF, true);

  await addSearches(Array.from(Array(10).keys()).map(i => `Search ${i}`));
  let context = createContext("", { isPrivate: false });
  await check_results({
    context,
    matches: [
      makeRecentSearchResult(context, defaultEngine, "Search 9"),
      makeRecentSearchResult(context, defaultEngine, "Search 8"),
      makeRecentSearchResult(context, defaultEngine, "Search 7"),
      makeRecentSearchResult(context, defaultEngine, "Search 6"),
      makeRecentSearchResult(context, defaultEngine, "Search 5"),
    ],
  });
  await UrlbarTestUtils.formHistory.clear();
});

add_task(async function test_per_engine() {
  UrlbarPrefs.set(ENABLED_PREF, true);
  UrlbarPrefs.set(SUGGESTS_PREF, true);

  let oldEngine = defaultEngine;
  await addSearches();

  defaultEngine = await addTestSuggestionsEngine(null, {
    name: "NewTestEngine",
  });
  await SearchService.setDefault(
    defaultEngine,
    SearchService.CHANGE_REASON.ADDON_INSTALL
  );

  await addSearches();

  let context = createContext("", {
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [
      makeRecentSearchResult(context, defaultEngine, "Joy Formidable"),
      makeRecentSearchResult(context, defaultEngine, "Glasgow Weather"),
      makeRecentSearchResult(context, defaultEngine, "Bob Vylan"),
    ],
  });

  [defaultEngine, oldEngine] = [oldEngine, defaultEngine];
  await SearchService.setDefault(
    defaultEngine,
    SearchService.CHANGE_REASON.ADDON_INSTALL
  );

  info("We only show searches made since last default engine change");
  context = createContext("", { isPrivate: false });
  await check_results({
    context,
    matches: [],
  });
  info("We show recent searches of all engines in the searchbar");
  context = createContext("", {
    isPrivate: false,
    sapName: "searchbar",
  });
  await check_results({
    context,
    matches: [
      makeRecentSearchResult(context, defaultEngine, "Joy Formidable"),
      makeRecentSearchResult(context, defaultEngine, "Glasgow Weather"),
      makeRecentSearchResult(context, defaultEngine, "Bob Vylan"),
    ],
  });
  info("Use engine from searchmode in searchbar");
  context = createContext("", {
    isPrivate: false,
    sapName: "searchbar",
    searchMode: { engineName: oldEngine.name },
  });
  await check_results({
    context,
    matches: [
      makeRecentSearchResult(context, oldEngine, "Joy Formidable"),
      makeRecentSearchResult(context, oldEngine, "Glasgow Weather"),
      makeRecentSearchResult(context, oldEngine, "Bob Vylan"),
    ],
  });
  await UrlbarTestUtils.formHistory.clear();
});

add_task(async function test_expiry() {
  UrlbarPrefs.set(ENABLED_PREF, true);
  UrlbarPrefs.set(SUGGESTS_PREF, true);
  await addSearches();
  let context = createContext("", { isPrivate: false });
  await check_results({
    context,
    matches: [
      makeRecentSearchResult(context, defaultEngine, "Joy Formidable"),
      makeRecentSearchResult(context, defaultEngine, "Glasgow Weather"),
      makeRecentSearchResult(context, defaultEngine, "Bob Vylan"),
    ],
  });

  let shortExpiration = 100;
  UrlbarPrefs.set(EXPIRE_PREF, shortExpiration.toString());
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(r => setTimeout(r, shortExpiration * 2));

  await check_results({
    context: createContext("", { isPrivate: false }),
    matches: [],
  });

  // On the searchbar, EXPIRE_PREF should be ignored.
  await check_results({
    context: createContext("", { isPrivate: false, sapName: "searchbar" }),
    matches: [
      makeRecentSearchResult(context, defaultEngine, "Joy Formidable"),
      makeRecentSearchResult(context, defaultEngine, "Glasgow Weather"),
      makeRecentSearchResult(context, defaultEngine, "Bob Vylan"),
    ],
  });
});
