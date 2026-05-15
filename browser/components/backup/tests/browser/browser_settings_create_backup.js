/* Any copyright is dedicated to the Public Domain.
    https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let TEST_PROFILE_PATH;
const SCHEDULED_BACKUPS_ENABLED_PREF = "browser.backup.scheduled.enabled";
const BACKUP_DEFAULT_LOCATION_PREF = "browser.backup.location";

/**
 * This test covers testing the "Backup now" button and it's states
 * based on if a backup is in progress or not
 */
add_setup(async () => {
  TEST_PROFILE_PATH = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "testBackup"
  );
  await SpecialPowers.pushPrefEnv({
    set: [
      [BACKUP_DEFAULT_LOCATION_PREF, ""],
      [SCHEDULED_BACKUPS_ENABLED_PREF, false],
    ],
  });

  registerCleanupFunction(async () => {
    // we'll make sure to clean this whole dir up after the test
    await IOUtils.remove(TEST_PROFILE_PATH, { recursive: true });
  });
});

/**
 * Tests the case where there is no DEFAULT_PARENT_DIR_PATH
 */
add_task(async function test_no_default_folder() {
  const sandbox = sinon.createSandbox();

  let bs = getAndMaybeInitBackupService();
  bs.resetDefaultParentInternalState();

  let docStub = sandbox
    .stub(BackupService, "docsDirFolderPath")
    .get()
    .returns(null);

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let settings = browser.contentDocument.querySelector("backup-settings");
    let turnOnButton = settings.scheduledBackupsButtonEl;

    await settings.updateComplete;

    Assert.ok(bs.archiveEnabledStatus, "Archive is enabled for backups");

    Assert.ok(
      turnOnButton,
      "Button to turn on scheduled backups should be found"
    );

    turnOnButton.click();

    await settings.updateComplete;

    let turnOnScheduledBackups = settings.turnOnScheduledBackupsEl;

    Assert.ok(
      turnOnScheduledBackups,
      "turn-on-scheduled-backups should be found"
    );

    let filePathInputDefault = turnOnScheduledBackups.filePathInputDefaultEl;

    Assert.equal(
      filePathInputDefault.value,
      "",
      "Default input displays the expected text"
    );

    let dialog = settings.turnOnScheduledBackupsDialogEl;
    let dialogClosePromise = BrowserTestUtils.waitForEvent(dialog, "close");
    dialog.close();

    await dialogClosePromise;
  });

  docStub.restore();

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let settings = browser.contentDocument.querySelector("backup-settings");

    Assert.ok(
      settings.turnOnScheduledBackupsEl,
      "turn-on-scheduled-backups should be found"
    );
    settings.scheduledBackupsButtonEl.click();

    const documentsPath = BackupService.DEFAULT_PARENT_DIR_PATH;

    Assert.equal(
      settings.turnOnScheduledBackupsEl.filePathInputDefaultEl.value,
      `${PathUtils.filename(documentsPath)} (recommended)`,
      "Default input displays the expected text"
    );
  });

  sandbox.restore();
  await SpecialPowers.popPrefEnv();
});

/**
 * Test creating a new backup using the "Backup now" button
 */
add_task(async function test_create_new_backup_trigger() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [BACKUP_DEFAULT_LOCATION_PREF, TEST_PROFILE_PATH],
      [SCHEDULED_BACKUPS_ENABLED_PREF, true],
    ],
  });
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    Services.fog.testResetFOG();

    let settings = browser.contentDocument.querySelector("backup-settings");
    // disable the buffer for the test
    settings.MESSAGE_BAR_BUFFER = 0;

    let bs = getAndMaybeInitBackupService();

    Assert.ok(!bs.state.backupInProgress, "There is no backup in progress");

    Assert.ok(
      !settings.triggerBackupButtonEl.disabled,
      "No backup in progress and backup's enabled should mean that we can Backup Now"
    );

    let stateUpdated = BrowserTestUtils.waitForEvent(
      bs,
      "BackupService:StateUpdate",
      false,
      () => {
        return bs.state.backupInProgress;
      }
    );

    // ensure that the in progress message bar is not visible
    Assert.ok(
      !settings.backupInProgressMessageBarEl,
      "A backup is not in progress, the message bar should not be visible"
    );

    // click on button
    settings.triggerBackupButtonEl.click();

    await stateUpdated;

    // make sure the button changes to disabled
    await settings.updateComplete;

    Assert.ok(
      settings.triggerBackupButtonEl.disabled,
      "A backup is in progress, the trigger button should be disabled"
    );

    // ensure that the in progress message bar is visible
    Assert.ok(
      settings.backupInProgressMessageBarEl,
      "A backup is in progress, the message bar should be visible"
    );

    await BrowserTestUtils.waitForEvent(
      bs,
      "BackupService:StateUpdate",
      false,
      () => {
        return !bs.state.backupInProgress;
      }
    );

    await settings.updateComplete;

    // make sure that the backup created is a valid backup
    Assert.ok(
      !settings.backupServiceState.backupInProgress,
      "A backup is complete"
    );

    let fileName = JSON.parse(
      settings.lastBackupFileNameEl.getAttribute("data-l10n-args")
    ).fileName;

    // the file should show once it's created
    Assert.ok(fileName, "the archive was created");

    await BrowserTestUtils.waitForCondition(
      () => !settings.backupInProgressMessageBarEl,
      "A backup is no longer in progress, the message bar should disappear"
    );

    let gleanEvents = Glean.browserBackup.backupStart.testGetValue();
    Assert.equal(gleanEvents.length, 1, "backup_start event was recorded");
    Assert.equal(
      gleanEvents[0].extra.reason,
      "manual",
      "correct reason for the backup was recorded"
    );
  });
});

/**
 * Tests if the "Backup now" button is disabled if a backup is already underway
 */
add_task(async function test_create_backup_trigger_disabled() {
  let bs = getAndMaybeInitBackupService();

  const sandbox = sinon.createSandbox();

  // We'll unblock the backup when content notifies this topic
  const UNBLOCK_TOPIC = "backup-test-allow-create";

  // Keep the original impl so the stub can delegate once unblocked
  const origResolveDest = bs.resolveArchiveDestFolderPath.bind(bs);

  sandbox
    .stub(bs, "resolveArchiveDestFolderPath")
    .callsFake(async (...args) => {
      // Wait until the prefs page tells us it's ready
      await TestUtils.topicObserved(UNBLOCK_TOPIC);
      return origResolveDest(...args);
    });

  // Kick off a backup *before* opening the page. This is simulating
  // the backup background task
  let backupPromise = bs.createBackup();

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let settings = browser.contentDocument.querySelector("backup-settings");
    Assert.ok(
      settings.triggerBackupButtonEl.disabled,
      "A backup is in progress"
    );

    let stateUpdated = BrowserTestUtils.waitForEvent(
      bs,
      "BackupService:StateUpdate",
      false,
      () => {
        return !bs.state.backupInProgress;
      }
    );

    // Unblock the stub so backup proceeds
    Services.obs.notifyObservers(null, UNBLOCK_TOPIC);
    let result = await backupPromise;

    ok(result, `Backup completed and returned result ${result.archivePath}`);
    await stateUpdated;
    await settings.updateComplete;

    Assert.ok(
      !settings.backupServiceState.backupInProgress,
      "No backup in progress, we can trigger a new one"
    );
  });

  sandbox.restore();
});
