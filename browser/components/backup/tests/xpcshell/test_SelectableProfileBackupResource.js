/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* import-globals-from ../../../../../toolkit/profile/test/xpcshell/head.js */

/* import-globals-from ../../../profiles/tests/unit/head.js */

const { SelectableProfileBackupResource } = ChromeUtils.importESModule(
  "resource:///modules/backup/SelectableProfileBackupResource.sys.mjs"
);
const { ProfilesDatastoreService } = ChromeUtils.importESModule(
  "moz-src:///toolkit/profile/ProfilesDatastoreService.sys.mjs"
);

const SELECTABLE_PROFILE_STAGING_FOLDER_NAME = "selectable_profile_metadata";
const SELECTABLE_PROFILE_METADATA_FILE_NAME = "profile_metadata.json";

add_setup(async function () {
  await initSelectableProfileService();
});

/**
 * Tests backup and recover of profile metadata with a default avatar.
 */
add_task(async function test_backup_and_recover_with_default_avatar() {
  let sandbox = sinon.createSandbox();

  const SelectableProfileService = getSelectableProfileService();
  sandbox
    .stub(SelectableProfileService, "getAllProfiles")
    .returns([{ id: 202, name: "Profile 1" }]);

  let originalProfile = SelectableProfileService.currentProfile;

  // Set up the original profile with test data
  originalProfile.name = "Original Profile";
  await originalProfile.setAvatar("book");
  await updateNotified();

  let stagingPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "SelectableProfileBackupResource-staging-test"
  );

  // Backup the original profile
  let resource = new SelectableProfileBackupResource();
  let manifestEntry = await resource.backup(stagingPath, originalProfile.path);

  Assert.equal(manifestEntry, null, "Should return null manifest entry");

  // Verify backup files exist
  let metadataPath = PathUtils.join(
    stagingPath,
    SELECTABLE_PROFILE_STAGING_FOLDER_NAME,
    SELECTABLE_PROFILE_METADATA_FILE_NAME
  );
  Assert.ok(await IOUtils.exists(metadataPath), "Metadata file should exist");

  let metadata = await IOUtils.readJSON(metadataPath);
  Assert.equal(
    metadata.name,
    "Original Profile",
    "Backed up name should match"
  );
  Assert.equal(metadata.avatar, "book", "Backed up avatar should match");
  Assert.ok(metadata.theme, "Theme should be present");

  // Create a second profile to recover into
  let targetProfile = await createTestProfile({ name: "Target Profile" });

  // Modify target profile to have different data before recovery
  targetProfile.name = "Target Profile Before Recovery";
  await targetProfile.setAvatar("star");
  await updateNotified();

  Assert.equal(targetProfile.name, "Target Profile Before Recovery");
  Assert.equal(targetProfile.avatar, "star");

  // Recover into the target profile
  let postRecoveryEntry = await resource.recover(
    null,
    stagingPath,
    targetProfile.path
  );

  // Let's refetch the profile to get the most up to date information
  targetProfile = await SelectableProfileService.getProfile(targetProfile.id);

  Assert.equal(
    postRecoveryEntry,
    null,
    "Should return null as post recovery entry"
  );

  // Verify the target profile now has the original profile's data
  Assert.equal(
    targetProfile.name,
    originalProfile.name,
    "Recovered profile name should match original"
  );
  Assert.equal(
    targetProfile.avatar,
    originalProfile.avatar,
    "Recovered profile avatar should match original"
  );
  Assert.deepEqual(
    targetProfile.theme,
    originalProfile.theme,
    "Recovered profile theme should match original"
  );

  await maybeRemovePath(stagingPath);
  sandbox.restore();
});

/**
 * Tests backup and recover of profile metadata with a custom avatar.
 */
