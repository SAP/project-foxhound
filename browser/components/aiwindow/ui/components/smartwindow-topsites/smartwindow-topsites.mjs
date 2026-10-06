/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

/**
 * A component that displays a single row of Top Sites tiles below the
 * Smartbar. Each tile shows a favicon and the site's title; selecting one
 * dispatches a `SmartWindowTopSites:site-selected` event with the site URL.
 *
 * @property {Array<object>} sites - Top Sites as returned by TopSites.getSites()
 */
export class SmartWindowTopSites extends MozLitElement {
  static properties = {
    sites: { type: Array },
  };

  constructor() {
    super();
    this.sites = [];
  }

  #siteSelected(site, position) {
    this.dispatchEvent(
      new CustomEvent("SmartWindowTopSites:site-selected", {
        detail: { url: site.url, position },
        bubbles: true,
        composed: true,
      })
    );
  }

  #iconSrc(site) {
    return site.tippyTopIcon || site.favicon || `page-icon:${site.url}`;
  }

  render() {
    if (!this.sites.length) {
      return html``;
    }

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/smartwindow-topsites.css"
      />
      <div class="sw-topsites-container" role="list">
        ${this.sites.map((site, position) => {
          const title = site.label || site.hostname;
          return html`
            <a
              class="sw-topsite"
              role="listitem"
              href=${site.url}
              title=${title}
              @click=${e => {
                e.preventDefault();
                this.#siteSelected(site, position);
              }}
            >
              <span class="sw-topsite-icon">
                <img alt="" src=${this.#iconSrc(site)} />
              </span>
              <span class="sw-topsite-title">${title}</span>
            </a>
          `;
        })}
      </div>
    `;
  }
}

customElements.define("smartwindow-topsites", SmartWindowTopSites);
