/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, staticHtml, literal } from "../vendor/lit.all.mjs";
import { MozLitElement } from "../lit-utils.mjs";

export const GROUP_TYPES = {
  list: "list",
  reorderable: "reorderable-list",
};

/**
 * An element used to group combinations of moz-box-item, moz-box-link, and
 * moz-box-button elements and provide the expected styles.
 *
 * @tagname moz-box-group
 * @property {string} type
 *   The type of the group, either "list", "reorderable-list", or undefined.
 *   Note that "reorderable-list" only works with moz-box-item elements for now.
 * @slot default - Slot for rendering various moz-box-* elements.
 * @slot static - Slot for rendering non-reorderable moz-box-item elements.
 * @slot <index> - Slots used to assign moz-box-* elements to <li> elements when
 *   the group is type="list".
 * @slot <static-index>
 *   Slots used to render moz-box-item elements that are not intended to be reorderable
 *   when the group is type="reorderable-list".
 * @fires reorder
 *  Fired when items are reordered via drag-and-drop or keyboard shortcuts.
 *  The detail object contains draggedElement, targetElement, position, draggedIndex, and targetIndex.
 */

export default class MozBoxGroup extends MozLitElement {
  #tabbable = true;

  static properties = {
    type: { type: String },
    listItems: { type: Array, state: true },
    staticItems: { type: Array, state: true },
  };

  static queries = {
    reorderableList: "moz-reorderable-list",
    headerSlot: "slot[name='header']",
    footerSlot: "slot[name='footer']",
  };

  constructor() {
    super();
    /** @type {Element[]} */
    this.listItems = [];
    /** @type {Element[]} */
    this.staticItems = [];
    this.listMutationObserver = new MutationObserver(
      this.updateItems.bind(this)
    );
  }

  firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    this.listMutationObserver.observe(this, {
      attributeFilter: ["hidden"],
      subtree: true,
      childList: true,
    });
    this.updateItems();
  }

  contentTemplate() {
    if (this.type == GROUP_TYPES.reorderable) {
      return html`<moz-reorderable-list
        class="scroll-container"
        itemselector="moz-box-item:not([static])"
        dragselector=".handle"
        @reorder=${this.handleReorder}
      >
        ${this.slotTemplate()}
      </moz-reorderable-list>`;
    }
    return this.slotTemplate();
  }

  slotTemplate() {
    let isReorderable = this.type == GROUP_TYPES.reorderable;
    if (this.type == GROUP_TYPES.list || isReorderable) {
      let listTag = isReorderable ? literal`ol` : literal`ul`;
      return staticHtml`<${listTag}
          tabindex="-1"
          class="list scroll-container"
          aria-orientation="vertical"
          @keydown=${this.handleKeydown}
          @focusin=${this.handleFocus}
          @focusout=${this.handleBlur}
        >
          ${this.listItems.map((_, i) => {
            return html`<li>
              <slot name=${i}></slot>
            </li> `;
          })}
          ${this.staticItems?.map((_, i) => {
            return html`<li>
              <slot name=${`static-${i}`}></slot>
            </li> `;
          })}
        </${listTag}>
        <slot hidden></slot>
        ${isReorderable ? html`<slot name="static" hidden></slot>` : ""}`;
    }
    return html`<div class="scroll-container" tabindex="-1">
      <slot></slot>
    </div>`;
  }

  /**
   * Handles reordering of items in the list.
   *
   * @param {object} event - Event object or wrapper containing detail from moz-reorderable-list.
   * @param {object} event.detail - Detail object from moz-reorderable-list.evaluateKeyDownEvent or drag-and-drop event.
   * @param {Element} event.detail.draggedElement - The element being reordered.
   * @param {Element} event.detail.targetElement - The target element to reorder relative to.
   * @param {number} event.detail.position - Position relative to target (-1 for before, 0 for after).
   * @param {number} event.detail.draggedIndex - The index of the element being reordered.
   * @param {number} event.detail.targetIndex - The new index of the draggedElement.
   */
  handleReorder(event) {
    let { targetIndex } = event.detail;

    this.dispatchEvent(
      new CustomEvent("reorder", {
        bubbles: true,
        detail: event.detail,
      })
    );

    /**
     * Without requesting an animation frame, we will lose focus within
     * the box group when using Ctrl + Shift + ArrowDown. The focus will
     * move to the browser chrome which is unexpected.
     *
     */
    requestAnimationFrame(() => {
      this.listItems[targetIndex]?.focus();
    });
  }

  handleKeydown(event) {
    if (
      this.type == GROUP_TYPES.reorderable &&
      event.originalTarget == event.target.handleEl
    ) {
      let detail = this.reorderableList.evaluateKeyDownEvent(event);
      if (detail) {
        event.stopPropagation();
        this.handleReorder({ detail });
        return;
      }
    }

    let positionElement = event.target.closest("[position]");
    if (!positionElement) {
      // If the user has clicked on the MozBoxGroup it may get keydown events
      // even if there is no focused element within it. Then the event target
      // will be the <ul> and we won't find an element with [position].
      return;
    }
    let positionAttr = positionElement.getAttribute("position");
    let currentPosition = parseInt(positionAttr);

    let allItems = [...this.listItems, ...this.staticItems];

    switch (event.key) {
      case "Down":
      case "ArrowDown": {
        event.preventDefault();
        let nextItem = allItems[currentPosition + 1];
        nextItem?.focus(event);
        break;
      }
      case "Up":
      case "ArrowUp": {
        event.preventDefault();
        let prevItem = allItems[currentPosition - 1];
        prevItem?.focus(event);
        break;
      }
    }
  }

  handleFocus() {
    if (this.#tabbable) {
      this.#tabbable = false;
      let allItems = [...this.listItems, ...this.staticItems];
      allItems.forEach(item => {
        item.setAttribute("tabindex", "-1");
      });
    }
  }

  handleBlur() {
    if (!this.#tabbable) {
      this.#tabbable = true;
      let allItems = [...this.listItems, ...this.staticItems];
      allItems.forEach(item => {
        item.removeAttribute("tabindex");
      });
    }
  }

  updateItems() {
    /** @type {Element[]} */
    let listItems = [];
    /** @type {Element[]} */
    let staticItems = [];
    [...this.children].forEach(child => {
      if (child.slot === "header" || child.slot === "footer" || child.hidden) {
        return;
      }
      if (child.slot.includes("static")) {
        staticItems.push(child);
      } else {
        listItems.push(child);
      }
    });
    this.listItems = listItems;
    this.staticItems = staticItems;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://global/content/elements/moz-box-group.css"
      />
      <slot name="header"></slot>
      ${this.contentTemplate()}
      <slot name="footer"></slot>
    `;
  }

  updated(changedProperties) {
    let headerNode = this.headerSlot.assignedNodes()[0];
    let footerNode = this.footerSlot.assignedNodes().at(-1);
    headerNode?.classList.add("first");
    footerNode?.classList.add("last");

    if (changedProperties.has("listItems") && this.listItems.length) {
      this.listItems.forEach((item, i) => {
        if (
          this.type == GROUP_TYPES.list ||
          this.type == GROUP_TYPES.reorderable
        ) {
          item.slot = i;
          item.setAttribute("position", i);
        }
        item.classList.toggle("first", i == 0 && !headerNode);
        item.classList.toggle(
          "last",
          i == this.listItems.length - 1 &&
            !this.staticItems.length &&
            !footerNode
        );
        item.removeAttribute("tabindex");
      });
      if (!this.#tabbable) {
        this.#tabbable = true;
      }
    }

    if (changedProperties.has("staticItems") && this.staticItems.length) {
      this.staticItems.forEach((item, i) => {
        item.slot = `static-${i}`;
        item.setAttribute("position", this.listItems.length + i);
        let staticEl = item.querySelector("moz-box-item") ?? item;
        staticEl.setAttribute("static", "");
        item.classList.toggle(
          "first",
          i == 0 && !this.listItems.length && !headerNode
        );
        item.classList.toggle(
          "last",
          i == this.staticItems.length - 1 && !footerNode
        );
        item.removeAttribute("tabindex");
      });
    }

    if (
      changedProperties.has("type") &&
      (this.type == GROUP_TYPES.list || this.type == GROUP_TYPES.reorderable)
    ) {
      this.updateItems();
    }
  }
}
customElements.define("moz-box-group", MozBoxGroup);
