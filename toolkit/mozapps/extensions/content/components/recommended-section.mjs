/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AboutAddonsHTMLElement } from "../aboutaddons-utils.mjs";

/**
 * This element will handle showing recommendations with a
 * <recommended-addon-list> and a <footer>. The footer will be hidden until
 * the <recommended-addon-list> is done making its request so the footer
 * doesn't move around.
 *
 * Subclass this element to use it and define a `template` property to pull
 * the template from. Expected template:
 *
 * <h1>My extra content can go here.</h1>
 * <p>It can be anything but a footer or recommended-addon-list.</p>
 * <recommended-addon-list></recommended-addon-list>
 * <footer>My custom footer</footer>
 */
export class RecommendedSection extends AboutAddonsHTMLElement {
  connectedCallback() {
    if (this.childElementCount == 0) {
      this.render();
    }
  }

  get list() {
    return this.querySelector("recommended-addon-list");
  }

  get footer() {
    return this.querySelector("footer");
  }

  render() {
    this.appendChild(this.constructor.fragment);

    // Hide footer until the cards are loaded, to prevent the content from
    // suddenly shifting when the user attempts to interact with it.
    let { footer } = this;
    footer.hidden = true;
    this.list.loadCardsIfNeeded().finally(() => {
      footer.hidden = false;
    });
  }
}
