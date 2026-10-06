/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "FORCED_COLORS_OVERRIDE_ENABLED",
  "browser.theme.forced-colors-override.enabled",
  true
);

import { AboutAddonsHTMLElement } from "../aboutaddons-utils.mjs";

class ForcedColorsNotice extends AboutAddonsHTMLElement {
  static get markup() {
    return `
      <template>
        <moz-message-bar
          data-l10n-id="forced-colors-theme-notice"
          data-l10n-attrs="message"
        >
        </moz-message-bar>
      </template>
    `;
  }

  connectedCallback() {
    this.forcedColorsMediaQuery = window.matchMedia("(forced-colors)");
    this.forcedColorsMediaQuery.addListener(this);
    this.render();
  }

  render() {
    let shouldShowNotice =
      lazy.FORCED_COLORS_OVERRIDE_ENABLED &&
      this.forcedColorsMediaQuery.matches;
    this.hidden = !shouldShowNotice;
    if (shouldShowNotice && this.childElementCount == 0) {
      this.appendChild(ForcedColorsNotice.fragment);
    }
  }

  handleEvent(e) {
    if (e.type == "change") {
      this.render();
    }
  }

  disconnectedCallback() {
    this.forcedColorsMediaQuery?.removeListener(this);
    this.forcedColorsMediaQuery = null;
  }
}
customElements.define("forced-colors-notice", ForcedColorsNotice);
