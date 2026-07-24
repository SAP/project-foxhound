/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { SiteSettingsBackupResource } = ChromeUtils.importESModule(
  "resource:///modules/backup/SiteSettingsBackupResource.sys.mjs"
);

/**
 * Tests that we can measure the Site Settings databases in a profile directory.
 */
add_task(async function test_measure() {
  const EXPECTED_PERMISSIONS_DB_SIZE = 500;
  const EXPECTED_CONTENT_PREFS_DB_SIZE = 500;

  Services.fog.testResetFOG();

  let tempDir = PathUtils.tempDir;
  let tempPermissionsDBPath = PathUtils.join(tempDir, "permissions.sqlite");
  let tempContentPrefsDBPath = PathUtils.join(tempDir, "content-prefs.sqlite");

  await createKilobyteSizedFile(
    tempPermissionsDBPath,
    EXPECTED_PERMISSIONS_DB_SIZE
  );
  await createKilobyteSizedFile(
    tempContentPrefsDBPath,
    EXPECTED_CONTENT_PREFS_DB_SIZE
  );

  let siteSettingsBackupResource = new SiteSettingsBackupResource();
  await siteSettingsBackupResource.measure(tempDir);

  await IOUtils.remove(tempPermissionsDBPath);
  await IOUtils.remove(tempContentPrefsDBPath);
});

/**
 * Test that the backup method correctly copies items from the profile directory
 * into the staging directory.
 */
add_task(async function test_backup() {
  let sandbox = sinon.createSandbox();

  let siteSettingsBackupResource = new SiteSettingsBackupResource();
  let sourcePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "SiteSettingsBackupResource-source-test"
  );
  let stagingPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "SiteSettingsBackupResource-staging-test"
  );

  await createTestFiles(sourcePath, [
    { path: "permissions.sqlite" },
    { path: "content-prefs.sqlite" },
  ]);

  let fakeConnection = {
    backup: sandbox.stub().resolves(true),
    close: sandbox.stub().resolves(true),
  };
  sandbox.stub(Sqlite, "openConnection").returns(fakeConnection);

  let manifestEntry = await siteSettingsBackupResource.backup(
    stagingPath,
    sourcePath
  );
  Assert.equal(
    manifestEntry,
    null,
    "SiteSettingsBackupResource.backup should return null as its ManifestEntry"
  );

  Assert.ok(
    fakeConnection.backup.calledTwice,
    "Called backup the expected number of times for all connections"
  );
  Assert.ok(
    fakeConnection.backup.calledWith(
      PathUtils.join(stagingPath, "permissions.sqlite")
    ),
    "Called backup on the permissions.sqlite Sqlite connection"
  );
  Assert.ok(
    fakeConnection.backup.calledWith(
      PathUtils.join(stagingPath, "content-prefs.sqlite")
    ),
    "Called backup on the content-prefs.sqlite Sqlite connection"
  );

  await maybeRemovePath(stagingPath);
  await maybeRemovePath(sourcePath);

  sandbox.restore();
});

/**
 * Test that the recover method correctly copies items from the recovery
 * directory into the destination profile directory.
 */
add_task(async function test_recover() {
  let siteSettingsBackupResource = new SiteSettingsBackupResource();
  let recoveryPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "SiteSettingsBackupResource-recovery-test"
  );
  let destProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "SiteSettingsBackupResource-test-profile"
  );

  const simpleCopyFiles = [
    { path: "permissions.sqlite" },
    { path: "content-prefs.sqlite" },
  ];
  await createTestFiles(recoveryPath, simpleCopyFiles);

  let postRecoveryEntry = await siteSettingsBackupResource.recover(
    null,
    recoveryPath,
    destProfilePath
  );
  Assert.equal(
    postRecoveryEntry,
    null,
    "SiteSettingsBackupResource.recover should return null as its post recovery entry"
  );

  await assertFilesExist(destProfilePath, simpleCopyFiles);

  await maybeRemovePath(recoveryPath);
  await maybeRemovePath(destProfilePath);
});

/**
 * Tests that the backup method does not copy the permissions or content prefs
 * databases if the browser is configured to not save history - either while
 * running, or to clear it at shutdown.
 */
add_task(async function test_backup_no_saved_history() {
  let siteSettingsBackupResource = new SiteSettingsBackupResource();
  let sourcePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "SiteSettingsBackupResource-source-test"
  );
  let stagingPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "SiteSettingsBackupResource-staging-test"
  );

  let sandbox = sinon.createSandbox();
  let fakeConnection = {
    backup: sandbox.stub().resolves(true),
    close: sandbox.stub().resolves(true),
  };
  sandbox.stub(Sqlite, "openConnection").returns(fakeConnection);

  Services.prefs.setBoolPref(SANITIZE_ON_SHUTDOWN_PREF, true);
  Services.prefs.setBoolPref(SITE_SETTINGS_CLEARED_ON_SHUTDOWN_PREF, true);

  Assert.ok(
    !SiteSettingsBackupResource.canBackupResource,
    "Cannot backup site settings since they are being cleared on shutdown"
  );

  let manifestEntry = await siteSettingsBackupResource.backup(
    stagingPath,
    sourcePath
  );
  Assert.equal(
    manifestEntry,
    null,
    "SiteSettingsBackupResource.backup should return null as its ManifestEntry"
  );

  Assert.ok(
    fakeConnection.backup.notCalled,
    "No sqlite connections should have been made with sanitize shutdown enabled"
  );

  Services.prefs.clearUserPref(SANITIZE_ON_SHUTDOWN_PREF);
  Services.prefs.clearUserPref(SITE_SETTINGS_CLEARED_ON_SHUTDOWN_PREF);

  Assert.ok(
    SiteSettingsBackupResource.canBackupResource,
    "We should be allowed to backup this resource now"
  );

  fakeConnection.backup.resetHistory();
  manifestEntry = await siteSettingsBackupResource.backup(
    stagingPath,
    sourcePath
  );
  Assert.equal(
    manifestEntry,
    null,
    "Should have gotten back a null ManifestEntry"
  );

  Assert.ok(
    fakeConnection.backup.notCalled,
    "No files to backup, so no sqlite connections should have been made"
  );

  await maybeRemovePath(stagingPath);
  await maybeRemovePath(sourcePath);

  sandbox.restore();
});

/**
 * Tests the canBackupResource method with various pref configurations.
 */
add_task(async function test_canBackupResource() {
  Assert.ok(
    SiteSettingsBackupResource.canBackupResource,
    "Should be able to backup by default"
  );

  Services.prefs.setBoolPref(SANITIZE_ON_SHUTDOWN_PREF, true);
  Services.prefs.setBoolPref(SITE_SETTINGS_CLEARED_ON_SHUTDOWN_PREF, true);
  Assert.ok(
    !SiteSettingsBackupResource.canBackupResource,
    "Cannot backup when sanitizeOnShutdown and site settings cleared on shutdown (v2) are enabled"
  );
  Services.prefs.clearUserPref(SANITIZE_ON_SHUTDOWN_PREF);
  Services.prefs.clearUserPref(SITE_SETTINGS_CLEARED_ON_SHUTDOWN_PREF);

  Assert.ok(
    SiteSettingsBackupResource.canBackupResource,
    "Should be able to backup after clearing prefs"
  );
});
