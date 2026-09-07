/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  registerCleanupFunction(() => resetState());
});

add_task(async function test_region_match() {
  Region._setHomeRegion("XX");
  await checkNotification({ type: "region", regions: ["XX", "YY"] }, true);
});

add_task(async function test_region_no_match() {
  Region._setHomeRegion("ZZ");
  await checkNotification({ type: "region", regions: ["XX", "YY"] }, false);
});

add_task(async function test_region_transition_into_list() {
  Region._setHomeRegion("ZZ");
  await checkNotification(
    { type: "region", regions: ["XX"] },
    false,
    async tab => {
      Region._setHomeRegion("XX");
      await waitForNotification(tab);
    }
  );
});

add_task(async function test_region_transition_out_of_list() {
  Region._setHomeRegion("XX");
  await checkNotification(
    { type: "region", regions: ["XX"] },
    true,
    async tab => {
      Region._setHomeRegion("ZZ");
      await waitForNoNotification(tab);
    }
  );
});
