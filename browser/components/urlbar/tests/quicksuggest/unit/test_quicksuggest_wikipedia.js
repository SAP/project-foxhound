/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests for wikipedia suggestions.

"use strict";

add_setup(async function init() {
  UrlbarPrefs.set("maxRichResults", 10);

  let engine = await addTestSuggestionsEngine();
  await SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);

  await QuickSuggestTestUtils.ensureQuickSuggestInit();
});

add_task(async function telemetryType() {
  await doTelemetryTypeTest({
    feature: "WikipediaSuggestions",
    tests: [
      {
        source: "rust",
        expected: "adm_nonsponsored",
      },
      {
        source: "merino",
        expected: "wikipedia",
      },
    ],
  });
});

add_task(async function prefs() {
  let context = createContext("wikipedia", {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });

  await doResultCheckTest({
    env: {
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.OTHER,
          type: QuickSuggestTestUtils.RS_TYPE.WIKIPEDIA,
          attachment: [QuickSuggestTestUtils.wikipediaRemoteSettings()],
        },
      ],
    },
    tests: [
      {
        description: "Enable all",
        prefs: [["suggest.quicksuggest.all", true]],
        context,
        expected: [
          QuickSuggestTestUtils.wikipediaResult({ suggestedIndex: -1 }),
        ],
      },
      {
        description: "Disable all",
        prefs: [["suggest.quicksuggest.all", false]],
        context,
        expected: [],
      },
      {
        description: "Feature gate is off",
        prefs: [
          ["suggest.quicksuggest.all", true],
          ["suggest.quicksuggest.sponsored", true],
          ["wikipedia.featureGate", false],
        ],
        context,
        expected: [],
      },
      {
        description: "Local feature switch is off",
        prefs: [
          ["suggest.quicksuggest.all", true],
          ["suggest.quicksuggest.sponsored", true],
          ["suggest.wikipedia", false],
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
      prefs: [["suggest.quicksuggest.all", true]],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.OTHER,
          type: QuickSuggestTestUtils.RS_TYPE.WIKIPEDIA,
          attachment: [QuickSuggestTestUtils.wikipediaRemoteSettings()],
        },
      ],
    },
    tests: [
      {
        description: "Case insentive",
        context: createContext("WikiPedia", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        expected: [
          QuickSuggestTestUtils.wikipediaResult({ suggestedIndex: -1 }),
        ],
      },
      {
        description: "Case insentive and leading spaces",
        context: createContext("    wikiPEDIA", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        expected: [
          QuickSuggestTestUtils.wikipediaResult({ suggestedIndex: -1 }),
        ],
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
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.OTHER,
          type: QuickSuggestTestUtils.RS_TYPE.WIKIPEDIA,
          attachment: [QuickSuggestTestUtils.wikipediaRemoteSettings()],
        },
      ],
    },
    tests: [
      {
        prefs: [
          ["suggest.quicksuggest.all", true],
          ["browser.search.suggest.enabled.private", true],
        ],
        context: createContext("wikipedia", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: true,
        }),
        expected: [],
      },
    ],
  });
});

add_task(async function showSearchSuggestionsFirst() {
  let context = createContext("wikipedia", { isPrivate: false });

  // Add some history that will match our query below.
  let histories = Array.from(
    { length: UrlbarPrefs.get("maxRichResults") },
    (_, i) => `http://example.com/wikipedia/${i}`
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
        ["browser.search.suggest.enabled", true],
        ["suggest.searches", true],
        ["suggest.quickactions", false],
      ],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.OTHER,
          type: QuickSuggestTestUtils.RS_TYPE.WIKIPEDIA,
          attachment: [QuickSuggestTestUtils.wikipediaRemoteSettings()],
        },
      ],
    },
    tests: [
      {
        description:
          "When search suggestions come before general results and the only general result is a quick suggest result, it should come last.",
        prefs: [["showSearchSuggestionsFirst", true]],
        histories,
        context,
        expected: [
          makeSearchResult(context, {
            heuristic: true,
            query: "wikipedia",
            engineName: SearchService.defaultEngine.name,
          }),
          makeSearchResult(context, {
            query: "wikipedia",
            suggestion: "wikipedia foo",
            engineName: SearchService.defaultEngine.name,
          }),
          makeSearchResult(context, {
            query: "wikipedia",
            suggestion: "wikipedia bar",
            engineName: SearchService.defaultEngine.name,
          }),
          ...historyResults,
          QuickSuggestTestUtils.wikipediaResult(),
        ],
      },
      {
        description:
          "When search suggestions come before general results and there are other general results besides quick suggest, the quick suggest result should come last.",
        prefs: [["showSearchSuggestionsFirst", false]],
        histories,
        context,
        expected: [
          makeSearchResult(context, {
            heuristic: true,
            query: "wikipedia",
            engineName: SearchService.defaultEngine.name,
          }),
          ...historyResults,
          QuickSuggestTestUtils.wikipediaResult({ suggestedIndex: -1 }),
          makeSearchResult(context, {
            query: "wikipedia",
            suggestion: "wikipedia foo",
            engineName: SearchService.defaultEngine.name,
          }),
          makeSearchResult(context, {
            query: "wikipedia",
            suggestion: "wikipedia bar",
            engineName: SearchService.defaultEngine.name,
          }),
        ],
      },
    ],
  });
});

