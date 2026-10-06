/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PREF_LAST_EPOCH = "network.cookie.validation.lastEpoch";
const PREF_EPOCH = "network.cookie.validation.epoch";

function promise_cookies_validated() {
  return new _promise_observer("cookies-validated");
}

function promise_idle() {
  return new Promise(resolve => executeSoon(resolve));
}

registerCleanupFunction(() => {
  Services.prefs.clearUserPref(PREF_LAST_EPOCH);
  Services.prefs.clearUserPref(PREF_EPOCH);
});

// When lastEpoch is behind the current epoch, validation should run and
// lastEpoch should be updated.
add_task(async function test_validation_runs_on_new_epoch() {
  do_get_profile();

  Services.prefs.setIntPref(PREF_LAST_EPOCH, 0);
  Services.prefs.setIntPref(PREF_EPOCH, 1);

  let validatedPromise = promise_cookies_validated();

  // Start the cookieservice, to force creation of a database.
  Services.cookies.sessionCookies;

  await validatedPromise;

  Assert.equal(
    Services.prefs.getIntPref(PREF_LAST_EPOCH),
    1,
    "lastEpoch should be updated to the current epoch after validation"
  );

  await promise_close_profile();
});

// When lastEpoch equals the current epoch, validation should be skipped.
add_task(async function test_validation_skipped_on_current_epoch() {
  do_get_profile();

  const currentEpoch = Services.prefs.getIntPref(PREF_EPOCH);
  Services.prefs.setIntPref(PREF_LAST_EPOCH, currentEpoch);

  let validated = false;
  let observer = {
    observe() {
      validated = true;
    },
  };
  Services.obs.addObserver(observer, "cookies-validated");

  await promise_load_profile();
  await promise_idle();

  Services.obs.removeObserver(observer, "cookies-validated");

  Assert.ok(
    !validated,
    "cookies-validated should not fire when epoch is current"
  );
  Assert.equal(
    Services.prefs.getIntPref(PREF_LAST_EPOCH),
    currentEpoch,
    "lastEpoch should not change when validation is skipped"
  );

  await promise_close_profile();
});
