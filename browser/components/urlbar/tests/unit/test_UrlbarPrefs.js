/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(function test() {
  Assert.throws(
    () => UrlbarPrefs.get("browser.migration.version"),
    /Trying to access an unknown pref/,
    "Should throw when passing an untracked pref"
  );

  Assert.throws(
    () => UrlbarPrefs.set("browser.migration.version", 100),
    /Trying to access an unknown pref/,
    "Should throw when passing an untracked pref"
  );
  Assert.throws(
    () => UrlbarPrefs.set("maxRichResults", "10"),
    /Invalid value/,
    "Should throw when passing an invalid value type"
  );

  Assert.deepEqual(UrlbarPrefs.get("formatting.enabled"), true);
  UrlbarPrefs.set("formatting.enabled", false);
  Assert.deepEqual(UrlbarPrefs.get("formatting.enabled"), false);

  Assert.deepEqual(UrlbarPrefs.get("maxRichResults"), 10);
  UrlbarPrefs.set("maxRichResults", 6);
  Assert.deepEqual(UrlbarPrefs.get("maxRichResults"), 6);

  Assert.deepEqual(UrlbarPrefs.get("autoFill.stddevMultiplier"), 0.0);
  UrlbarPrefs.set("autoFill.stddevMultiplier", 0.01);
  // Due to rounding errors, floats are slightly imprecise, so we can't
  // directly compare what we set to what we retrieve.
  Assert.deepEqual(
    parseFloat(UrlbarPrefs.get("autoFill.stddevMultiplier").toFixed(2)),
    0.01
  );
});

const EXPECTED_SUGGESTIONS_FIRST_GROUPS = {
  children: [
    // heuristic
    {
      maxResultCount: 1,
      children: [
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_TEST },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_EXTENSION },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_SEARCH_TIP },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_OMNIBOX },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_ENGINE_ALIAS },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_BOOKMARK_KEYWORD },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_AUTOFILL },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_TOKEN_ALIAS_ENGINE },
        {
          group: UrlbarUtils.RESULT_GROUP.HEURISTIC_RESTRICT_KEYWORD_AUTOFILL,
        },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_HISTORY_URL },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_FALLBACK },
      ],
    },
    // extensions using the omnibox API
    {
      group: UrlbarUtils.RESULT_GROUP.OMNIBOX,
    },
    // main group
    {
      flexChildren: true,
      children: [
        // suggestions
        {
          flex: 2,
          children: [
            {
              flexChildren: true,
              children: [
                {
                  flex: 2,
                  group: UrlbarUtils.RESULT_GROUP.FORM_HISTORY,
                },
                {
                  flex: 99,
                  group: UrlbarUtils.RESULT_GROUP.RECENT_SEARCH,
                },
                {
                  flex: 4,
                  group: UrlbarUtils.RESULT_GROUP.REMOTE_SUGGESTION,
                },
              ],
            },
            {
              group: UrlbarUtils.RESULT_GROUP.TAIL_SUGGESTION,
            },
          ],
        },
        // general
        {
          group: UrlbarUtils.RESULT_GROUP.GENERAL_PARENT,
          flex: 1,
          children: [
            {
              availableSpan: 3,
              group: UrlbarUtils.RESULT_GROUP.INPUT_HISTORY,
            },
            {
              flexChildren: true,
              children: [
                {
                  flex: 1,
                  group: UrlbarUtils.RESULT_GROUP.REMOTE_TAB,
                },
                {
                  flex: 2,
                  group: UrlbarUtils.RESULT_GROUP.GENERAL,
                  orderBy: "frecency",
                },
                {
                  flex: 2,
                  group: UrlbarUtils.RESULT_GROUP.ABOUT_PAGES,
                },
                {
                  flex: 99,
                  group: UrlbarUtils.RESULT_GROUP.RESTRICT_SEARCH_KEYWORD,
                },
              ],
            },
            {
              group: UrlbarUtils.RESULT_GROUP.INPUT_HISTORY,
            },
          ],
        },
      ],
    },
  ],
};

