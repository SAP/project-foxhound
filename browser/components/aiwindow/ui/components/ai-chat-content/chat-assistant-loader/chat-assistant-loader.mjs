/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html, nothing } from "chrome://global/content/vendor/lit.all.mjs";

/**
 * Loader shown while the assistant is preparing a response.
 *
 * @property {string} mode - "search" | "nl" | "default"
 */
export class ChatAssistantLoader extends MozLitElement {
  static properties = {
    mode: { type: String },
  };

  constructor() {
    super();
    this.mode = "default";
  }

  render() {
    let iconTemplate;
    let textTemplate = nothing;

    switch (this.mode) {
      case "search":
        iconTemplate = html`
          <span class="chat-assistant-loader__spinner"></span>
        `;
        textTemplate = html`
          <p
            class="chat-assistant-loader__text"
            data-l10n-id="smartwindow-search-loader-text"
          ></p>
        `;
        break;
      case "nl":
        iconTemplate = html`
          <span class="chat-assistant-loader__nl-icon"></span>
        `;
        textTemplate = html`
          <p
            class="chat-assistant-loader__nl-text"
            data-l10n-id="smartwindow-nl-thinking"
          ></p>
        `;
        break;
      default:
        iconTemplate = html`
          <span class="chat-assistant-loader__spinner"></span>
        `;
    }

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/chat-assistant-loader.css"
      />
      <div
        class="chat-assistant-loader"
        role="status"
        data-l10n-id=${this.mode === "default"
          ? "smartwindow-loading-assistant-response"
          : nothing}
        data-l10n-attrs=${this.mode === "default" ? "aria-label" : nothing}
      >
        ${iconTemplate}${textTemplate}
      </div>
    `;
  }
}

customElements.define("chat-assistant-loader", ChatAssistantLoader);
