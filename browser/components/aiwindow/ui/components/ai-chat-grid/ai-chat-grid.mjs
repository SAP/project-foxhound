/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, nothing } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

/**
 * A grid component to switch between rendering items in a grid or list
 */
export class AIChatGrid extends MozLitElement {
  static properties = {
    items: { type: Array },
    gridItem: { type: Function },
    rowItem: { type: Function },
    showSwitch: { type: Boolean },
    view: { type: String, reflect: true },
    loading: { type: Boolean },
  };

  get showGrid() {
    return this.view === "grid";
  }

  get showList() {
    return this.view === "list";
  }

  switchView(event) {
    this.view = event.target.id;
  }

  renderGridControls() {
    if (this.showSwitch) {
      return html`
        <div class="header">
          <div
            class="list-controls"
            role="group"
            data-l10n-id="aiwindow-ai-chat-grid-view-controls"
          >
            <moz-button
              id="list"
              type="ghost"
              size="small"
              aria-pressed=${this.showList}
              iconsrc="chrome://browser/content/aiwindow/assets/icon-list-view.svg"
              @click=${this.switchView}
              data-l10n-id="aiwindow-ai-chat-grid-list-view"
            ></moz-button>
            <moz-button
              id="grid"
              type="ghost"
              size="small"
              aria-pressed=${this.showGrid}
              iconsrc="chrome://browser/content/aiwindow/assets/icon-grid-view.svg"
              @click=${this.switchView}
              data-l10n-id="aiwindow-ai-chat-grid-grid-view"
            ></moz-button>
          </div>
        </div>
      `;
    }

    return nothing;
  }

  renderItems() {
    const items = this.items || [];
    return items.map(item => {
      switch (this.view) {
        case "list":
          return this.renderItem(item, this.rowItem);

        case "grid":
          return this.renderItem(item, this.gridItem);
      }

      return nothing;
    });
  }

  renderItem(item, itemComponent) {
    if (typeof itemComponent === "function") {
      return itemComponent(item);
    }

    return nothing;
  }

  gridStyle() {
    return `scroll-area ${this.view}`;
  }

  renderLoading() {
    return html`<div part="loading" class="ai-chat-grid loading">
      <img
        class="loading-skeleton"
        src="chrome://browser/content/aiwindow/assets/ai-chat-grid-loading.svg"
        role="presentation"
      />
    </div>`;
  }

  renderGrid() {
    return html` <div class="ai-chat-grid">
      ${this.renderGridControls()}
      <div part="scrollarea-${this.view}" class=${this.gridStyle()}>
        ${this.renderItems()}
      </div>
    </div>`;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/ai-chat-grid.css"
      />
      ${this.loading ? this.renderLoading() : this.renderGrid()}
    `;
  }
}

customElements.define("ai-chat-grid", AIChatGrid);
