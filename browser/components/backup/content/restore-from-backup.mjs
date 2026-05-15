/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  html,
  ifDefined,
  styleMap,
} from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { ERRORS } from "chrome://browser/content/backup/backup-constants.mjs";
import { getErrorL10nId } from "chrome://browser/content/backup/backup-errors.mjs";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-message-bar.mjs";

/**
 * The widget for allowing users to select and restore from a
 * a backup file.
 */
export default class RestoreFromBackup extends MozLitElement {
  #placeholderFileIconURL = "chrome://global/skin/icons/page-portrait.svg";
  /**
   * When the user clicks the button to choose a backup file to restore, we send
   * a message to the `BackupService` process asking it to read that file.
   * When we do this, we set this property to be a promise, which we resolve
   * when the file reading is complete.
   */
  #backupFileReadPromise = null;

  /**
   * Resolves when BackupUIParent sends state for the first time.
   */
  get initializedPromise() {
    return this.#initializedResolvers.promise;
  }
  #initializedResolvers = Promise.withResolvers();

  static properties = {
    _fileIconURL: { type: String },
    aboutWelcomeEmbedded: { type: Boolean },
    backupServiceState: { type: Object },
  };

  static get queries() {
    return {
      filePicker: "#backup-filepicker-input",
      passwordInput: "#backup-password-input",
      cancelButtonEl: "#restore-from-backup-cancel-button",
      confirmButtonEl: "#restore-from-backup-confirm-button",
      chooseButtonEl: "#backup-filepicker-button",
      errorMessageEl: "#restore-from-backup-error",
    };
  }

  get isIncorrectPassword() {
    return this.backupServiceState?.recoveryErrorCode === ERRORS.UNAUTHORIZED;
  }

  constructor() {
    super();
    this._fileIconURL = "";
    // Set the default state
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
      supportBaseLink: "https://support.mozilla.org/",
      backupInProgress: false,
      recoveryInProgress: false,
      recoveryErrorCode: ERRORS.NONE,
    };
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

    // If we have a backup file, but not the associated info, fetch the info
    this.maybeGetBackupFileInfo();

    this.addEventListener("BackupUI:SelectNewFilepickerPath", this);
    this.addEventListener("BackupUI:StateWasUpdated", this);

