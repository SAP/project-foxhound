/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  Extension: "resource://gre/modules/Extension.sys.mjs",
});

import { AboutAddonsHTMLElement } from "../aboutaddons-utils.mjs";

class AddonSitePermissionsList extends AboutAddonsHTMLElement {
  static get markup() {
    return `
      <template>
        <div class="addon-permissions-required" hidden>
          <h2
            class="permission-header"
            data-l10n-id="addon-sitepermissions-required"
          >
            <span
              data-l10n-name="hostname"
              class="addon-sitepermissions-host"
            ></span>
          </h2>
          <ul class="addon-permissions-list"></ul>
        </div>
      </template>
    `;
  }

  setAddon(addon) {
    this.addon = addon;
    this.render();
  }

  async render() {
    let permissions = lazy.Extension.formatPermissionStrings({
      sitePermissions: this.addon.sitePermissions,
      siteOrigin: this.addon.siteOrigin,
    });

    this.textContent = "";
    let frag = AddonSitePermissionsList.fragment;

    if (permissions.msgs.length) {
      let section = frag.querySelector(".addon-permissions-required");
      section.hidden = false;
      let list = section.querySelector(".addon-permissions-list");
      let header = section.querySelector(".permission-header");
      document.l10n.setAttributes(header, "addon-sitepermissions-required", {
        hostname: new URL(this.addon.siteOrigin).hostname,
      });

      for (let msg of permissions.msgs) {
        let item = document.createElement("li");
        item.classList.add("permission-info", "permission-checked");
        item.appendChild(document.createTextNode(msg));
        list.appendChild(item);
      }
    }

    this.appendChild(frag);
  }
}
customElements.define("addon-sitepermissions-list", AddonSitePermissionsList);
