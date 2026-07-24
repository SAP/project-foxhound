/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { getErrorL10nId } from "chrome://browser/content/backup/backup-errors.mjs";
import { ERRORS } from "chrome://browser/content/backup/backup-constants.mjs";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/backup/turn-on-scheduled-backups.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/backup/turn-off-scheduled-backups.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/backup/restore-from-backup.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/backup/enable-backup-encryption.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/backup/disable-backup-encryption.mjs";

/**
 * The widget for managing the BackupService that is embedded within the main
 * document of about:settings / about:preferences.
 */
export default class BackupSettings extends MozLitElement {
  #placeholderIconURL = "chrome://global/skin/icons/page-portrait.svg";
  inProgressTimeout = null;
  showInProgress = false;

  // Decides how long the progress message bar persists for
  MESSAGE_BAR_BUFFER = 3000;

  static properties = {
    backupServiceState: { type: Object },
    _enableEncryptionTypeAttr: { type: String },
  };

  static get queries() {
    return {
      scheduledBackupsButtonEl: "#backup-toggle-scheduled-button",
      archiveSectionEl: "#scheduled-backups",
      restoreSectionEl: "#restore-from-backup",
      triggerBackupButtonEl: "#backup-trigger-button",
      changePasswordButtonEl: "#backup-change-password-button",
      disableBackupEncryptionEl: "disable-backup-encryption",
      disableBackupEncryptionDialogEl: "#disable-backup-encryption-dialog",
      enableBackupEncryptionEl: "enable-backup-encryption",
      enableBackupEncryptionDialogEl: "#enable-backup-encryption-dialog",
      turnOnScheduledBackupsDialogEl: "#turn-on-scheduled-backups-dialog",
      turnOnScheduledBackupsEl: "turn-on-scheduled-backups",
      turnOffScheduledBackupsEl: "turn-off-scheduled-backups",
      turnOffScheduledBackupsDialogEl: "#turn-off-scheduled-backups-dialog",
      restoreFromBackupEl: "restore-from-backup",
      restoreFromBackupButtonEl: "#backup-toggle-restore-button",
      restoreFromBackupDescriptionEl: "#backup-restore-description",
      restoreFromBackupDialogEl: "#restore-from-backup-dialog",
      sensitiveDataCheckboxInputEl: "#backup-sensitive-data-checkbox-input",
      passwordControlsEl: "#backup-password-controls",
      lastBackupLocationInputEl: "#last-backup-location",
      lastBackupFileNameEl: "#last-backup-filename",
      lastBackupDateEl: "#last-backup-date",
      backupLocationShowButtonEl: "#backup-location-show",
      backupLocationEditButtonEl: "#backup-location-edit",
      scheduledBackupsDescriptionEl: "#scheduled-backups-description",
      backupErrorBarEl: "#create-backup-error",
      backupInProgressMessageBarEl: "#backup-in-progress-message",
    };
  }

  get dialogs() {
    return [
      this.disableBackupEncryptionDialogEl,
      this.enableBackupEncryptionDialogEl,
      this.turnOnScheduledBackupsDialogEl,
      this.turnOffScheduledBackupsDialogEl,
      this.restoreFromBackupDialogEl,
    ];
  }

  /**
   * Creates a BackupPreferences instance and sets the initial default
   * state.
   */
  constructor() {
    super();
    this.backupServiceState = {
      backupDirPath: "",
      backupFileToRestore: null,
      backupFileInfo: null,
      defaultParent: {
        fileName: "",
        path: "",
        iconURL: "",
      },
      encryptionEnabled: false,
      scheduledBackupsEnabled: false,
      lastBackupDate: null,
      lastBackupFileName: "",
      supportBaseLink: "",
      backupInProgress: false,
      recoveryInProgress: false,
      recoveryErrorCode: ERRORS.NONE,
      backupErrorCode: ERRORS.NONE,
      archiveEnabledStatus: false,
      restoreEnabledStatus: false,
    };
    this._enableEncryptionTypeAttr = "";
  }

  /**
   * Dispatches the BackupUI:InitWidget custom event upon being attached to the
   * DOM, which registers with BackupUIChild for BackupService state updates.
   */
  connectedCallback() {
    super.connectedCallback();
    this.dispatchEvent(
      new CustomEvent("BackupUI:InitWidget", { bubbles: true })
    );

    this.addEventListener("dialogCancel", this);
    this.addEventListener("restoreFromBackupConfirm", this);
    this.addEventListener("restoreFromBackupChooseFile", this);
  }

