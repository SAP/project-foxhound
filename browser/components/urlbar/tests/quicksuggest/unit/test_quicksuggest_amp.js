/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests for AMP suggestions.

"use strict";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AmpMatchingStrategy:
    "moz-src:///toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustSuggest.sys.mjs",
  AmpSuggestions:
    "moz-src:///browser/components/urlbar/private/AmpSuggestions.sys.mjs",
  SuggestionProvider:
    "moz-src:///toolkit/components/uniffi-bindgen-gecko-js/components/generated/RustSuggest.sys.mjs",
});

add_setup(async function init() {
  UrlbarPrefs.set("maxRichResults", 10);

  let engine = await addTestSuggestionsEngine();
  await SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);

  await QuickSuggestTestUtils.ensureQuickSuggestInit();
});

add_task(async function telemetryType() {
  await doTelemetryTypeTest({
    feature: "AmpSuggestions",
    tests: [
      {
        source: "rust",
        expected: "adm_sponsored",
      },
      {
        source: "merino",
        expected: "adm_sponsored",
      },
    ],
  });
});

add_task(async function prefs() {
  let context = createContext("amp", {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });

  await doResultCheckTest({
    env: {
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
          type: QuickSuggestTestUtils.RS_TYPE.AMP,
          attachment: [QuickSuggestTestUtils.ampRemoteSettings()],
        },
      ],
    },
    tests: [
      {
        description: "Enable all and sponsored",
        prefs: [
          ["suggest.quicksuggest.all", true],
          ["suggest.quicksuggest.sponsored", true],
        ],
        context,
        expected: [QuickSuggestTestUtils.ampResult({ suggestedIndex: -1 })],
      },
      {
        description: "Enable all, disable sponsored",
        prefs: [
          ["suggest.quicksuggest.all", true],
          ["suggest.quicksuggest.sponsored", false],
        ],
        context,
        expected: [],
      },
      {
        description: "Disable all, enable sponsored",
        prefs: [
          ["suggest.quicksuggest.all", false],
          ["suggest.quicksuggest.sponsored", true],
        ],
        context,
        expected: [],
      },
      {
        description: "Disable all and sponsored",
        prefs: [
          ["suggest.quicksuggest.all", false],
          ["suggest.quicksuggest.sponsored", false],
        ],
        context,
        expected: [],
      },
      {
        description: "browser.search.suggest.enabled is irrelevant",
        prefs: [
          ["suggest.quicksuggest.all", true],
          ["suggest.quicksuggest.sponsored", true],
          ["browser.search.suggest.enabled", false],
        ],
        context,
        expected: [QuickSuggestTestUtils.ampResult({ suggestedIndex: -1 })],
      },
      {
        description: "suggest.searches is irrelevant",
        prefs: [
          ["suggest.quicksuggest.all", true],
          ["suggest.quicksuggest.sponsored", true],
          ["suggest.searches", false],
        ],
        context,
        expected: [QuickSuggestTestUtils.ampResult({ suggestedIndex: -1 })],
      },
      {
        description: "Feature gate is off",
        prefs: [
          ["suggest.quicksuggest.all", true],
          ["suggest.quicksuggest.sponsored", true],
          ["amp.featureGate", false],
        ],
        context,
        expected: [],
      },
      {
        description: "Local feature switch is off",
        prefs: [
          ["suggest.quicksuggest.all", true],
          ["suggest.quicksuggest.sponsored", true],
          ["suggest.amp", false],
        ],
        context,
        expected: [],
      },
    ],
  });
});

add_task(async function keyword() {
  await doResultCheckTest({
    env: {
      prefs: [
        ["suggest.quicksuggest.all", true],
        ["suggest.quicksuggest.sponsored", true],
      ],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
          type: QuickSuggestTestUtils.RS_TYPE.AMP,
          attachment: [QuickSuggestTestUtils.ampRemoteSettings()],
        },
      ],
    },
    tests: [
      {
        description: "Case insentive",
        context: createContext("AMp", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        expected: [QuickSuggestTestUtils.ampResult({ suggestedIndex: -1 })],
      },
      {
        description: "Case insentive and leading spaces",
        context: createContext("    aMP", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        expected: [QuickSuggestTestUtils.ampResult({ suggestedIndex: -1 })],
      },
      {
        description: "Empty string",
        context: createContext("", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        expected: [],
      },
      {
        description: "A space",
        context: createContext(" ", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        expected: [],
      },
      {
        description: "Some spaces",
        context: createContext("    ", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        expected: [],
      },
    ],
  });
});

add_task(async function privateContext() {
  await doResultCheckTest({
    env: {
      prefs: [
        ["suggest.quicksuggest.all", true],
        ["suggest.quicksuggest.sponsored", true],
      ],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
          type: QuickSuggestTestUtils.RS_TYPE.AMP,
          attachment: [QuickSuggestTestUtils.ampRemoteSettings()],
        },
      ],
    },
    tests: [
      {
        prefs: [["browser.search.suggest.enabled.private", true]],
        context: createContext("amp", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: true,
        }),
        expected: [],
      },
      {
        prefs: [["browser.search.suggest.enabled.private", false]],
        context: createContext("amp", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: true,
        }),
        expected: [],
      },
    ],
  });
});

