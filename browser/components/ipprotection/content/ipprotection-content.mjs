/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html, ifDefined } from "chrome://global/content/vendor/lit.all.mjs";
import {
  BANDWIDTH,
  LINKS,
  ERRORS,
} from "chrome://browser/content/ipprotection/ipprotection-constants.mjs";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/ipprotection/ipprotection-message-bar.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/ipprotection/ipprotection-unauthenticated.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/ipprotection/ipprotection-status-card.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/ipprotection/ipprotection-status-box.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-toggle.mjs";

/**
 * Custom element that implements a message bar and status card for IP protection.
 */
export default class IPProtectionContentElement extends MozLitElement {
  static queries = {
    unauthenticatedEl: "ipprotection-unauthenticated",
    messagebarEl: "ipprotection-message-bar",
    statusCardEl: "ipprotection-status-card",
    upgradeEl: "#upgrade-vpn-content",
    activeSubscriptionEl: "#active-subscription-vpn-content",
    supportLinkEl: "#vpn-support-link",
    statusBoxEl: "ipprotection-status-box",
    siteExclusionControlEl: "#site-exclusion-control",
    siteExclusionToggleEl: "#site-exclusion-toggle",
    settingsButtonEl: "#vpn-settings-button",
  };

  static properties = {
    state: { type: Object, attribute: false },
    _showMessageBar: { type: Boolean, state: true },
    _messageDismissed: { type: Boolean, state: true },
  };

  constructor() {
    super();

    this.state = {};

    this.keyListener = this.#keyListener.bind(this);
    this.messageBarListener = this.#messageBarListener.bind(this);
    this.statusCardListener = this.#statusCardListener.bind(this);
    this._showMessageBar = false;
    this._messageDismissed = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.dispatchEvent(new CustomEvent("IPProtection:Init", { bubbles: true }));
    this.addEventListener("keydown", this.keyListener, { capture: true });
    this.addEventListener(
      "ipprotection-status-card:user-toggled-on",
      this.#statusCardListener
    );
    this.addEventListener(
      "ipprotection-status-card:user-toggled-off",
      this.#statusCardListener
    );
    this.addEventListener(
      "ipprotection-message-bar:user-dismissed",
      this.#messageBarListener
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.removeEventListener("keydown", this.keyListener, { capture: true });
    this.removeEventListener(
      "ipprotection-status-card:user-toggled-on",
      this.#statusCardListener
    );
    this.removeEventListener(
      "ipprotection-status-card:user-toggled-off",
      this.#statusCardListener
    );
    this.removeEventListener(
      "ipprotection-message-bar:user-dismissed",
      this.#messageBarListener
    );
  }

  get canEnableConnection() {
    return this.state && this.state.isProtectionEnabled && !this.state.error;
  }

  get hasSiteExclusion() {
    return this.state?.siteData?.isExclusion ?? false;
  }

  get #hasErrors() {
    return !this.state || !!this.state.error;
  }

  handleClickSupportLink(event) {
    const win = event.target.ownerGlobal;

    if (event.target === this.supportLinkEl) {
      event.preventDefault();
      win.openWebLinkIn(LINKS.PRODUCT_URL, "tab");
      this.dispatchEvent(
        new CustomEvent("IPProtection:Close", { bubbles: true })
      );
    }
  }

  handleUpgrade(event) {
    const win = event.target.ownerGlobal;
    win.openWebLinkIn(LINKS.PRODUCT_URL + "#pricing", "tab");
    // Close the panel
    this.dispatchEvent(
      new CustomEvent("IPProtection:ClickUpgrade", { bubbles: true })
    );

    Glean.ipprotection.clickUpgradeButton.record();
  }

  focus() {
    if (this.state.unauthenticated) {
      this.unauthenticatedEl?.focus();
    } else {
      this.statusCardEl?.focus();
    }
  }

