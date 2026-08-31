/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests the in-memory adaptive-autofill backspace counter

"use strict";

const BACKSPACE_THRESHOLD = UrlbarPrefs.get("autoFill.backspaceThreshold");

function resetCounts() {
  UrlbarUtils._backspaceBlocks.clear();
}

registerCleanupFunction(async () => {
  resetCounts();
  await PlacesUtils.history.clear();
});

add_task(async function backspaceBlockKey_return_values() {
  Assert.equal(
    UrlbarUtils._backspaceBlockKey("https://example.com/"),
    "origin:example.com",
    "Origin URL maps to origin: scope"
  );
  Assert.equal(
    UrlbarUtils._backspaceBlockKey("https://example.com/some/path"),
    "page:example.com",
    "Page URL maps to page: scope"
  );
  Assert.equal(
    UrlbarUtils._backspaceBlockKey("https://www.example.com/some/path"),
    "page:example.com",
    "www. prefix is stripped from the basehost"
  );
  Assert.equal(
    UrlbarUtils._backspaceBlockKey("https://example.com/?q=1"),
    "page:example.com",
    "URL with query string is a page URL"
  );
  Assert.equal(
    UrlbarUtils._backspaceBlockKey("not a url"),
    null,
    "Unparseable URL returns null"
  );
});

add_task(async function recordAutofillBackspace_first_call_inserts_one() {
  resetCounts();
  await UrlbarUtils.recordAutofillBackspace("https://example.com/path");
  Assert.equal(
    UrlbarUtils._backspaceBlocks.size,
    1,
    "Map has one entry after the first call"
  );
  Assert.equal(
    UrlbarUtils._backspaceBlocks.get("page:example.com").count,
    1,
    "Count is 1 after the first call"
  );
});

add_task(async function recordAutofillBackspace_below_threshold_no_block() {
  resetCounts();
  let url = "https://example.com/path";
  await PlacesTestUtils.addVisits(url);

  for (let i = 0; i < BACKSPACE_THRESHOLD - 1; i++) {
    await UrlbarUtils.recordAutofillBackspace(url);
  }

  Assert.equal(
    UrlbarUtils._backspaceBlocks.get("page:example.com").count,
    BACKSPACE_THRESHOLD - 1,
    "Count is at threshold - 1"
  );
  Assert.equal(
    await getOriginColumn(url, "block_pages_until_ms"),
    null,
    "block_pages_until_ms is not set below threshold"
  );

  await PlacesUtils.history.clear();
});

add_task(async function recordAutofillBackspace_threshold_blocks_page() {
  resetCounts();
  let url = "https://example.com/path";
  await PlacesTestUtils.addVisits(url);

  for (let i = 0; i < BACKSPACE_THRESHOLD; i++) {
    await UrlbarUtils.recordAutofillBackspace(url);
  }

  Assert.equal(
    UrlbarUtils._backspaceBlocks.get("page:example.com")?.count,
    undefined,
    "Count is cleared once the threshold fires"
  );
  Assert.greater(
    UrlbarUtils._backspaceBlocks.get("page:example.com")?.blockedAt,
    0,
    "blockedAt is set once the threshold fires"
  );
  Assert.greater(
    await getOriginColumn(url, "block_pages_until_ms"),
    Date.now() - 1000,
    "block_pages_until_ms is set for a page URL when the threshold fires"
  );
  Assert.equal(
    await getOriginColumn(url, "block_until_ms"),
    null,
    "block_until_ms is not set for a page URL"
  );

  await PlacesUtils.history.clear();
});

