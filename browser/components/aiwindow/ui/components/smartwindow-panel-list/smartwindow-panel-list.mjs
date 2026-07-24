/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  html,
  ifDefined,
  repeat,
  styleMap,
} from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/panel-list.js";

/**
 * A generic panel list component for displaying grouped items in a popup.
 *
 * This component is agnostic to the data it displays - consumers control
 * all logic including filtering, truncation, and special item handling.
 *
 * @typedef {{id: string, label: string, icon?: string, l10nId?: string}} ListItem
 * @typedef {{items: ListItem[], headerL10nId?: string}} ItemGroup
 * @property {ItemGroup[]} groups - Grouped list items to display
 * @property {string} placeholderL10nId - Fluent ID for empty state message
 * @property {object} anchor - Positioning anchor {left, top, width, height}
 */
export class SmartwindowPanelList extends MozLitElement {
  static shadowRootOptions = {
    ...MozLitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static properties = {
    groups: { type: Array },
    anchor: { type: Object },
    placeholderL10nId: { type: String },
    alwaysOpen: { type: Boolean },
  };

  #panelList = null;
  #anchorElement = null;

  constructor() {
    super();
    this.groups = [];
    this.anchor = null;
    this.placeholderL10nId = "";
    this.alwaysOpen = false;
  }

  firstUpdated() {
    this.#panelList = this.shadowRoot.querySelector("panel-list");
    if (this.alwaysOpen) {
      this.show();
    }
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("anchor")) {
      // If anchor is an element use it directly,
      // otherwise we can use the positioned span.
      this.#anchorElement =
        this.anchor instanceof Element
          ? this.anchor
          : this.renderRoot.querySelector(".smartwindow-panel-list-anchor");
    }
  }

  async show() {
    await this.updateComplete;
    this.#panelList.show(null, this.#anchorElement);
  }

  async hide() {
    await this.updateComplete;
    this.#panelList.hide();
  }

  async toggle() {
    await this.updateComplete;
    this.#panelList.toggle(null, this.#anchorElement);
  }

  handlePanelClick(e) {
    const panelItem = e.target.closest("panel-item");
    if (panelItem && !panelItem.classList.contains("panel-section-header")) {
      const event = new CustomEvent("item-selected", {
        detail: {
          id: panelItem.itemId,
          label: panelItem.itemLabel || panelItem.textContent.trim(),
          icon: panelItem.itemIcon,
        },
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      this.dispatchEvent(event);
    }
  }

  handleKeyDown(e) {
    this.dispatchEvent(
      new CustomEvent("panel-keydown", {
        detail: { originalEvent: e },
        bubbles: true,
        composed: true,
      })
    );
  }

  // -------------------------
  // Render helpers
  // -------------------------

  #isEmpty() {
    return !this.groups.length || this.groups.every(g => !g.items?.length);
  }

  #renderAnchor() {
    if (!this.anchor) {
      return null;
    }

    const rect = this.getBoundingClientRect();

    return html`<span
      class="smartwindow-panel-list-anchor"
      style=${styleMap({
        "--anchor-left": `${this.anchor.left - rect.left}px`,
        "--anchor-top": `${this.anchor.top - rect.top}px`,
        "--anchor-width": `${this.anchor.width}px`,
        "--anchor-height": `${this.anchor.height}px`,
      })}
    ></span>`;
  }

  #renderEmptyState() {
    return html`<panel-item
      disabled
      role="presentation"
      class="panel-section-header"
      data-l10n-id=${this.placeholderL10nId}
    ></panel-item>`;
  }

  #renderGroupHeader(headerL10nId) {
    return html`<panel-item
      disabled
      role="presentation"
      class="panel-section-header"
      data-l10n-id=${headerL10nId}
    ></panel-item>`;
  }

  #computeItemStyles(item) {
    const styles = {};

    if (item.icon) {
      styles["--panel-item-icon-url"] = `url(${item.icon})`;
    }

    return styles;
  }

  #renderItem(item) {
    return html`<panel-item
      .itemId=${item.id}
      .itemLabel=${item.label}
      icon=${ifDefined(item.icon ? "true" : undefined)}
      data-l10n-id=${ifDefined(item.l10nId)}
      style=${styleMap(this.#computeItemStyles(item))}
    >
      ${item.l10nId ? "" : item.label}
    </panel-item>`;
  }

  #renderGroup(group) {
    if (!group.items?.length) {
      return null;
    }

    return html`
      ${group.headerL10nId ? this.#renderGroupHeader(group.headerL10nId) : null}
      ${repeat(
        group.items,
        item => item.id,
        item => this.#renderItem(item)
      )}
    `;
  }

  #renderGroups() {
    return repeat(
      this.groups,
      (_group, index) => index,
      group => this.#renderGroup(group)
    );
  }

  render() {
    const isEmpty = this.#isEmpty();

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/smartwindow-panel-list.css"
      />
      ${this.#renderAnchor()}
      <panel-list
        @click=${this.handlePanelClick}
        @keydown=${this.handleKeyDown}
      >
        ${isEmpty ? this.#renderEmptyState() : this.#renderGroups()}
      </panel-list>
    `;
  }
}

customElements.define("smartwindow-panel-list", SmartwindowPanelList);
