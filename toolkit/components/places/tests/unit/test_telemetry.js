/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests common Places telemetry probes.

const { PlacesDBUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/PlacesDBUtils.sys.mjs"
);

/**
 * Forces an expiration run.
 *
 * @param {number} [aLimit]
 *   Limit for the expiration. Pass -1 for unlimited. Any other non-positive
 *   value will just expire orphans.
 * @returns {Promise<[string, string]>}
 */
function promiseForceExpirationStep(aLimit) {
  let promise = promiseTopicObserved(PlacesUtils.TOPIC_EXPIRATION_FINISHED);
  let expire = Cc["@mozilla.org/places/expiration;1"].getService(
    Ci.nsIObserver
  );
  expire.observe(null, "places-debug-start-expiration", aLimit);
  return promise;
}

/**
 * Returns a PRTime in the past usable to add expirable visits.
 *
 * @param {number} [daysAgo]
 * Expiration ignores any visit added in the last 7 days, so by default
 * this will be set to 7.
 *
 * Note: to be safe against DST issues we go back one day more.
 */
function getExpirablePRTime(daysAgo = 7) {
  let dateObj = new Date();
  // Normalize to midnight
  dateObj.setHours(0);
  dateObj.setMinutes(0);
  dateObj.setSeconds(0);
  dateObj.setMilliseconds(0);
  dateObj = new Date(dateObj.getTime() - (daysAgo + 1) * 86400000);
  return dateObj.getTime() * 1000;
}

add_task(async function test_execute() {
  Services.fog.initializeFOG();

  // Put some trash in the database.
  let uri = Services.io.newURI("http://moz.org/");

  PlacesUtils.bookmarks.insertTree({
    guid: PlacesUtils.bookmarks.unfiledGuid,
    children: [
      {
        title: "moz test",
        type: PlacesUtils.bookmarks.TYPE_FOLDER,
        children: [
          {
            title: "moz test",
            url: uri,
          },
        ],
      },
    ],
  });

  PlacesUtils.tagging.tagURI(uri, ["tag"]);
  await PlacesUtils.keywords.insert({ url: uri.spec, keyword: "keyword" });

  // Set a large annotation.
  let content = "";
  while (content.length < 1024) {
    content += "0";
  }

  await PlacesUtils.history.update({
    url: uri,
    annotations: new Map([["test-anno", content]]),
  });

  await PlacesDBUtils.telemetry();

  await PlacesTestUtils.promiseAsyncUpdates();

  // Test expiration probes.
  let timeInMicroseconds = getExpirablePRTime(8);

  function newTimeInMicroseconds() {
    timeInMicroseconds = timeInMicroseconds + 1000;
    return timeInMicroseconds;
  }

  for (let i = 0; i < 3; i++) {
    await PlacesTestUtils.addVisits({
      uri: Services.io.newURI("http://" + i + ".moz.org/"),
      visitDate: newTimeInMicroseconds(),
    });
  }
  Services.prefs.setIntPref("places.history.expiration.max_pages", 0);
  await promiseForceExpirationStep(2);
  await promiseForceExpirationStep(2);

  // Test idle probes.
  await PlacesDBUtils.maintenanceOnIdle();

  Assert.equal(Glean.places.pagesCount.testGetValue().sum, 1);
  Assert.equal(Glean.places.bookmarksCount.testGetValue().sum, 1);
  Assert.equal(Glean.places.tagsCount.testGetValue().sum, 1);
  Assert.equal(Glean.places.keywordsCount.testGetValue().sum, 1);
  Assert.equal(Glean.places.sortedBookmarksPerc.testGetValue().sum, 100);
  Assert.equal(Glean.places.taggedBookmarksPerc.testGetValue().sum, 100);
  Assert.greater(Glean.places.databaseFilesize.testGetValue().sum, 0);
  Assert.greater(Glean.places.databaseFaviconsFilesize.testGetValue().sum, 0);
  Assert.greater(Glean.places.expirationStepsToClean.testGetValue().sum, 1);
  Assert.greater(Glean.places.idleMaintenanceTime.testGetValue().sum, 0);
  Assert.equal(Glean.places.annosPagesCount.testGetValue().sum, 1);
  Assert.greaterOrEqual(
    Glean.places.maintenanceDaysfromlast.testGetValue().sum,
    0
  );
  Assert.equal(Glean.places.pagesNeedFrecencyRecalculation.testGetValue(), 1);
});
