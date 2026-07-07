/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ERRORS } = ChromeUtils.importESModule(
  "chrome://browser/content/backup/backup-constants.mjs"
);

const SCHEDULED_BACKUPS_ENABLED_PREF = "browser.backup.scheduled.enabled";

async function setup_mockFilePicker(mockParentDir) {
  const dummyFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);

  dummyFile.initWithPath(mockParentDir);
  let filePickerShownPromise = new Promise(resolve => {
    MockFilePicker.showCallback = () => {
      Assert.ok(true, "Filepicker shown");
      MockFilePicker.setFiles([dummyFile]);
      resolve();
    };
  });
  MockFilePicker.returnValue = MockFilePicker.returnOK;

  return { filePickerShownPromise };
}

add_setup(async () => {
  MockFilePicker.init();
  registerCleanupFunction(() => {
    MockFilePicker.cleanup();
  });
});

/**
 * Asserts that the location label and the "choose location" button both point
 * at the file path input that is actually rendered, so the input stays labelled
 * whether the default or custom input is shown.
 *
 * @param {Element} turnOnScheduledBackups the turn-on-scheduled-backups element
 * @param {Element} expectedInput the file path input expected to be rendered
 */
function assertLocationInputLabelled(turnOnScheduledBackups, expectedInput) {
  let shadow = turnOnScheduledBackups.shadowRoot;
  let label = shadow.getElementById("backup-location-label");
  let button = shadow.getElementById("backup-location-filepicker-button");

  Assert.ok(expectedInput, "Expected file path input should be rendered");
  Assert.ok(expectedInput.id, "Rendered file path input should have an id");
  Assert.equal(
    label.getAttribute("for"),
    expectedInput.id,
    "Location label should be associated with the rendered input"
  );
  Assert.equal(
    button.getAttribute("aria-controls"),
    expectedInput.id,
    "Choose location button should control the rendered input"
  );
}

/**
 * Tests that the turn on scheduled backups dialog can set
 * browser.backup.scheduled.enabled to true from the settings page.
 */
add_task(async function test_turn_on_scheduled_backups_confirm() {
  Services.telemetry.clearEvents();
  Services.fog.testResetFOG();

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let settings = await waitForBackupSettings(browser);

    let turnOnButton = settings.scheduledBackupsButtonEl;

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

    let confirmButton = turnOnScheduledBackups.confirmButtonEl;
    let promise = BrowserTestUtils.waitForEvent(
      window,
      "BackupUI:EnableScheduledBackups"
    );

    Assert.ok(confirmButton, "Confirm button should be found");

    confirmButton.click();

    await promise;
    await settings.updateComplete;

    let scheduledPrefVal = Services.prefs.getBoolPref(
      SCHEDULED_BACKUPS_ENABLED_PREF
    );
    Assert.ok(scheduledPrefVal, "Scheduled backups pref should be true");

    let events = Glean.browserBackup.toggleOn.testGetValue();
    Assert.equal(events.length, 1, "Found the toggleOn Glean event.");

    Assert.equal(
      Glean.browserBackup.schedulerToggleSource.testGetValue(),
      "preferences",
      "scheduler_toggle_source is credited to 'preferences' when enabled from the settings page."
    );

    // Reset scheduled backups again for subsequent tests.
    Services.prefs.clearUserPref(SCHEDULED_BACKUPS_ENABLED_PREF);
  });
});

/**
 * Tests that the turn on scheduled backups dialog displays the default input field
 * and a filepicker to choose a custom backup file path, updates the input field to show
 * that path, and sets browser.backup.location to the path from the settings page.
 */
