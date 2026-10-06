/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*

Autocomplete Frecency Tests

- adds a visit for each transition type (recent and old)
- search
- test number of matches
- test each item's location in results
- verify recent visits rank higher than older visits

*/

testEngine_setup();

// A visit will be added for each transition.
const TRANSITIONS = {
  link: PlacesUtils.history.TRANSITION_LINK,
  redirectPermanent: PlacesUtils.history.TRANSITION_REDIRECT_PERMANENT,
  redirectTemporary: PlacesUtils.history.TRANSITION_REDIRECT_TEMPORARY,
  typed: PlacesUtils.history.TRANSITION_TYPED,
  bookmark: PlacesUtils.history.TRANSITION_BOOKMARK,
  embed: PlacesUtils.history.TRANSITION_EMBED,
  download: PlacesUtils.history.TRANSITION_DOWNLOAD,
  framedLink: PlacesUtils.history.TRANSITION_FRAMED_LINK,
  reload: PlacesUtils.history.TRANSITION_RELOAD,
};

// Despite visits being added for EMBED, DOWNLOAD, FRAMED_LINK, and RELOAD,
// we don't actually expect them to show up in results.
const EXPECTED_TRANSITION_ORDER = [
  // High bucket.
  PlacesUtils.history.TRANSITION_BOOKMARK,
  PlacesUtils.history.TRANSITION_TYPED,
  // Medium bucket.
  PlacesUtils.history.TRANSITION_REDIRECT_TEMPORARY,
  PlacesUtils.history.TRANSITION_REDIRECT_PERMANENT,
  PlacesUtils.history.TRANSITION_LINK,
];

async function createTestEntries(searchTerm) {
  const testEntries = [];

  for (let [transitionName, transitionType] of Object.entries(TRANSITIONS)) {
    let uri = Services.io.newURI(
      `https://${searchTerm}.com/${transitionName}/`
    );

    let title = `${searchTerm} ${transitionName} test`;

    if (transitionType === PlacesUtils.history.TRANSITION_BOOKMARK) {
      await PlacesTestUtils.addBookmarkWithDetails({
        uri,
        title,
      });
    }

    await PlacesTestUtils.addVisits({
      uri,
      title,
      transition: transitionType,
    });

    if (transitionType === PlacesUtils.history.TRANSITION_TYPED) {
      PlacesUtils.history.markPageAsTyped(uri);
    }

    testEntries.push({
      uri,
      title,
      transitionType,
      transitionName,
      age: "recent",
    });
  }

  // 180 days ago in microseconds.
  // This number was chosen because we want a safe value that is so old, even
  // a higher bucket wouldn't allow it to remain higher than a more recent
  // visit that was in a lower non-zero bucket.
  const OLD_TIME = (Date.now() - 180 * 24 * 60 * 60 * 1000) * 1000;
  for (let [transitionName, transitionType] of Object.entries(TRANSITIONS)) {
    let uri = Services.io.newURI(
      `https://${searchTerm}.com/old/${transitionName}/`
    );

    let title = `${searchTerm} ${transitionName} test`;

    if (transitionType === PlacesUtils.history.TRANSITION_BOOKMARK) {
      await PlacesTestUtils.addBookmarkWithDetails({
        uri,
        title,
      });
    }

    await PlacesTestUtils.addVisits({
      uri,
      title,
      transition: transitionType,
      visitDate: OLD_TIME,
    });

    if (transitionType === PlacesUtils.history.TRANSITION_TYPED) {
      PlacesUtils.history.markPageAsTyped(uri);
    }

    testEntries.push({
      uri,
      title,
      transitionType,
      transitionName,
      age: "old",
    });
  }

  return testEntries;
}

add_task(async function test_frecency() {
  const searchTerm = "frecency";
  const testEntries = await createTestEntries(searchTerm);

  // Disable autoFill for this test.
  Services.prefs.setBoolPref("browser.urlbar.autoFill", false);
  Services.prefs.setBoolPref("browser.urlbar.suggest.searches", false);
  Services.prefs.setBoolPref(
    "browser.urlbar.scotchBonnet.enableOverride",
    false
  );
  // always search in history + bookmarks, no matter what the default is
  Services.prefs.setBoolPref("browser.urlbar.suggest.history", true);
  Services.prefs.setBoolPref("browser.urlbar.suggest.bookmarks", true);
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref("browser.urlbar.suggest.history");
    Services.prefs.clearUserPref("browser.urlbar.suggest.bookmarks");
    Services.prefs.clearUserPref("browser.urlbar.autoFill");
    Services.prefs.clearUserPref("browser.urlbar.suggest.searches");
    Services.prefs.clearUserPref("browser.urlbar.scotchBonnet.enableOverride");
  });

  // Make sure there's enough results returned
  Services.prefs.setIntPref(
    "browser.urlbar.maxRichResults",
    // +1 for the heuristic search result.
    testEntries.length + 1
  );

  await PlacesTestUtils.promiseAsyncUpdates();

  // Perform the search.
  let context = createContext(searchTerm, { isPrivate: false });

  let expectedResults = [
    makeSearchResult(context, {
      engineName: SUGGESTIONS_ENGINE_NAME,
      heuristic: true,
    }),
  ];

  // Add entries in expected recent frecency order.
  for (let expectedTransition of EXPECTED_TRANSITION_ORDER) {
    let entry = testEntries.find(
      e => e.transitionType == expectedTransition && e.age == "recent"
    );

    if (expectedTransition === PlacesUtils.history.TRANSITION_BOOKMARK) {
      expectedResults.push(
        makeBookmarkResult(context, { uri: entry.uri.spec, title: entry.title })
      );
    } else {
      expectedResults.push(
        makeVisitResult(context, { uri: entry.uri.spec, title: entry.title })
      );
    }
  }

  // Add entries in expected recent frecency order.
  for (let expectedTransition of EXPECTED_TRANSITION_ORDER) {
    let entry = testEntries.find(
      e => e.transitionType == expectedTransition && e.age == "old"
    );

    if (expectedTransition === PlacesUtils.history.TRANSITION_BOOKMARK) {
      expectedResults.push(
        makeBookmarkResult(context, { uri: entry.uri.spec, title: entry.title })
      );
    } else {
      expectedResults.push(
        makeVisitResult(context, { uri: entry.uri.spec, title: entry.title })
      );
    }
  }

  await check_results({
    context,
    matches: expectedResults,
  });
});
