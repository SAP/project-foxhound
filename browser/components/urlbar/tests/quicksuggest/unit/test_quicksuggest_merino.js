/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests Merino integration with UrlbarProviderQuickSuggest.

"use strict";

// relative to `browser.urlbar`
const PREF_DATA_COLLECTION_ENABLED = "quicksuggest.dataCollection.enabled";
const PREF_MERINO_ENABLED = "merino.enabled";
const PREF_REMOTE_SETTINGS_ENABLED = "quicksuggest.remoteSettings.enabled";

const SEARCH_STRING = "frab";

const REMOTE_SETTINGS_RESULTS = [
  {
    id: 1,
    url: "http://test.com/q=frabbits",
    title: "frabbits",
    keywords: [SEARCH_STRING],
    click_url: "http://click.reporting.test.com/",
    impression_url: "http://impression.reporting.test.com/",
    advertiser: "TestAdvertiser",
  },
];

const EXPECTED_REMOTE_SETTINGS_URLBAR_RESULT = {
  type: UrlbarUtils.RESULT_TYPE.URL,
  source: UrlbarUtils.RESULT_SOURCE.SEARCH,
  heuristic: false,
  payload: {
    qsSuggestion: SEARCH_STRING,
    title: "frabbits",
    url: "http://test.com/q=frabbits",
    originalUrl: "http://test.com/q=frabbits",
    icon: null,
    sponsoredImpressionUrl: "http://impression.reporting.test.com/",
    sponsoredClickUrl: "http://click.reporting.test.com/",
    sponsoredBlockId: 1,
    sponsoredAdvertiser: "TestAdvertiser",
    isSponsored: true,
    helpUrl: QuickSuggest.HELP_URL,
    helpL10n: {
      id: UrlbarPrefs.get("resultMenu")
        ? "urlbar-result-menu-learn-more-about-firefox-suggest"
        : "firefox-suggest-urlbar-learn-more",
    },
    isBlockable: false,
    blockL10n: {
      id: UrlbarPrefs.get("resultMenu")
        ? "urlbar-result-menu-dismiss-firefox-suggest"
        : "firefox-suggest-urlbar-block",
    },
    displayUrl: "http://test.com/q=frabbits",
    source: "remote-settings",
  },
};

const EXPECTED_MERINO_URLBAR_RESULT = {
  type: UrlbarUtils.RESULT_TYPE.URL,
  source: UrlbarUtils.RESULT_SOURCE.SEARCH,
  heuristic: false,
  payload: {
    qsSuggestion: "full_keyword",
    title: "title",
    url: "url",
    originalUrl: "url",
    icon: null,
    sponsoredImpressionUrl: "impression_url",
    sponsoredClickUrl: "click_url",
    sponsoredBlockId: 1,
    sponsoredAdvertiser: "advertiser",
    isSponsored: true,
    helpUrl: QuickSuggest.HELP_URL,
    helpL10n: {
      id: UrlbarPrefs.get("resultMenu")
        ? "urlbar-result-menu-learn-more-about-firefox-suggest"
        : "firefox-suggest-urlbar-learn-more",
    },
    isBlockable: false,
    blockL10n: {
      id: UrlbarPrefs.get("resultMenu")
        ? "urlbar-result-menu-dismiss-firefox-suggest"
        : "firefox-suggest-urlbar-block",
    },
    displayUrl: "url",
    requestId: "request_id",
    source: "merino",
  },
};

// `UrlbarProviderQuickSuggest.#merino` is lazily created on the first Merino
// fetch, so it's easiest to create `gClient` lazily too.
XPCOMUtils.defineLazyGetter(
  this,
  "gClient",
  () => UrlbarProviderQuickSuggest._test_merino
);

add_task(async function init() {
  UrlbarPrefs.set("quicksuggest.enabled", true);
  UrlbarPrefs.set("suggest.quicksuggest.nonsponsored", true);
  UrlbarPrefs.set("suggest.quicksuggest.sponsored", true);
  UrlbarPrefs.set("quicksuggest.shouldShowOnboardingDialog", false);

  await MerinoTestUtils.server.start();

  // Set up the remote settings client with the test data.
  await QuickSuggestTestUtils.ensureQuickSuggestInit({
    remoteSettingsResults: REMOTE_SETTINGS_RESULTS,
  });

  Assert.equal(
    typeof RemoteSettingsClient.DEFAULT_SUGGESTION_SCORE,
    "number",
    "Sanity check: DEFAULT_SUGGESTION_SCORE is defined"
  );
});