add_task(async function test_backup_and_recover_with_custom_avatar() {
  let sandbox = sinon.createSandbox();

  const SelectableProfileService = getSelectableProfileService();
  sandbox
    .stub(SelectableProfileService, "getAllProfiles")
    .returns([{ id: 202, name: "Profile 1" }]);

  let originalProfile = SelectableProfileService.currentProfile;

  // Set up the original profile with a custom avatar
  originalProfile.name = "Custom Avatar Profile";

  let testAvatarPath = do_get_file("data/fake_avatar.png").path;
  let avatarFile = await File.createFromFileName(testAvatarPath);
  await originalProfile.setAvatar(avatarFile);
  await updateNotified();

  Assert.ok(
    originalProfile.hasCustomAvatar,
    "Original should have custom avatar"
  );
  let originalAvatarName = originalProfile.avatar;

  let stagingPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "SelectableProfileBackupResource-staging-test"
  );

  // Backup the original profile
  let resource = new SelectableProfileBackupResource();
  let manifestEntry = await resource.backup(stagingPath, originalProfile.path);

  Assert.equal(manifestEntry, null, "Should return null manifest entry");

  // Verify backup files exist
  let metadataPath = PathUtils.join(
    stagingPath,
    SELECTABLE_PROFILE_STAGING_FOLDER_NAME,
    SELECTABLE_PROFILE_METADATA_FILE_NAME
  );
  Assert.ok(await IOUtils.exists(metadataPath), "Metadata file should exist");

  let metadata = await IOUtils.readJSON(metadataPath);
  Assert.equal(
    metadata.name,
    "Custom Avatar Profile",
    "Backed up name should match"
  );
  Assert.equal(
    metadata.avatar,
    originalAvatarName,
    "Backed up avatar should match"
  );

  // Verify custom avatar file was copied to staging
  let copiedAvatarPath = PathUtils.join(
    stagingPath,
    SELECTABLE_PROFILE_STAGING_FOLDER_NAME,
    originalAvatarName
  );

  Assert.ok(
    await IOUtils.exists(copiedAvatarPath),
    "Custom avatar file should be copied to staging"
  );

  // Create a second profile to recover into
  let targetProfile = await createTestProfile({ name: "Target Profile" });

  // Ensure target has a standard avatar before recovery
  await targetProfile.setAvatar("briefcase");
  await updateNotified();

  Assert.ok(
    !targetProfile.hasCustomAvatar,
    "Target should not have custom avatar initially"
  );

  // Recover into the target profile
  let postRecoveryEntry = await resource.recover(
    null,
    stagingPath,
    targetProfile.path
  );

  Assert.equal(
    postRecoveryEntry,
    null,
    "Should return null as post recovery entry"
  );

  // Let's refetch the profile to get the most up to date information
  targetProfile = await SelectableProfileService.getProfile(targetProfile.id);

  // Verify the target profile now has the original profile's data
  Assert.equal(
    targetProfile.name,
    "Custom Avatar Profile",
    "Recovered profile name should match original"
  );
  Assert.ok(
    targetProfile.hasCustomAvatar,
    "Recovered profile avatar should have a new uuid (and should be custom)"
  );
  Assert.deepEqual(
    targetProfile.theme,
    originalProfile.theme,
    "Recovered profile theme should match original"
  );

  // Verify the custom avatar file was copied to the avatar directory
  let avatarDir = PathUtils.join(
    ProfilesDatastoreService.constructor.PROFILE_GROUPS_DIR,
    "avatars"
  );
  let recoveredAvatarPath = PathUtils.join(avatarDir, originalAvatarName);
  Assert.ok(
    await IOUtils.exists(recoveredAvatarPath),
    "Custom avatar file should exist in avatar directory"
  );

  await maybeRemovePath(stagingPath);
  sandbox.restore();
});

/**
 * Tests that postRecovery calls enableTheme when a themeId is provided.
 */
add_task(async function test_postRecovery_calls_enableTheme() {
  let sandbox = sinon.createSandbox();

  const SelectableProfileService = getSelectableProfileService();
  let enableThemeStub = sandbox
    .stub(SelectableProfileService, "enableTheme")
    .resolves();

  let resource = new SelectableProfileBackupResource();
  await resource.postRecovery({ themeId: "test-theme-id" });

  Assert.ok(enableThemeStub.calledOnce, "enableTheme should be called once");
  Assert.equal(
    enableThemeStub.firstCall.args[0],
    "test-theme-id",
    "enableTheme should be called with the provided themeId"
  );

  sandbox.restore();
});

/**
 * Tests that postRecovery does not call enableTheme when no themeId is provided.
 */
add_task(async function test_postRecovery_noop_without_themeId() {
  let sandbox = sinon.createSandbox();

  const SelectableProfileService = getSelectableProfileService();
  let enableThemeStub = sandbox
    .stub(SelectableProfileService, "enableTheme")
    .resolves();

  let resource = new SelectableProfileBackupResource();

  await resource.postRecovery({});
  Assert.ok(
    enableThemeStub.notCalled,
    "enableTheme should not be called with empty object"
  );

  await resource.postRecovery(null);
  Assert.ok(
    enableThemeStub.notCalled,
    "enableTheme should not be called with null"
  );

  sandbox.restore();
});

/**
 * Tests that postRecovery falls back to the default theme when enableTheme
 * fails for the requested theme (e.g. no network connectivity).
 */
add_task(async function test_postRecovery_falls_back_to_default_theme() {
  let sandbox = sinon.createSandbox();

  const SelectableProfileService = getSelectableProfileService();
  let enableThemeStub = sandbox
    .stub(SelectableProfileService, "enableTheme")
    .onFirstCall()
    .rejects(new Error("Download failed"))
    .onSecondCall()
    .resolves();

  let resource = new SelectableProfileBackupResource();
  await resource.postRecovery({ themeId: "some-custom-theme-id" });

  Assert.ok(enableThemeStub.calledTwice, "enableTheme should be called twice");
  Assert.equal(
    enableThemeStub.firstCall.args[0],
    "some-custom-theme-id",
    "First call should try the original theme"
  );
  Assert.equal(
    enableThemeStub.secondCall.args[0],
    "default-theme@mozilla.org",
    "Second call should fall back to the default theme"
  );

  sandbox.restore();
});
