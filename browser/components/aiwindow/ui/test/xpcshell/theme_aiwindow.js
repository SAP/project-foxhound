/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
});

var { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();
AddonTestUtils.createAppInfo(
  "xpcshell@tests.mozilla.org",
  "XPCShell",
  "1",
  "147"
);

const AI_WINDOW_THEME_ID = "firefox-aiwindow@mozilla.org";

add_setup(async function () {
  await AddonTestUtils.promiseStartupManager();
});

// The AI window's theme is loaded from manifest.json by LWT without the
// extension framework, which means that the manifest is not validated against
// extensions/schemas/theme.json.
// To make sure that the aiwindow's manifest.json is valid, we load it as an
// extension here. Any errors (and even warnings) in the manifest.json file
// will cause this test to fail. Warnings are turned into errors because
// extensions.webextensions.warnings-as-errors defaults to true in unit tests.
add_task(async function test_ai_theme_manifest_is_valid() {
  info("Validating AI window theme manifest through AddonManager");

  const themeURI = "resource://builtin-themes/aiwindow/";
  const addon = await AddonManager.installBuiltinAddon(themeURI);

  Assert.ok(addon, "Theme manifest should be valid and loadable");
  Assert.equal(addon.id, AI_WINDOW_THEME_ID, "Theme should have correct ID");
  Assert.equal(addon.type, "theme", "Should be recognized as a theme");
  Assert.equal(addon.name, "Firefox AI Window", "Should have correct name");

  await addon.uninstall();
});
