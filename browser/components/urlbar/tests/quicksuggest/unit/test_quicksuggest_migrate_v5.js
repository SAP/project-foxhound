/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests Suggest prefs migration from version 4 to 5.

"use strict";

const TO_VERSION = 5;

add_setup(async () => {
  await setUpMigrateTest();
});

// Region=US, locale=en-US => Suggest proper is enabled. No user-branch values
// set before migration.
add_task(async function () {
  await QuickSuggestTestUtils.withRegionAndLocale({
    region: "US",
    locale: "en-US",
    skipSuggestReset: true,
    callback: async () => {
      await doMigrateTest({
        toVersion: TO_VERSION,
      });
    },
  });
});

// Region=US, locale=en-US => Suggest proper is enabled. The sponsored pref is
// false on the user branch and should keep its value after migration.
add_task(async function () {
  await QuickSuggestTestUtils.withRegionAndLocale({
    region: "US",
    locale: "en-US",
    skipSuggestReset: true,
    callback: async () => {
      await doMigrateTest({
        toVersion: TO_VERSION,
        preMigrationUserPrefs: {
          "suggest.quicksuggest.sponsored": false,
        },
        expectedPostMigrationUserPrefs: {
          "suggest.quicksuggest.sponsored": false,
        },
      });
    },
  });
});

// Region=US, locale=en-US => Suggest proper is enabled. The sponsored pref is
// true on the user branch and should keep its value after migration.
add_task(async function () {
  await QuickSuggestTestUtils.withRegionAndLocale({
    region: "US",
    locale: "en-US",
    skipSuggestReset: true,
    callback: async () => {
      await doMigrateTest({
        toVersion: TO_VERSION,
        preMigrationUserPrefs: {
          "suggest.quicksuggest.sponsored": true,
        },
        expectedPostMigrationUserPrefs: {
          "suggest.quicksuggest.sponsored": true,
        },
      });
    },
  });
});

// Region=DE, locale=de => Suggest proper is enabled. No user-branch values set
// before migration.
add_task(async function () {
  await QuickSuggestTestUtils.withRegionAndLocale({
    region: "DE",
    locale: "de",
    skipSuggestReset: true,
    callback: async () => {
      await doMigrateTest({
        toVersion: TO_VERSION,
      });
    },
  });
});

// Region=DE, locale=de => Suggest proper is enabled. The sponsored pref is
// false on the user branch and should keep its value after migration.
add_task(async function () {
  await QuickSuggestTestUtils.withRegionAndLocale({
    region: "DE",
    locale: "de",
    skipSuggestReset: true,
    callback: async () => {
      await doMigrateTest({
        toVersion: TO_VERSION,
        preMigrationUserPrefs: {
          "suggest.quicksuggest.sponsored": false,
        },
        expectedPostMigrationUserPrefs: {
          "suggest.quicksuggest.sponsored": false,
        },
      });
    },
  });
});

// Region=DE, locale=de => Suggest proper is enabled. The sponsored pref is
// true on the user branch and should keep its value after migration.
add_task(async function () {
  await QuickSuggestTestUtils.withRegionAndLocale({
    region: "DE",
    locale: "de",
    skipSuggestReset: true,
    callback: async () => {
      await doMigrateTest({
        toVersion: TO_VERSION,
        preMigrationUserPrefs: {
          "suggest.quicksuggest.sponsored": true,
        },
        expectedPostMigrationUserPrefs: {
          "suggest.quicksuggest.sponsored": true,
        },
      });
    },
  });
});

// Region=DE, locale=en-US => Suggest proper is *not* enabled as of this
// migration version. The sponsored pref is false on the user branch and should
// be cleared after migration.
add_task(async function () {
  await QuickSuggestTestUtils.withRegionAndLocale({
    region: "DE",
    locale: "en-US",
    skipSuggestReset: true,
    callback: async () => {
      await doMigrateTest({
        toVersion: TO_VERSION,
        preMigrationUserPrefs: {
          "suggest.quicksuggest.sponsored": false,
        },
        expectedPostMigrationUserPrefs: {
          "suggest.quicksuggest.sponsored": null,
        },
      });
    },
  });
});

// Region=DE, locale=en-US => Suggest proper is *not* enabled as of this
// migration version. The sponsored pref is true on the user branch and should
// be cleared after migration.
add_task(async function () {
  await QuickSuggestTestUtils.withRegionAndLocale({
    region: "DE",
    locale: "en-US",
    skipSuggestReset: true,
    callback: async () => {
      await doMigrateTest({
        toVersion: TO_VERSION,
        preMigrationUserPrefs: {
          "suggest.quicksuggest.sponsored": true,
        },
        expectedPostMigrationUserPrefs: {
          "suggest.quicksuggest.sponsored": null,
        },
      });
    },
  });
});
