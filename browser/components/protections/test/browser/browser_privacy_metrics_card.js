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

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.contentblocking.database.enabled", true],
      ["browser.contentblocking.report.privacy_metrics.enabled", true],
    ],
  });

  await TrackingDBService.saveEvents(JSON.stringify({}));
  await TrackingDBService.clearAll();
});

registerCleanupFunction(async () => {
  await TrackingDBService.clearAll();
});

add_task(async function test_card_renders_with_stats() {
  info("Test privacy-metrics-card renders stats on about:protections");

  const db = await Sqlite.openConnection({ path: DB_PATH });
  const now = new Date().toISOString();

  await db.execute(SQL.insertCustomTimeEvent, {
    type: TrackingDBService.TRACKERS_ID,
    count: 10,
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

  const result = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    async function () {
      const card = content.document.querySelector("privacy-metrics-card");
      Assert.ok(card, "Card element should exist in the page");

      await ContentTaskUtils.waitForCondition(
        () => card.hasAttribute("total"),
        "Waiting for card to reflect total attribute"
      );

      return {
        total: Number(card.getAttribute("total")),
        trackers: Number(card.getAttribute("trackers")),
        fingerprinters: Number(card.getAttribute("fingerprinters")),
        hasError: card.shadowRoot.querySelector(".error-state") !== null,
      };
    }
  );

  Assert.equal(result.total, 13, "Card total should be 13");
  Assert.equal(result.trackers, 10, "Card trackers should be 10");
  Assert.equal(result.fingerprinters, 3, "Card fingerprinters should be 3");
  Assert.ok(!result.hasError, "Card should not be in error state");

  await BrowserTestUtils.removeTab(tab);
  await TrackingDBService.clearAll();
});

add_task(async function test_card_renders_empty_state() {
  info("Test privacy-metrics-card renders with empty database");

  await TrackingDBService.clearAll();

  let tab = await BrowserTestUtils.openNewForegroundTab({
    url: "about:protections",
    gBrowser,
  });

  const result = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    async function () {
      const card = content.document.querySelector("privacy-metrics-card");
      Assert.ok(card, "Card element should exist in the page");

      await ContentTaskUtils.waitForCondition(
        () => card.hasAttribute("total"),
        "Waiting for card to reflect total attribute"
      );

      return {
        total: Number(card.getAttribute("total")),
        trackers: Number(card.getAttribute("trackers")),
        hasError: card.shadowRoot.querySelector(".error-state") !== null,
      };
    }
  );

  Assert.equal(result.total, 0, "Card total should be 0 for empty database");
  Assert.equal(result.trackers, 0, "Card trackers should be 0");
  Assert.ok(!result.hasError, "Card should not be in error state");

  await BrowserTestUtils.removeTab(tab);
});
