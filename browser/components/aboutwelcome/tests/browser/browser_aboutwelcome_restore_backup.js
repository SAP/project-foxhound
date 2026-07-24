"use strict";

let TEST_PROFILE_PATH;
const TEST_DEFAULT_CONTENT = [
  {
    id: "AW_BACKUP_RESTORE_EMBEDDED_TEST",
    content: {
      fullscreen: true,
      title: {
        raw: "Lets get Firefox back to how you like it",
      },
      subtitle: {
        raw: "Recover all your bookmarks, history, and other data to get back to browsing.",
      },
      tiles: { type: "backup_restore" },
      position: "split",
      hide_secondary_section: "responsive",
      secondary_button: {
        label: {
          string_id: "mr2022-onboarding-secondary-skip-button-label",
        },
        action: {
          navigate: true,
        },
        has_arrow_icon: true,
      },
    },
  },
];
const TEST_DEFAULT_JSON = JSON.stringify(TEST_DEFAULT_CONTENT);

add_setup(async () => {
  MockFilePicker.init(window.browsingContext);
  TEST_PROFILE_PATH = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "testBackupAW"
  );

  await SpecialPowers.pushPrefEnv({
    set: [["browser.backup.location", TEST_PROFILE_PATH]],
  });

  let bs = BackupService.get();
  bs.resetLastBackupInternalState();

  registerCleanupFunction(async () => {
    MockFilePicker.cleanup();
    Services.prefs.clearUserPref(
      "messaging-system-action.showRestoreFromBackup"
    );
    await IOUtils.remove(TEST_PROFILE_PATH, { recursive: true });
  });
});

add_task(async function test_aboutwelcome_embedded_backup_restore_properties() {
  const sandbox = sinon.createSandbox();
  await pushPrefs([
    "browser.backup.enabled",
    true,
    "browser.backup.archive.enabled",
    true,
    "browser.backup.restore.enabled",
    true,
  ]);

  await setAboutWelcomeMultiStage(TEST_DEFAULT_JSON);
  let { cleanup, browser } = await openMRAboutWelcome();

  await SpecialPowers.spawn(browser, [], async () => {
    const restoreComponent = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("restore-from-backup"),
      "restore-from-backup element should be present"
    );
    Assert.ok(restoreComponent, "Restore component should be present");

    await restoreComponent.updateComplete;

    const cancelButton = restoreComponent.shadowRoot.querySelector(
      "#restore-from-backup-cancel-button"
    );
    Assert.ok(!cancelButton, "Cancel button should not be present");

    const buttonGroup = restoreComponent.shadowRoot.querySelector(
      "#restore-from-backup-button-group"
    );
    Assert.ok(buttonGroup, "Button group should be present");

    const header = restoreComponent.shadowRoot.querySelector(
      "#restore-from-backup-header"
    );
    Assert.ok(!header, "Header should not be present");

    const filePicker = restoreComponent.shadowRoot.querySelector(
      "#backup-filepicker-input"
    );
    const fileSelectButton = restoreComponent.shadowRoot.querySelector(
      "#backup-filepicker-button"
    );
    const confirmButton = restoreComponent.shadowRoot.querySelector(
      "#restore-from-backup-confirm-button"
    );
    Assert.ok(filePicker, "File picker input should be present");
    Assert.ok(fileSelectButton, "File select button should be present");
    Assert.ok(confirmButton, "Confirm button should be present");
    Assert.ok(
      confirmButton.hasAttribute("disabled"),
      "Confirm button should be initially disabled"
    );
  });

  await cleanup();
  await SpecialPowers.popPrefEnv();
  await popPrefs();
  sandbox.restore();
});

// This test does not cover the full end-to-end flow of
// selecting a backup file, and restoring from that backup file.
// Before this is used in production, we need to add tests to
// cover that integration. See Bug 1987736 (https://bugzilla.mozilla.org/show_bug.cgi?id=1987736)
