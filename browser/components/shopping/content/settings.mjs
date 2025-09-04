/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env mozilla/remote-page */

import { html } from "chrome://global/content/vendor/lit.all.mjs";

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-toggle.mjs";

class ShoppingSettings extends MozLitElement {
  static properties = {
    adsEnabled: { type: Boolean },
    adsEnabledByUser: { type: Boolean },
    autoOpenEnabled: { type: Boolean },
    autoOpenEnabledByUser: { type: Boolean },
    autoCloseEnabledByUser: { type: Boolean },
    hostname: { type: String },
  };

  static get queries() {
    return {
      wrapperEl: "#shopping-settings-wrapper",
      recommendationsToggleEl: "#shopping-settings-recommendations-toggle",
      autoOpenToggleEl: "#shopping-settings-auto-open-toggle",
      autoOpenToggleDescriptionEl: "#shopping-auto-open-description",
      autoCloseToggleEl: "#shopping-settings-auto-close-toggle",
      autoCloseToggleDescriptionEl: "#shopping-auto-close-description",
      dividerEl: ".divider",
      optOutButtonEl: "#shopping-settings-opt-out-button",
      shoppingCardEl: "shopping-card",
      adsLearnMoreLinkEl: "#shopping-ads-learn-more-link",
      fakespotLearnMoreLinkEl: "#powered-by-fakespot-link",
    };
  }

  onToggleRecommendations() {
    this.adsEnabledByUser = this.recommendationsToggleEl.pressed;
    let action = this.adsEnabledByUser ? "enabled" : "disabled";
    Glean.shopping.surfaceAdsSettingToggled.record({ action });
    RPMSetPref(
      "browser.shopping.experience2023.ads.userEnabled",
      this.adsEnabledByUser
    );
  }

  onToggleAutoOpen() {
    this.autoOpenEnabledByUser = this.autoOpenToggleEl.pressed;
    let action = this.autoOpenEnabledByUser ? "enabled" : "disabled";
    Glean.shopping.surfaceAutoOpenSettingToggled.record({ action });
    RPMSetPref(
      "browser.shopping.experience2023.autoOpen.userEnabled",
      this.autoOpenEnabledByUser
    );
    if (!this.autoOpenEnabledByUser) {
      RPMSetPref("browser.shopping.experience2023.active", false);
    }
  }

  onToggleAutoClose() {
    this.autoCloseEnabledByUser = this.autoCloseToggleEl.pressed;
    let action = this.autoCloseEnabledByUser ? "enabled" : "disabled";
    Glean.shopping.surfaceAutoCloseSettingToggled.record({ action });

    RPMSetPref(
      "browser.shopping.experience2023.autoClose.userEnabled",
      this.autoCloseEnabledByUser
    );
  }

  onDisableShopping() {
    window.dispatchEvent(
      new CustomEvent("DisableShopping", { bubbles: true, composed: true })
    );
    Glean.shopping.surfaceOptOutButtonClicked.record();
  }

  fakespotLinkClicked(e) {
    if (e.target.localName == "a" && e.button == 0) {
      Glean.shopping.surfacePoweredByFakespotLinkClicked.record();
    }
  }

