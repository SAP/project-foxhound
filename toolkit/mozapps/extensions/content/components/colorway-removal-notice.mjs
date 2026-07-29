/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AboutAddonsHTMLElement, openAmoInTab } from "../aboutaddons-utils.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  ColorwayThemeMigration:
    "resource://gre/modules/ColorwayThemeMigration.sys.mjs",
});

class ColorwayRemovalNotice extends AboutAddonsHTMLElement {
  static get markup() {
    return `
      <template>
        <moz-message-bar
          data-l10n-id="colorway-removal-notice-message"
          dismissable
        >
          <a
            is="moz-support-link"
            support-page="colorways"
            data-l10n-id="colorway-removal-notice-learn-more"
            slot="support-link"
          ></a>

          <button
            slot="actions"
            action="open-amo-colorway-collection"
            data-l10n-id="colorway-removal-notice-button"
          ></button>
        </moz-message-bar>
      </template>
    `;
  }

  connectedCallback() {
    // The pref CLEANUP_PREF is set by the
    // ColorwayThemeMigration.sys.mjs. We show the notice only if, during the
    // colorway theme uninstall, we detect some colorway builtin theme.
    if (
      Services.prefs.getIntPref(
        lazy.ColorwayThemeMigration.CLEANUP_PREF,
        lazy.ColorwayThemeMigration.CLEANUP_UNKNOWN
      ) != lazy.ColorwayThemeMigration.CLEANUP_COMPLETED_WITH_BUILTIN
    ) {
      return;
    }

    this.appendChild(ColorwayRemovalNotice.fragment);
    this.addEventListener("click", this);
    this.messageBar = this.querySelector("moz-message-bar");
    this.messageBar.addEventListener("message-bar:user-dismissed", this);
  }

  handleEvent(e) {
    if (e.type === "message-bar:user-dismissed") {
      Services.prefs.setIntPref(
        lazy.ColorwayThemeMigration.CLEANUP_PREF,
        lazy.ColorwayThemeMigration.CLEANUP_COMPLETED
      );
    }

    if (
      e.type === "click" &&
      e.target.getAttribute("action") === "open-amo-colorway-collection"
    ) {
      openAmoInTab(this, "collections/4757633/colorways");
    }
  }
}
customElements.define("colorway-removal-notice", ColorwayRemovalNotice);
