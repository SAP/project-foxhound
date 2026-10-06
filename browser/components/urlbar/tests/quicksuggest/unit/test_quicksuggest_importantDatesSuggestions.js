/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const REMOTE_SETTINGS_RECORDS = [
  // US region, en-US locale
  {
    type: "dynamic-suggestions",
    suggestion_type: "important_dates",
    filter_expression: "env.country == 'US' && env.locale == 'en-US'",
    attachment: [
      {
        keywords: [["event", [" 1"]]],
        data: {
          result: {
            isImportantDate: true,
            payload: {
              dates: ["2025-03-05", "2026-02-18"],
              name: "Event 1",
            },
          },
        },
      },
      {
        keywords: [["multi d", ["ay event"]]],
        data: {
          result: {
            isImportantDate: true,
            payload: {
              dates: [
                ["2025-06-10", "2025-06-20"],
                ["2026-06-10", "2026-06-20"],
              ],
              name: "Multi Day Event",
            },
          },
        },
      },
    ],
  },

  // DE region, de locale
  {
    type: "dynamic-suggestions",
    suggestion_type: "important_dates",
    filter_expression: "env.country == 'DE' && env.locale == 'de'",
    attachment: [
      {
        keywords: ["de de event"],
        data: {
          result: {
            isImportantDate: true,
            payload: {
              dates: ["2026-01-01"],
              name: "DE de Event",
            },
          },
        },
      },
    ],
  },

  // DE region, en-US locale
  {
    type: "dynamic-suggestions",
    suggestion_type: "important_dates",
    filter_expression: "env.country == 'DE' && env.locale == 'en-US'",
    attachment: [
      {
        keywords: ["de en-us event"],
        data: {
          result: {
            isImportantDate: true,
            payload: {
              dates: ["2026-01-02"],
              name: "DE en-US Event",
            },
          },
        },
      },
    ],
  },

  // other non-important-dates records
  {
    type: "dynamic-suggestions",
    suggestion_type: "other_suggestions",
    attachment: [
      {
        keywords: [["event", [" 2"]]],
        data: {
          result: {
            isBestMatch: true,
            payload: {
              title: "Top Pick Suggestion 1",
              url: "https://foo.com/",
              description:
                "A suggestion that just so happens to have the same keyword",
            },
          },
        },
      },
    ],
  },
  {
    type: "dynamic-suggestions",
    suggestion_type: "other_suggestions",
    attachment: [
      {
        keywords: [["event", [" 3"]]],
        data: {
          result: {
            isBestMatch: true,
            payload: {
              title: "Top Pick Suggestion 2",
              url: "https://foo.com/",
              description:
                "Another suggestion that just so happens to have the same keyword",
            },
          },
        },
      },
    ],
  },
];

let SystemDate;

add_setup(async function () {
  await QuickSuggestTestUtils.ensureQuickSuggestInit({
    remoteSettingsRecords: REMOTE_SETTINGS_RECORDS,
    prefs: [["quicksuggest.dynamicSuggestionTypes", "other_suggestions"]],
  });

  // All tasks will assume US region, en-US locale by default.
  await QuickSuggestTestUtils.setRegionAndLocale({
    region: "US",
    locale: "en-US",
  });

  await SearchService.init();

  SystemDate = Cu.getGlobalForObject(QuickSuggestTestUtils).Date;
});

add_task(async function telemetryType() {
  Assert.equal(
    QuickSuggest.getFeature(
      "ImportantDatesSuggestions"
    ).getSuggestionTelemetryType({}),
    "important_dates",
    "Telemetry type should be 'important_dates'"
  );
});

// Important dates should respect the `importantDates.featureGate` and
// `suggest.importantDates` prefs.
add_task(async function enablingPrefs() {
  setTime("2025-03-01T00:00");

  let query = "event 1";
  let expected = makeExpectedResult({
    date: "Wednesday, March 5, 2025",
    descriptionL10n: {
      id: "urlbar-result-dates-countdown",
      args: { name: "Event 1", daysUntilStart: 4 },
    },
  });

  for (let pref of ["importantDates.featureGate", "suggest.importantDates"]) {
    info("Doing enabling-pref test: " + pref);

    // First make sure the result is matched.
    await checkDatesResults(query, expected);

    // Now disable the pref and do another search.
    UrlbarPrefs.set(pref, false);
    await checkDatesResults(query, null);

    // Clean up.
    UrlbarPrefs.set(pref, true);
    await QuickSuggestTestUtils.forceSync();
  }
});

