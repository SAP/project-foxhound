/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  html,
  nothing,
  repeat,
  styleMap,
} from "chrome://global/content/vendor/lit.all.mjs";
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
 * @property {SearchEngineInfo} searchEngineInfo - The current search engine display info.
 * @property {SearchEngineInfo[]} searchEngines - The list of visible search engines.
 */
export class InputCta extends MozLitElement {
  static shadowRootOptions = {
    ...MozLitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static properties = {
    action: { type: String, reflect: true },
    searchEngineInfo: { type: Object },
    searchEngines: { type: Array },
  };

  static ACTIONS = ["chat", "navigate", "search", "stop"];

  constructor() {
    super();
    this.action = "";
    this.searchEngineInfo = { name: "", icon: "" };
    this._menuId = `actions-menu-${crypto.randomUUID()}`;
    this._searchSubpanelId = `search-submenu-${crypto.randomUUID()}`;
    this.searchEngines = [];
  }

  get actionLabelId() {
    return this.action ? `aiwindow-input-cta-submit-label-${this.action}` : "";
  }

  get buttonIconSrc() {
    if (this.action == "stop") {
      return "chrome://browser/content/aiwindow/assets/stop-generation.svg";
    }
    return this.action ? undefined : "chrome://browser/skin/forward.svg";
  }

  get searchIconUrl() {
    return this.searchEngineInfo?.icon
      ? `url(${this.searchEngineInfo.icon})`
      : "chrome://global/skin/icons/search-glass.svg";
  }

  get #mainPanel() {
    return this.shadowRoot?.getElementById(this._menuId);
  }

  get #searchSubpanel() {
    return this.shadowRoot?.getElementById(this._searchSubpanelId);
  }

  get #mozButton() {
    return this.shadowRoot?.querySelector("moz-button");
  }

  #setAction(key) {
    if (!InputCta.ACTIONS.includes(key)) {
      return;
    }

    if (key !== this.action) {
      this.action = key;
    }

    this.dispatchEvent(
      new CustomEvent("aiwindow-input-cta:on-action-change", {
        detail: { action: key },
        bubbles: true,
        composed: true,
      })
    );
  }

  #onAction() {
    const eventType = `aiwindow-input-cta:${this.action == "stop" ? "on-stop" : "on-action"}`;
    this.dispatchEvent(
      new CustomEvent(eventType, {
        detail: { action: this.action },
        bubbles: true,
        composed: true,
      })
    );
  }

  #onSearchEngineSelect(engine) {
    this.dispatchEvent(
      new CustomEvent("aiwindow-input-cta:on-search-engine-select", {
        detail: { action: "search", engineName: engine.name },
        bubbles: true,
        composed: true,
      })
    );
  }

  #onSearchItemClick(event) {
    event.stopPropagation();
    this.#mainPanel?.hide(event, { force: true });
    requestAnimationFrame(() => {
      this.#searchSubpanel?.show(null, this.#mozButton.chevronButtonEl);
    });
  }

  #onBackClick(event) {
    event.stopPropagation();
    this.#searchSubpanel?.hide(event, { force: true });
    requestAnimationFrame(() => {
      this.#mainPanel?.show(null, this.#mozButton.chevronButtonEl);
    });
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
    const isStop = this.action == "stop";
    const menuActions = InputCta.ACTIONS.filter(a => a !== "stop");

    const panelListTemplate =
      this.action && !isStop
        ? html`<panel-list id=${this._menuId}>
            ${repeat(
              menuActions,
              key => key,
              key =>
                html`<panel-item
                  @click=${() => this.#setAction(key)}
                  data-l10n-id=${`aiwindow-input-cta-menu-label-${key}`}
                  data-l10n-args=${key == "search"
                    ? JSON.stringify({
                        searchEngineName: this.searchEngineInfo.name,
                      })
                    : undefined}
                  icon=${key}
                ></panel-item>`
            )}
            <panel-item
              @click=${e => this.#onSearchItemClick(e)}
              data-l10n-id="aiwindow-input-cta-menu-label-search-with"
              icon="search-with"
            ></panel-item>
          </panel-list>`
        : null;

    const searchSubpanelTemplate = this.action
      ? html`<panel-list id=${this._searchSubpanelId}>
          <panel-item
            @click=${e => this.#onBackClick(e)}
            data-l10n-id="aiwindow-input-cta-search-submenu-header"
            icon="back"
          ></panel-item>
          ${repeat(
            this.searchEngines,
            engine => engine.name,
            engine =>
              html`<panel-item
                @click=${() => this.#onSearchEngineSelect(engine)}
                icon="engine"
                style=${styleMap(
                  engine.icon ? { "--engine-icon": `url(${engine.icon})` } : {}
                )}
              >
                ${engine.name}
              </panel-item>`
          )}
        </panel-list>`
      : null;

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/input-cta.css"
      />
      <moz-button
        type=${this.action && !isStop ? "split" : "ghost"}
        class="input-cta"
        .menuId=${this.action && !isStop ? this._menuId : undefined}
        .iconSrc=${this.buttonIconSrc}
        @click=${this.#onAction}
        ?disabled=${!this.action}
        data-l10n-id=${isStop ? "aiwindow-input-cta-stop-button" : nothing}
        data-l10n-attrs=${isStop ? "aria-label title" : nothing}
      >
        ${isStop
          ? ""
          : html`<slot>
              ${this.action &&
              html`<span data-l10n-id=${this.actionLabelId}></span>`}
            </slot>`}
      </moz-button>
      ${panelListTemplate} ${searchSubpanelTemplate}
    `;
  }
}

customElements.define("input-cta", InputCta);
