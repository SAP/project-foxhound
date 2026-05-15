/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// This is loaded into all XUL windows. Wrap in a block to prevent
// leaking to window scope.
{
  class MozCheckbox extends MozElements.BaseText {
    static get markup() {
      return `
      <image class="checkbox-check"/>
      <hbox class="checkbox-label-box" flex="1">
        <image class="checkbox-icon"/>
        <label class="checkbox-label" flex="1"/>
      </hbox>
      `;
    }

    static get inheritedAttributes() {
      return {
        ".checkbox-check": "disabled,checked,native",
        ".checkbox-label": "text=label,accesskey,native",
        ".checkbox-icon": "src,native",
      };
    }

    connectedCallback() {
      if (this.delayConnectedCallback()) {
        return;
      }

      this.textContent = "";
      this.appendChild(this.constructor.fragment);

      this.initializeAttributeInheritance();
    }

    set checked(val) {
      val = !!val;
      this.toggleAttribute("checked", val);
    }

    get checked() {
      return this.hasAttribute("checked");
    }
  }

  MozCheckbox.contentFragment = null;

  customElements.define("checkbox", MozCheckbox);
}
