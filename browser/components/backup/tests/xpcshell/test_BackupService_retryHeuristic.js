/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  BackupError: "resource:///modules/backup/BackupError.mjs",
  ERRORS: "chrome://browser/content/backup/backup-constants.mjs",
  TestUtils: "resource://testing-common/TestUtils.sys.mjs",
});

const BACKUP_RETRY_LIMIT_PREF_NAME = "browser.backup.backup-retry-limit";
const DISABLED_ON_IDLE_RETRY_PREF_NAME =
  "browser.backup.disabled-on-idle-backup-retry";
const BACKUP_ERROR_CODE_PREF_NAME = "browser.backup.errorCode";
const MINIMUM_TIME_BETWEEN_BACKUPS_SECONDS_PREF_NAME =
  "browser.backup.scheduled.minimum-time-between-backups-seconds";
const SCHEDULED_BACKUPS_ENABLED_PREF_NAME = "browser.backup.scheduled.enabled";
const BACKUP_DEBUG_INFO_PREF_NAME = "browser.backup.backup-debug-info";
const BACKUP_DEFAULT_LOCATION_PREF_NAME = "browser.backup.location";

const RETRIES_FOR_TEST = 4;

async function create_backup_failure_expected_calls(
  bs,
  callCount,
  assertionMsg
) {
  assertionMsg = assertionMsg
    ? assertionMsg
    : `createBackup should be called ${callCount} times`;

  let originalBackoffTime = BackupService.backoffSeconds();

  bs.createBackupOnIdleDispatch({});

  // testing that callCount remains the same, skip all the other checks
  if (callCount == bs.createBackup.callCount) {
    Assert.equal(bs.createBackup.callCount, callCount, assertionMsg);

    return;
  }

  // Wait for in progress states to change
  // so that the errorRetries can be updated

  await bsInProgressStateUpdate(bs, true);
  await bsInProgressStateUpdate(bs, false);

  // propagate prefs
  await TestUtils.waitForTick();

  // have we called createBackup more times than allowed retries?
  // if so, the retries should reset and retrying should
  // disable calling createBackup again
  if (callCount == RETRIES_FOR_TEST + 1) {
    Assert.equal(
      Glean.browserBackup.backupThrottled.testGetValue().length,
      1,
      "backupThrottled telemetry was sent"
    );

    Assert.ok(
      Services.prefs.getBoolPref(DISABLED_ON_IDLE_RETRY_PREF_NAME),
      "Disable on idle is now enabled - no more retries allowed"
    );
  }
  // we expect createBackup to be called, but it shouldn't succeed
  else {
    Assert.equal(
      BackupService.backoffSeconds(),
      2 * originalBackoffTime,
      "Backoff time should have doubled"
    );

    Assert.ok(
      !Services.prefs.getBoolPref(DISABLED_ON_IDLE_RETRY_PREF_NAME),
      "Disable on idle is disabled - which means that we can do more retries!"
    );

    Assert.equal(
      Glean.browserBackup.backupThrottled.testGetValue(),
      null,
      "backupThrottled telemetry was not sent yet"
    );
  }

  Assert.equal(bs.createBackup.callCount, callCount, assertionMsg);

  Assert.equal(
    Services.prefs.getIntPref(BACKUP_ERROR_CODE_PREF_NAME),
    ERRORS.UNKNOWN,
    "Error code has been set"
  );
}

function bsInProgressStateUpdate(bs, isBackupInProgress) {
  // Check if already in desired state
  if (bs.state.backupInProgress === isBackupInProgress) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const listener = () => {
      if (bs.state.backupInProgress === isBackupInProgress) {
        bs.removeEventListener("BackupService:StateUpdate", listener);
        resolve();
      }
    };

    bs.addEventListener("BackupService:StateUpdate", listener);
  });
}