  render() {
    // Whether we show recommendations at all (including offering a user
    // control for them) is controlled via a nimbus-enabled pref.
    let canShowRecommendationToggle = this.adsEnabled;

    let adsToggleMarkup = canShowRecommendationToggle
      ? html`
        <div class="shopping-settings-toggle-option-wrapper">
          <moz-toggle
            id="shopping-settings-recommendations-toggle"
            ?pressed=${this.adsEnabledByUser}
            data-l10n-id="shopping-settings-recommendations-toggle2"
            data-l10n-attrs="label"
            @toggle=${this.onToggleRecommendations}>
            <span id="shopping-ads-learn-more" data-l10n-id="shopping-settings-recommendations-learn-more3" slot="description">
              <a
                id="shopping-ads-learn-more-link"
                target="_blank"
                href="${window.RPMGetFormatURLPref(
                  "app.support.baseURL"
                )}review-checker-review-quality?utm_campaign=learn-more&utm_medium=inproduct&utm_term=core-sidebar#w_ads_for_relevant_products"
                data-l10n-name="review-quality-url"
              ></a>
            </span>
          </moz-toggle/>
        </div>`
      : null;

    /* Auto-open experiment changes how the settings card appears by:
     * 1. Showing a new toggle for enabling/disabling auto-open behaviour
     * 2. Adding a divider between the toggles and opt-out button
     * 3. Showing text indicating that Review Checker is enabled (not opted-out) above the opt-out button
     *
     * Only show if `browser.shopping.experience2023.autoOpen.enabled` is true.
     */
    let autoOpenDescriptionL10nId =
      "shopping-settings-auto-open-description-three-sites";
    let autoOpenDescriptionL10nArgs = {
      firstSite: "Amazon",
      secondSite: "Best Buy",
      thirdSite: "Walmart",
    };
    let autoCloseDescriptionL10nId =
      "shopping-settings-auto-close-description-three-sites";
    let autoCloseDescriptionL10nArgs = {
      firstSite: "Amazon",
      secondSite: "Best Buy",
      thirdSite: "Walmart",
    };

    if (
      RPMGetBoolPref("toolkit.shopping.experience2023.defr", false) &&
      (this.hostname === "www.amazon.fr" || this.hostname === "www.amazon.de")
    ) {
      autoOpenDescriptionL10nId =
        "shopping-settings-auto-open-description-single-site";
      autoOpenDescriptionL10nArgs = {
        currentSite: "Amazon",
      };
      autoCloseDescriptionL10nId =
        "shopping-settings-auto-close-description-single-site";
      autoCloseDescriptionL10nArgs = {
        currentSite: "Amazon",
      };
    }

    let autoOpenToggleMarkup = this.autoOpenEnabled
      ? html` <div class="shopping-settings-toggle-option-wrapper">
          <moz-toggle
            id="shopping-settings-auto-open-toggle"
            ?pressed=${this.autoOpenEnabledByUser}
            data-l10n-id="shopping-settings-auto-open-toggle"
            data-l10n-attrs="label"
            @toggle=${this.onToggleAutoOpen}
          >
            <span
              slot="description"
              id="shopping-auto-open-description"
              data-l10n-id=${autoOpenDescriptionL10nId}
              data-l10n-args=${JSON.stringify(autoOpenDescriptionL10nArgs)}
            ></span>
          </moz-toggle>
        </div>`
      : null;

    let autoCloseToggleMarkup = html` <div
      class="shopping-settings-toggle-option-wrapper"
    >
      <moz-toggle
        id="shopping-settings-auto-close-toggle"
        ?pressed=${this.autoCloseEnabledByUser}
        data-l10n-id="shopping-settings-auto-close-toggle"
        data-l10n-attrs="label"
        @toggle=${this.onToggleAutoClose}
      >
        <span
          slot="description"
          id="shopping-auto-close-description"
          data-l10n-id=${autoCloseDescriptionL10nId}
          data-l10n-args=${JSON.stringify(autoCloseDescriptionL10nArgs)}
        ></span>
      </moz-toggle>
    </div>`;

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/shopping/settings.css"
      />
      <link
        rel="stylesheet"
        href="chrome://browser/content/shopping/shopping-page.css"
      />
      <shopping-card
        id="shopping-settings-label"
        data-l10n-id="shopping-settings-label"
        data-l10n-attrs="label"
        type="accordion"
      >
        <div
          id="shopping-settings-wrapper"
          class=${this.autoOpenEnabled
            ? "shopping-settings-auto-open-ui-enabled"
            : ""}
          slot="content"
        >
          <section id="shopping-settings-toggles-section">
            ${autoOpenToggleMarkup} ${autoCloseToggleMarkup} ${adsToggleMarkup}
          </section>
          ${this.autoOpenEnabled
            ? html`<span class="divider" role="separator"></span>`
            : null}
          <section id="shopping-settings-opt-out-section">
            <button
              class="small-button shopping-button"
              id="shopping-settings-opt-out-button"
              data-l10n-id="shopping-settings-opt-out-button"
              @click=${this.onDisableShopping}
            ></button>
          </section>
        </div>
      </shopping-card>
      <p
        id="powered-by-fakespot"
        data-l10n-id="powered-by-fakespot"
        @click=${this.fakespotLinkClicked}
      >
        <a
          id="powered-by-fakespot-link"
          data-l10n-name="fakespot-link"
          target="_blank"
          href="https://www.fakespot.com/our-mission?utm_source=review-checker&utm_campaign=fakespot-by-mozilla&utm_medium=inproduct&utm_term=core-sidebar"
        ></a>
      </p>
    `;
  }
}

customElements.define("shopping-settings", ShoppingSettings);
