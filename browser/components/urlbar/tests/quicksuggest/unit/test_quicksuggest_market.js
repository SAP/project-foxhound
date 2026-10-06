/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests Market suggestions.

"use strict";

const TEST_MERINO_SINGLE = [
  {
    provider: "polygon",
    score: 0,
    custom_details: {
      polygon: {
        values: [
          {
            image_url: "https://example.com/aapl.svg",
            query: "AAPL stock",
            name: "Apple Inc",
            ticker: "AAPL",
            todays_change_perc: "-0.54",
            last_price: "$181.98 USD",
          },
        ],
      },
    },
  },
];

const TEST_MERINO_EMPTY_POLYGON_VALUES = [
  {
    provider: "polygon",
    score: 0,
    custom_details: {
      polygon: {
        values: [],
      },
    },
  },
];

add_setup(async function init() {
  await SearchService.init();

  // Disable search suggestions so we don't hit the network.
  Services.prefs.setBoolPref("browser.search.suggest.enabled", false);

  await QuickSuggestTestUtils.ensureQuickSuggestInit({
    merinoSuggestions: TEST_MERINO_SINGLE,
    prefs: [
      ["market.featureGate", true],
      ["suggest.market", true],
      ["suggest.quicksuggest.all", true],
    ],
  });
});

add_task(async function telemetryType() {
  Assert.equal(
    QuickSuggest.getFeature("MarketSuggestions").getSuggestionTelemetryType({}),
    "market",
    "Telemetry type should be 'market'"
  );
});

add_task(async function disabledPrefs() {
  let prefs = [
    "quicksuggest.enabled",
    "suggest.market",
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
      matches: [marketResult()],
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

// Tests the "Not interested" command: all Market suggestions should be disabled
// and not added anymore.
add_task(async function notInterested() {
  await doDismissAllTest({
    result: marketResult(),
    command: "not_interested",
    feature: QuickSuggest.getFeature("MarketSuggestions"),
    pref: "suggest.market",
    queries: [{ query: "stock" }],
  });
});

// Tests the "show less frequently" behavior.
add_task(async function showLessFrequently() {
  UrlbarPrefs.clear("market.showLessFrequentlyCount");
  UrlbarPrefs.clear("market.minKeywordLength");

  let cleanUpNimbus = await UrlbarTestUtils.initNimbusFeature({
    realtimeMinKeywordLength: 0,
    realtimeShowLessFrequentlyCap: 3,
  });

  let result = marketResult();

  const testData = [
    {
      input: "st",
      before: {
        canShowLessFrequently: true,
        showLessFrequentlyCount: 0,
        minKeywordLength: 0,
      },
      after: {
        canShowLessFrequently: true,
        showLessFrequentlyCount: 1,
        minKeywordLength: 3,
      },
    },
    {
      input: "stoc",
      before: {
        canShowLessFrequently: true,
        showLessFrequentlyCount: 1,
        minKeywordLength: 3,
      },
      after: {
        canShowLessFrequently: true,
        showLessFrequentlyCount: 2,
        minKeywordLength: 5,
      },
    },
    {
      input: "stock",
      before: {
        canShowLessFrequently: true,
        showLessFrequentlyCount: 2,
        minKeywordLength: 5,
      },
      after: {
        canShowLessFrequently: false,
        showLessFrequentlyCount: 3,
        minKeywordLength: 6,
      },
    },
  ];

  for (let { input, before, after } of testData) {
    let feature = QuickSuggest.getFeature("MarketSuggestions");

    await check_results({
      context: createContext(input, {
        providers: [UrlbarProviderQuickSuggest.name],
        isPrivate: false,
      }),
      matches: [result],
    });

    Assert.equal(
      UrlbarPrefs.get("market.minKeywordLength"),
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
      UrlbarPrefs.get("market.minKeywordLength"),
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
  UrlbarPrefs.clear("market.showLessFrequentlyCount");
  UrlbarPrefs.clear("market.minKeywordLength");
});

// Tests in case of that the polygon values is empty.
add_task(async function empty_polygon_values() {
  MerinoTestUtils.server.response.body.suggestions =
    TEST_MERINO_EMPTY_POLYGON_VALUES;
  await check_results({
    context: createContext("stock", {
      providers: [UrlbarProviderQuickSuggest.name],
      isPrivate: false,
    }),
    matches: [],
  });
});

function marketResult() {
  return {
    type: UrlbarUtils.RESULT_TYPE.DYNAMIC,
    source: UrlbarUtils.RESULT_SOURCE.SEARCH,
    isBestMatch: true,
    rowIndex: -1,
    heuristic: false,
    exposureTelemetry: 0,
    payload: {
      source: "merino",
      provider: "polygon",
      telemetryType: "market",
      isSponsored: false,
      engine: SearchService.defaultEngine.name,
      items: [
        {
          image_url: "https://example.com/aapl.svg",
          query: "AAPL stock",
          name: "Apple Inc",
          ticker: "AAPL",
          todays_change_perc: "-0.54",
          last_price: "$181.98 USD",
        },
      ],
      dynamicType: "realtime-market",
    },
  };
}
