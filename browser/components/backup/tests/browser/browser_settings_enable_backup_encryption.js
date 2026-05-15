/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const SCHEDULED_BACKUPS_ENABLED_PREF = "browser.backup.scheduled.enabled";

/**
 * Tests that the enable-backup-encryption dialog can enable encryption
 * from the settings page via the toggle checkbox.
 */
add_task(async function test_enable_backup_encryption_checkbox_confirm() {
  Services.telemetry.clearEvents();
  Services.fog.testResetFOG();

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let sandbox = sinon.createSandbox();
    let enableEncryptionStub = sandbox
      .stub(BackupService.prototype, "enableEncryption")
      .resolves(true);
    let createBackupStub = sandbox
      .stub(BackupService.prototype, "createBackup")
      .resolves(true);

    await SpecialPowers.pushPrefEnv({
      set: [[SCHEDULED_BACKUPS_ENABLED_PREF, true]],
    });

    let settings = browser.contentDocument.querySelector("backup-settings");

    /**
     * For this test, we can pretend that browser-settings receives a backupServiceState
     * with encryptionEnable set to false. Normally, Lit only detects reactive property updates if a
     * property's reference changes (ex. completely replace backupServiceState with a new object),
     * which we actually do after calling BackupService.stateUpdate() and BackupUIParent.sendState().
     *
     * Since we only care about encryptionEnabled, we can just call Lit's requestUpdate() to force
     * the update explicitly.
     */
    settings.backupServiceState.encryptionEnabled = false;
    await settings.requestUpdate();
    await settings.updateComplete;

    let sensitiveDataCheckbox = settings.sensitiveDataCheckboxInputEl;
    Assert.ok(sensitiveDataCheckbox, "Sensitive data checkbox should be found");
    Assert.ok(
      !sensitiveDataCheckbox.checked,
      "Sensitive data checkbox should not be checked"
    );

    sensitiveDataCheckbox.click();
    await settings.updateComplete;

    let enableBackupEncryptionDialog = settings.enableBackupEncryptionDialogEl;
    Assert.ok(
      enableBackupEncryptionDialog?.open,
      "enable-backup-encryption-dialog should be open"
    );

    let enableBackupEncryption = settings.enableBackupEncryptionEl;
    Assert.ok(
      enableBackupEncryption,
      "enable-backup-encryption should be found"
    );
    Assert.equal(
      enableBackupEncryption.type,
      "set-password",
      "enable-backup-encryption type should be set-password"
    );

    let passwordInputs = enableBackupEncryption.passwordInputsEl;
    Assert.ok(passwordInputs, "password-validation-inputs should be found");

    let confirmButton = enableBackupEncryption.confirmButtonEl;
    Assert.ok(confirmButton, "Confirm button should be found");
    Assert.ok(confirmButton.disabled, "Confirm button should be disabled");

    // Pretend we have a valid password
    let validPromise = createMockValidityPassEventPromise(
      enableBackupEncryption,
      passwordInputs,
      "ValidPasswordsDetected"
    );

    let confirmButtonPromise = BrowserTestUtils.waitForMutationCondition(
      confirmButton,
      { attributes: true },
      () => !confirmButton.disabled
    );

    await validPromise;
    await confirmButtonPromise;
    ok(!confirmButton.disabled, "Confirm button should no longer be disabled");

    await settings.updateComplete;
    confirmButton = settings.enableBackupEncryptionEl.confirmButtonEl;

    let encryptionPromise = BrowserTestUtils.waitForEvent(
      window,
      "BackupUI:EnableEncryption"
    );

    confirmButton.click();
    await encryptionPromise;

    Assert.ok(
      enableEncryptionStub.calledOnceWith(MOCK_PASSWORD),
      "BackupService was called to enable encryption with inputted password"
    );

    Assert.ok(
      createBackupStub.calledOnce,
      "BackupService was called to create a new backup"
    );
    Assert.equal(
      createBackupStub.firstCall.args[0].reason,
      "encryption",
      "Backup reason is set"
    );

    let legacyEvents = TelemetryTestUtils.getEvents(
      {
        category: "browser.backup",
        method: "password_added",
        object: "BackupService",
      },
      { process: "parent" }
    );
    Assert.equal(
      legacyEvents.length,
      1,
      "Found the password_added legacy event."
    );
    let events = Glean.browserBackup.passwordAdded.testGetValue();
    Assert.equal(events.length, 1, "Found the passwordAdded Glean event.");

    await SpecialPowers.popPrefEnv();
    sandbox.restore();
  });
});

/**
 * Tests that the enable-backup-encryption dialog can enable encryption
 * from the settings page via the change password button.
 */
