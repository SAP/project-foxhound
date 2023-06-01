/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at htp://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "../vendor/lit.all.mjs";
import { MozLitElement } from "../lit-utils.mjs";

/**
 * A simple toggle element that can be used to switch between two states.
 *
 * @tagname moz-toggle
 * @property {boolean} pressed - Whether or not the element is pressed.
 * @property {boolean} disabled - Whether or not the element is disabled.
 * @property {string} label - The label text.
 * @property {string} description - The description text.
 * @property {string} ariaLabel
 *  The aria-label text for cases where there is no visible label.
 * @slot support-link - Used to append a moz-support-link to the description.
 * @fires toggle
 *  Custom event indicating that the toggle's pressed state has changed.
 */
export default class MozToggle extends MozLitElement {
  static shadowRootOptions = {
    ...MozLitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static properties = {
    pressed: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    description: { type: String },
    ariaLabel: { type: String, attribute: "aria-label" },
  };

  static get queries() {
    return {
      buttonEl: "#moz-toggle-button",
      labelEl: "#moz-toggle-label",
      descriptionEl: "#moz-toggle-description",
    };
  }

  // Use a relative URL in storybook to get faster reloads on style changes.
  static stylesheetUrl = window.IS_STORYBOOK
    ? "./moz-toggle/moz-toggle.css"
    : "chrome://global/content/elements/moz-toggle.css";

  constructor() {
    super();
    this.pressed = false;
    this.disabled = false;
  }

  handleClick() {
    this.pressed = !this.pressed;
    this.dispatchOnUpdateComplete(
      new CustomEvent("toggle", {
        bubbles: true,
        composed: true,
      })
    );
  }

  // Delegate clicks on the host to the input element
  click() {
    this.buttonEl.click();
  }

  labelTemplate() {
    if (this.label) {
      return html`
        <span class="label-wrapper">
          <label id="moz-toggle-label" part="label" for="moz-toggle-button">
            ${this.label}
          </label>
          ${!this.description ? this.supportLinkTemplate() : ""}
        </span>
      `;
    }
    return "";
  }

  descriptionTemplate() {
    if (this.description) {
      return html`
        <p
          id="moz-toggle-description"
          class="description-wrapper"
          part="description"
        >
          ${this.description} ${this.supportLinkTemplate()}
        </p>
      `;
    }
    return "";
  }

  supportLinkTemplate() {
    return html`
      <slot name="support-link"></slot>
    `;
  }

  render() {
    const { pressed, disabled, description, ariaLabel, handleClick } = this;
    return html`
      <link rel="stylesheet" href=${this.constructor.stylesheetUrl} />
      ${this.labelTemplate()}
      <button
        id="moz-toggle-button"
        part="button"
        type="button"
        class="toggle-button"
        ?disabled=${disabled}
        aria-pressed=${pressed}
        aria-label=${ifDefined(ariaLabel ?? undefined)}
        aria-describedby=${ifDefined(
          description ? "moz-toggle-description" : undefined
        )}
        @click=${handleClick}
      ></button>
      ${this.descriptionTemplate()}
    `;
  }
}
customElements.define("moz-toggle", MozToggle);
