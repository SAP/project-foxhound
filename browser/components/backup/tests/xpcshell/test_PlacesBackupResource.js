/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { PlacesBackupResource } = ChromeUtils.importESModule(
  "resource:///modules/backup/PlacesBackupResource.sys.mjs"
);
const { PlacesDBUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/PlacesDBUtils.sys.mjs"
);

registerCleanupFunction(() => {
  /**
   * Even though test_backup_no_saved_history clears user prefs too,
   * clear them here as well in case that test fails and we don't
   * reach the end of the test, which handles the cleanup.
   */
  Services.prefs.clearUserPref(HISTORY_ENABLED_PREF);
  Services.prefs.clearUserPref(SANITIZE_ON_SHUTDOWN_PREF);
});

/**
 * Tests that we can measure Places DB related files in the profile directory.
 */
add_task(async function test_measure() {
  Services.fog.testResetFOG();

  const EXPECTED_PLACES_DB_SIZE = 5240;
  const EXPECTED_FAVICONS_DB_SIZE = 5240;

  // Create resource files in temporary directory
  const tempDir = PathUtils.tempDir;
  let tempPlacesDBPath = PathUtils.join(tempDir, "places.sqlite");
  let tempFaviconsDBPath = PathUtils.join(tempDir, "favicons.sqlite");
  await createKilobyteSizedFile(tempPlacesDBPath, EXPECTED_PLACES_DB_SIZE);
  await createKilobyteSizedFile(tempFaviconsDBPath, EXPECTED_FAVICONS_DB_SIZE);

  let placesBackupResource = new PlacesBackupResource();
  await placesBackupResource.measure(tempDir);

  let placesMeasurement = Glean.browserBackup.placesSize.testGetValue();
  let faviconsMeasurement = Glean.browserBackup.faviconsSize.testGetValue();
  let scalars = TelemetryTestUtils.getProcessScalars("parent", false, false);

  // Compare glean vs telemetry measurements
  TelemetryTestUtils.assertScalar(
    scalars,
    "browser.backup.places_size",
    placesMeasurement,
    "Glean and telemetry measurements for places.sqlite should be equal"
  );
  TelemetryTestUtils.assertScalar(
    scalars,
    "browser.backup.favicons_size",
    faviconsMeasurement,
    "Glean and telemetry measurements for favicons.sqlite should be equal"
  );

  // Compare glean measurements vs actual file sizes
  Assert.equal(
    placesMeasurement,
    EXPECTED_PLACES_DB_SIZE,
    "Should have collected the correct glean measurement for places.sqlite"
  );
  Assert.equal(
    faviconsMeasurement,
    EXPECTED_FAVICONS_DB_SIZE,
    "Should have collected the correct glean measurement for favicons.sqlite"
  );

  await maybeRemovePath(tempPlacesDBPath);
  await maybeRemovePath(tempFaviconsDBPath);
});

/**
 * Tests that the backup method correctly copies places.sqlite and
 * favicons.sqlite from the profile directory into the staging directory.
 */
add_task(async function test_backup() {
  Services.fog.testResetFOG();
  const placesTimeHistogram = TelemetryTestUtils.getAndClearHistogram(
    "BROWSER_BACKUP_PLACES_TIME_MS"
  );
  const faviconsTimeHistogram = TelemetryTestUtils.getAndClearHistogram(
    "BROWSER_BACKUP_FAVICONS_TIME_MS"
  );
  let sandbox = sinon.createSandbox();

  let placesBackupResource = new PlacesBackupResource();
  let sourcePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PlacesBackupResource-source-test"
  );
  let stagingPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PlacesBackupResource-staging-test"
  );

  // Make sure these files exist in the source directory, otherwise
  // BackupResource will skip attempting to back them up.
  await createTestFiles(sourcePath, [
    { path: "places.sqlite" },
    { path: "favicons.sqlite" },
  ]);

  let fakeConnection = {
    backup: sandbox.stub().resolves(true),
    close: sandbox.stub().resolves(true),
  };
  sandbox.stub(Sqlite, "openConnection").returns(fakeConnection);
  sandbox.stub(PlacesDBUtils, "removeDownloadsMetadataFromDb");

  let manifestEntry = await placesBackupResource.backup(
    stagingPath,
    sourcePath
  );
  Assert.equal(
    manifestEntry,
    null,
    "PlacesBackupResource.backup should return null as its ManifestEntry"
  );

  Assert.ok(
    PlacesDBUtils.removeDownloadsMetadataFromDb.calledOnce,
    "PlacesDBUtils.removeDownloadsMetadataFromDb was called"
  );
  Assert.ok(
    fakeConnection.backup.calledTwice,
    "Backup should have been called twice"
  );
  Assert.ok(
    fakeConnection.backup.firstCall.calledWith(
      PathUtils.join(stagingPath, "places.sqlite")
    ),
    "places.sqlite should have been backed up first"
  );
  Assert.ok(
    fakeConnection.backup.secondCall.calledWith(
      PathUtils.join(stagingPath, "favicons.sqlite")
    ),
    "favicons.sqlite should have been backed up second"
  );
  // Validate timing metrics
  assertSingleTimeMeasurement(Glean.browserBackup.placesTime.testGetValue());
  assertSingleTimeMeasurement(Glean.browserBackup.faviconsTime.testGetValue());
  assertHistogramMeasurementQuantity(placesTimeHistogram, 1);
  assertHistogramMeasurementQuantity(faviconsTimeHistogram, 1);

  await maybeRemovePath(stagingPath);
  await maybeRemovePath(sourcePath);

  sandbox.restore();
});