add_task(async function showSearchSuggestionsFirst() {
  let context = createContext("amp", { isPrivate: false });

  // Add some history that will match our query below.
  let histories = Array.from(
    { length: UrlbarPrefs.get("maxRichResults") },
    (_, i) => `http://example.com/amp/${i}`
  );
  let historyResults = histories
    .map(url =>
      makeVisitResult(context, {
        uri: url,
        title: "test visit for " + url,
      })
    )
    .reverse()
    .slice(0, histories.length - 4);

  await doResultCheckTest({
    env: {
      prefs: [
        ["suggest.quicksuggest.all", true],
        ["suggest.quicksuggest.sponsored", true],
        ["browser.search.suggest.enabled", true],
        ["suggest.searches", true],
      ],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
          type: QuickSuggestTestUtils.RS_TYPE.AMP,
          attachment: [QuickSuggestTestUtils.ampRemoteSettings()],
        },
      ],
    },
    tests: [
      {
        description:
          "When search suggestions come before general results and the only general result is a quick suggest result, it should come last.",
        prefs: [["showSearchSuggestionsFirst", true]],
        context,
        expected: [
          makeSearchResult(context, {
            heuristic: true,
            query: "amp",
            engineName: SearchService.defaultEngine.name,
          }),
          makeSearchResult(context, {
            query: "amp",
            suggestion: "amp foo",
            engineName: SearchService.defaultEngine.name,
          }),
          makeSearchResult(context, {
            query: "amp",
            suggestion: "amp bar",
            engineName: SearchService.defaultEngine.name,
          }),
          QuickSuggestTestUtils.ampResult(),
        ],
      },
      {
        description:
          "When search suggestions come before general results and there are other general results besides quick suggest, the quick suggest result should come last.",
        prefs: [["showSearchSuggestionsFirst", true]],
        histories,
        context,
        expected: [
          makeSearchResult(context, {
            heuristic: true,
            query: "amp",
            engineName: SearchService.defaultEngine.name,
          }),
          makeSearchResult(context, {
            query: "amp",
            suggestion: "amp foo",
            engineName: SearchService.defaultEngine.name,
          }),
          makeSearchResult(context, {
            query: "amp",
            suggestion: "amp bar",
            engineName: SearchService.defaultEngine.name,
          }),
          QuickSuggestTestUtils.ampResult(),
          ...historyResults,
        ],
      },
      {
        description:
          "When general results come before search suggestions and the only general result is a quick suggest result, it should come before suggestions.",
        prefs: [["showSearchSuggestionsFirst", false]],
        context,
        expected: [
          makeSearchResult(context, {
            heuristic: true,
            query: "amp",
            engineName: SearchService.defaultEngine.name,
          }),
          QuickSuggestTestUtils.ampResult({ suggestedIndex: -1 }),
          makeSearchResult(context, {
            query: "amp",
            suggestion: "amp foo",
            engineName: SearchService.defaultEngine.name,
          }),
          makeSearchResult(context, {
            query: "amp",
            suggestion: "amp bar",
            engineName: SearchService.defaultEngine.name,
          }),
        ],
      },
      {
        description:
          "When general results come before search suggestions and there are other general results besides quick suggest, the quick suggest result should be the last general result.",
        prefs: [["showSearchSuggestionsFirst", false]],
        histories,
        context,
        expected: [
          makeSearchResult(context, {
            heuristic: true,
            query: "amp",
            engineName: SearchService.defaultEngine.name,
          }),
          ...historyResults,
          QuickSuggestTestUtils.ampResult({ suggestedIndex: -1 }),
          makeSearchResult(context, {
            query: "amp",
            suggestion: "amp foo",
            engineName: SearchService.defaultEngine.name,
          }),
          makeSearchResult(context, {
            query: "amp",
            suggestion: "amp bar",
            engineName: SearchService.defaultEngine.name,
          }),
        ],
      },
    ],
  });
});

