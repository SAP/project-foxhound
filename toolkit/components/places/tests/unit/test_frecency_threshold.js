/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests the pageFrecencyThreshold() API invariants.
 * As the algorithm will evolve in time, it is not checking absolute values,
 * but rather their relative size.
 */

"use strict";

add_task(async function test_basic_invariants() {
  let noVisitsNoBookmark = PlacesUtils.history.pageFrecencyThreshold(
    0,
    0,
    false
  );
  Assert.equal(
    noVisitsNoBookmark,
    0,
    "Pages with no visits and no bookmark should have zero frecency threshold."
  );

  let unvisitedBookmark = PlacesUtils.history.pageFrecencyThreshold(0, 0, true);
  Assert.greater(
    unvisitedBookmark,
    0,
    "Unvisited bookmark should have a non-zero frecency threshold."
  );

  let visitedBookmark = PlacesUtils.history.pageFrecencyThreshold(0, 1, true);
  Assert.equal(
    visitedBookmark,
    unvisitedBookmark,
    "Visited bookmark on the same day should have an equal frecency threshold to an unvisited bookmark."
  );

  let visitedNonBookmark = PlacesUtils.history.pageFrecencyThreshold(
    1,
    1,
    false
  );
  Assert.greater(
    visitedBookmark,
    visitedNonBookmark,
    "Visited bookmark should have higher frecency threshold than visited non bookmark."
  );

  let manyVisits = PlacesUtils.history.pageFrecencyThreshold(1, 10, false);
  Assert.greater(
    manyVisits,
    visitedNonBookmark,
    "Page with many visits should have higher frecency threshold than a page with a single visit."
  );

  let pastVisits = PlacesUtils.history.pageFrecencyThreshold(60, 10, false);
  Assert.greater(
    manyVisits,
    pastVisits,
    "Recent visits should have a higher frecency threshold than older visits."
  );

  let result1 = PlacesUtils.history.pageFrecencyThreshold(1, 10, false);
  let result2 = PlacesUtils.history.pageFrecencyThreshold(1, 10, false);
  Assert.equal(
    result1,
    result2,
    "Same parameters should return a consistent frecency threshold."
  );

  let massiveVisits = PlacesUtils.history.pageFrecencyThreshold(1, 5000, false);
  Assert.greater(
    massiveVisits,
    manyVisits,
    "Very large number of visits should continue to increase frecency threshold."
  );
});

add_task(async function test_invalid_parameters() {
  Assert.throws(
    () => {
      PlacesUtils.history.pageFrecencyThreshold(-1, 0, false);
    },
    /NS_ERROR_ILLEGAL_VALUE/,
    "Should throw when visit date is negative."
  );

  Assert.throws(
    () => {
      PlacesUtils.history.pageFrecencyThreshold(0, -1, false);
    },
    /NS_ERROR_ILLEGAL_VALUE/,
    "Should throw when number of visits is negative."
  );
});
