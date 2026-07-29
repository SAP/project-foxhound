/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ERRORS } = ChromeUtils.importESModule(
  "chrome://browser/content/backup/backup-constants.mjs"
);

let TEST_PROFILE_PATH;

add_setup(async () => {
  MockFilePicker.init();
  TEST_PROFILE_PATH = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "testBackup"
  );

  await SpecialPowers.pushPrefEnv({
    set: [["browser.backup.location", TEST_PROFILE_PATH]],
  });

  // It's possible for other tests to change the internal state of the BackupService
  // which can lead to complications with the auto detection behaviour. Let's just reset
  // these states before testing
  let bs = getAndMaybeInitBackupService();
  bs.resetLastBackupInternalState();

  registerCleanupFunction(async () => {
    MockFilePicker.cleanup();
  });
});

/**
 * Gets most of the widgets that are used during tests.
 *
 * In addition to avoiding some boilerplate, this ensures that the first state
 * update has been delivered. If we didn't wait, there'd be a timing problem;
 * see bug 2001583 for more information.
 *
 * @param {Browser} browser
 *   The XUL browser containing the preferences page.
 * @returns {{restoreFromBackup:HTMLElement, settings:HTMLElement}}
 *   Relevant widgets on the backup settings page.
 */
async function initializedBackupWidgets(browser) {
  // We have to end up using waitForCondition because of the racy nature
  // of the state updates sent from the backupService. At some point, we should
  // add a way to verifiably know when the backup settings items are available.
  await TestUtils.waitForCondition(
    () => browser.contentDocument.querySelector("backup-settings"),
    "Waiting for backup-settings element to be in the DOM"
  );
  let settings = browser.contentDocument.querySelector("backup-settings");

  await TestUtils.waitForCondition(
    () => settings.restoreFromBackupButtonEl,
    "Waiting for restore from backup button to show up"
  );

  settings.restoreFromBackupButtonEl.click();

  await TestUtils.waitForCondition(
    () => settings.restoreFromBackupEl,
    "Waiting for restore-from-backup element to show up"
  );
  let restoreFromBackup = settings.restoreFromBackupEl;
  await restoreFromBackup.initializedPromise;
  return {
    restoreFromBackup,
    settings,
  };
}

/**
 * Tests for when the user specifies an invalid backup file to restore.
 */
add_task(async function test_backup_failure() {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    const mockBackupFilePath = await IOUtils.createUniqueFile(
      TEST_PROFILE_PATH,
      "backup.html"
    );
    const mockBackupFile = Cc["@mozilla.org/file/local;1"].createInstance(
      Ci.nsIFile
    );
    mockBackupFile.initWithPath(mockBackupFilePath);
    let sandbox = sinon.createSandbox();
    let bs = getAndMaybeInitBackupService();

    sandbox.stub(bs, "findBackupsInWellKnownLocations").resolves({
      found: false,
      backupFileToRestore: null,
      multipleBackupsFound: false,
    });

    MockFilePicker.showCallback = () => {
      Assert.ok(true, "Filepicker shown");
      MockFilePicker.setFiles([mockBackupFile]);
    };
    MockFilePicker.returnValue = MockFilePicker.returnOK;

    let { restoreFromBackup } = await initializedBackupWidgets(browser);
    Services.fog.testResetFOG();
    let stateUpdatedPromise = TestUtils.topicObserved(
      "browser-backup-glean-sent"
    );
    restoreFromBackup.chooseButtonEl.click();
    await stateUpdatedPromise;

    const restoreEvents = Glean.browserBackup.restoreFileChosen.testGetValue();
    Assert.equal(
      restoreEvents?.length,
      1,
      "Should be 1 restore file chosen telemetry event"
    );
    Assert.deepEqual(
      restoreEvents[0].extra,
      { location: "other", valid: "false" },
      "Restore telemetry event should have the right data"
    );
    sandbox.restore();
  });
});