// Real quick suggest URLs include a timestamp template that
// UrlbarProviderQuickSuggest fills in when it fetches suggestions. When the
// user picks a quick suggest, its URL with its particular timestamp is added to
// history. If the user triggers the quick suggest again later, its new
// timestamp may be different from the one in the user's history. In that case,
// the two URLs should be treated as dupes and only the quick suggest should be
// shown, not the URL from history.
add_task(async function dedupeAgainstURL_timestamps() {
  const { TIMESTAMP_TEMPLATE, TIMESTAMP_LENGTH } = lazy.AmpSuggestions;
  const TIMESTAMP_SUGGESTION_URL = `http://example.com/timestamp-${TIMESTAMP_TEMPLATE}`;
  const TIMESTAMP_SUGGESTION_CLICK_URL = `http://click.reporting.test.com/timestamp-${TIMESTAMP_TEMPLATE}-foo`;

  // Add a visit that will match the query below and dupe the quick suggest.
  let dupeURL = TIMESTAMP_SUGGESTION_URL.replace(
    TIMESTAMP_TEMPLATE,
    "2013051113"
  );

  // Add other visits that will match the query and almost dupe the quick
  // suggest but not quite because they have invalid timestamps.
  let badTimestamps = [
    // not numeric digits
    "x".repeat(TIMESTAMP_LENGTH),
    // too few digits
    "5".repeat(TIMESTAMP_LENGTH - 1),
    // empty string, too few digits
    "",
  ];
  let badTimestampURLs = badTimestamps.map(str =>
    TIMESTAMP_SUGGESTION_URL.replace(TIMESTAMP_TEMPLATE, str)
  );

  let histories = [dupeURL, ...badTimestampURLs].map(uri => ({
    uri,
    title: "amp",
    transition: PlacesUtils.history.TRANSITION_TYPED,
  }));

  let context = createContext("amp", { isPrivate: false });
  let badTimestampResults = [...badTimestampURLs].reverse().map(uri =>
    makeVisitResult(context, {
      uri,
      title: "amp",
    })
  );

  let ampResultIndex = badTimestampResults.length + 1;

  await doResultCheckTest({
    env: {
      prefs: [
        ["suggest.searches", false],
        ["quicksuggest.ampTopPickCharThreshold", 0],
      ],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
          type: QuickSuggestTestUtils.RS_TYPE.AMP,
          attachment: [
            QuickSuggestTestUtils.ampRemoteSettings({
              url: TIMESTAMP_SUGGESTION_URL,
              click_url: TIMESTAMP_SUGGESTION_CLICK_URL,
            }),
          ],
        },
      ],
    },
    tests: [
      {
        description: "Timestamp with quicksuggest",
        prefs: [
          ["suggest.quicksuggest.all", true],
          ["suggest.quicksuggest.sponsored", true],
        ],
        histories,
        context,
        conditionalPayloadProperties: {
          url: {
            custom: (index, result) => {
              if (index != ampResultIndex) {
                return false;
              }

              QuickSuggestTestUtils.assertTimestampsReplaced(result, {
                url: TIMESTAMP_SUGGESTION_URL,
              });
              return true;
            },
          },
          sponsoredClickUrl: {
            custom: (index, result) => {
              if (index != ampResultIndex) {
                return false;
              }

              QuickSuggestTestUtils.assertTimestampsReplaced(result, {
                sponsoredClickUrl: TIMESTAMP_SUGGESTION_CLICK_URL,
              });
              return true;
            },
          },
        },
        expected: [
          makeSearchResult(context, {
            heuristic: true,
            query: "amp",
            engineName: SearchService.defaultEngine.name,
          }),
          ...badTimestampResults,
          QuickSuggestTestUtils.ampResult({
            url: TIMESTAMP_SUGGESTION_URL,
            suggestedIndex: -1,
          }),
        ],
      },
      {
        description: "Timestamp without quicksuggest",
        prefs: [
          ["suggest.quicksuggest.all", false],
          ["suggest.quicksuggest.sponsored", false],
        ],
        histories,
        context,
        expected: [
          makeSearchResult(context, {
            heuristic: true,
            query: "amp",
            engineName: SearchService.defaultEngine.name,
          }),
          ...badTimestampResults,
          makeVisitResult(context, {
            uri: dupeURL,
            title: "amp",
          }),
        ],
      },
    ],
  });
});

