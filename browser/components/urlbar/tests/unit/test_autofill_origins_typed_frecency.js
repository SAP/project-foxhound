/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * This variant of origin tests explicitly check how typed visits or the
 * absence of typed visits affect origin autofill.
 */

ChromeUtils.defineLazyGetter(this, "PlacesFrecencyRecalculator", () => {
  return Cc["@mozilla.org/places/frecency-recalculator;1"].getService(
    Ci.nsIObserver
  ).wrappedJSObject;
});

registerCleanupFunction(async () => {
  Services.prefs.clearUserPref("browser.urlbar.suggest.quickactions");
});
Services.prefs.setBoolPref("browser.urlbar.suggest.quickactions", false);

testEngine_setup();

// Non-typed visits should never contribute to autofill.
add_task(async function nonTypedVisits_noAutofill_transition() {
  await PlacesTestUtils.addVisits([
    {
      uri: "http://example1.com/",
      transition: PlacesUtils.history.TRANSITION_LINK,
    },
    {
      uri: "https://example2.com/",
      transition: PlacesUtils.history.TRANSITION_REDIRECT_PERMANENT,
    },
    {
      uri: "https://example3.com/",
      transition: PlacesUtils.history.TRANSITION_REDIRECT_TEMPORARY,
    },
    {
      uri: "https://example4.com/path/",
      transition: PlacesUtils.history.TRANSITION_LINK,
    },
    {
      // Won't have frecency because it's a reload.
      uri: "https://example-reload.com/",
      transition: PlacesUtils.history.TRANSITION_RELOAD,
    },
    {
      // Will have the highest frecency because of the bookmark transition.
      uri: "https://example-bookmarked.com/path/",
      transition: PlacesUtils.history.TRANSITION_BOOKMARK,
    },
  ]);

  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let context = createContext("ex", { isPrivate: false });
  await check_results({
    context,
    matches: [
      makeSearchResult(context, {
        engineName: "Suggestions",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://example-bookmarked.com/path/",
        title: "test visit for https://example-bookmarked.com/path/",
      }),
      makeVisitResult(context, {
        uri: "https://example4.com/path/",
        title: "test visit for https://example4.com/path/",
      }),
      makeVisitResult(context, {
        uri: "https://example3.com/",
        title: "test visit for https://example3.com/",
      }),
      makeVisitResult(context, {
        uri: "https://example2.com/",
        title: "test visit for https://example2.com/",
      }),
      makeVisitResult(context, {
        uri: "http://example1.com/",
        title: "test visit for http://example1.com/",
      }),
    ],
  });

  await cleanupPlaces();
});

add_task(async function nonTypedVisits_noAutofill_hostSchemeAndPortVariants() {
  await PlacesTestUtils.addVisits([
    {
      uri: "http://example.com/",
    },
    {
      uri: "https://example.com/",
    },
    {
      uri: "http://www.example.com/",
    },
    {
      uri: "https://www.example.com/",
    },
    {
      uri: "http://www.example.com:4000/",
    },
    {
      uri: "https://www.example.com:4000/",
    },
  ]);

  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let context = createContext("ex", { isPrivate: false });
  await check_results({
    context,
    matches: [
      makeSearchResult(context, {
        engineName: "Suggestions",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://www.example.com:4000/",
        title: "test visit for https://www.example.com:4000/",
      }),
      makeVisitResult(context, {
        uri: "https://www.example.com/",
        title: "test visit for https://www.example.com/",
      }),
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
      }),
    ],
  });

  await cleanupPlaces();
});

// Typed visits should contribute to autofill.
add_task(async function singleTypedVisit_autofills() {
  await PlacesTestUtils.addVisits([
    {
      uri: "http://example.com/",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
  ]);

  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let context = createContext("ex", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "http://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "http://example.com/",
        title: "test visit for http://example.com/",
        heuristic: true,
      }),
    ],
  });

  await cleanupPlaces();
});

// Typed visit removal affects autofill.
add_task(async function removeTypedVisit_stopsAutofill() {
  await PlacesTestUtils.addVisits([
    {
      uri: "http://example.com/link",
      transition: PlacesUtils.history.TRANSITION_LINK,
    },
    {
      uri: "http://example.com/typed",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
  ]);

  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let context = createContext("ex", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "http://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "http://example.com/",
        title: "example.com",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "http://example.com/typed",
        title: "test visit for http://example.com/typed",
      }),
      makeVisitResult(context, {
        uri: "http://example.com/link",
        title: "test visit for http://example.com/link",
      }),
    ],
  });

  await PlacesUtils.history.remove("http://example.com/typed");
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  await check_results({
    context,
    matches: [
      makeSearchResult(context, {
        engineName: "Suggestions",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "http://example.com/link",
        title: "test visit for http://example.com/link",
      }),
    ],
  });

  await cleanupPlaces();
});