add_task(async function recordAutofillBackspace_threshold_blocks_origin() {
  resetCounts();
  let url = "https://example.com/";
  await PlacesTestUtils.addVisits(url);

  for (let i = 0; i < BACKSPACE_THRESHOLD; i++) {
    await UrlbarUtils.recordAutofillBackspace(url);
  }

  Assert.equal(
    UrlbarUtils._backspaceBlocks.get("origin:example.com")?.count,
    undefined,
    "Count is cleared once the threshold fires"
  );
  Assert.greater(
    UrlbarUtils._backspaceBlocks.get("origin:example.com")?.blockedAt,
    0,
    "blockedAt is set once the threshold fires"
  );
  Assert.greater(
    await getOriginColumn(url, "block_until_ms"),
    Date.now() - 1000,
    "block_until_ms is set for an origin URL when the threshold fires"
  );
  Assert.equal(
    await getOriginColumn(url, "block_pages_until_ms"),
    null,
    "block_pages_until_ms is not set for an origin URL"
  );

  await PlacesUtils.history.clear();
});

add_task(async function recordAutofillBackspace_origin_and_page_independent() {
  resetCounts();
  let originUrl = "https://example.com/";
  let pageUrl = "https://example.com/some/path";
  await PlacesTestUtils.addVisits([originUrl, pageUrl]);

  // Drive the origin scope to threshold; the page scope must stay clean.
  for (let i = 0; i < BACKSPACE_THRESHOLD; i++) {
    await UrlbarUtils.recordAutofillBackspace(originUrl);
  }

  Assert.greater(
    await getOriginColumn(originUrl, "block_until_ms"),
    Date.now() - 1000,
    "Origin scope blocked"
  );
  Assert.equal(
    await getOriginColumn(pageUrl, "block_pages_until_ms"),
    null,
    "Page scope is unaffected by origin-scope backspaces"
  );
  Assert.ok(
    !UrlbarUtils._backspaceBlocks.has("page:example.com"),
    "No page-scope entry was created"
  );

  await PlacesUtils.history.clear();
});

add_task(async function recordAutofillBackspace_www_collapses_to_same_key() {
  resetCounts();
  // Alternate calls between the www and non-www variants of the same URL.
  // They must accumulate in a single map entry keyed by basehost.
  await UrlbarUtils.recordAutofillBackspace("https://www.example.com/path");
  await UrlbarUtils.recordAutofillBackspace("https://example.com/path");

  Assert.equal(UrlbarUtils._backspaceBlocks.size, 1, "Map has only one entry");
  Assert.equal(
    UrlbarUtils._backspaceBlocks.get("page:example.com").count,
    2,
    "Both www. and non-www. backspaces accumulate in the same key"
  );
});

add_task(async function clearAutofillBackspaceEntryForUrl_clears_one_scope() {
  resetCounts();
  let originUrl = "https://example.com/";
  let pageUrl = "https://example.com/some/path";

  await UrlbarUtils.recordAutofillBackspace(originUrl);
  await UrlbarUtils.recordAutofillBackspace(pageUrl);
  Assert.equal(
    UrlbarUtils._backspaceBlocks.size,
    2,
    "Both scopes are populated"
  );

  UrlbarUtils.clearAutofillBackspaceEntryForUrl(pageUrl);

  Assert.ok(
    !UrlbarUtils._backspaceBlocks.has("page:example.com"),
    "Page-scope entry is cleared"
  );
  Assert.ok(
    UrlbarUtils._backspaceBlocks.has("origin:example.com"),
    "Origin-scope entry is preserved"
  );
});

add_task(async function clearAutofillBackspaceEntryForUrl_noop_for_missing() {
  resetCounts();
  await UrlbarUtils.recordAutofillBackspace("https://example.com/path");

  // Clearing a URL that has no corresponding map entry is a no-op.
  UrlbarUtils.clearAutofillBackspaceEntryForUrl("https://other.test/");
  Assert.equal(
    UrlbarUtils._backspaceBlocks.size,
    1,
    "Unrelated entry is untouched"
  );

  // Clearing with an unparseable URL is a no-op.
  UrlbarUtils.clearAutofillBackspaceEntryForUrl("not a url");
  Assert.equal(
    UrlbarUtils._backspaceBlocks.size,
    1,
    "Unparseable URL is a no-op"
  );
});

