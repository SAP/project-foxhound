/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests Suggest prefs migration from version 6 to 7.

"use strict";

const TO_VERSION = 7;

add_setup(async () => {
  await setUpMigrateTest();
});

// No user-branch values set before migration
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    expectedPostMigrationUserPrefs: {
      "addons.minKeywordLength": null,
      "addons.showLessFrequentlyCount": null,
    },
  });
});

add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "addons.minKeywordLength": 5,
    },
    expectedPostMigrationUserPrefs: {
      "addons.minKeywordLength": 5,
      "addons.showLessFrequentlyCount": 1,
    },
  });
});

add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "addons.minKeywordLength": 5,
      "addons.showLessFrequentlyCount": 1,
    },
    expectedPostMigrationUserPrefs: {
      "addons.minKeywordLength": 5,
      "addons.showLessFrequentlyCount": 1,
    },
  });
});

add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "addons.showLessFrequentlyCount": 1,
    },
    expectedPostMigrationUserPrefs: {
      "addons.minKeywordLength": 20,
      "addons.showLessFrequentlyCount": 1,
    },
  });
});
