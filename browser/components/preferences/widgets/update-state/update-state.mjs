/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html, ifDefined } from "chrome://global/content/vendor/lit.all.mjs";

/**
 * @typedef {object} UpdateStateInfo
 * @property {string} l10nId - The localization ID for the update-state label.
 * @property {string} [iconSrc] - The icon URL for the update-state.
 * @property {string} [buttonL10nId] - The localization ID for the update-state button.
 * @property {string} [buttonId] - The ID for the update-state button.
 * @property {string} [buttonAction] - The action for the update-state button.
 * @property {boolean} [buttonDisabled] - The disabled state of the update-state button.
 */

/**
 * @type {Record<string, UpdateStateInfo>}
 */
const updateStatusToMetadata = {
  checkForUpdates: {
    l10nId: "",
    buttonL10nId: "update-checkForUpdatesButton",
    buttonId: "checkForUpdatesButton",
    buttonAction: "check",
  },
  downloadAndInstall: {
    l10nId: "",
    buttonId: "downloadAndInstallButton",
    buttonAction: "download",
  },
  apply: {
    l10nId: "",
    buttonL10nId: "update-updateButton",
    buttonId: "updateButton",
    buttonAction: "update",
  },
  checkingForUpdates: {
    l10nId: "settings-update-checking-for-updates",
    iconSrc: "chrome://global/skin/icons/loading.svg",
    buttonL10nId: "update-checkForUpdatesButton",
    buttonDisabled: true,
  },
  downloading: {
    l10nId: "settings-update-downloading-2",
    iconSrc: "chrome://global/skin/icons/loading.svg",
  },
  applying: {
    l10nId: "settings-update-applying",
    iconSrc: "chrome://global/skin/icons/loading.svg",
  },
  downloadFailed: {
    l10nId: "update-failed-main",
    buttonL10nId: "update-checkForUpdatesButton",
    buttonId: "checkForUpdatesButton2",
    buttonAction: "check",
  },
  policyDisabled: {
    l10nId: "settings-update-policy-disabled",
    buttonL10nId: "update-checkForUpdatesButton",
    buttonDisabled: true,
  },
  noUpdatesFound: {
    l10nId: "settings-update-no-updates-found",
    iconSrc: "chrome://global/skin/icons/check-filled.svg",
    buttonL10nId: "update-checkForUpdatesButton",
    buttonId: "checkForUpdatesButton3",
    buttonAction: "check",
  },
  checkingFailed: {
    l10nId: "settings-update-checking-failed",
    iconSrc: "chrome://global/skin/icons/warning.svg",
    buttonL10nId: "update-checkForUpdatesButton",
    buttonId: "checkForUpdatesButton4",
    buttonAction: "check",
  },
  otherInstanceHandlingUpdates: {
    l10nId: "settings-update-other-instance-handling-updates",
    buttonL10nId: "update-checkForUpdatesButton",
    buttonDisabled: true,
  },
  manualUpdate: {
    l10nId: "settings-update-manual-with-link",
    iconSrc: "chrome://global/skin/icons/warning.svg",
    buttonL10nId: "update-checkForUpdatesButton",
    buttonDisabled: true,
  },
  unsupportedSystem: {
    l10nId: "settings-update-unsupported",
    buttonL10nId: "update-checkForUpdatesButton",
    buttonDisabled: true,
  },
  restarting: {
    l10nId: "settings-update-restarting",
    iconSrc: "chrome://global/skin/icons/loading.svg",
    buttonL10nId: "update-updateButton",
    buttonDisabled: true,
  },
  internalError: {
    l10nId: "settings-update-internal-error",
    iconSrc: "chrome://global/skin/icons/warning.svg",
    buttonL10nId: "update-checkForUpdatesButton",
    buttonDisabled: true,
  },
};

class UpdateState extends MozLitElement {
  static properties = {
    value: { type: String },
    linkURL: { type: String },
    updateVersion: { type: String },
    transfer: { type: String },
  };

  constructor() {
    super();

    /** @type {string} */
    this.value = "";
    /** @type {string} */
    this.linkURL = "";
    /** @type {string} */
    this.updateVersion = "";
    /** @type {string} */
    this.transfer = "";
  }

  update(changedProperties) {
    super.update(changedProperties);
    if (changedProperties.has("transfer") && this.value === "downloading") {
      // Dispatched so tests can observe transfer property updates during downloads.
      this.dispatchEvent(new CustomEvent("update-state:downloading"));
    }
  }

  get manualURL() {
    if (window.IS_STORYBOOK) {
      return new URL("https://www.mozilla.org/firefox/");
    }

    return new URL(
      Services.urlFormatter.formatURLPref("app.update.url.manual")
    );
  }

