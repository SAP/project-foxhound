/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { BackupService } = ChromeUtils.importESModule(
  "resource:///modules/backup/BackupService.sys.mjs"
);

const execProcess = sinon.fake();

add_setup(async () => {
  await initSelectableProfileService();

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

  let copiedProfile =
    await SelectableProfileService.currentProfile.copyProfile();

  encState = await backupServiceInstance.loadEncryptionState(
    SelectableProfileService.currentProfile.path
  );
  Assert.ok(!encState, "No encryption state after copyProfile called");

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
    SelectableProfileService.currentProfile.path.path
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
