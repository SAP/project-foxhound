/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, nothing } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

// Slightly longer than the 4.04s animation baked into kit.svg, to leave
// slack for setTimeout drift (background throttling, streaming jank) so
// the tail of the animation isn't clipped.
const VISIBLE_MS = 4200;

/**
 * Easter-egg overlay that plays the Kit animation once per conversation
 * when triggered with a `MENTION_DEFINITE` payload.
 *
 * Positioning is controlled by the `variant` attribute (`sidebar` or
 * `fullpage`); the two variants anchor to different layout contexts
 * because the chrome `<ai-window>` and the embedded chat-content document
 * have different viewports.
 */
export class KitMention extends MozLitElement {
  static properties = {
    variant: { type: String, reflect: true },
    show: { type: Boolean, state: true },
  };

  #shownForConvId = null;
  #hideTimeoutId = null;

  constructor() {
    super();
    this.show = false;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.#hideTimeoutId !== null) {
      clearTimeout(this.#hideTimeoutId);
      this.#hideTimeoutId = null;
    }
  }

  trigger({ value, convId } = {}) {
    if (value !== "MENTION_DEFINITE") {
      return;
    }
    if (this.#shownForConvId === convId) {
      return;
    }
    this.#shownForConvId = convId;
    this.show = true;
    this.#hideTimeoutId = setTimeout(() => {
      this.#hideTimeoutId = null;
      this.show = false;
    }, VISIBLE_MS);
  }

  reset() {
    this.#shownForConvId = null;
    this.show = false;
    if (this.#hideTimeoutId !== null) {
      clearTimeout(this.#hideTimeoutId);
      this.#hideTimeoutId = null;
    }
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/kit-mention.css"
      />
      ${this.show
        ? html`<img
            src="chrome://browser/content/aiwindow/assets/kit.svg"
            alt=""
            aria-hidden="true"
          />`
        : nothing}
    `;
  }
}

customElements.define("kit-mention", KitMention);
