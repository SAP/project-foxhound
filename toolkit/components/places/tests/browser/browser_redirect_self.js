/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Tests a page that redirects to itself. On the initial visit the page should
 * be marked as hidden, but then the second visit should unhide it.
 * This ensures that that the history anti-flooding system doesn't skip the
 * second visit.
 */

add_task(async function () {
  await PlacesUtils.history.clear();
  Cc["@mozilla.org/browser/history;1"]
    .getService(Ci.mozIAsyncHistory)
    .clearCache();
  const url =
    "http://mochi.test:8888/tests/toolkit/components/places/tests/browser/redirect_self.sjs";
  let visitCount = 0;
  function onVisitsListener(events) {
    visitCount++;
    Assert.equal(events.length, 1, "Right number of visits notified");
    Assert.equal(events[0].url, url, "Got a visit for the expected url");
    if (visitCount == 1) {
      Assert.ok(events[0].hidden, "The visit should be hidden");
    } else {
      Assert.ok(!events[0].hidden, "The visit should not be hidden");
    }
  }
  PlacesObservers.addListener(["page-visited"], onVisitsListener);
  registerCleanupFunction(async function () {
    PlacesObservers.removeListener(["page-visited"], onVisitsListener);
    await PlacesUtils.history.clear();
  });
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url,
    },
    async () => {
      await TestUtils.waitForCondition(() => visitCount == 2);
      // Check that the visit is not hidden in the database.
      Assert.ok(
        !(await PlacesTestUtils.getDatabaseValue("moz_places", "hidden", {
          url,
        })),
        "The url should not be hidden in the database"
      );
    }
  );
});
