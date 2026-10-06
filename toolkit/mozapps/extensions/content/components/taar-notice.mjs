/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AboutAddonsHTMLElement, DiscoveryAPI } from "../aboutaddons-utils.mjs";

const PREF_RECOMMENDATION_HIDE_NOTICE = "extensions.recommendations.hideNotice";

class TaarMessageBar extends AboutAddonsHTMLElement {
  static get markup() {
    return `
      <template>
        <moz-message-bar
          class="discopane-notice"
          data-l10n-id="discopane-notice-recommendations2"
          dismissable
        >
          <a
            is="moz-support-link"
            support-page="personalized-addons"
            data-l10n-id="discopane-notice-learn-more"
            action="notice-learn-more"
            slot="support-link"
          ></a>
        </moz-message-bar>
      </template>
    `;
  }

  connectedCallback() {
    this.hidden =
      Services.prefs.getBoolPref(PREF_RECOMMENDATION_HIDE_NOTICE, false) ||
      !DiscoveryAPI.clientIdDiscoveryEnabled;
    if (this.childElementCount == 0 && !this.hidden) {
      this.appendChild(TaarMessageBar.fragment);
      this.addEventListener("click", this);
      this.messageBar = this.querySelector("moz-message-bar");
      this.messageBar.addEventListener("message-bar:user-dismissed", this);
    }
  }

  handleEvent(e) {
    if (e.type == "message-bar:user-dismissed") {
      Services.prefs.setBoolPref(PREF_RECOMMENDATION_HIDE_NOTICE, true);
    }
  }
}
customElements.define("taar-notice", TaarMessageBar);
