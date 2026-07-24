/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { PreferencesBackupResource } = ChromeUtils.importESModule(
  "resource:///modules/backup/PreferencesBackupResource.sys.mjs"
);

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  SelectableProfileService:
    "resource:///modules/profiles/SelectableProfileService.sys.mjs",
});

const STORE_ID_PREF = "toolkit.profiles.storeID";

add_task(async function test_recover_regular_profile_no_storeID_in_prefs() {
  let sandbox = sinon.createSandbox();
  let preferencesBackupResource = new PreferencesBackupResource();

  let recoveryPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PreferencesBackupResource-recover-regular-test"
  );
  let destProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PreferencesBackupResource-dest-regular-test"
  );

  await createTestFiles(recoveryPath, [{ path: "prefs.js" }]);

  sandbox.stub(lazy.SelectableProfileService, "currentProfile").value(null);

  let postRecoveryEntry = await preferencesBackupResource.recover(
    { profilePath: "/some/original/path" },
    recoveryPath,
    destProfilePath
  );

  Assert.equal(postRecoveryEntry, null, "recover() should return null");

  let prefsContent = await IOUtils.readUTF8(
    PathUtils.join(destProfilePath, "prefs.js")
  );
  Assert.ok(
    !prefsContent.includes(STORE_ID_PREF),
    "prefs.js should not contain storeID when recovering into a regular profile"
  );

  await maybeRemovePath(recoveryPath);
  await maybeRemovePath(destProfilePath);
  sandbox.restore();
});

add_task(async function test_recover_into_selectable_profile_writes_storeID() {
  let sandbox = sinon.createSandbox();
  let preferencesBackupResource = new PreferencesBackupResource();

  let recoveryPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PreferencesBackupResource-recover-selectable-test"
  );
  let destProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PreferencesBackupResource-dest-selectable-test"
  );

  await createTestFiles(recoveryPath, [{ path: "prefs.js" }]);

  const TEST_STORE_ID = "test-store-id-12345";

  sandbox
    .stub(lazy.SelectableProfileService, "currentProfile")
    .value({ id: 1 });
  sandbox.stub(lazy.SelectableProfileService, "getDBPref").resolves(true);
  sandbox
    .stub(lazy.SelectableProfileService, "flushSharedPrefToDatabase")
    .resolves();
  sandbox
    .stub(lazy.SelectableProfileService, "addSelectableProfilePrefs")

    .callsFake(async profileDirPath => {
      // This does something similar to what the actual addSelectableProfilePrefs does
      const prefs = [
        `user_pref("browser.profiles.enabled", true);`,
        `user_pref("browser.profiles.created", true);`,
        `user_pref("${STORE_ID_PREF}", "${TEST_STORE_ID}");`,
      ];
      await IOUtils.writeUTF8(
        PathUtils.join(profileDirPath, "prefs.js"),
        prefs.join("\n") + "\n",
        { mode: "appendOrCreate" }
      );
    });

  let postRecoveryEntry = await preferencesBackupResource.recover(
    { profilePath: "/some/original/path" },
    recoveryPath,
    destProfilePath
  );

  Assert.equal(postRecoveryEntry, null, "recover() should return null");

  let prefsContent = await IOUtils.readUTF8(
    PathUtils.join(destProfilePath, "prefs.js")
  );
  Assert.ok(
    prefsContent.includes(`user_pref("${STORE_ID_PREF}", "${TEST_STORE_ID}");`),
    "prefs.js should contain the storeID when recovering into a selectable profile"
  );

  await maybeRemovePath(recoveryPath);
  await maybeRemovePath(destProfilePath);
  sandbox.restore();
});

add_task(async function test_recover_overwrites_stale_selectable_prefs() {
  let sandbox = sinon.createSandbox();
  let preferencesBackupResource = new PreferencesBackupResource();

  let recoveryPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PreferencesBackupResource-recover-stale-test"
  );
  let destProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PreferencesBackupResource-dest-stale-test"
  );

  const STALE_STORE_ID = "stale-old-store-id";
  const CORRECT_STORE_ID = "correct-new-store-id";

  // Create a backup prefs.js with stale selectable profile prefs
  await IOUtils.writeUTF8(
    PathUtils.join(recoveryPath, "prefs.js"),
    `user_pref("${STORE_ID_PREF}", "${STALE_STORE_ID}");\n` +
      `user_pref("browser.profiles.enabled", false);\n` +
      `user_pref("some.user.pref", "user-value");\n`
  );

  sandbox
    .stub(lazy.SelectableProfileService, "currentProfile")
    .value({ id: 1 });

  sandbox.stub(lazy.SelectableProfileService, "getDBPref").resolves(true);
  sandbox
    .stub(lazy.SelectableProfileService, "flushSharedPrefToDatabase")
    .resolves();

  sandbox
    .stub(lazy.SelectableProfileService, "addSelectableProfilePrefs")
    .callsFake(async profileDirPath => {
      const prefs = [
        `user_pref("browser.profiles.enabled", true);`,
        `user_pref("browser.profiles.created", true);`,
        `user_pref("${STORE_ID_PREF}", "${CORRECT_STORE_ID}");`,
      ];
      await IOUtils.writeUTF8(
        PathUtils.join(profileDirPath, "prefs.js"),
        prefs.join("\n") + "\n",
        { mode: "appendOrCreate" }
      );
    });

  await preferencesBackupResource.recover(
    { profilePath: "/some/original/path" },
    recoveryPath,
    destProfilePath
  );

  let prefsContent = await IOUtils.readUTF8(
    PathUtils.join(destProfilePath, "prefs.js")
  );

  // Verify both stale and correct storeID appear (stale from backup, correct appended)
  Assert.ok(
    prefsContent.includes(
      `user_pref("${STORE_ID_PREF}", "${STALE_STORE_ID}");`
    ),
    "prefs.js should still contain the stale storeID from backup"
  );
  Assert.ok(
    prefsContent.includes(
      `user_pref("${STORE_ID_PREF}", "${CORRECT_STORE_ID}");`
    ),
    "prefs.js should contain the correct storeID appended at the end"
  );

  // Verify the correct storeID appears AFTER the stale one - the last pref value is the one
  // that will be set!
  let staleIndex = prefsContent.indexOf(
    `user_pref("${STORE_ID_PREF}", "${STALE_STORE_ID}");`
  );
  let correctIndex = prefsContent.indexOf(
    `user_pref("${STORE_ID_PREF}", "${CORRECT_STORE_ID}");`
  );
  Assert.greater(
    correctIndex,
    staleIndex,
    "The correct storeID should appear after the stale one so it takes precedence"
  );

  // Verify user prefs from backup are preserved
  Assert.ok(
    prefsContent.includes('user_pref("some.user.pref", "user-value");'),
    "User prefs from backup should be preserved"
  );

  // Verify the corrected browser.profiles.enabled appears after the stale one
  let staleEnabledIndex = prefsContent.indexOf(
    'user_pref("browser.profiles.enabled", false);'
  );
  let correctEnabledIndex = prefsContent.indexOf(
    'user_pref("browser.profiles.enabled", true);'
  );
  Assert.greater(
    correctEnabledIndex,
    staleEnabledIndex,
    "The correct browser.profiles.enabled should appear after the stale one"
  );

  await maybeRemovePath(recoveryPath);
  await maybeRemovePath(destProfilePath);
  sandbox.restore();
});

