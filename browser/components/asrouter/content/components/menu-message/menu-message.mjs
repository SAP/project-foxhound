/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-button.mjs";

/**
 * This widget is for messages that can be displayed in panelview menus.
 * Can be used to message signed out users encouraging them to sign in or
 * asking users to set firefox as default.
 */
export default class MenuMessage extends MozLitElement {
  static shadowRootOptions = {
    ...MozLitElement.shadowRootOptions,
    delegatesFocus: true,
  };
  static properties = {
    imageURL: { type: String },
    logoURL: { type: String },
    buttonText: { type: String },
    primaryButtonSize: { type: String, reflect: true },
    primaryText: { type: String },
    secondaryText: { type: String },
    layout: { type: String, reflect: true },
  };
  static queries = {
    primaryButton: "#primary-button",
    closeButton: "#close-button",
  };

  constructor() {
    super();
    this.layout = "column"; // Default layout
    this.primaryButtonSize = "default"; // Default button size
    this.addEventListener(
      "keydown",
      event => {
        let keyCode = event.code;
        switch (keyCode) {
          case "ArrowLeft":
          // Intentional fall-through
          case "ArrowRight":
          // Intentional fall-through
          case "ArrowUp":
          // Intentional fall-through
          case "ArrowDown": {
            if (this.shadowRoot.activeElement === this.primaryButton) {
              this.closeButton.focus();
            } else {
              this.primaryButton.focus();
            }
            break;
          }
        }
      },
      { capture: true }
    );
  }

  handleClose(event) {
    // Keep the menu open by stopping the click event from
    // propagating up.
    event.stopPropagation();
    this.dispatchEvent(new CustomEvent("MenuMessage:Close"), {
      bubbles: true,
    });
  }

  handlePrimaryButton() {
    this.dispatchEvent(new CustomEvent("MenuMessage:PrimaryButton"), {
      bubbles: true,
    });
  }

  get isRowLayout() {
    return this.layout === "row";
  }

  render() {
    return html`<link
        rel="stylesheet"
        href="chrome://browser/content/asrouter/components/menu-message.css"
      />
      <div
        id="container"
        layout=${this.layout}
        ?has-image=${this.imageURL}
        ?has-logo=${this.logoURL}
      >
        ${this.isRowLayout
          ? html`
              <div id="top-row">
                <div id="logo-container">
                  <img id="logo" role="presentation" src=${this.logoURL} />
                </div>
                <moz-button
                  id="close-button"
                  @click=${this.handleClose}
                  type="ghost"
                  iconsrc="resource://content-accessible/close-12.svg"
                  tabindex="2"
                  data-l10n-id="fxa-menu-message-close-button"
                >
                </moz-button>
              </div>
              <div id="bottom-row">
                <div id="primary">${this.primaryText}</div>
                <div id="secondary">${this.secondaryText}</div>
                <div id="illustration-button-container">
                  <moz-button
                    id="primary-button"
                    @click=${this.handlePrimaryButton}
                    type="primary"
                    size=${this.primaryButtonSize}
                    tabindex="1"
                    autofocus
                    title=${this.buttonText}
                    aria-label=${this.buttonText}
                  >
                    ${this.buttonText}
                  </moz-button>
                  <div id="illustration-container">
                    <img
                      id="illustration"
                      role="presentation"
                      src=${this.imageURL}
                    />
                  </div>
                </div>
              </div>
            `
          : html`
              <div id="top-row">
                <div id="logo-container">
                  <img id="logo" role="presentation" src=${this.logoURL} />
                </div>
                <moz-button
                  id="close-button"
                  @click=${this.handleClose}
                  type="ghost"
                  iconsrc="resource://content-accessible/close-12.svg"
                  tabindex="2"
                  data-l10n-id="fxa-menu-message-close-button"
                >
                </moz-button>
              </div>
              <div id="illustration-container">
                <img
                  id="illustration"
                  role="presentation"
                  src=${this.imageURL}
                />
              </div>
              <div id="primary">${this.primaryText}</div>
              <div id="secondary">${this.secondaryText}</div>
              <moz-button
                id="primary-button"
                @click=${this.handlePrimaryButton}
                type="primary"
                size=${this.primaryButtonSize}
                tabindex="1"
                autofocus
                title=${this.buttonText}
                aria-label=${this.buttonText}
              >
                ${this.buttonText}
              </moz-button>
            `}
      </div>`;
  }
}

customElements.define("menu-message", MenuMessage);
