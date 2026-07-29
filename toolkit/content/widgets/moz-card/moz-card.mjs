/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  html,
  staticHtml,
  literal,
  ifDefined,
  when,
} from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

/**
 * Cards contain content and actions about a single subject.
 * There are two card types:
 * The default type where no type attribute is required and the card
 * will have no extra functionality.
 *
 * The "accordion" type will initially not show any content. The card
 * will contain an arrow to expand the card so that all of the content
 * is visible. You can use the "expanded" attribute to force the accordion
 * card to show its content on initial render.
 *
 * @property {string} heading - The heading text that will be used for the card.
 * @property {number} headingLevel - Can be used to specify whether the heading is h1-h6 if not a regular span.
 * @property {string} iconSrc - Path to the icon that should be displayed in the card.
 * @property {string} type - (optional) The type of card. No type specified
 *   will be the default card. The other available type is "accordion"
 * @property {boolean} expanded - A flag to indicate whether the card is
 *  expanded or not. Can be used to expand the content section of the
 *  accordion card on initial render.
 * @property {string} role - (optional) Role of the article element in the card.
 * @slot content - The content to show inside of the card.
 */
export default class MozCard extends MozLitElement {
  static queries = {
    detailsEl: "#moz-card-details",
    headingEl: "#heading",
    contentEl: "#content",
    summaryEl: "summary",
    contentSlotEl: "#content-slot",
  };

  static properties = {
    heading: { type: String, fluent: true },
    headingLevel: { type: Number },
    iconSrc: { type: String },
    type: { type: String, reflect: true },
    expanded: { type: Boolean },
    role: { type: String, mapped: true },
  };

  constructor() {
    super();
    this.type = "default";
    this.expanded = false;
    /* When set to 1-6, it uses h1-h6 around the heading */
    this.headingLevel = 0;
  }

  headingTextTemplate() {
    const headingLevels = [
      literal`span`,
      literal`h1`,
      literal`h2`,
      literal`h3`,
      literal`h4`,
      literal`h5`,
      literal`h6`,
    ];
    const tagName = headingLevels[this.headingLevel] || headingLevels[0];
    return staticHtml`<${tagName} id="heading" title=${ifDefined(this.heading)} part="heading">${this.heading}</${tagName}>`;
  }

  headingTemplate() {
    if (!this.heading) {
      return "";
    }
    return html`
      <div id="heading-wrapper" part="moz-card-heading-wrapper">
        ${when(
          this.type == "accordion",
          () => html`<div class="chevron-icon"></div>`
        )}
        ${when(
          !!this.iconSrc,
          () =>
            html`<img
              id="heading-icon"
              src=${this.iconSrc}
              role="presentation"
            />`
        )}
        ${this.headingTextTemplate()}
      </div>
    `;
  }

  cardTemplate() {
    if (this.type === "accordion") {
      return html`
        <details
          id="moz-card-details"
          @toggle=${this.onToggle}
          ?open=${this.expanded}
        >
          <summary part="summary">${this.headingTemplate()}</summary>
          <div id="content"><slot id="content-slot"></slot></div>
        </details>
      `;
    }

    return html`
      <div id="moz-card-details">
        ${this.headingTemplate()}
        <div id="content" aria-describedby="content">
          <slot></slot>
        </div>
      </div>
    `;
  }

  onToggle() {
    this.expanded = this.detailsEl.open;
    this.dispatchEvent(
      new ToggleEvent("toggle", {
        newState: this.detailsEl.open ? "open" : "closed",
        oldState: this.detailsEl.open ? "closed" : "open",
      })
    );
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://global/skin/design-system/text-and-typography.css"
      />
      <link
        rel="stylesheet"
        href="chrome://global/content/elements/moz-card.css"
      />
      <article
        role=${ifDefined(this.role)}
        class="moz-card"
        aria-labelledby=${ifDefined(this.heading ? "heading" : undefined)}
      >
        ${this.cardTemplate()}
      </article>
    `;
  }
}
customElements.define("moz-card", MozCard);
