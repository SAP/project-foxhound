/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Tests that TrackingDBService's read paths force-flush live
// ContentBlockingLogs before querying, so the Protection Dashboard sees events
// from long-lived tabs that have not yet closed. Also verifies that repeat
// flushes (query-time + teardown) don't double-count via the per-origin
// Stringify cursor.

const TrackingDBService = Cc["@mozilla.org/tracking-db-service;1"].getService(
  Ci.nsITrackingDBService
);

const DATE_FROM = Date.now() - 24 * 60 * 60 * 1000;
const DATE_TO = Date.now() + 24 * 60 * 60 * 1000;

async function queryAllTypes() {
  const rows = await TrackingDBService.getEventsByDateRange(DATE_FROM, DATE_TO);
  let total = 0;
  for (const row of rows) {
    total += row.getResultByName("count");
  }
  return total;
}

async function loadTrackerImage(browser, url) {
  await SpecialPowers.spawn(browser, [url], async u => {
    const img = content.document.createElement("img");
    await new content.Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
      img.src = u;
      content.document.body.appendChild(img);
    });
  });
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.contentblocking.database.enabled", true],
      ["browser.contentblocking.database.flushOnQuery.enabled", true],
      ["privacy.trackingprotection.enabled", true],
      ["privacy.trackingprotection.annotate_channels", true],
    ],
  });

  await UrlClassifierTestUtils.addTestTrackers();
  await TrackingDBService.clearAll();

  registerCleanupFunction(async () => {
    await TrackingDBService.clearAll();
    UrlClassifierTestUtils.cleanupTestTrackers();
  });
});

add_task(async function flush_on_query_reflects_live_tab() {
  const countBefore = await queryAllTypes();
  is(countBefore, 0, "DB is empty at test start");

  const tab = BrowserTestUtils.addTab(gBrowser, TEST_TOP_PAGE);
  const browser = gBrowser.getBrowserForTab(tab);
  await BrowserTestUtils.browserLoaded(browser);

  // Embed a third-party tracker. ETP should block it.
  await loadTrackerImage(
    browser,
    TEST_3RD_PARTY_DOMAIN_TP + TEST_PATH + "raptor.jpg?" + Math.random()
  );

  // Confirm the in-memory log picked up a blocking event.
  const log = JSON.parse(await browser.getContentBlockingLog());
  is(Object.keys(log).length, 1, "ContentBlockingLog recorded one origin");

  // Query the DB — this must flush the live log before reading.
  const countLive = await queryAllTypes();
  is(countLive, 1, "Open-tab events appear in DB via flush-on-query");

  // Query again: same data should not double-count.
  const countLive2 = await queryAllTypes();
  is(
    countLive2,
    countLive,
    "Repeat query does not double-count the same events (cursor works)"
  );

  // Close the tab: the teardown flush must also not double-count.
  BrowserTestUtils.removeTab(tab);

  // Give the teardown DeferredTask a chance to run; query again will await
  // any pending writes via the flush barrier.
  const countAfterClose = await queryAllTypes();
  is(
    countAfterClose,
    countLive,
    "Teardown flush is idempotent with a prior query-time flush"
  );

  await TrackingDBService.clearAll();
});

