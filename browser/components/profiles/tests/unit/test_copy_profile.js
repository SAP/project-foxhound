/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { BackupService } = ChromeUtils.importESModule(
  "resource:///modules/backup/BackupService.sys.mjs"
);
const { ProfileAge } = ChromeUtils.importESModule(
  "resource://gre/modules/ProfileAge.sys.mjs"
);
const { OSKeyStoreTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/OSKeyStoreTestUtils.sys.mjs"
);
const { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);

const execProcess = sinon.fake();

add_setup(async () => {
  await initSelectableProfileService();

  // During our unit tests, we're not interested in showing OSKeyStore
  // authentication dialogs, nor are we interested in actually using the "real"
  // OSKeyStore. We instead swap in our own implementation of nsIOSKeyStore
  // which provides some stubbed out values. We also set up OSKeyStoreTestUtils
  // which will suppress any reauthentication dialogs.
  const fakeOSKeyStore = {
    asyncEncryptBytes: sinon.stub(),
    asyncDecryptBytes: sinon.stub(),
    asyncDeleteSecret: sinon.stub().resolves(),
    asyncSecretAvailable: sinon.stub().resolves(true),
    asyncGetRecoveryPhrase: sinon.stub().resolves("SomeRecoveryPhrase"),
    asyncRecoverSecret: sinon.stub().resolves(),
    QueryInterface: ChromeUtils.generateQI([Ci.nsIOSKeyStore]),
  };
  let osKeyStoreCID = MockRegistrar.register(
    "@mozilla.org/security/oskeystore;1",
    fakeOSKeyStore
  );

  OSKeyStoreTestUtils.setup();
  registerCleanupFunction(async () => {
    await OSKeyStoreTestUtils.cleanup();
    MockRegistrar.unregister(osKeyStoreCID);
  });

  sinon.replace(getSelectableProfileService(), "execProcess", execProcess);
});

add_task(async function test_copy_profile() {
  startProfileService();

  const SelectableProfileService = getSelectableProfileService();
  const ProfilesDatastoreService = getProfilesDatastoreService();

  await ProfilesDatastoreService.init();
  await SelectableProfileService.init();
  Assert.ok(SelectableProfileService.isEnabled, "Service should be enabled");

  let profiles = await SelectableProfileService.getAllProfiles();
  Assert.equal(profiles.length, 1, "Only one selectable profile exists");

  // Simulate creating a desktop shortcut.
  Services.prefs.setCharPref(
    "browser.profiles.shortcutFileName",
    "test-shortcut-name"
  );

  const backupServiceInstance = new BackupService();

  let encState = await backupServiceInstance.loadEncryptionState(
    SelectableProfileService.currentProfile.path
  );
  Assert.ok(!encState, "No encryption state before copyProfile called");
  let donorProfileAge = await ProfileAge();
  donorProfileAge._times.source = "profile-copy-test";
  await donorProfileAge.writeTimes();

  let copiedProfile =
    await SelectableProfileService.currentProfile.copyProfile();
  let copiedProfileAge = await ProfileAge(copiedProfile.path);

  encState = await backupServiceInstance.loadEncryptionState(
    SelectableProfileService.currentProfile.path
  );
  Assert.ok(!encState, "No encryption state after copyProfile called");

  // When the source profile had no encryption, the copied profile should not
  // have encryption enabled either (temporary encryption used during copy
  // should not persist).
  let copiedEncStateFile = PathUtils.join(
    copiedProfile.path,
    BackupService.PROFILE_FOLDER_NAME,
    BackupService.ARCHIVE_ENCRYPTION_STATE_FILE
  );
  Assert.ok(
    !(await IOUtils.exists(copiedEncStateFile)),
    "Copied profile should not have encryption state when source had no encryption"
  );

  profiles = await SelectableProfileService.getAllProfiles();
  Assert.equal(profiles.length, 2, "Two selectable profiles exist");

  Assert.equal(
    copiedProfile.avatar,
    SelectableProfileService.currentProfile.avatar,
    "Copied profile has the same avatar"
  );

  Assert.equal(
    copiedProfile.theme.themeId,
    SelectableProfileService.currentProfile.theme.themeId,
    "Copied profile has the same theme"
  );
  Assert.equal(
    copiedProfileAge.source,
    "copy",
    "Copied profile should use the correct source"
  );

  let prefsPath = PathUtils.join(copiedProfile.path, "prefs.js");
  let prefsFile = await IOUtils.readUTF8(prefsPath, { encoding: "utf-8" });
  Assert.equal(
    -1,
    prefsFile.search("browser.profiles.shortcutFileName"),
    "Copied profile should not have desktop shortcut pref"
  );
});

add_task(async function test_copy_profile_with_encryption() {
  startProfileService();

  const SelectableProfileService = getSelectableProfileService();
  const ProfilesDatastoreService = getProfilesDatastoreService();

  await ProfilesDatastoreService.init();
  await SelectableProfileService.init();
  Assert.ok(SelectableProfileService.isEnabled, "Service should be enabled");

  let profiles = await SelectableProfileService.getAllProfiles();
  Assert.equal(profiles.length, 2, "Only two selectable profiles exist");

  const backupServiceInstance = new BackupService();
  await backupServiceInstance.enableEncryption(
    "testCopyProfile",
    SelectableProfileService.currentProfile.path
  );

  let encState = await backupServiceInstance.loadEncryptionState(
    SelectableProfileService.currentProfile.path
  );
  Assert.ok(encState, "Encryption state exists before copyProfile called");

  let copiedProfile =
    await SelectableProfileService.currentProfile.copyProfile();

  encState = await backupServiceInstance.loadEncryptionState(
    SelectableProfileService.currentProfile.path
  );
  Assert.ok(encState, "Encryption state exists after copyProfile called");

  // Even when the source profile had encryption, the copied profile should
  // not inherit it - the user must opt into encryption for the new profile.
  let copiedEncStateFile = PathUtils.join(
    copiedProfile.path,
    BackupService.PROFILE_FOLDER_NAME,
    BackupService.ARCHIVE_ENCRYPTION_STATE_FILE
  );
  Assert.ok(
    !(await IOUtils.exists(copiedEncStateFile)),
    "Copied profile should not have encryption state even when source had encryption"
  );

  profiles = await SelectableProfileService.getAllProfiles();
  Assert.equal(profiles.length, 3, "Three selectable profiles exist");

  Assert.equal(
    copiedProfile.avatar,
    SelectableProfileService.currentProfile.avatar,
    "Copied profile has the same avatar"
  );

  Assert.equal(
    copiedProfile.theme.themeId,
    SelectableProfileService.currentProfile.theme.themeId,
    "Copied profile has the same theme"
  );
});
