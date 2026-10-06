/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests UrlbarUtils.blockAutofill, blockOriginAutofill,
// blockOriginPageAutofill, and clearAutofillBlock by calling them and verifying
// moz_origins column state.

"use strict";

const BLOCK_UNTIL_MS = Date.now();

add_task(async function blockOriginAutofill_sets_block_until_ms() {
  let url = "https://example.com/";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.blockOriginAutofill(url, BLOCK_UNTIL_MS);

  let stored = await getOriginColumn(url, "block_until_ms");
  Assert.equal(
    stored,
    BLOCK_UNTIL_MS,
    "block_until_ms should match the value we set"
  );

  await PlacesUtils.history.clear();
});

add_task(async function blockOriginAutofill_updates_existing_value() {
  let url = "https://example.com/";
  await PlacesTestUtils.addVisits(url);

  let first = Date.now() + 1000;
  await UrlbarUtils.blockOriginAutofill(url, first);
  Assert.equal(
    await getOriginColumn(url, "block_until_ms"),
    first,
    "First value should be stored"
  );

  let second = Date.now() + 99000;
  await UrlbarUtils.blockOriginAutofill(url, second);
  Assert.equal(
    await getOriginColumn(url, "block_until_ms"),
    second,
    "Value should be overwritten on second call"
  );

  await PlacesUtils.history.clear();
});

add_task(async function blockOriginAutofill_updates_when_visit_differs() {
  let url = "https://example.com/deep/link";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.blockOriginAutofill("https://example.com/", BLOCK_UNTIL_MS);
  Assert.equal(
    await getOriginColumn(url, "block_until_ms"),
    BLOCK_UNTIL_MS,
    "block_until_ms should be stored"
  );

  await PlacesUtils.history.clear();
});

add_task(async function blockOriginAutofill_noop_for_unknown_url() {
  // Should not throw when the URL is not in moz_places.
  await UrlbarUtils.blockOriginAutofill(
    "https://nonexistent.test/",
    Date.now() + 1000
  );
  Assert.ok(true, "No exception for a URL that does not exist in Places");
});

add_task(async function blockOriginAutofill_affects_correct_origin() {
  let urlA = "https://alpha.example.com/";
  let urlB = "https://beta.example.com/";
  await PlacesTestUtils.addVisits([urlA, urlB]);

  await UrlbarUtils.blockOriginAutofill(urlA, BLOCK_UNTIL_MS);

  Assert.equal(
    await getOriginColumn(urlA, "block_until_ms"),
    BLOCK_UNTIL_MS,
    "alpha origin should be blocked"
  );
  Assert.equal(
    await getOriginColumn(urlB, "block_until_ms"),
    null,
    "beta origin should remain NULL (unblocked)"
  );

  await PlacesUtils.history.clear();
});

add_task(async function blockOriginAutofill_blocks_all_scheme_www_variants() {
  // Add all four variations of example.com.
  let urls = [
    "https://example.com/",
    "http://example.com/",
    "https://www.example.com/",
    "http://www.example.com/",
  ];
  await PlacesTestUtils.addVisits(urls);

  // Block via just one variation.
  await UrlbarUtils.blockOriginAutofill("https://example.com/", BLOCK_UNTIL_MS);

  for (let url of urls) {
    Assert.equal(
      await getOriginColumn(url, "block_until_ms"),
      BLOCK_UNTIL_MS,
      `${url} should be blocked after blocking https://example.com/`
    );
  }

  await PlacesUtils.history.clear();
});

add_task(async function blockOriginAutofill_from_www_blocks_all_variants() {
  let urls = [
    "https://example.com/",
    "http://example.com/",
    "https://www.example.com/",
    "http://www.example.com/",
  ];
  await PlacesTestUtils.addVisits(urls);

  // Block via the www + http variation.
  await UrlbarUtils.blockOriginAutofill(
    "http://www.example.com/",
    BLOCK_UNTIL_MS
  );

  for (let url of urls) {
    Assert.equal(
      await getOriginColumn(url, "block_until_ms"),
      BLOCK_UNTIL_MS,
      `${url} should be blocked after blocking http://www.example.com/`
    );
  }

  await PlacesUtils.history.clear();
});