// Regression test for an early version of the delta-flush logic that tracked
// "already reported" at the LogEntry granularity (a per-origin cursor into
// mLogs). RecordLogInternal aggregates same-(type, blocked) events onto the
// last LogEntry by incrementing mRepeatCount in place rather than appending,
// so the cursor model silently dropped any post-flush increments. This test
// loads two same-origin tracker resources of the same type, querying the DB
// between them, and verifies the second flush picks up exactly one new event.
add_task(async function flush_on_query_handles_aggregated_repeat_count() {
  const trackerImgPath = TEST_3RD_PARTY_DOMAIN_TP + TEST_PATH + "raptor.jpg";

  const tab = BrowserTestUtils.addTab(gBrowser, TEST_TOP_PAGE);
  const browser = gBrowser.getBrowserForTab(tab);
  await BrowserTestUtils.browserLoaded(browser);

  // First blocked load. Creates a fresh LogEntry with mRepeatCount=1.
  // Cache-bust per load so the URL classifier sees a fresh request.
  await loadTrackerImage(browser, trackerImgPath + "?first=" + Math.random());

  let log = JSON.parse(await browser.getContentBlockingLog());
  const trackerOrigin = TEST_3RD_PARTY_DOMAIN_TP.replace(/\/$/, "");
  ok(log[trackerOrigin], "Tracker origin recorded after first load");

  // Flush the live log into the DB and capture the baseline count.
  const countAfterFirst = await queryAllTypes();
  Assert.greater(countAfterFirst, 0, "First load reaches the DB via flush");

  // Second blocked load of the same type from the same origin. This is the
  // path RecordLogInternal aggregates into ++last.mRepeatCount instead of
  // appending a new entry, exactly the case the cursor model missed.
  await loadTrackerImage(browser, trackerImgPath + "?second=" + Math.random());

  // Confirm aggregation actually happened (mRepeatCount went up rather than a
  // second LogEntry being appended). Without this, a passing count assertion
  // below could just mean the implementation silently appended.
  log = JSON.parse(await browser.getContentBlockingLog());
  const entries = log[trackerOrigin];
  let aggregatedRepeat = 0;
  for (const item of entries) {
    if (
      item[0] === Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT &&
      item[1] === true
    ) {
      aggregatedRepeat = Math.max(aggregatedRepeat, item[2]);
    }
  }
  Assert.greaterOrEqual(
    aggregatedRepeat,
    2,
    "Second load aggregated onto an existing LogEntry (mRepeatCount >= 2)"
  );

  // The delta flush must report exactly the new repeat, not zero and not the
  // entire mRepeatCount again.
  const countAfterSecond = await queryAllTypes();
  is(
    countAfterSecond,
    countAfterFirst + 1,
    "Second flush reports exactly one additional aggregated event"
  );

  BrowserTestUtils.removeTab(tab);

  await TrackingDBService.clearAll();
});

// Verify that two callers that race into _flushLiveLogs via the public read API
// must both observe the freshly flushed event.
add_task(async function concurrent_reads_see_flushed_event() {
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );
  const browser = tab.linkedBrowser;
  await loadTrackerImage(
    browser,
    TEST_3RD_PARTY_DOMAIN_TP + TEST_PATH + "raptor.jpg?" + Math.random()
  );

  // Confirm the live log actually has something to flush — otherwise the test
  // would pass trivially even if the shared-promise plumbing were broken.
  const log = JSON.parse(await browser.getContentBlockingLog());
  is(Object.keys(log).length, 1, "ContentBlockingLog recorded one origin");

  const [c1, c2] = await Promise.all([queryAllTypes(), queryAllTypes()]);
  is(c1, 1, "First concurrent read sees the live-log event");
  is(c2, c1, "Second concurrent read sees the same data (no stale read)");

  BrowserTestUtils.removeTab(tab);
  await TrackingDBService.clearAll();
});

add_task(async function flush_disabled_pref_is_respected() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.contentblocking.database.flushOnQuery.enabled", false]],
  });

  const tab = BrowserTestUtils.addTab(gBrowser, TEST_TOP_PAGE);
  const browser = gBrowser.getBrowserForTab(tab);
  await BrowserTestUtils.browserLoaded(browser);

  await loadTrackerImage(
    browser,
    TEST_3RD_PARTY_DOMAIN_TP + TEST_PATH + "raptor.jpg?" + Math.random()
  );

  // With flushOnQuery disabled, the live log's events should NOT yet appear.
  const countLive = await queryAllTypes();
  is(countLive, 0, "Flush-on-query is gated by the pref");

  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.popPrefEnv();

  await TrackingDBService.clearAll();
});
