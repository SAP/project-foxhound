/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html } from "chrome://global/content/vendor/lit.all.mjs";

window.MozXULElement.insertFTLIfNeeded("browser/preferences/preferences.ftl");

/**
 * @typedef {object} EngineInfo
 * @property {string} iconSrc - The icon URL for the engine.
 * @property {string} l10nId - The localization ID for the engine.
 */

/**
 * @type {Record<string, EngineInfo>}
 */
const engineTypeToMetadata = {
  bookmarks: {
    iconSrc: "chrome://browser/skin/bookmark-hollow.svg",
    l10nId: "sync-currently-syncing-bookmarks",
  },
  history: {
    iconSrc: "chrome://browser/skin/history.svg",
    l10nId: "sync-currently-syncing-history",
  },
  tabs: {
    iconSrc: "chrome://browser/skin/tabs.svg",
    l10nId: "sync-currently-syncing-tabs",
  },
  passwords: {
    iconSrc: "chrome://browser/skin/login.svg",
    l10nId: "sync-currently-syncing-passwords",
  },
  addresses: {
    iconSrc: "chrome://browser/skin/notification-icons/geo.svg",
    l10nId: "sync-currently-syncing-addresses",
  },
  payments: {
    iconSrc: "chrome://browser/skin/payment-methods-16.svg",
    l10nId: "sync-currently-syncing-payment-methods",
  },
  addons: {
    iconSrc: "chrome://mozapps/skin/extensions/extension.svg",
    l10nId: "sync-currently-syncing-addons",
  },
  settings: {
    iconSrc: "chrome://global/skin/icons/settings.svg",
    l10nId: "sync-currently-syncing-settings",
  },
};

/**
 * A custom element that displays synced engines in Sync settings section.
 *
 * @tagname sync-engines-list
 * @property {string[]} engines - Array of engine types to display.
 *   Options: bookmarks, history, tabs, passwords, addresses, payments, addons, settings.
 */
class SyncEnginesList extends MozLitElement {
  static properties = {
    engines: { type: Array },
  };

  constructor() {
    super();

    /** @type {string[]} */
    this.engines = [];
  }

  /**
   * @param {string} type
   */
  engineTemplate(type) {
    let metadata = engineTypeToMetadata[type];
    if (!metadata) {
      return null;
    }

    return html`
      <div class="sync-engine">
        <img src=${metadata.iconSrc} role="presentation" />
        <label data-l10n-id=${metadata.l10nId}></label>
      </div>
    `;
  }

  syncedEnginesTemplate() {
    return html`<moz-box-item>
      <div class="engines-list-wrapper">
        <span
          id="heading"
          data-l10n-id="sync-syncing-across-devices-heading-2"
        ></span>
        <div class="engines-list-container">
          ${this.engines.map(type => this.engineTemplate(type))}
        </div>
      </div>
    </moz-box-item>`;
  }

  emptyStateTemplate() {
    return html`<placeholder-message
      data-l10n-id="sync-syncing-across-devices-empty-state"
      imageSrc="chrome://global/skin/illustrations/security-error.svg"
    ></placeholder-message>`;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/preferences/widgets/sync-engines-list.css"
      />
      ${this.engines.length
        ? this.syncedEnginesTemplate()
        : this.emptyStateTemplate()}
    `;
  }
}
customElements.define("sync-engines-list", SyncEnginesList);