add_task(async function showLessFrequently() {
  await doShowLessFrequentlyTest({
    feature: "AmpSuggestions",
    showLessFrequentlyCountPref: "amp.showLessFrequentlyCount",
    minKeywordLengthPref: "amp.minKeywordLength",
    env: {
      prefs: [
        ["suggest.quicksuggest.all", true],
        ["suggest.quicksuggest.sponsored", true],
        // Make not top pick
        ["quicksuggest.ampTopPickCharThreshold", 100],
      ],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.OTHER,
          type: "configuration",
          configuration: {
            show_less_frequently_cap: 3,
          },
        },
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
          type: QuickSuggestTestUtils.RS_TYPE.AMP,
          attachment: [
            QuickSuggestTestUtils.ampRemoteSettings({
              keywords: [
                "amp full key",
                "amp full keyw",
                "amp full keywo",
                "amp full keywor",
                "amp full keyword",
              ],
              full_keywords: [["amp full keyword", 5]],
            }),
          ],
        },
      ],
    },
    tests: [
      {
        context: createContext("amp full key", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        // Index of result that will be executed the command.
        targetIndex: 0,
        // Before executing show_less_frequency command.
        before: {
          results: [
            QuickSuggestTestUtils.ampResult({
              fullKeyword: "amp full keyword",
              suggestedIndex: -1,
            }),
          ],
        },
        // After executing show_less_frequency command.
        after: {
          canShowLessFrequently: true,
          showLessFrequentlyCount: 1,
          minKeywordLength: 13,
          results: [],
        },
      },
      {
        context: createContext("amp full keywor", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        targetIndex: 0,
        before: {
          results: [
            QuickSuggestTestUtils.ampResult({
              fullKeyword: "amp full keyword",
              suggestedIndex: -1,
            }),
          ],
        },
        after: {
          canShowLessFrequently: true,
          showLessFrequentlyCount: 2,
          minKeywordLength: 16,
          results: [],
        },
      },
      {
        context: createContext("amp full keyword", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        targetIndex: 0,
        before: {
          results: [
            QuickSuggestTestUtils.ampResult({
              fullKeyword: "amp full keyword",
              suggestedIndex: -1,
            }),
          ],
        },
        after: {
          canShowLessFrequently: false,
          showLessFrequentlyCount: 3,
          minKeywordLength: 17,
          results: [],
        },
      },
    ],
  });
});