/**
 * Test that recovering into a selectable profile uses the most restrictive
 * data collection settings between the backup and the profile group.
 */
add_task(async function test_recover_data_collection_prefs_most_restrictive() {
  let sandbox = sinon.createSandbox();
  let preferencesBackupResource = new PreferencesBackupResource();

  let recoveryPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PreferencesBackupResource-data-collection-test"
  );
  let destProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PreferencesBackupResource-dest-data-collection-test"
  );

  // Set initial values - we'll verify these change (or don't) based on backup vs group
  Services.prefs.setBoolPref("browser.discovery.enabled", true);
  Services.prefs.setBoolPref("datareporting.healthreport.uploadEnabled", false);
  Services.prefs.setBoolPref("app.shield.optoutstudies.enabled", true);

  // Get default for a pref we'll omit from backup to test the default fallback
  const defaults = Services.prefs.getDefaultBranch(null);
  const usageUploadDefault = defaults.getBoolPref(
    "datareporting.usage.uploadEnabled",
    false
  );
  Services.prefs.clearUserPref("datareporting.usage.uploadEnabled");

  // Create backup prefs.js - note datareporting.usage.uploadEnabled is missing
  await IOUtils.writeUTF8(
    PathUtils.join(recoveryPath, "prefs.js"),
    `user_pref("browser.discovery.enabled", false);\n` +
      `user_pref("datareporting.healthreport.uploadEnabled", true);\n` +
      `user_pref("app.shield.optoutstudies.enabled", true);\n`
  );

  sandbox
    .stub(lazy.SelectableProfileService, "currentProfile")
    .value({ id: 1 });

  // Group has all data collection prefs ENABLED
  sandbox.stub(lazy.SelectableProfileService, "getDBPref").resolves(true);

  sandbox
    .stub(lazy.SelectableProfileService, "flushSharedPrefToDatabase")
    .resolves();

  sandbox
    .stub(lazy.SelectableProfileService, "addSelectableProfilePrefs")
    .resolves();

  await preferencesBackupResource.recover(
    { profilePath: "/some/original/path" },
    recoveryPath,
    destProfilePath
  );

  // backup=false, group=true -> set to false (most restrictive)
  Assert.equal(
    Services.prefs.getBoolPref("browser.discovery.enabled"),
    false,
    "browser.discovery.enabled: backup=false, group=true -> false"
  );

  // backup=true, group=true -> no change needed (both enabled)
  Assert.equal(
    Services.prefs.getBoolPref("datareporting.healthreport.uploadEnabled"),
    false,
    "datareporting.healthreport.uploadEnabled: backup=true, group=false -> false"
  );

  Assert.equal(
    Services.prefs.getBoolPref("app.shield.optoutstudies.enabled"),
    true,
    "app.shield.optoutstudies.enabled: backup=true, group=true -> stays true"
  );

  // backup=missing, group=true -> uses default value
  Assert.equal(
    Services.prefs.getBoolPref("datareporting.usage.uploadEnabled"),
    usageUploadDefault,
    "datareporting.usage.uploadEnabled: backup=missing -> uses default"
  );

  Assert.ok(
    lazy.SelectableProfileService.addSelectableProfilePrefs.calledOnceWith(
      destProfilePath
    ),
    "addSelectableProfilePrefs should be called with destProfilePath"
  );

  // Clean up prefs set during test
  Services.prefs.clearUserPref("browser.discovery.enabled");
  Services.prefs.clearUserPref("datareporting.healthreport.uploadEnabled");
  Services.prefs.clearUserPref("app.shield.optoutstudies.enabled");
  Services.prefs.clearUserPref("datareporting.usage.uploadEnabled");

  await maybeRemovePath(recoveryPath);
  await maybeRemovePath(destProfilePath);
  sandbox.restore();
});