/**
 * Tests that the a backup file can be restored from the settings page.
 */
add_task(async function test_restore_from_backup() {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    // Info about our mock backup
    const date = new Date().getTime();
    const deviceName = "test-device";
    const isEncrypted = true;
    const appName = "test-app-name";
    const appVersion = "test-app-version";
    const buildID = "test-build-id";
    const osName = "test-os-name";
    const osVersion = "test-os-version";
    const healthTelemetryEnabled = true;
    const restoreID = Services.uuid.generateUUID().toString();

    const mockBackupFilePath = await IOUtils.createUniqueFile(
      TEST_PROFILE_PATH,
      "backup.html"
    );
    const mockBackupFile = Cc["@mozilla.org/file/local;1"].createInstance(
      Ci.nsIFile
    );
    mockBackupFile.initWithPath(mockBackupFilePath);

    const mockBackupState = {
      ...BackupService.get().state,
      backupFileInfo: {
        date,
        deviceName,
        isEncrypted,
        appName,
        appVersion,
        buildID,
        osName,
        osVersion,
        healthTelemetryEnabled,
      },
      backupFileToRestore: mockBackupFilePath,
      backupFileCoarseLocation: "other",
      restoreID,
      recoveryErrorCode: ERRORS.NONE,
    };

    let sandbox = sinon.createSandbox();
    let recoverFromBackupArchiveStub = sandbox
      .stub(BackupService.prototype, "recoverFromBackupArchive")
      .resolves();
    sandbox.stub(BackupService.get(), "state").get(() => mockBackupState);

    MockFilePicker.showCallback = () => {
      Assert.ok(true, "Filepicker shown");
      MockFilePicker.setFiles([mockBackupFile]);
    };
    MockFilePicker.returnValue = MockFilePicker.returnOK;

    let quitObservedPromise = TestUtils.topicObserved(
      "quit-application-requested",
      subject => {
        let cancelQuit = subject.QueryInterface(Ci.nsISupportsPRBool);
        cancelQuit.data = true;
        return true;
      }
    );

    let { restoreFromBackup } = await initializedBackupWidgets(browser);
    Services.fog.testResetFOG();

    let stateUpdatedPromise = TestUtils.topicObserved(
      "browser-backup-glean-sent"
    );
    restoreFromBackup.chooseButtonEl.click();
    await stateUpdatedPromise;

    const restoreEvents = Glean.browserBackup.restoreFileChosen.testGetValue();
    Assert.equal(
      restoreEvents?.length,
      1,
      "Should be 1 restore file chosen telemetry event"
    );
    Assert.deepEqual(
      restoreEvents[0].extra,
      {
        location: "other",
        valid: "true",
        backup_timestamp: date.toString(),
        restore_id: restoreID,
        encryption: isEncrypted.toString(),
        app_name: appName,
        version: appVersion,
        build_id: buildID,
        os_name: osName,
        os_version: osVersion,
        telemetry_enabled: healthTelemetryEnabled.toString(),
      },
      "Restore telemetry event should have the right data"
    );

    // Set password for file
    restoreFromBackup.passwordInput.value = "h-*@Vfge3_hGxdpwqr@w";

    let restorePromise = BrowserTestUtils.waitForEvent(
      window,
      "BackupUI:RestoreFromBackupFile"
    );

    Assert.ok(
      restoreFromBackup.confirmButtonEl,
      "Confirm button should be found"
    );
    Assert.ok(
      !restoreFromBackup.confirmButtonEl.disabled,
      "Confirm button should not be disabled"
    );

    await restoreFromBackup.updateComplete;
    restoreFromBackup.confirmButtonEl.click();

    await restorePromise.then(e => {
      Assert.equal(
        e.detail.backupPassword,
        "h-*@Vfge3_hGxdpwqr@w",
        "Event should contain the password"
      );
      Assert.equal(
        e.detail.restoreType,
        "add",
        "restoreType should default to 'add'"
      );
    });

    await quitObservedPromise;

    Assert.ok(
      recoverFromBackupArchiveStub.calledOnce,
      "BackupService was called to start a recovery from a backup archive."
    );

    sandbox.restore();
  });
});