// Tests `UrlbarResult` dismissal.
add_task(async function dismissResult() {
  const { TIMESTAMP_TEMPLATE } = lazy.AmpSuggestions;
  const TIMESTAMP_SUGGESTION_URL = `http://example.com/timestamp-${TIMESTAMP_TEMPLATE}`;
  const TIMESTAMP_SUGGESTION_CLICK_URL = `http://click.reporting.test.com/timestamp-${TIMESTAMP_TEMPLATE}-foo`;

  await doDismissTest({
    env: {
      prefs: [
        ["suggest.quicksuggest.all", true],
        ["suggest.quicksuggest.sponsored", true],
        // Make not top pick
        ["quicksuggest.ampTopPickCharThreshold", 100],
      ],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
          type: QuickSuggestTestUtils.RS_TYPE.AMP,
          attachment: [
            QuickSuggestTestUtils.ampRemoteSettings(),
            QuickSuggestTestUtils.ampRemoteSettings({
              url: "http://example.com/",
              keywords: ["http page"],
            }),
            QuickSuggestTestUtils.ampRemoteSettings({
              url: "https://example.com/",
              keywords: ["https page"],
            }),
            QuickSuggestTestUtils.ampRemoteSettings({
              url: TIMESTAMP_SUGGESTION_URL,
              click_url: TIMESTAMP_SUGGESTION_CLICK_URL,
              keywords: ["timestamp"],
            }),
          ],
        },
      ],
    },
    tests: [
      {
        context: createContext("amp", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        // Index of result that will be executed the command.
        targetIndex: 0,
        // Before dismissing.
        before: {
          results: [
            QuickSuggestTestUtils.ampResult({
              suggestedIndex: -1,
            }),
          ],
        },
        // After dismissing.
        after: {
          results: [],
        },
      },
      {
        context: createContext("http page", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        targetIndex: 0,
        before: {
          results: [
            QuickSuggestTestUtils.ampResult({
              url: "http://example.com/",
              fullKeyword: "http page",
              suggestedIndex: -1,
            }),
          ],
        },
        after: {
          results: [],
        },
      },
      {
        context: createContext("https page", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        targetIndex: 0,
        before: {
          results: [
            QuickSuggestTestUtils.ampResult({
              url: "https://example.com/",
              fullKeyword: "https page",
              suggestedIndex: -1,
            }),
          ],
        },
        after: {
          results: [],
        },
      },
      {
        context: createContext("timestamp", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        conditionalPayloadProperties: {
          url: {
            custom: (_index, result) => {
              QuickSuggestTestUtils.assertTimestampsReplaced(result, {
                url: TIMESTAMP_SUGGESTION_URL,
              });
              return true;
            },
          },
          sponsoredClickUrl: {
            custom: (_index, result) => {
              QuickSuggestTestUtils.assertTimestampsReplaced(result, {
                sponsoredClickUrl: TIMESTAMP_SUGGESTION_CLICK_URL,
              });
              return true;
            },
          },
        },
        targetIndex: 0,
        before: {
          results: [
            QuickSuggestTestUtils.ampResult({
              url: TIMESTAMP_SUGGESTION_URL,
              fullKeyword: "timestamp",
              suggestedIndex: -1,
            }),
          ],
        },
        after: {
          results: [],
        },
      },
    ],
  });
});

add_task(async function sponsoredPriority() {
  let context = createContext("amp", { isPrivate: false });

  await doResultCheckTest({
    env: {
      prefs: [
        ["suggest.quicksuggest.all", true],
        ["suggest.quicksuggest.sponsored", true],
      ],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
          type: QuickSuggestTestUtils.RS_TYPE.AMP,
          attachment: [QuickSuggestTestUtils.ampRemoteSettings()],
        },
      ],
    },
    tests: [
      {
        context,
        expected: [
          makeSearchResult(context, {
            heuristic: true,
            query: "amp",
            engineName: SearchService.defaultEngine.name,
          }),
          makeSearchResult(context, {
            query: "amp",
            suggestion: "amp foo",
            engineName: SearchService.defaultEngine.name,
          }),
          makeSearchResult(context, {
            query: "amp",
            suggestion: "amp bar",
            engineName: SearchService.defaultEngine.name,
          }),
          QuickSuggestTestUtils.ampResult(),
        ],
      },
      {
        nimbus: {
          quickSuggestSponsoredPriority: true,
          quickSuggestSponsoredIndex: 1,
        },
        context,
        expected: [
          makeSearchResult(context, {
            heuristic: true,
            query: "amp",
            engineName: SearchService.defaultEngine.name,
          }),
          QuickSuggestTestUtils.ampResult({
            isBestMatch: true,
            suggestedIndex: 1,
            isSuggestedIndexRelativeToGroup: false,
          }),
          makeSearchResult(context, {
            query: "amp",
            suggestion: "amp foo",
            engineName: SearchService.defaultEngine.name,
          }),
          makeSearchResult(context, {
            query: "amp",
            suggestion: "amp bar",
            engineName: SearchService.defaultEngine.name,
          }),
        ],
      },
    ],
  });
});

// The `Amp` Rust providers should be passed to the Rust component when querying
//  depending on whether sponsored and non-sponsored suggestions are enabled.
add_task(async function rustProviders() {
  let result = QuickSuggestTestUtils.ampResult();

  await doRustBackendTest({
    env: {
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
          type: QuickSuggestTestUtils.RS_TYPE.AMP,
          attachment: [QuickSuggestTestUtils.ampRemoteSettings()],
        },
      ],
    },
    tests: [
      {
        prefs: [
          ["suggest.quicksuggest.all", true],
          ["suggest.quicksuggest.sponsored", true],
        ],
        input: "amp",
        expected: [result.payload.url],
      },
      {
        prefs: [
          ["suggest.quicksuggest.all", true],
          ["suggest.quicksuggest.sponsored", false],
        ],
        input: "amp",
        expected: [],
      },
      {
        prefs: [
          ["suggest.quicksuggest.all", false],
          ["suggest.quicksuggest.sponsored", true],
        ],
        input: "amp",
        expected: [],
      },
      {
        prefs: [
          ["suggest.quicksuggest.all", false],
          ["suggest.quicksuggest.sponsored", false],
        ],
        input: "amp",
        expected: [],
      },
    ],
  });
});

