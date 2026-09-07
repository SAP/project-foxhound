/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests Suggest prefs migration from unversioned prefs to version 1.

"use strict";

const TO_VERSION = 1;

add_setup(async () => {
  await setUpMigrateTest();
});

// No user-branch values set
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
  });
});

// Migrating from Suggest disabled
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "suggest.quicksuggest": false,
    },
    expectedPostMigrationUserPrefs: {
      "suggest.quicksuggest": null,
      "suggest.quicksuggest.nonsponsored": false,
      "suggest.quicksuggest.sponsored": false,
    },
  });
});

// Migrating from Suggest enabled
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "suggest.quicksuggest": true,
    },
    expectedPostMigrationUserPrefs: {
      "suggest.quicksuggest": null,
      "suggest.quicksuggest.nonsponsored": true,
    },
  });
});
