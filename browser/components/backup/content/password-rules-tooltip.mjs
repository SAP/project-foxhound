/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

/**
 * The widget for enabling password protection if the backup is not yet
 * encrypted.
 */
export default class PasswordRulesTooltip extends MozLitElement {
  static properties = {
    hasEmail: { type: Boolean },
    tooShort: { type: Boolean },
    open: { type: Boolean },
  };

  static get queries() {
    return {
      passwordRulesEl: "#password-rules-wrapper",
    };
  }

  constructor() {
    super();
    this.hasEmail = false;
    this.tooShort = false;
    this._onResize = null;
  }

  _debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  _handleResize() {
    if (this.open) {
      this.positionPopover();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._onResize = this._debounce(() => this._handleResize(), 200);
    window.addEventListener("resize", this._onResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._onResize) {
      window.removeEventListener("resize", this._onResize);
    }
  }

  show() {
    this.passwordRulesEl.showPopover();
    this.positionPopover();
  }

  hide() {
    this.passwordRulesEl.hidePopover();
  }

  positionPopover() {
    const anchorRect = this.getBoundingClientRect();
    const popover = this.passwordRulesEl;
    const isWideViewport = window.innerWidth >= 1200;
    const isRTL = document.dir === "rtl";

    // Calculate top position
    const topPos = isWideViewport
      ? anchorRect.top + anchorRect.height / 2
      : anchorRect.bottom;

    popover.style.top = `${topPos}px`;
    popover.style.right = isRTL ? "auto" : "inherit";
    popover.style.left = isRTL ? "inherit" : "auto";
  }

  _onBeforeToggle(e) {
    this.open = e.newState == "open";
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/backup/password-rules-tooltip.css"
      />
      <div
        id="password-rules-wrapper"
        role="tooltip"
        aria-describedby="password-rules-header"
        popover="manual"
        @beforetoggle=${this._onBeforeToggle}
      >
        <h2
          id="password-rules-header"
          data-l10n-id="password-rules-header"
        ></h2>
        <ul>
          <li class=${this.tooShort && "warning"}>
            <span
              data-l10n-id="password-rules-length-description"
              class="rule-description"
              aria-labelledby="password-rules-header"
            ></span>
          </li>
          <li class=${this.hasEmail && "warning"}>
            <span
              data-l10n-id="password-rules-email-description"
              class="rule-description"
              aria-labelledby="password-rules-header"
            ></span>
          </li>
        </ul>
      </div>
    `;
  }
}

customElements.define("password-rules-tooltip", PasswordRulesTooltip);