// Tests with Merino enabled and remote settings disabled.
add_task(async function oneEnabled_merino() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, false);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  let histograms = MerinoTestUtils.getAndClearHistograms();

  // Use a score lower than the remote settings score to make sure the
  // suggestion is included regardless.
  MerinoTestUtils.server.response.body.suggestions[0].score =
    RemoteSettingsClient.DEFAULT_SUGGESTION_SCORE / 2;

  let context = createContext(SEARCH_STRING, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [EXPECTED_MERINO_URLBAR_RESULT],
  });

  MerinoTestUtils.checkAndClearHistograms({
    histograms,
    response: "success",
    latencyRecorded: true,
    client: gClient,
  });

  MerinoTestUtils.server.reset();
  gClient.resetSession();
});

// Tests with Merino disabled and remote settings enabled.
add_task(async function oneEnabled_remoteSettings() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, false);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, true);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  let histograms = MerinoTestUtils.getAndClearHistograms();

  let context = createContext(SEARCH_STRING, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [EXPECTED_REMOTE_SETTINGS_URLBAR_RESULT],
  });

  MerinoTestUtils.checkAndClearHistograms({
    histograms,
    response: null,
    latencyRecorded: false,
    client: gClient,
  });
});

// Tests with Merino enabled but with data collection disabled. Results should
// not be fetched from Merino in that case. Also tests with remote settings
// enabled.
add_task(async function dataCollectionDisabled() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, true);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, false);

  let context = createContext(SEARCH_STRING, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [EXPECTED_REMOTE_SETTINGS_URLBAR_RESULT],
  });
});

// When the Merino suggestion has a higher score than the remote settings
// suggestion, the Merino suggestion should be used.
add_task(async function higherScore() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, true);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  let histograms = MerinoTestUtils.getAndClearHistograms();

  MerinoTestUtils.server.response.body.suggestions[0].score =
    2 * RemoteSettingsClient.DEFAULT_SUGGESTION_SCORE;

  let context = createContext(SEARCH_STRING, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [EXPECTED_MERINO_URLBAR_RESULT],
  });

  MerinoTestUtils.checkAndClearHistograms({
    histograms,
    response: "success",
    latencyRecorded: true,
    client: gClient,
  });

  MerinoTestUtils.server.reset();
  gClient.resetSession();
});

// When the Merino suggestion has a lower score than the remote settings
// suggestion, the remote settings suggestion should be used.
add_task(async function lowerScore() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, true);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  let histograms = MerinoTestUtils.getAndClearHistograms();

  MerinoTestUtils.server.response.body.suggestions[0].score =
    RemoteSettingsClient.DEFAULT_SUGGESTION_SCORE / 2;

  let context = createContext(SEARCH_STRING, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [EXPECTED_REMOTE_SETTINGS_URLBAR_RESULT],
  });

  MerinoTestUtils.checkAndClearHistograms({
    histograms,
    response: "success",
    latencyRecorded: true,
    client: gClient,
  });

  MerinoTestUtils.server.reset();
  gClient.resetSession();
});

// When the Merino and remote settings suggestions have the same score, the
// remote settings suggestion should be used.
add_task(async function sameScore() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, true);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  let histograms = MerinoTestUtils.getAndClearHistograms();

  MerinoTestUtils.server.response.body.suggestions[0].score =
    RemoteSettingsClient.DEFAULT_SUGGESTION_SCORE;

  let context = createContext(SEARCH_STRING, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [EXPECTED_REMOTE_SETTINGS_URLBAR_RESULT],
  });

  MerinoTestUtils.checkAndClearHistograms({
    histograms,
    response: "success",
    latencyRecorded: true,
    client: gClient,
  });

  MerinoTestUtils.server.reset();
  gClient.resetSession();
});

