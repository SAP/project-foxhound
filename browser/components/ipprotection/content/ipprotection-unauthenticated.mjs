/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { BANDWIDTH } from "chrome://browser/content/ipprotection/ipprotection-constants.mjs";

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

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/ipprotection/ipprotection-content.css"
      />
      <div id="unauthenticated-vpn-content">
        <img
          id="unauthenticated-vpn-img"
          src="chrome://browser/content/ipprotection/assets/vpn-panel-get-started-light.svg"
          alt=""
        />
        <h2
          id="unauthenticated-vpn-title"
          class="vpn-title"
          data-l10n-id="unauthenticated-vpn-title"
        ></h2>
        <ul id="unauthenticated-vpn-message" class="vpn-description">
          <li data-l10n-id="unauthenticated-hide-location-message-2"></li>
          <li
            data-l10n-id="unauthenticated-bandwidth-limit-message"
            data-l10n-args=${JSON.stringify({ maxUsage: BANDWIDTH.MAX_IN_GB })}
          ></li>
        </ul>
        <moz-button
          id="unauthenticated-get-started"
          class="vpn-button"
          data-l10n-id="unauthenticated-get-started"
          type="primary"
          @click=${this.handleOptIn}
        ></moz-button>
      </div>
    `;
  }
}

customElements.define(
  "ipprotection-unauthenticated",
  IPProtectionUnauthenticatedContentElement
);
