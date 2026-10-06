/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { IPPSessionPrefManagerClass } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPPSessionPrefManager.sys.mjs"
);

const TEST_PREF = "browser.ipProtection.guardian.endpoint";
const TEST_VALUE = "https://session-pref-manager.example.com/";

add_setup(function () {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(TEST_PREF);
  });
});

/**
 * start() sets the pref; stop() resets it back.
 */
add_task(function test_start_sets_stop_resets() {
  Services.prefs.clearUserPref(TEST_PREF);

  let manager = new IPPSessionPrefManagerClass([[TEST_PREF, TEST_VALUE]]);
  manager.start();

  Assert.equal(
    Services.prefs.getCharPref(TEST_PREF, ""),
    TEST_VALUE,
    "start() should set the managed pref"
  );

  manager.stop();

  Assert.ok(
    !Services.prefs.prefHasUserValue(TEST_PREF),
    "stop() should clear the managed pref"
  );
});

/**
 * When the pref already has a user value, start() must not overwrite it and
 * stop() must not clear it.
 */
add_task(function test_user_set_pref_is_not_touched() {
  const USER_VALUE = "https://user-set.example.com/";
  Services.prefs.setCharPref(TEST_PREF, USER_VALUE);

  let manager = new IPPSessionPrefManagerClass([[TEST_PREF, TEST_VALUE]]);
  manager.start();

  Assert.equal(
    Services.prefs.getCharPref(TEST_PREF, ""),
    USER_VALUE,
    "start() should not overwrite a user-set pref"
  );

  manager.stop();

  Assert.equal(
    Services.prefs.getCharPref(TEST_PREF, ""),
    USER_VALUE,
    "stop() should not clear a pref it did not change"
  );

  Services.prefs.clearUserPref(TEST_PREF);
});

/**
 * When start() changes the pref and the user subsequently changes it again,
 * stop() must leave the user's value in place.
 */
add_task(function test_user_change_after_start_prevents_reset() {
  Services.prefs.clearUserPref(TEST_PREF);

  let manager = new IPPSessionPrefManagerClass([[TEST_PREF, TEST_VALUE]]);
  manager.start();

  Assert.equal(
    Services.prefs.getCharPref(TEST_PREF, ""),
    TEST_VALUE,
    "start() should set the managed pref"
  );

  // Simulate the user changing the pref (e.g. via about:config).
  const USER_CHANGED_VALUE = "https://user-changed.example.com/";
  Services.prefs.setCharPref(TEST_PREF, USER_CHANGED_VALUE);

  manager.stop();

  Assert.equal(
    Services.prefs.getCharPref(TEST_PREF, ""),
    USER_CHANGED_VALUE,
    "stop() should not reset a pref the user subsequently changed"
  );

  Services.prefs.clearUserPref(TEST_PREF);
});