add_task(async function test_turn_on_custom_location_filepicker() {
  Services.telemetry.clearEvents();
  Services.fog.testResetFOG();

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let sandbox = sinon.createSandbox();
    sandbox.stub(BackupService.prototype, "createBackup").resolves(true);

    const mockCustomParentDir = await IOUtils.createUniqueDirectory(
      PathUtils.tempDir,
      "settings-custom-dir-test"
    );

    let { filePickerShownPromise } =
      await setup_mockFilePicker(mockCustomParentDir);

    // After setting up mocks, start testing components
    /** @type {import("../../content/backup-settings.mjs").default} */
    let settings = await waitForBackupSettings(browser);
    let turnOnButton = settings.scheduledBackupsButtonEl;

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

    // First verify the default input value and dir path button
    let filePathInputDefault = turnOnScheduledBackups.filePathInputDefaultEl;
    let filePathButton = turnOnScheduledBackups.filePathButtonEl;
    const documentsPath = BackupService.DEFAULT_PARENT_DIR_PATH;

    Assert.ok(
      filePathInputDefault,
      "Default input for choosing a file path should be found"
    );
    Assert.equal(
      filePathInputDefault.value,
      `${PathUtils.filename(documentsPath)} (recommended)`,
      "Default input displays the expected text"
    );
    Assert.ok(
      filePathButton,
      "Button for choosing a file path should be found"
    );
    assertLocationInputLabelled(turnOnScheduledBackups, filePathInputDefault);

    // Next, verify the filepicker and updated dialog
    let inputUpdatePromise = BrowserTestUtils.waitForCondition(
      () => turnOnScheduledBackups.filePathInputCustomEl
    );

    filePathButton.click();

    await filePickerShownPromise;
    await turnOnScheduledBackups.updateComplete;

    info("Waiting for file path input to update");
    await inputUpdatePromise;
    Assert.ok("Input should have been updated");

    let filePathInputCustom = turnOnScheduledBackups.filePathInputCustomEl;
    Assert.equal(
      filePathInputCustom.value,
      PathUtils.filename(mockCustomParentDir),
      "Input should display file path from filepicker"
    );
    assertLocationInputLabelled(turnOnScheduledBackups, filePathInputCustom);

    // Now close the dialog by confirming choices and verify that backup settings are saved
    let confirmButton = turnOnScheduledBackups.confirmButtonEl;
    Assert.ok(confirmButton, "Confirm button should be found");

    let confirmButtonPromise = BrowserTestUtils.waitForEvent(
      window,
      "BackupUI:EnableScheduledBackups"
    );

    confirmButton.click();

    await confirmButtonPromise;
    await settings.updateComplete;

    // Backup folder should be joined with the updated path
    let locationPrefVal = Services.prefs.getStringPref(
      "browser.backup.location"
    );
    Assert.equal(
      locationPrefVal,
      PathUtils.join(mockCustomParentDir, BackupService.BACKUP_DIR_NAME),
      "Backup location pref should be updated"
    );

    await IOUtils.remove(mockCustomParentDir, {
      ignoreAbsent: true,
      recursive: true,
    });

    let events = Glean.browserBackup.toggleOn.testGetValue();
    Assert.equal(events.length, 1, "Found the toggleOn Glean event.");

    events = Glean.browserBackup.changeLocation.testGetValue();
    Assert.equal(events.length, 1, "Found the changeLocation Glean event.");

    // Reset scheduled backups again for subsequent tests.
    Services.prefs.clearUserPref(SCHEDULED_BACKUPS_ENABLED_PREF);
    sandbox.restore();
  });
});

/**
 * Tests that encryption is enabled after entering a password in the
 * turn-on-scheduled-backups dialog.
 */
