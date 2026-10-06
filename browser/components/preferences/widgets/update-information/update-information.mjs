/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html } from "chrome://global/content/vendor/lit.all.mjs";

class UpdateInformation extends MozLitElement {
  static properties = {
    version: { type: String },
    distribution: { type: String },
    distributionId: { type: String },
    releaseNotesURL: { type: String },
  };

  constructor() {
    super();

    /** @type {string} */
    this.version = "";

    /** @type {string} */
    this.distribution = "";

    /** @type {string} */
    this.distributionId = "";

    /** @type {string} */
    this.releaseNotesURL = "";
  }

  labelTemplate() {
    if (!this.version) {
      return "";
    }
    return html`<div class="label-wrapper">
      <span
        class="label"
        id="label"
        data-l10n-id="update-application-version"
        data-l10n-args=${JSON.stringify({ version: this.version })}
      >
        <a
          id="releasenotes"
          target="_blank"
          aria-describedby="label"
          data-l10n-name="learn-more"
          href=${this.releaseNotesURL}
          part="support-link"
          ?hidden=${!this.releaseNotesURL}
        ></a>
      </span>
    </div>`;
  }

  descriptionTemplate() {
    if (!this.distribution && !this.distributionId) {
      return "";
    }
    return html`<div class="description-wrapper text-deemphasized">
      <span class="description" id="distribution"> ${this.distribution}</span>
      <span class="description" id="distributionId">
        ${this.distributionId}</span
      >
    </div>`;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/preferences/widgets/update-information.css"
      />
      <link
        rel="stylesheet"
        href="chrome://global/skin/design-system/text-and-typography.css"
      />
      <moz-box-item>
        <div class="text-container">
          ${this.labelTemplate()} ${this.descriptionTemplate()}
        </div>
      </moz-box-item>
    `;
  }
}
customElements.define("update-information", UpdateInformation);
