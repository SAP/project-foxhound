/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AboutAddonsHTMLElement, openAmoInTab } from "../aboutaddons-utils.mjs";

const PREF_PRIVACY_POLICY_URL = "extensions.recommendations.privacyPolicyUrl";

export class RecommendedFooter extends AboutAddonsHTMLElement {
  static get markup() {
    return `
      <template>
        <div class="amo-link-container view-footer-item">
          <button
            class="primary"
            action="open-amo"
            data-l10n-id="find-more-addons"
          ></button>
        </div>
        <div class="view-footer-item">
          <a
            class="privacy-policy-link"
            data-l10n-id="privacy-policy"
            target="_blank"
          ></a>
        </div>
      </template>
    `;
  }

  connectedCallback() {
    if (this.childElementCount == 0) {
      this.appendChild(RecommendedFooter.fragment);
      this.querySelector(".privacy-policy-link").href =
        Services.prefs.getStringPref(PREF_PRIVACY_POLICY_URL);
      this.addEventListener("click", this);
    }
  }

  handleEvent(event) {
    let action = event.target.getAttribute("action");
    switch (action) {
      case "open-amo":
        openAmoInTab(this);
        break;
    }
  }
}
customElements.define("recommended-footer", RecommendedFooter, {
  extends: "footer",
});
