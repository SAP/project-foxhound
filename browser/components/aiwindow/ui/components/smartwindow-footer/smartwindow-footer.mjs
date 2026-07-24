/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

const ALLOWED_ACTIONS = ["chats", "history"];

/**
 * A Custome element to mangage Smart Window fullpage footer
 */
export class SmartwindowFooter extends MozLitElement {
  handleActionClick(action) {
    if (!ALLOWED_ACTIONS.includes(action)) {
      console.warn("Action not allowed");
      return;
    }

    const topWin = window.browsingContext.topChromeWindow;
    topWin.FirefoxViewHandler.openTab(action);
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/smartwindow-footer.css"
      />
      <div class="footer-container">
        <moz-button
          size="small"
          type="ghost"
          data-l10n-id="smartwindow-footer-history"
          data-l10n-attrs="tooltiptext,aria-label"
          class="footer-action-button"
          iconsrc="chrome://browser/content/firefoxview/view-history.svg"
          @click=${() => {
            this.handleActionClick("history");
          }}
        ></moz-button>
        <moz-button
          size="small"
          type="ghost"
          data-l10n-id="smartwindow-footer-chats"
          data-l10n-attrs="tooltiptext,aria-label"
          class="footer-action-button"
          iconsrc="chrome://browser/content/firefoxview/view-chats.svg"
          @click=${() => {
            this.handleActionClick("chats");
          }}
        >
        </moz-button>
      </div>
    `;
  }
}

customElements.define("smartwindow-footer", SmartwindowFooter);
