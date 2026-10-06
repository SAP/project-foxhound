/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, nothing } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-promo.mjs";

const SMARTWINDOW_PROMO_EVENTS = window.IS_STORYBOOK
  ? Object.freeze({
      PRIMARY: "SmartWindowPromo:PrimaryAction",
      CLOSE: "SmartWindowPromo:Close",
      IMPRESSION: "SmartWindowPromo:Impression",
    })
  : ChromeUtils.importESModule(
      "resource:///modules/asrouter/SmartWindowNewTabPromo.sys.mjs"
    ).SMARTWINDOW_PROMO_EVENTS;

/**
 * Renders an asrouter-driven promotional message inside the AI window.
 * Receives a resolved message via the `message` property and dispatches
 * `SmartWindowPromo:PrimaryAction` / `SmartWindowPromo:Close` /
 * `SmartWindowPromo:Impression` events.
 *
 * @property {object|null} message - Resolved promo content
 */
export class SmartwindowPromo extends MozLitElement {
  static properties = {
    message: { type: Object },
  };

  #impressionFired = false;
  #onVisibilityChange = () => this.#maybeFireImpression();

  constructor() {
    super();
    this.message = null;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.#maybeFireImpression()) {
      this.ownerDocument.addEventListener(
        "visibilitychange",
        this.#onVisibilityChange
      );
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.ownerDocument.removeEventListener(
      "visibilitychange",
      this.#onVisibilityChange
    );
  }

  #maybeFireImpression() {
    if (
      this.#impressionFired ||
      this.ownerDocument.visibilityState !== "visible"
    ) {
      return this.#impressionFired;
    }
    this.#impressionFired = true;
    this.ownerDocument.removeEventListener(
      "visibilitychange",
      this.#onVisibilityChange
    );
    this.#dispatch(SMARTWINDOW_PROMO_EVENTS.IMPRESSION);
    return true;
  }

  #dispatch(type) {
    this.dispatchEvent(
      new CustomEvent(type, { bubbles: true, composed: true })
    );
  }

  #handlePrimary = () => this.#dispatch(SMARTWINDOW_PROMO_EVENTS.PRIMARY);
  #handleClose = () => this.#dispatch(SMARTWINDOW_PROMO_EVENTS.CLOSE);

  render() {
    const content = this.message ?? {};
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/smartwindow-promo.css"
      />
      <moz-promo
        type=${content.type ?? "vibrant"}
        heading=${content.heading ?? ""}
        message=${content.message ?? ""}
        imagesrc=${content.imageSrc ?? ""}
        imagealignment=${content.imageAlignment ?? "start"}
        imagewidth=${content.imageWidth ?? "small"}
        imagedisplay=${content.imageDisplay ?? "padded"}
      >
        ${content.secondaryActionText
          ? html`<moz-button
              slot="actions"
              type="ghost"
              @click=${this.#handleClose}
            >
              ${content.secondaryActionText}
            </moz-button>`
          : nothing}
        ${content.primaryActionText
          ? html`<moz-button
              slot="actions"
              type="primary"
              @click=${this.#handlePrimary}
            >
              ${content.primaryActionText}
            </moz-button>`
          : nothing}
      </moz-promo>
    `;
  }
}

customElements.define("smartwindow-promo", SmartwindowPromo);
