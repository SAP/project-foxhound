/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, repeat } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-button.mjs";

/**
 * @typedef {object} SearchEngineInfo
 * @property {string} name - The name of the search engine.
 * @property {?string} icon - The search engine icon URL.
 */

/**
 * An input call to action (CTA) button which shows the current action choice
 * for the Smartbar. It is updated depending on the recognised intent or the
 * action selected by the user.
 *
 * The component is based on `moz-button` and extended with an action menu.
 *
 * @typedef {"" | "chat" | "search" | "navigate"} SmartbarAction
 * @property {SmartbarAction} action - Current action or empty string for initial state.
 * @property {SearchEngineInfo} searchEngine - The current search engine display info.
 */
export class InputCta extends MozLitElement {
  static shadowRootOptions = {
    ...MozLitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static properties = {
    action: { type: String, reflect: true },
    searchEngineInfo: { type: Object },
  };

  static ACTIONS = ["chat", "navigate", "search"];

  constructor() {
    super();
    this.action = "";
    this.searchEngineInfo = { name: "", icon: "" };
    this._menuId = `actions-menu-${crypto.randomUUID()}`;
  }

  get actionLabelId() {
    return this.action ? `aiwindow-input-cta-submit-label-${this.action}` : "";
  }

  get buttonIconSrc() {
    return this.action ? undefined : "chrome://browser/skin/forward.svg";
  }

  get searchIconUrl() {
    return this.searchEngineInfo?.icon
      ? `url(${this.searchEngineInfo.icon})`
      : "chrome://global/skin/icons/search-glass.svg";
  }

  #setAction(key) {
    if (key === this.action || !InputCta.ACTIONS.includes(key)) {
      return;
    }

    this.action = key;
    this.dispatchEvent(
      new CustomEvent("aiwindow-input-cta:on-action-change", {
        detail: { action: key },
        bubbles: true,
        composed: true,
      })
    );
  }

  #onAction() {
    this.dispatchEvent(
      new CustomEvent("aiwindow-input-cta:on-action", {
        detail: { action: this.action },
        bubbles: true,
        composed: true,
      })
    );
  }

  willUpdate(changedProps) {
    if (
      changedProps.has("action") &&
      this.action &&
      !InputCta.ACTIONS.includes(this.action)
    ) {
      console.warn(`Invalid action: ${this.action}`);
      this.action = "";
    }

    // Setting the search engine icon via `.iconSrc` directly when `action === "search"`
    // for the split button breaks the layout of the component.
    if (changedProps.has("searchEngineInfo")) {
      if (this.searchIconUrl) {
        this.style.setProperty("--search-icon", this.searchIconUrl);
      } else {
        this.style.removeProperty("--search-icon");
      }
    }
  }

  render() {
    const panelListTemplate = this.action
      ? html`<panel-list id=${this._menuId}>
          ${repeat(
            InputCta.ACTIONS,
            key => key,
            key =>
              html`<panel-item
                @click=${() => this.#setAction(key)}
                data-l10n-id=${`aiwindow-input-cta-menu-label-${key}`}
                data-l10n-args=${key === "search"
                  ? JSON.stringify({
                      searchEngineName: this.searchEngineInfo.name,
                    })
                  : undefined}
                icon=${key}
              ></panel-item>`
          )}
        </panel-list>`
      : null;

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/input-cta.css"
      />
      <moz-button
        type=${this.action ? "split" : "default"}
        class="input-cta"
        .menuId=${this.action ? this._menuId : undefined}
        .iconSrc=${this.buttonIconSrc}
        @click=${this.#onAction}
        ?disabled=${!this.action}
      >
        <slot>
          ${this.action &&
          html`<span data-l10n-id=${this.actionLabelId}></span>`}
        </slot>
      </moz-button>
      ${panelListTemplate}
    `;
  }
}

customElements.define("input-cta", InputCta);
