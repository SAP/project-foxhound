/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PASSWORD = "This is some test password.";
const TEST_PASSWORD_ALT = "mozilla.org";

/**
 * Creates a backup with this backup service and checks whether it can be
 * decrypted with the given password. This ensures that encryption is
 * enabled/disabled as needed, and that the backup service will actually use
 * the given password if applicable.
 *
 * @param {BackupService} bs
 *   The BackupService to use.
 * @param {string} profilePath
 *   The path to the current profile.
 * @param {string?} password
 *   The expected password, or null if it should not be encrypted.
 * @returns {boolean}
 *   True if the password matched, false if something went wrong.
 */
async function backupServiceUsesPassword(bs, profilePath, password = null) {
  try {
    const backup = await bs.createBackup({ profilePath });
    let dest = await IOUtils.createUniqueFile(
      PathUtils.parent(backup.archivePath),
      "extracted-" + PathUtils.filename(backup.archivePath)
    );

    let { isEncrypted } = await bs.sampleArchive(backup.archivePath);
    let shouldBeEncrypted = password != null;
    Assert.equal(
      isEncrypted,
      shouldBeEncrypted,
      `Archive is ${shouldBeEncrypted ? "" : "not "}encrypted`
    );

    // This should throw if the password is incorrect.
    await bs.extractCompressedSnapshotFromArchive(
      backup.archivePath,
      dest,
      password
    );

    await IOUtils.remove(backup.archivePath);
    await IOUtils.remove(dest);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

add_setup(async () => {
  // Much of this setup is copied from toolkit/profile/xpcshell/head.js. It is
  // needed in order to put the xpcshell test environment into the state where
  // it thinks its profile is the one pointed at by
  // nsIToolkitProfileService.currentProfile.
  let gProfD = do_get_profile();
  let gDataHome = gProfD.clone();
  gDataHome.append("data");
  gDataHome.createUnique(Ci.nsIFile.DIRECTORY_TYPE, 0o755);
  let gDataHomeLocal = gProfD.clone();
  gDataHomeLocal.append("local");
  gDataHomeLocal.createUnique(Ci.nsIFile.DIRECTORY_TYPE, 0o755);

  let xreDirProvider = Cc["@mozilla.org/xre/directory-provider;1"].getService(
    Ci.nsIXREDirProvider
  );
  xreDirProvider.setUserDataDirectory(gDataHome, false);
  xreDirProvider.setUserDataDirectory(gDataHomeLocal, true);

  let profileSvc = Cc["@mozilla.org/toolkit/profile-service;1"].getService(
    Ci.nsIToolkitProfileService
  );

  let createdProfile = {};
  let didCreate = profileSvc.selectStartupProfile(
    ["xpcshell"],
    false,
    AppConstants.UPDATE_CHANNEL,
    "",
    {},
    {},
    createdProfile
  );
  Assert.ok(didCreate, "Created a testing profile and set it to current.");
  Assert.equal(
    profileSvc.currentProfile,
    createdProfile.value,
    "Profile set to current"
  );
});

/**
 * Tests that if encryption is disabled that only BackupResource's with
 * requiresEncryption set to `false` will have `backup()` called on them.
 */
add_task(async function test_disabled_encryption() {
  let sandbox = sinon.createSandbox();

  let bs = new BackupService({
    FakeBackupResource1,
    FakeBackupResource2,
    FakeBackupResource3,
  });

  Assert.ok(
    !bs.state.encryptionEnabled,
    "State should indicate that encryption is disabled."
  );

  let testProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "testDisabledEncryption"
  );
  let encState = await bs.loadEncryptionState(testProfilePath);
  Assert.ok(!encState, "Should not find an ArchiveEncryptionState.");

  // Override FakeBackupResource2 so that it requires encryption.
  sandbox.stub(FakeBackupResource2, "requiresEncryption").get(() => {
    return true;
  });
  Assert.ok(
    FakeBackupResource2.requiresEncryption,
    "FakeBackupResource2 requires encryption."
  );

  // This is how these FakeBackupResource's are defined in head.js
  Assert.ok(
    !FakeBackupResource1.requiresEncryption,
    "FakeBackupResource1 does not require encryption."
  );
  Assert.ok(
    !FakeBackupResource3.requiresEncryption,
    "FakeBackupResource3 does not require encryption."
  );

  let resourceWithoutEncryptionStubs = [
    sandbox.stub(FakeBackupResource1.prototype, "backup").resolves(null),
    sandbox.stub(FakeBackupResource3.prototype, "backup").resolves(null),
  ];

  let resourceWithEncryptionStub = sandbox
    .stub(FakeBackupResource2.prototype, "backup")
    .resolves(null);

  await bs.createBackup({ profilePath: testProfilePath });
  Assert.ok(
    resourceWithEncryptionStub.notCalled,
    "FakeBackupResource2.backup should not have been called"
  );

  for (let resourceWithoutEncryptionStub of resourceWithoutEncryptionStubs) {
    Assert.ok(
      resourceWithoutEncryptionStub.calledOnce,
      "backup called on resource that didn't require encryption"
    );
  }

  await IOUtils.remove(testProfilePath, { recursive: true });
  sandbox.restore();
});

/**
 * Tests that if encryption is enabled from a non-enabled state, that an
 * ArchiveEncryptionState is created, and state is written to the profile
 * directory. Also tests that this allows BackupResource's with
 * requiresEncryption set to `true` to have `backup()` called on them.
 */
add_task(async function test_enable_encryption() {
  let sandbox = sinon.createSandbox();

  let bs = new BackupService({
    FakeBackupResource1,
    FakeBackupResource2,
    FakeBackupResource3,
  });

  Assert.ok(
    !bs.state.encryptionEnabled,
    "State should initially indicate that encryption is disabled."
  );

  let testProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "testEnableEncryption"
  );
  let encState = await bs.loadEncryptionState(testProfilePath);
  Assert.ok(!encState, "Should not find an ArchiveEncryptionState.");

  // Now enable encryption.
  let stateUpdatePromise = new Promise(resolve => {
    bs.addEventListener("BackupService:StateUpdate", resolve, { once: true });
  });
  await bs.enableEncryption(TEST_PASSWORD, testProfilePath);
  await stateUpdatePromise;
  Assert.ok(
    bs.state.encryptionEnabled,
    "State should indicate that encryption is enabled."
  );

  Assert.ok(
    await IOUtils.exists(
      PathUtils.join(
        testProfilePath,
        BackupService.PROFILE_FOLDER_NAME,
        BackupService.ARCHIVE_ENCRYPTION_STATE_FILE
      )
    ),
    "Encryption state file should exist."
  );

  // Override FakeBackupResource2 so that it requires encryption.
  sandbox.stub(FakeBackupResource2, "requiresEncryption").get(() => {
    return true;
  });
  Assert.ok(
    FakeBackupResource2.requiresEncryption,
    "FakeBackupResource2 requires encryption."
  );

  // This is how these FakeBackupResource's are defined in head.js
  Assert.ok(
    !FakeBackupResource1.requiresEncryption,
    "FakeBackupResource1 does not require encryption."
  );
  Assert.ok(
    !FakeBackupResource3.requiresEncryption,
    "FakeBackupResource3 does not require encryption."
  );

  let allResourceBackupStubs = [
    sandbox.stub(FakeBackupResource1.prototype, "backup").resolves(null),
    sandbox.stub(FakeBackupResource3.prototype, "backup").resolves(null),
    sandbox.stub(FakeBackupResource2.prototype, "backup").resolves(null),
  ];

  await bs.createBackup({
    profilePath: testProfilePath,
  });

  for (let resourceBackupStub of allResourceBackupStubs) {
    Assert.ok(resourceBackupStub.calledOnce, "backup called on resource");
  }

  Assert.ok(
    await IOUtils.exists(
      PathUtils.join(
        testProfilePath,
        BackupService.PROFILE_FOLDER_NAME,
        BackupService.ARCHIVE_ENCRYPTION_STATE_FILE
      )
    ),
    "Encryption state file should still exist."
  );

  await IOUtils.remove(testProfilePath, { recursive: true });
  sandbox.restore();
});

