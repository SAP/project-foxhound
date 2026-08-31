/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AddonManagerListenerHandler } from "../aboutaddons-utils.mjs";
import { MessageBarStackElement } from "./message-bar-stack.mjs";

const { AddonManager, AMBrowserExtensionsImport } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs"
);

class GlobalWarnings extends MessageBarStackElement {
  constructor() {
    super();
    // This won't change at runtime, but we'll want to fake it in tests.
    this.inSafeMode = Services.appinfo.inSafeMode;
    this.globalWarning = null;
  }

  connectedCallback() {
    this.refresh();
    this.addEventListener("click", this);
    AddonManagerListenerHandler.addListener(this);
  }

  disconnectedCallback() {
    this.removeEventListener("click", this);
    AddonManagerListenerHandler.removeListener(this);
  }

  refresh() {
    if (this.inSafeMode) {
      this.setWarning("safe-mode", {
        supportPage: "diagnose-firefox-issues-using-troubleshoot-mode",
      });
    } else if (
      AddonManager.checkUpdateSecurityDefault &&
      !AddonManager.checkUpdateSecurity
    ) {
      this.setWarning("update-security", { action: true });
    } else if (!AddonManager.checkCompatibility) {
      this.setWarning("check-compatibility", { action: true });
    } else if (AMBrowserExtensionsImport.canCompleteOrCancelInstalls) {
      this.setWarning("imported-addons", { action: true });
    } else {
      this.removeWarning();
    }
  }

  setWarning(type, { action, supportPage }) {
    if (
      this.globalWarning &&
      this.globalWarning.getAttribute("warning-type") !== type
    ) {
      this.removeWarning();
    }
    if (!this.globalWarning) {
      this.globalWarning = document.createElement("moz-message-bar");
      this.globalWarning.setAttribute("warning-type", type);
      let { messageId, buttonId } = this.getGlobalWarningL10nIds(type);
      document.l10n.setAttributes(this.globalWarning, messageId);
      this.globalWarning.setAttribute("data-l10n-attrs", "message");
      if (supportPage) {
        let link = document.createElement("a", { is: "moz-support-link" });
        link.setAttribute("slot", "support-link");
        link.setAttribute("support-page", supportPage);
        this.globalWarning.appendChild(link);
      }
      if (action) {
        let button = document.createElement("button");
        document.l10n.setAttributes(button, buttonId);
        button.setAttribute("action", type);
        button.setAttribute("slot", "actions");
        this.globalWarning.appendChild(button);
      }
      this.appendChild(this.globalWarning);
    }
  }

  getGlobalWarningL10nIds(type) {
    const WARNING_TYPE_TO_L10NID_MAPPING = {
      "safe-mode": {
        messageId: "extensions-warning-safe-mode3",
      },
      "update-security": {
        messageId: "extensions-warning-update-security2",
        buttonId: "extensions-warning-update-security-button",
      },
      "check-compatibility": {
        messageId: "extensions-warning-check-compatibility2",
        buttonId: "extensions-warning-check-compatibility-button",
      },
      "imported-addons": {
        messageId: "extensions-warning-imported-addons2",
        buttonId: "extensions-warning-imported-addons-button",
      },
    };

    return WARNING_TYPE_TO_L10NID_MAPPING[type];
  }

  removeWarning() {
    if (this.globalWarning) {
      this.globalWarning.remove();
      this.globalWarning = null;
    }
  }

  handleEvent(e) {
    if (e.type === "click") {
      switch (e.target.getAttribute("action")) {
        case "update-security":
          AddonManager.checkUpdateSecurity = true;
          break;
        case "check-compatibility":
          AddonManager.checkCompatibility = true;
          break;
        case "imported-addons":
          AMBrowserExtensionsImport.completeInstalls();
          break;
      }
    }
  }

  /**
   * AddonManager listener events.
   */

  onCompatibilityModeChanged() {
    this.refresh();
  }

  onCheckUpdateSecurityChanged() {
    this.refresh();
  }

  onBrowserExtensionsImportChanged() {
    this.refresh();
  }
}
customElements.define("global-warnings", GlobalWarnings);