// When the Merino suggestion does not include a score, the remote settings
// suggestion should be used.
add_task(async function noMerinoScore() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, true);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  let histograms = MerinoTestUtils.getAndClearHistograms();

  Assert.equal(
    typeof MerinoTestUtils.server.response.body.suggestions[0].score,
    "number",
    "Sanity check: First suggestion has a score"
  );
  delete MerinoTestUtils.server.response.body.suggestions[0].score;

  let context = createContext(SEARCH_STRING, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [EXPECTED_REMOTE_SETTINGS_URLBAR_RESULT],
  });

  MerinoTestUtils.checkAndClearHistograms({
    histograms,
    response: "success",
    latencyRecorded: true,
    client: gClient,
  });

  MerinoTestUtils.server.reset();
  gClient.resetSession();
});

// When remote settings doesn't return a suggestion but Merino does, the Merino
// suggestion should be used.
add_task(async function noSuggestion_remoteSettings() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, true);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  let histograms = MerinoTestUtils.getAndClearHistograms();

  let context = createContext("this doesn't match remote settings", {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [EXPECTED_MERINO_URLBAR_RESULT],
  });

  MerinoTestUtils.checkAndClearHistograms({
    histograms,
    response: "success",
    latencyRecorded: true,
    client: gClient,
  });

  MerinoTestUtils.server.reset();
  gClient.resetSession();
});

// When Merino doesn't return a suggestion but remote settings does, the remote
// settings suggestion should be used.
add_task(async function noSuggestion_merino() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, true);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  let histograms = MerinoTestUtils.getAndClearHistograms();

  MerinoTestUtils.server.response.body.suggestions = [];

  let context = createContext(SEARCH_STRING, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [EXPECTED_REMOTE_SETTINGS_URLBAR_RESULT],
  });

  MerinoTestUtils.checkAndClearHistograms({
    histograms,
    response: "no_suggestion",
    latencyRecorded: true,
    client: gClient,
  });

  MerinoTestUtils.server.reset();
  gClient.resetSession();
});

// Tests with both Merino and remote settings disabled.
add_task(async function bothDisabled() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, false);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, false);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  let histograms = MerinoTestUtils.getAndClearHistograms();

  let context = createContext(SEARCH_STRING, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({ context, matches: [] });

  MerinoTestUtils.checkAndClearHistograms({
    histograms,
    response: null,
    latencyRecorded: false,
    client: gClient,
  });
});

// When Merino returns multiple suggestions, the one with the largest score
// should be used.
add_task(async function multipleMerinoSuggestions() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, false);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  let histograms = MerinoTestUtils.getAndClearHistograms();

  MerinoTestUtils.server.response.body.suggestions = [
    {
      full_keyword: "multipleMerinoSuggestions 0 full_keyword",
      title: "multipleMerinoSuggestions 0 title",
      url: "multipleMerinoSuggestions 0 url",
      icon: "multipleMerinoSuggestions 0 icon",
      impression_url: "multipleMerinoSuggestions 0 impression_url",
      click_url: "multipleMerinoSuggestions 0 click_url",
      block_id: 0,
      advertiser: "multipleMerinoSuggestions 0 advertiser",
      is_sponsored: true,
      score: 0.1,
    },
    {
      full_keyword: "multipleMerinoSuggestions 1 full_keyword",
      title: "multipleMerinoSuggestions 1 title",
      url: "multipleMerinoSuggestions 1 url",
      icon: "multipleMerinoSuggestions 1 icon",
      impression_url: "multipleMerinoSuggestions 1 impression_url",
      click_url: "multipleMerinoSuggestions 1 click_url",
      block_id: 1,
      advertiser: "multipleMerinoSuggestions 1 advertiser",
      is_sponsored: true,
      score: 1,
    },
    {
      full_keyword: "multipleMerinoSuggestions 2 full_keyword",
      title: "multipleMerinoSuggestions 2 title",
      url: "multipleMerinoSuggestions 2 url",
      icon: "multipleMerinoSuggestions 2 icon",
      impression_url: "multipleMerinoSuggestions 2 impression_url",
      click_url: "multipleMerinoSuggestions 2 click_url",
      block_id: 2,
      advertiser: "multipleMerinoSuggestions 2 advertiser",
      is_sponsored: true,
      score: 0.2,
    },
  ];

  let context = createContext("test", {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [
      {
        type: UrlbarUtils.RESULT_TYPE.URL,
        source: UrlbarUtils.RESULT_SOURCE.SEARCH,
        heuristic: false,
        payload: {
          qsSuggestion: "multipleMerinoSuggestions 1 full_keyword",
          title: "multipleMerinoSuggestions 1 title",
          url: "multipleMerinoSuggestions 1 url",
          originalUrl: "multipleMerinoSuggestions 1 url",
          icon: "multipleMerinoSuggestions 1 icon",
          sponsoredImpressionUrl: "multipleMerinoSuggestions 1 impression_url",
          sponsoredClickUrl: "multipleMerinoSuggestions 1 click_url",
          sponsoredBlockId: 1,
          sponsoredAdvertiser: "multipleMerinoSuggestions 1 advertiser",
          isSponsored: true,
          helpUrl: QuickSuggest.HELP_URL,
          helpL10n: {
            id: UrlbarPrefs.get("resultMenu")
              ? "urlbar-result-menu-learn-more-about-firefox-suggest"
              : "firefox-suggest-urlbar-learn-more",
          },
          isBlockable: false,
          blockL10n: {
            id: UrlbarPrefs.get("resultMenu")
              ? "urlbar-result-menu-dismiss-firefox-suggest"
              : "firefox-suggest-urlbar-block",
          },
          displayUrl: "multipleMerinoSuggestions 1 url",
          requestId: "request_id",
          source: "merino",
        },
      },
    ],
  });

  MerinoTestUtils.checkAndClearHistograms({
    histograms,
    response: "success",
    latencyRecorded: true,
    client: gClient,
  });

  MerinoTestUtils.server.reset();
  gClient.resetSession();
});