/**
 * Tests that the backup file chooser starts at the correct folder.
 */
add_task(async function test_restore_uses_matching_initial_folder() {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    const mockBackupFilePath = await IOUtils.createUniqueFile(
      TEST_PROFILE_PATH,
      "backup.html"
    );

    const mockBackupFile = Cc["@mozilla.org/file/local;1"].createInstance(
      Ci.nsIFile
    );
    mockBackupFile.initWithPath(mockBackupFilePath);

    let filePickerShownPromise = new Promise(resolve => {
      MockFilePicker.showCallback = async picker => {
        Assert.equal(
          picker.displayDirectory.path,
          TEST_PROFILE_PATH,
          "Folder containing backup was shown"
        );
        MockFilePicker.setFiles([mockBackupFile]);
        resolve();
      };
    });
    MockFilePicker.returnValue = MockFilePicker.returnOK;

    let { restoreFromBackup, settings } =
      await initializedBackupWidgets(browser);
    let selectedFilePromise = BrowserTestUtils.waitForEvent(
      settings,
      "BackupUI:SelectNewFilepickerPath"
    ).then(() =>
      BrowserTestUtils.waitForEvent(
        restoreFromBackup,
        "BackupUI:StateWasUpdated"
      )
    );

    restoreFromBackup.backupServiceState.backupFileToRestore =
      mockBackupFilePath;
    restoreFromBackup.chooseButtonEl.click();

    await filePickerShownPromise;
    await selectedFilePromise;
  });
});

/**
 * Tests that the dialog stays open while restoring from the settings page.
 */
add_task(async function test_restore_in_progress() {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let sandbox = sinon.createSandbox();
    let bs = getAndMaybeInitBackupService();
    bs.resetLastBackupInternalState();

    let { promise: recoverPromise, resolve: recoverResolve } =
      Promise.withResolvers();
    let recoverFromBackupArchiveStub = sandbox
      .stub(bs, "recoverFromBackupArchive")
      .returns(recoverPromise);

    let quitObservedPromise = TestUtils.topicObserved(
      "quit-application-requested",
      subject => {
        let cancelQuit = subject.QueryInterface(Ci.nsISupportsPRBool);
        cancelQuit.data = true;
        return true;
      }
    );

    let { restoreFromBackup, settings } =
      await initializedBackupWidgets(browser);

    // There is a backup file, but it is not a valid one
    // we don't automatically pick it
    Assert.ok(
      restoreFromBackup.confirmButtonEl.disabled,
      "Confirm button should be disabled."
    );

    const mockBackupFilePath = await IOUtils.createUniqueFile(
      PathUtils.tempDir,
      "backup.html"
    );

    let originalState = bs.state;
    sandbox.stub(bs, "state").get(() => ({
      ...originalState,
      backupFileToRestore: mockBackupFilePath,
      backupFileInfo: {
        date: new Date(0),
      },
    }));

    restoreFromBackup.backupServiceState = {
      ...restoreFromBackup.backupServiceState,
      backupFileToRestore: mockBackupFilePath,
      backupFileInfo: {
        date: new Date(0),
      },
    };
    await restoreFromBackup.updateComplete;

    Assert.ok(
      !restoreFromBackup.confirmButtonEl.disabled,
      "Confirm button should not be disabled."
    );
    Assert.equal(
      restoreFromBackup.confirmButtonEl.getAttribute("data-l10n-id"),
      "restore-from-backup-confirm-button",
      "Confirm button should show confirm message."
    );

    let restorePromise = BrowserTestUtils.waitForEvent(
      window,
      "BackupUI:RestoreFromBackupFile"
    );

    restoreFromBackup.confirmButtonEl.click();
    await restorePromise;

    restoreFromBackup.backupServiceState = {
      ...restoreFromBackup.backupServiceState,
      recoveryInProgress: true,
    };
    // Re-render since we've manually changed the component's state
    await restoreFromBackup.requestUpdate();
    await restoreFromBackup.updateComplete;

    Assert.ok(
      settings.restoreFromBackupDialogEl.open,
      "Restore dialog should still be open."
    );

    Assert.ok(
      restoreFromBackup.confirmButtonEl.disabled,
      "Confirm button should be disabled."
    );

    Assert.equal(
      restoreFromBackup.confirmButtonEl.getAttribute("data-l10n-id"),
      "restore-from-backup-restoring-button",
      "Confirm button should show restoring message."
    );

    Assert.ok(
      recoverFromBackupArchiveStub.calledOnce,
      "BackupService was called to start a recovery from a backup archive."
    );

    // Now cause recovery to resolve.
    recoverResolve();
    // Wait a tick of the event loop to let the BackupUIParent respond to
    // the promise resolution, and to send its message to the BackupUIChild.
    await TestUtils.waitForTick();
    // Wait a second tick to let the BackupUIChild respond to the message
    // from BackupUIParent.
    await TestUtils.waitForTick();

    await settings.updateComplete;

    Assert.ok(
      !settings.restoreFromBackupDialogEl.open,
      "Restore dialog should now be closed."
    );

    await quitObservedPromise;

    sandbox.restore();
  });
});

