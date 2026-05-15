/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests sports suggestions and related code.

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  SportsSuggestions:
    "moz-src:///browser/components/urlbar/private/SportsSuggestions.sys.mjs",
});

// 2025-11-01 - game status is "scheduled", without icon
const SUGGESTION_VALUE_SCHEDULED = {
  sport: "Sport 3",
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
  setNow("2025-10-31T14:00:00-04:00[-04:00]");

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

// Main test for `SportsSuggestions._parseDate`.
add_task(async function datesAndTimes() {
  // For each test, we'll set `now`, call `_parseDate` with `date`, and check
  // the return value against `expected`.
  let tests = [
    // date is before this year
    {
      now: "2025-10-31T12:00:00-07:00[-07:00]",
      date: "2013-05-11T04:00:00-07:00",
      expected: {
        daysUntil: -Infinity,
        isFuture: false,
      },
    },

    // date is before yesterday
    {
      now: [
        "2025-10-31T00:00:00-07:00[-07:00]",
        "2025-10-31T23:59:59-07:00[-07:00]",
      ],
      date: ["2025-10-29T00:00:00-07:00", "2025-10-29T23:59:59-07:00"],
      expected: {
        daysUntil: -Infinity,
        isFuture: false,
      },
    },

    // date is yesterday
    {
      now: [
        "2025-10-31T00:00:00-07:00[-07:00]",
        "2025-10-31T23:59:59-07:00[-07:00]",
      ],
      date: ["2025-10-30T00:00:00-07:00", "2025-10-30T23:59:59-07:00"],
      expected: {
        daysUntil: -1,
        isFuture: false,
      },
    },

    // date is today (past)
    {
      now: [
        "2025-10-31T12:00:00-07:00[-07:00]",
        "2025-10-31T23:59:59-07:00[-07:00]",
      ],
      date: ["2025-10-31T00:00:00-07:00", "2025-10-31T11:59:59-07:00"],
      expected: {
        daysUntil: 0,
        isFuture: false,
      },
    },

    // date is today (now)
    {
      now: "2025-10-31T12:00:00-07:00[-07:00]",
      date: "2025-10-31T12:00:00-07:00",
      expected: {
        daysUntil: 0,
        isFuture: false,
      },
    },

    // date is today (future)
    {
      now: [
        "2025-10-31T00:00:00-07:00[-07:00]",
        "2025-10-31T12:00:00-07:00[-07:00]",
      ],
      date: ["2025-10-31T12:00:01-07:00", "2025-10-31T23:59:59-07:00"],
      expected: {
        daysUntil: 0,
        isFuture: true,
      },
    },

    // date is tomorrow
    {
      now: [
        "2025-10-31T00:00:00-07:00[-07:00]",
        "2025-10-31T23:59:59-07:00[-07:00]",
      ],
      date: ["2025-11-01T00:00:00-07:00", "2025-11-01T23:59:59-07:00"],
      expected: {
        daysUntil: 1,
        isFuture: true,
      },
    },

    // date is after tomorrow
    {
      now: [
        "2025-10-31T00:00:00-07:00[-07:00]",
        "2025-10-31T23:59:59-07:00[-07:00]",
      ],
      date: ["2025-11-02T00:00:00-07:00", "2025-11-02T23:59:59-07:00"],
      expected: {
        daysUntil: Infinity,
        isFuture: true,
      },
    },

    // date is after this year
    {
      now: "2025-10-31T00:00:00-07:00[-07:00]",
      date: "3013-05-11T04:00:00-07:00",
      expected: {
        daysUntil: Infinity,
        isFuture: true,
      },
    },
  ];

  for (let { now, date, expected } of tests) {
    let nows = typeof now == "string" ? [now] : now;
    let dates = typeof date == "string" ? [date] : date;
    for (let n of nows) {
      let zonedNow = setNow(n);
      for (let d of dates) {
        Assert.deepEqual(
          SportsSuggestions._parseDate(new Date(d)),
          {
            ...expected,
            zonedNow,
            zonedDate: new Date(d)
              .toTemporalInstant()
              .toZonedDateTimeISO(zonedNow),
          },
          "datesAndTimes test: " + JSON.stringify({ now: n, date: d })
        );
      }
    }
  }
});

// Tests `SportsSuggestions._parseDate` with dates across time zone changes.
add_task(function timeZoneTransition() {
  // This task is based around 2025-11-02, when Daylight Saving Time ends in the
  // U.S. On 2025-11-02 at 2:00 am, the time changes to 1:00 am Standard Time.

  let tests = [
    // `now` and `date` both in PDT (daylight saving)
    {
      now: "2025-10-02T12:00:00-07:00[America/Los_Angeles]",
      date: "2025-10-01T00:00:00-07:00",
      expected: {
        daysUntil: -1,
        isFuture: false,
      },
    },

    // `now` in PST, `date` in PDT
    {
      now: "2025-11-03T00:00:00-08:00[America/Los_Angeles]",
      date: "2025-11-01T00:00:00-07:00",
      expected: {
        daysUntil: -Infinity,
        isFuture: false,
      },
    },
    {
      now: "2025-11-02T12:00:00-08:00[America/Los_Angeles]",
      date: "2025-11-01T00:00:00-07:00",
      expected: {
        daysUntil: -1,
        isFuture: false,
      },
    },
    {
      now: "2025-11-02T01:00:00-08:00[America/Los_Angeles]",
      date: "2025-11-01T00:00:00-07:00",
      expected: {
        daysUntil: -1,
        isFuture: false,
      },
    },
    {
      now: "2025-11-02T23:59:59-08:00[America/Los_Angeles]",
      date: "2025-11-01T00:00:00-07:00",
      expected: {
        daysUntil: -1,
        isFuture: false,
      },
    },
    {
      now: "2025-11-02T01:00:00-08:00[America/Los_Angeles]",
      date: "2025-11-02T00:00:00-07:00",
      expected: {
        daysUntil: 0,
        isFuture: false,
      },
    },
    {
      now: "2025-11-02T01:00:00-08:00[America/Los_Angeles]",
      date: "2025-11-02T01:00:00-07:00",
      expected: {
        daysUntil: 0,
        isFuture: false,
      },
    },

    // `now` in PDT, `date` in PST
    {
      now: "2025-11-02T01:00:00-07:00[America/Los_Angeles]",
      date: "2025-11-02T01:00:00-08:00",
      expected: {
        daysUntil: 0,
        isFuture: true,
      },
    },
    {
      now: "2025-11-02T00:00:00-07:00[America/Los_Angeles]",
      date: "2025-11-02T01:00:00-08:00",
      expected: {
        daysUntil: 0,
        isFuture: true,
      },
    },
    {
      now: "2025-11-01T00:00:00-07:00[America/Los_Angeles]",
      date: "2025-11-02T23:59:59-08:00",
      expected: {
        daysUntil: 1,
        isFuture: true,
      },
    },
    {
      now: "2025-11-01T00:00:00-07:00[America/Los_Angeles]",
      date: "2025-11-02T01:00:00-08:00",
      expected: {
        daysUntil: 1,
        isFuture: true,
      },
    },
    {
      now: "2025-11-01T00:00:00-07:00[America/Los_Angeles]",
      date: "2025-11-02T12:00:00-08:00",
      expected: {
        daysUntil: 1,
        isFuture: true,
      },
    },
    {
      now: "2025-11-01T00:00:00-07:00[America/Los_Angeles]",
      date: "2025-11-03T00:00:00-08:00",
      expected: {
        daysUntil: Infinity,
        isFuture: true,
      },
    },

    // `now` and `date` both in PST (standard time)
    {
      now: "2025-11-11T12:00:00-08:00[America/Los_Angeles]",
      date: "2025-11-10T00:00:00-08:00",
      expected: {
        daysUntil: -1,
        isFuture: false,
      },
    },
  ];

  for (let { now, date, expected } of tests) {
    let zonedNow = setNow(now);
    Assert.deepEqual(
      SportsSuggestions._parseDate(new Date(date)),
      {
        ...expected,
        zonedNow,
        zonedDate: new Date(date)
          .toTemporalInstant()
          .toZonedDateTimeISO(zonedNow),
      },
      "timeZoneTransition test: " + JSON.stringify({ now, date })
    );
  }
});

add_task(async function command_notInterested() {
  setNow("2025-10-31T14:00:00-04:00[-04:00]");

  await doDismissAllTest({
    result: expectedResult([
      {
        query: "query 3",
        sport: "Sport 3",
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
  setNow("2025-10-31T14:00:00-04:00[-04:00]");

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

let gSandbox;
let gDateStub;

function setNow(dateStr) {
  if (!dateStr) {
    gSandbox?.restore();
    return null;
  }

  let global = Cu.getGlobalForObject(SportsSuggestions);
  if (!gSandbox) {
    gSandbox = sinon.createSandbox();
    gDateStub = gSandbox.stub(SportsSuggestions, "_zonedDateTimeISO");
  }

  let zonedNow = global.Temporal.ZonedDateTime.from(dateStr);
  gDateStub.returns(zonedNow);

  return zonedNow;
}

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