add_task(
  async function blockOriginAutofill_works_when_only_some_variants_exist() {
    // Only two of the four variations have visits.
    let present = "https://example.com/";
    let alsoPresent = "http://www.example.com/";
    let absent = "http://example.com/";
    await PlacesTestUtils.addVisits([present, alsoPresent]);

    await UrlbarUtils.blockOriginAutofill(absent, BLOCK_UNTIL_MS);

    // The two that exist should be blocked; the absent one is a no-op
    // (no moz_origins row to update).
    Assert.equal(
      await getOriginColumn(present, "block_until_ms"),
      BLOCK_UNTIL_MS,
      "https://example.com/ should be blocked"
    );
    Assert.equal(
      await getOriginColumn(alsoPresent, "block_until_ms"),
      BLOCK_UNTIL_MS,
      "http://www.example.com/ should be blocked"
    );
    Assert.equal(
      await getOriginColumn(absent, "block_until_ms"),
      null,
      "http://example.com/ doesn't exist"
    );

    await PlacesUtils.history.clear();
  }
);

add_task(async function blockOriginPageAutofill_sets_block_pages_until_ms() {
  let url = "https://example.com/some/page";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.blockOriginPageAutofill(url, BLOCK_UNTIL_MS);

  let stored = await getOriginColumn(url, "block_pages_until_ms");
  Assert.equal(
    stored,
    BLOCK_UNTIL_MS,
    "block_pages_until_ms should match the value we set"
  );

  await PlacesUtils.history.clear();
});

add_task(
  async function blockOriginPageAutofill_does_not_touch_block_until_ms() {
    let url = "https://example.com/page";
    await PlacesTestUtils.addVisits(url);

    await UrlbarUtils.blockOriginPageAutofill(url, BLOCK_UNTIL_MS);

    Assert.equal(
      await getOriginColumn(url, "block_until_ms"),
      null,
      "block_until_ms should remain NULL when only page autofill is blocked"
    );

    await PlacesUtils.history.clear();
  }
);

add_task(async function blockOriginPageAutofill_noop_for_unknown_url() {
  await UrlbarUtils.blockOriginPageAutofill(
    "https://nonexistent.test/path",
    BLOCK_UNTIL_MS
  );
  Assert.ok(true, "No exception for a URL that does not exist in Places");
});

add_task(async function blockOriginPageAutofill_shared_across_paths() {
  // Two URLs under the same origin share a single moz_origins row.
  let urlA = "https://example.com/page-a";
  let urlB = "https://example.com/page-b";
  await PlacesTestUtils.addVisits([urlA, urlB]);

  await UrlbarUtils.blockOriginPageAutofill(urlA, BLOCK_UNTIL_MS);

  // Both URLs resolve to the same origin row, so querying via urlB should
  // show the same block.
  Assert.equal(
    await getOriginColumn(urlB, "block_pages_until_ms"),
    BLOCK_UNTIL_MS,
    "Block set via urlA should be visible when queried via urlB (same origin)"
  );

  await PlacesUtils.history.clear();
});

add_task(
  async function blockOriginPageAutofill_blocks_all_scheme_www_variants() {
    let urls = [
      "https://example.com/page",
      "http://example.com/page",
      "https://www.example.com/page",
      "http://www.example.com/page",
    ];
    await PlacesTestUtils.addVisits(urls);

    await UrlbarUtils.blockOriginPageAutofill(
      "https://example.com/page",
      BLOCK_UNTIL_MS
    );

    for (let url of urls) {
      Assert.equal(
        await getOriginColumn(url, "block_pages_until_ms"),
        BLOCK_UNTIL_MS,
        `${url} should be blocked after blocking https://example.com/page`
      );
    }

    await PlacesUtils.history.clear();
  }
);

add_task(async function blockOriginPageAutofill_from_www_blocks_all_variants() {
  let urls = [
    "https://example.com/page",
    "http://example.com/page",
    "https://www.example.com/page",
    "http://www.example.com/page",
  ];
  await PlacesTestUtils.addVisits(urls);

  await UrlbarUtils.blockOriginPageAutofill(
    "http://www.example.com/page",
    BLOCK_UNTIL_MS
  );

  for (let url of urls) {
    Assert.equal(
      await getOriginColumn(url, "block_pages_until_ms"),
      BLOCK_UNTIL_MS,
      `${url} should be blocked after blocking http://www.example.com/page`
    );
  }

  await PlacesUtils.history.clear();
});