// Timestamp templates in URLs should be replaced with real timestamps.
add_task(async function timestamps() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, false);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  // Set up the Merino response with template URLs.
  let suggestion = MerinoTestUtils.server.response.body.suggestions[0];
  let { TIMESTAMP_TEMPLATE } = QuickSuggest;

  suggestion.url = `http://example.com/time-${TIMESTAMP_TEMPLATE}`;
  suggestion.click_url = `http://example.com/time-${TIMESTAMP_TEMPLATE}-foo`;

  // Do a search.
  let context = createContext("test", {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  let controller = UrlbarTestUtils.newMockController({
    input: {
      isPrivate: context.isPrivate,
      onFirstResult() {
        return false;
      },
      getSearchSource() {
        return "dummy-search-source";
      },
      window: {
        location: {
          href: AppConstants.BROWSER_CHROME_URL,
        },
      },
    },
  });
  await controller.startQuery(context);

  // Should be one quick suggest result.
  Assert.equal(context.results.length, 1, "One result returned");
  let result = context.results[0];

  QuickSuggestTestUtils.assertTimestampsReplaced(result, {
    url: suggestion.click_url,
    sponsoredClickUrl: suggestion.click_url,
  });

  MerinoTestUtils.server.reset();
  gClient.resetSession();
});

// When both suggestion types are disabled but data collection is enabled, we
// should still send requests to Merino, and the requests should include an
// empty `providers` to tell Merino not to fetch any suggestions.
add_task(async function suggestedDisabled_dataCollectionEnabled() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, false);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);
  UrlbarPrefs.set("suggest.quicksuggest.nonsponsored", false);
  UrlbarPrefs.set("suggest.quicksuggest.sponsored", false);

  let histograms = MerinoTestUtils.getAndClearHistograms();

  let context = createContext("test", {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [],
  });

  // Check that the request is received and includes an empty `providers`.
  MerinoTestUtils.server.checkAndClearRequests([
    {
      params: {
        [MerinoTestUtils.SEARCH_PARAMS.QUERY]: "test",
        [MerinoTestUtils.SEARCH_PARAMS.SEQUENCE_NUMBER]: 0,
        [MerinoTestUtils.SEARCH_PARAMS.PROVIDERS]: "",
      },
    },
  ]);

  MerinoTestUtils.checkAndClearHistograms({
    histograms,
    response: "success",
    latencyRecorded: true,
    client: gClient,
  });

  UrlbarPrefs.set("suggest.quicksuggest.nonsponsored", true);
  UrlbarPrefs.set("suggest.quicksuggest.sponsored", true);
  gClient.resetSession();
});

// Test whether the blocking for Merino results works.
add_task(async function block() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, true);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  for (const suggestion of MerinoTestUtils.server.response.body.suggestions) {
    await QuickSuggest.blockedSuggestions.add(suggestion.url);
  }

  const context = createContext(SEARCH_STRING, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });

  await check_results({
    context,
    matches: [EXPECTED_REMOTE_SETTINGS_URLBAR_RESULT],
  });

  await QuickSuggest.blockedSuggestions.clear();
  MerinoTestUtils.server.reset();
  gClient.resetSession();
});

