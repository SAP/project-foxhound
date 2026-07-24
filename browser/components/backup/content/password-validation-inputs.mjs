/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/backup/password-rules-tooltip.mjs";

/**
 * The widget for enabling password protection if the backup is not yet
 * encrypted.
 */
export default class PasswordValidationInputs extends MozLitElement {
  static properties = {
    _hasEmail: { type: Boolean, state: true },
    _passwordsMatch: { type: Boolean, state: true },
    _passwordsValid: { type: Boolean, state: true },
    _tooShort: { type: Boolean, state: true },
    createPasswordLabelL10nId: {
      type: String,
      reflect: true,
      attribute: "create-password-label-l10n-id",
    },
    embeddedFxBackupOptIn: {
      type: Boolean,
      reflect: true,
      attribute: "embedded-fx-backup-opt-in",
    },
  };

  static get queries() {
    return {
      formEl: "#password-inputs-form",
      inputNewPasswordEl: "#new-password-input",
      inputRepeatPasswordEl: "#repeat-password-input",
      passwordRulesEl: "#password-rules",
      repeatPasswordErrorEl: "#repeat-password-error",
    };
  }

  constructor() {
    super();
    this._tooShort = true;
    this._hasEmail = false;
    this._passwordsMatch = false;
    this._passwordsValid = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._onKeydown = e => {
      if (e.key === "Escape" && this.passwordRulesEl.open) {
        this.passwordRulesEl.hide();
        e.stopPropagation();
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", this._onKeydown, true);
  }
  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKeydown, true);
    super.disconnectedCallback();
  }

  setInputValidity(input, isValid, describedById = null) {
    input.setAttribute("aria-invalid", isValid ? "false" : "true");
    if (describedById) {
      input.setAttribute("aria-describedby", describedById);
    } else {
      input.removeAttribute("aria-describedby");
    }
  }

  reset() {
    this.formEl?.reset();
    if (this.inputNewPasswordEl) {
      this.inputNewPasswordEl.revealPassword = false;
      this.setInputValidity(this.inputNewPasswordEl, true);
    }
    if (this.inputRepeatPasswordEl) {
      this.inputRepeatPasswordEl.revealPassword = false;
      this.setInputValidity(this.inputRepeatPasswordEl, true);
    }
    this._hasEmail = false;
    this._tooShort = true;
    this._passwordsMatch = false;
    this._passwordsValid = false;
    this.passwordRulesEl.hide();
  }

  handleFocusNewPassword() {
    this.passwordRulesEl.show();
  }

  handleBlurNewPassword(event) {
    if (event.target.checkValidity()) {
      this.passwordRulesEl.hide();
    }
  }

  handleChangeNewPassword() {
    this.updatePasswordValidity();
  }

  handleChangeRepeatPassword() {
    this.updatePasswordValidity();
  }

  updatePasswordValidity() {
    const emailRegex = /^[\w!#$%&'*+/=?^`{|}~.-]+@[A-Z0-9-]+\.[A-Z0-9.-]+$/i;
    const l10n = new Localization(["browser/backupSettings.ftl"], true);

    this._hasEmail = emailRegex.test(this.inputNewPasswordEl.value);
    if (this._hasEmail) {
      const invalid_password_email_l10n_message = l10n.formatValueSync(
        "password-validity-has-email"
      );

      this.inputNewPasswordEl.setCustomValidity(
        invalid_password_email_l10n_message
      );
    } else {
      this.inputNewPasswordEl.setCustomValidity("");
    }

    const newPassValidity = this.inputNewPasswordEl.validity;
    this._tooShort = newPassValidity?.valueMissing || newPassValidity?.tooShort;

    const newInvalid = !newPassValidity?.valid;
    this.setInputValidity(
      this.inputNewPasswordEl,
      !newInvalid,
      "password-rules-tooltip"
    );

    this._passwordsMatch =
      this.inputNewPasswordEl.value == this.inputRepeatPasswordEl.value;

    if (!this._passwordsMatch) {
      this.inputRepeatPasswordEl.setCustomValidity(
        l10n.formatValueSync("password-validity-do-not-match")
      );
      this.setInputValidity(
        this.inputRepeatPasswordEl,
        false,
        "repeat-password-error"
      );
      document.l10n.setAttributes(
        this.repeatPasswordErrorEl,
        "password-validity-do-not-match"
      );
    } else {
      this.inputRepeatPasswordEl.setCustomValidity("");
      this.setInputValidity(this.inputRepeatPasswordEl, true);
    }

    const repeatPassValidity = this.inputRepeatPasswordEl.validity;
    this._passwordsValid =
      newPassValidity?.valid &&
      repeatPassValidity?.valid &&
      this._passwordsMatch;
  }

  /**
   * Dispatches a custom event whenever validity changes.
   *
   * @param {Map<string, any>} changedProperties a Map of recently changed properties and their new values
   */
  updated(changedProperties) {
    if (!changedProperties.has("_passwordsValid")) {
      return;
    }

    if (this._passwordsValid) {
      this.dispatchEvent(
        new CustomEvent("ValidPasswordsDetected", {
          bubbles: true,
          composed: true,
          detail: {
            password: this.inputNewPasswordEl.value,
          },
        })
      );
    } else {
      this.dispatchEvent(
        new CustomEvent("InvalidPasswordsDetected", {
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  contentTemplate() {
    return html`
      <div id="password-inputs-wrapper" aria-live="polite">
        <form id="password-inputs-form">
          <!--TODO: (bug 1909983) change first input field label for the "change-password" dialog-->
          <label id="new-password-label" for="new-password-input">
            <div id="new-password-label-wrapper-span-input">
              <span
                id="new-password-span"
                data-l10n-id=${this.createPasswordLabelL10nId ||
                "enable-backup-encryption-create-password-label"}
              ></span>
              <input
                type="password"
                id="new-password-input"
                minlength="8"
                required
                aria-describedby="password-rules-tooltip"
                @input=${this.handleChangeNewPassword}
                @blur=${this.handleBlurNewPassword}
                @mouseenter=${this.handleFocusNewPassword}
                @focus=${this.handleFocusNewPassword}
              />
              <!--TODO: (bug 1909984) improve how we read out the first input field for screen readers-->
            </div>
          </label>
          <!--TODO: (bug 1909984) look into how the tooltip vs dialog behaves when pressing the ESC key-->
          <password-rules-tooltip
            id="password-rules"
            role="tooltip"
            .hasEmail=${this._hasEmail}
            .tooShort=${this._tooShort}
            ?embedded-fx-backup-opt-in=${this.embeddedFxBackupOptIn}
          ></password-rules-tooltip>
          <label id="repeat-password-label" for="repeat-password-input">
            <span
              id="repeat-password-span"
              data-l10n-id="enable-backup-encryption-repeat-password-label"
            ></span>
            <input
              type="password"
              id="repeat-password-input"
              required
              @input=${this.handleChangeRepeatPassword}
            />
            <span
              id="repeat-password-error"
              role="alert"
              class="field-error"
            ></span>
          </label>
        </form>
      </div>
    `;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/backup/password-validation-inputs.css"
      />
      ${this.contentTemplate()}
    `;
  }
}

customElements.define("password-validation-inputs", PasswordValidationInputs);