/**
 * Tests that we don't backup history is the user is clearing browsing history
 * on shutdown.
 */
add_task(async function test_backup_no_saved_history() {
  Services.fog.testResetFOG();
  const placesTimeHistogram = TelemetryTestUtils.getAndClearHistogram(
    "BROWSER_BACKUP_PLACES_TIME_MS"
  );
  const faviconsTimeHistogram = TelemetryTestUtils.getAndClearHistogram(
    "BROWSER_BACKUP_FAVICONS_TIME_MS"
  );
  let sandbox = sinon.createSandbox();

  let sourcePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PlacesBackupResource-source-test"
  );
  let stagingPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PlacesBackupResource-staging-test"
  );

  let fakeConnection = {
    backup: sandbox.stub().resolves(true),
    close: sandbox.stub().resolves(true),
  };
  sandbox.stub(Sqlite, "openConnection").returns(fakeConnection);

  /**
   * First verify that remember history pref alone affects backup file type for places,
   * despite sanitize on shutdown pref value.
   */
  Services.prefs.setBoolPref(HISTORY_ENABLED_PREF, false);
  Services.prefs.setBoolPref(SANITIZE_ON_SHUTDOWN_PREF, false);

  Assert.ok(
    !PlacesBackupResource.canBackupResource,
    "Cannot backup places when history is disabled"
  );

  // PlacesBackupResource should not be called when canBackupResource is false
  // The test is just verifying the check works correctly
  // Validate no timing metrics
  Assert.equal(
    Glean.browserBackup.placesTime.testGetValue(),
    null,
    "Should not have timed places backup when it did not occur"
  );
  Assert.equal(
    Glean.browserBackup.faviconsTime.testGetValue(),
    null,
    "Should not have timed favicons backup when it did not occur"
  );
  assertHistogramMeasurementQuantity(placesTimeHistogram, 0);
  assertHistogramMeasurementQuantity(faviconsTimeHistogram, 0);

  /**
   * Now verify that the sanitize shutdown pref also prevents backup of places.
   */
  Services.prefs.setBoolPref(HISTORY_ENABLED_PREF, true);
  Services.prefs.setBoolPref(SANITIZE_ON_SHUTDOWN_PREF, true);
  Services.prefs.setBoolPref(HISTORY_CLEARED_ON_SHUTDOWN_PREF, true);

  Assert.ok(
    !PlacesBackupResource.canBackupResource,
    "Cannot backup places when sanitizeOnShutdown and history cleared on shutdown are enabled"
  );

  // PlacesBackupResource should not be called when canBackupResource is false
  // The test is just verifying the check works correctly
  // Validate no timing metrics
  Assert.equal(
    Glean.browserBackup.placesTime.testGetValue(),
    null,
    "Should not have timed places backup when it did not occur"
  );
  Assert.equal(
    Glean.browserBackup.faviconsTime.testGetValue(),
    null,
    "Should not have timed favicons backup when it did not occur"
  );
  assertHistogramMeasurementQuantity(placesTimeHistogram, 0);
  assertHistogramMeasurementQuantity(faviconsTimeHistogram, 0);

  await maybeRemovePath(stagingPath);
  await maybeRemovePath(sourcePath);

  sandbox.restore();
  Services.prefs.clearUserPref(HISTORY_ENABLED_PREF);
  Services.prefs.clearUserPref(SANITIZE_ON_SHUTDOWN_PREF);
  Services.prefs.clearUserPref(HISTORY_CLEARED_ON_SHUTDOWN_PREF);
});