// Important dates are considered "utility" suggestions and not part of the
// Suggest brand, so they should be enabled regardless of the `all` and
// sponsored Suggest prefs.
add_task(async function neitherSponsoredNorNonsponsored() {
  setTime("2025-03-01T00:00");

  let query = "event 1";
  let expected = makeExpectedResult({
    date: "Wednesday, March 5, 2025",
    descriptionL10n: {
      id: "urlbar-result-dates-countdown",
      args: { name: "Event 1", daysUntilStart: 4 },
    },
  });

  for (let all of [true, false]) {
    for (let sponsored of [true, false]) {
      info(
        "Doing all/sponsored pref test: " + JSON.stringify({ all, sponsored })
      );

      UrlbarPrefs.set("suggest.quicksuggest.all", all);
      UrlbarPrefs.set("suggest.quicksuggest.sponsored", sponsored);
      await QuickSuggestTestUtils.forceSync();

      await checkDatesResults(query, expected);
    }
  }

  UrlbarPrefs.clear("suggest.quicksuggest.all");
  UrlbarPrefs.clear("suggest.quicksuggest.sponsored");
  await QuickSuggestTestUtils.forceSync();
});

add_task(async function fourDaysBefore() {
  setTime("2025-03-01T00:00");

  let query = "event 1";
  let expected = makeExpectedResult({
    date: "Wednesday, March 5, 2025",
    descriptionL10n: {
      id: "urlbar-result-dates-countdown",
      args: { name: "Event 1", daysUntilStart: 4 },
    },
  });

  await checkDatesResults(query, expected);
});

add_task(async function onDayOfEvent() {
  setTime("2025-03-05T00:00");

  let query = "event 1";
  let expected = makeExpectedResult({
    date: "Wednesday, March 5, 2025",
    descriptionL10n: {
      id: "urlbar-result-dates-today",
      args: { name: "Event 1" },
    },
  });

  await checkDatesResults(query, expected);
});

add_task(async function oneDayAfter() {
  setTime("2025-03-06T00:00");

  let query = "event 1";
  let expected = makeExpectedResult({
    // Should select the event in the next year.
    date: "Wednesday, February 18, 2026",
    // Since the event is over SHOW_COUNTDOWN_THRESHOLD_DAYS
    // days away, it should not display the countdown.
    description: "Event 1",
  });

  await checkDatesResults(query, expected);
});

add_task(async function afterAllInstances() {
  setTime("2027-01-01T00:00");

  let query = "event 1";
  let expected = null;

  await checkDatesResults(query, expected);
});

add_task(async function beforeMultiDay() {
  setTime("2025-06-09T23:59");

  let query = "multi day event";
  let expected = makeExpectedResult({
    date: "June 10 – 20, 2025",
    descriptionL10n: {
      id: "urlbar-result-dates-countdown-range",
      args: { name: "Multi Day Event", daysUntilStart: 1 },
    },
  });

  await checkDatesResults(query, expected);
});

add_task(async function duringMultiDay() {
  setTime("2025-06-19T00:00");

  let query = "multi day event";
  let expected = makeExpectedResult({
    date: "June 10 – 20, 2025",
    descriptionL10n: {
      id: "urlbar-result-dates-ongoing",
      args: { name: "Multi Day Event", daysUntilEnd: 1 },
    },
  });

  await checkDatesResults(query, expected);
});

add_task(async function lastDayDuringMultiDay() {
  setTime("2025-06-20T00:00");

  let query = "multi day event";
  let expected = makeExpectedResult({
    date: "June 10 – 20, 2025",
    descriptionL10n: {
      id: "urlbar-result-dates-ends-today",
      args: { name: "Multi Day Event" },
    },
  });

  await checkDatesResults(query, expected);
});

// Test whether the date suggestion is before the other
// isBestMatch suggestion.
add_task(async function testTwoSuggestions() {
  // `other_suggestions` is nonsponsored so it depends on the `all` pref.
  UrlbarPrefs.set("suggest.quicksuggest.all", true);
  await QuickSuggestTestUtils.forceSync();

  setTime("2025-03-01T00:00");

  // 1 date suggestion and 2 other suggestions match this, but
  // one of the two other suggestions should be deduped.
  let query = "event";
  let expectedDateSuggestion = makeExpectedResult({
    date: "Wednesday, March 5, 2025",
    descriptionL10n: {
      id: "urlbar-result-dates-countdown",
      args: { daysUntilStart: 4, name: "Event 1" },
    },
  });

  let expectedOtherSuggestion = {
    type: UrlbarUtils.RESULT_TYPE.URL,
    source: UrlbarUtils.RESULT_SOURCE.SEARCH,
    heuristic: false,
    isBestMatch: true,
    isRichSuggestion: true,
    suggestedIndex: 1,
    payload: {
      source: "rust",
      provider: "Dynamic",
      suggestionType: "other_suggestions",
      title: "Top Pick Suggestion 1",
      url: "https://foo.com/",
      telemetryType: "other_suggestions",
      description: "A suggestion that just so happens to have the same keyword",
      isManageable: true,
      isSponsored: false,
      helpUrl: QuickSuggest.HELP_URL,
    },
  };

  await checkDatesResults(query, [
    expectedDateSuggestion,
    expectedOtherSuggestion,
  ]);

  UrlbarPrefs.clear("suggest.quicksuggest.all");
  await QuickSuggestTestUtils.forceSync();
});

