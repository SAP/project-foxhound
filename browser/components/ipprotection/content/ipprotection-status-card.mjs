/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html } from "chrome://global/content/vendor/lit.all.mjs";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-toggle.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/ipprotection/bandwidth-usage.mjs";

/**
 * Custom element that implements a status card for IP protection.
 */
export default class IPProtectionStatusCard extends MozLitElement {
  TOGGLE_ON_EVENT = "ipprotection-status-card:user-toggled-on";
  TOGGLE_OFF_EVENT = "ipprotection-status-card:user-toggled-off";

  static queries = {
    statusBoxEl: "ipprotection-status-box",
    actionButtonEl: 'moz-button[slot="action"]',
  };

  static shadowRootOptions = {
    ...MozLitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static properties = {
    protectionEnabled: { type: Boolean },
    enabledSince: { type: Object },
    location: { type: Object },
    bandwidthUsage: { type: Object },
    hasExclusion: { type: Boolean },
    isActivating: { type: Boolean },
  };

  constructor() {
    super();

    this.keyListener = this.#keyListener.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this.keyListener, { capture: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this.keyListener, { capture: true });
  }

  handleButtonClick() {
    const type =
      this.isActivating || this.protectionEnabled
        ? this.TOGGLE_OFF_EVENT
        : this.TOGGLE_ON_EVENT;
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        composed: true,
      })
    );
  }

  focus() {
    const button = this.shadowRoot.querySelector(`moz-button[slot="action"]`);
    button?.focus();
  }

  #keyListener(event) {
    let keyCode = event.code;
    switch (keyCode) {
      case "ArrowUp":
      // Intentional fall-through
      case "ArrowDown": {
        event.stopPropagation();
        event.preventDefault();

        let direction =
          keyCode == "ArrowDown"
            ? Services.focus.MOVEFOCUS_FORWARD
            : Services.focus.MOVEFOCUS_BACKWARD;
        Services.focus.moveFocus(
          window,
          null,
          direction,
          Services.focus.FLAG_BYKEY
        );
        break;
      }
    }
  }

  bandwidthUsageTemplate() {
    return this.bandwidthUsage
      ? html`<bandwidth-usage
          slot="bandwidth"
          remaining=${this.bandwidthUsage.remaining}
          max=${this.bandwidthUsage.max}
          numeric
        ></bandwidth-usage>`
      : null;
  }

  locationTemplate() {
    return this.location
      ? html` <img
            slot="location-icon"
            role="presentation"
            src="chrome://browser/skin/notification-icons/geo.svg"
          />
          <span slot="location">${this.location.name}</span>`
      : null;
  }

  statusTemplate({
    type,
    headerL10nId,
    buttonL10nId,
    buttonType = "default",
    buttonDisabled = false,
    iconSrc = null,
  }) {
    return html`
      <ipprotection-status-box .headerL10nId=${headerL10nId} .type=${type}>
        ${iconSrc
          ? html`<img
              slot="icon"
              role="presentation"
              class="icon"
              src=${iconSrc}
            />`
          : null}
        ${this.bandwidthUsageTemplate()} ${this.locationTemplate()}
        <moz-button
          slot="action"
          type=${buttonType}
          data-l10n-id=${buttonL10nId}
          @click=${this.handleButtonClick}
          ?disabled=${buttonDisabled}
        ></moz-button>
      </ipprotection-status-box>
    `;
  }

  render() {
    if (this.isActivating) {
      return html`
        ${this.statusTemplate({
          type: "connecting",
          headerL10nId: "ipprotection-connection-status-connecting",
          buttonL10nId: "ipprotection-button-connecting",
          iconSrc: "chrome://global/skin/icons/loading.svg",
          buttonType: "primary",
          buttonDisabled: false,
        })}
      `;
    }

    if (this.hasExclusion && this.protectionEnabled) {
      return html`
        ${this.statusTemplate({
          type: "excluded",
          headerL10nId: "ipprotection-connection-status-excluded",
          buttonL10nId: "ipprotection-button-turn-vpn-off-excluded-site",
          iconSrc:
            "chrome://browser/content/ipprotection/assets/states/ipprotection-excluded.svg",
        })}
      `;
    }

    if (this.protectionEnabled) {
      return html`
        ${this.statusTemplate({
          type: "connected",
          headerL10nId: "ipprotection-connection-status-connected",
          buttonL10nId: "ipprotection-button-turn-vpn-off",
          iconSrc:
            "chrome://browser/content/ipprotection/assets/states/ipprotection-on.svg",
        })}
      `;
    }

    return html`
      ${this.statusTemplate({
        type: "disconnected",
        headerL10nId: "ipprotection-connection-status-disconnected",
        buttonL10nId: "ipprotection-button-turn-vpn-on",
        buttonType: "primary",
      })}
    `;
  }
}

customElements.define("ipprotection-status-card", IPProtectionStatusCard);
