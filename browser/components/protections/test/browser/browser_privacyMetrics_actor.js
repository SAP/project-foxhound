/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

XPCOMUtils.defineLazyServiceGetter(
  this,
  "TrackingDBService",
  "@mozilla.org/tracking-db-service;1",
  Ci.nsITrackingDBService
);

const { Sqlite } = ChromeUtils.importESModule(
  "resource://gre/modules/Sqlite.sys.mjs"
);

ChromeUtils.defineLazyGetter(this, "DB_PATH", function () {
  return PathUtils.join(PathUtils.profileDir, "protections.sqlite");
});

const SQL = {
  insertCustomTimeEvent:
    "INSERT INTO events (type, count, timestamp) " +
    "VALUES (:type, :count, date(:timestamp));",
};

function sendFetchPrivacyMetrics(browser) {
  let actor =
    browser.browsingContext.currentWindowGlobal.getActor("AboutProtections");
  return actor.receiveMessage({ name: "FetchPrivacyMetrics" });
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.contentblocking.database.enabled", true]],
  });

  await TrackingDBService.saveEvents(JSON.stringify({}));
  await TrackingDBService.clearAll();
});

registerCleanupFunction(async () => {
  await TrackingDBService.clearAll();
});

add_task(async function test_fetchPrivacyMetrics_returns_stats() {
  info("Test that FetchPrivacyMetrics returns stats in normal tab");

  const db = await Sqlite.openConnection({ path: DB_PATH });
  const now = new Date().toISOString();

  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 10,
    timestamp: now,
  });
  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKING_COOKIES_ID,
    count: 5,
    timestamp: now,
  });
  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.FINGERPRINTERS_ID,
    count: 3,
    timestamp: now,
  });

  await db.close();

  let tab = await BrowserTestUtils.openNewForegroundTab({
    url: "about:protections",
    gBrowser,
  });

  const stats = await sendFetchPrivacyMetrics(tab.linkedBrowser);

  Assert.equal(stats.trackers, 10, "Trackers count should be 10");
  Assert.equal(stats.cookies, 5, "Cookies count should be 5");
  Assert.equal(stats.fingerprinters, 3, "Fingerprinters count should be 3");
  Assert.equal(stats.total, 18, "Total should be sum of all categories");
  Assert.greater(stats.lastUpdated, 0, "Should have a timestamp");

  await BrowserTestUtils.removeTab(tab);
  await TrackingDBService.clearAll();
});

add_task(async function test_fetchPrivacyMetrics_returns_isPrivate_in_pbm() {
  info("Test that FetchPrivacyMetrics returns isPrivate in private browsing");

  const db = await Sqlite.openConnection({ path: DB_PATH });
  const now = new Date().toISOString();

  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 100,
    timestamp: now,
  });

  await db.close();

  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });
  let tab = await BrowserTestUtils.openNewForegroundTab({
    url: "about:protections",
    gBrowser: privateWin.gBrowser,
  });

  const result = await sendFetchPrivacyMetrics(tab.linkedBrowser);

  Assert.ok(
    result?.isPrivate,
    "Should return isPrivate flag in private browsing"
  );

  await BrowserTestUtils.closeWindow(privateWin);
  await TrackingDBService.clearAll();
});

add_task(async function test_fetchPrivacyMetrics_empty_database() {
  info("Test that FetchPrivacyMetrics returns empty stats for new users");

  await TrackingDBService.clearAll();

  let tab = await BrowserTestUtils.openNewForegroundTab({
    url: "about:protections",
    gBrowser,
  });

  const stats = await sendFetchPrivacyMetrics(tab.linkedBrowser);

  Assert.equal(stats.total, 0, "Total should be 0 for new users");
  Assert.equal(stats.trackers, 0, "Trackers should be 0");
  Assert.equal(stats.cookies, 0, "Cookies should be 0");
  Assert.equal(stats.fingerprinters, 0, "Fingerprinters should be 0");
  Assert.equal(stats.cryptominers, 0, "Cryptominers should be 0");
  Assert.equal(stats.socialTrackers, 0, "Social trackers should be 0");
  Assert.greater(stats.lastUpdated, 0, "Should have a timestamp");

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_fetchPrivacyMetrics_returns_fresh_data() {
  info("Test that multiple calls to FetchPrivacyMetrics return fresh data");

  const db = await Sqlite.openConnection({ path: DB_PATH });
  const now = new Date().toISOString();

  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 10,
    timestamp: now,
  });

  await db.close();

  let tab = await BrowserTestUtils.openNewForegroundTab({
    url: "about:protections",
    gBrowser,
  });

  const stats1 = await sendFetchPrivacyMetrics(tab.linkedBrowser);

  Assert.equal(stats1.trackers, 10, "Initial trackers count should be 10");
  Assert.equal(stats1.total, 10, "Initial total should be 10");

  const db2 = await Sqlite.openConnection({ path: DB_PATH });
  await db2.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 15,
    timestamp: now,
  });
  await db2.close();

  const stats2 = await sendFetchPrivacyMetrics(tab.linkedBrowser);

  Assert.equal(
    stats2.trackers,
    25,
    "Fresh data should reflect database changes (10 + 15 = 25)"
  );
  Assert.equal(stats2.total, 25, "Fresh total should reflect database changes");

  await BrowserTestUtils.removeTab(tab);
  await TrackingDBService.clearAll();
});
