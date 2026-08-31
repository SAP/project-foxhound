/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests UrlbarUtils.addToInputHistoryWhenReady.

"use strict";

async function getInputHistoryFor(url, input) {
  let db = await PlacesUtils.promiseDBConnection();
  let rows = await db.executeCached(
    `SELECT i.use_count
     FROM moz_inputhistory i
     JOIN moz_places h ON h.id = i.place_id
     WHERE h.url_hash = hash(:url) AND h.url = :url AND i.input = :input`,
    { url, input }
  );
  return rows.length ? rows[0].getResultByIndex(0) : null;
}

// When the URL is already in moz_places, input history should be written
// immediately without waiting for a page-visited event.
add_task(async function url_already_in_places() {
  let url = "https://example.com/already";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.addToInputHistoryWhenReady(url, "already");

  let useCount = await getInputHistoryFor(url, "already");
  Assert.greater(
    useCount,
    0,
    "Input history should be written when URL exists"
  );

  await PlacesUtils.history.clear();
});

// When the URL is not yet in moz_places but a visit lands shortly after,
// the function should wait for the page-visited event and then write.
add_task(async function url_arrives_after_call() {
  let url = "https://example.com/arriving";

  let promise = UrlbarUtils.addToInputHistoryWhenReady(url, "arriving");

  // Add the visit after the call has started waiting.
  await PlacesTestUtils.addVisits(url);

  await promise;

  let useCount = await getInputHistoryFor(url, "arriving");
  Assert.greater(
    useCount,
    0,
    "Input history should be written after the visit lands"
  );

  await PlacesUtils.history.clear();
});

// When the URL never appears in moz_places (timeout), no input history
// should be written.
add_task(async function url_never_arrives_timeout() {
  let url = "https://never-visited.test/page";

  await UrlbarUtils.addToInputHistoryWhenReady(url, "never");

  let useCount = await getInputHistoryFor(url, "never");
  Assert.strictEqual(
    useCount,
    null,
    "No input history should be written when the URL never appears"
  );
});

// Calling multiple times for the same URL accumulates use_count.
add_task(async function multiple_calls_accumulate() {
  let url = "https://example.com/multi";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.addToInputHistoryWhenReady(url, "multi");
  let first = await getInputHistoryFor(url, "multi");

  await UrlbarUtils.addToInputHistoryWhenReady(url, "multi");
  let second = await getInputHistoryFor(url, "multi");

  Assert.greater(second, first, "use_count should increase on repeated calls");

  await PlacesUtils.history.clear();
});

// The input string should be stored lowercase.
add_task(async function input_stored_lowercase() {
  let url = "https://example.com/case";
  await PlacesTestUtils.addVisits(url);

  await UrlbarUtils.addToInputHistoryWhenReady(url, "CaSe");

  let useCount = await getInputHistoryFor(url, "case");
  Assert.equal(useCount, 1, "Input history should be stored in lowercase");

  let upper = await getInputHistoryFor(url, "CaSe");
  Assert.equal(
    upper,
    null,
    "Querying with an upper case should not match (DB is stored in lower case)"
  );

  await PlacesUtils.history.clear();
});

// When history is disabled, no input history should be written even if the
// URL is already in moz_places.
add_task(async function history_disabled_noop() {
  let url = "https://example.com/history-disabled";
  await PlacesTestUtils.addVisits(url);

  Services.prefs.setBoolPref("places.history.enabled", false);
  await UrlbarUtils.addToInputHistoryWhenReady(url, "disabled");

  let useCount = await getInputHistoryFor(url, "disabled");
  Assert.strictEqual(
    useCount,
    null,
    "No input history should be written when history is disabled"
  );

  Services.prefs.clearUserPref("places.history.enabled");
  await PlacesUtils.history.clear();
});

// A page-visited event for a different URL should not resolve the wait.
add_task(async function unrelated_visit_does_not_resolve() {
  let targetUrl = "https://target.test/page";
  let otherUrl = "https://other.test/page";

  let promise = UrlbarUtils.addToInputHistoryWhenReady(targetUrl, "target");

  // Visit a different URL; this should not satisfy the listener.
  await PlacesTestUtils.addVisits(otherUrl);

  // Now visit the target URL to actually resolve.
  await PlacesTestUtils.addVisits(targetUrl);
  await promise;

  let useCount = await getInputHistoryFor(targetUrl, "target");
  Assert.equal(
    useCount,
    1,
    "Input history should only be written for the matching URL"
  );

  await PlacesUtils.history.clear();
});