  #keyListener(event) {
    let keyCode = event.code;
    switch (keyCode) {
      case "Tab":
      case "ArrowUp":
      // Intentional fall-through
      case "ArrowDown": {
        event.stopPropagation();
        event.preventDefault();

        let isForward =
          (keyCode == "Tab" && !event.shiftKey) || keyCode == "ArrowDown";
        let direction = isForward
          ? Services.focus.MOVEFOCUS_FORWARD
          : Services.focus.MOVEFOCUS_BACKWARD;
        Services.focus.moveFocus(
          window,
          null,
          direction,
          Services.focus.FLAG_BYKEY
        );
        break;
      }
    }
  }

  #statusCardListener(event) {
    if (event.type === "ipprotection-status-card:user-toggled-on") {
      this.dispatchEvent(
        new CustomEvent("IPProtection:UserEnable", { bubbles: true })
      );
    } else if (event.type === "ipprotection-status-card:user-toggled-off") {
      this.dispatchEvent(
        new CustomEvent("IPProtection:UserDisable", { bubbles: true })
      );
    }
  }

  #messageBarListener(event) {
    if (event.type === "ipprotection-message-bar:user-dismissed") {
      this._showMessageBar = false;
      this._messageDismissed = true;
      this.state.error = "";

      if (this.state.bandwidthWarning) {
        const threshold = Services.prefs.getIntPref(
          "browser.ipProtection.bandwidthThreshold",
          0
        );
        this.dispatchEvent(
          new CustomEvent("IPProtection:DismissBandwidthWarning", {
            bubbles: true,
            composed: true,
            detail: { threshold },
          })
        );
      }
    }
  }

  handleToggleUseVPN(event) {
    let isEnabled = event.target.pressed;

    if (isEnabled) {
      this.dispatchEvent(
        new CustomEvent("IPProtection:UserEnableVPNForSite", {
          bubbles: true,
        })
      );
    } else {
      this.dispatchEvent(
        new CustomEvent("IPProtection:UserDisableVPNForSite", {
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  handleClickSettingsButton(event) {
    event.preventDefault();
    const win = event.target.ownerGlobal;
    win.openPreferences("privacy-vpn");
    this.dispatchEvent(
      new CustomEvent("IPProtection:Close", { bubbles: true, composed: true })
    );
  }

  updated(changedProperties) {
    super.updated(changedProperties);

    // Clear messages when there is an error.
    if (this.state.error) {
      this._messageDismissed = false;
    }
  }

  messageBarTemplate() {
    let messageId;
    let messageLink;
    let messageLinkl10nId;
    let messageLinkL10nArgs;
    let messageType = "info";

    if (this.state.bandwidthWarning) {
      messageId = "ipprotection-message-bandwidth-warning";
      messageType = "warning";
      const bandwidthRemaining =
        this.state.bandwidthUsage.remaining / BANDWIDTH.BYTES_IN_GB;
      const maxUsage = this.state.bandwidthUsage.max / BANDWIDTH.BYTES_IN_GB;
      const pctUsed = (100 * (maxUsage - bandwidthRemaining)) / maxUsage;
      let usageLeft = Math.round(bandwidthRemaining);

      if (pctUsed >= 75 && pctUsed < 90) {
        usageLeft = bandwidthRemaining.toFixed(1);
      } else if (bandwidthRemaining < 1) {
        messageId = "ipprotection-message-bandwidth-warning-mb";
        usageLeft = Math.floor(
          this.state.bandwidthUsage.remaining / BANDWIDTH.BYTES_IN_MB
        );
      }
      messageLinkL10nArgs = JSON.stringify({
        usageLeft,
        maxUsage,
      });
    } else if (this.state.onboardingMessage) {
      messageId = this.state.onboardingMessage;
      messageType = "info";

      switch (this.state.onboardingMessage) {
        case "ipprotection-message-continuous-onboarding-intro":
          break;
        case "ipprotection-message-continuous-onboarding-autostart":
          messageLink = "about:settings#privacy";
          messageLinkl10nId = "setting-link";
          break;
        case "ipprotection-message-continuous-onboarding-site-settings":
          messageLink = "about:settings#privacy";
          messageLinkl10nId = "setting-link";
          break;
      }
    }

    return html`
      <ipprotection-message-bar
        class="vpn-top-content"
        type=${messageType}
        .messageId=${ifDefined(messageId)}
        .messageLink=${ifDefined(messageLink)}
        .messageLinkl10nId=${ifDefined(messageLinkl10nId)}
        .messageLinkL10nArgs=${ifDefined(messageLinkL10nArgs)}
        .bandwidthUsage=${ifDefined(this.state.bandwidthUsage)}
      ></ipprotection-message-bar>
    `;
  }

  statusCardTemplate() {
    let hasExclusion = this.hasSiteExclusion;

    return html`
      <ipprotection-status-card
        .protectionEnabled=${this.canEnableConnection}
        .location=${this.state.location}
        .bandwidthUsage=${ifDefined(this.state.bandwidthUsage)}
        .hasExclusion=${hasExclusion}
        .isActivating=${this.state.isActivating}
      ></ipprotection-status-card>
    `;
  }

  upgradeTemplate() {
    if (this.state.hasUpgraded) {
      return null;
    }

    return html` <div slot="content">
      <link
        rel="stylesheet"
        href="chrome://browser/content/ipprotection/ipprotection-content.css"
      />
      <div id="upgrade-vpn-content">
        <h2
          id="upgrade-vpn-title"
          data-l10n-id="upgrade-vpn-title"
          class="vpn-title"
        ></h2>
        <span
          id="upgrade-vpn-description"
          data-l10n-id="upgrade-vpn-description"
          class="vpn-description"
        ></span>
        <moz-button
          id="upgrade-vpn-button"
          class="vpn-button"
          type="primary"
          data-l10n-id="upgrade-vpn-button"
          @click=${this.handleUpgrade}
        ></moz-button>
      </div>
    </div>`;
  }

  errorTemplate() {
    const isNetworkError = this.state.error === ERRORS.NETWORK;

    const headerL10nId = isNetworkError
      ? "ipprotection-connection-status-network-error-title"
      : "ipprotection-connection-status-generic-error-title";

    const descriptionL10nId = isNetworkError
      ? "ipprotection-connection-status-network-error-description"
      : "ipprotection-connection-status-generic-error-description";

    const errorType = isNetworkError ? ERRORS.NETWORK : ERRORS.GENERIC;

    return html`
      <ipprotection-status-box
        .headerL10nId=${headerL10nId}
        .descriptionL10nId=${descriptionL10nId}
        .type=${errorType}
      >
        ${isNetworkError
          ? html`
              <img
                slot="icon"
                role="presentation"
                class="icon"
                src="chrome://browser/content/ipprotection/assets/states/ipprotection-error.svg"
              />
            `
          : null}
      </ipprotection-status-box>
    `;
  }

  pausedTemplate() {
    return html`
      <ipprotection-status-box
        headerL10nId="ipprotection-connection-status-paused-title"
        descriptionL10nId="ipprotection-connection-status-paused-description"
        .descriptionL10nArgs=${JSON.stringify({
          maxUsage: this.state.bandwidthUsage.max / BANDWIDTH.BYTES_IN_GB,
        })}
        type="disconnected"
      >
        ${this.upgradeTemplate()}
      </ipprotection-status-box>
    `;
  }

  exclusionToggleTemplate() {
    if (
      !this.state.isSiteExceptionsEnabled ||
      !this.state.siteData ||
      !this.state.isProtectionEnabled ||
      this.#hasErrors
    ) {
      return null;
    }

    const hasExclusion = this.hasSiteExclusion;
    const siteExclusionToggleStateL10nId = hasExclusion
      ? "site-exclusion-toggle-disabled"
      : "site-exclusion-toggle-enabled";
    return html` <div id="site-exclusion-control">
      <span id="site-exclusion-label-container">
        <img
          id="site-exclusion-icon"
          src="chrome://browser/content/ipprotection/assets/shield-vpn-exceptions.svg"
        />
        <label
          data-l10n-id="site-exclusion-toggle-label"
          id="site-exclusion-label"
          for="site-exclusion-toggle"
        ></label>
      </span>
      <moz-toggle
        data-l10n-id=${siteExclusionToggleStateL10nId}
        data-l10n-attrs="label"
        id="site-exclusion-toggle"
        ?pressed=${!hasExclusion}
        @toggle=${this.handleToggleUseVPN}
      >
      </moz-toggle>
    </div>`;
  }

  footerTemplate() {
    return html`
      <div class="vpn-bottom-content">
        <moz-button
          type="ghost"
          data-l10n-id="ipprotection-settings-link"
          iconsrc="chrome://global/skin/icons/settings.svg"
          id="vpn-settings-button"
          @click=${this.handleClickSettingsButton}
        >
          ></moz-button
        >
      </div>
    `;
  }

  mainContentTemplate() {
    if (this.state.unauthenticated) {
      return html`
        <ipprotection-unauthenticated></ipprotection-unauthenticated>
      `;
    }

    if (this.#hasErrors) {
      return html` ${this.errorTemplate()}${this.footerTemplate()}`;
    }

    if (this.state.paused) {
      return html` ${this.pausedTemplate()} ${this.footerTemplate()}`;
    }

    return html`
      ${this.statusCardTemplate()} ${this.exclusionToggleTemplate()}
      ${this.footerTemplate()}
    `;
  }

  render() {
    if (
      (this.state.onboardingMessage || this.state.bandwidthWarning) &&
      !this._messageDismissed
    ) {
      this._showMessageBar = true;
    } else if (!this.state.onboardingMessage && !this.state.bandwidthWarning) {
      // Remove the message bar if we can no longer render messages before they were dismissed
      this._showMessageBar = false;
    }

    const messageBar = this._showMessageBar ? this.messageBarTemplate() : null;

    let content = html`${messageBar}${this.mainContentTemplate()}`;

    // TODO: Conditionally render post-upgrade subview within #ipprotection-content-wrapper - Bug 1973813
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/ipprotection/ipprotection-content.css"
      />
      <div id="ipprotection-content-wrapper">${content}</div>
    `;
  }
}

customElements.define("ipprotection-content", IPProtectionContentElement);