add_setup(async () => {
  const TEST_PROFILE_PATH = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "testBackup"
  );

  Services.prefs.setStringPref(
    BACKUP_DEFAULT_LOCATION_PREF_NAME,
    TEST_PROFILE_PATH
  );
  Services.prefs.setBoolPref(SCHEDULED_BACKUPS_ENABLED_PREF_NAME, true);
  Services.prefs.setIntPref(BACKUP_RETRY_LIMIT_PREF_NAME, RETRIES_FOR_TEST);
  Services.prefs.setBoolPref(DISABLED_ON_IDLE_RETRY_PREF_NAME, false);

  setupProfile();

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref(BACKUP_DEFAULT_LOCATION_PREF_NAME);
    Services.prefs.clearUserPref(SCHEDULED_BACKUPS_ENABLED_PREF_NAME);
    Services.prefs.clearUserPref(BACKUP_RETRY_LIMIT_PREF_NAME);
    Services.prefs.clearUserPref(DISABLED_ON_IDLE_RETRY_PREF_NAME);

    await IOUtils.remove(TEST_PROFILE_PATH, { recursive: true });
  });
});

add_task(async function test_retries_no_backoff() {
  Services.fog.testResetFOG();

  let bs = new BackupService();
  let sandbox = sinon.createSandbox();
  // Make createBackup fail intentionally
  sandbox
    .stub(bs, "resolveArchiveDestFolderPath")
    .rejects(new BackupError("forced failure", ERRORS.UNKNOWN));

  // stub out idleDispatch
  sandbox.stub(ChromeUtils, "idleDispatch").callsFake(callback => callback());

  sandbox.spy(bs, "createBackup");

  const n = Services.prefs.getIntPref(BACKUP_RETRY_LIMIT_PREF_NAME);
  // now that we have an idle service, let's call create backup RETRY_LIMIT times
  for (let i = 0; i <= n; i++) {
    // ensure that there is no error code set
    Services.prefs.setIntPref(BACKUP_ERROR_CODE_PREF_NAME, ERRORS.NONE);

    // Set the lastBackupAttempt to the current backoff threshold, to avoid hitting
    // the exponential backoff clause for this test.
    Services.prefs.setStringPref(
      BACKUP_DEBUG_INFO_PREF_NAME,
      JSON.stringify({
        lastBackupAttempt:
          Math.floor(Date.now() / 1000) - (BackupService.backoffSeconds() + 1),
        errorCode: ERRORS.UNKNOWN,
        lastRunStep: 0,
      })
    );

    await create_backup_failure_expected_calls(bs, i + 1);
  }
  // check if it switched to no longer creating backups on idle
  await create_backup_failure_expected_calls(
    bs,
    bs.createBackup.callCount,
    "createBackup was not called since we hit the retry limit"
  );

  sandbox.restore();
});

add_task(async function test_exponential_backoff() {
  Services.fog.testResetFOG();

  let bs = new BackupService();
  let sandbox = sinon.createSandbox();
  const createBackupFailureStub = sandbox
    .stub(bs, "resolveArchiveDestFolderPath")
    .rejects(new BackupError("forced failure", ERRORS.UNKNOWN));

  sandbox.stub(ChromeUtils, "idleDispatch").callsFake(callback => callback());
  sandbox.spy(bs, "createBackup");

  Services.prefs.setIntPref(BACKUP_ERROR_CODE_PREF_NAME, ERRORS.NONE);
  Services.prefs.setStringPref(
    BACKUP_DEBUG_INFO_PREF_NAME,
    JSON.stringify({
      lastBackupAttempt:
        Math.floor(Date.now() / 1000) - (BackupService.backoffSeconds() + 1),
      errorCode: ERRORS.UNKNOWN,
      lastRunStep: 0,
    })
  );

  Services.prefs.setIntPref(MINIMUM_TIME_BETWEEN_BACKUPS_SECONDS_PREF_NAME, 0);
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(
      MINIMUM_TIME_BETWEEN_BACKUPS_SECONDS_PREF_NAME
    );
  });

  await create_backup_failure_expected_calls(bs, 1);

  // Remove the stub, ensure that a success leads to the prefs
  // and retries resetting
  createBackupFailureStub.restore();

  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 10));

  let testProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "testBackup_profile"
  );

  await bs.createBackup({
    profilePath: testProfilePath,
  });

  Assert.equal(
    Services.prefs.getIntPref(BACKUP_ERROR_CODE_PREF_NAME),
    ERRORS.NONE,
    "The error code is reset to NONE"
  );

  Assert.equal(
    60,
    BackupService.backoffSeconds(),
    "The exponential backoff is reset to 1 minute (60s)"
  );

  Assert.ok(
    !Services.prefs.getStringPref(BACKUP_DEBUG_INFO_PREF_NAME, null),
    "Error debug info has been cleared"
  );

  sandbox.restore();
});