add_task(async function test_turn_on_scheduled_backups_encryption() {
  Services.telemetry.clearEvents();
  Services.fog.testResetFOG();

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let sandbox = sinon.createSandbox();
    let settings = await waitForBackupSettings(browser);

    let turnOnButton = settings.scheduledBackupsButtonEl;
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

    let encryptionStub = sandbox
      .stub(BackupService.prototype, "enableEncryption")
      .resolves(true);

    // Enable passwords
    let passwordsCheckbox = turnOnScheduledBackups.passwordOptionsCheckboxEl;
    passwordsCheckbox.click();
    await turnOnScheduledBackups.updateComplete;

    let passwordOptionsExpanded =
      turnOnScheduledBackups.passwordOptionsExpandedEl;
    Assert.ok(passwordOptionsExpanded, "Password inputs should be found");

    let validityPromise = createMockValidityPassEventPromise(
      turnOnScheduledBackups,
      passwordOptionsExpanded,
      "ValidPasswordsDetected"
    );

    // Verify confirm button
    let confirmButton = turnOnScheduledBackups.confirmButtonEl;
    Assert.ok(confirmButton, "Confirm button should be found");
    Assert.ok(confirmButton.disabled, "Confirm button should be disabled");

    let confirmButtonPromise = BrowserTestUtils.waitForMutationCondition(
      confirmButton,
      { attributes: true },
      () => !confirmButton.disabled
    );

    await validityPromise;
    await confirmButtonPromise;

    let promise = BrowserTestUtils.waitForEvent(
      window,
      "BackupUI:EnableScheduledBackups"
    );

    confirmButton.click();

    await promise;
    await settings.updateComplete;

    Assert.ok(
      encryptionStub.calledOnceWith(MOCK_PASSWORD),
      "BackupService was called to enable encryption and received the expected argument"
    );

    let events = Glean.browserBackup.toggleOn.testGetValue();
    Assert.equal(events.length, 1, "Found the toggleOn Glean event.");

    events = Glean.browserBackup.passwordAdded.testGetValue();
    Assert.equal(events.length, 1, "Found the passwordAdded Glean event.");

    sandbox.restore();
    Services.prefs.clearUserPref(SCHEDULED_BACKUPS_ENABLED_PREF);
  });
});

/**
 * Tests that scheduled backups are not enabled if there is an issue with
 * enabling encryption.
 */
add_task(async function test_turn_on_scheduled_backups_encryption_error() {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let sandbox = sinon.createSandbox();
    let settings = await waitForBackupSettings(browser);

    let turnOnButton = settings.scheduledBackupsButtonEl;
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

    let encryptionStub = sandbox
      .stub(BackupService.prototype, "enableEncryption")
      .throws(new Error("test error", { cause: ERRORS.INVALID_PASSWORD }));

    // Enable passwords
    let passwordsCheckbox = turnOnScheduledBackups.passwordOptionsCheckboxEl;
    passwordsCheckbox.click();
    await turnOnScheduledBackups.updateComplete;

    let passwordOptionsExpanded =
      turnOnScheduledBackups.passwordOptionsExpandedEl;

    Assert.ok(
      passwordOptionsExpanded,
      "Passwords expanded options should be found"
    );

    let validityPromise = createMockValidityPassEventPromise(
      turnOnScheduledBackups,
      passwordOptionsExpanded,
      "ValidPasswordsDetected"
    );

    // Verify confirm button
    let confirmButton = turnOnScheduledBackups.confirmButtonEl;
    Assert.ok(confirmButton, "Confirm button should be found");
    Assert.ok(confirmButton.disabled, "Confirm button should be disabled");

    let confirmButtonPromise = BrowserTestUtils.waitForMutationCondition(
      confirmButton,
      { attributes: true },
      () => !confirmButton.disabled
    );

    await validityPromise;
    await confirmButtonPromise;

    let promise = BrowserTestUtils.waitForEvent(
      window,
      "BackupUI:EnableScheduledBackups"
    );

    confirmButton.click();

    await promise;
    await settings.updateComplete;

    Assert.ok(
      encryptionStub.threw(),
      "BackupService threw an error during encryption"
    );

    // Ensure that the scheduled backups pref is not updated.
    let scheduledPrefVal = Services.prefs.getBoolPref(
      SCHEDULED_BACKUPS_ENABLED_PREF
    );
    Assert.ok(
      !scheduledPrefVal,
      "Scheduled backups pref should still be false"
    );

    await BrowserTestUtils.waitForCondition(
      () => !!turnOnScheduledBackups.errorEl,
      "Error should be displayed to the user"
    );

    Assert.ok(
      turnOnScheduledBackups.errorEl,
      "Error should be displayed to the user"
    );

    sandbox.restore();
    Services.prefs.clearUserPref(SCHEDULED_BACKUPS_ENABLED_PREF);
  });
});