add_task(async function test_restore_fails_without_backup_in_state() {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let sandbox = sinon.createSandbox();
    let bs = getAndMaybeInitBackupService();

    let recoverStub = sandbox.stub(bs, "recoverFromBackupArchive").resolves();

    let originalState = bs.state;
    sandbox.stub(bs, "state").get(() => ({
      ...originalState,
      backupFileToRestore: null,
    }));

    let { restoreFromBackup, settings } =
      await initializedBackupWidgets(browser);

    restoreFromBackup.backupServiceState = {
      ...restoreFromBackup.backupServiceState,
      backupFileToRestore: "/fake/path.html",
      backupFileInfo: { date: new Date() },
    };
    await restoreFromBackup.updateComplete;

    Assert.ok(
      !restoreFromBackup.confirmButtonEl.disabled,
      "Confirm button should not be disabled."
    );

    let restorePromise = BrowserTestUtils.waitForEvent(
      window,
      "BackupUI:RestoreFromBackupFile"
    );
    restoreFromBackup.confirmButtonEl.click();
    await restorePromise;

    Assert.ok(
      !recoverStub.called,
      "recoverFromBackupArchive should not be called when state has no backup file."
    );
    Assert.ok(
      settings.restoreFromBackupDialogEl.open,
      "Restore dialog should still be open."
    );

    sandbox.restore();
  });
});

add_task(async function test_restore_from_backup_prefills_prior_valid_backup() {
  let dir = await IOUtils.createUniqueDirectory(
    TEST_PROFILE_PATH,
    "backup-dir"
  );
  await SpecialPowers.pushPrefEnv({
    set: [["browser.backup.location", dir]],
  });
  let { archivePath: path } = await BackupService.get().createBackup({
    profilePath: TEST_PROFILE_PATH,
  });
  await SpecialPowers.popPrefEnv();

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let { restoreFromBackup } = await initializedBackupWidgets(browser);

    let mockBackupFile = await IOUtils.getFile(path);
    MockFilePicker.showCallback = () => {
      Assert.ok(true, "Filepicker shown");
      MockFilePicker.setFiles([mockBackupFile]);
    };
    MockFilePicker.returnValue = MockFilePicker.returnOK;

    let selectedFilePromise = BrowserTestUtils.waitForEvent(
      restoreFromBackup,
      "BackupUI:SelectNewFilepickerPath"
    );
    restoreFromBackup.chooseButtonEl.click();
    await selectedFilePromise;

    // Wait for the state to reflect the newly selected file. We can't
    // simply wait for the next BackupUI:StateWasUpdated because a stale
    // loadBackupFileInfo request (from maybeGetBackupFileInfo during
    // connectedCallback) may resolve first with an outdated state.
    await TestUtils.waitForCondition(async () => {
      await restoreFromBackup.updateComplete;
      return restoreFromBackup.filePicker.value === path;
    }, "The file picker should contain the expected path.");
  });

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let { restoreFromBackup } = await initializedBackupWidgets(browser);

    await TestUtils.waitForCondition(async () => {
      await restoreFromBackup.updateComplete;
      return restoreFromBackup.filePicker.value === path;
    }, "The path selected before should be used.");
  });
});

