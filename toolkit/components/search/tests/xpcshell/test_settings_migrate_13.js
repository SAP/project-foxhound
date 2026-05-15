/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests search settings migration from version 12 to latest.
// Starting from version 13, app provided search engines are
// renamed to config search engines, which can either be app
// provided or user installed.

const { AppProvidedConfigEngine, UserInstalledConfigEngine } =
  ChromeUtils.importESModule(
    "moz-src:///toolkit/components/search/ConfigSearchEngine.sys.mjs"
  );

const SEARCH_SETTINGS = {
  version: 12,
  metaData: {
    useSavedOrder: true,
    defaultEngineId: "additional",
  },
  engines: [
    {
      id: "default",
      _name: "default",
      _isAppProvided: true,
      _metaData: { order: 2 },
    },
    {
      id: "additional",
      _name: "additional",
      _isAppProvided: true,
      _metaData: { order: 1, "user-installed": true },
    },
  ],
};

const EXPECTED_ENGINES = [
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
];

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
  let engines = await SearchService.getEngines();
  Assert.ok(
    engines[0] instanceof UserInstalledConfigEngine,
    "First engine stayed user-installed"
  );
  Assert.ok(
    engines[1] instanceof AppProvidedConfigEngine,
    "Second engine stayed app-provided"
  );

  let settings = await SearchService._settings.get();
  Assert.deepEqual(settings.engines, EXPECTED_ENGINES);
});
