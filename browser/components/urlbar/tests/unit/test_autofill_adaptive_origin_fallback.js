/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests the fallback origin result that appears when an adaptive autofill
// result is a deep URL.  When the autofilled URL has a path (e.g.
// http://example.com/path), the root origin (http://example.com/) should also
// appear in the results if it exists in history with positive frecency.

"use strict";

testEngine_setup();

async function addVisitAndRecalculate(
  uri,
  transition = PlacesUtils.history.TRANSITION_TYPED
) {
  await PlacesTestUtils.addVisits({ uri, transition });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();
}

async function addInputHistory(url, input, useCount = 4) {
  await PlacesUtils.withConnectionWrapper("addInputHistory", async db => {
    await db.execute(
      `INSERT OR REPLACE INTO moz_inputhistory (place_id, input, use_count)
       VALUES (
         (SELECT id FROM moz_places WHERE url_hash = hash(:url) AND url = :url),
         :input,
         :useCount
       )`,
      { url, input: input.toLowerCase(), useCount }
    );
  });
}

add_setup(async function () {
  UrlbarPrefs.set("autoFill.adaptiveHistory.enabled", true);

  registerCleanupFunction(() => {
    UrlbarPrefs.set("autoFill.adaptiveHistory.enabled", false);
  });
});

