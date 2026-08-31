/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests that the blocking columns on moz_origins (block_until_ms and
// block_pages_until_ms) correctly gate origin autofill and adaptive autofill
// queries.

"use strict";

testEngine_setup();

ChromeUtils.defineESModuleGetters(this, {
  UrlbarProviderAutofill:
    "moz-src:///browser/components/urlbar/UrlbarProviderAutofill.sys.mjs",
});

// Helper: add a page visit and ensure frecency is recalculated so that origin
// autofill can pick it up.
async function addVisitAndRecalculate(
  uri,
  transition = PlacesUtils.history.TRANSITION_TYPED
) {
  await PlacesTestUtils.addVisits({ uri, transition });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();
}

// Helper: add an input history entry for adaptive autofill.
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

// Choose a time far into the future for blocking and another time that has
// already expired, to test both cases.
const FUTURE_MS = Date.now() + 365 * 24 * 60 * 60 * 1000;
const PAST_MS = Date.now() - 1000;

add_setup(async function () {
  // Blocking is only currently enabled when adaptive history autofill is
  // enabled due to visible user controls only being available with the feature.
  UrlbarPrefs.set("autoFill.adaptiveHistory.enabled", true);

  registerCleanupFunction(() => {
    UrlbarPrefs.set("autoFill.adaptiveHistory.enabled", false);
  });
});

add_task(async function origin_autofill_not_blocked_when_null() {
  let url = "https://example.com/";
  await addVisitAndRecalculate(url);

  // block_until_ms should be NULL by default.
  let blockValue = await getOriginColumn(url, "block_until_ms");
  Assert.equal(blockValue, null, "block_until_ms should be NULL by default");

  let context = createContext("exam", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "https://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
        heuristic: true,
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

add_task(async function origin_autofill_blocked_when_future_timestamp() {
  let url = "https://example.com/";
  await addVisitAndRecalculate(url);

  await UrlbarUtils.blockOriginAutofill(url, FUTURE_MS);

  let context = createContext("exam", { isPrivate: false });
  // Origin autofill should NOT happen; we should fall through to a non-autofill
  // result (e.g. heuristic fallback / search).
  await check_results({
    context,
    matches: [
      makeSearchResult(context, {
        engineName: SearchService.defaultEngine.name,
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

add_task(async function origin_autofill_unblocked_when_expired() {
  let url = "https://example.com/";
  await addVisitAndRecalculate(url);

  // Set block_until_ms to the past (already expired).
  await UrlbarUtils.blockOriginAutofill(url, PAST_MS);

  let context = createContext("exam", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "https://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
        heuristic: true,
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

add_task(async function origin_autofill_blocked_across_variants() {
  // Add two different scheme/www variants.
  let httpsUrl = "https://example.com/";
  let httpWwwUrl = "http://www.example.com/";
  await addVisitAndRecalculate(httpsUrl);
  await addVisitAndRecalculate(httpWwwUrl);

  // Block via the http://www variant only.
  await UrlbarUtils.blockOriginAutofill(httpWwwUrl, FUTURE_MS);

  // Verify the block propagated to the https://example.com origin row too.
  Assert.equal(
    await getOriginColumn(httpsUrl, "block_until_ms"),
    FUTURE_MS,
    "https://example.com/ should also be blocked"
  );
  Assert.equal(
    await getOriginColumn(httpWwwUrl, "block_until_ms"),
    FUTURE_MS,
    "http://www.example.com/ should be blocked"
  );

  // Searching "exam" would match example.com — should NOT autofill.
  let context = createContext("exam", { isPrivate: false });
  await check_results({
    context,
    matches: [
      makeSearchResult(context, {
        engineName: SearchService.defaultEngine.name,
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "http://www.example.com/",
        title: "test visit for http://www.example.com/",
      }),
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
      }),
    ],
  });

  // Searching "www.exam" would match www.example.com — should also NOT
  // autofill. Since the input starts with "www.", the heuristic fallback
  // generates a visit result (http://www.exam/) rather than a search result.
  context = createContext("www.exam", { isPrivate: false });
  await check_results({
    context,
    matches: [
      makeVisitResult(context, {
        source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
        uri: "http://www.exam/",
        title: "www.exam/",
        iconUri: "",
        heuristic: true,
        providerName: "UrlbarProviderHeuristicFallback",
      }),
      makeSearchResult(context, {
        engineName: SearchService.defaultEngine.name,
      }),
      makeVisitResult(context, {
        uri: "http://www.example.com/",
        title: "test visit for http://www.example.com/",
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

add_task(async function origin_autofill_clearing_restores_variants() {
  let httpsUrl = "https://example.com/";
  let httpWwwUrl = "http://www.example.com/";
  await addVisitAndRecalculate(httpsUrl);
  await addVisitAndRecalculate(httpWwwUrl);

  // Block via https://example.com.
  await UrlbarUtils.blockOriginAutofill(httpsUrl, FUTURE_MS);

  // Verify both are blocked.
  Assert.equal(
    await getOriginColumn(httpsUrl, "block_until_ms"),
    FUTURE_MS,
    "https://example.com/ should be blocked"
  );
  Assert.equal(
    await getOriginColumn(httpWwwUrl, "block_until_ms"),
    FUTURE_MS,
    "http://www.example.com/ should be blocked"
  );

  // Clear via the OTHER variant: http://www.example.com.
  let didUnblock = await UrlbarUtils.clearOriginAutofillBlock(httpWwwUrl);
  Assert.ok(didUnblock, "Should report blocks were cleared");

  // Both should now be unblocked.
  Assert.equal(
    await getOriginColumn(httpsUrl, "block_until_ms"),
    null,
    "https://example.com/ should be unblocked"
  );
  Assert.equal(
    await getOriginColumn(httpWwwUrl, "block_until_ms"),
    null,
    "http://www.example.com/ should be unblocked"
  );

  // Origin autofill should work again for "exam".
  let context = createContext("exam", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "https://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "http://www.example.com/",
        title: "test visit for http://www.example.com/",
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

add_task(async function adaptive_autofill_not_blocked_by_origin_block() {
  let url = "https://example.com/some/page";
  let origin = "https://example.com/";
  await addVisitAndRecalculate(url);
  await addInputHistory(url, "exam");

  // Block the origin only.
  await UrlbarUtils.blockOriginAutofill(origin, FUTURE_MS);

  let context = createContext("exam", {
    isPrivate: false,
    sources: [UrlbarUtils.RESULT_SOURCE.HISTORY],
  });

  await check_results({
    context,
    autofilled: "example.com/some/page",
    completed: "https://example.com/some/page",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/some/page",
        title: "test visit for https://example.com/some/page",
        heuristic: true,
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

add_task(async function adaptive_urls_blocked_by_pages_block() {
  let pageUrl = "https://example.com/some/page";
  await addVisitAndRecalculate(pageUrl);
  await addInputHistory(pageUrl, "exam", 8);

  let pageUrl2 = "https://example.com/some/page2";
  await addVisitAndRecalculate(pageUrl2);
  await addInputHistory(pageUrl2, "exam", 8);

  // Block URL-level autofill. Since there's no root URL with input history,
  // there should be no adaptive autofill at all.
  await UrlbarUtils.blockOriginPageAutofill(pageUrl, FUTURE_MS);

  let context = createContext("exam", {
    isPrivate: false,
    sources: [UrlbarUtils.RESULT_SOURCE.HISTORY],
  });

  // Should fall back to origin autofill since adaptive URL is blocked.
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "https://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "https://example.com",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://example.com/some/page",
        title: "test visit for https://example.com/some/page",
      }),
      makeVisitResult(context, {
        uri: "https://example.com/some/page2",
        title: "test visit for https://example.com/some/page2",
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

add_task(async function adaptive_url_blocked_but_root_still_allowed() {
  await PlacesUtils.history.clear();

  // Set up two URLs under the same origin: the root and a subpage.
  let rootUrl = "https://example.com/";
  let pageUrl = "https://example.com/some/page";

  await addVisitAndRecalculate(rootUrl);
  await addVisitAndRecalculate(pageUrl);

  // Add input history for both, with the page having a higher use_count so it
  // would normally be preferred.
  await addInputHistory(pageUrl, "exam", 8);
  await addInputHistory(rootUrl, "exam", 4);

  // Block URL-level autofill only (not the origin itself).
  await UrlbarUtils.blockOriginPageAutofill(pageUrl, FUTURE_MS);

  // The page URL should be filtered out, but the root URL should still be
  // allowed.
  let context = createContext("exam", {
    isPrivate: false,
    sources: [UrlbarUtils.RESULT_SOURCE.HISTORY],
  });

  // We expect the root URL to be adaptively autofilled instead of the page.
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "https://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://example.com/some/page",
        title: "test visit for https://example.com/some/page",
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

add_task(async function adaptive_url_not_blocked_when_expired() {
  let url = "https://example.com/some/page";
  await addVisitAndRecalculate(url);
  await addInputHistory(url, "exam");

  // Set block_pages_until_ms to the past (already expired).
  await UrlbarUtils.blockOriginPageAutofill(url, PAST_MS);

  let context = createContext("exam", {
    isPrivate: false,
    sources: [UrlbarUtils.RESULT_SOURCE.HISTORY],
  });

  // Expired block should have no effect; adaptive autofill should succeed.
  await check_results({
    context,
    autofilled: "example.com/some/page",
    completed: "https://example.com/some/page",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/some/page",
        title: "test visit for https://example.com/some/page",
        heuristic: true,
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

add_task(async function both_blocks_active() {
  let url = "https://example.com/some/page";
  await addVisitAndRecalculate(url);
  await addInputHistory(url, "exam");

  // Block both origin and URL-level autofill.
  await UrlbarUtils.blockOriginAutofill(url, FUTURE_MS);
  await UrlbarUtils.blockOriginPageAutofill(url, FUTURE_MS);

  let context = createContext("exam", { isPrivate: false });
  // Neither origin nor adaptive autofill should fire.
  await check_results({
    context,
    matches: [
      makeSearchResult(context, {
        engineName: SearchService.defaultEngine.name,
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://example.com/some/page",
        title: "test visit for https://example.com/some/page",
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

add_task(async function clearing_block_restores_origin_autofill() {
  let url = "https://example.com/";
  await addVisitAndRecalculate(url);

  // Block, then clear.
  await UrlbarUtils.blockOriginAutofill(url, FUTURE_MS);

  // Verify blocked.
  let context = createContext("exam", { isPrivate: false });
  await check_results({
    context,
    matches: [
      makeSearchResult(context, {
        engineName: SearchService.defaultEngine.name,
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
      }),
    ],
  });

  // Clear the block.
  await UrlbarUtils.clearOriginAutofillBlock(url);

  // Verify restored.
  context = createContext("exam", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "https://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
        heuristic: true,
      }),
    ],
  });

  await PlacesUtils.history.clear();
});

add_task(async function cross_origin_isolation() {
  let blockedUrl = "https://example.com/";
  let unblockedUrl = "https://example.org/";

  await addVisitAndRecalculate(unblockedUrl);
  await addVisitAndRecalculate(blockedUrl);

  // Searching "exam" should autofill example.com since it was added to
  // history after.
  let context = createContext("exam", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "https://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://example.org/",
        title: "test visit for https://example.org/",
      }),
    ],
  });

  // Block only example.com.
  await UrlbarUtils.blockOriginAutofill(blockedUrl, FUTURE_MS);

  // Searching "exam" should now autofill example.org since it is not blocked.
  context = createContext("exam", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.org/",
    completed: "https://example.org/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.org/",
        title: "test visit for https://example.org/",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
      }),
    ],
  });

  // And searching "example.c" should NOT autofill because example.com is
  // blocked.
  context = createContext("example.c", { isPrivate: false });
  await check_results({
    context,
    matches: [
      makeSearchResult(context, {
        engineName: SearchService.defaultEngine.name,
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
      }),
    ],
  });

  await PlacesUtils.history.clear();
});
