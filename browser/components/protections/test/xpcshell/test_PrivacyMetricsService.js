/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const { PrivacyMetricsService } = ChromeUtils.importESModule(
  "moz-src:///browser/components/protections/PrivacyMetricsService.sys.mjs"
);

const { Sqlite } = ChromeUtils.importESModule(
  "resource://gre/modules/Sqlite.sys.mjs"
);

XPCOMUtils.defineLazyServiceGetter(
  this,
  "TrackingDBService",
  "@mozilla.org/tracking-db-service;1",
  Ci.nsITrackingDBService
);

ChromeUtils.defineLazyGetter(this, "DB_PATH", function () {
  return PathUtils.join(PathUtils.profileDir, "protections.sqlite");
});

const SQL = {
  insertCustomTimeEvent:
    "INSERT INTO events (type, count, timestamp) " +
    "VALUES (:type, :count, date(:timestamp));",
};

// Setup profile and enable tracking database
do_get_profile();
Services.prefs.setBoolPref("browser.contentblocking.database.enabled", true);

add_setup(async function () {
  // Initialize the database schema
  await TrackingDBService.saveEvents(JSON.stringify({}));
  // Clear any existing data before tests
  await TrackingDBService.clearAll();
});

registerCleanupFunction(() => {
  Services.prefs.clearUserPref("browser.contentblocking.database.enabled");
});

add_task(async function test_getWeeklyStats_empty() {
  info("Test that getWeeklyStats returns empty stats for new users");

  const stats = await PrivacyMetricsService.getWeeklyStats();

  Assert.equal(stats.total, 0, "Total should be 0 for new users");
  Assert.equal(stats.trackers, 0, "Trackers should be 0");
  Assert.equal(stats.cookies, 0, "Cookies should be 0");
  Assert.equal(stats.fingerprinters, 0, "Fingerprinters should be 0");
  Assert.equal(stats.cryptominers, 0, "Cryptominers should be 0");
  Assert.equal(stats.socialTrackers, 0, "Social trackers should be 0");
  Assert.greater(stats.lastUpdated, 0, "Should have a timestamp");
});

add_task(async function test_getWeeklyStats_aggregation() {
  info("Test that getWeeklyStats correctly aggregates by category");

  const db = await Sqlite.openConnection({ path: DB_PATH });
  const now = new Date().toISOString();

  // Insert test data directly into database
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
  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.CRYPTOMINERS_ID,
    count: 2,
    timestamp: now,
  });
  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.SOCIAL_ID,
    count: 1,
    timestamp: now,
  });

  await db.close();

  const stats = await PrivacyMetricsService.getWeeklyStats();

  Assert.equal(stats.total, 21, "Total should be sum of all categories");
  Assert.equal(stats.trackers, 10, "Trackers counted correctly");
  Assert.equal(stats.cookies, 5, "Cookies counted correctly");
  Assert.equal(stats.fingerprinters, 3, "Fingerprinters counted correctly");
  Assert.equal(stats.cryptominers, 2, "Cryptominers counted correctly");
  Assert.equal(stats.socialTrackers, 1, "Social trackers counted correctly");

  // Cleanup
  await TrackingDBService.clearAll();
});

add_task(async function test_getWeeklyStats_multiple_days() {
  info("Test aggregation across multiple days");

  const db = await Sqlite.openConnection({ path: DB_PATH });
  const now = Date.now();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString();

  // Day 1 (two days ago)
  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 5,
    timestamp: twoDaysAgo,
  });

  // Day 2 (one day ago)
  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 7,
    timestamp: oneDayAgo,
  });

  // Day 3 (today)
  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 8,
    timestamp: today,
  });

  await db.close();

  const stats = await PrivacyMetricsService.getWeeklyStats();

  Assert.equal(
    stats.trackers,
    20,
    "Should sum trackers across all days in the week"
  );
  Assert.equal(stats.total, 20, "Total should equal sum of all categories");

  await TrackingDBService.clearAll();
});

add_task(async function test_old_data_ignored() {
  info("Test that data older than 7 days is not included");

  const db = await Sqlite.openConnection({ path: DB_PATH });
  const now = Date.now();
  const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();

  // Add old data (8 days ago)
  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 100,
    timestamp: eightDaysAgo,
  });

  // Add recent data (3 days ago)
  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 50,
    timestamp: threeDaysAgo,
  });

  await db.close();

  const stats = await PrivacyMetricsService.getWeeklyStats();

  Assert.equal(stats.trackers, 50, "Should only count data from last 7 days");

  await TrackingDBService.clearAll();
});

add_task(async function test_getTodayStats_empty() {
  info("Test that getTodayStats returns empty stats for new users");

  const stats = await PrivacyMetricsService.getTodayStats();

  Assert.equal(stats.total, 0, "Total should be 0 for new users");
  Assert.equal(stats.trackers, 0, "Trackers should be 0");
  Assert.greater(stats.lastUpdated, 0, "Should have a timestamp");
});

add_task(async function test_getTodayStats_excludes_other_days() {
  info("Test that getTodayStats only counts today's events");

  const db = await Sqlite.openConnection({ path: DB_PATH });
  const now = Date.now();
  const today = new Date().toISOString();
  const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 8,
    timestamp: today,
  });
  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 7,
    timestamp: yesterday,
  });

  await db.close();

  const stats = await PrivacyMetricsService.getTodayStats();

  Assert.equal(stats.trackers, 8, "Should only count today's trackers");
  Assert.equal(stats.total, 8, "Total should equal today's events only");

  await TrackingDBService.clearAll();
});

add_task(async function test_exactly_7_days_boundary() {
  info("Test 7-day boundary precisely - 6 days ago included, 8 days excluded");

  const db = await Sqlite.openConnection({ path: DB_PATH });
  const now = Date.now();
  // 6 days ago (should be included - within 7-day window)
  const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString();
  // 8 days ago (should be excluded - outside 7-day window)
  const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();

  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 25,
    timestamp: sixDaysAgo,
  });

  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 75,
    timestamp: eightDaysAgo,
  });

  await db.close();

  const stats = await PrivacyMetricsService.getWeeklyStats();

  Assert.equal(
    stats.trackers,
    25,
    "Should include 6-day-old data but exclude 8-day-old data"
  );

  await TrackingDBService.clearAll();
});
