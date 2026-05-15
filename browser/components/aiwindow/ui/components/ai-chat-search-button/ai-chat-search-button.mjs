/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-button.mjs";

/**
 * AI Chat Assistant Search Button.
 *
 * @property {string} label - button label passed by the chat assistant
 * @property {string} query - search query passed by the chat assistant
 * @property {string} engineIcon - default search engine icon
 */
export class AIChatSearchButton extends MozLitElement {
  static properties = {
    label: { type: String },
    query: { type: String },
    engineIcon: {
      type: String,
    },
  };

  constructor() {
    super();
    this.engineIcon = "chrome://global/skin/icons/search-glass.svg";
    this.label = "Search";
  }

  /**
   * Triggers the search event.
   *
   * @param {string} query
   */
  createSearchQuery(query) {
    const event = new CustomEvent("AIWindow:chat-search", {
      detail: query,
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    return html`<link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/ai-chat-search-button.css"
      /><moz-button
        id="ai-chat-search-button"
        class="ai-chat-search-button"
        iconSrc=${this.engineIcon}
        size="small"
        @click=${_e => this.createSearchQuery(this.query)}
      >
        ${this.label}
      </moz-button>`;
  }
}
customElements.define("ai-chat-search-button", AIChatSearchButton);