  handleErrorBarDismiss = () => {
    // Reset the pref and reactive state; Lit will re-render without the bar.
    this.dispatchEvent(
      new CustomEvent("BackupUI:ErrorBarDismissed", { bubbles: true })
    );
  };

  handleEvent(event) {
    switch (event.type) {
      case "dialogCancel":
        for (let dialog of this.dialogs) {
          dialog?.close();
        }
        break;
      case "restoreFromBackupConfirm":
        this.dispatchEvent(
          new CustomEvent("BackupUI:RestoreFromBackupFile", {
            bubbles: true,
            composed: true,
            detail: {
              backupFile: event.detail.backupFile,
              backupPassword: event.detail.backupPassword,
            },
          })
        );
        break;
      case "restoreFromBackupChooseFile":
        this.dispatchEvent(
          new CustomEvent("BackupUI:RestoreFromBackupChooseFile", {
            bubbles: true,
            composed: true,
          })
        );
        break;
    }
  }

  handleBackupTrigger() {
    this.dispatchEvent(
      new CustomEvent("BackupUI:TriggerCreateBackup", {
        bubbles: true,
      })
    );
  }

  handleShowScheduledBackups() {
    if (
      !this.backupServiceState.scheduledBackupsEnabled &&
      this.turnOnScheduledBackupsDialogEl
    ) {
      this.turnOnScheduledBackupsDialogEl.showModal();
    } else if (
      this.backupServiceState.scheduledBackupsEnabled &&
      this.turnOffScheduledBackupsDialogEl
    ) {
      this.turnOffScheduledBackupsDialogEl.showModal();
    }
  }

  async handleToggleBackupEncryption(event) {
    event.preventDefault();

    // Checkbox was unchecked, meaning encryption is already enabled and should be disabled.
    let toggledToDisable =
      !event.target.checked && this.backupServiceState.encryptionEnabled;

    if (toggledToDisable && this.disableBackupEncryptionDialogEl) {
      this.disableBackupEncryptionDialogEl.showModal();
    } else {
      this._enableEncryptionTypeAttr = "set-password";
      await this.updateComplete;
      this.enableBackupEncryptionDialogEl.showModal();
    }
  }

  async handleChangePassword() {
    if (this.enableBackupEncryptionDialogEl) {
      this._enableEncryptionTypeAttr = "change-password";
      await this.updateComplete;
      this.enableBackupEncryptionDialogEl.showModal();
    }
  }

  scheduledBackupsDescriptionTemplate() {
    return html`
      <div
        id="scheduled-backups-description"
        data-l10n-id="settings-data-backup-scheduled-backups-description"
      >
        <a
          is="moz-support-link"
          support-page="firefox-backup"
          data-l10n-name="support-link"
          utm-content="backup-off"
        ></a>
      </div>
    `;
  }

  turnOnScheduledBackupsDialogTemplate() {
    let { fileName, path, iconURL } = this.backupServiceState.defaultParent;
    return html`<dialog
      id="turn-on-scheduled-backups-dialog"
      class="backup-dialog"
      @close=${this.handleTurnOnScheduledBackupsDialogClose}
    >
      <turn-on-scheduled-backups
        defaultlabel=${fileName}
        defaultpath=${path}
        defaulticonurl=${iconURL}
        .supportBaseLink=${this.backupServiceState.supportBaseLink}
      ></turn-on-scheduled-backups>
    </dialog>`;
  }

  turnOffScheduledBackupsDialogTemplate() {
    return html`<dialog id="turn-off-scheduled-backups-dialog">
      <turn-off-scheduled-backups></turn-off-scheduled-backups>
    </dialog>`;
  }

  restoreFromBackupDialogTemplate() {
    return html`<dialog id="restore-from-backup-dialog">
      <restore-from-backup></restore-from-backup>
    </dialog>`;
  }

  restoreFromBackupTemplate() {
    let descriptionL10nID = this.backupServiceState.scheduledBackupsEnabled
      ? "settings-data-backup-scheduled-backups-on-restore-description"
      : "settings-data-backup-scheduled-backups-off-restore-description";

    let restoreButtonL10nID = this.backupServiceState.scheduledBackupsEnabled
      ? "settings-data-backup-scheduled-backups-on-restore-choose"
      : "settings-data-backup-scheduled-backups-off-restore-choose";

    return html`<section id="restore-from-backup">
      ${this.restoreFromBackupDialogTemplate()}
      <div class="backups-control">
        <span
          id="restore-header"
          data-l10n-id="settings-data-backup-restore-header"
          class="heading-medium"
        ></span>
        <moz-button
          id="backup-toggle-restore-button"
          @click=${this.handleShowRestoreDialog}
          data-l10n-id=${restoreButtonL10nID}
        ></moz-button>
        <div
          id="backup-restore-description"
          data-l10n-id=${descriptionL10nID}
        ></div>
      </div>
    </section>`;
  }