    // Resize the textarea when the window is resized
    this._handleWindowResize = () => this.resizeTextarea();
    window.addEventListener("resize", this._handleWindowResize);
  }

  maybeGetBackupFileInfo() {
    if (
      this.backupServiceState?.backupFileToRestore &&
      !this.backupServiceState?.backupFileInfo
    ) {
      this.getBackupFileInfo();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._handleWindowResize) {
      window.removeEventListener("resize", this._handleWindowResize);
      this._handleWindowResize = null;
    }
  }

  updated(changedProperties) {
    super.updated(changedProperties);

    // Resize the textarea. This only runs once on initial render,
    // and once each time one of our reactive properties is changed.
    this.resizeTextarea();

    if (changedProperties.has("backupServiceState")) {
      // If we got a recovery error, recoveryInProgress should be false
      const inProgress =
        this.backupServiceState.recoveryInProgress &&
        !this.backupServiceState.recoveryErrorCode;

      this.dispatchEvent(
        new CustomEvent("BackupUI:RecoveryProgress", {
          bubbles: true,
          composed: true,
          detail: { recoveryInProgress: inProgress },
        })
      );

      // It's possible that backupFileToRestore got updated and we need to
      // refetch the fileInfo
      this.maybeGetBackupFileInfo();
    }
  }

  handleEvent(event) {
    if (event.type == "BackupUI:SelectNewFilepickerPath") {
      let { path, iconURL } = event.detail;
      this._fileIconURL = iconURL;

      this.#backupFileReadPromise = Promise.withResolvers();
      this.#backupFileReadPromise.promise.then(() => {
        const payload = {
          location: this.backupServiceState?.backupFileCoarseLocation,
          valid: this.backupServiceState?.recoveryErrorCode == ERRORS.NONE,
        };
        if (payload.valid) {
          payload.backup_timestamp = new Date(
            this.backupServiceState?.backupFileInfo?.date || 0
          ).getTime();
          payload.restore_id = this.backupServiceState?.restoreID;
          payload.encryption =
            this.backupServiceState?.backupFileInfo?.isEncrypted;
          payload.app_name = this.backupServiceState?.backupFileInfo?.appName;
          payload.version = this.backupServiceState?.backupFileInfo?.appVersion;
          payload.build_id = this.backupServiceState?.backupFileInfo?.buildID;
          payload.os_name = this.backupServiceState?.backupFileInfo?.osName;
          payload.os_version =
            this.backupServiceState?.backupFileInfo?.osVersion;
          payload.telemetry_enabled =
            this.backupServiceState?.backupFileInfo?.healthTelemetryEnabled;
        }
        Glean.browserBackup.restoreFileChosen.record(payload);
        Services.obs.notifyObservers(null, "browser-backup-glean-sent");
      });

      this.getBackupFileInfo(path);
    } else if (event.type == "BackupUI:StateWasUpdated") {
      this.#initializedResolvers.resolve();
      if (this.#backupFileReadPromise) {
        this.#backupFileReadPromise.resolve();
        this.#backupFileReadPromise = null;
      }
    }
  }

  handleChooseBackupFile() {
    this.dispatchEvent(
      new CustomEvent("BackupUI:ShowFilepicker", {
        bubbles: true,
        composed: true,
        detail: {
          win: window.browsingContext,
          filter: "filterHTML",
          existingBackupPath: this.backupServiceState?.backupFileToRestore,
        },
      })
    );
  }

  getBackupFileInfo(pathToFile = null) {
    let backupFile = pathToFile || this.backupServiceState?.backupFileToRestore;
    if (!backupFile) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("BackupUI:GetBackupFileInfo", {
        bubbles: true,
        composed: true,
        detail: {
          backupFile,
        },
      })
    );
  }

  handleCancel() {
    this.dispatchEvent(
      new CustomEvent("dialogCancel", {
        bubbles: true,
        composed: true,
      })
    );
  }

  handleConfirm() {
    let backupFile = this.backupServiceState?.backupFileToRestore;
    if (!backupFile || this.backupServiceState?.recoveryInProgress) {
      return;
    }
    let backupPassword = this.passwordInput?.value;
    this.dispatchEvent(
      new CustomEvent("BackupUI:RestoreFromBackupFile", {
        bubbles: true,
        composed: true,
        detail: {
          backupFile,
          backupPassword,
        },
      })
    );
  }

  handleTextareaResize() {
    this.resizeTextarea();
  }

  /**
   * Resizes the textarea to adjust to the size of the content within
   */
  resizeTextarea() {
    const target = this.filePicker;
    if (!target) {
      return;
    }

    const hasValue = target.value && !!target.value.trim().length;

    target.style.height = "auto";
    if (hasValue) {
      target.style.height = target.scrollHeight + "px";
    }
  }

  /**
   * Constructs a support URL with UTM parameters for use
   * when embedded in about:welcome
   *
   * @param {string} supportPage - The support page slug
   * @returns {string} The full support URL including UTM params
   */

  getSupportURLWithUTM(supportPage) {
    let supportURL = new URL(
      supportPage,
      this.backupServiceState.supportBaseLink
    );
    supportURL.searchParams.set("utm_medium", "firefox-desktop");
    supportURL.searchParams.set("utm_source", "npo");
    supportURL.searchParams.set("utm_campaign", "fx-backup-restore");
    supportURL.searchParams.set("utm_content", "restore-error");
    return supportURL.href;
  }

  /**
   * Returns a support link anchor element, either with UTM params for use in
   * about:welcome, or falling back to moz-support-link otherwise
   *
   * @param {object} options - Link configuration options
   * @param {string} options.id - The element id
   * @param {string} options.l10nId - The fluent l10n id
   * @param {string} options.l10nName - The fluent l10n name
   * @param {string} options.supportPage - The support page slug
   * @returns {TemplateResult} The link template
   */

  getSupportLinkAnchor({
    id,
    l10nId,
    l10nName,
    supportPage = "firefox-backup",
  }) {
    if (this.aboutWelcomeEmbedded) {
      return html`<a
        id=${id}
        target="_blank"
        href=${this.getSupportURLWithUTM(supportPage)}
        data-l10n-id=${ifDefined(l10nId)}
        data-l10n-name=${ifDefined(l10nName)}
        dir="auto"
        rel="noopener noreferrer"
      ></a>`;
    }

    return html`<a
      id=${id}
      slot="support-link"
      is="moz-support-link"
      support-page=${supportPage}
      data-l10n-id=${ifDefined(l10nId)}
      data-l10n-name=${ifDefined(l10nName)}
      dir="auto"
    ></a>`;
  }

  applyContentCustomizations() {
    if (this.aboutWelcomeEmbedded) {
      this.style.setProperty(
        "--label-font-weight",
        "var(--font-weight-semibold)"
      );
    }
  }

  renderBackupFileInfo(backupFileInfo) {
    return html`<p
      id="restore-from-backup-backup-found-info"
      data-l10n-id="backup-file-creation-date-and-device"
      data-l10n-args=${JSON.stringify({
        machineName: backupFileInfo.deviceName ?? "",
        date: backupFileInfo.date ? new Date(backupFileInfo.date).getTime() : 0,
      })}
    ></p>`;
  }

  renderBackupFileStatus() {
    const { backupFileInfo, recoveryErrorCode } = this.backupServiceState || {};

    // We have errors and are embedded in about:welcome
    if (
      recoveryErrorCode &&
      !this.isIncorrectPassword &&
      this.aboutWelcomeEmbedded
    ) {
      return this.genericFileErrorTemplate();
    }

    // No backup file selected
    if (!backupFileInfo) {
      return this.getSupportLinkAnchor({
        id: "restore-from-backup-no-backup-file-link",
        l10nId: "restore-from-backup-no-backup-file-link",
      });
    }

    // Backup file found and no error
    return this.renderBackupFileInfo(backupFileInfo);
  }

  controlsTemplate() {
    let iconURL = this.#placeholderFileIconURL;
    if (
      this.backupServiceState?.backupFileToRestore &&
      !this.aboutWelcomeEmbedded
    ) {
      iconURL = this._fileIconURL || this.#placeholderFileIconURL;
    }
    return html`
      <fieldset id="backup-restore-controls">
        <fieldset id="backup-filepicker-controls">
          <label
            id="backup-filepicker-label"
            for="backup-filepicker-input"
            data-l10n-id="restore-from-backup-filepicker-label"
          ></label>
          <div id="backup-filepicker">
            ${this.inputTemplate(iconURL)}
            <moz-button
              id="backup-filepicker-button"
              @click=${this.handleChooseBackupFile}
              data-l10n-id="restore-from-backup-file-choose-button"
              aria-controls="backup-filepicker-input"
            ></moz-button>
          </div>

          ${this.renderBackupFileStatus()}
        </fieldset>

        <fieldset id="password-entry-controls">
          ${this.backupServiceState?.backupFileInfo?.isEncrypted
            ? this.passwordEntryTemplate()
            : null}
        </fieldset>
      </fieldset>
    `;
  }

  inputTemplate(iconURL) {
    const styles = styleMap(
      iconURL ? { backgroundImage: `url(${iconURL})` } : {}
    );
    const backupFileName = this.backupServiceState?.backupFileToRestore || "";

    // Determine the ID of the element that will be rendered by renderBackupFileStatus()
    // to reference with aria-describedby
    let describedBy = "";
    const { backupFileInfo, recoveryErrorCode } = this.backupServiceState || {};

    if (
      this.aboutWelcomeEmbedded &&
      recoveryErrorCode &&
      !this.isIncorrectPassword
    ) {
      describedBy = "backup-generic-file-error";
    } else if (!backupFileInfo) {
      describedBy = "restore-from-backup-no-backup-file-link";
    } else {
      describedBy = "restore-from-backup-backup-found-info";
    }

    return html`
      <textarea
        id="backup-filepicker-input"
        rows="1"
        readonly
        .value=${backupFileName}
        style=${styles}
        @input=${this.handleTextareaResize}
        aria-describedby=${describedBy}
        data-l10n-id="restore-from-backup-filepicker-input"
      ></textarea>
    `;
  }

  passwordEntryTemplate() {
    const isInvalid = this.isIncorrectPassword;
    const describedBy = isInvalid
      ? "backup-password-error"
      : "backup-password-description";

    return html` <fieldset id="backup-password">
      <label id="backup-password-label" for="backup-password-input">
        <span
          id="backup-password-span"
          data-l10n-id="restore-from-backup-password-label"
        ></span>
        <input
          type="password"
          id="backup-password-input"
          aria-invalid=${String(isInvalid)}
          aria-describedby=${describedBy}
        />
      </label>
      ${isInvalid
        ? html`
            <span
              id="backup-password-error"
              class="field-error"
              data-l10n-id="backup-service-error-incorrect-password"
            >
              ${this.getSupportLinkAnchor({
                id: "backup-incorrect-password-support-link",
                l10nName: "incorrect-password-support-link",
              })}
            </span>
          `
        : html`<label
            id="backup-password-description"
            data-l10n-id="restore-from-backup-password-description"
          ></label> `}
    </fieldset>`;
  }

  contentTemplate() {
    let buttonL10nId = !this.backupServiceState?.recoveryInProgress
      ? "restore-from-backup-confirm-button"
      : "restore-from-backup-restoring-button";

    return html`
      <div
        id="restore-from-backup-wrapper"
        aria-labelledby="restore-from-backup-header"
        aria-describedby="restore-from-backup-description"
      >
        ${this.aboutWelcomeEmbedded ? null : this.headerTemplate()}
        <main id="restore-from-backup-content">
          ${!this.aboutWelcomeEmbedded &&
          this.backupServiceState?.recoveryErrorCode
            ? this.errorTemplate()
            : null}
          ${!this.aboutWelcomeEmbedded &&
          this.backupServiceState?.backupFileInfo
            ? this.descriptionTemplate()
            : null}
          ${this.controlsTemplate()}
        </main>

        <moz-button-group id="restore-from-backup-button-group">
          ${this.aboutWelcomeEmbedded ? null : this.cancelButtonTemplate()}
          <moz-button
            id="restore-from-backup-confirm-button"
            @click=${this.handleConfirm}
            type="primary"
            data-l10n-id=${buttonL10nId}
            ?disabled=${!this.backupServiceState?.backupFileToRestore ||
            this.backupServiceState?.recoveryInProgress}
          ></moz-button>
        </moz-button-group>
      </div>
    `;
  }

  headerTemplate() {
    return html`
      <h1
        id="restore-from-backup-header"
        class="heading-medium"
        data-l10n-id="restore-from-backup-header"
      ></h1>
    `;
  }

  cancelButtonTemplate() {
    return html`
      <moz-button
        id="restore-from-backup-cancel-button"
        @click=${this.handleCancel}
        data-l10n-id="restore-from-backup-cancel-button"
      ></moz-button>
    `;
  }

  descriptionTemplate() {
    let { date } = this.backupServiceState?.backupFileInfo || {};
    let dateTime = date && new Date(date).getTime();
    return html`
      <moz-message-bar
        id="restore-from-backup-description"
        type="info"
        data-l10n-id="restore-from-backup-description-with-metadata"
        data-l10n-args=${JSON.stringify({
          date: dateTime,
        })}
      >
        <a
          id="restore-from-backup-learn-more-link"
          slot="support-link"
          is="moz-support-link"
          support-page="firefox-backup"
          data-l10n-id="restore-from-backup-support-link"
        ></a>
      </moz-message-bar>
    `;
  }

  errorTemplate() {
    // We handle incorrect password errors in the password input
    if (this.isIncorrectPassword) {
      return null;
    }

    return html`
      <moz-message-bar
        id="restore-from-backup-error"
        type="error"
        data-l10n-id=${getErrorL10nId(
          this.backupServiceState?.recoveryErrorCode
        )}
      >
      </moz-message-bar>
    `;
  }

  genericFileErrorTemplate() {
    // We handle incorrect password errors in the password input
    if (this.isIncorrectPassword) {
      return null;
    }

    return html`
      <span
        id="backup-generic-file-error"
        class="field-error"
        data-l10n-id="backup-file-restore-file-validation-error"
      >
        <a
          id="backup-generic-error-link"
          target="_blank"
          slot="support-link"
          data-l10n-name="restore-problems"
          href=${this.getSupportURLWithUTM("firefox-backup")}
          rel="noopener noreferrer"
        ></a>
      </span>
    `;
  }

  render() {
    this.applyContentCustomizations();
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/backup/restore-from-backup.css"
      />
      ${this.contentTemplate()}
    `;
  }
}

customElements.define("restore-from-backup", RestoreFromBackup);
