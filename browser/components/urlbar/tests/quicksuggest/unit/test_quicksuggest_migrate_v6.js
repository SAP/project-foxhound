/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests Suggest prefs migration from version 5 to 6.

"use strict";

const TO_VERSION = 6;

add_setup(async () => {
  await setUpMigrateTest();
});

// No user-branch values set before migration
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
  });
});

// Nonsponsored false on the user branch before migration
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "suggest.quicksuggest.nonsponsored": false,
    },
    expectedPostMigrationUserPrefs: {
      "suggest.quicksuggest.all": false,
      "suggest.quicksuggest.nonsponsored": false,
    },
  });
});

// Nonsponsored true on the user branch before migration
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "suggest.quicksuggest.nonsponsored": true,
    },
    expectedPostMigrationUserPrefs: {
      "suggest.quicksuggest.all": true,
      "suggest.quicksuggest.nonsponsored": true,
    },
  });
});

// Nonsponsored and sponsored both false on the user branch before migration
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "suggest.quicksuggest.nonsponsored": false,
      "suggest.quicksuggest.sponsored": false,
    },
    expectedPostMigrationUserPrefs: {
      "suggest.quicksuggest.all": false,
      "suggest.quicksuggest.nonsponsored": false,
      "suggest.quicksuggest.sponsored": false,
    },
  });
});

// Nonsponsored false sponsored true on the user branch before migration
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "suggest.quicksuggest.nonsponsored": false,
      "suggest.quicksuggest.sponsored": true,
    },
    expectedPostMigrationUserPrefs: {
      "suggest.quicksuggest.all": false,
      "suggest.quicksuggest.nonsponsored": false,
      "suggest.quicksuggest.sponsored": true,
    },
  });
});

// Sponsored false on the user branch before migration
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "suggest.quicksuggest.sponsored": false,
    },
    expectedPostMigrationUserPrefs: {
      "suggest.quicksuggest.sponsored": false,
    },
  });
});

// Sponsored true on the user branch before migration
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "suggest.quicksuggest.sponsored": true,
    },
    expectedPostMigrationUserPrefs: {
      "suggest.quicksuggest.sponsored": true,
    },
  });
});
