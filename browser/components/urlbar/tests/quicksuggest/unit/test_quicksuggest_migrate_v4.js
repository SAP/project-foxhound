/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests Suggest prefs migration from version 3 to 4.

"use strict";

const TO_VERSION = 4;

add_setup(async () => {
  await setUpMigrateTest();
});

// No user-branch values set
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
  });
});

// Settings UI set to full
add_task(async function () {
  await doMigrateTest({
    toVersion: TO_VERSION,
    preMigrationUserPrefs: {
      "quicksuggest.settingsUi": QuickSuggest.SETTINGS_UI.FULL,
    },
    expectedPostMigrationUserPrefs: {
      "quicksuggest.settingsUi": null,
    },
  });
});
