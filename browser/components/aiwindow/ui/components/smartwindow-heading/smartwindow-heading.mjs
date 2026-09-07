/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-badge.mjs";

/**
 * Smart Window fullpage heading with logo and beta badge.
 */
export class SmartwindowHeading extends MozLitElement {
  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/smartwindow-heading.css"
      />
      <div class="heading-container">
        <img
          class="heading-logo"
          src="chrome://browser/skin/smart-window.svg"
          alt=""
          role="presentation"
        />
        <div class="heading-title">
          <h1
            data-l10n-id="smartwindow-fullpage-heading"
            aria-describedby="heading-beta-badge"
          ></h1>
          <moz-badge id="heading-beta-badge" type="beta"></moz-badge>
        </div>
      </div>
    `;
  }
}

customElements.define("smartwindow-heading", SmartwindowHeading);
