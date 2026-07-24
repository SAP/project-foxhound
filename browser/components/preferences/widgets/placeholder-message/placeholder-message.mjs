/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html } from "chrome://global/content/vendor/lit.all.mjs";

class PlaceholderMessage extends MozLitElement {
  static properties = {
    imageSrc: { type: String },
    label: { type: String, fluent: true },
    description: { type: String, fluent: true },
    supportPage: { type: String, attribute: "support-page" },
  };

  constructor() {
    super();

    /** @type {string} */
    this.imageSrc = "";

    /** @type {string} */
    this.label = "";

    /** @type {string} */
    this.description = "";

    /** @type {string} */
    this.supportPage = "";
  }

  labelTemplate() {
    if (!this.label) {
      return "";
    }
    return html`<div class="label-wrapper">
      <span class="label heading-medium" id="label">${this.label}</span>${!this
        .description
        ? this.supportLinkTemplate()
        : ""}
    </div>`;
  }

  descriptionTemplate() {
    if (!this.description) {
      return "";
    }
    return html`<div class="description-wrapper">
      <span class="description" id="description"> ${this.description}</span
      >${this.supportLinkTemplate()}
    </div>`;
  }

  supportLinkTemplate() {
    if (!this.supportPage) {
      return "";
    }
    return html`<a
      is="moz-support-link"
      class="support-link"
      support-page=${this.supportPage}
      part="support-link"
      aria-describedby="label description"
    ></a>`;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/preferences/widgets/placeholder-message.css"
      />
      <link
        rel="stylesheet"
        href="chrome://global/skin/design-system/text-and-typography.css"
      />
      <moz-box-item>
        <div class="placeholder-container">
          <img src=${this.imageSrc} role="presentation" />
          <div class="text-container">
            ${this.labelTemplate()} ${this.descriptionTemplate()}
          </div>
        </div>
      </moz-box-item>
    `;
  }
}
customElements.define("placeholder-message", PlaceholderMessage);
