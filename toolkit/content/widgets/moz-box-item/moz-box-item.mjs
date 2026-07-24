/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, classMap } from "../vendor/lit.all.mjs";
import { MozBoxBase } from "../lit-utils.mjs";
import { GROUP_TYPES } from "chrome://global/content/elements/moz-box-group.mjs";

const DIRECTION_RIGHT = "Right";
const DIRECTION_LEFT = "Left";

const NAVIGATION_DIRECTIONS = {
  LTR: {
    FORWARD: DIRECTION_RIGHT,
    BACKWARD: DIRECTION_LEFT,
  },
  RTL: {
    FORWARD: DIRECTION_LEFT,
    BACKWARD: DIRECTION_RIGHT,
  },
};

/**
 * A custom element used for highlighting important information and/or providing
 * context for specific settings.
 *
 * @tagname moz-box-item
 * @property {string} label - Label for the button.
 * @property {string} description - Descriptive text for the button.
 * @property {string} iconSrc - The src for an optional icon shown next to the label.
 * @property {"default"|"medium-icon"|"large-icon"} layout - Layout style for the box content.
 * @slot default - Slot for the box item's content, which overrides label and description.
 * @slot actions - Slot for the actions positioned at the end of the component container.
 * @slot actions-start - Slot for the actions positioned at the start of the component container.
 */
export default class MozBoxItem extends MozBoxBase {
  #actionEls = [];

  static properties = {
    layout: { type: String, reflect: true },
    supportPage: { type: String, attribute: "support-page" },
  };

  static queries = {
    defaultSlotEl: "slot:not([name])",
    actionsStartSlotEl: "slot[name=actions-start]",
    actionsSlotEl: "slot[name=actions]",
    handleEl: ".handle",
  };

  constructor() {
    super();
    this.layout = "default";
    this.addEventListener("keydown", e => this.handleKeydown(e));
  }

  firstUpdated() {
    this.getActionEls();
  }

  handleKeydown(event) {
    let isHandleEvent = event.originalTarget === this.handleEl;

    if (
      !isHandleEvent &&
      event.target?.slot !== "actions" &&
      event.target?.slot !== "actions-start"
    ) {
      return;
    }

    let target = isHandleEvent ? event.originalTarget : event.target;

    let directions = this.getNavigationDirections();
    switch (event.key) {
      case directions.FORWARD:
      case `Arrow${directions.FORWARD}`: {
        let nextIndex = this.#actionEls.indexOf(target) + 1;
        let nextEl = this.#actionEls[nextIndex];
        nextEl?.focus();
        break;
      }
      case directions.BACKWARD:
      case `Arrow${directions.BACKWARD}`: {
        let prevIndex = this.#actionEls.indexOf(target) - 1;
        let prevEl = this.#actionEls[prevIndex];
        prevEl?.focus();
        break;
      }
    }
  }

  getNavigationDirections() {
    if (this.isDocumentRTL) {
      return NAVIGATION_DIRECTIONS.RTL;
    }
    return NAVIGATION_DIRECTIONS.LTR;
  }

  get isDocumentRTL() {
    if (typeof Services !== "undefined") {
      return Services.locale.isAppLocaleRTL;
    }
    return document.dir === "rtl";
  }

  get isDraggable() {
    const reorderableParent = this.closest("moz-box-group");
    return (
      reorderableParent?.type == GROUP_TYPES.reorderable &&
      this.slot != "header" &&
      this.slot != "footer" &&
      !this.slot.includes("static")
    );
  }

  focus(event) {
    if (event?.key == "Up" || event?.key == "ArrowUp") {
      let actionEls = this.actionsSlotEl.assignedElements();
      let lastActions = actionEls.length
        ? actionEls
        : this.actionsStartSlotEl?.assignedElements();
      let lastAction = lastActions?.[lastActions.length - 1] ?? this.handleEl;
      lastAction?.focus();
    } else {
      let firstAction =
        this.handleEl ??
        this.actionsStartSlotEl?.assignedElements()?.[0] ??
        this.actionsSlotEl.assignedElements()?.[0];
      firstAction?.focus();
    }
  }

  getActionEls() {
    let handleEl = this.handleEl ? [this.handleEl] : [];
    let startActions = this.actionsStartSlotEl?.assignedElements() ?? [];
    let endActions = this.actionsSlotEl.assignedElements();
    this.#actionEls = [...handleEl, ...startActions, ...endActions];
  }

  stylesTemplate() {
    return html`${super.stylesTemplate()}
      <link
        rel="stylesheet"
        href="chrome://global/content/elements/moz-box-item.css"
      />`;
  }

  slotTemplate(name) {
    return html`
      <span
        role="group"
        aria-labelledby="label"
        aria-describedby="description"
        class="actions"
        @slotchange=${this.getActionEls}
      >
        <slot name=${name}></slot>
      </span>
    `;
  }

  textTemplate() {
    if (this.supportPage) {
      return this.supportTextTemplate();
    }
    return super.textTemplate();
  }

  supportTextTemplate() {
    return html`<div
      class=${classMap({
        "text-content": true,
        "has-icon": this.iconSrc,
        "has-description": this.description,
        "has-support-page": this.supportPage,
      })}
    >
      <span class="label-wrapper">
        ${this.iconTemplate()}<span>
          ${this.labelTemplate()}${!this.description
            ? this.supportPageTemplate()
            : ""}
        </span>
      </span>
      <span class="description-wrapper">
        ${this.descriptionTemplate()}${this.description
          ? this.supportPageTemplate()
          : ""}
      </span>
    </div>`;
  }

  supportPageTemplate() {
    if (this.supportPage) {
      return html`<a
        class="support-page"
        is="moz-support-link"
        support-page=${this.supportPage}
        part="support-link"
        aria-describedby=${this.description ? "description" : "label"}
      ></a>`;
    }
    return "";
  }

  render() {
    return html`
      ${this.stylesTemplate()}
      <div class="box-container">
        ${this.isDraggable
          ? html`<span tabindex="0" class="handle"></span>`
          : ""}
        ${this.slotTemplate("actions-start")}
        <div class="box-content">
          ${this.label ? this.textTemplate() : html`<slot></slot>`}
        </div>
        ${this.slotTemplate("actions")}
      </div>
    `;
  }
}
customElements.define("moz-box-item", MozBoxItem);
