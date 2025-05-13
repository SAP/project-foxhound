/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "../vendor/lit.all.mjs";
import { MozLitElement } from "../lit-utils.mjs";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-label.mjs";

/**
 * A checkbox input with a label.
 *
 * @tagname moz-checkbox
 * @property {string} label - The text of the label element
 * @property {string} name - The name of the checkbox input control
 * @property {string} value - The value of the checkbox input control
 * @property {boolean} checked - The state of the checkbox element,
 *  also controls whether the checkbox is initially rendered as
 *  being checked.
 * @property {boolean} disabled - The disabled state of the checkbox input
 * @property {string} iconSrc - The src for an optional icon
 * @property {string} description - The text for the description element that helps describe the checkbox
 */
export default class MozCheckbox extends MozLitElement {
  static properties = {
    label: { type: String, fluent: true },
    name: { type: String },
    value: { type: String },
    iconSrc: { type: String },
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    description: { type: String, fluent: true },
    accessKeyAttribute: {
      type: String,
      attribute: "accesskey",
      reflect: true,
    },
    accessKey: { type: String, state: true },
  };

  static get queries() {
    return {
      checkboxEl: "#moz-checkbox",
      labelEl: "label",
      icon: ".icon",
      descriptionEl: "#description",
    };
  }

  constructor() {
    super();
    this.checked = false;
    this.disabled = false;
  }

  click() {
    this.checkboxEl.click();
  }

  focus() {
    this.checkboxEl.focus();
  }

  /**
   * Handles click events and keeps the checkbox checked value in sync
   *
   * @param {Event} event
   * @memberof MozCheckbox
   */
  handleStateChange(event) {
    this.checked = event.target.checked;
  }

  /**
   * Dispatches an event from the host element so that outside
   * listeners can react to these events
   *
   * @param {Event} event
   * @memberof MozCheckbox
   */
  redispatchEvent(event) {
    let newEvent = new Event(event.type, event);
    this.dispatchEvent(newEvent);
  }

  willUpdate(changes) {
    if (changes.has("accessKeyAttribute")) {
      this.accessKey = this.accessKeyAttribute;
      this.accessKeyAttribute = null;
    }
  }

  iconTemplate() {
    if (this.iconSrc) {
      return html`<img src=${this.iconSrc} role="presentation" class="icon" />`;
    }
    return "";
  }

  descriptionTemplate() {
    return html`
      <span id="description" class="description text-deemphasized">
        ${this.description ?? html`<slot name="description"></slot>`}
      </span>
    `;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://global/content/elements/moz-checkbox.css"
      />
      <label
        is="moz-label"
        for="moz-checkbox"
        part="label"
        shownaccesskey=${ifDefined(this.accessKey)}
      >
        <input
          id="moz-checkbox"
          type="checkbox"
          name=${this.name}
          value=${this.value}
          .checked=${this.checked}
          @click=${this.handleStateChange}
          @change=${this.redispatchEvent}
          .disabled=${this.disabled}
          aria-describedby="description"
          accesskey=${ifDefined(this.accessKey)}
        />
        <span class="label-content">
          ${this.iconTemplate()}
          <span class="text">${this.label}</span>
        </span>
      </label>
      ${this.descriptionTemplate()}
    `;
  }
}
customElements.define("moz-checkbox", MozCheckbox);
