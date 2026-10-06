/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @import { Setting } from "chrome://global/content/preferences/Setting.mjs"
 *
 * @typedef {[messageLabel: string, buttonLabel: string]} RestartStrings
 *  The message label and button label for the restart message.
 */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html } from "chrome://global/content/vendor/lit.all.mjs";

/**
 * Get the prefs Localization bundle for a set of locales.
 *
 * @param {string[]} preferredLocales
 *  Try these locales before falling back if they aren't installed.
 */
function getBundleForLocales(preferredLocales) {
  let locales = Array.from(
    new Set([
      ...preferredLocales,
      ...Services.locale.requestedLocales,
      Services.locale.lastFallbackLocale,
    ])
  );
  return new Localization(
    ["browser/preferences/preferences.ftl", "branding/brand.ftl"],
    false,
    undefined,
    locales
  );
}

class BrowserLanguageRestartMessage extends MozLitElement {
  static properties = {
    setting: { type: Object },
    messageStrings: { type: Array, state: true },
    pendingLocale: { type: String, state: true },
    showError: { type: Boolean, state: true },
  };
  static MESSAGE_L10N_ID = "confirm-browser-language-change-description";
  static BUTTON_L10N_ID = "confirm-browser-language-change-button";
  static MESSAGE_L10N_IDS = [this.MESSAGE_L10N_ID, this.BUTTON_L10N_ID];

  constructor() {
    super();

    /** @type {Setting} */
    this.setting;
    /** @type {RestartStrings[]} */
    this.messageStrings = [];
    /** @type {string | null} */
    this.pendingLocale = null;
    this.showError = false;
  }

  willUpdate() {
    let { pendingLocale, installError } = this.browserLanguage;
    this.showError = installError;
    if (!pendingLocale) {
      this.pendingLocale = null;
      this.messageStrings = [];
    } else if (pendingLocale != this.pendingLocale) {
      this.pendingLocale = this.browserLanguage.pendingLocale;
      this.loadMessages(this.pendingLocale);
    }
  }

  /**
   * Load the restart message in both the old and new locales, or just one if
   * the strings are the same.
   *
   * @param {string} pendingLocale The locale code to switch to.
   */
  async loadMessages(pendingLocale) {
    let newBundle = getBundleForLocales([pendingLocale]);
    let [newLocaleMessage, currLocaleMessage] = await Promise.all(
      [newBundle, document.l10n].map(
        bundle =>
          /** @type {Promise<RestartStrings>} */ (
            bundle.formatValues(BrowserLanguageRestartMessage.MESSAGE_L10N_IDS)
          )
      )
    );
    if (pendingLocale != this.pendingLocale) {
      // Locale changed while localizing, nothing to do.
      return;
    }
    if (
      newLocaleMessage[0] == currLocaleMessage[0] &&
      newLocaleMessage[1] == currLocaleMessage[1]
    ) {
      // Only include one message bar if the messages are the same.
      this.messageStrings = [newLocaleMessage];
    } else {
      this.messageStrings = [newLocaleMessage, currLocaleMessage];
    }
  }

  get browserLanguage() {
    let handler = /** @type {AsyncSettingHandler} */ (
      this.setting.deps.browserLanguages.config
    );
    return /** @type {BrowserLanguagesSetting} */ (
      /** @type {unknown} */ (handler.asyncSetting)
    );
  }

  applyAndRestart() {
    this.browserLanguage.applyAndRestart();
  }

  render() {
    if (!this.messageStrings.length && !this.showError) {
      return "";
    }

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/preferences/widgets/browser-language-restart-message.css"
      />
      <div class="message-container">
        ${this.showError
          ? html`
              <moz-message-bar
                type="error"
                data-l10n-id="browser-language-install-error"
              ></moz-message-bar>
            `
          : ""}
        ${this.messageStrings.map(
          ([messageLabel, buttonLabel]) => html`
            <moz-message-bar .message=${messageLabel}>
              <moz-button slot="actions" @click=${this.applyAndRestart}
                >${buttonLabel}</moz-button
              >
            </moz-message-bar>
          `
        )}
      </div>
    `;
  }
}
customElements.define(
  "browser-language-restart-message",
  BrowserLanguageRestartMessage
);