const EXPECTED_NOT_SUGGESTIONS_FIRST_GROUPS = {
  children: [
    // heuristic
    {
      maxResultCount: 1,
      children: [
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_TEST },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_EXTENSION },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_SEARCH_TIP },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_OMNIBOX },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_ENGINE_ALIAS },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_BOOKMARK_KEYWORD },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_AUTOFILL },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_TOKEN_ALIAS_ENGINE },
        {
          group: UrlbarUtils.RESULT_GROUP.HEURISTIC_RESTRICT_KEYWORD_AUTOFILL,
        },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_HISTORY_URL },
        { group: UrlbarUtils.RESULT_GROUP.HEURISTIC_FALLBACK },
      ],
    },
    // extensions using the omnibox API
    {
      group: UrlbarUtils.RESULT_GROUP.OMNIBOX,
    },
    // main group
    {
      flexChildren: true,
      children: [
        // general
        {
          group: UrlbarUtils.RESULT_GROUP.GENERAL_PARENT,
          flex: 2,
          children: [
            {
              availableSpan: 3,
              group: UrlbarUtils.RESULT_GROUP.INPUT_HISTORY,
            },
            {
              flexChildren: true,
              children: [
                {
                  flex: 1,
                  group: UrlbarUtils.RESULT_GROUP.REMOTE_TAB,
                },
                {
                  flex: 2,
                  group: UrlbarUtils.RESULT_GROUP.GENERAL,
                  orderBy: "frecency",
                },
                {
                  flex: 2,
                  group: UrlbarUtils.RESULT_GROUP.ABOUT_PAGES,
                },
                {
                  flex: 99,
                  group: UrlbarUtils.RESULT_GROUP.RESTRICT_SEARCH_KEYWORD,
                },
              ],
            },
            {
              group: UrlbarUtils.RESULT_GROUP.INPUT_HISTORY,
            },
          ],
        },
        // suggestions
        {
          flex: 1,
          children: [
            {
              flexChildren: true,
              children: [
                {
                  flex: 2,
                  group: UrlbarUtils.RESULT_GROUP.FORM_HISTORY,
                },
                {
                  flex: 99,
                  group: UrlbarUtils.RESULT_GROUP.RECENT_SEARCH,
                },
                {
                  flex: 4,
                  group: UrlbarUtils.RESULT_GROUP.REMOTE_SUGGESTION,
                },
              ],
            },
            {
              group: UrlbarUtils.RESULT_GROUP.TAIL_SUGGESTION,
            },
          ],
        },
      ],
    },
  ],
};

// Tests interaction between showSearchSuggestionsFirst and resultGroups.
add_task(function showSearchSuggestionsFirst_resultGroups() {
  // Check initial values.
  Assert.equal(
    UrlbarPrefs.get("showSearchSuggestionsFirst"),
    true,
    "showSearchSuggestionsFirst is true initially"
  );
  Assert.deepEqual(
    UrlbarPrefs.getResultGroups({
      context: { sapName: "urlbar", searchString: "test" },
    }),
    EXPECTED_SUGGESTIONS_FIRST_GROUPS,
    "resultGroups is the same as the groups for which showSearchSuggestionsFirst is true"
  );

  UrlbarPrefs.set("showSearchSuggestionsFirst", false);
  Assert.deepEqual(
    UrlbarPrefs.getResultGroups({
      context: { sapName: "urlbar", searchString: "test" },
    }),
    EXPECTED_NOT_SUGGESTIONS_FIRST_GROUPS,
    "resultGroups is updated after setting showSearchSuggestionsFirst = false"
  );

  UrlbarPrefs.set("showSearchSuggestionsFirst", true);
  Assert.deepEqual(
    UrlbarPrefs.getResultGroups({
      context: { sapName: "urlbar", searchString: "test" },
    }),
    EXPECTED_SUGGESTIONS_FIRST_GROUPS,
    "resultGroups is updated after setting showSearchSuggestionsFirst = true"
  );

  // Set showSearchSuggestionsFirst = false again so we can clear it next.
  UrlbarPrefs.set("showSearchSuggestionsFirst", false);
  Assert.deepEqual(
    UrlbarPrefs.getResultGroups({
      context: { sapName: "urlbar", searchString: "test" },
    }),
    EXPECTED_NOT_SUGGESTIONS_FIRST_GROUPS,
    "resultGroups is updated after setting showSearchSuggestionsFirst = false"
  );

  // Clear showSearchSuggestionsFirst.
  Services.prefs.clearUserPref("browser.urlbar.showSearchSuggestionsFirst");
  Assert.deepEqual(
    UrlbarPrefs.getResultGroups({
      context: { sapName: "urlbar", searchString: "test" },
    }),
    EXPECTED_SUGGESTIONS_FIRST_GROUPS,
    "resultGroups is updated immediately after clearing showSearchSuggestionsFirst"
  );
  Assert.equal(
    UrlbarPrefs.get("showSearchSuggestionsFirst"),
    true,
    "showSearchSuggestionsFirst defaults to true after clearing it"
  );
});

