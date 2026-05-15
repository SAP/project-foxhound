/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

/**
 * Icon-style button for showing context menu.
 *
 * Emits `aiwindow-context-button:on-click`.
 */
export class ContextIconButton extends MozLitElement {
  static properties = {
    disabled: { type: Boolean, reflect: true },
  };

  // Prevent mousedown from closing `panel-list` before the CustomEvent
  // `aiwindow-context-button:on-click` can be handled.
  #onMousedown(event) {
    event.stopPropagation();
  }

  #onClick(event) {
    this.dispatchEvent(
      new CustomEvent("aiwindow-context-button:on-click", {
        bubbles: true,
        composed: true,
        detail: { originalEvent: event },
      })
    );
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/context-icon-button.css"
      />
      <moz-button
        ?disabled=${this.disabled}
        data-l10n-id="smartbar-context-menu-button"
        data-l10n-attrs="tooltiptext,aria-label"
        type="ghost"
        class="context-icon-button"
        iconsrc="chrome://global/skin/icons/plus.svg"
        @mousedown=${event => this.#onMousedown(event)}
        @click=${event => this.#onClick(event)}
      ></moz-button>
    `;
  }
}

customElements.define("context-icon-button", ContextIconButton);
