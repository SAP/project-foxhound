/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  BackupError: "resource:///modules/backup/BackupError.mjs",
  ERRORS: "chrome://browser/content/backup/backup-constants.mjs",
  AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
});

add_setup(function () {
  setupProfile();
});

/**
 * Test's the case where a resource fails to recover successfully. We expect
 * the complete recover process to error out.
 */
add_task(async function testResourceFailure() {
  let sandbox = sinon.createSandbox();
  registerCleanupFunction(() => {
    sandbox.restore();
  });

  let testBackupPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "checkForErrorsTestBackup"
  );

  let fake1ManifestEntry = { fake1: "hello from 1" };
  sandbox
    .stub(FakeBackupResource1.prototype, "backup")
    .resolves(fake1ManifestEntry);
  sandbox.stub(FakeBackupResource1.prototype, "recover").resolves();

  let fake2ManifestEntry = { fake1: "hello from 2" };
  sandbox
    .stub(FakeBackupResource2.prototype, "backup")
    .resolves(fake2ManifestEntry);
  sandbox
    .stub(FakeBackupResource2.prototype, "recover")
    .rejects(new BackupError("recovery failed", ERRORS.RECOVERY_FAILED));

  let fake3ManifestEntry = { fake1: "hello from 3" };
  sandbox
    .stub(FakeBackupResource3.prototype, "backup")
    .resolves(fake3ManifestEntry);
  sandbox.stub(FakeBackupResource3.prototype, "recover").resolves();

  let bs = new BackupService({
    FakeBackupResource1,
    FakeBackupResource2,
    FakeBackupResource3,
  });

  let { manifest, archivePath: backupFilePath } = await bs.createBackup({
    profilePath: testBackupPath,
  });
  Assert.ok(await IOUtils.exists(backupFilePath), "The backup file exists");

  let archiveDateSuffix = bs.generateArchiveDateSuffix(
    new Date(manifest.meta.date)
  );

  // We also expect the HTML file to have been written to the folder pointed
  // at by browser.backups.location, within backupDirPath folder.
  const EXPECTED_ARCHIVE_PATH = PathUtils.join(
    bs.state.backupDirPath,
    `${BackupService.BACKUP_FILE_NAME}_${manifest.meta.profileName}_${archiveDateSuffix}.html`
  );
  Assert.ok(
    await IOUtils.exists(EXPECTED_ARCHIVE_PATH),
    "Single-file backup archive was written."
  );
  Assert.equal(
    backupFilePath,
    EXPECTED_ARCHIVE_PATH,
    "Backup was written to the configured destination folder"
  );
  Assert.deepEqual(
    Object.keys(manifest.resources).sort(),
    ["fake1", "fake2", "fake3"],
    "Manifest contains all expected BackupResource keys"
  );

  let recoveredProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "createBackupTestRecoveredProfile"
  );

  await Assert.rejects(
    bs.recoverFromBackupArchive(
      backupFilePath,
      null,
      false,
      testBackupPath,
      recoveredProfilePath,
      true
    ),
    err => err.cause == ERRORS.RECOVERY_FAILED
  );

  // Since we fail on backupResource2, backupResource1 should never be called
  sinon.assert.notCalled(FakeBackupResource1.prototype.recover);

  // Ideally, we should be removing any left over data when we fail.
  // The current behavior does not do this, so let's clear the paths
  // manually in the test.
  await maybeRemovePath(backupFilePath);
  await maybeRemovePath(testBackupPath);
  await maybeRemovePath(recoveredProfilePath);
});