// Tests a Merino suggestion that is a best match.
add_task(async function bestMatch() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, false);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);

  // Simply enabling the best match feature should make the mock suggestion a
  // best match because the search string length is greater than the required
  // best match length.
  UrlbarPrefs.set("bestMatch.enabled", true);
  UrlbarPrefs.set("suggest.bestmatch", true);

  let expectedResult = { ...EXPECTED_MERINO_URLBAR_RESULT };
  expectedResult.payload = { ...EXPECTED_MERINO_URLBAR_RESULT.payload };
  expectedResult.isBestMatch = true;
  delete expectedResult.payload.qsSuggestion;

  let context = createContext(SEARCH_STRING, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [expectedResult],
  });

  // This isn't necessary since `check_results()` checks `isBestMatch`, but
  // check it here explicitly for good measure.
  Assert.ok(context.results[0].isBestMatch, "Result is a best match");

  UrlbarPrefs.clear("bestMatch.enabled");
  UrlbarPrefs.clear("suggest.bestmatch");

  MerinoTestUtils.server.reset();
  gClient.resetSession();
});

add_task(async function topPick() {
  UrlbarPrefs.set(PREF_MERINO_ENABLED, true);
  UrlbarPrefs.set(PREF_REMOTE_SETTINGS_ENABLED, false);
  UrlbarPrefs.set(PREF_DATA_COLLECTION_ENABLED, true);
  UrlbarPrefs.set("bestMatch.enabled", true);
  UrlbarPrefs.set("suggest.bestmatch", true);

  let topPickSuggestion = createSuggestion(2, 2);
  topPickSuggestion.is_top_pick = true;

  MerinoTestUtils.server.response.body = {
    request_id: "request_id",
    suggestions: [
      createSuggestion(0, 0.1),
      createSuggestion(1, 1),
      topPickSuggestion,
    ],
  };

  let context = createContext(SEARCH_STRING, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await check_results({
    context,
    matches: [
      {
        type: UrlbarUtils.RESULT_TYPE.URL,
        source: UrlbarUtils.RESULT_SOURCE.SEARCH,
        heuristic: false,
        isBestMatch: true,
        payload: {
          title: "multipleMerinoSuggestions 2 title",
          url: "multipleMerinoSuggestions 2 url",
          originalUrl: "multipleMerinoSuggestions 2 url",
          icon: "multipleMerinoSuggestions 2 icon",
          sponsoredImpressionUrl: "multipleMerinoSuggestions 2 impression_url",
          sponsoredClickUrl: "multipleMerinoSuggestions 2 click_url",
          sponsoredBlockId: 2,
          sponsoredAdvertiser: "multipleMerinoSuggestions 2 advertiser",
          isSponsored: true,
          helpUrl: QuickSuggest.HELP_URL,
          helpL10n: {
            id: UrlbarPrefs.get("resultMenu")
              ? "urlbar-result-menu-learn-more-about-firefox-suggest"
              : "firefox-suggest-urlbar-learn-more",
          },
          isBlockable: false,
          blockL10n: {
            id: UrlbarPrefs.get("resultMenu")
              ? "urlbar-result-menu-dismiss-firefox-suggest"
              : "firefox-suggest-urlbar-block",
          },
          displayUrl: "multipleMerinoSuggestions 2 url",
          requestId: "request_id",
          source: "merino",
        },
      },
    ],
  });

  UrlbarPrefs.clear("bestMatch.enabled");
  UrlbarPrefs.clear("suggest.bestmatch");
});

let createSuggestion = (n, score) => ({
  full_keyword: `multipleMerinoSuggestions ${n} full_keyword`,
  title: `multipleMerinoSuggestions ${n} title`,
  url: `multipleMerinoSuggestions ${n} url`,
  icon: `multipleMerinoSuggestions ${n} icon`,
  impression_url: `multipleMerinoSuggestions ${n} impression_url`,
  click_url: `multipleMerinoSuggestions ${n} click_url`,
  block_id: n,
  advertiser: `multipleMerinoSuggestions ${n} advertiser`,
  is_sponsored: true,
  score,
});
