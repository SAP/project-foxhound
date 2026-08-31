/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AboutAddonsHTMLElement } from "../aboutaddons-utils.mjs";

const PREF_SMARTWINDOW_TOS_CONSENT_TIME = "browser.smartwindow.tos.consentTime";
const PREF_SMARTWINDOW_THEME_NOTICE = "browser.smartwindow.showThemesNotice";

class SmartWindowThemesNotice extends AboutAddonsHTMLElement {
  #prefObserver;

  static get markup() {
    return `
      <template>
        <moz-message-bar
          data-l10n-id="smartwindow-themes-notice"
          data-l10n-attrs="message"
          dismissable
        >
        </moz-message-bar>
      </template>
    `;
  }

  connectedCallback() {
    this.addEventListener("message-bar:user-dismissed", this);
    this.#prefObserver = this.observe.bind(this);
    Services.prefs.addObserver(
      PREF_SMARTWINDOW_TOS_CONSENT_TIME,
      this.#prefObserver
    );
    Services.prefs.addObserver(
      PREF_SMARTWINDOW_THEME_NOTICE,
      this.#prefObserver
    );
    this.render();
  }

  disconnectedCallback() {
    this.removeEventListener("message-bar:user-dismissed", this);
    Services.prefs.removeObserver(
      PREF_SMARTWINDOW_TOS_CONSENT_TIME,
      this.#prefObserver
    );
    Services.prefs.removeObserver(
      PREF_SMARTWINDOW_THEME_NOTICE,
      this.#prefObserver
    );
    this.#prefObserver = null;
  }

  render() {
    let hasConsent =
      Services.prefs.getIntPref(PREF_SMARTWINDOW_TOS_CONSENT_TIME, 0) > 0;
    let shouldShowNotice = Services.prefs.getBoolPref(
      PREF_SMARTWINDOW_THEME_NOTICE,
      false
    );
    this.hidden = !(hasConsent && shouldShowNotice);
    if (!this.hidden && this.childElementCount == 0) {
      this.appendChild(SmartWindowThemesNotice.fragment);
    }
  }

  handleEvent(e) {
    if (e.type === "message-bar:user-dismissed") {
      Services.prefs.setBoolPref(PREF_SMARTWINDOW_THEME_NOTICE, false);
    }
  }

  observe(_subject, topic, data) {
    if (topic !== "nsPref:changed") {
      return;
    }
    if (
      ![
        PREF_SMARTWINDOW_TOS_CONSENT_TIME,
        PREF_SMARTWINDOW_THEME_NOTICE,
      ].includes(data)
    ) {
      return;
    }
    this.render();
  }
}
customElements.define("smartwindow-themes-notice", SmartWindowThemesNotice);