  handleShowRestoreDialog() {
    if (this.restoreFromBackupDialogEl) {
      this.restoreFromBackupDialogEl.showModal();
      this.restoreFromBackupEl.resizeTextarea();
    }
  }

  handleShowBackupLocation() {
    this.dispatchEvent(
      new CustomEvent("BackupUI:ShowBackupLocation", {
        bubbles: true,
      })
    );
  }

  handleEditBackupLocation() {
    this.dispatchEvent(
      new CustomEvent("BackupUI:EditBackupLocation", {
        bubbles: true,
      })
    );
  }

  handleTurnOnScheduledBackupsDialogClose() {
    this.turnOnScheduledBackupsEl.reset();
  }

  handleEnableBackupEncryptionDialogClose() {
    this.enableBackupEncryptionEl.reset();
  }

  enableBackupEncryptionDialogTemplate() {
    return html`<dialog
      id="enable-backup-encryption-dialog"
      class="backup-dialog"
      @close=${this.handleEnableBackupEncryptionDialogClose}
    >
      <enable-backup-encryption
        type=${this._enableEncryptionTypeAttr}
        .supportBaseLink=${this.backupServiceState.supportBaseLink}
      ></enable-backup-encryption>
    </dialog>`;
  }

  disableBackupEncryptionDialogTemplate() {
    return html`<dialog id="disable-backup-encryption-dialog">
      <disable-backup-encryption></disable-backup-encryption>
    </dialog>`;
  }

  lastBackupInfoTemplate() {
    // The lastBackupDate is stored in preferences, which only accepts
    // 32-bit signed values, so we automatically divide it by 1000 before
    // storing it. We need to re-multiply it by 1000 to get Fluent to render
    // the right time.
    let backupDateArgs = {
      date: this.backupServiceState.lastBackupDate * 1000,
    };
    let backupFileNameArgs = {
      fileName: this.backupServiceState.lastBackupFileName,
    };

    return html`
      <div id="last-backup-info">
        <div
          id="last-backup-date"
          data-l10n-id="settings-data-backup-last-backup-date"
          data-l10n-args=${JSON.stringify(backupDateArgs)}
        ></div>
        <div
          id="last-backup-filename"
          data-l10n-id="settings-data-backup-last-backup-filename"
          data-l10n-args=${JSON.stringify(backupFileNameArgs)}
        ></div>
      </div>
    `;
  }

  backupLocationTemplate() {
    let iconURL =
      this.backupServiceState.defaultParent.iconURL || this.#placeholderIconURL;
    let { backupDirPath } = this.backupServiceState;

    return html`
      <div id="last-backup-location-control">
        <span data-l10n-id="settings-data-backup-last-backup-location"></span>
        <input
          id="last-backup-location"
          class="backup-location-filepicker-input"
          type="text"
          readonly
          .value=${backupDirPath}
          style=${`background-image: url(${iconURL})`}></input>
        <moz-button
          id="backup-location-show"
          @click=${this.handleShowBackupLocation}
          data-l10n-id="settings-data-backup-last-backup-location-show-in-folder"
        ></moz-button>
        <moz-button
          id="backup-location-edit"
          @click=${this.handleEditBackupLocation}
          data-l10n-id="settings-data-backup-last-backup-location-edit"
        ></moz-button>
      </div>
    `;
  }

  sensitiveDataTemplate() {
    return html`<section id="backup-password-controls">
      <!-- TODO: we can use the moz-checkbox reusable component once it is ready (bug 1901635)-->
      <div id="backup-sensitive-data-checkbox">
        <label
          id="backup-sensitive-data-checkbox-label"
          for="backup-sensitive-data-checkbox-input"
        >
          <input
            id="backup-sensitive-data-checkbox-input"
            @click=${this.handleToggleBackupEncryption}
            type="checkbox"
            .checked=${this.backupServiceState.encryptionEnabled}
          />
          <span
            id="backup-sensitive-data-checkbox-span"
            data-l10n-id="settings-data-toggle-encryption-label"
          ></span>
        </label>
        <div
          id="backup-sensitive-data-checkbox-description"
          class="text-deemphasized"
        >
          <span
            id="backup-sensitive-data-checkbox-description-span"
            data-l10n-id="settings-sensitive-data-encryption-description"
          ></span>
          <a
            id="settings-data-toggle-encryption-learn-more-link"
            is="moz-support-link"
            support-page="firefox-backup"
            utm-content="encryption"
            data-l10n-id="settings-data-toggle-encryption-support-link"
          ></a>
        </div>
      </div>
      ${this.backupServiceState.encryptionEnabled
        ? html`<moz-button
            id="backup-change-password-button"
            @click=${this.handleChangePassword}
            data-l10n-id="settings-data-change-password"
          ></moz-button>`
        : null}
    </section>`;
  }