add_task(async function recordAutofillBackspace_lru_eviction() {
  resetCounts();
  let cap = UrlbarUtils._BACKSPACE_BLOCKS_MAX;

  for (let i = 0; i < cap; i++) {
    await UrlbarUtils.recordAutofillBackspace(`https://host-${i}.example/path`);
  }

  Assert.equal(UrlbarUtils._backspaceBlocks.size, cap, "Map is at capacity");
  Assert.ok(
    UrlbarUtils._backspaceBlocks.has("page:host-0.example"),
    "Oldest key is present before the cap-exceeding insert"
  );

  await UrlbarUtils.recordAutofillBackspace("https://overflow.example/path");

  Assert.equal(
    UrlbarUtils._backspaceBlocks.size,
    cap,
    "Size stays at capacity after overflow"
  );
  Assert.ok(
    !UrlbarUtils._backspaceBlocks.has("page:host-0.example"),
    "Oldest entry was evicted"
  );
  Assert.ok(
    UrlbarUtils._backspaceBlocks.has("page:overflow.example"),
    "New entry is present"
  );

  resetCounts();
});

add_task(async function recordAutofillBackspace_lru_touch_on_increment() {
  resetCounts();
  // Insert max unique entries; entry 0 is the oldest.
  for (let i = 0; i < UrlbarUtils._BACKSPACE_BLOCKS_MAX; i++) {
    await UrlbarUtils.recordAutofillBackspace(`https://host-${i}.example/path`);
  }

  // Backspace 0 so it becomes most-recent.
  await UrlbarUtils.recordAutofillBackspace("https://host-0.example/path");

  // Force an eviction.
  await UrlbarUtils.recordAutofillBackspace("https://overflow.example/path");

  Assert.ok(
    UrlbarUtils._backspaceBlocks.has("page:host-0.example"),
    "Entry was not evicted"
  );
  Assert.ok(
    !UrlbarUtils._backspaceBlocks.has("page:host-1.example"),
    "The new oldest entry (host-1) was evicted instead"
  );

  resetCounts();
});

add_task(async function recordAutofillBackspace_respects_threshold_pref() {
  resetCounts();
  let url = "https://example.com/path";
  await PlacesTestUtils.addVisits(url);

  UrlbarPrefs.set("autoFill.backspaceThreshold", 5);
  try {
    for (let i = 0; i < 4; i++) {
      await UrlbarUtils.recordAutofillBackspace(url);
    }
    Assert.equal(
      await getOriginColumn(url, "block_pages_until_ms"),
      null,
      "No block at 4 with threshold = 5"
    );

    await UrlbarUtils.recordAutofillBackspace(url);
    Assert.greater(
      await getOriginColumn(url, "block_pages_until_ms"),
      Date.now() - 1000,
      "Block fires on the 5th call when threshold = 5"
    );
  } finally {
    UrlbarPrefs.clear("autoFill.backspaceThreshold");
  }

  await PlacesUtils.history.clear();
});

add_task(async function recordAutofillBackspace_uses_block_duration_pref() {
  resetCounts();
  let url = "https://example.com/path";
  await PlacesTestUtils.addVisits(url);

  const durationMs = 60 * 60 * 1000;
  UrlbarPrefs.set("autoFill.backspaceBlockDurationMs", durationMs);

  try {
    let before = Date.now();
    for (let i = 0; i < BACKSPACE_THRESHOLD; i++) {
      await UrlbarUtils.recordAutofillBackspace(url);
    }
    let after = Date.now();

    let stored = await getOriginColumn(url, "block_pages_until_ms");
    Assert.greaterOrEqual(
      stored,
      before + durationMs,
      "block_pages_until_ms is at least before + duration"
    );
    Assert.lessOrEqual(
      stored,
      after + durationMs,
      "block_pages_until_ms is at most after + duration"
    );
  } finally {
    UrlbarPrefs.clear("autoFill.backspaceBlockDurationMs");
  }

  await PlacesUtils.history.clear();
});

add_task(async function recordAutofillBackspace_ignores_unparseable_url() {
  resetCounts();
  await UrlbarUtils.recordAutofillBackspace("not a url");
  Assert.equal(UrlbarUtils._backspaceBlocks.size, 0, "Map is unchanged");
});