/**
 * Tests that the password boxes are cleared if the dialog is closed by JS.
 */
add_task(async function test_turn_on_scheduled_backups_encryption_error() {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let settings = await waitForBackupSettings(browser);

    let turnOnButton = settings.scheduledBackupsButtonEl;
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

    // Enable passwords
    let passwordsCheckbox = turnOnScheduledBackups.passwordOptionsCheckboxEl;
    passwordsCheckbox.click();
    await turnOnScheduledBackups.updateComplete;

    let passwordOptionsExpanded =
      turnOnScheduledBackups.passwordOptionsExpandedEl;

    Assert.ok(
      passwordOptionsExpanded,
      "Passwords expanded options should be found"
    );

    passwordOptionsExpanded.inputNewPasswordEl.value = "firefox"; // secret!!
    passwordOptionsExpanded.inputNewPasswordEl.revealPassword = true;
    passwordOptionsExpanded.inputRepeatPasswordEl.value = "www1989";
    passwordOptionsExpanded.inputRepeatPasswordEl.revealPassword = true;

    let dialog = settings.turnOnScheduledBackupsDialogEl;
    let closedPromise = BrowserTestUtils.waitForEvent(dialog, "close");
    dialog.close();
    await closedPromise;

    is(
      passwordOptionsExpanded.inputNewPasswordEl.value,
      "",
      "New password field should be cleared"
    );
    is(
      passwordOptionsExpanded.inputRepeatPasswordEl.value,
      "",
      "Repeat password field should be cleared"
    );
    is(
      passwordOptionsExpanded.inputNewPasswordEl.revealPassword,
      false,
      "New password field should not be revealed"
    );
    is(
      passwordOptionsExpanded.inputRepeatPasswordEl.revealPassword,
      false,
      "Repeat password field should not be revealed"
    );
  });
});

/**
 * Tests that confirming the dialog without choosing a custom folder does not
 * change the backup location pref.
 */
add_task(async function test_default_location_selected() {
  const INITIAL_LOCATION = "backup dir path";
  await SpecialPowers.pushPrefEnv({
    set: [["browser.backup.location", INITIAL_LOCATION]],
  });

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let settings = await waitForBackupSettings(browser);

    let turnOnButton = settings.scheduledBackupsButtonEl;
    turnOnButton.click();
    await settings.updateComplete;

    let turnOnScheduledBackups = settings.turnOnScheduledBackupsEl;

    let promise = BrowserTestUtils.waitForEvent(
      window,
      "BackupUI:EnableScheduledBackups"
    );
    turnOnScheduledBackups.confirmButtonEl.click();
    await promise;
    await settings.updateComplete;

    let locationPrefVal = Services.prefs.getStringPref(
      "browser.backup.location"
    );
    Assert.equal(
      locationPrefVal,
      INITIAL_LOCATION,
      "Backup location pref should not change when no custom folder is chosen"
    );
  });

  Services.prefs.clearUserPref(SCHEDULED_BACKUPS_ENABLED_PREF);
  await SpecialPowers.popPrefEnv();
});

async function waitInitialRequestStateSettled() {
  // restore-from-backup.mjs is rendered quite late during the load.
  // Bug 543435 caused a timing change such that withNewTab resolves right after
  // that component dispatches BackupUI:InitWidget. So BackupUIParent hasn't yet
  // received RequestState. If the RequestState / StateUpdate happens during the test
  // that can mess things up, so wait a tick. See bug 2001583
  await new Promise(res => setTimeout(res));
}

