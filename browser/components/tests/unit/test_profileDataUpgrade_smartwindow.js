/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Check `aiwindow` prefs get migrated to `smartwindow` successfully.
 */
add_task(async function test_check_migration() {
  const { ProfileDataUpgrader } = ChromeUtils.importESModule(
    "moz-src:///browser/components/ProfileDataUpgrader.sys.mjs"
  );
  const MY_BOOL = "browser.aiwindow.testbool";
  const MY_INT = "browser.aiwindow.testint";
  const MY_STRING = "browser.aiwindow.teststring";

  const kFilterUserPref = p => Services.prefs.prefHasUserValue(p);

  let existingUserSetSmartPrefs = Services.prefs
    .getChildList("browser.smartwindow.")
    .filter(kFilterUserPref);
  Assert.deepEqual(
    [],
    existingUserSetSmartPrefs,
    "No smartwindow prefs should exist before migration."
  );

  let existingUserSetAIPrefs = Services.prefs
    .getChildList("browser.aiwindow.")
    .filter(kFilterUserPref);
  Assert.deepEqual(
    [],
    existingUserSetAIPrefs,
    "No aiwindow prefs should exist before migration."
  );

  Services.prefs.setBoolPref(MY_BOOL, true);
  Services.prefs.setIntPref(MY_INT, 42);
  Services.prefs.setStringPref(MY_STRING, "testvalue");

  ProfileDataUpgrader.upgrade(163, 164);

  let migratedBool = Services.prefs.getBoolPref("browser.smartwindow.testbool");
  let migratedInt = Services.prefs.getIntPref("browser.smartwindow.testint");
  let migratedString = Services.prefs.getStringPref(
    "browser.smartwindow.teststring"
  );

  Assert.equal(
    migratedBool,
    true,
    "The boolean pref should be migrated successfully."
  );
  Assert.equal(
    migratedInt,
    42,
    "The integer pref should be migrated successfully."
  );
  Assert.equal(
    migratedString,
    "testvalue",
    "The string pref should be migrated successfully."
  );
  let movedUserPrefs = Services.prefs
    .getChildList("browser.smartwindow.")
    .filter(kFilterUserPref)
    .sort();
  Assert.deepEqual(
    movedUserPrefs,
    [
      "browser.smartwindow.testbool",
      "browser.smartwindow.testint",
      "browser.smartwindow.teststring",
    ],
    "Only the user-set prefs should have migrated."
  );

  let oldPrefs = [MY_BOOL, MY_INT, MY_STRING];
  for (let pref of oldPrefs) {
    Assert.ok(
      !Services.prefs.prefHasUserValue(pref),
      `The old pref ${pref} should be removed after migration.`
    );
  }
});