add_task(
  async function blockOriginPageAutofill_works_when_only_some_variants_exist() {
    let present = "https://example.com/page";
    let alsoPresent = "http://www.example.com/page";
    let absent = "http://example.com/page";
    await PlacesTestUtils.addVisits([present, alsoPresent]);

    await UrlbarUtils.blockOriginPageAutofill(absent, BLOCK_UNTIL_MS);

    Assert.equal(
      await getOriginColumn(present, "block_pages_until_ms"),
      BLOCK_UNTIL_MS,
      "https://example.com/page should be blocked"
    );
    Assert.equal(
      await getOriginColumn(alsoPresent, "block_pages_until_ms"),
      BLOCK_UNTIL_MS,
      "http://www.example.com/page should be blocked"
    );
    Assert.equal(
      await getOriginColumn(absent, "block_pages_until_ms"),
      null,
      "http://example.com/page doesn't exist"
    );

    await PlacesUtils.history.clear();
  }
);

add_task(async function clearOriginPageAutofillBlock_clears_origin_column() {
  let url = "https://example.com/";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.blockOriginAutofill(url, BLOCK_UNTIL_MS);
  await UrlbarUtils.blockOriginPageAutofill(url, BLOCK_UNTIL_MS);

  // Check that both columns are populated.
  Assert.equal(await getOriginColumn(url, "block_until_ms"), BLOCK_UNTIL_MS);
  Assert.equal(
    await getOriginColumn(url, "block_pages_until_ms"),
    BLOCK_UNTIL_MS
  );

  let didUnblock = await UrlbarUtils.clearOriginAutofillBlock(url);
  Assert.ok(didUnblock, "Did unblock");

  Assert.equal(
    await getOriginColumn(url, "block_until_ms"),
    null,
    "block_until_ms should be NULL after clearing"
  );
  Assert.equal(
    await getOriginColumn(url, "block_pages_until_ms"),
    BLOCK_UNTIL_MS,
    "block_pages_until_ms should still have stored value"
  );

  await PlacesUtils.history.clear();
});

add_task(async function clearOriginPageAutofillBlock_clears_page_column() {
  let url = "https://example.com/path";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.blockOriginAutofill(url, BLOCK_UNTIL_MS);
  await UrlbarUtils.blockOriginPageAutofill(url, BLOCK_UNTIL_MS);

  // Check that both columns are populated.
  Assert.equal(await getOriginColumn(url, "block_until_ms"), BLOCK_UNTIL_MS);
  Assert.equal(
    await getOriginColumn(url, "block_pages_until_ms"),
    BLOCK_UNTIL_MS
  );

  let didUnblock = await UrlbarUtils.clearOriginPageAutofillBlock(url);
  Assert.ok(didUnblock, "Did unblock");

  Assert.equal(
    await getOriginColumn(url, "block_until_ms"),
    BLOCK_UNTIL_MS,
    "block_until_ms should still have stored value"
  );
  Assert.equal(
    await getOriginColumn(url, "block_pages_until_ms"),
    null,
    "block_pages_until_ms should be NULL after clearing"
  );

  await PlacesUtils.history.clear();
});

add_task(async function clearOriginPageAutofillBlock_clears_all_variants() {
  let urls = [
    "https://example.com/page",
    "http://example.com/page",
    "https://www.example.com/page",
    "http://www.example.com/page",
  ];
  await PlacesTestUtils.addVisits(urls);

  await UrlbarUtils.blockOriginPageAutofill(
    "https://example.com/page",
    BLOCK_UNTIL_MS
  );

  let didUnblock = await UrlbarUtils.clearOriginPageAutofillBlock(
    "http://www.example.com/page"
  );
  Assert.ok(didUnblock, "Should report that blocks were cleared");

  for (let url of urls) {
    Assert.equal(
      await getOriginColumn(url, "block_pages_until_ms"),
      null,
      `${url} should be unblocked after clearing via http://www.example.com/page`
    );
  }

  await PlacesUtils.history.clear();
});

add_task(async function clearOriginPageAutofillBlock_noop_for_unknown_url() {
  let didUnblock = await UrlbarUtils.clearOriginAutofillBlock(
    "https://nonexistent.test/"
  );
  Assert.ok(
    !didUnblock,
    "Did not clear an origin that did not exist in Places"
  );
  didUnblock = await UrlbarUtils.clearOriginPageAutofillBlock(
    "https://nonexistent.test/"
  );
  Assert.ok(!didUnblock, "Did not clear a URL that did not exist in Places");
});

