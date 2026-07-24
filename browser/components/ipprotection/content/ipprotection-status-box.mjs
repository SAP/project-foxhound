/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html } from "chrome://global/content/vendor/lit.all.mjs";

/**
 * Custom element that implements the state UI for the status card.
 */
export default class IPProtectionStatusBox extends MozLitElement {
  static queries = {
    titleEl: "#title",
    descriptionEl: "#description",
  };

  static shadowRootOptions = {
    ...MozLitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static properties = {
    headerL10nId: { type: String },
    descriptionL10nId: { type: String },
    descriptionL10nArgs: { type: String },
    type: { type: String },
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

  focus() {
    this.connectionButtonEl?.focus();
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

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/ipprotection/ipprotection-status-box.css"
      />
      <div id="content-container" class=${this.type}>
        <span id="header">
          <h1 id="title" data-l10n-id=${this.headerL10nId}></h1>
          <slot name="icon"></slot>
        </span>
        <div id="content">
          ${this.descriptionL10nId
            ? html`<span
                id="description"
                data-l10n-id=${this.descriptionL10nId}
                data-l10n-args=${this.descriptionL10nArgs}
              ></span>`
            : null}
          <slot name="bandwidth"></slot>
          <div id="location">
            <slot name="location-icon"></slot>
            <slot name="location"></slot>
          </div>
        </div>
        <slot name="action"></slot>
        <slot name="content"></slot>
      </div>
    `;
  }
}

customElements.define("ipprotection-status-box", IPProtectionStatusBox);
