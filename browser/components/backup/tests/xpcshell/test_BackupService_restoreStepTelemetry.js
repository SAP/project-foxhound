/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  BackupError: "resource:///modules/backup/BackupError.mjs",
  ERRORS: "chrome://browser/content/backup/backup-constants.mjs",
  RESTORE_STEPS: "chrome://browser/content/backup/backup-constants.mjs",
});

let bs;
let testBackupDirPath;
let testBackupPath;

add_setup(async function () {
  setupProfile();

  let sandbox = sinon.createSandbox();
  let fakeManifestEntry = { fake: "test" };
  sandbox
    .stub(FakeBackupResource1.prototype, "backup")
    .resolves(fakeManifestEntry);
  sandbox.stub(FakeBackupResource1.prototype, "recover").resolves();

  testBackupDirPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "restoreStepTelemetryBackup"
  );
  bs = new BackupService({ FakeBackupResource1 });
  testBackupPath = (await bs.createBackup({ profilePath: testBackupDirPath }))
    .archivePath;

  registerCleanupFunction(async () => {
    sandbox.restore();
    bs = null;
    await IOUtils.remove(testBackupDirPath, {
      recursive: true,
      ignoreAbsent: true,
    });
  });
});

/**
 * Tests that a decompression failure records DECOMPRESS as the restore_step.
 * We stub decompressRecoveryFile to throw a DECOMPRESSION_FAILED error.
 */
add_task(async function test_decompress_failure_step() {
  Services.fog.testResetFOG();

  let sandbox = sinon.createSandbox();

  let recoveredProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "decompressFailRecoveredProfile"
  );

  try {
    sandbox
      .stub(bs, "decompressRecoveryFile")
      .rejects(
        new BackupError("Decompression failed", ERRORS.DECOMPRESSION_FAILED)
      );

    await bs.getBackupFileInfo(testBackupPath);
    const restoreID = bs.state.restoreID;

    await Assert.rejects(
      bs.recoverFromBackupArchive(
        testBackupPath,
        null,
        false,
        testBackupDirPath,
        recoveredProfilePath,
        true
      ),
      err => err.cause == ERRORS.DECOMPRESSION_FAILED
    );

    let events = Glean.browserBackup.restoreFailed.testGetValue();
    Assert.equal(events.length, 1, "Should have one restore failed event");
    Assert.equal(
      events[0].extra.restore_id,
      restoreID,
      "Should have correct restore_id"
    );
    Assert.equal(
      events[0].extra.error_type,
      "DECOMPRESSION_FAILED",
      "Should have DECOMPRESSION_FAILED error_type"
    );
    Assert.equal(
      events[0].extra.restore_step,
      "DECOMPRESS",
      "Should have DECOMPRESS restore_step"
    );
    Assert.ok(events[0].extra.backup_version, "Should have backup_version");
    Assert.ok(events[0].extra.backup_os_name, "Should have backup_os_name");
    Assert.ok(
      events[0].extra.backup_os_version,
      "Should have backup_os_version"
    );
    Assert.equal(
      typeof events[0].extra.backup_os_build_number,
      "string",
      "Should have backup_os_build_number as string"
    );
  } finally {
    sandbox.restore();
    await IOUtils.remove(recoveredProfilePath, {
      recursive: true,
      ignoreAbsent: true,
    });
  }
});

/**
 * Tests that an invalid manifest records READ_MANIFEST as the restore_step.
 * We stub extractCompressedSnapshotFromArchive and decompressRecoveryFile to
 * succeed, then create a recovery folder with an invalid manifest.
 */
