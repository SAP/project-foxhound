/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PAST = "2000-01-01T00:00:00Z";
const FUTURE = "2999-01-01T00:00:00Z";

add_setup(async function () {
  registerCleanupFunction(() => resetState());
});

add_task(async function test_date_no_bounds() {
  await checkNotification({ type: "date" }, true);
});

add_task(async function test_date_start_past() {
  await checkNotification({ type: "date", start: PAST }, true);
});

add_task(async function test_date_start_future() {
  await checkNotification({ type: "date", start: FUTURE }, false);
});

add_task(async function test_date_end_past() {
  await checkNotification({ type: "date", end: PAST }, false);
});

add_task(async function test_date_end_future() {
  await checkNotification({ type: "date", end: FUTURE }, true);
});

add_task(async function test_date_range_inside() {
  await checkNotification({ type: "date", start: PAST, end: FUTURE }, true);
});

add_task(async function test_date_range_outside_before() {
  await checkNotification({ type: "date", start: FUTURE, end: FUTURE }, false);
});

add_task(async function test_date_range_outside_after() {
  await checkNotification({ type: "date", start: PAST, end: PAST }, false);
});

add_task(async function test_date_invalid_bounds_ignored() {
  await checkNotification(
    { type: "date", start: "not-a-date", end: "also-bad" },
    true
  );
});

add_task(async function test_date_negation_via_not() {
  await checkNotification(
    {
      type: "not",
      condition: { type: "date", start: FUTURE },
    },
    true
  );
});
