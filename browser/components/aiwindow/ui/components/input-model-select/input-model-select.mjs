/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, repeat } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-button.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/panel-list.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-badge.mjs";

/**
 * A model select that shows the current model choice and lets users change
 * their selection before smartbar prompt submission.
 *
 * @property {string} selectedModelId - The current selected model ID
 * @property {{[key: string]: {model: string, ownerName: string, labelId: string}}} availableModels - Map of model choice IDs to model data
 */
export class InputModelSelect extends MozLitElement {
  static shadowRootOptions = {
    ...MozLitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static properties = {
    selectedModelId: { type: String, reflect: true },
    defaultModelChoiceId: { type: String },
    availableModels: { type: Object },
    panelOpen: { type: Boolean, state: true },
  };

  constructor() {
    super();
    this.selectedModelId = "";
    this.defaultModelChoiceId = null;
    this.availableModels = null;
    this.panelOpen = false;
    this._menuId = `models-menu-${crypto.randomUUID()}`;
  }

  get #caretIcon() {
    return this.panelOpen
      ? "chrome://global/skin/icons/arrow-up-12.svg"
      : "chrome://global/skin/icons/arrow-down-12.svg";
  }

  #onPanelShown = () => {
    this.panelOpen = true;
  };

  #onPanelHidden = () => {
    this.panelOpen = false;
  };

  get #modelsList() {
    if (!this.availableModels) {
      return [];
    }
    return Object.entries(this.availableModels).map(
      ([index, availableModel]) => ({
        ...availableModel,
        index,
      })
    );
  }

  get #selectedModel() {
    return this.#modelsList.find(m => m.model === this.selectedModelId);
  }

  #setModelId(modelId) {
    const selectedModel = this.#modelsList.find(m => m.model === modelId);
    if (!selectedModel) {
      console.error(`Could not find model ID: [${modelId}]`);
      return;
    }

    if (modelId !== this.selectedModelId) {
      this.selectedModelId = modelId;
      this.dispatchEvent(
        new CustomEvent("aiwindow-input-model-select:model-change", {
          detail: { modelId, modelChoiceId: selectedModel.index },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  #openSmartwindowSettings() {
    this.dispatchEvent(
      new CustomEvent("aiwindow-input-model-select:open-settings", {
        bubbles: true,
        composed: true,
      })
    );
  }

  // TODO (Bug 2041081): Update icon for custom model choice
  #getIconUrl(index) {
    return `chrome://browser/content/aiwindow/assets/model-choice-${index}.svg`;
  }

  #getButtonLabelL10nId(labelId) {
    return `aiwindow-input-model-select-button-label-${labelId}`;
  }

  #getDescriptionL10nId(labelId) {
    if (labelId === "custom") {
      return "aiwindow-input-model-select-menu-item-description-custom";
    }
    return "aiwindow-input-model-select-menu-item-description";
  }

  render() {
    if (!this.#modelsList.length || !this.#selectedModel) {
      return html``;
    }

    const panelListTemplate = html`<panel-list
      id=${this._menuId}
      @shown=${this.#onPanelShown}
      @hidden=${this.#onPanelHidden}
    >
      ${repeat(
        this.#modelsList,
        item => item.model,
        item => html`
          <button
            class="model-item"
            role="menuitem"
            @click=${() => this.#setModelId(item.model)}
          >
            <img
              class="model-item-icon"
              src=${this.#getIconUrl(item.index)}
              alt=""
            />
            <span class="model-item-content">
              <span
                class="model-item-label"
                data-l10n-id=${this.#getButtonLabelL10nId(item.labelId)}
              ></span>
              <span
                class="model-item-details"
                data-l10n-id=${this.#getDescriptionL10nId(item.labelId)}
                data-l10n-args=${JSON.stringify({
                  model: item.model,
                  ownerName: item.ownerName,
                })}
              ></span>
            </span>
            ${item.index === this.defaultModelChoiceId
              ? html`<moz-badge
                  type="new"
                  data-l10n-id="aiwindow-input-model-select-default-badge"
                ></moz-badge>`
              : ""}
          </button>
        `
      )}
      <hr />
      <panel-item
        action="open-smartwindow-settings"
        role="link"
        data-l10n-id="aiwindow-input-model-select-settings-link"
        @click=${this.#openSmartwindowSettings}
      >
      </panel-item>
    </panel-list>`;

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/smartwindow-panel-list.css"
      />
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/input-model-select.css"
      />
      <moz-button
        type="default"
        class="input-model-select-button"
        .menuId=${this._menuId}
        data-l10n-id=${this.#getButtonLabelL10nId(this.#selectedModel.labelId)}
        .iconSrc=${this.#caretIcon}
        iconPosition="end"
      >
      </moz-button>
      ${panelListTemplate}
    `;
  }
}

customElements.define("input-model-select", InputModelSelect);