// Tests `UrlbarResult` dismissal.
add_task(async function dismissResult() {
  await doDismissTest({
    env: {
      prefs: [["suggest.quicksuggest.all", true]],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.OTHER,
          type: QuickSuggestTestUtils.RS_TYPE.WIKIPEDIA,
          attachment: [
            QuickSuggestTestUtils.wikipediaRemoteSettings(),
            QuickSuggestTestUtils.wikipediaRemoteSettings({
              url: "http://example.com/",
              keywords: ["http page"],
            }),
            QuickSuggestTestUtils.wikipediaRemoteSettings({
              url: "https://example.com/",
              keywords: ["https page"],
            }),
          ],
        },
      ],
    },
    tests: [
      {
        context: createContext("wikipedia", {
          providers: [UrlbarProviderQuickSuggest.name],
          isPrivate: false,
        }),
        // Index of result that will be executed the command.
        targetIndex: 0,
        // Before dismissing.
        before: {
          results: [
            QuickSuggestTestUtils.wikipediaResult({
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
            QuickSuggestTestUtils.wikipediaResult({
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
            QuickSuggestTestUtils.wikipediaResult({
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
    ],
  });
});

// The `Wikipedia` Rust providers should be passed to the Rust component when
// querying depending on whether sponsored and non-sponsored suggestions are
// enabled.
add_task(async function rustProviders() {
  let result = QuickSuggestTestUtils.wikipediaResult();

  await doRustBackendTest({
    env: {
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.OTHER,
          type: QuickSuggestTestUtils.RS_TYPE.WIKIPEDIA,
          attachment: [QuickSuggestTestUtils.wikipediaRemoteSettings()],
        },
      ],
    },
    tests: [
      {
        prefs: [["suggest.quicksuggest.all", true]],
        input: "wikipedia",
        expected: [result.payload.url],
      },
      {
        prefs: [["suggest.quicksuggest.all", false]],
        input: "wikipedia",
        expected: [],
      },
    ],
  });
});

add_task(async function keywordLengthThreshold() {
  await doResultCheckTest({
    env: {
      prefs: [["suggest.quicksuggest.all", true]],
      remoteSettingRecords: [
        {
          collection: QuickSuggestTestUtils.RS_COLLECTION.OTHER,
          type: QuickSuggestTestUtils.RS_TYPE.WIKIPEDIA,
          attachment: [
            QuickSuggestTestUtils.wikipediaRemoteSettings({
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
          QuickSuggestTestUtils.wikipediaResult({
            fullKeyword: "xx",
            suggestedIndex: -1,
          }),
        ],
      },
    ],
  });
});

add_task(async function online() {
  let context = createContext("wikipedia", {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });

  await doResultCheckTest({
    env: {
      prefs: [["suggest.quicksuggest.all", true]],
      merinoSuggestions: [
        {
          title: "Wikipedia Suggestion",
          url: "https://example.com/wikipedia",
          is_sponsored: false,
          score: 0.23,
          description: "description",
          icon: "https://example.com/wikipedia-icon",
          full_keyword: "wikipedia",
          advertiser: "dynamic-wikipedia",
          block_id: 0,
          provider: "wikipedia",
          categories: [6], // Education
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
          QuickSuggestTestUtils.wikipediaResult({
            source: "merino",
            provider: "wikipedia",
            icon: "https://example.com/wikipedia-icon",
            telemetryType: "wikipedia",
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