add_task(async function test_restore_from_backup_displays_invalid_backup() {
  const path = await IOUtils.createUniqueFile(TEST_PROFILE_PATH, "backup.html");
  await IOUtils.writeUTF8(path, "");

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let { restoreFromBackup } = await initializedBackupWidgets(browser);

    const mockBackupFile = await IOUtils.getFile(path);
    MockFilePicker.showCallback = () => {
      Assert.ok(true, "Filepicker shown");
      MockFilePicker.setFiles([mockBackupFile]);
    };
    MockFilePicker.returnValue = MockFilePicker.returnOK;

    let selectedFilePromise = BrowserTestUtils.waitForEvent(
      restoreFromBackup,
      "BackupUI:SelectNewFilepickerPath"
    ).then(() =>
      BrowserTestUtils.waitForEvent(
        restoreFromBackup,
        "BackupUI:StateWasUpdated"
      )
    );
    restoreFromBackup.chooseButtonEl.click();
    await selectedFilePromise;
    await restoreFromBackup.updateComplete;

    Assert.equal(
      restoreFromBackup.filePicker.value,
      path,
      "The file picker should contain the expected path."
    );
  });

  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let { restoreFromBackup } = await initializedBackupWidgets(browser);

    Assert.equal(
      restoreFromBackup.filePicker.value,
      path,
      "The path selected before should be used."
    );
  });
});

/**
 * Tests that the restore component uses a textarea and that the textarea
 * automatically resizes as needed.
 */
add_task(async function test_restore_from_backup_embedded_textarea() {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let { settings, restoreFromBackup } =
      await initializedBackupWidgets(browser);
    let sandbox = sinon.createSandbox();

    // We want to close it and reopen to see whether resizeTextarea is called.
    settings.dispatchEvent(new CustomEvent("dialogCancel"));
    let resizeTextareaSpy = sandbox.spy(restoreFromBackup, "resizeTextarea");
    settings.restoreFromBackupButtonEl.click();
    await settings.updateComplete;
    Assert.equal(
      resizeTextareaSpy.callCount,
      1,
      "resizeTextarea was called when the dialog opened"
    );

    const textarea = restoreFromBackup.shadowRoot.querySelector(
      "#backup-filepicker-input"
    );

    Assert.ok(textarea, "textarea should be present");
    Assert.equal(
      textarea.tagName.toLowerCase(),
      "textarea",
      "File picker should be a textarea"
    );
    Assert.equal(
      textarea.getAttribute("rows"),
      "1",
      "Textarea should have rows=1"
    );

    // Test resize functionality when content changes
    const initialHeight = textarea.style.height;
    Assert.ok(initialHeight, "Textarea should have an initial height set");

    const longPath =
      "/a/very/long/path/to/a/backup/file/that/would/wrap/multiple/lines.html";
    restoreFromBackup.backupServiceState.backupFileToRestore = longPath;
    restoreFromBackup.requestUpdate();
    await restoreFromBackup.updateComplete;
    Assert.equal(
      resizeTextareaSpy.callCount,
      2,
      "resizeTextarea was called when the content changed"
    );

    let heightRule = textarea.style.height;
    textarea.style.height = "auto";
    Assert.equal(
      heightRule,
      textarea.scrollHeight + "px",
      "Textarea height should contain all content once content is added"
    );
    textarea.style.height = heightRule;

    // The text area resize function should also be called
    // when the resize event occurs on the window
    let promise = BrowserTestUtils.waitForEvent(
      browser.contentWindow,
      "resize"
    );
    browser.contentWindow.dispatchEvent(new Event("resize"));
    await promise;

    Assert.equal(
      resizeTextareaSpy.callCount,
      3,
      "resizeTextarea should be called when window resize event is fired"
    );

    sandbox.restore();
  });
});

