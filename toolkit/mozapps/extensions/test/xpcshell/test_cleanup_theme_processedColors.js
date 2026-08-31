/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Regression test for bug 1830136, bug 1964281, bug 2006058.
// _processedColor-specific migration was later replaced with migration tied to
// LightweightThemeManager.DATA_VERSION (see bug 2045990).

const THEME_ID = "theme@tests.mozilla.org";

const { JSONFile } = ChromeUtils.importESModule(
  "resource://gre/modules/JSONFile.sys.mjs"
);
const { LightweightThemeManager } = ChromeUtils.importESModule(
  "resource://gre/modules/LightweightThemeManager.sys.mjs"
);

Services.prefs.setIntPref(
  "extensions.enabledScopes",
  AddonManager.SCOPE_PROFILE | AddonManager.SCOPE_APPLICATION
);

add_task(async function test_theme_startupData_version_migration() {
  createAppInfo("xpcshell@tests.mozilla.org", "XPCShell", "1", "1.9.2");

  const profileDir = gProfD.clone();
  profileDir.append("extensions");

  await promiseWriteWebManifestForExtension(
    {
      author: "Some author",
      manifest_version: 2,
      name: "Web Extension Name",
      version: "1.0",
      theme: {
        colors: {
          frame: "rgb(1, 2, 3)",
        },
      },
      browser_specific_settings: {
        gecko: {
          id: THEME_ID,
        },
      },
    },
    profileDir
  );

  await promiseStartupManager();

  const addon = await AddonManager.getAddonByID(THEME_ID);
  Assert.ok(!!addon, "Theme addon should exist");

  // Enable the theme so it actually starts up (and thus parses its theme data)
  // on the next application startup.
  {
    let startupPromise = promiseWebExtensionStartup(THEME_ID);
    await addon.enable();
    await startupPromise;
  }

  await AddonTestUtils.promiseShutdownManager();

  const data = aomStartup.readStartupData();
  const themeEntry = data["app-profile"].addons[THEME_ID];

  // Simulate stale startupData written by an older Firefox: it has no
  // dataVersion, an obsolete `_processedColors` property (bug 1830136), and
  // obsolete top-level properties (bug 2004905).
  themeEntry.startupData = {
    lwtData: {
      theme: {
        _processedColors: 42,
        accentcolor: "rgb(255, 0, 0)",
      },
    },
    lwtStyles: {
      _processedColors: 42,
      foo: "bar",
    },
    lwtDarkStyles: {},
    experiment: null,
  };

  const jsonFile = new JSONFile({
    path: PathUtils.join(gProfD.path, "addonStartup.json.lz4"),
    compression: "lz4",
  });
  jsonFile.data = data;
  await jsonFile._save();

  let startupPromise = promiseWebExtensionStartup(THEME_ID);
  await AddonTestUtils.promiseStartupManager();
  await startupPromise;

  // Shut down again to flush the regenerated startupData to disk.
  await AddonTestUtils.promiseShutdownManager();

  const startupData = aomStartup.readStartupData();
  const themeFromFile = startupData["app-profile"].addons[THEME_ID];
  Assert.ok(themeFromFile.startupData, "We have startupData");
  Assert.equal(
    themeFromFile.startupData.lwtData.dataVersion,
    LightweightThemeManager.DATA_VERSION,
    "Stale startupData was reparsed and stamped with the current dataVersion"
  );
  Assert.ok(
    !("_processedColors" in themeFromFile.startupData.lwtData.theme),
    "No _processedColors property after reparse"
  );
  Assert.deepEqual(
    ["lwtData"],
    Object.keys(themeFromFile.startupData),
    "No legacy properties (lwtStyles, lwtDarkStyles, experiment)"
  );
});
