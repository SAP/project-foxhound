/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html } from "chrome://global/content/vendor/lit.all.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/applied-memories-button.mjs";

/**
 * AssistantMessageFooter
 *
 * TODO: Currently using placeholder "Edit Copy" icon which will be replaced
 * with the copy icon once ready
 *
 * Custom element that renders the footer controls for an assistant message
 * in the AI Window chat UI. The footer includes:
 *   - A copy button for copying the assistant response.
 *   - A retry button for regenerating the response.
 *   - An applied memories button for viewing and/or deleting applied memories.
 *
 * Data updates and network behavior are controlled by its parent.
 *
 * @property {string|null} messageId
 *   Identifier of the assistant message this footer is associated with.
 *
 * @property {Array<object>} appliedMemories
 *   List of applied memories for the message. Passed through to the
 *   <applied-memories-button> child.
 *
 * Events dispatched:
 *   - "copy-message"
 *       detail: { messageId }
 *   - "retry-message"
 *       detail: { messageId }
 *   - "retry-without-memories"
 *       detail: { messageId }
 *   - "remove-applied-memory"
 *       (re-dispatched from the applied memories button)
 *       detail: { messageId, index, memory }
 *   - "toggle-applied-memories"
 *       (re-dispatched from the applied memories button)
 *       detail: { messageId, open }
 */
export class AssistantMessageFooter extends MozLitElement {
  static properties = {
    messageId: { type: String, attribute: "message-id" },
    appliedMemories: { attribute: false },
  };

  constructor() {
    super();
    this.messageId = null;
    this.appliedMemories = [];
  }

  static eventBehaviors = {
    bubbles: true,
    composed: true,
  };

  static get events() {
    return {
      copy: "copy-message",
      retry: "retry-message",
      toggleMemories: "toggle-applied-memories",
      removeMemory: "remove-applied-memory",
      retryWithoutMemories: "retry-without-memories",
    };
  }

  #emit(type, detail) {
    this.dispatchEvent(
      new CustomEvent(type, {
        ...this.constructor.eventBehaviors,
        ...(detail !== undefined ? { detail } : {}),
      })
    );
  }

  #emitCopy() {
    this.#emit(this.constructor.events.copy, { messageId: this.messageId });
  }

  #emitRetry() {
    this.#emit(this.constructor.events.retry, { messageId: this.messageId });
  }

  #onAppliedMemoriesToggle(event) {
    this.#emit(this.constructor.events.toggleMemories, event.detail);
  }

  #onRemoveAppliedMemory(event) {
    this.#emit(this.constructor.events.removeMemory, event.detail);
  }

  #onRetryWithoutMemories(event) {
    this.#emit(
      this.constructor.events.retryWithoutMemories,
      event.detail ?? { messageId: this.messageId }
    );
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/assistant-message-footer.css"
      />
      <div class="footer">
        <moz-button
          data-l10n-id="aiwindow-copy-message"
          data-l10n-attrs="tooltiptext,aria-label"
          class="footer-icon-button copy-button"
          type="ghost"
          size="small"
          iconsrc="chrome://global/skin/icons/edit-copy.svg"
          @click=${() => {
            this.#emitCopy();
          }}
        >
        </moz-button>
        <moz-button
          data-l10n-id="aiwindow-retry"
          data-l10n-attrs="tooltiptext,aria-label"
          type="ghost"
          size="small"
          iconsrc="chrome://global/skin/icons/reload.svg"
          class="footer-icon-button retry-button"
          @click=${() => {
            this.#emitRetry();
          }}
        >
        </moz-button>
        <applied-memories-button
          .messageId=${this.messageId}
          .appliedMemories=${this.appliedMemories ?? []}
          @toggle-applied-memories=${event => {
            this.#onAppliedMemoriesToggle(event);
          }}
          @remove-applied-memory=${event => {
            this.#onRemoveAppliedMemory(event);
          }}
          @retry-without-memories=${event => {
            this.#onRetryWithoutMemories(event);
          }}
        >
        </applied-memories-button>
      </div>
    `;
  }
}

customElements.define("assistant-message-footer", AssistantMessageFooter);
