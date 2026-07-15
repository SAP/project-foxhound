/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ERRORS: "chrome://browser/content/backup/backup-constants.mjs",
});

let bs;
const correctPassword = "correcthorsebatterystaple";
const incorrectPassword = "Tr0ub4dor&3";
let testBackupDirPath;
let testBackupPath;

add_setup(async function () {
  setupProfile();

  bs = new BackupService({ FakeBackupResource1 });
  let sandbox = sinon.createSandbox();
  let fakeManifestEntry = { fake: "test" };
  sandbox
    .stub(FakeBackupResource1.prototype, "backup")
    .resolves(fakeManifestEntry);
  sandbox.stub(FakeBackupResource1.prototype, "recover").resolves();

  testBackupDirPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "wrongPasswordTestBackup"
  );
  bs = new BackupService({ FakeBackupResource1 });
  await bs.enableEncryption(correctPassword);
  testBackupPath = (await bs.createBackup({ profilePath: testBackupDirPath }))
    .archivePath;

  registerCleanupFunction(async () => {
    sandbox.restore();
    bs = null;

    await IOUtils.remove(testBackupDirPath, { recursive: true });
  });
});

/**
 * Tests the case where the wrong password is given when trying to restore from
 * a backup.
 *
 * @param  {string|null} passwordToUse
 *         The password to decrypt with, or `null` to specify no password.
 */
async function testWrongPassword(passwordToUse) {
  Services.fog.testResetFOG();

  Assert.ok(await IOUtils.exists(testBackupPath), "The backup file exists");

  let recoveredProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "wrongPasswordTestRecoveredProfile"
  );
  registerCleanupFunction(async () => {
    await IOUtils.remove(recoveredProfilePath, { recursive: true });
  });

  await bs.getBackupFileInfo(testBackupPath);
  const restoreID = bs.state.restoreID;

  await Assert.rejects(
    bs.recoverFromBackupArchive(
      testBackupPath,
      passwordToUse,
      false,
      testBackupDirPath,
      recoveredProfilePath,
      true
    ),
    err => err.cause == ERRORS.UNAUTHORIZED
  );

  let events = Glean.browserBackup.restoreStarted.testGetValue();
  Assert.equal(
    events.length,
    1,
    "Should be a single restore started event after we start restoring a profile"
  );
  Assert.equal(
    events[0].extra.restore_id,
    restoreID,
    "Restore started event should have the right restore_id"
  );
  Assert.equal(
    events[0].extra.replace,
    "true",
    "Restore started event should have replace=true"
  );

  events = Glean.browserBackup.restoreFailed.testGetValue();
  Assert.equal(
    events.length,
    1,
    "Should be a single restore failed event after we fail to restore a profile"
  );
  Assert.equal(
    events[0].extra.restore_id,
    restoreID,
    "Restore failure event should have the right restore_id"
  );
  Assert.equal(
    events[0].extra.error_type,
    "UNAUTHORIZED",
    "Restore failure event should have UNAUTHORIZED error_type"
  );
  Assert.equal(
    events[0].extra.error_detail,
    "",
    "Restore failure event should have empty error_detail"
  );
  Assert.equal(
    events[0].extra.restore_step,
    "EXTRACT_SNAPSHOT",
    "Restore failure event should have EXTRACT_SNAPSHOT restore_step"
  );
}

add_task(async function test_wrong_password() {
  await testWrongPassword(incorrectPassword);
});

add_task(async function test_no_password() {
  await testWrongPassword(null);
});
