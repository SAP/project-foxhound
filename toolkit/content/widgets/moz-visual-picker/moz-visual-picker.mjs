/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  html,
  nothing,
  classMap,
} from "chrome://global/content/vendor/lit.all.mjs";
import {
  SelectControlItemMixin,
  SelectControlBaseElement,
} from "../lit-select-control.mjs";
import { MozLitElement } from "../lit-utils.mjs";
import { ifDefined } from "../vendor/lit.all.mjs";

/**
 * An element that groups related items and allows a user to navigate between
 * them to select an item. The appearance of the items of the group is
 * determined by the consumer.
 *
 * @tagname moz-visual-picker
 * @property {string} label - Label for the group of elements.
 * @property {string} description - Description for the group of elements.
 * @property {string} name
 *  Name used to associate items in the group. Propagates to
 *  moz-visual-picker's children.
 * @property {string} value
 *  Selected value for the group. Changing the value updates the checked
 *  state of moz-visual-picker-item children and vice versa.
 * @slot default - The picker's content, intended for moz-visual-picker-items.
 */
export class MozVisualPicker extends SelectControlBaseElement {
  static childElementName = "moz-visual-picker-item";
  static orientation = "horizontal";
}
customElements.define("moz-visual-picker", MozVisualPicker);

/**
 * Element that allows a user to select one option from a group of options.
 * Visual appearance is determined by the slotted content.
 *
 * @tagname moz-visual-picker-item
 * @property {boolean} checked - Whether or not the item is selected.
 * @property {boolean} disabled - Whether or not the item is disabled.
 * @property {number} itemTabIndex
 *  Tabindex of the input element. Only one item is focusable at a time.
 * @property {string} name
 *  Name of the item, set by the associated moz-visual-picker parent element.
 * @property {string} value - Value of the item.
 * @property {string} label - Visible label for the picker item.
 * @property {string} description - Additional text shown beneath the label.
 * @property {string} ariaLabel - Value for the aria-label attribute.
 * @property {string} imageSrc - Path to an image to display in the picker item.
 * @slot default - The item's content, used for what gets displayed.
 */
export class MozVisualPickerItem extends SelectControlItemMixin(MozLitElement) {
  static properties = {
    label: { type: String, fluent: true },
    description: { type: String, fluent: true },
    ariaLabel: { type: String, fluent: true, mapped: true },
    imageSrc: { type: String },
  };

  static queries = {
    itemEl: ".picker-item",
    labelEl: ".label",
    descriptionEl: ".description",
  };

  click() {
    this.itemEl.click();
  }

  focus() {
    this.itemEl.focus();
  }

  blur() {
    this.itemEl.blur();
  }

  handleKeydown(event) {
    if (event.code == "Space" || event.code == "Enter") {
      this.handleClick(event);
    }
  }

  handleClick(event) {
    // re-target click events from the slot to the item and handle clicks from
    // space bar keydown.
    event.stopPropagation();
    this.dispatchEvent(
      new Event("click", {
        bubbles: true,
        composed: true,
      })
    );

    super.handleClick();

    // Manually dispatch events since we're not using an input.
    this.dispatchEvent(
      new Event("input", {
        bubbles: true,
        composed: true,
      })
    );
    this.dispatchEvent(
      new Event("change", {
        bubbles: true,
        composed: true,
      })
    );
  }

  handleSlotchange(event) {
    // If the user hasn't provide a visual or accessible label fallback to
    // labelling the picker item based on slotted content.
    if (!this.label && !this.ariaLabel) {
      let elements = event.target.assignedElements();
      this.itemEl.ariaLabelledByElements = elements;
    }
  }

  contentTemplate() {
    if (!this.imageSrc && !this.label && !this.description) {
      return html`<slot></slot>`;
    }

    return html`
      ${this.imageSrc
        ? html`<img src=${this.imageSrc} role="presentation" part="image" />`
        : nothing}
      <div class="text-content">
        ${this.label ? html`<p class="label">${this.label}</p>` : nothing}
        ${this.description
          ? html`<p class="description">${this.description}</p>`
          : nothing}
      </div>
    `;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://global/content/elements/moz-visual-picker-item.css"
      />
      <div
        class=${classMap({
          "picker-item": true,
          "image-item": this.imageSrc && this.label,
        })}
        role=${this.role}
        value=${this.value}
        aria-label=${ifDefined(this.ariaLabel)}
        aria-checked=${this.role == "radio" ? this.checked : nothing}
        aria-selected=${this.role == "option" ? this.checked : nothing}
        tabindex=${this.itemTabIndex}
        ?checked=${this.checked}
        ?disabled=${this.isDisabled}
        @click=${this.handleClick}
        @keydown=${this.handleKeydown}
        @slotchange=${this.handleSlotchange}
      >
        ${this.contentTemplate()}
      </div>
    `;
  }
}
customElements.define("moz-visual-picker-item", MozVisualPickerItem);
