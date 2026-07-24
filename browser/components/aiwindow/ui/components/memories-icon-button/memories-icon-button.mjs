/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

/**
 * Icon-style toggle button for enabling or disabling AI Memories.
 *
 * - `pressed`: boolean property/attribute reflected to `aria-pressed`
 * - Emits `aiwindow-memories-toggle:on-change` with `{ pressed }` on user toggle
 *
 * Logic is handled by the parent component.
 */
export class MemoriesIconButton extends MozLitElement {
  static properties = {
    pressed: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  #onClick() {
    this.pressed = !this.pressed;
    this.dispatchEvent(
      new CustomEvent("aiwindow-memories-toggle:on-change", {
        bubbles: true,
        composed: true,
        detail: { pressed: this.pressed },
      })
    );
  }

  render() {
    const ariaPressed = String(this.pressed);
    // TODO: using placeholder icons here. Update iconSrc with final path name
    // when memories on/off icons are ready.
    const iconSrc = this.pressed
      ? "chrome://browser/content/aiwindow/assets/memories-on.svg"
      : "chrome://browser/content/aiwindow/assets/memories-off.svg";

    const tooltipTextId = this.pressed
      ? "aiwindow-memories-on"
      : "aiwindow-memories-off";

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/memories-icon-button.css"
      />
      <moz-button
        ?disabled=${this.disabled}
        data-l10n-id=${tooltipTextId}
        data-l10n-attrs="tooltiptext,aria-label"
        type="ghost"
        class="memories-icon-button"
        size="default"
        iconsrc=${iconSrc}
        iconposition="start"
        aria-pressed=${ariaPressed}
        @click=${event => this.#onClick(event)}
      ></moz-button>
    `;
  }
}

customElements.define("memories-icon-button", MemoriesIconButton);