// Tests whether observer.onNimbusChanged works.
add_task(async function onNimbusChanged() {
  Services.prefs.setBoolPref(
    "browser.urlbar.autoFill.adaptiveHistory.enabled",
    false
  );

  // Add an observer that throws an Error and an observer that does not define
  // anything to check whether the other observers can get notifications.
  UrlbarPrefs.addObserver({
    onPrefChanged() {
      throw new Error("From onPrefChanged");
    },
    onNimbusChanged() {
      throw new Error("From onNimbusChanged");
    },
  });
  UrlbarPrefs.addObserver({});

  const observer = {
    onPrefChanged(pref) {
      this.prefChangedList.push(pref);
    },
    onNimbusChanged(pref) {
      this.nimbusChangedList.push(pref);
    },
  };
  observer.prefChangedList = [];
  observer.nimbusChangedList = [];
  UrlbarPrefs.addObserver(observer);

  const doCleanup = await UrlbarTestUtils.initNimbusFeature({
    autoFillAdaptiveHistoryEnabled: true,
  });
  Assert.equal(observer.prefChangedList.length, 0);
  Assert.ok(
    observer.nimbusChangedList.includes("autoFillAdaptiveHistoryEnabled")
  );
  await doCleanup();
});

// Tests whether observer.onPrefChanged works.
add_task(async function onPrefChanged() {
  const doCleanup = await UrlbarTestUtils.initNimbusFeature({
    autoFillAdaptiveHistoryEnabled: false,
  });
  Services.prefs.setBoolPref(
    "browser.urlbar.autoFill.adaptiveHistory.enabled",
    false
  );

  // Add an observer that throws an Error and an observer that does not define
  // anything to check whether the other observers can get notifications.
  UrlbarPrefs.addObserver({
    onPrefChanged() {
      throw new Error("From onPrefChanged");
    },
    onNimbusChanged() {
      throw new Error("From onNimbusChanged");
    },
  });
  UrlbarPrefs.addObserver({});

  const deferred = Promise.withResolvers();
  const observer = {
    onPrefChanged(pref) {
      this.prefChangedList.push(pref);
      deferred.resolve();
    },
    onNimbusChanged(pref) {
      this.nimbusChangedList.push(pref);
      deferred.resolve();
    },
  };
  observer.prefChangedList = [];
  observer.nimbusChangedList = [];
  UrlbarPrefs.addObserver(observer);

  Services.prefs.setBoolPref(
    "browser.urlbar.autoFill.adaptiveHistory.enabled",
    true
  );
  await deferred.promise;
  Assert.equal(observer.prefChangedList.length, 1);
  Assert.equal(observer.prefChangedList[0], "autoFill.adaptiveHistory.enabled");
  Assert.equal(observer.nimbusChangedList.length, 0);

  Services.prefs.clearUserPref(
    "browser.urlbar.autoFill.adaptiveHistory.enabled"
  );
  await doCleanup();
});

// Tests add function.
add_task(async function add() {
  info("Start from empty value");
  Services.prefs.setStringPref(
    "browser.urlbar.quicksuggest.realtimeOptIn.notNowTypes",
    ""
  );
  let result = UrlbarPrefs.get("quicksuggest.realtimeOptIn.notNowTypes");
  Assert.equal(result.size, 0);
  UrlbarPrefs.add("quicksuggest.realtimeOptIn.notNowTypes", "a");
  UrlbarPrefs.add("quicksuggest.realtimeOptIn.notNowTypes", "b");
  UrlbarPrefs.add("quicksuggest.realtimeOptIn.notNowTypes", "a");
  result = UrlbarPrefs.get("quicksuggest.realtimeOptIn.notNowTypes");
  Assert.equal(result.size, 2);
  Assert.ok(result.has("a"));
  Assert.ok(result.has("b"));

  info("Start from some values");
  Services.prefs.setStringPref(
    "browser.urlbar.quicksuggest.realtimeOptIn.notNowTypes",
    "a,b,c"
  );
  result = UrlbarPrefs.get("quicksuggest.realtimeOptIn.notNowTypes");
  Assert.equal(result.size, 3);
  UrlbarPrefs.add("quicksuggest.realtimeOptIn.notNowTypes", "a");
  UrlbarPrefs.add("quicksuggest.realtimeOptIn.notNowTypes", "b");
  UrlbarPrefs.add("quicksuggest.realtimeOptIn.notNowTypes", "a");
  UrlbarPrefs.add("quicksuggest.realtimeOptIn.notNowTypes", "d");
  result = UrlbarPrefs.get("quicksuggest.realtimeOptIn.notNowTypes");
  Assert.equal(result.size, 4);
  Assert.ok(result.has("a"));
  Assert.ok(result.has("b"));
  Assert.ok(result.has("c"));
  Assert.ok(result.has("d"));

  info("Test for singular value pref");
  Assert.throws(
    () => UrlbarPrefs.add("merino.providers", "a"),
    /The pref merino.providers should handle the values as Set but 'string'/
  );
  Assert.throws(
    () => UrlbarPrefs.add("addons.featureGate", true),
    /The pref addons.featureGate should handle the values as Set but 'boolean'/
  );
});
