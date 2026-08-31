/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests Suggest prefs migration from version 1 to 2.

"use strict";

const TO_VERSION = 2;

add_setup(async () => {
  await setUpMigrateTest();
});

// No user-branch values set
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
  });
});

// Migrating from offline scenario
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "quicksuggest.scenario": "offline",
    },
    expectedPostMigrationUserPrefs: {
      "quicksuggest.scenario": "offline",
    },
  });
});

// Migrating from offline scenario, no user prefs set
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "quicksuggest.scenario": "online",
    },
    expectedPostMigrationUserPrefs: {
      "quicksuggest.scenario": "online",
      "suggest.quicksuggest.nonsponsored": false,
      "suggest.quicksuggest.sponsored": false,
    },
  });
});

// Migrating from offline scenario, sponsored/nonsponsored set to false
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "quicksuggest.scenario": "online",
      "suggest.quicksuggest.nonsponsored": false,
      "suggest.quicksuggest.sponsored": false,
    },
    expectedPostMigrationUserPrefs: {
      "quicksuggest.scenario": "online",
      "suggest.quicksuggest.nonsponsored": false,
      "suggest.quicksuggest.sponsored": false,
    },
  });
});

// Migrating from offline scenario, sponsored/nonsponsored set to true
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "quicksuggest.scenario": "online",
      "suggest.quicksuggest.nonsponsored": true,
      "suggest.quicksuggest.sponsored": true,
    },
    expectedPostMigrationUserPrefs: {
      "quicksuggest.scenario": "online",
      "suggest.quicksuggest.nonsponsored": true,
      "suggest.quicksuggest.sponsored": true,
    },
  });
});
