/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AboutAddonsHTMLElement, openAmoInTab } from "../aboutaddons-utils.mjs";

const PREF_THEME_RECOMMENDATION_URL =
  "extensions.recommendations.themeRecommendationUrl";

class RecommendedThemesFooter extends AboutAddonsHTMLElement {
  static get markup() {
    return `
      <template>
        <p data-l10n-id="recommended-theme-1" class="theme-recommendation">
          <a data-l10n-name="link" target="_blank"></a>
        </p>
        <div class="amo-link-container view-footer-item">
          <button
            class="primary"
            action="open-amo"
            data-l10n-id="find-more-themes"
          ></button>
        </div>
      </template>
    `;
  }

  connectedCallback() {
    if (this.childElementCount == 0) {
      this.appendChild(RecommendedThemesFooter.fragment);
      let themeRecommendationRow = this.querySelector(".theme-recommendation");
      let themeRecommendationUrl = Services.prefs.getStringPref(
        PREF_THEME_RECOMMENDATION_URL
      );
      if (themeRecommendationUrl) {
        themeRecommendationRow.querySelector("a").href = themeRecommendationUrl;
      }
      themeRecommendationRow.hidden = !themeRecommendationUrl;
      this.addEventListener("click", this);
    }
  }

  handleEvent(event) {
    let action = event.target.getAttribute("action");
    switch (action) {
      case "open-amo":
        openAmoInTab(this, "themes");
        break;
    }
  }
}
customElements.define("recommended-themes-footer", RecommendedThemesFooter, {
  extends: "footer",
});