/**
 * Tests that the persistent data for embedded components is set when a user picks a file
 * and is flushed once backup is enabled.
 */
add_task(async function test_embedded_component_persistent_data_filepicker() {
  await SpecialPowers.pushPrefEnv({
    set: [[SCHEDULED_BACKUPS_ENABLED_PREF, false]],
  });

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    await waitInitialRequestStateSettled();
    const mockCustomParentDir = await IOUtils.createUniqueDirectory(
      PathUtils.tempDir,
      "our-dummy-folder"
    );
    let { filePickerShownPromise } =
      await setup_mockFilePicker(mockCustomParentDir);

    let settings = await waitForBackupSettings(browser);
    let turnOnButton = settings.scheduledBackupsButtonEl;

    Assert.ok(
      turnOnButton,
      "Button to turn on scheduled backups should be found"
    );

    turnOnButton.click();

    await settings.updateComplete;
    let turnOnScheduledBackups = settings.turnOnScheduledBackupsEl;

    // for the purposes of this test, we will act like we are an embedded component
    turnOnScheduledBackups.embeddedFxBackupOptIn = true;

    // First verify the default input value and dir path button
    let filePathButton = turnOnScheduledBackups.filePathButtonEl;
    Assert.ok(
      filePathButton,
      "Button for choosing a file path should be found"
    );
    filePathButton.click();

    await filePickerShownPromise;
    await turnOnScheduledBackups.updateComplete;

    await BrowserTestUtils.waitForCondition(
      () =>
        settings.backupServiceState.embeddedComponentPersistentData?.path !==
        undefined,
      "Waiting for persistent path to be set"
    );

    Assert.equal(
      settings.backupServiceState.embeddedComponentPersistentData.path,
      mockCustomParentDir,
      "Our persistent path should be set correctly"
    );

    // Let's create a backup
    let confirmButton = turnOnScheduledBackups.confirmButtonEl;
    let promise = BrowserTestUtils.waitForEvent(
      window,
      "BackupUI:EnableScheduledBackups"
    );

    Assert.ok(confirmButton, "Confirm button should be found");

    confirmButton.click();

    await promise;
    await settings.updateComplete;
  });

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let settings = await waitForBackupSettings(browser);

    Assert.deepEqual(
      settings.backupServiceState.embeddedComponentPersistentData,
      {},
      "Our persistent path should be flushed"
    );
  });

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_create_backup_on_enable() {
  await SpecialPowers.pushPrefEnv({
    set: [[SCHEDULED_BACKUPS_ENABLED_PREF, false]],
  });

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    await waitInitialRequestStateSettled();
    let sandbox = sinon.createSandbox();
    let createBackupStub = sandbox.stub(
      BackupService.prototype,
      "createBackup"
    );

    let { promise: backupCreatedPromise, resolve } = Promise.withResolvers();

    createBackupStub.callsFake(async args => {
      if (args?.reason === "first") {
        resolve();
      }
      return true;
    });

    let settings = await waitForBackupSettings(browser);
    let turnOnButton = settings.scheduledBackupsButtonEl;

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

    let confirmButton = turnOnScheduledBackups.confirmButtonEl;
    let enableScheduledPromise = BrowserTestUtils.waitForEvent(
      window,
      "BackupUI:EnableScheduledBackups"
    );

    Assert.ok(confirmButton, "Confirm button should be found");

    confirmButton.click();

    await enableScheduledPromise;
    await backupCreatedPromise;
    await settings.updateComplete;
    Assert.ok(
      true,
      "createBackup was triggered immediately with reason 'first'"
    );

    sandbox.restore();
  });

  await SpecialPowers.popPrefEnv();
});

/**
 * Tests that the persistent data for embedded components is flushed if the dialog is cancelled
 */