add_task(async function otherRegionsAndLocales() {
  let tests = [
    // DE region, de locale (should match)
    {
      region: "DE",
      locale: "de",
      matchingQuery: "de de event",
      expectedResultData: {
        date: "Donnerstag, 1. Januar 2026",
        description: "DE de Event",
      },
      nonMatchingQueries: [
        "de en-US event", // DE region, en-US locale
        "event 1", // US region, en-US locale
      ],
    },

    // DE region, en-US locale (should match)
    {
      region: "DE",
      locale: "en-US",
      matchingQuery: "de en-us event",
      expectedResultData: {
        date: "Friday, January 2, 2026",
        description: "DE en-US Event",
      },
      nonMatchingQueries: [
        "de de event", // DE region, de locale
        "event 1", // US region, en-US locale
      ],
    },

    // XX region, en-US locale (should not match)
    {
      region: "XX",
      locale: "en-US",
      matchingQuery: null,
      nonMatchingQueries: [
        "de de event", // DE region, de locale
        "de en-us event", // DE region, en-US locale
        "event 1", // US region, en-US locale
      ],
    },

    // US region, de locale (should not match)
    {
      region: "US",
      locale: "de",
      matchingQuery: null,
      nonMatchingQueries: [
        "de de event", // DE region, de locale
        "de en-us event", // DE region, en-US locale
        "event 1", // US region, en-US locale
      ],
    },
  ];

  for (let {
    region,
    locale,
    matchingQuery,
    expectedResultData,
    nonMatchingQueries,
  } of tests) {
    info("Doing subtest: " + JSON.stringify({ region, locale }));

    await QuickSuggestTestUtils.withRegionAndLocale({
      region,
      locale,
      callback: async () => {
        Assert.equal(
          UrlbarPrefs.get("quickSuggestEnabled"),
          !!matchingQuery,
          "quickSuggestEnabled should be enabled as expected"
        );
        Assert.equal(
          UrlbarPrefs.get("importantDates.featureGate"),
          !!matchingQuery,
          "importantDates.featureGate should be enabled as expected"
        );

        setTime("2025-03-01T00:00");

        if (matchingQuery) {
          info("Checking matching query: " + matchingQuery);
          await checkDatesResults(
            matchingQuery,
            makeExpectedResult(expectedResultData)
          );
        }

        for (let query of nonMatchingQueries) {
          info("Checking non-matching query: " + query);
          await checkDatesResults(query, null);
        }
      },
    });
  }
});

/**
 * Stubs the Date object of the system global to use timeStr
 * when the constructor is called without arguments.
 *
 * @param {string} timeStr
 *   An ISO time string.
 */
function setTime(timeStr) {
  let DateStub = function (...args) {
    if (!args.length) {
      return new SystemDate(timeStr);
    }
    return new SystemDate(...args);
  };
  DateStub.prototype = SystemDate.prototype;

  Object.getOwnPropertyNames(SystemDate).forEach(prop => {
    const desc = Object.getOwnPropertyDescriptor(SystemDate, prop);
    Object.defineProperty(DateStub, prop, desc);
  });

  Cu.getGlobalForObject(QuickSuggestTestUtils).Date = DateStub;
}

async function checkDatesResults(query, expected) {
  info(
    "Doing query: " +
      JSON.stringify({
        query,
        expected,
      })
  );

  let queryContext = createContext(query, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context: queryContext,
    matches: expected ? [expected].flat() : [],
  });

  if (expected?.payload) {
    info("Check the highligts");
    let { value, highlights } =
      queryContext.results[0].getDisplayableValueAndHighlights("title", {
        tokens: queryContext.tokens,
      });
    Assert.equal(expected.payload.title, value);
    Assert.deepEqual([[0, expected.payload.title.length]], highlights);
  }
}

function makeExpectedResult({
  date,
  description,
  descriptionL10n,
  isSponsored = false,
  isBestMatch = true,
  isRichSuggestion = undefined,
}) {
  let name = description ?? descriptionL10n.args.name;
  return {
    type: UrlbarUtils.RESULT_TYPE.SEARCH,
    source: UrlbarUtils.RESULT_SOURCE.SEARCH,
    heuristic: false,
    isBestMatch,
    suggestedIndex: 1,
    isRichSuggestion,
    payload: {
      title: date,
      engine: SearchService.defaultEngine.name,
      query: name,
      lowerCaseSuggestion: name.toLocaleLowerCase(),
      description,
      descriptionL10n,
      isSponsored,
      telemetryType: "important_dates",
      source: "rust",
      provider: "Dynamic",
      suggestionType: "important_dates",
      isManageable: true,
      isBlockable: true,
      helpUrl: QuickSuggest.HELP_URL,
      icon: "chrome://browser/skin/calendar-24.svg",
    },
  };
}