add_task(async function clearOriginAutofillBlock_only_affects_target_origin() {
  let urlA = "https://alpha.example.com/";
  let urlB = "https://beta.example.com/";
  await PlacesTestUtils.addVisits([urlA, urlB]);

  await UrlbarUtils.blockOriginAutofill(urlA, BLOCK_UNTIL_MS);
  await UrlbarUtils.blockOriginAutofill(urlB, BLOCK_UNTIL_MS);

  // Clear only alpha.
  await UrlbarUtils.clearOriginAutofillBlock(urlA);

  Assert.equal(
    await getOriginColumn(urlA, "block_until_ms"),
    null,
    "alpha should be cleared"
  );
  Assert.equal(
    await getOriginColumn(urlB, "block_until_ms"),
    BLOCK_UNTIL_MS,
    "beta should remain blocked"
  );

  await PlacesUtils.history.clear();
});

add_task(async function clearOriginAutofillBlock_clears_all_variants() {
  let urls = [
    "https://example.com/",
    "http://example.com/",
    "https://www.example.com/",
    "http://www.example.com/",
  ];
  await PlacesTestUtils.addVisits(urls);

  // Block all variants.
  await UrlbarUtils.blockOriginAutofill("https://example.com/", BLOCK_UNTIL_MS);

  // Clear via a different variation than the one used to block.
  let didUnblock = await UrlbarUtils.clearOriginAutofillBlock(
    "http://www.example.com/"
  );
  Assert.ok(didUnblock, "Should report that blocks were cleared");

  for (let url of urls) {
    Assert.equal(
      await getOriginColumn(url, "block_until_ms"),
      null,
      `${url} should be unblocked after clearing via http://www.example.com/`
    );
  }

  await PlacesUtils.history.clear();
});

add_task(async function clearOriginAutofillBlock_roundtrip() {
  let url = "https://example.com/";
  await PlacesTestUtils.addVisits(url);

  // Start clean.
  Assert.equal(await getOriginColumn(url, "block_until_ms"), null);

  // Block.
  let t1 = Date.now() + 10000;
  await UrlbarUtils.blockOriginAutofill(url, t1);
  Assert.equal(await getOriginColumn(url, "block_until_ms"), t1);

  // Clear.
  await UrlbarUtils.clearOriginAutofillBlock(url);
  Assert.equal(await getOriginColumn(url, "block_until_ms"), null);

  // Block again with a different timestamp.
  let t2 = Date.now() + 99000;
  await UrlbarUtils.blockOriginAutofill(url, t2);
  Assert.equal(
    await getOriginColumn(url, "block_until_ms"),
    t2,
    "Should accept a new block after clearing"
  );

  await PlacesUtils.history.clear();
});

add_task(async function clearOriginPageAutofillBlock_roundtrip() {
  let url = "https://example.com/path";
  await PlacesTestUtils.addVisits(url);

  // Start clean.
  Assert.equal(await getOriginColumn(url, "block_pages_until_ms"), null);

  // Block.
  let t1 = Date.now() + 10000;
  await UrlbarUtils.blockOriginPageAutofill(url, t1);
  Assert.equal(await getOriginColumn(url, "block_pages_until_ms"), t1);

  // Clear.
  await UrlbarUtils.clearOriginPageAutofillBlock(url);
  Assert.equal(await getOriginColumn(url, "block_pages_until_ms"), null);

  // Block again with a different timestamp.
  let t2 = Date.now() + 99000;
  await UrlbarUtils.blockOriginPageAutofill(url, t2);
  Assert.equal(
    await getOriginColumn(url, "block_pages_until_ms"),
    t2,
    "Should accept a new block after clearing"
  );

  await PlacesUtils.history.clear();
});

// blockAutofill triggers blockOriginAutofill for origin URLs and
// blockOriginPageAutofill for non-origin URLs.

add_task(async function blockAutofill_origin_sets_block_until_ms() {
  let url = "https://example.com/";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.blockAutofill(url, BLOCK_UNTIL_MS);

  Assert.equal(
    await getOriginColumn(url, "block_until_ms"),
    BLOCK_UNTIL_MS,
    "blockAutofill with an origin URL should set block_until_ms"
  );
  Assert.equal(
    await getOriginColumn(url, "block_pages_until_ms"),
    null,
    "block_pages_until_ms should remain NULL for an origin URL"
  );

  await PlacesUtils.history.clear();
});

