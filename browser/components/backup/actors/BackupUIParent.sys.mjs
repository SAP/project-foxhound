/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  BackupService: "resource:///modules/backup/BackupService.sys.mjs",
  ERRORS: "chrome://browser/content/backup/backup-constants.mjs",
  E10SUtils: "resource://gre/modules/E10SUtils.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logConsole", function () {
  return console.createInstance({
    prefix: "BackupUIParent",
    maxLogLevel: Services.prefs.getBoolPref("browser.backup.log", false)
      ? "Debug"
      : "Warn",
  });
});

const BACKUP_ERROR_CODE_PREF_NAME = "browser.backup.errorCode";

/**
 * A JSWindowActor that is responsible for marshalling information between
 * the BackupService singleton and any registered UI widgets that need to
 * represent data from that service.
 */
export class BackupUIParent extends JSWindowActorParent {
  /**
   * A reference to the BackupService singleton instance.
   *
   * @type {BackupService}
   */
  #bs;

  /**
   * Observer for "backup-service-status-updated" notifications.
   * We want each BackupUIParent actor instance to be notified separately and
   * to forward the state to its child.
   */
  #obs;

  /**
   * Create a BackupUIParent instance. If a BackupUIParent is instantiated
   * before BrowserGlue has a chance to initialize the BackupService, this
   * constructor will cause it to initialize first.
   */
  constructor() {
    super();
    // We use init() rather than get(), since it's possible to load
    // about:preferences before the service has had a chance to init itself
    // via BrowserGlue.
    this.#bs = lazy.BackupService.init();

    // Define the observer function to capture our this.
    this.#obs = (_subject, topic) => {
      if (topic == "backup-service-status-updated") {
        this.sendState();
      }
    };
  }

  /**
   * Called once the BackupUIParent/BackupUIChild pair have been connected.
   */
  actorCreated() {
    this.#bs.addEventListener("BackupService:StateUpdate", this);
    Services.obs.addObserver(this.#obs, "backup-service-status-updated");
    // Note that loadEncryptionState is an async function.
    // This function is no-op if the encryption state was already loaded.
    this.#bs.loadEncryptionState();
  }

  /**
   * Called once the BackupUIParent/BackupUIChild pair have been disconnected.
   */
  didDestroy() {
    this.#bs.removeEventListener("BackupService:StateUpdate", this);
    Services.obs.removeObserver(this.#obs, "backup-service-status-updated");
  }

  /**
   * Handles events fired by the BackupService.
   *
   * @param {Event} event
   *   The event that the BackupService emitted.
   */
  handleEvent(event) {
    if (event.type == "BackupService:StateUpdate") {
      this.sendState();
    }
  }

  /**
   * Trigger a createBackup call.
   *
   * @param {...any} args
   *   Arguments to pass through to createBackup.
   * @returns {object} Result of the backup attempt.
   */
  async #triggerCreateBackup(...args) {
    try {
      await this.#bs.createBackup(...args);
      return { success: true };
    } catch (e) {
      lazy.logConsole.error(`Failed to retrigger backup`, e);
      return { success: false, errorCode: e.cause || lazy.ERRORS.UNKNOWN };
    }
  }

  /**
   * Handles messages sent by BackupUIChild.
   *
   * @param {ReceiveMessageArgument} message
   *   The message received from the BackupUIChild.
   * @returns {
   *   null |
   *   {success: boolean, errorCode: number} |
   *   {path: string, fileName: string, iconURL: string|null}
   * }
   *   Returns either a success object, a file details object, or null.
   */
  async receiveMessage(message) {
    let currentWindowGlobal = this.browsingContext.currentWindowGlobal;
    // The backup spotlights can be embedded in less privileged content pages, so let's
    // make sure that any messages from content are coming from the privileged
    // about content process type
    if (
      !currentWindowGlobal ||
      (!currentWindowGlobal.isInProcess &&
        this.browsingContext.currentRemoteType !=
          lazy.E10SUtils.PRIVILEGEDABOUT_REMOTE_TYPE)
    ) {
      lazy.logConsole.debug(
        "BackupUIParent: received message from the wrong content process type."
      );
      return null;
    }

    if (message.name == "RequestState") {
      this.sendState();
    } else if (message.name == "TriggerCreateBackup") {
      return await this.#triggerCreateBackup({ reason: "manual" });
    } else if (message.name == "EnableScheduledBackups") {
      try {
        let { parentDirPath, password } = message.data;
        if (parentDirPath) {
          this.#bs.setParentDirPath(parentDirPath);
        }

        if (password) {
          // If the user's previously created backups were already encrypted
          // with a password, their encryption settings are now reset to
          // accommodate the newly supplied password.
          if (await this.#bs.loadEncryptionState()) {
            await this.#bs.disableEncryption();
          }
          await this.#bs.enableEncryption(password);
          Glean.browserBackup.passwordAdded.record();
        }
        this.#bs.setScheduledBackups(true);
      } catch (e) {
        lazy.logConsole.error(`Failed to enable scheduled backups`, e);
        return { success: false, errorCode: e.cause || lazy.ERRORS.UNKNOWN };
      }

      // Don't block the return on createBackup
      this.#triggerCreateBackup({ reason: "first" });
      return { success: true };
    } else if (message.name == "DisableScheduledBackups") {
      await this.#bs.cleanupBackupFiles();
      this.#bs.setScheduledBackups(false);
    } else if (message.name == "ShowFilepicker") {
      let { win, filter, existingBackupPath } = message.data;

      let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);

      let mode = filter
        ? Ci.nsIFilePicker.modeOpen
        : Ci.nsIFilePicker.modeGetFolder;
      fp.init(win || this.browsingContext, "", mode);

      if (filter) {
        fp.appendFilters(Ci.nsIFilePicker[filter]);
      }

      if (existingBackupPath) {
        try {
          let folder = await IOUtils.getFile(existingBackupPath);
          // IOUtils.getFile creates the parent directory, so it should exist.
          fp.displayDirectory = folder.parent;
        } catch (_) {
          // If the path isn't valid, don't bother setting the displayDirectory.
        }
      }

      let result = await new Promise(resolve => fp.open(resolve));

      if (result === Ci.nsIFilePicker.returnCancel) {
        return null;
      }

      let path = fp.file.path;
      let iconURL = this.#bs.getIconFromFilePath(path);
      let filename = PathUtils.filename(path);

      return {
        path,
        filename,
        iconURL,
      };
    } else if (message.name == "GetBackupFileInfo") {
      let { backupFile } = message.data;
      try {
        await this.#bs.getBackupFileInfo(backupFile);
      } catch (e) {
        /**
         * TODO: (Bug 1905156) display a localized version of error in the restore dialog.
         */
      }
    } else if (message.name == "RestoreFromBackupChooseFile") {
      const window = this.browsingContext.topChromeWindow;
      this.#bs.filePickerForRestore(window);
    } else if (message.name == "RestoreFromBackupFile") {
      let { backupFile, backupPassword } = message.data;
      try {
        await this.#bs.recoverFromBackupArchive(
          backupFile,
          backupPassword,
          true /* shouldLaunchOrQuit */
        );
      } catch (e) {
        lazy.logConsole.error(`Failed to restore file: ${backupFile}`, e);
        this.#bs.setRecoveryError(e.cause || lazy.ERRORS.UNKNOWN);
        return { success: false, errorCode: e.cause || lazy.ERRORS.UNKNOWN };
      }
      return { success: true };
    } else if (message.name == "EnableEncryption") {
      try {
        let wasEncrypted = this.#bs.state.encryptionEnabled;
        await this.#bs.enableEncryption(message.data.password);
        if (wasEncrypted) {
          Glean.browserBackup.passwordChanged.record();
        } else {
          Glean.browserBackup.passwordAdded.record();
        }
      } catch (e) {
        lazy.logConsole.error(`Failed to enable encryption`, e);
        return { success: false, errorCode: e.cause || lazy.ERRORS.UNKNOWN };
      }

      return await this.#triggerCreateBackup({ reason: "encryption" });
    } else if (message.name == "DisableEncryption") {
      try {
        await this.#bs.disableEncryption();
        Glean.browserBackup.passwordRemoved.record();
      } catch (e) {
        lazy.logConsole.error(`Failed to disable encryption`, e);
        return { success: false, errorCode: e.cause || lazy.ERRORS.UNKNOWN };
      }

      return await this.#triggerCreateBackup({ reason: "encryption" });
    } else if (message.name == "ShowBackupLocation") {
      this.#bs.showBackupLocation();
    } else if (message.name == "EditBackupLocation") {
      const window = this.browsingContext.topChromeWindow;
      this.#bs.editBackupLocation(window);
    } else if (message.name == "QuitCurrentProfile") {
      // Notify windows that a quit has been requested.
      let cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(
        Ci.nsISupportsPRBool
      );
      Services.obs.notifyObservers(cancelQuit, "quit-application-requested");
      if (cancelQuit.data) {
        // Something blocked our attempt to quit.
        return null;
      }

      try {
        Services.startup.quit(Services.startup.eAttemptQuit);
      } catch (e) {
        // let's silently resolve this error
        lazy.logConsole.error(
          `There was a problem while quitting the current profile: `,
          e
        );
      }
    } else if (message.name == "SetEmbeddedComponentPersistentData") {
      this.#bs.setEmbeddedComponentPersistentData(message.data);
    } else if (message.name == "FlushEmbeddedComponentPersistentData") {
      this.#bs.setEmbeddedComponentPersistentData({});
    } else if (message.name == "ErrorBarDismissed") {
      Services.prefs.setIntPref(BACKUP_ERROR_CODE_PREF_NAME, lazy.ERRORS.NONE);
    }

    return null;
  }

  /**
   * Sends the StateUpdate message to the BackupUIChild, along with the most
   * recent state object from BackupService.
   */
  sendState() {
    this.sendAsyncMessage("StateUpdate", {
      state: this.#bs.state,
    });
  }
}