add_task(async function keywordLengthThreshold() {
  await doResultCheckTest({
    env: {
      prefs: [
        ["suggest.quicksuggest.all", true],
        ["suggest.quicksuggest.sponsored", true],
      ],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
          type: QuickSuggestTestUtils.RS_TYPE.AMP,
          attachment: [
            QuickSuggestTestUtils.ampRemoteSettings({
              keywords: ["x", "xx"],
            }),
          ],
        },
      ],
    },
    tests: [
      {
        context: createContext("x", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        expected: [],
      },
      {
        context: createContext("x ", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        expected: [],
      },
      {
        context: createContext(" x", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        expected: [],
      },
      {
        context: createContext("xx", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        expected: [
          QuickSuggestTestUtils.ampResult({
            fullKeyword: "xx",
            suggestedIndex: -1,
          }),
        ],
      },
    ],
  });
});

// AMP should be a top pick when `quicksuggest.ampTopPickCharThreshold` is
// non-zero and the query length meets the threshold; otherwise it should not be
// a top pick. It shouldn't matter whether the query is one of the suggestion's
// full keywords.
add_task(async function ampTopPickCharThreshold() {
  let key = input =>
    createContext(input, {
      providers: [UrlbarProviderQuickSuggest.name],
      isPrivate: false,
    });
  let normal = QuickSuggestTestUtils.ampResult({
    fullKeyword: "amp full keyword",
    suggestedIndex: -1,
  });
  let toppick = QuickSuggestTestUtils.ampResult({
    fullKeyword: "amp full keyword",
    isBestMatch: true,
    suggestedIndex: 1,
    isSuggestedIndexRelativeToGroup: false,
  });
  let xyz = QuickSuggestTestUtils.ampResult({
    fullKeyword: "xyz",
    suggestedIndex: -1,
  });

  await doResultCheckTest({
    env: {
      prefs: [
        ["suggest.quicksuggest.all", true],
        ["suggest.quicksuggest.sponsored", true],
        ["quicksuggest.ampTopPickCharThreshold", "amp full keywo".length],
      ],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
          type: QuickSuggestTestUtils.RS_TYPE.AMP,
          attachment: [
            QuickSuggestTestUtils.ampRemoteSettings({
              keywords: [
                "amp full key",
                "amp full keyw",
                "amp full keywo",
                "amp full keywor",
                "amp full keyword",
                "xyz",
              ],
              full_keywords: [
                ["amp full keyword", 5],
                ["xyz", 1],
              ],
            }),
          ],
        },
      ],
    },
    tests: [
      // No top pick: Matches an AMP suggestion but the query is shorter than the
      // threshold.
      { context: key("amp full key"), expected: [normal] },
      { context: key("amp full keyw"), expected: [normal] },
      { context: key("                 amp full key"), expected: [normal] },
      { context: key("                 amp full keyw"), expected: [normal] },

      // Top pick: Matches an AMP suggestion and the query meets the threshold.
      { context: key("amp full keywo"), expected: [toppick] },
      { context: key("amp full keywor"), expected: [toppick] },
      { context: key("amp full keyword"), expected: [toppick] },
      { context: key("AmP FuLl KeYwOrD"), expected: [toppick] },
      { context: key("               amp full keywo"), expected: [toppick] },
      { context: key("               amp full keywor"), expected: [toppick] },
      { context: key("               amp full keyword"), expected: [toppick] },
      { context: key("               AmP FuLl KeYwOrD"), expected: [toppick] },

      // No top pick: Matches an AMP suggestion but the query is shorter than the
      // threshold. It doesn't matter that the query is equal to the suggestion's
      // full keyword.
      { context: key("xyz"), expected: [xyz] },
      { context: key("XyZ"), expected: [xyz] },
      { context: key("                            xyz"), expected: [xyz] },
      { context: key("                            XyZ"), expected: [xyz] },

      // No match: These shouldn't match anything at all since they have extra
      // spaces at the end, but they're included for completeness.
      { context: key("                 amp full key   "), expected: [] },
      { context: key("                 amp full keyw   "), expected: [] },
      { context: key("                 amp full keywo   "), expected: [] },
      { context: key("                 amp full keywor   "), expected: [] },
      { context: key("                 amp full keyword   "), expected: [] },
      { context: key("                 AmP FuLl KeYwOrD   "), expected: [] },
      { context: key("                            xyz   "), expected: [] },
      { context: key("                            XyZ   "), expected: [] },
    ],
  });
});