// When adaptive autofill suggests a deep URL and the root origin exists in
// history, the origin should appear as a second result.
add_task(async function deep_url_shows_origin_fallback() {
  let deepUrl = "http://example.com/path";
  let originUrl = "http://example.com/";

  await addVisitAndRecalculate(deepUrl);
  await addVisitAndRecalculate(originUrl);
  await addInputHistory(deepUrl, "exa");

  let context = createContext("exa", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/path",
    completed: "http://example.com/path",
    matches: [
      makeVisitResult(context, {
        uri: deepUrl,
        title: "test visit for http://example.com/path",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: originUrl,
        title: "test visit for http://example.com/",
        tags: null,
        isAutofillFallback: true,
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

// When the autofilled URL is already an origin, no fallback should appear.
add_task(async function origin_autofill_no_fallback() {
  let originUrl = "http://example.com/";

  await addVisitAndRecalculate(originUrl);
  await addInputHistory(originUrl, "exa");

  let context = createContext("exa", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "http://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: originUrl,
        title: "test visit for http://example.com/",
        heuristic: true,
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

// When the origin has not been visited (does not exist in moz_places), no
// fallback should appear.
add_task(async function deep_url_no_fallback_without_origin_visit() {
  let deepUrl = "http://example.com/path";

  await addVisitAndRecalculate(deepUrl);
  await addInputHistory(deepUrl, "exa");

  let context = createContext("exa", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/path",
    completed: "http://example.com/path",
    matches: [
      makeVisitResult(context, {
        uri: deepUrl,
        title: "test visit for http://example.com/path",
        heuristic: true,
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

// When the origin exists but has frecency <= 0, no fallback should appear.
add_task(async function deep_url_no_fallback_when_origin_frecency_zero() {
  let deepUrl = "http://example.com/path";
  let originUrl = "http://example.com/";

  await addVisitAndRecalculate(deepUrl);
  await addVisitAndRecalculate(originUrl);
  await addInputHistory(deepUrl, "exa");

  await PlacesUtils.withConnectionWrapper("setFrecency", db =>
    db.execute(
      `UPDATE moz_places SET frecency = 0 WHERE url_hash = hash(:url) AND url = :url`,
      { url: originUrl }
    )
  );

  let context = createContext("exa", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/path",
    completed: "http://example.com/path",
    matches: [
      makeVisitResult(context, {
        uri: deepUrl,
        title: "test visit for http://example.com/path",
        heuristic: true,
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

// When the origin is blocked via block_until_ms (future timestamp), no fallback
// should appear.
add_task(async function deep_url_no_fallback_when_origin_blocked() {
  let deepUrl = "http://example.com/path";
  let originUrl = "http://example.com/";

  await addVisitAndRecalculate(deepUrl);
  await addVisitAndRecalculate(originUrl);
  await addInputHistory(deepUrl, "exa");

  let futureMs = Date.now() + 365 * 24 * 60 * 60 * 1000;
  await UrlbarUtils.blockOriginAutofill(originUrl, futureMs);

  let context = createContext("exa", { isPrivate: false });
  // The fallback origin should NOT appear from the autofill provider, but the
  // origin may still appear as a regular history result from UrlbarProviderPlaces.
  await check_results({
    context,
    autofilled: "example.com/path",
    completed: "http://example.com/path",
    matches: [
      makeVisitResult(context, {
        uri: deepUrl,
        title: "test visit for http://example.com/path",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: originUrl,
        title: "test visit for http://example.com/",
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

// When the origin's block_until_ms is in the past (expired), the fallback
// should appear.
add_task(async function deep_url_fallback_when_block_expired() {
  let deepUrl = "http://example.com/path";
  let originUrl = "http://example.com/";

  await addVisitAndRecalculate(deepUrl);
  await addVisitAndRecalculate(originUrl);
  await addInputHistory(deepUrl, "exa");

  let pastMs = Date.now() - 1000;
  await UrlbarUtils.blockOriginAutofill(originUrl, pastMs);

  let context = createContext("exa", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/path",
    completed: "http://example.com/path",
    matches: [
      makeVisitResult(context, {
        uri: deepUrl,
        title: "test visit for http://example.com/path",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: originUrl,
        title: "test visit for http://example.com/",
        tags: null,
        isAutofillFallback: true,
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

// Fallback should work with https URLs.
add_task(async function deep_url_https_fallback() {
  let deepUrl = "https://example.com/app/dashboard";
  let originUrl = "https://example.com/";

  await addVisitAndRecalculate(deepUrl);
  await addVisitAndRecalculate(originUrl);
  await addInputHistory(deepUrl, "exa");

  let context = createContext("exa", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/app/dashboard",
    completed: "https://example.com/app/dashboard",
    matches: [
      makeVisitResult(context, {
        uri: deepUrl,
        title: "test visit for https://example.com/app/dashboard",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: originUrl,
        title: "test visit for https://example.com/",
        tags: null,
        isAutofillFallback: true,
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

// When adaptive autofill is disabled, no fallback should appear even with a
// deep URL (since adaptive autofill itself won't fire).
add_task(async function no_fallback_when_adaptive_disabled() {
  UrlbarPrefs.set("autoFill.adaptiveHistory.enabled", false);

  let deepUrl = "http://example.com/path";
  let originUrl = "http://example.com/";

  await addVisitAndRecalculate(deepUrl);
  await addVisitAndRecalculate(originUrl);
  await addInputHistory(deepUrl, "exa");

  let context = createContext("exa", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "http://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: originUrl,
        title: "test visit for http://example.com/",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: deepUrl,
        title: "test visit for http://example.com/path",
      }),
    ],
  });

  await PlacesUtils.history.clear();
  UrlbarPrefs.set("autoFill.adaptiveHistory.enabled", true);
});

// Fallback should work with www URLs where the user omits www.
add_task(async function deep_url_www_fallback() {
  let deepUrl = "http://www.example.com/path";
  let originUrl = "http://www.example.com/";

  await addVisitAndRecalculate(deepUrl);
  await addVisitAndRecalculate(originUrl);
  await addInputHistory(deepUrl, "exa");

  let context = createContext("exa", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/path",
    completed: "http://www.example.com/path",
    matches: [
      makeVisitResult(context, {
        uri: deepUrl,
        title: "test visit for http://www.example.com/path",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: originUrl,
        title: "test visit for http://www.example.com/",
        tags: null,
        isAutofillFallback: true,
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

// When the results panel is full of history results, the fallback origin should
// still appear even if its frecency is very low (just above 0).
add_task(async function fallback_with_full_panel_low_frecency() {
  let deepUrl = "http://example.com/path";
  let originUrl = "http://example.com/";
  let maxResults = UrlbarPrefs.get("maxRichResults");

  await addVisitAndRecalculate(deepUrl);
  await addVisitAndRecalculate(originUrl);
  await addInputHistory(deepUrl, "e");

  // Set the origin's frecency to 1 (just above the > 0 threshold).
  await PlacesUtils.withConnectionWrapper("setFrecency", db =>
    db.execute(
      `UPDATE moz_places SET frecency = 1
       WHERE url_hash = hash(:url) AND url = :url`,
      { url: originUrl }
    )
  );

  // Add enough other history entries to fill the panel beyond maxResults.
  let otherUrls = [];
  for (let i = 0; i < maxResults; i++) {
    let url = `http://e${i}.example.org/`;
    otherUrls.push(url);
    await addVisitAndRecalculate(url);
  }

  let context = createContext("e", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/path",
    completed: "http://example.com/path",
    matches: [
      makeVisitResult(context, {
        uri: deepUrl,
        title: "test visit for http://example.com/path",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: originUrl,
        title: "test visit for http://example.com/",
        tags: null,
        isAutofillFallback: true,
      }),
      ...otherUrls
        .reverse()
        .slice(0, maxResults - 2)
        .map(url =>
          makeVisitResult(context, {
            uri: url,
            title: `test visit for ${url}`,
          })
        ),
    ],
  });

  await PlacesUtils.history.clear();
});

// When search suggestions are shown first and adaptive autofill suggests a deep
// URL, the fallback origin should appear in the history group after suggestions.
add_task(async function fallback_with_search_suggestions_first() {
  let deepUrl = "http://example.com/path";
  let originUrl = "http://example.com/";

  await addVisitAndRecalculate(deepUrl);
  await addVisitAndRecalculate(originUrl);
  await addInputHistory(deepUrl, "exa");

  Services.prefs.setBoolPref("browser.urlbar.suggest.searches", true);
  Services.prefs.setBoolPref("browser.search.suggest.enabled", true);
  Services.prefs.setBoolPref("browser.urlbar.showSearchSuggestionsFirst", true);

  let context = createContext("exa", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/path",
    completed: "http://example.com/path",
    matches: [
      makeVisitResult(context, {
        uri: deepUrl,
        title: "test visit for http://example.com/path",
        heuristic: true,
      }),
      makeSearchResult(context, {
        engineName: "Suggestions",
        suggestion: "exa",
      }),
      makeSearchResult(context, {
        engineName: "Suggestions",
        suggestion: "exa foo",
      }),
      makeSearchResult(context, {
        engineName: "Suggestions",
        suggestion: "exa bar",
      }),
      makeVisitResult(context, {
        uri: originUrl,
        title: "test visit for http://example.com/",
        tags: null,
        isAutofillFallback: true,
      }),
    ],
  });

  Services.prefs.clearUserPref("browser.urlbar.suggest.searches");
  Services.prefs.clearUserPref("browser.search.suggest.enabled");
  Services.prefs.clearUserPref("browser.urlbar.showSearchSuggestionsFirst");
  await PlacesUtils.history.clear();
});

// When search suggestions are shown last (history first), the fallback origin
// should appear in the history group before search suggestions.
add_task(async function fallback_with_search_suggestions_last() {
  let deepUrl = "http://example.com/path";
  let originUrl = "http://example.com/";

  await addVisitAndRecalculate(deepUrl);
  await addVisitAndRecalculate(originUrl);
  await addInputHistory(deepUrl, "exa");

  Services.prefs.setBoolPref("browser.urlbar.suggest.searches", true);
  Services.prefs.setBoolPref("browser.search.suggest.enabled", true);
  Services.prefs.setBoolPref(
    "browser.urlbar.showSearchSuggestionsFirst",
    false
  );

  let context = createContext("exa", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/path",
    completed: "http://example.com/path",
    matches: [
      makeVisitResult(context, {
        uri: deepUrl,
        title: "test visit for http://example.com/path",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: originUrl,
        title: "test visit for http://example.com/",
        tags: null,
        isAutofillFallback: true,
      }),
      makeSearchResult(context, {
        engineName: "Suggestions",
        suggestion: "exa",
      }),
      makeSearchResult(context, {
        engineName: "Suggestions",
        suggestion: "exa foo",
      }),
      makeSearchResult(context, {
        engineName: "Suggestions",
        suggestion: "exa bar",
      }),
    ],
  });

  Services.prefs.clearUserPref("browser.urlbar.suggest.searches");
  Services.prefs.clearUserPref("browser.search.suggest.enabled");
  Services.prefs.clearUserPref("browser.urlbar.showSearchSuggestionsFirst");
  await PlacesUtils.history.clear();
});
