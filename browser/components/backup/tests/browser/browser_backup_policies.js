/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { EnterprisePolicyTesting, PoliciesPrefTracker } =
  ChromeUtils.importESModule(
    "resource://testing-common/EnterprisePolicyTesting.sys.mjs"
  );

function checkPrefs(
  expectedBackupServiceState,
  expectedArchiveEnabledState,
  expectedRestoreEnabledState
) {
  Assert.equal(
    Services.prefs.getBoolPref("browser.backup.enabled"),
    expectedBackupServiceState,
    `Backup Service state should match the expected state`
  );
  Assert.equal(
    Services.prefs.getBoolPref("browser.backup.archive.enabled"),
    expectedArchiveEnabledState,
    `Archive state should match the expected state`
  );
  Assert.equal(
    Services.prefs.getBoolPref("browser.backup.restore.enabled"),
    expectedRestoreEnabledState,
    `Restore state should match the expected state`
  );
}

add_setup(async () => {
  // let's set the prefs to a default so that we can see if the policies
  // adhere to the defaults when they aren't present
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.backup.enabled", false],
      ["browser.backup.archive.enabled", false],
      ["browser.backup.restore.enabled", true],
    ],
  });

  registerCleanupFunction(async () => {
    await SpecialPowers.popPrefEnv();
  });
});

add_task(async function test_backup_disabled_enterprise_policies() {
  PoliciesPrefTracker.start();
  await EnterprisePolicyTesting.setupPolicyEngineWithJson({
    policies: {
      BrowserDataBackup: false,
    },
  });

  checkPrefs(false, false, false);
  PoliciesPrefTracker.stop();
});

add_task(async function test_backup_archive_enabled_enterprise_policies() {
  PoliciesPrefTracker.start();
  await EnterprisePolicyTesting.setupPolicyEngineWithJson({
    policies: {
      BrowserDataBackup: {
        AllowBackup: true,
      },
    },
  });

  checkPrefs(true, true, true);
  PoliciesPrefTracker.stop();
});

add_task(async function test_backup_restore_enabled_enterprise_policies() {
  PoliciesPrefTracker.start();
  await EnterprisePolicyTesting.setupPolicyEngineWithJson({
    policies: {
      BrowserDataBackup: {
        AllowRestore: true,
      },
    },
  });

  checkPrefs(true, false, true);
  PoliciesPrefTracker.stop();
});

add_task(async function test_backup_service_disabled_enterprise_policies() {
  PoliciesPrefTracker.start();

  await SpecialPowers.pushPrefEnv({
    set: [["browser.backup.enabled", true]],
  });

  await EnterprisePolicyTesting.setupPolicyEngineWithJson({
    policies: {
      BrowserDataBackup: {
        AllowBackup: false,
        AllowRestore: false,
      },
    },
  });

  checkPrefs(false, false, false);
  PoliciesPrefTracker.stop();
});
