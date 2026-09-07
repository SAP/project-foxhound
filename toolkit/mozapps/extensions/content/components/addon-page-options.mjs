/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  AboutAddonsHTMLElement,
  AddonManagerListenerHandler,
  checkForUpdates,
  installAddonsFromFilePicker,
} from "../aboutaddons-utils.mjs";
import { gViewController } from "../view-controller.mjs";

const { AddonManager } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs"
);
const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);
const lazy = {};
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "XPINSTALL_ENABLED",
  "xpinstall.enabled",
  true
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "PREFER_UPDATE_OVER_INSTALL_FOR_EXISTING_ADDON",
  "extensions.webextensions.prefer-update-over-install-for-existing-addon",
  false
);

class AddonPageOptions extends AboutAddonsHTMLElement {
  static get markup() {
    return `
      <template>
        <panel-list>
          <panel-item
            action="check-for-updates"
            data-l10n-id="addon-updates-check-for-updates"
            data-l10n-attrs="accesskey"
          ></panel-item>
          <panel-item
            action="view-recent-updates"
            data-l10n-id="addon-updates-view-updates"
            data-l10n-attrs="accesskey"
          ></panel-item>
          <hr />
          <panel-item
            action="install-from-file"
            data-l10n-id="addon-install-from-file"
            data-l10n-attrs="accesskey"
          ></panel-item>
          <panel-item
            action="debug-addons"
            data-l10n-id="addon-open-about-debugging"
            data-l10n-attrs="accesskey"
          ></panel-item>
          <hr />
          <panel-item
            action="set-update-automatically"
            data-l10n-id="addon-updates-update-addons-automatically"
            data-l10n-attrs="accesskey"
            type="checkbox"
          ></panel-item>
          <panel-item
            action="reset-update-states"
            data-l10n-attrs="accesskey"
          ></panel-item>
          <hr />
          <panel-item
            action="manage-shortcuts"
            data-l10n-id="addon-manage-extensions-shortcuts"
            data-l10n-attrs="accesskey"
          ></panel-item>
        </panel-list>
      </template>
    `;
  }

  connectedCallback() {
    if (this.childElementCount === 0) {
      this.render();
    }
    this.addEventListener("click", this);
    this.panel.addEventListener("showing", this);
    AddonManagerListenerHandler.addListener(this);
  }

  disconnectedCallback() {
    this.removeEventListener("click", this);
    this.panel.removeEventListener("showing", this);
    AddonManagerListenerHandler.removeListener(this);
  }

  toggle(...args) {
    return this.panel.toggle(...args);
  }

  get open() {
    return this.panel.open;
  }

  get panelListId() {
    return `${this.id ?? "addon-page-options"}-panel-list`;
  }

  render() {
    this.appendChild(AddonPageOptions.fragment);
    this.panel = this.querySelector("panel-list");
    // This panel-list id is going to be set on the addon-page-header
    // more-options moz-button menuId attribute to wire the two together.
    this.panel.id = this.panelListId;
    this.installFromFile = this.querySelector('[action="install-from-file"]');
    this.toggleUpdatesEl = this.querySelector(
      '[action="set-update-automatically"]'
    );
    this.resetUpdatesEl = this.querySelector('[action="reset-update-states"]');
    this.onUpdateModeChanged();
  }

  async handleEvent(e) {
    if (e.type === "click") {
      e.target.disabled = true;
      try {
        await this.onClick(e);
      } finally {
        e.target.disabled = false;
      }
    } else if (e.type === "showing") {
      this.installFromFile.setAttribute(
        "data-l10n-id",
        lazy.PREFER_UPDATE_OVER_INSTALL_FOR_EXISTING_ADDON
          ? "addon-install-or-update-from-file"
          : "addon-install-from-file"
      );
      this.installFromFile.hidden = !lazy.XPINSTALL_ENABLED;
    }
  }

  async onClick(e) {
    switch (e.target.getAttribute("action")) {
      case "check-for-updates":
        await this.checkForUpdates();
        break;
      case "view-recent-updates":
        gViewController.loadView("updates/recent");
        break;
      case "install-from-file":
        if (lazy.XPINSTALL_ENABLED) {
          installAddonsFromFilePicker();
        }
        break;
      case "debug-addons":
        this.openAboutDebugging();
        break;
      case "set-update-automatically":
        await this.toggleAutomaticUpdates();
        break;
      case "reset-update-states":
        await this.resetAutomaticUpdates();
        break;
      case "manage-shortcuts":
        gViewController.loadView("shortcuts/shortcuts");
        break;
    }
  }

  async checkForUpdates() {
    let message = document.getElementById("updates-message");
    message.state = "updating";
    message.hidden = false;
    let { installed, pending } = await checkForUpdates();
    if (pending > 0) {
      message.state = "manual-updates-found";
    } else if (installed > 0) {
      message.state = "installed";
    } else {
      message.state = "none-found";
    }
  }

  openAboutDebugging() {
    let mainWindow = window.windowRoot.window;
    if ("switchToTabHavingURI" in mainWindow) {
      let principal = Services.scriptSecurityManager.getSystemPrincipal();
      mainWindow.switchToTabHavingURI(
        `about:debugging#/runtime/this-firefox`,
        true,
        {
          ignoreFragment: "whenComparing",
          triggeringPrincipal: principal,
        }
      );
    }
  }

  automaticUpdatesEnabled() {
    return AddonManager.updateEnabled && AddonManager.autoUpdateDefault;
  }

  toggleAutomaticUpdates() {
    if (!this.automaticUpdatesEnabled()) {
      // One or both of the prefs is false, i.e. the checkbox is not
      // checked. Now toggle both to true. If the user wants us to
      // auto-update add-ons, we also need to auto-check for updates.
      AddonManager.updateEnabled = true;
      AddonManager.autoUpdateDefault = true;
    } else {
      // Both prefs are true, i.e. the checkbox is checked.
      // Toggle the auto pref to false, but don't touch the enabled check.
      AddonManager.autoUpdateDefault = false;
    }
  }

  async resetAutomaticUpdates() {
    let addons = await AddonManager.getAllAddons();
    for (let addon of addons) {
      if ("applyBackgroundUpdates" in addon) {
        addon.applyBackgroundUpdates = AddonManager.AUTOUPDATE_DEFAULT;
      }
    }
  }

  /**
   * AddonManager listener events.
   */

  onUpdateModeChanged() {
    let updatesEnabled = this.automaticUpdatesEnabled();
    this.toggleUpdatesEl.checked = updatesEnabled;
    let resetType = updatesEnabled ? "automatic" : "manual";
    let resetStringId = `addon-updates-reset-updates-to-${resetType}`;
    document.l10n.setAttributes(this.resetUpdatesEl, resetStringId);
  }
}
customElements.define("addon-page-options", AddonPageOptions);