/**
 * Tests that the backup file info is displayed when backupFileInfo is present
 */
add_task(async function test_restore_backup_file_info_display() {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let { restoreFromBackup } = await initializedBackupWidgets(browser);

    // Initially, backup file info should not be displayed underneath the input
    let fileInfoSpan = restoreFromBackup.shadowRoot.querySelector(
      "#restore-from-backup-backup-found-info"
    );
    Assert.ok(
      !fileInfoSpan,
      "Backup file info should not be displayed when backupFileInfo is null"
    );

    // Set backup file info with device name and date
    const mockDate = new Date("2025-10-07T21:27:56.844Z");
    const mockDeviceName = "test-device";
    restoreFromBackup.backupServiceState = {
      ...restoreFromBackup.backupServiceState,
      backupFileInfo: {
        date: mockDate,
        deviceName: mockDeviceName,
        isEncrypted: false,
      },
      recoveryErrorCode: 0,
    };
    await restoreFromBackup.updateComplete;

    fileInfoSpan = restoreFromBackup.shadowRoot.querySelector(
      "#restore-from-backup-backup-found-info"
    );
    Assert.ok(
      fileInfoSpan,
      "Backup file info should be displayed when backupFileInfo is set"
    );

    Assert.equal(
      fileInfoSpan.getAttribute("data-l10n-id"),
      "backup-file-creation-metadata2",
      "Should have the correct l10n id"
    );

    const l10nArgs = JSON.parse(fileInfoSpan.getAttribute("data-l10n-args"));
    Assert.equal(
      l10nArgs.machineName,
      mockDeviceName,
      "l10n args should contain the correct device name"
    );
    Assert.equal(
      l10nArgs.date,
      mockDate.getTime(),
      "l10n args should contain the correct date"
    );
  });
});

/**
 * Helper function to test that a support link has the appropriate attributes
 *
 * @param {Element} link - The support link element to test
 * @param {string} linkName - The name of the link to test
 */

function assertNonEmbeddedSupportLink(link, linkName) {
  Assert.ok(link, `${linkName} should be present`);
  Assert.equal(
    link.getAttribute("is"),
    "moz-support-link",
    `${linkName} should use moz-support-link when not embedded`
  );
  Assert.equal(
    link.getAttribute("support-page"),
    "firefox-backup",
    `${linkName} should have support-page attribute`
  );
  Assert.ok(
    !link.href.includes("utm_source"),
    `${linkName} should not have UTM params when not embedded`
  );
}

/**
 * Tests that support links use moz-support-link when aboutWelcomeEmbedded is falsy
 */
add_task(async function test_support_links_non_embedded() {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let { restoreFromBackup } = await initializedBackupWidgets(browser);

    Assert.ok(
      !restoreFromBackup.aboutWelcomeEmbedded,
      "aboutWelcomeEmbedded should be falsy"
    );

    // Test the main support link
    let supportLink = restoreFromBackup.shadowRoot.querySelector(
      "#restore-from-backup-support-link"
    );
    assertNonEmbeddedSupportLink(supportLink, "Main support link");

    // Test the incorrect password link
    restoreFromBackup.backupServiceState = {
      ...restoreFromBackup.backupServiceState,
      backupFileInfo: {
        date: new Date(),
        deviceName: "test-device",
        isEncrypted: true,
      },
      recoveryErrorCode: ERRORS.UNAUTHORIZED,
    };
    await restoreFromBackup.updateComplete;

    let passwordErrorLink = restoreFromBackup.shadowRoot.querySelector(
      "#backup-incorrect-password-support-link"
    );
    assertNonEmbeddedSupportLink(passwordErrorLink, "Password error link");
  });
});