/**
 * Tests that enabling encryption while it is already enabled changes the
 * password.
 */
add_task(async function test_change_encryption_password() {
  let bs = new BackupService();

  let testProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "testAlreadyEnabledEncryption"
  );

  // Enable encryption.
  await bs.enableEncryption(TEST_PASSWORD, testProfilePath);

  let encState = await bs.loadEncryptionState(testProfilePath);
  Assert.ok(encState, "ArchiveEncryptionState is available.");
  Assert.ok(
    await backupServiceUsesPassword(bs, testProfilePath, TEST_PASSWORD),
    "BackupService is using TEST_PASSWORD"
  );

  // Change the password.
  await bs.enableEncryption(TEST_PASSWORD_ALT, testProfilePath);
  encState = await bs.loadEncryptionState(testProfilePath);
  Assert.ok(encState, "ArchiveEncryptionState is still available.");
  Assert.ok(
    await backupServiceUsesPassword(bs, testProfilePath, TEST_PASSWORD_ALT),
    "BackupService is using TEST_PASSWORD_ALT"
  );

  await IOUtils.remove(testProfilePath, { recursive: true });
});

/**
 * Tests that if encryption is enabled that it can be disabled.
 */
add_task(async function test_disabling_encryption() {
  let bs = new BackupService();

  let testProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "testDisableEncryption"
  );

  // Enable encryption.
  await bs.enableEncryption(TEST_PASSWORD, testProfilePath);

  let encState = await bs.loadEncryptionState(testProfilePath);
  Assert.ok(encState, "ArchiveEncryptionState is available.");
  Assert.ok(
    bs.state.encryptionEnabled,
    "State should indicate that encryption is enabled."
  );

  Assert.ok(
    await IOUtils.exists(
      PathUtils.join(
        testProfilePath,
        BackupService.PROFILE_FOLDER_NAME,
        BackupService.ARCHIVE_ENCRYPTION_STATE_FILE
      )
    ),
    "Encryption state file should exist."
  );

  // Now disable encryption.
  let stateUpdatePromise = new Promise(resolve => {
    bs.addEventListener("BackupService:StateUpdate", resolve, { once: true });
  });
  await bs.disableEncryption(testProfilePath);
  await stateUpdatePromise;
  Assert.ok(
    !bs.state.encryptionEnabled,
    "State should indicate that encryption is now disabled."
  );

  Assert.ok(
    !(await IOUtils.exists(
      PathUtils.join(
        testProfilePath,
        BackupService.PROFILE_FOLDER_NAME,
        BackupService.ARCHIVE_ENCRYPTION_STATE_FILE
      )
    )),
    "Encryption state file should have been removed."
  );
  Assert.ok(
    await backupServiceUsesPassword(bs, testProfilePath, null),
    "BackupService should not use encryption."
  );

  await IOUtils.remove(testProfilePath, { recursive: true });
});
