/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html, nothing } from "chrome://global/content/vendor/lit.all.mjs";

const ERROR_TYPES = {
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMIT: 429,
  SERVER_ERROR_MIN: 500,
  SERVER_ERROR_MAX: 599,
};

/**
 * Shows an error message based on an error status
 */
export class ChatAssistantError extends MozLitElement {
  static properties = {
    errorStatus: { type: Number },
    actionButton: { type: Object },
    errorText: { type: Object },
  };

  constructor() {
    super();
    this.actionButton = null;
    this.errorText = {
      header: "smartwindow-assistant-error-generic-header",
    };
  }

  willUpdate(changed) {
    if (changed.has("errorStatus")) {
      this.getErrorInformation();
    }
  }

  // TO DO: implement action buttons functionality

  /* https://mozilla-hub.atlassian.net/browse/GENAI-2863
  also needs its own error message/functionality */

  retryAssistantMessage() {
    const event = new CustomEvent("aiChatError:retry-message", {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  /* https://mozilla-hub.atlassian.net/browse/GENAI-3170
  switchToClassic() {
    console.log("switch to classic..");
  }
  */

  /* https://mozilla-hub.atlassian.net/browse/GENAI-3171
  clearChat() {
    console.log("open a new chat..");
  }
  */

  getErrorInformation() {
    if (this.errorStatus === ERROR_TYPES.PAYLOAD_TOO_LARGE) {
      this.errorText = {
        header: "smartwindow-assistant-error-long-message-header",
      };
      // this.actionButton = {
      //   label: "smartwindow-clear-btn",
      //   action: this.clearChat,
      // };
      return;
    }
    if (this.errorStatus === ERROR_TYPES.RATE_LIMIT) {
      this.errorText = {
        header: "smartwindow-assistant-error-budget-header",
        body: "smartwindow-assistant-error-budget-body",
      };
      // this.actionButton = {
      //   label: "smartwindow-switch-btn",
      //   action: this.switchToClassic,
      // };
      return;
    }
    if (
      this.errorStatus >= ERROR_TYPES.SERVER_ERROR_MIN &&
      this.errorStatus <= ERROR_TYPES.SERVER_ERROR_MAX
    ) {
      this.actionButton = {
        label: "smartwindow-retry-btn",
        action: this.retryAssistantMessage.bind(this),
      };
    }
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/chat-assistant-error.css"
      />
      <div class="chat-assistant-error">
        <h3
          class="chat-assistant-error__header"
          data-l10n-id=${this.errorText?.header}
        ></h3>
        ${this.errorText?.body
          ? html`<p
              class="chat-assistant-error__body"
              data-l10n-id=${this.errorText?.body}
            ></p>`
          : nothing}
        ${this.actionButton
          ? html`<moz-button
              class="chat-assistant-error__button"
              data-l10n-id=${this.actionButton?.label}
              size="small"
              @click=${this.actionButton?.action}
            ></moz-button>`
          : nothing}
      </div>
    `;
  }
}

customElements.define("chat-assistant-error", ChatAssistantError);
