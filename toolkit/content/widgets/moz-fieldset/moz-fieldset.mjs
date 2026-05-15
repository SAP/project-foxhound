/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { classMap, html, ifDefined } from "../vendor/lit.all.mjs";
import { MozLitElement } from "../lit-utils.mjs";

/**
 * Functions to wrap a string in a heading.
 *
 * @type {Record<number, (label: string) => ReturnType<typeof html>>}
 */
const HEADING_LEVEL_TEMPLATES = {
  1: label => html`<h1 class="text-box-trim-start">${label}</h1>`,
  2: label => html`<h2 class="text-box-trim-start">${label}</h2>`,
  3: label => html`<h3 class="text-box-trim-start">${label}</h3>`,
  4: label => html`<h4>${label}</h4>`,
  5: label => html`<h5>${label}</h5>`,
  6: label => html`<h6>${label}</h6>`,
};

/**
 * Fieldset wrapper to lay out form inputs consistently.
 *
 * @tagname moz-fieldset
 * @property {string} label - The label for the fieldset's legend.
 * @property {string} description - The description for the fieldset.
 * @property {string} supportPage - Name of the SUMO support page to link to.
 * @property {number} headingLevel - Render the legend in a heading of this level.
 * @property {boolean} disabled - Whether the fieldset and its children are disabled.
 * @property {string} iconSrc - The src for an optional icon.
 */
export default class MozFieldset extends MozLitElement {
  static properties = {
    label: { type: String, fluent: true },
    description: { type: String, fluent: true },
    supportPage: { type: String, attribute: "support-page" },
    ariaLabel: { type: String, fluent: true, mapped: true },
    ariaOrientation: { type: String, mapped: true },
    headingLevel: { type: Number },
    disabled: { type: Boolean, reflect: true },
    iconSrc: { type: String },
  };

  constructor() {
    super();

    /** @type {number} */
    this.headingLevel = -1;

    /** @type {boolean} */
    this.disabled = false;

    /** @type {string} */
    this.iconSrc = "";

    /**@type {string | undefined} */
    this.label = undefined;

    /**@type {string | undefined} */
    this.description = undefined;

    /**@type {string | undefined} */
    this.supportPage = undefined;
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("disabled")) {
      this.#updateChildDisabledState();
    }
    if (
      changedProperties.has("headingLevel") ||
      changedProperties.has("label")
    ) {
      this.toggleAttribute("hasheading", this.hasHeading);
    }
  }

  /**
   * Returns true when the fieldset should render its label as a heading element.
   *
   * @returns {boolean}
   */
  get hasHeading() {
    return !!this.label && !!HEADING_LEVEL_TEMPLATES[this.headingLevel];
  }

  #updateChildDisabledState() {
    const formControls = [...this.querySelectorAll("*")].filter(
      element => "disabled" in element || "parentDisabled" in element
    );

    formControls.forEach(control => {
      if ("parentDisabled" in control) {
        control.parentDisabled = this.disabled;
      }

      if (this.disabled) {
        control.setAttribute("disabled", "");
      } else {
        control.removeAttribute("disabled");
      }
    });
  }

  descriptionTemplate() {
    if (this.description) {
      return html`<div class="description">
        <span id="description">${this.description}</span>
        ${this.supportPageTemplate()}
      </div>`;
    }
    return "";
  }

  supportPageTemplate() {
    if (this.supportPage) {
      return html`<a
        is="moz-support-link"
        support-page=${this.supportPage}
        part="support-link"
      ></a>`;
    }
    return html`<slot name="support-link"></slot>`;
  }

  legendTemplate() {
    let label =
      HEADING_LEVEL_TEMPLATES[this.headingLevel]?.(this.label) || this.label;
    return html`<legend part="label">${this.iconTemplate()}${label}</legend>`;
  }

  iconTemplate() {
    if (!this.iconSrc) {
      return "";
    }
    return html`<img
      src=${this.iconSrc}
      role="presentation"
      class=${classMap({
        icon: true,
        "heading-xlarge": this.headingLevel == 1,
        "heading-large": this.headingLevel == 2,
        "heading-medium": this.headingLevel == 3,
        "text-box-trim-start": this.headingLevel >= 1 && this.headingLevel <= 3,
      })}
    />`;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://global/content/elements/moz-fieldset.css"
      />
      <fieldset
        ?disabled=${this.disabled}
        aria-label=${ifDefined(this.ariaLabel)}
        aria-describedby=${ifDefined(
          this.description ? "description" : undefined
        )}
        aria-orientation=${ifDefined(this.ariaOrientation)}
      >
        ${this.label ? this.legendTemplate() : ""}
        ${!this.description ? this.supportPageTemplate() : ""}
        ${this.descriptionTemplate()}
        <div id="inputs" part="inputs">
          <slot></slot>
        </div>
      </fieldset>
    `;
  }
}
customElements.define("moz-fieldset", MozFieldset);
