/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This component participates in newtab train-hopping and is packaged into the
// newtab folder at build-time, so chrome://newtab refs are intentional here.
/* eslint-disable mozilla/no-newtab-refs-outside-newtab */

import { html, nothing } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-button.mjs";

const DEFAULT_CSS =
  "chrome://newtab/content/data/content/external-components/asrouter-newtab-message/asrouter-newtab-message.css";

// Action types that, when present on a button's `action`, are dispatched
// directly into New Tab's Redux store via the injected `dispatch` instead
// of being forwarded to SpecialMessageActions in the parent process. This
// is a deliberate, narrow boundary crossing — only the types listed here
// are allowed to reach into HNT internals. Long-term, these should migrate
// to a stable train-hop-compatible SpecialMessageActions API.
const NEWTAB_DISPATCH_ACTION_TYPES = new Set(["WIDGETS_OPT_IN"]);

export default class ASRouterNewTabMessage extends MozLitElement {
  static properties = {
    messageData: { type: Object },
    cssOverride: { type: String },

    /**
     * These are injected by New Tab's MessageWrapper component, and should
     * be called in order to do message management operations. See the
     * README.md for this component for more details.
     */
    handleDismiss: { type: Function },
    handleClick: { type: Function },
    handleBlock: { type: Function },
    handleClose: { type: Function },
    isIntersecting: { type: Boolean },

    /**
     * Injected by New Tab's MessageWrapper. When a button's action type is
     * in `NEWTAB_DISPATCH_ACTION_TYPES`, the action is forwarded to this
     * dispatch instead of going through SpecialMessageActions.
     */
    dispatch: { type: Function },
  };

  /**
   * Executes a SpecialMessageAction by dispatching an event that will be caught
   * by the ASRouterNewTabMessage JSWindowActor pair and forwarded to
   * SpecialMessageActions.handleAction() in the parent process.
   *
   * @param {object} action - The action object to execute
   * @param {string} action.type - The action type (e.g., "OPEN_URL", "OPEN_SIDEBAR")
   * @param {*} action.data - Action-specific data
   *
   * @example
   * this.specialMessageAction({
   *   type: "OPEN_SIDEBAR",
   *   data: "viewGenaiChatSidebar"
   * });
   */
  specialMessageAction(action) {
    // Actions whose type is in the allowlist are dispatched directly into
    // New Tab's Redux store via the injected `dispatch`. Everything else
    // flows through the JSWindowActor pair to SpecialMessageActions in the
    // parent process.
    if (NEWTAB_DISPATCH_ACTION_TYPES.has(action?.type) && this.dispatch) {
      this.dispatch(action);
      return;
    }
    this.dispatchEvent(
      new CustomEvent("ASRouterNewTabMessage:SpecialMessageAction", {
        bubbles: true,
        detail: {
          action,
        },
      })
    );
  }

  #handleXButton() {
    this.handleBlock?.();
    this.#handleDismiss();
  }

  #handleDismiss() {
    this.handleDismiss?.();
  }

  #handlePrimaryButton() {
    const { primaryButton } = this.messageData?.content ?? {};
    this.handleClick?.("primary-button");
    if (primaryButton?.action?.type) {
      this.specialMessageAction(primaryButton.action);
    }
    if (primaryButton?.action?.dismiss) {
      this.#handleDismiss();
    }
  }

  #handleSecondaryButton() {
    const { secondaryButton } = this.messageData?.content ?? {};
    this.handleClick?.("secondary-button");
    if (secondaryButton?.action?.type) {
      this.specialMessageAction(secondaryButton.action);
    }
    if (secondaryButton?.action?.dismiss) {
      this.#handleDismiss();
    }
  }

  #renderHeading(value) {
    if (!value) {
      return nothing;
    }
    if (typeof value === "string") {
      return html`<h2 id="asrouter-newtab-message-heading">${value}</h2>`;
    }
    return html`<h2
      id="asrouter-newtab-message-heading"
      data-l10n-id=${value.string_id}
    ></h2>`;
  }

  #renderBody(value) {
    if (!value) {
      return nothing;
    }
    if (typeof value === "string") {
      return html`<p>${value}</p>`;
    }
    return html`<p data-l10n-id=${value.string_id}></p>`;
  }

  #renderSecondaryButton(secondaryButton) {
    if (!secondaryButton) {
      return nothing;
    }
    return typeof secondaryButton.label === "string"
      ? html`<moz-button
          type="default"
          @click=${this.#handleSecondaryButton.bind(this)}
          >${secondaryButton.label}</moz-button
        >`
      : html`<moz-button
          type="default"
          @click=${this.#handleSecondaryButton.bind(this)}
          data-l10n-id=${secondaryButton.label.string_id}
        ></moz-button>`;
  }

  #renderPrimaryButtonContent(primaryButton) {
    if (!primaryButton) {
      return nothing;
    }
    if (typeof primaryButton.label === "string") {
      return html`<moz-button
        type="primary"
        @click=${this.#handlePrimaryButton.bind(this)}
        >${primaryButton.label}</moz-button
      >`;
    }
    return html`<moz-button
      type="primary"
      @click=${this.#handlePrimaryButton.bind(this)}
      data-l10n-id=${primaryButton.label.string_id}
    ></moz-button>`;
  }

  #renderPrimaryButton(primaryButton, secondaryButton) {
    if (!primaryButton && !secondaryButton) {
      return nothing;
    }
    return html`<moz-button-group class="button-group">
      ${this.#renderPrimaryButtonContent(primaryButton)}
      ${this.#renderSecondaryButton(secondaryButton)}
    </moz-button-group>`;
  }

  render() {
    const { content } = this.messageData ?? {};
    const CSS_HREF = this.cssOverride || DEFAULT_CSS;
    return html`
      <link rel="stylesheet" href=${CSS_HREF} />
      <aside
        class=${`asrouter-newtab-message${content?.hideDismissButton ? " no-dismiss" : ""}`}
        aria-labelledby=${content?.heading
          ? "asrouter-newtab-message-heading"
          : nothing}
      >
        ${content?.hideDismissButton
          ? nothing
          : html`<div class="dismiss-button">
              <moz-button
                type="icon ghost"
                size="small"
                iconSrc="chrome://global/skin/icons/close.svg"
                data-l10n-id="newtab-activation-window-message-dismiss-button"
                @click=${this.#handleXButton.bind(this)}
              ></moz-button>
            </div>`}
        <div class="message-inner">
          ${content?.imageSrc
            ? html`<img src=${content.imageSrc} alt="" />`
            : nothing}
          <div class="message-content">
            ${this.#renderHeading(content?.heading)}
            ${this.#renderBody(content?.body)}
            ${this.#renderPrimaryButton(
              content?.primaryButton,
              content?.secondaryButton
            )}
          </div>
        </div>
      </aside>
    `;
  }
}

customElements.define("asrouter-newtab-message", ASRouterNewTabMessage);