add_task(async function test_read_manifest_failure_step() {
  Services.fog.testResetFOG();

  let sandbox = sinon.createSandbox();

  let recoveredProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "manifestFailRecoveredProfile"
  );

  const recoveryFolderPath = PathUtils.join(
    testBackupDirPath,
    BackupService.PROFILE_FOLDER_NAME,
    "recovery"
  );

  try {
    sandbox.stub(bs, "extractCompressedSnapshotFromArchive").resolves();
    sandbox.stub(bs, "decompressRecoveryFile").callsFake(async () => {
      await IOUtils.makeDirectory(recoveryFolderPath, {
        createAncestors: true,
      });
      await IOUtils.writeJSON(
        PathUtils.join(recoveryFolderPath, BackupService.MANIFEST_FILE_NAME),
        { invalid: "manifest" }
      );
    });

    await bs.getBackupFileInfo(testBackupPath);
    const restoreID = bs.state.restoreID;

    await Assert.rejects(
      bs.recoverFromBackupArchive(
        testBackupPath,
        null,
        false,
        testBackupDirPath,
        recoveredProfilePath,
        true
      ),
      err => err.cause == ERRORS.CORRUPTED_ARCHIVE
    );

    let events = Glean.browserBackup.restoreFailed.testGetValue();
    Assert.equal(events.length, 1, "Should have one restore failed event");
    Assert.equal(
      events[0].extra.restore_id,
      restoreID,
      "Should have correct restore_id"
    );
    Assert.equal(
      events[0].extra.error_type,
      "CORRUPTED_ARCHIVE",
      "Should have CORRUPTED_ARCHIVE error_type"
    );
    Assert.equal(
      events[0].extra.restore_step,
      "READ_MANIFEST",
      "Should have READ_MANIFEST restore_step"
    );
    Assert.ok(events[0].extra.backup_version, "Should have backup_version");
    Assert.ok(events[0].extra.backup_os_name, "Should have backup_os_name");
    Assert.ok(
      events[0].extra.backup_os_version,
      "Should have backup_os_version"
    );
    Assert.equal(
      typeof events[0].extra.backup_os_build_number,
      "string",
      "Should have backup_os_build_number as string"
    );
  } finally {
    sandbox.restore();
    await IOUtils.remove(recoveredProfilePath, {
      recursive: true,
      ignoreAbsent: true,
    });
    await IOUtils.remove(recoveryFolderPath, {
      recursive: true,
      ignoreAbsent: true,
    });
  }
});

/**
 * Tests that a profile creation failure inside recoverFromSnapshotFolder
 * propagates CREATE_PROFILE as the restore_step via the restoreStep property.
 */
add_task(async function test_profile_creation_failure_step() {
  Services.fog.testResetFOG();

  let sandbox = sinon.createSandbox();

  let recoveredProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "profileCreateFailRecoveredProfile"
  );

  try {
    let err = new BackupError(
      "Failed to create profile",
      ERRORS.PROFILE_CREATION_FAILED
    );
    err.restoreStep = RESTORE_STEPS.RESTORE_CREATE_PROFILE;
    sandbox.stub(bs, "recoverFromSnapshotFolder").rejects(err);
    sandbox
      .stub(bs, "recoverFromSnapshotFolderIntoSelectableProfile")
      .rejects(err);

    await bs.getBackupFileInfo(testBackupPath);
    const restoreID = bs.state.restoreID;

    await Assert.rejects(
      bs.recoverFromBackupArchive(
        testBackupPath,
        null,
        false,
        testBackupDirPath,
        recoveredProfilePath,
        true
      ),
      e => e.cause == ERRORS.PROFILE_CREATION_FAILED
    );

    let events = Glean.browserBackup.restoreFailed.testGetValue();
    Assert.equal(events.length, 1, "Should have one restore failed event");
    Assert.equal(
      events[0].extra.restore_id,
      restoreID,
      "Should have correct restore_id"
    );
    Assert.equal(
      events[0].extra.error_type,
      "PROFILE_CREATION_FAILED",
      "Should have PROFILE_CREATION_FAILED error_type"
    );
    Assert.equal(
      events[0].extra.restore_step,
      "CREATE_PROFILE",
      "Should have CREATE_PROFILE restore_step from inner function"
    );
  } finally {
    sandbox.restore();
    await IOUtils.remove(recoveredProfilePath, {
      recursive: true,
      ignoreAbsent: true,
    });
  }
});

/**
 * Tests that non-BackupError exceptions have their message captured in
 * error_detail (truncated to 100 characters).
 */
add_task(async function test_non_backup_error_detail() {
  Services.fog.testResetFOG();

  let sandbox = sinon.createSandbox();

  let recoveredProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "nonBackupErrorRecoveredProfile"
  );

  try {
    let genericError = new Error("Something unexpected happened in profile");
    sandbox.stub(bs, "recoverFromSnapshotFolder").rejects(genericError);
    sandbox
      .stub(bs, "recoverFromSnapshotFolderIntoSelectableProfile")
      .rejects(genericError);

    await bs.getBackupFileInfo(testBackupPath);

    await Assert.rejects(
      bs.recoverFromBackupArchive(
        testBackupPath,
        null,
        false,
        testBackupDirPath,
        recoveredProfilePath,
        true
      ),
      () => true
    );

    let events = Glean.browserBackup.restoreFailed.testGetValue();
    Assert.equal(events.length, 1, "Should have one restore failed event");
    Assert.equal(
      events[0].extra.error_type,
      "RECOVERY_FAILED",
      "Should have RECOVERY_FAILED for non-BackupError"
    );
    Assert.equal(
      events[0].extra.error_detail,
      "Something unexpected happened in profile",
      "Should capture error message in error_detail"
    );
  } finally {
    sandbox.restore();
    await IOUtils.remove(recoveredProfilePath, {
      recursive: true,
      ignoreAbsent: true,
    });
  }
});