  handleButtonClick() {
    let { buttonAction } = updateStatusToMetadata[this.value];
    if (!buttonAction || !window.gAppUpdater) {
      return;
    }

    switch (buttonAction) {
      case "check":
        window.gAppUpdater.checkForUpdates();
        break;
      case "download":
        window.gAppUpdater.startDownload();
        break;
      case "update":
        window.gAppUpdater.buttonRestartAfterDownload();
        break;
    }
  }

  labelWithLinkTemplate() {
    let { l10nId, iconSrc } = updateStatusToMetadata[this.value];
    if (!l10nId) {
      return "";
    }

    let linkURL =
      this.value == "unsupportedSystem" ? this.linkURL : this.manualURL.href;

    // The <a> elements must remain as direct children of the localized label
    // with their data-l10n-name attributes in case locales want or need to make
    // changes to the structure or the order of the string.
    if (this.value === "unsupportedSystem") {
      return html`<span class="label" id="label" data-l10n-id=${l10nId}
        ><a
          data-l10n-name="unsupported-link"
          target="_blank"
          part="support-link"
          href=${linkURL}
        ></a
      ></span>`;
    } else if (this.value === "downloadFailed") {
      return html`<span class="label" id="label" data-l10n-id=${l10nId}
        ><a
          data-l10n-name="failed-link-main"
          target="_blank"
          part="support-link"
          href=${linkURL}
        ></a
      ></span>`;
    }

    return html`<div class="text-content">
      <img src=${iconSrc} alt="" class="icon" />
      <span
        class="label"
        id="label"
        data-l10n-id=${l10nId}
        data-l10n-args=${JSON.stringify({
          displayUrl: `${this.manualURL.origin}${this.manualURL.pathname}`,
        })}
        ><a
          data-l10n-name="manual-link"
          target="_blank"
          part="support-link"
          href=${linkURL}
        ></a
      ></span>
    </div>`;
  }

  buttonTemplate() {
    let { l10nId, buttonId, buttonL10nId, buttonDisabled } =
      updateStatusToMetadata[this.value];
    if (!buttonId && !buttonL10nId) {
      return "";
    }

    if (!l10nId) {
      if (this.value === "downloadAndInstall") {
        if (!this.updateVersion) {
          return "";
        }

        let bundle = Services.strings.createBundle(
          "chrome://browser/locale/browser.properties"
        );
        let buttonLabel = bundle.formatStringFromName(
          "update.downloadAndInstallButton.label",
          [this.updateVersion]
        );
        let buttonAccessKey = bundle.GetStringFromName(
          "update.downloadAndInstallButton.accesskey"
        );

        return html`<moz-box-button
          label=${buttonLabel}
          accesskey=${buttonAccessKey}
          @click=${this.handleButtonClick}
        >
        </moz-box-button>`;
      }

      return html`<moz-box-button
        id=${ifDefined(buttonId)}
        data-l10n-id=${buttonL10nId}
        @click=${this.handleButtonClick}
      >
      </moz-box-button>`;
    }

    return html`<moz-button
      id=${ifDefined(buttonId)}
      data-l10n-id=${buttonL10nId}
      ?disabled=${buttonDisabled}
      @click=${this.handleButtonClick}
      slot="actions"
    >
    </moz-button>`;
  }

  render() {
    if (!this.value || !updateStatusToMetadata[this.value]) {
      return "";
    }

    let { l10nId, iconSrc } = updateStatusToMetadata[this.value];

    if (!l10nId) {
      return this.buttonTemplate();
    }

    if (
      this.value === "manualUpdate" ||
      this.value === "internalError" ||
      this.value === "unsupportedSystem" ||
      this.value === "downloadFailed"
    ) {
      return html`
        <link
          rel="stylesheet"
          href="chrome://browser/content/preferences/widgets/update-state.css"
        />
        <moz-box-item class=${this.value}>
          ${this.labelWithLinkTemplate()} ${this.buttonTemplate()}
        </moz-box-item>
      `;
    }

    let dataL10nArgs = {};
    if (this.value === "downloading") {
      dataL10nArgs.transfer = this.transfer;
    }

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/preferences/widgets/update-state.css"
      />
      <moz-box-item
        iconsrc=${ifDefined(iconSrc)}
        data-l10n-id=${l10nId}
        data-l10n-args=${JSON.stringify(dataL10nArgs)}
        class=${this.value}
      >
        ${this.buttonTemplate()}
      </moz-box-item>
    `;
  }
}
customElements.define("update-state", UpdateState);
