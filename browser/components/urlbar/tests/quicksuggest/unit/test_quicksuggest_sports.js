/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests sports suggestions.

"use strict";

// 2025-11-01 - game status is "scheduled", without icon
const SUGGESTION_VALUE_SCHEDULED = {
  sport: "Sport 3",
  sport_category: "Sport Category 3",
  query: "query 3",
  date: "2025-11-01T17:00:00Z",
  home_team: {
    name: "Team 3 Home",
    score: null,
  },
  away_team: {
    name: "Team 3 Away",
    score: null,
  },
  status_type: "scheduled",
};

add_setup(async function init() {
  await SearchService.init();

  // Disable search suggestions so we don't hit the network.
  Services.prefs.setBoolPref("browser.search.suggest.enabled", false);

  // This test deals with `Intl` formating of dates and times, which depends on
  // the system locale, and assumes it's en-US. Make sure it's actually en-US.
  await QuickSuggestTestUtils.setRegionAndLocale({
    locale: "en-US",
    skipSuggestReset: true,
  });

  await QuickSuggestTestUtils.ensureQuickSuggestInit({
    merinoSuggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED]),
    prefs: [
      ["sports.featureGate", true],
      ["suggest.sports", true],
      ["suggest.quicksuggest.all", true],
    ],
  });
});

add_task(async function telemetryType() {
  Assert.equal(
    QuickSuggest.getFeature("SportsSuggestions").getSuggestionTelemetryType({}),
    "sports",
    "Telemetry type should be as expected"
  );
});

// The suggestions should be disabled when the relevant prefs are false.
add_task(async function disabledPrefs() {
  UrlbarTestUtils.stubNowZonedDateTime("2025-10-31T14:00:00-04:00[-04:00]");

  let prefs = [
    "quicksuggest.enabled",
    "sports.featureGate",
    "suggest.sports",
    "suggest.quicksuggest.all",
  ];

  for (let pref of prefs) {
    info("Testing pref: " + pref);

    // First make sure the suggestion is added.
    await check_results({
      context: createContext("test", {
        providers: [UrlbarProviderQuickSuggest.name],
        isPrivate: false,
      }),
      matches: [
        expectedResult([
          {
            query: "query 3",
            sport: "Sport 3",
            sport_category: "Sport Category 3",
            status_type: "scheduled",
            date: "2025-11-01T17:00:00Z",
            home_team: {
              name: "Team 3 Home",
              score: null,
            },
            away_team: {
              name: "Team 3 Away",
              score: null,
            },
          },
        ]),
      ],
    });

    // Now disable them.
    UrlbarPrefs.set(pref, false);
    await check_results({
      context: createContext("test", {
        providers: [UrlbarProviderQuickSuggest.name],
        isPrivate: false,
      }),
      matches: [],
    });

    // Revert.
    UrlbarPrefs.set(pref, true);
    await QuickSuggestTestUtils.forceSync();
  }
});

add_task(async function command_notInterested() {
  UrlbarTestUtils.stubNowZonedDateTime("2025-10-31T14:00:00-04:00[-04:00]");

  await doDismissAllTest({
    result: expectedResult([
      {
        query: "query 3",
        sport: "Sport 3",
        sport_category: "Sport Category 3",
        status_type: "scheduled",
        date: "2025-11-01T17:00:00Z",
        home_team: {
          name: "Team 3 Home",
          score: null,
        },
        away_team: {
          name: "Team 3 Away",
          score: null,
        },
      },
    ]),
    command: "not_interested",
    feature: QuickSuggest.getFeature("SportsSuggestions"),
    pref: "suggest.sports",
    queries: [{ query: "test" }],
  });
});

add_task(async function command_showLessFrequently() {
  UrlbarTestUtils.stubNowZonedDateTime("2025-10-31T14:00:00-04:00[-04:00]");

  UrlbarPrefs.clear("sports.showLessFrequentlyCount");
  UrlbarPrefs.clear("sports.minKeywordLength");

  let cleanUpNimbus = await UrlbarTestUtils.initNimbusFeature({
    realtimeMinKeywordLength: 0,
    realtimeShowLessFrequentlyCap: 3,
  });

  let result = expectedResult([
    {
      query: "query 3",
      sport: "Sport 3",
      sport_category: "Sport Category 3",
      status_type: "scheduled",
      date: "2025-11-01T17:00:00Z",
      home_team: {
        name: "Team 3 Home",
        score: null,
      },
      away_team: {
        name: "Team 3 Away",
        score: null,
      },
    },
  ]);

  const testData = [
    {
      input: "spo",
      before: {
        canShowLessFrequently: true,
        showLessFrequentlyCount: 0,
        minKeywordLength: 0,
      },
      after: {
        canShowLessFrequently: true,
        showLessFrequentlyCount: 1,
        minKeywordLength: 4,
      },
    },
    {
      input: "sport",
      before: {
        canShowLessFrequently: true,
        showLessFrequentlyCount: 1,
        minKeywordLength: 4,
      },
      after: {
        canShowLessFrequently: true,
        showLessFrequentlyCount: 2,
        minKeywordLength: 6,
      },
    },
    {
      input: "sports",
      before: {
        canShowLessFrequently: true,
        showLessFrequentlyCount: 2,
        minKeywordLength: 6,
      },
      after: {
        canShowLessFrequently: false,
        showLessFrequentlyCount: 3,
        minKeywordLength: 7,
      },
    },
  ];

  for (let { input, before, after } of testData) {
    let feature = QuickSuggest.getFeature("SportsSuggestions");

    await check_results({
      context: createContext(input, {
        providers: [UrlbarProviderQuickSuggest.name],
        isPrivate: false,
      }),
      matches: [result],
    });

    Assert.equal(
      UrlbarPrefs.get("sports.minKeywordLength"),
      before.minKeywordLength
    );
    Assert.equal(feature.canShowLessFrequently, before.canShowLessFrequently);
    Assert.equal(
      feature.showLessFrequentlyCount,
      before.showLessFrequentlyCount
    );

    triggerCommand({
      result,
      feature,
      command: "show_less_frequently",
      searchString: input,
    });

    Assert.equal(
      UrlbarPrefs.get("sports.minKeywordLength"),
      after.minKeywordLength
    );
    Assert.equal(feature.canShowLessFrequently, after.canShowLessFrequently);
    Assert.equal(
      feature.showLessFrequentlyCount,
      after.showLessFrequentlyCount
    );

    await check_results({
      context: createContext(input, {
        providers: [UrlbarProviderQuickSuggest.name],
        isPrivate: false,
      }),
      matches: [],
    });
  }

  await cleanUpNimbus();
  UrlbarPrefs.clear("sports.showLessFrequentlyCount");
  UrlbarPrefs.clear("sports.minKeywordLength");
});

function merinoSuggestions(values) {
  return [
    {
      provider: "sports",
      is_sponsored: false,
      score: 0.2,
      title: "",
      custom_details: {
        sports: {
          values,
        },
      },
    },
  ];
}

function expectedResult(expectedItems) {
  return {
    type: UrlbarUtils.RESULT_TYPE.DYNAMIC,
    source: UrlbarUtils.RESULT_SOURCE.SEARCH,
    isBestMatch: true,
    rowIndex: -1,
    heuristic: false,
    exposureTelemetry: 0,
    payload: {
      items: expectedItems,
      source: "merino",
      provider: "sports",
      telemetryType: "sports",
      isSponsored: false,
      engine: SearchService.defaultEngine.name,
      dynamicType: "realtime-sports",
    },
  };
}