add_task(async function test_selectableProfilesAllowed_toggles_restore_ui() {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let { restoreFromBackup } = await initializedBackupWidgets(browser);
    let bs = BackupService.get();
    let sandbox = sinon.createSandbox();

    sandbox.stub(SelectableProfileService, "isEnabled").get(() => false);
    bs.onUpdateProfilesEnabledState();

    await TestUtils.waitForCondition(
      () =>
        restoreFromBackup.shadowRoot.querySelector(
          "moz-message-bar[type='info']"
        ),
      "Waiting for info message bar to appear when profiles are disabled"
    );

    Assert.ok(
      !restoreFromBackup.shadowRoot.querySelector(
        "#restore-from-backup-type-group"
      ),
      "Radio group should not be shown when profiles are disabled"
    );

    sandbox.restore();
    sandbox.stub(SelectableProfileService, "isEnabled").get(() => true);
    bs.onUpdateProfilesEnabledState();

    await TestUtils.waitForCondition(
      () =>
        restoreFromBackup.shadowRoot.querySelector(
          "#restore-from-backup-type-group"
        ),
      "Waiting for radio group to appear when profiles are enabled"
    );

    Assert.ok(
      !restoreFromBackup.shadowRoot.querySelector(
        "moz-message-bar[type='info']"
      ),
      "Info message bar should not be shown when profiles are enabled"
    );

    sandbox.restore();
  });
});

add_task(async function test_error_about_welcome() {
  await checkVisibleStatusTemplate({
    status: "error",
    aboutWelcome: true,
    visible: ["error message"],
  });
});

add_task(async function test_invalid_password_about_welcome() {
  await checkVisibleStatusTemplate({
    status: "wrong password",
    aboutWelcome: true,
    visible: ["size", "password error"],
  });
});

async function checkVisibleStatusTemplate({ status, aboutWelcome, visible }) {
  await BrowserTestUtils.withNewTab("about:preferences#sync", async browser => {
    let { restoreFromBackup } = await initializedBackupWidgets(browser);
    restoreFromBackup.aboutWelcomeEmbedded = aboutWelcome;
    restoreFromBackup.backupServiceState = {
      ...restoreFromBackup.backupServiceState,
      recoveryErrorCode:
        {
          "wrong password": ERRORS.UNAUTHORIZED,
        }[status] ?? ERRORS.RECOVERY_FAILED,
      backupFileInfo: {
        date: new Date("2025-11-06T15:37-0500"),
        isEncrypted: true,
      },
      defaultParent: {},
      backupFileToRestore: "",
    };
    await restoreFromBackup.updateComplete;

    const idIsVisible = id => {
      const element = restoreFromBackup.shadowRoot.querySelector(`#${id}`);
      return element ? BrowserTestUtils.isVisible(element) : false;
    };

    Assert.equal(
      await idIsVisible("backup-generic-file-error"),
      visible.includes("error message"),
      `Error message is ${visible.includes("error message") ? "" : "not "}visible`
    );
    Assert.equal(
      await idIsVisible("restore-from-backup-backup-found-info"),
      visible.includes("size"),
      `Size info is ${visible.includes("size") ? "" : "not "}visible`
    );
    Assert.equal(
      await idIsVisible("backup-password-error"),
      visible.includes("password error"),
      `Password error is ${visible.includes("password error") ? "" : "not "}visible`
    );
  });
}
