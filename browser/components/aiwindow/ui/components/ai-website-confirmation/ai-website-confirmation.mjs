/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/ai-website-select.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-button.mjs";

const SELECTION_CHANGE_EVENT = "ai-website-confirmation:selection-change";
const CLOSE_CONFIRMATION_EVENT = "ai-website-confirmation:close";
const SUBMIT_CONFIRMATION_EVENT = "ai-website-confirmation:submit";

/**
 * A container component for listing and managing multiple AI website selects
 *
 * @property {Array} tabs - Array of tab objects with properties:
 *   {string} linkedPanel - Id of the linked panel (used for associating with tab objects)
 *   {string} title - Display name for the tab
 *   {string} iconSrc - URL for the tab favicon
 *   {string} url - URL of the tab
 *   {boolean} checked - Selection state of the tab
 */
export class AIWebsiteConfirmation extends MozLitElement {
  static properties = {
    tabs: { type: Array },
  };

  constructor() {
    super();
    this.tabs = [];
  }

  /**
   * Handle selection changes from child ai-website-select components
   *
   * @param {CustomEvent} event - The change event from ai-website-select
   */
  handleSelectChange(event) {
    event.stopPropagation();
    const { linkedPanel, checked } = event.detail;

    // Update the tabs array with new selection state
    this.tabs = this.tabs.map(tab =>
      tab.linkedPanel === linkedPanel ? { ...tab, checked } : tab
    );

    this.dispatchSelectionEvent();
  }

  /**
   * Handle Toggle All
   */
  handleToggleAll() {
    if (this.tabs.every(tab => tab.checked)) {
      this.deselectAll();
    } else {
      this.selectAll();
    }
  }

  /**
   * Select all tabs
   */
  selectAll() {
    this.tabs = this.tabs.map(tab => ({ ...tab, checked: true }));
    this.dispatchSelectionEvent();
  }

  /**
   * Deselect all tabs
   */
  deselectAll() {
    this.tabs = this.tabs.map(tab => ({ ...tab, checked: false }));
    this.dispatchSelectionEvent();
  }

  /**
   * Get currently selected tabs
   *
   * @returns {Array} Array of selected tab objects
   */
  getSelectedTabs() {
    return this.tabs.filter(tab => tab.checked);
  }

  /**
   * Handle close button click
   */
  handleClose() {
    const closeEvent = new CustomEvent(CLOSE_CONFIRMATION_EVENT, {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(closeEvent);
  }

  /**
   * Handle confirm button click
   */
  handleConfirm() {
    const selectedTabs = this.getSelectedTabs();
    if (selectedTabs.length === 0) {
      return;
    }
    const closeEvent = new CustomEvent(SUBMIT_CONFIRMATION_EVENT, {
      bubbles: true,
      composed: true,
      detail: {
        selectedTabs,
      },
    });
    this.dispatchEvent(closeEvent);
  }

  /**
   * Dispatch selection event helper
   */
  dispatchSelectionEvent() {
    const selectionEvent = new CustomEvent(SELECTION_CHANGE_EVENT, {
      bubbles: true,
      composed: true,
      detail: {
        selectedTabs: this.getSelectedTabs(),
        allTabs: this.tabs,
      },
    });
    this.dispatchEvent(selectionEvent);
  }

  render() {
    const allSelected = this.tabs.length && this.tabs.every(tab => tab.checked);
    const toggleButtonL10nId = allSelected
      ? "smart-window-confirm-deselect-all"
      : "smart-window-confirm-select-all";

    const selectedCount = this.tabs.filter(tab => tab.checked).length;
    const confirmButtonDisabled = selectedCount === 0;
    const confirmButtonL10nId = confirmButtonDisabled
      ? "smart-window-confirm-close-tab"
      : "smart-window-confirm-close-tabs";

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/ai-website-confirmation.css"
      />

      <moz-button
        class="close-button"
        iconSrc="chrome://global/skin/icons/close.svg"
        @click=${this.handleClose}
        data-l10n-id="smart-window-close-confirm"
      >
      </moz-button>
      <div class="ai-website-confirmation-wrapper">
        <div class="ai-website-confirmation-container">
          <div class="tabs-list-wrapper">
            <div class="fade-overlay fade-top"></div>
            <div
              class="tabs-list"
              @ai-website-select:change=${this.handleSelectChange}
            >
              ${this.tabs.map(
                tab => html`
                  <ai-website-select
                    .linkedPanel=${tab.linkedPanel}
                    .label=${tab.title}
                    .iconSrc=${tab.iconSrc}
                    .url=${tab.url}
                    .checked=${tab.checked}
                  ></ai-website-select>
                `
              )}
            </div>
            <div class="fade-overlay fade-bottom"></div>
          </div>
          <div class="actions-section">
            <moz-button
              type="neutral"
              @click=${this.handleToggleAll}
              data-l10n-id=${toggleButtonL10nId}
            >
            </moz-button>
            <moz-button
              @click=${this.handleConfirm}
              type="primary"
              ?disabled=${confirmButtonDisabled}
              data-l10n-id=${confirmButtonL10nId}
              data-l10n-args=${ifDefined(
                confirmButtonDisabled
                  ? undefined
                  : JSON.stringify({ count: selectedCount })
              )}
            >
            </moz-button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("ai-website-confirmation", AIWebsiteConfirmation);