add_task(async function blockAutofill_page_sets_block_pages_until_ms() {
  let url = "https://example.com/some/page";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.blockAutofill(url, BLOCK_UNTIL_MS);

  Assert.equal(
    await getOriginColumn(url, "block_pages_until_ms"),
    BLOCK_UNTIL_MS,
    "blockAutofill with a non-origin URL should set block_pages_until_ms"
  );
  Assert.equal(
    await getOriginColumn(url, "block_until_ms"),
    null,
    "block_until_ms should remain NULL for a non-origin URL"
  );

  await PlacesUtils.history.clear();
});

add_task(async function blockAutofill_origin_with_trailing_slash() {
  let url = "https://example.com/";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.blockAutofill(url, BLOCK_UNTIL_MS);

  Assert.equal(
    await getOriginColumn(url, "block_until_ms"),
    BLOCK_UNTIL_MS,
    "Origin URL with trailing slash should be treated as origin"
  );

  await PlacesUtils.history.clear();
});

add_task(async function blockAutofill_url_with_query_is_page() {
  let url = "https://example.com/?q=test";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.blockAutofill(url, BLOCK_UNTIL_MS);

  Assert.equal(
    await getOriginColumn(url, "block_pages_until_ms"),
    BLOCK_UNTIL_MS,
    "URL with query string should be treated as a page URL"
  );
  Assert.equal(
    await getOriginColumn(url, "block_until_ms"),
    null,
    "block_until_ms should remain NULL for a URL with query string"
  );

  await PlacesUtils.history.clear();
});

add_task(async function blockAutofill_url_with_hash_is_page() {
  let url = "https://example.com/#section";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.blockAutofill(url, BLOCK_UNTIL_MS);

  Assert.equal(
    await getOriginColumn(url, "block_pages_until_ms"),
    BLOCK_UNTIL_MS,
    "URL with hash should be treated as a page URL"
  );

  await PlacesUtils.history.clear();
});

add_task(async function blockAutofill_origin_blocks_all_scheme_www_variants() {
  let urls = [
    "https://example.com/",
    "http://example.com/",
    "https://www.example.com/",
    "http://www.example.com/",
  ];
  await PlacesTestUtils.addVisits(urls);

  await UrlbarUtils.blockAutofill("https://example.com/", BLOCK_UNTIL_MS);

  for (let url of urls) {
    Assert.equal(
      await getOriginColumn(url, "block_until_ms"),
      BLOCK_UNTIL_MS,
      `${url} should be blocked via blockAutofill origin`
    );
  }

  await PlacesUtils.history.clear();
});

add_task(async function blockAutofill_noop_for_unknown_origin() {
  await UrlbarUtils.blockAutofill("https://nonexistent.test/", BLOCK_UNTIL_MS);
  Assert.ok(true, "No exception for an unknown origin URL");
});

add_task(async function blockAutofill_noop_for_unknown_page() {
  await UrlbarUtils.blockAutofill(
    "https://nonexistent.test/path",
    BLOCK_UNTIL_MS
  );
  Assert.ok(true, "No exception for an unknown page URL");
});

add_task(async function blockOriginAutofill_origin_with_port() {
  let url = "https://example.com:8080/";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.blockOriginAutofill(url, BLOCK_UNTIL_MS);

  Assert.equal(
    await getOriginColumn(url, "block_until_ms"),
    BLOCK_UNTIL_MS,
    "block_until_ms should be set for an origin with a non-standard port"
  );

  await PlacesUtils.history.clear();
});

add_task(async function blockOriginAutofill_port_does_not_affect_other_ports() {
  let url8080 = "https://example.com:8080/";
  let url9090 = "https://example.com:9090/";
  await PlacesTestUtils.addVisits([url8080, url9090]);

  await UrlbarUtils.blockOriginAutofill(url8080, BLOCK_UNTIL_MS);

  Assert.equal(
    await getOriginColumn(url8080, "block_until_ms"),
    BLOCK_UNTIL_MS,
    "port 8080 origin should be blocked"
  );
  Assert.equal(
    await getOriginColumn(url9090, "block_until_ms"),
    null,
    "port 9090 origin should remain unblocked"
  );

  await PlacesUtils.history.clear();
});
