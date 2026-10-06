/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html, nothing } from "chrome://global/content/vendor/lit.all.mjs";

/**
 * Numeric error codes received from the back-end via error.error.
 * Codes 1-6 are MLPA spec codes; 7 is set locally for Fastly-blocked 406s
 * (e.g. when the user's IP is blocked behind a VPN).
 */
const ERROR_CODES = {
  BUDGET_EXCEEDED: 1,
  RATE_LIMIT_EXCEEDED: 2,
  CHAT_MAX_LENGTH: 3,
  MAX_USERS_REACHED: 4,
  UPSTREAM_RATE_LIMIT: 5,
  FASTLY_WAF_RATE_LIMIT: 6,
  FASTLY_BLOCKED: 7,
};

/**
 * Shows an error message based on an error code
 */
export class ChatAssistantError extends MozLitElement {
  /**
   * @typedef {object} ErrorObject
   * @property {number|string} [error] - Error subcode - number for 429, string for others
   */
  static properties = {
    error: { type: Object },
    actionButton: { type: Object },
    errorText: { type: Object },
  };

  constructor() {
    super();
    this.setGenericError();
  }

  willUpdate(changed) {
    if (changed.has("error")) {
      this.getErrorInformation();
    }
  }

  openNewChat() {
    const event = new CustomEvent("aiChatError:new-chat", {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  openAccountSignIn() {
    const event = new CustomEvent("aiChatError:sign-in", {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  retryAssistantMessage() {
    const event = new CustomEvent("aiChatError:retry-message", {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  setGenericError() {
    this.errorText = {
      header: "smartwindow-assistant-error-generic-header",
    };
    this.actionButton = {
      label: "smartwindow-retry-btn",
      action: this.retryAssistantMessage.bind(this),
    };
  }

  getErrorInformation() {
    if (!this.error) {
      return;
    }

    if (this.error.clientReason === "fxaTokenUnavailable") {
      this.errorText = {
        header: "smartwindow-assistant-error-account-header",
      };
      this.actionButton = {
        label: "smartwindow-signin-btn",
        action: this.openAccountSignIn.bind(this),
      };
      return;
    }

    switch (this.error.error) {
      case ERROR_CODES.CHAT_MAX_LENGTH:
        this.errorText = {
          header: "smartwindow-assistant-error-max-length-header",
        };
        this.actionButton = {
          label: "smartwindow-clear-btn",
          action: this.openNewChat.bind(this),
        };
        break;

      case ERROR_CODES.RATE_LIMIT_EXCEEDED:
      case ERROR_CODES.UPSTREAM_RATE_LIMIT:
      case ERROR_CODES.FASTLY_WAF_RATE_LIMIT:
        this.errorText = {
          header: "smartwindow-assistant-error-many-requests-header",
        };
        this.actionButton = null;
        break;

      case ERROR_CODES.BUDGET_EXCEEDED:
        this.errorText = {
          header: "smartwindow-assistant-error-budget-header",
          body: "smartwindow-assistant-error-budget-body",
        };
        this.actionButton = null;
        break;

      case ERROR_CODES.MAX_USERS_REACHED:
        this.errorText = {
          header: "smartwindow-assistant-error-capacity-header",
        };
        this.actionButton = null;
        break;

      case ERROR_CODES.FASTLY_BLOCKED:
        this.errorText = {
          header: "smartwindow-assistant-error-request-blocked-header",
        };
        this.actionButton = null;
        break;

      default:
        this.setGenericError();
        if (this.error.httpStatus) {
          this.errorText = {
            header: "smartwindow-assistant-error-http-header",
            args: { status: this.error.httpStatus },
          };
        }
        break;
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
          data-l10n-args=${this.errorText?.args
            ? JSON.stringify(this.errorText.args)
            : nothing}
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
              type="ghost"
              @click=${this.actionButton?.action}
            ></moz-button>`
          : nothing}
      </div>
    `;
  }
}

customElements.define("chat-assistant-error", ChatAssistantError);
