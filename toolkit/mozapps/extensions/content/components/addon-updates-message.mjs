/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { gViewController } from "../view-controller.mjs";

class AddonUpdatesMessage extends HTMLElement {
  static get observedAttributes() {
    return ["state"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    let style = document.createElement("style");
    style.textContent = `
      @import "chrome://global/skin/in-content/common.css";
    `;
    this.message = document.createElement("span");
    this.message.hidden = true;
    this.button = document.createElement("moz-button");
    this.button.addEventListener("click", e => {
      if (e.button === 0) {
        gViewController.loadView("updates/available");
      }
    });
    this.button.hidden = true;
    this.shadowRoot.append(style, this.message, this.button);
  }

  connectedCallback() {
    document.l10n.connectRoot(this.shadowRoot);
    document.l10n.translateFragment(this.shadowRoot);
  }

  disconnectedCallback() {
    document.l10n.disconnectRoot(this.shadowRoot);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "state" && oldVal !== newVal) {
      let l10nId = `addon-updates-${newVal}`;
      switch (newVal) {
        case "updating":
        case "installed":
        case "none-found":
          this.button.hidden = true;
          this.message.hidden = false;
          document.l10n.setAttributes(this.message, l10nId);
          break;
        case "manual-updates-found":
          this.message.hidden = true;
          this.button.hidden = false;
          document.l10n.setAttributes(this.button, l10nId);
          break;
      }
    }
  }

  set state(val) {
    this.setAttribute("state", val);
  }
}
customElements.define("addon-updates-message", AddonUpdatesMessage);
