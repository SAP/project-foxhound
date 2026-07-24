/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html, nothing } from "chrome://global/content/vendor/lit.all.mjs";

/**
 * Loader/spinner visible while the assistant is thinking
 *
 * isSearch - true when this component is being used for loading a search handoff action
 */
export class ChatAssistantLoader extends MozLitElement {
  static properties = {
    isSearch: { type: Boolean },
  };

  constructor() {
    super();
    this.isSearch = false;
  }

  connectedCallback() {
    super.connectedCallback();
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/chat-assistant-loader.css"
      />
      <!-- TO DO: add fluent string when UX writing team finished copy - https://bugzilla.mozilla.org/show_bug.cgi?id=2014907 -->
      <div
        class="chat-assistant-loader"
        aria-label=" ${this.isSearch ? `` : `Loading assistant response`}"
      >
        <span class="chat-assistant-loader__spinner"></span>
        ${this.isSearch
          ? html`
              <p class="chat-assistant-loader__text">Analyzing web search</p>
            `
          : nothing}
      </div>
    `;
  }
}

customElements.define("chat-assistant-loader", ChatAssistantLoader);