// AMP should not be shown as a top pick when the threshold is zero.
add_task(async function ampTopPickCharThreshold_zero() {
  let key = input =>
    createContext(input, {
      providers: [UrlbarProviderQuickSuggest.name],
      isPrivate: false,
    });
  let normal = QuickSuggestTestUtils.ampResult({
    fullKeyword: "amp full keyword",
    suggestedIndex: -1,
  });
  let xyz = QuickSuggestTestUtils.ampResult({
    fullKeyword: "xyz",
    suggestedIndex: -1,
  });

  await doResultCheckTest({
    env: {
      prefs: [
        ["suggest.quicksuggest.all", true],
        ["suggest.quicksuggest.sponsored", true],
        ["quicksuggest.ampTopPickCharThreshold", 0],
      ],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
          type: QuickSuggestTestUtils.RS_TYPE.AMP,
          attachment: [
            QuickSuggestTestUtils.ampRemoteSettings({
              keywords: [
                "amp full key",
                "amp full keyw",
                "amp full keywo",
                "amp full keywor",
                "amp full keyword",
                "xyz",
              ],
              full_keywords: [
                ["amp full keyword", 5],
                ["xyz", 1],
              ],
            }),
          ],
        },
      ],
    },
    tests: [
      { context: key("amp full key"), expected: [normal] },
      { context: key("amp full keyw"), expected: [normal] },
      { context: key("amp full keywo"), expected: [normal] },
      { context: key("amp full keywor"), expected: [normal] },
      { context: key("amp full keyword"), expected: [normal] },
      { context: key("AmP FuLl KeYwOrD"), expected: [normal] },
      { context: key("xyz"), expected: [xyz] },
      { context: key("XyZ"), expected: [xyz] },
    ],
  });
});

// Tests `ampMatchingStrategy`.
add_task(async function ampMatchingStrategy() {
  UrlbarPrefs.set("suggest.quicksuggest.all", true);
  UrlbarPrefs.set("suggest.quicksuggest.sponsored", true);
  await QuickSuggestTestUtils.forceSync();

  // Test each strategy in `AmpMatchingStrategy`. There are only a few.
  for (let [key, value] of Object.entries(lazy.AmpMatchingStrategy)) {
    await doAmpMatchingStrategyTest({ key, value });

    // Reset back to the default strategy just to make sure that works.
    await doAmpMatchingStrategyTest({
      key: "(default)",
      value: 0,
    });
  }

  // Test an invalid strategy integer value. The default strategy should
  // actually be used. First we need to set a valid non-default strategy.
  await doAmpMatchingStrategyTest({
    key: "FTS_AGAINST_TITLE",
    value: lazy.AmpMatchingStrategy.FTS_AGAINST_TITLE,
  });
  await doAmpMatchingStrategyTest({
    key: "(invalid)",
    value: 99,
    expectedStrategy: 0,
  });

  Services.prefs.clearUserPref(
    "browser.urlbar.quicksuggest.ampMatchingStrategy"
  );
  await QuickSuggestTestUtils.forceSync();
});

async function doAmpMatchingStrategyTest({
  key,
  value,
  expectedStrategy = value,
}) {
  info("Doing ampMatchingStrategy test: " + JSON.stringify({ key, value }));

  let sandbox = sinon.createSandbox();
  let ingestSpy = sandbox.spy(QuickSuggest.rustBackend._test_store, "ingest");

  // Set the strategy. It should trigger ingest. (Assuming it's different from
  // the current strategy. If it's not, ingest won't happen.)
  Services.prefs.setIntPref(
    "browser.urlbar.quicksuggest.ampMatchingStrategy",
    value
  );

  let ingestCall = await TestUtils.waitForCondition(() => {
    return ingestSpy.getCalls().find(call => {
      let ingestConstraints = call.args[0];
      return ingestConstraints?.providers[0] == lazy.SuggestionProvider.AMP;
    });
  }, "Waiting for ingest() to be called with Amp provider");

  // Check the provider constraints in the ingest constraints.
  let { providerConstraints } = ingestCall.args[0];
  if (!expectedStrategy) {
    Assert.ok(
      !providerConstraints,
      "ingest() should not have been called with provider constraints"
    );
  } else {
    Assert.ok(
      providerConstraints,
      "ingest() should have been called with provider constraints"
    );
    Assert.strictEqual(
      providerConstraints.ampAlternativeMatching,
      expectedStrategy,
      "ampAlternativeMatching should have been set"
    );
  }

  // Now do a query to make sure it also uses the correct provider constraints.
  // No need to use `check_results()`. We only need to trigger a query, and
  // checking the right results unnecessarily complicates things.
  let querySpy = sandbox.spy(
    QuickSuggest.rustBackend._test_store,
    "queryWithMetrics"
  );

  let controller = UrlbarTestUtils.newMockController();
  await controller.startQuery(
    createContext("amp", {
      providers: [UrlbarProviderQuickSuggest.name],
      isPrivate: false,
    })
  );

  let queryCalls = querySpy.getCalls();
  Assert.equal(queryCalls.length, 1, "query() should have been called once");

  let query = queryCalls[0].args[0];
  Assert.ok(query, "query() should have been called with a query object");
  Assert.ok(
    query.providerConstraints,
    "query() should have been called with provider constraints"
  );

  if (!expectedStrategy) {
    Assert.strictEqual(
      query.providerConstraints.ampAlternativeMatching,
      null,
      "ampAlternativeMatching should not have been set on query provider constraints"
    );
  } else {
    Assert.strictEqual(
      query.providerConstraints.ampAlternativeMatching,
      expectedStrategy,
      "ampAlternativeMatching should have been set on query provider constraints"
    );
  }

  sandbox.restore();
}

