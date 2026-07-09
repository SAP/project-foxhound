/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests search settings migration from version 13 to latest.
// This only resets the remove search engines enterprise policy preference.

const SEARCH_SETTINGS = {
  version: 13,
  metaData: {
    useSavedOrder: true,
    defaultEngineId: "additional",
  },
  engines: [
    {
      id: "default",
      _name: "default",
      _isConfigEngine: true,
      _metaData: { order: 2 },
    },
    {
      id: "additional",
      _name: "additional",
      _isConfigEngine: true,
      _metaData: { order: 1, "user-installed": true },
    },
  ],
};

const CONFIG = [
  { identifier: "default" },
  {
    identifier: "additional",
    variants: [
      {
        environment: { locales: ["de"] },
      },
    ],
  },
];

add_setup(async function () {
  await IOUtils.writeJSON(
    PathUtils.join(PathUtils.profileDir, SETTINGS_FILENAME),
    SEARCH_SETTINGS,
    { compress: true }
  );
  SearchTestUtils.updateRemoteSettingsConfig(CONFIG);
  await SearchService.init();
});

add_task(async function test_migration() {
  Services.prefs.setStringPref(
    "browser.policies.runOncePerModification.removeSearchEngines",
    "[engine1]"
  );

  let settings = await SearchService._settings.get();
  Assert.equal(
    settings.version,
    SearchUtils.SETTINGS_VERSION,
    "Should have upgraded the settings file"
  );

  Assert.ok(
    !Services.prefs.prefHasUserValue(
      "browser.policies.runOncePerModification.removeSearchEngines"
    ),
    "Should no longer have the value set for the preference"
  );
});