/**
 * Tests that we don't backup history if permanent private browsing is enabled
 */
add_task(async function test_backup_private_browsing() {
  Services.fog.testResetFOG();
  const placesTimeHistogram = TelemetryTestUtils.getAndClearHistogram(
    "BROWSER_BACKUP_PLACES_TIME_MS"
  );
  const faviconsTimeHistogram = TelemetryTestUtils.getAndClearHistogram(
    "BROWSER_BACKUP_FAVICONS_TIME_MS"
  );
  let sandbox = sinon.createSandbox();

  let sourcePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PlacesBackupResource-source-test"
  );
  let stagingPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PlacesBackupResource-staging-test"
  );

  let fakeConnection = {
    backup: sandbox.stub().resolves(true),
    close: sandbox.stub().resolves(true),
  };
  sandbox.stub(Sqlite, "openConnection").returns(fakeConnection);
  sandbox.stub(PrivateBrowsingUtils, "permanentPrivateBrowsing").value(true);

  Assert.ok(
    !PlacesBackupResource.canBackupResource,
    "Cannot backup places when permanent private browsing is enabled"
  );

  // PlacesBackupResource should not be called when canBackupResource is false
  // The test is just verifying the check works correctly
  // Validate no timing metrics
  Assert.equal(
    Glean.browserBackup.placesTime.testGetValue(),
    null,
    "Should not have timed places backup when it did not occur"
  );
  Assert.equal(
    Glean.browserBackup.faviconsTime.testGetValue(),
    null,
    "Should not have timed favicons backup when it did not occur"
  );
  assertHistogramMeasurementQuantity(placesTimeHistogram, 0);
  assertHistogramMeasurementQuantity(faviconsTimeHistogram, 0);

  await maybeRemovePath(stagingPath);
  await maybeRemovePath(sourcePath);

  sandbox.restore();
});

/**
 * Test that the recover method correctly copies places.sqlite and favicons.sqlite
 * from the recovery directory into the destination profile directory.
 */
add_task(async function test_recover() {
  let placesBackupResource = new PlacesBackupResource();
  let recoveryPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PlacesBackupResource-recovery-test"
  );
  let destProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PlacesBackupResource-test-profile"
  );

  const simpleCopyFiles = [
    { path: "places.sqlite" },
    { path: "favicons.sqlite" },
  ];
  await createTestFiles(recoveryPath, simpleCopyFiles);

  // The backup method is expected to have returned a null ManifestEntry
  let postRecoveryEntry = await placesBackupResource.recover(
    null /* manifestEntry */,
    recoveryPath,
    destProfilePath
  );
  Assert.equal(
    postRecoveryEntry,
    null,
    "PlacesBackupResource.recover should return null as its post recovery entry"
  );

  await assertFilesExist(destProfilePath, simpleCopyFiles);

  await maybeRemovePath(recoveryPath);
  await maybeRemovePath(destProfilePath);
});

/**
 * Tests the canBackupResource method with various pref configurations.
 */
add_task(async function test_canBackupResource() {
  Assert.ok(
    PlacesBackupResource.canBackupResource,
    "Should be able to backup by default"
  );

  Services.prefs.setBoolPref(HISTORY_ENABLED_PREF, false);
  Assert.ok(
    !PlacesBackupResource.canBackupResource,
    "Cannot backup when history is disabled"
  );
  Services.prefs.clearUserPref(HISTORY_ENABLED_PREF);

  Assert.ok(
    PlacesBackupResource.canBackupResource,
    "Should be able to backup after clearing pref"
  );

  Services.prefs.setBoolPref(SANITIZE_ON_SHUTDOWN_PREF, true);
  Services.prefs.setBoolPref(HISTORY_CLEARED_ON_SHUTDOWN_PREF, true);
  Assert.ok(
    !PlacesBackupResource.canBackupResource,
    "Cannot backup when sanitizeOnShutdown and history cleared on shutdown are enabled"
  );

  Services.prefs.clearUserPref(SANITIZE_ON_SHUTDOWN_PREF);
  Services.prefs.clearUserPref(HISTORY_CLEARED_ON_SHUTDOWN_PREF);
});