add_task(
  async function test_embedded_component_persistent_data_filepicker_cancelled() {
    await SpecialPowers.pushPrefEnv({
      set: [[SCHEDULED_BACKUPS_ENABLED_PREF, false]],
    });

    await BrowserTestUtils.withNewTab(
      "about:preferences#sync",
      async browser => {
        await waitInitialRequestStateSettled();
        // Since we also a trigger a createBackup, there might be a bunch of state updates that we don't
        // want to wait for, let's just stub the createBackup calls to avoid unexpected testing behavior
        let sandbox = sinon.createSandbox();
        sandbox.stub(BackupService.prototype, "createBackup").resolves(true);

        const mockCustomParentDir = await IOUtils.createUniqueDirectory(
          PathUtils.tempDir,
          "our-dummy-folder"
        );
        let { filePickerShownPromise } =
          await setup_mockFilePicker(mockCustomParentDir);

        let settings = await waitForBackupSettings(browser);
        let turnOnButton = settings.scheduledBackupsButtonEl;

        Assert.ok(
          turnOnButton,
          "Button to turn on scheduled backups should be found"
        );

        turnOnButton.click();

        await settings.updateComplete;
        let turnOnScheduledBackups = settings.turnOnScheduledBackupsEl;

        // for the purposes of this test, we will act like we are an embedded component
        turnOnScheduledBackups.embeddedFxBackupOptIn = true;

        // First verify the default input value and dir path button
        let filePathButton = turnOnScheduledBackups.filePathButtonEl;

        Assert.ok(
          filePathButton,
          "Button for choosing a file path should be found"
        );
        filePathButton.click();

        await filePickerShownPromise;
        await turnOnScheduledBackups.updateComplete;

        await BrowserTestUtils.waitForCondition(
          () =>
            settings.backupServiceState.embeddedComponentPersistentData
              ?.path !== undefined,
          "Waiting for persistent path to be set"
        );

        Assert.equal(
          settings.backupServiceState.embeddedComponentPersistentData.path,
          mockCustomParentDir,
          "Our persistent path should be set correctly"
        );

        let dialog = settings.turnOnScheduledBackupsDialogEl;
        let closedPromise = BrowserTestUtils.waitForEvent(dialog, "close");
        dialog.close();
        await closedPromise;

        await BrowserTestUtils.waitForCondition(
          () =>
            Object.keys(
              settings.backupServiceState.embeddedComponentPersistentData
            ).length === 0,
          "Waiting for persistent data to be flushed"
        );

        Assert.deepEqual(
          settings.backupServiceState.embeddedComponentPersistentData,
          {},
          "Our persistent path should be flushed"
        );

        sandbox.restore();
      }
    );

    await SpecialPowers.popPrefEnv();
  }
);

/**
 * Tests that EnableScheduledBackups returns an error if no backup directory
 * path has been set.
 */
add_task(async function test_enable_fails_without_backup_dir() {
  await SpecialPowers.pushPrefEnv({
    set: [[SCHEDULED_BACKUPS_ENABLED_PREF, false]],
  });

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let sandbox = sinon.createSandbox();
    let bs = getAndMaybeInitBackupService();

    let originalState = bs.state;
    sandbox.stub(bs, "state").get(() => ({
      ...originalState,
      backupDirPath: "",
    }));

    let settings = await waitForBackupSettings(browser);
    await settings.updateComplete;

    let turnOnButton = settings.scheduledBackupsButtonEl;
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

    let confirmButton = turnOnScheduledBackups.confirmButtonEl;
    let enablePromise = BrowserTestUtils.waitForEvent(
      window,
      "BackupUI:EnableScheduledBackups"
    );
    confirmButton.click();
    await enablePromise;

    await TestUtils.waitForCondition(
      () => turnOnScheduledBackups.enableBackupErrorCode,
      "Waiting for error code to be set on component"
    );

    Assert.equal(
      turnOnScheduledBackups.enableBackupErrorCode,
      ERRORS.UNKNOWN,
      "Error code should be set when no backup dir path exists."
    );

    sandbox.restore();
  });

  await SpecialPowers.popPrefEnv();
});
