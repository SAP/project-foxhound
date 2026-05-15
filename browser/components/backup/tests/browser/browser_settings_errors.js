/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ERRORS } = ChromeUtils.importESModule(
  "chrome://browser/content/backup/backup-constants.mjs"
);

const { BackupError } = ChromeUtils.importESModule(
  "resource:///modules/backup/BackupError.mjs"
);

const SCHEDULED_BACKUPS_ENABLED_PREF = "browser.backup.scheduled.enabled";
const BACKUP_ERROR_CODE_PREF_NAME = "browser.backup.errorCode";

add_task(async function test_error_visibility_heuristic() {
  await SpecialPowers.pushPrefEnv({
    set: [[SCHEDULED_BACKUPS_ENABLED_PREF, true]],
  });

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let settings = browser.contentDocument.querySelector("backup-settings");
    let sandbox = sinon.createSandbox();

    registerCleanupFunction(() => {
      sandbox.restore();
    });

    const bs = getAndMaybeInitBackupService();
    sandbox
      .stub(bs, "resolveArchiveDestFolderPath")
      .rejects(new BackupError("forced failure", ERRORS.UNKNOWN));

    settings.triggerBackupButtonEl.click();

    // ensure that the error message is shown
    await TestUtils.waitForPrefChange(
      BACKUP_ERROR_CODE_PREF_NAME,
      val => val == ERRORS.UNKNOWN
    );
    // Wait a tick of the event loop to let the BackupUIParent respond to
    // the promise resolution, and to send its message to the BackupUIChild.
    await new Promise(resolve => SimpleTest.executeSoon(resolve));
    // Wait a second tick to let the BackupUIChild respond to the message
    // from BackupUIParent.
    await new Promise(resolve => SimpleTest.executeSoon(resolve));
    await settings.updateComplete;

    Assert.ok(settings.backupErrorBarEl, "Error bar is visible");
  });

  await SpecialPowers.popPrefEnv();
});
