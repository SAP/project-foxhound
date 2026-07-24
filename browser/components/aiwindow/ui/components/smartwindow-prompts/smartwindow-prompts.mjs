/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-button.mjs";

/**
 * A component for displaying conversation starter prompts.
 * Renders a list of prompt buttons that can be clicked to start a conversation.
 *
 * @property {Array<{text: string, type: string}>} prompts - Array of prompt objects to display
 */
export class SmartWindowPrompts extends MozLitElement {
  static properties = {
    prompts: { type: Array },
    mode: { type: String, reflect: true },
  };

  constructor() {
    super();
    this.prompts = [];
    this.mode = "fullpage";
  }

  #promptSelected(swPrompt) {
    const event = new CustomEvent("SmartWindowPrompt:prompt-selected", {
      detail: { text: swPrompt.text, type: swPrompt.type },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this.prompts.length) {
      return html``;
    }

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/smartwindow-prompts.css"
      />
      <!-- TODO : TODO a11y translations? -->
      <div class="sw-prompts-container" role="group">
        ${this.prompts.map(
          swPrompt => html`
            <moz-button
              class="sw-prompt-button"
              @click=${() => this.#promptSelected(swPrompt)}
              aria-label=${swPrompt.text}
            >
              ${swPrompt.text}
            </moz-button>
          `
        )}
      </div>
    `;
  }
}

customElements.define("smartwindow-prompts", SmartWindowPrompts);