add_task(
  async function test_enable_backup_encryption_change_password_confirm() {
    Services.telemetry.clearEvents();
    Services.fog.testResetFOG();

    await BrowserTestUtils.withNewTab(
      "about:preferences#sync",
      async browser => {
        let sandbox = sinon.createSandbox();
        let enableEncryptionStub = sandbox
          .stub(BackupService.prototype, "enableEncryption")
          .resolves(true);
        let createBackupStub = sandbox
          .stub(BackupService.prototype, "createBackup")
          .resolves(true);

        await SpecialPowers.pushPrefEnv({
          set: [[SCHEDULED_BACKUPS_ENABLED_PREF, true]],
        });

        let settings = browser.contentDocument.querySelector("backup-settings");
        settings.backupServiceState.encryptionEnabled = true;
        await settings.requestUpdate();
        await settings.updateComplete;

        let changePasswordButton = settings.changePasswordButtonEl;
        Assert.ok(
          changePasswordButton,
          "Change password button should be found"
        );

        changePasswordButton.click();
        await settings.updateComplete;

        let enableBackupEncryptionDialog =
          settings.enableBackupEncryptionDialogEl;
        Assert.ok(
          enableBackupEncryptionDialog?.open,
          "enable-backup-encryption-dialog should be open"
        );

        let enableBackupEncryption = settings.enableBackupEncryptionEl;
        Assert.ok(
          enableBackupEncryption,
          "enable-backup-encryption should be found"
        );
        Assert.equal(
          enableBackupEncryption.type,
          "change-password",
          "enable-backup-encryption type should be change-password"
        );

        let passwordInputs = enableBackupEncryption.passwordInputsEl;
        Assert.ok(passwordInputs, "password-validation-inputs should be found");

        let confirmButton = enableBackupEncryption.confirmButtonEl;
        Assert.ok(confirmButton, "Confirm button should be found");
        Assert.ok(confirmButton.disabled, "Confirm button should be disabled");

        // Pretend we have a valid password
        let validPromise = createMockValidityPassEventPromise(
          enableBackupEncryption,
          passwordInputs,
          "ValidPasswordsDetected"
        );

        let confirmButtonPromise = BrowserTestUtils.waitForMutationCondition(
          confirmButton,
          { attributes: true },
          () => !confirmButton.disabled
        );

        await validPromise;
        await confirmButtonPromise;
        ok(
          !confirmButton.disabled,
          "Confirm button should no longer be disabled"
        );

        await settings.updateComplete;
        confirmButton = settings.enableBackupEncryptionEl.confirmButtonEl;

        let initialState = BackupService.get().state;
        sandbox.stub(BackupService.get(), "state").get(() => ({
          ...initialState,
          encryptionEnabled: true,
        }));

        let promise = BrowserTestUtils.waitForEvent(
          window,
          "BackupUI:EnableEncryption"
        );
        confirmButton.click();
        await promise;

        Assert.ok(
          enableEncryptionStub.calledOnceWith(MOCK_PASSWORD),
          "BackupService was called to re-run encryption with changed password"
        );
        Assert.ok(
          createBackupStub.calledOnceWith({ reason: "encryption" }),
          "A new backup was started for the right reason"
        );

        let legacyEvents = TelemetryTestUtils.getEvents(
          {
            category: "browser.backup",
            method: "password_changed",
            object: "BackupService",
          },
          { process: "parent" }
        );
        Assert.equal(
          legacyEvents.length,
          1,
          "Found the password_changed legacy event."
        );
        let events = Glean.browserBackup.passwordChanged.testGetValue();
        Assert.equal(
          events.length,
          1,
          "Found the passwordChanged Glean event."
        );

        await SpecialPowers.popPrefEnv();
        sandbox.restore();
      }
    );
  }
);

/**
 * Tests that the password boxes are cleared if the dialog is closed by JS.
 */
add_task(async function test_turn_on_scheduled_backups_encryption_error() {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let settings = browser.contentDocument.querySelector("backup-settings");

    await SpecialPowers.pushPrefEnv({
      set: [[SCHEDULED_BACKUPS_ENABLED_PREF, true]],
    });

    settings.backupServiceState.encryptionEnabled = false;
    await settings.requestUpdate();
    await settings.updateComplete;

    let turnOnButton = settings.sensitiveDataCheckboxInputEl;
    turnOnButton.click();
    await settings.updateComplete;

    let enableBackupEncryption = settings.enableBackupEncryptionEl;
    let passwordOptionsExpanded = enableBackupEncryption.passwordInputsEl;

    Assert.ok(
      passwordOptionsExpanded,
      "Passwords expanded options should be found"
    );

    passwordOptionsExpanded.inputNewPasswordEl.value = "firefox"; // secret!!
    passwordOptionsExpanded.inputNewPasswordEl.revealPassword = true;
    passwordOptionsExpanded.inputRepeatPasswordEl.value = "www1989";
    passwordOptionsExpanded.inputRepeatPasswordEl.revealPassword = true;

    let dialog = settings.enableBackupEncryptionDialogEl;
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

    await SpecialPowers.popPrefEnv();
  });
});