  inProgressMessageBarTemplate() {
    return html`
      <moz-message-bar
        type="info"
        id="backup-in-progress-message"
        data-l10n-id="settings-data-backup-in-progress-message"
      ></moz-message-bar>
    `;
  }

  errorBarTemplate() {
    const l10nId = getErrorL10nId(this.backupServiceState.backupErrorCode);
    return html`
      <moz-message-bar
        type="error"
        id="create-backup-error"
        dismissable
        data-l10n-id=${l10nId}
        @message-bar:user-dismissed=${this.handleErrorBarDismiss}
      >
        <a
          id="create-backup-error-learn-more-link"
          slot="support-link"
          is="moz-support-link"
          support-page="firefox-backup"
          data-l10n-id="settings-data-toggle-encryption-support-link"
          utm-content="backup-error"
        ></a>
      </moz-message-bar>
    `;
  }

  updated() {
    if (this.backupServiceState.scheduledBackupsEnabled) {
      let input = this.lastBackupLocationInputEl;
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }

  render() {
    let scheduledBackupsEnabledState =
      this.backupServiceState.scheduledBackupsEnabled;

    let scheduledBackupsEnabledL10nID = scheduledBackupsEnabledState
      ? "settings-data-backup-scheduled-backups-on"
      : "settings-data-backup-scheduled-backups-off";

    let backupToggleL10nID = scheduledBackupsEnabledState
      ? "settings-data-backup-toggle-off"
      : "settings-data-backup-toggle-on";

    if (this.backupServiceState.backupInProgress) {
      if (!this.showInProgress) {
        this.showInProgress = true;
        // Keep the in progress message bar visible for at least 3 seconds
        clearTimeout(this.inProgressTimeout);
        this.inProgressTimeout = setTimeout(() => {
          this.showInProgress = false;
          this.requestUpdate();
        }, this.MESSAGE_BAR_BUFFER);
      }
    }

    return html`<link
        rel="stylesheet"
        href="chrome://browser/skin/preferences/preferences.css"
      />
      <link
        rel="stylesheet"
        href="chrome://browser/content/backup/backup-settings.css"
      />
      ${this.backupServiceState.backupErrorCode
        ? this.errorBarTemplate()
        : null}
      ${this.showInProgress ? this.inProgressMessageBarTemplate() : null}
      ${this.turnOnScheduledBackupsDialogTemplate()}
      ${this.turnOffScheduledBackupsDialogTemplate()}
      ${this.enableBackupEncryptionDialogTemplate()}
      ${this.disableBackupEncryptionDialogTemplate()}
      ${this.backupServiceState.archiveEnabledStatus
        ? html` <section id="scheduled-backups">
            <div class="backups-control">
              <span
                id="scheduled-backups-enabled"
                data-l10n-id=${scheduledBackupsEnabledL10nID}
                class="heading-medium"
              ></span>

              ${scheduledBackupsEnabledState
                ? html`
                    <moz-button
                      id="backup-trigger-button"
                      @click=${this.handleBackupTrigger}
                      data-l10n-id="settings-data-backup-trigger-button"
                      ?disabled=${this.showInProgress}
                    ></moz-button>
                  `
                : null}

              <moz-button
                id="backup-toggle-scheduled-button"
                @click=${this.handleShowScheduledBackups}
                data-l10n-id=${backupToggleL10nID}
              ></moz-button>

              ${this.backupServiceState.scheduledBackupsEnabled
                ? null
                : this.scheduledBackupsDescriptionTemplate()}
            </div>

            ${this.backupServiceState.lastBackupDate
              ? this.lastBackupInfoTemplate()
              : null}
            ${this.backupServiceState.scheduledBackupsEnabled
              ? this.backupLocationTemplate()
              : null}
            ${this.backupServiceState.scheduledBackupsEnabled
              ? this.sensitiveDataTemplate()
              : null}
          </section>`
        : null}
      ${this.backupServiceState.restoreEnabledStatus
        ? this.restoreFromBackupTemplate()
        : null} `;
  }
}

customElements.define("backup-settings", BackupSettings);