add_task(async function online() {
  let context = createContext("amp", {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });

  await doResultCheckTest({
    env: {
      prefs: [
        ["suggest.quicksuggest.all", true],
        ["suggest.quicksuggest.sponsored", true],
      ],
      merinoSuggestions: [
        {
          title: "Amp Suggestion",
          url: "https://example.com/amp",
          provider: "adm",
          is_sponsored: true,
          score: 0.31,
          icon: "https://example.com/amp-icon",
          iab_category: "22 - Shopping",
          block_id: 1,
          full_keyword: "amp",
          advertiser: "Amp",
          impression_url: "https://example.com/amp-impression",
          click_url: "https://example.com/amp-click",
        },
      ],
    },
    tests: [
      {
        prefs: [
          ["quicksuggest.online.available", true],
          ["quicksuggest.online.enabled", true],
        ],
        context,
        expected: [
          QuickSuggestTestUtils.ampResult({
            source: "merino",
            provider: "adm",
            icon: "https://example.com/amp-icon",
            iabCategory: "22 - Shopping",
            requestId: "request_id",
            suggestedIndex: -1,
          }),
        ],
      },
      {
        prefs: [
          ["quicksuggest.online.available", false],
          ["quicksuggest.online.enabled", true],
        ],
        context,
        expected: [],
      },
      {
        prefs: [
          ["quicksuggest.online.available", true],
          ["quicksuggest.online.enabled", false],
        ],
        context,
        expected: [],
      },
    ],
  });
});

// Tests an AMP suggestion with `is_top_pick: true`.
add_task(async function online_isTopPick_true() {
  let context = createContext("amp", {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });

  await doResultCheckTest({
    env: {
      prefs: [
        ["quicksuggest.online.available", true],
        ["quicksuggest.online.enabled", true],
        ["suggest.quicksuggest.all", true],
        ["suggest.quicksuggest.sponsored", true],
      ],
      merinoSuggestions: [
        {
          is_top_pick: true,
          title: "Amp Suggestion",
          url: "https://example.com/amp",
          provider: "adm",
          is_sponsored: true,
          score: 0.31,
          icon: "https://example.com/amp-icon",
          iab_category: "22 - Shopping",
          block_id: 1,
          full_keyword: "amp",
          advertiser: "Amp",
          impression_url: "https://example.com/amp-impression",
          click_url: "https://example.com/amp-click",
        },
      ],
    },
    tests: [
      {
        context,
        expected: [
          QuickSuggestTestUtils.ampResult({
            // The following properties should be set due to
            // `suggestion.is_top_pick == true`:
            isBestMatch: true,
            suggestedIndex: 1,
            isSuggestedIndexRelativeToGroup: false,

            // Usual properties
            source: "merino",
            provider: "adm",
            icon: "https://example.com/amp-icon",
            iabCategory: "22 - Shopping",
            requestId: "request_id",
          }),
        ],
      },
    ],
  });
});

// Tests an AMP suggestion with `is_top_pick: false`.
add_task(async function online_isTopPick_false() {
  let context = createContext("amp", {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });

  await doResultCheckTest({
    env: {
      prefs: [
        ["quicksuggest.online.available", true],
        ["quicksuggest.online.enabled", true],
        ["suggest.quicksuggest.all", true],
        ["suggest.quicksuggest.sponsored", true],
      ],
      merinoSuggestions: [
        {
          is_top_pick: false,
          title: "Amp Suggestion",
          url: "https://example.com/amp",
          provider: "adm",
          is_sponsored: true,
          score: 0.31,
          icon: "https://example.com/amp-icon",
          iab_category: "22 - Shopping",
          block_id: 1,
          full_keyword: "amp",
          advertiser: "Amp",
          impression_url: "https://example.com/amp-impression",
          click_url: "https://example.com/amp-click",
        },
      ],
    },
    tests: [
      {
        context,
        expected: [
          QuickSuggestTestUtils.ampResult({
            // `isBestMatch` should be false
            isBestMatch: false,

            // Usual properties
            source: "merino",
            provider: "adm",
            icon: "https://example.com/amp-icon",
            iabCategory: "22 - Shopping",
            requestId: "request_id",
            suggestedIndex: -1,
          }),
        ],
      },
    ],
  });
});
