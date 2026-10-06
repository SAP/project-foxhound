/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { hasPermission } from "../aboutaddons-utils.mjs";

import { AddonOptions } from "./addon-options.mjs";

class PluginOptions extends AddonOptions {
  static get markup() {
    return `
      <template>
        <panel-list>
          <panel-item
            data-l10n-id="always-activate-button"
            action="always-activate"
            type="checkbox"
          ></panel-item>
          <panel-item
            data-l10n-id="never-activate-button"
            action="never-activate"
            type="checkbox"
          ></panel-item>
          <hr />
          <panel-item
            data-l10n-id="preferences-addon-button"
            action="preferences"
          ></panel-item>
          <hr />
          <panel-item
            data-l10n-id="manage-addon-button"
            action="expand"
          ></panel-item>
        </panel-list>
      </template>
    `;
  }

  setElementState(el, card, addon) {
    const userDisabledStates = {
      "always-activate": false,
      "never-activate": true,
    };
    const action = el.getAttribute("action");
    if (action in userDisabledStates) {
      let userDisabled = userDisabledStates[action];
      el.checked = addon.userDisabled === userDisabled;
      el.disabled = !(el.checked || hasPermission(addon, action));
    } else {
      super.setElementState(el, card, addon);
    }
  }
}
customElements.define("plugin-options", PluginOptions);
