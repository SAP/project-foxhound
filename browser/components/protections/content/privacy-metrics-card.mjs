/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global RPMSendQuery */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { html } from "chrome://global/content/vendor/lit.all.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/moz-card.mjs";

const CATEGORIES = [
  {
    key: "trackers",
    prop: "trackers",
    icon: "chrome://browser/skin/canvas.svg",
    l10nId: "privacy-metrics-trackers",
  },
  {
    key: "fingerprinters",
    prop: "fingerprinters",
    icon: "chrome://browser/skin/fingerprint.svg",
    l10nId: "privacy-metrics-fingerprinters",
  },
  {
    key: "cookies",
    prop: "cookies",
    icon: "chrome://browser/skin/controlcenter/3rdpartycookies.svg",
    l10nId: "privacy-metrics-cookies",
  },
  {
    key: "social",
    prop: "socialTrackers",
    icon: "chrome://browser/skin/thumb-down.svg",
    l10nId: "privacy-metrics-social",
  },
];

export class PrivacyMetricsCard extends MozLitElement {
  static properties = {
    total: { type: Number, reflect: true },
    trackers: { type: Number, reflect: true },
    fingerprinters: { type: Number, reflect: true },
    cookies: { type: Number, reflect: true },
    socialTrackers: { type: Number, reflect: true },
    _loading: { type: Boolean, state: true },
    _error: { type: Boolean, state: true },
    _isPrivate: { type: Boolean, state: true },
  };

  constructor() {
    super();
    this.total = 0;
    this.trackers = 0;
    this.fingerprinters = 0;
    this.cookies = 0;
    this.socialTrackers = 0;
    this._loading = true;
    this._error = false;
    this._isPrivate = false;
  }

  async connectedCallback() {
    super.connectedCallback();
    await this.#fetchStats();
  }

  async #fetchStats() {
    this._loading = true;
    this._error = false;

    try {
      const stats = await RPMSendQuery("FetchPrivacyMetrics");
      if (!this.isConnected) {
        return;
      }
      if (stats?.isPrivate) {
        this._isPrivate = true;
        return;
      }
      if (!stats) {
        this._error = true;
        return;
      }
      this.total = stats.total;
      this.trackers = stats.trackers;
      this.fingerprinters = stats.fingerprinters;
      this.cookies = stats.cookies;
      this.socialTrackers = stats.socialTrackers;
    } catch (e) {
      console.error("PrivacyMetricsCard: Failed to fetch stats", e);
      this._error = true;
    } finally {
      this._loading = false;
    }
  }

  #renderLoading() {
    return html`
      <div class="loading-state">
        <span data-l10n-id="privacy-metrics-loading"></span>
      </div>
    `;
  }

  #renderError() {
    return html`
      <div class="error-state">
        <span data-l10n-id="privacy-metrics-error"></span>
      </div>
    `;
  }

  #renderPrivateWindow() {
    return html`
      <div class="private-window-state">
        <span data-l10n-id="privacy-metrics-private-window"></span>
      </div>
    `;
  }

  #renderCategories() {
    const sorted = [...CATEGORIES].sort((a, b) => this[b.prop] - this[a.prop]);

    const categoryElements = sorted.map(cat => {
      const count = this[cat.prop];
      return html`
        <div class="category-row" data-type=${cat.key}>
          <img class="category-icon ${cat.key}" src=${cat.icon} />
          <span
            class="category-label"
            data-l10n-id=${cat.l10nId}
            data-l10n-args=${JSON.stringify({ count })}
          ></span>
        </div>
      `;
    });

    return html`<div class="categories">${categoryElements}</div>`;
  }

  #renderContent() {
    if (this._loading) {
      return this.#renderLoading();
    } else if (this._isPrivate) {
      return this.#renderPrivateWindow();
    } else if (this._error) {
      return this.#renderError();
    }
    if (this.total === 0) {
      return html`
        <div class="empty-state">
          <span data-l10n-id="privacy-metrics-empty"></span>
        </div>
        ${this.#renderCategories()}
      `;
    }
    return html`
      <div class="stats-total">
        <span
          class="total-label"
          data-l10n-id="privacy-metrics-blocked-this-week"
          data-l10n-args=${JSON.stringify({ count: this.total })}
        ></span>
      </div>
      ${this.#renderCategories()}
    `;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/privacy-metrics-card.css"
      />
      <moz-card>
        <div class="card-header">
          <img
            class="header-icon light"
            src="chrome://browser/content/logos/tracking-protection.svg"
            alt=""
          />
          <img
            class="header-icon dark"
            src="chrome://browser/content/logos/tracking-protection-dark-theme.svg"
            alt=""
          />
          <h3 class="card-title">
            <span data-l10n-id="privacy-metrics-title"></span>
          </h3>
        </div>
        ${this.#renderContent()}
      </moz-card>
    `;
  }
}

customElements.define("privacy-metrics-card", PrivacyMetricsCard);