// If there are multiple typed visits to the same origin, it should equate to
// visiting it once.
add_task(async function sameDayTypedVisits_countAsOne() {
  await PlacesTestUtils.addVisits([
    {
      uri: "http://example.com/1",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
    {
      uri: "http://example.com/2",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
    {
      uri: "http://example.com/3",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
    {
      uri: "http://other.com/",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
  ]);

  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let exampleFrecency = await getOriginFrecency("http://", "example.com");
  let otherFrecency = await getOriginFrecency("http://", "other.com");

  Assert.equal(
    exampleFrecency,
    otherFrecency,
    "Same day typed visits should not multiply frecency."
  );

  await cleanupPlaces();
});

// Even if two URLs look similar to one another, the one that has more typed
// visits on different days should win.
add_task(async function differentDayTypedVisits_higherFrecency() {
  await PlacesTestUtils.addVisits([
    {
      uri: "http://example1.com/",
      transition: PlacesUtils.history.TRANSITION_TYPED,
      visitDate: daysAgo(0),
    },
    {
      uri: "http://example1.com/",
      transition: PlacesUtils.history.TRANSITION_TYPED,
      visitDate: daysAgo(1),
    },
    {
      uri: "http://example2.com/",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
  ]);

  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let multiDayFrecency = await getOriginFrecency("http://", "example1.com");
  let singleDayFrecency = await getOriginFrecency("http://", "example2.com");

  Assert.greater(
    multiDayFrecency,
    singleDayFrecency,
    "Multiple typed days should result in a higher frecency."
  );

  let context = createContext("ex", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example1.com/",
    completed: "http://example1.com/",
    matches: [
      makeVisitResult(context, {
        uri: "http://example1.com/",
        title: "test visit for http://example1.com/",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "http://example2.com/",
        title: "test visit for http://example2.com/",
      }),
    ],
  });

  await cleanupPlaces();
});

// When an origin has visits to both HTTP and HTTPS, we autofill HTTPS even
// if HTTP has a higher frecency.
add_task(async function httpsPreferredOverHttp() {
  await PlacesTestUtils.addVisits([
    {
      uri: "http://example.com/",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
    {
      uri: "https://example.com/path",
    },
  ]);

  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let context = createContext("ex", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "https://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/",
        // This feels a bit odd given that the uri is different.
        title: "test visit for http://example.com/",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://example.com/path",
        title: "test visit for https://example.com/path",
      }),
    ],
  });

  await cleanupPlaces();
});

add_task(async function wwwTyped_nonWwwNonTyped() {
  await PlacesTestUtils.addVisits([
    {
      uri: "http://www.example.com/",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
    {
      uri: "http://example.com/link",
      transition: PlacesUtils.history.TRANSITION_LINK,
    },
  ]);

  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let context = createContext("ex", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "http://www.example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "http://www.example.com/",
        title: "test visit for http://www.example.com/",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "http://example.com/link",
        title: "test visit for http://example.com/link",
      }),
    ],
  });

  await cleanupPlaces();
});

// The value of http and https should be combined. We test this by setting
// the threshold higher than what a URL should be, and then do visits to the
// other prefix which should trigger autofill.
add_task(async function prefixCombinedForThreshold() {
  for (let i = 0; i < 3; ++i) {
    // Add visits to make the threshold high.
    await PlacesTestUtils.addVisits([
      {
        uri: "http://abc.com/",
        transition: PlacesUtils.history.TRANSITION_TYPED,
        visitDate: daysAgo(i),
      },
      {
        uri: "https://def.com/",
        transition: PlacesUtils.history.TRANSITION_TYPED,
        visitDate: daysAgo(i),
      },
      {
        uri: "https://ghi.com/",
        transition: PlacesUtils.history.TRANSITION_TYPED,
        visitDate: daysAgo(i),
      },
    ]);
  }

  for (let i = 0; i < 2; ++i) {
    await PlacesTestUtils.addVisits([
      {
        uri: "https://example.com/",
        transition: PlacesUtils.history.TRANSITION_TYPED,
        visitDate: daysAgo(i),
      },
      {
        uri: "http://example.com/",
        transition: PlacesUtils.history.TRANSITION_TYPED,
        visitDate: daysAgo(i),
      },
    ]);
  }
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let originFrecency = await getOriginFrecency("https://", "example.com");
  let threshold = await getOriginAutofillThreshold();
  Assert.less(
    originFrecency,
    threshold,
    "https://example.com should be less than the origin frecency threshold."
  );

  originFrecency = await getOriginFrecency("http://", "example.com");
  threshold = await getOriginAutofillThreshold();
  Assert.less(
    originFrecency,
    threshold,
    "http://example.com should be less than the origin frecency threshold."
  );

  let context = createContext("ex", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "https://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "test visit for https://example.com/",
        heuristic: true,
      }),
    ],
  });

  await cleanupPlaces();
});

