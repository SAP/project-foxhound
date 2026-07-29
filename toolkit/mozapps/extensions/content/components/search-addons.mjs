/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { formatUTMParams, getBrowserElement } from "../aboutaddons-utils.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AddonRepository: "resource://gre/modules/addons/AddonRepository.sys.mjs",
});

class SearchAddons extends HTMLElement {
  connectedCallback() {
    if (this.childElementCount === 0) {
      this.input = document.createElement("moz-input-search");
      this.input.setAttribute("maxlength", 100);
      this.input.setAttribute("data-l10n-attrs", "placeholder");
      this.input.setAttribute("iconsrc", "");
      document.l10n.setAttributes(this.input, "addons-heading-search-input");
      this.append(this.input);

      this.button = document.createElement("moz-button");
      this.button.setAttribute("type", "ghost");
      this.button.setAttribute(
        "iconsrc",
        "chrome://global/skin/icons/search-textbox.svg"
      );
      document.l10n.setAttributes(this.button, "addons-heading-search-button");
      this.append(this.button);
    }
    this.input.addEventListener("keypress", this);
    this.button.addEventListener("click", this);
  }

  disconnectedCallback() {
    this.input.removeEventListener("keypress", this);
    this.button.removeEventListener("click", this);
  }

  handleEvent(e) {
    if (
      e.type == "click" ||
      (e.type === "keypress" && e.keyCode == KeyEvent.DOM_VK_RETURN)
    ) {
      this.searchAddons(this.value);
    }
  }

  get value() {
    return this.input.value;
  }

  searchAddons(query) {
    if (query.length === 0) {
      return;
    }

    let url = formatUTMParams(
      "addons-manager-search",
      lazy.AddonRepository.getSearchURL(query)
    );

    let browser = getBrowserElement();
    let chromewin = browser.documentGlobal;
    chromewin.openWebLinkIn(url, "tab");
  }
}
customElements.define("search-addons", SearchAddons);
