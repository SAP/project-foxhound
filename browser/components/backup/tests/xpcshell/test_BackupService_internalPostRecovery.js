/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let testBackupDirPath;
let recoveredProfilePath;

add_setup(async function () {
  setupProfile();

  testBackupDirPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "internalPostRecoveryBackup"
  );
  recoveredProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "internalPostRecoveryRestore"
  );
  registerCleanupFunction(async () => {
    await IOUtils.remove(testBackupDirPath, { recursive: true });
    await IOUtils.remove(recoveredProfilePath, { recursive: true });
  });
});

add_task(async function test_internal_post_recovery() {
  let bs = new BackupService({});

  const testBackupPath = (
    await bs.createBackup({ profilePath: testBackupDirPath })
  ).archivePath;

  await bs.getBackupFileInfo(testBackupPath);
  const restoreID = bs.state.restoreID;
  const expectedRestoreAttributes = {
    is_restored: true,
    backup_timestamp: new Date(bs.state.backupFileInfo.date).getTime(),
    backup_app_name: bs.state.backupFileInfo.appName,
    backup_app_version: bs.state.backupFileInfo.appVersion,
    backup_build_id: bs.state.backupFileInfo.buildID,
    backup_os_name: bs.state.backupFileInfo.osName,
    backup_os_version: bs.state.backupFileInfo.osVersion,
    backup_legacy_client_id: bs.state.backupFileInfo.legacyClientID,
  };

  await bs.recoverFromBackupArchive(
    testBackupPath,
    null,
    false,
    testBackupDirPath,
    recoveredProfilePath,
    true
  );

  // Intercept the telemetry that we want to check for before it gets submitted
  // and cleared out.
  let restoredProfileLaunchedEvents;
  let telemetrySetCallback = () => {
    Services.obs.removeObserver(
      telemetrySetCallback,
      "browser-backup-restored-profile-telemetry-set"
    );
    restoredProfileLaunchedEvents =
      Glean.browserBackup.restoredProfileLaunched.testGetValue();
  };
  Services.obs.addObserver(
    telemetrySetCallback,
    "browser-backup-restored-profile-telemetry-set"
  );

  // Simulate the browser starting up into this profile
  Services.prefs.setIntPref(
    "browser.backup.profile-restoration-date",
    Math.round(Date.now() / 1000)
  );
  bs = new BackupService({});
  await bs.checkForPostRecovery(recoveredProfilePath);

  Assert.equal(
    restoredProfileLaunchedEvents.length,
    1,
    "Should be a single restore profile launch event after we launch a restored profile"
  );
  Assert.deepEqual(
    restoredProfileLaunchedEvents[0].extra,
    { restore_id: restoreID },
    "Restore profile launch event should have the right data"
  );

  Assert.deepEqual(
    Glean.browserBackup.restoredProfileData.testGetValue(),
    expectedRestoreAttributes
  );
});
