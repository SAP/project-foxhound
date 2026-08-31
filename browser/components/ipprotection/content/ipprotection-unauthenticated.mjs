/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { LINKS } from "chrome://browser/content/ipprotection/ipprotection-constants.mjs";

/**
 * A custom element that handles the signed out status of IP Protection.
 */
export default class IPProtectionUnauthenticatedContentElement extends MozLitElement {
  static shadowRootOptions = {
    ...MozLitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  constructor() {
    super();
  }

  handleOptIn() {
    this.dispatchEvent(
      new CustomEvent("IPProtection:OptIn", { bubbles: true, composed: true })
    );
  }

  handleTosClick(event) {
    event.preventDefault();
    if (
      event.target.id === "vpn-terms-of-service" ||
      event.target.id === "vpn-privacy-notice"
    ) {
      const win = event.target.documentGlobal;
      win.openWebLinkIn(event.target.href, "tab");
      this.dispatchEvent(
        new CustomEvent("IPProtection:Close", { bubbles: true, composed: true })
      );
    }
  }

  handleLearnMoreClick(event) {
    event.preventDefault();
    if (event.target.classList.contains("learn-more-vpn")) {
      const win = event.target.documentGlobal;
      win.openWebLinkIn(event.target.href, "tab");
      this.dispatchEvent(
        new CustomEvent("IPProtection:Close", { bubbles: true, composed: true })
      );
    }
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/ipprotection/ipprotection-content.css"
      />
      <div id="unauthenticated-vpn-content">
        <img
          id="unauthenticated-vpn-img"
          src="chrome://browser/content/ipprotection/assets/ipprotection-unauthenticated.svg"
          alt=""
        />
        <h2
          id="unauthenticated-vpn-title"
          class="vpn-title"
          data-l10n-id="unauthenticated-vpn-title"
        ></h2>
        <ul id="unauthenticated-vpn-message" class="vpn-description">
          <li
            id="unauthenticated-private-location"
            @click=${this.handleLearnMoreClick}
            class="with-icon"
          >
            <span data-l10n-id="unauthenticated-private-location-message">
              <a
                class="learn-more-vpn"
                data-l10n-name="learn-more-vpn"
                href=${Services.urlFormatter.formatURLPref(
                  "app.support.baseURL"
                ) + LINKS.SUPPORT_SLUG}
              ></a>
            </span>
          </li>
          <li id="unauthenticated-choose-location" class="with-icon">
            <span
              data-l10n-id="unauthenticated-choose-location-message-1"
            ></span>
          </li>
        </ul>
        <moz-button
          id="unauthenticated-get-started"
          class="vpn-button"
          data-l10n-id="unauthenticated-get-started"
          type="primary"
          @click=${this.handleOptIn}
        ></moz-button>
        <span
          id="unauthenticated-footer"
          data-l10n-id="unauthenticated-terms-of-service-privacy-notice"
          @click=${this.handleTosClick}
        >
          <a
            id="vpn-terms-of-service"
            href=${LINKS.TERMS_OF_SERVICE_URL}
            data-l10n-name="vpn-terms-of-service"
          ></a>
          <a
            id="vpn-privacy-notice"
            href=${LINKS.PRIVACY_NOTICE_URL}
            data-l10n-name="vpn-privacy-notice"
          ></a>
        </span>
      </div>
    `;
  }
}

customElements.define(
  "ipprotection-unauthenticated",
  IPProtectionUnauthenticatedContentElement
);