// A combined test where we check that non-typed visits never contribute to
// autofill, typed visits can contribute to autofill, and if there's an https
// visit, autofill it even if the http version has a higher frecency.
add_task(async function mixedTypedAndNonTyped() {
  // Add many non-typed visits.
  let nonTypedVisits = [];
  for (let i = 0; i < 200; ++i) {
    nonTypedVisits.push({ url: "https://clickonly.com/1" });
  }
  await PlacesTestUtils.addVisits(nonTypedVisits);
  await PlacesTestUtils.addVisits({
    url: "http://typedonly.com/site",
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let context = createContext("ty", { isPrivate: false });
  await check_results({
    context,
    autofilled: "typedonly.com/",
    completed: "http://typedonly.com/",
    matches: [
      makeVisitResult(context, {
        uri: "http://typedonly.com/",
        title: "typedonly.com",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "http://typedonly.com/site",
        title: "test visit for http://typedonly.com/site",
      }),
    ],
  });

  // Add an https visit.
  await PlacesTestUtils.addVisits(["https://typedonly.com/foo/bar"]);
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  await check_results({
    context,
    autofilled: "typedonly.com/",
    completed: "https://typedonly.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://typedonly.com/",
        title: "https://typedonly.com",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "http://typedonly.com/site",
        title: "test visit for http://typedonly.com/site",
      }),
      makeVisitResult(context, {
        uri: "https://typedonly.com/foo/bar",
        title: "test visit for https://typedonly.com/foo/bar",
      }),
    ],
  });

  // Sanity check that click only url still isn't autofilled.
  context = createContext("clickonly", { isPrivate: false });
  await check_results({
    context,
    matches: [
      makeSearchResult(context, {
        engineName: "Suggestions",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://clickonly.com/1",
        title: "test visit for https://clickonly.com/1",
      }),
    ],
  });

  await cleanupPlaces();
});

// HTTP bookmark + HTTPS non-bookmark visit.
add_task(async function httpBookmark_httpsNonBookmarkLink() {
  await PlacesTestUtils.addBookmarkWithDetails({
    uri: "http://example.com/path",
  });
  await PlacesTestUtils.addVisits([
    {
      uri: "https://example.com/login",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
  ]);
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let context = createContext("ex", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "https://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "https://example.com",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "https://example.com/login",
        title: "test visit for https://example.com/login",
      }),
      makeBookmarkResult(context, {
        uri: "http://example.com/path",
        title: "A bookmark",
      }),
    ],
  });

  await cleanupPlaces();
});

// HTTPS bookmark + HTTP non-bookmark visit.
add_task(async function httpsBookmark_httpNonBookmarkLink() {
  await PlacesTestUtils.addBookmarkWithDetails({
    uri: "https://example.com/login",
  });
  await PlacesTestUtils.addVisits([
    {
      uri: "http://example.com/path",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
  ]);
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let context = createContext("ex", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example.com/",
    completed: "https://example.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example.com/",
        title: "https://example.com",
        heuristic: true,
      }),
      makeVisitResult(context, {
        uri: "http://example.com/path",
        title: "test visit for http://example.com/path",
      }),
      makeBookmarkResult(context, {
        uri: "https://example.com/login",
        title: "A bookmark",
      }),
    ],
  });

  await cleanupPlaces();
});

// Origins with more bookmarks should be higher than those with fewer bookmarks
// as a tie breaker for equal frecency.
add_task(async function bookmarksCount() {
  await PlacesTestUtils.addBookmarkWithDetails({
    uri: "https://example1.com/1",
  });
  await PlacesTestUtils.addBookmarkWithDetails({
    uri: "https://example1.com/2",
  });

  await PlacesTestUtils.addBookmarkWithDetails({
    uri: "https://example2.com/1",
  });

  await PlacesTestUtils.addVisits([
    {
      uri: "https://example1.com/1",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
    {
      uri: "https://example2.com/1",
      transition: PlacesUtils.history.TRANSITION_TYPED,
    },
  ]);
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let context = createContext("ex", { isPrivate: false });
  await check_results({
    context,
    autofilled: "example1.com/",
    completed: "https://example1.com/",
    matches: [
      makeVisitResult(context, {
        uri: "https://example1.com/",
        title: "https://example1.com",
        heuristic: true,
      }),
      makeBookmarkResult(context, {
        uri: "https://example2.com/1",
        title: "A bookmark",
      }),
      makeBookmarkResult(context, {
        uri: "https://example1.com/2",
        title: "A bookmark",
      }),
      makeBookmarkResult(context, {
        uri: "https://example1.com/1",
        title: "A bookmark",
      }),
    ],
  });

  await cleanupPlaces();
});
