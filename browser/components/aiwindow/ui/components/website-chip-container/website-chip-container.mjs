/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import {
  html,
  nothing,
  repeat,
} from "chrome://global/content/vendor/lit.all.mjs";

// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/ai-website-chip.mjs";

/** @typedef {import("chrome://browser/content/urlbar/SmartbarInput.mjs").ContextWebsite} ContextWebsite */

/**
 * Container for rendering a horizontally scrollable row of website chips
 */
export class WebsiteChipContainer extends MozLitElement {
  static properties = {
    websites: { type: Array },
    chipType: { type: String },
    removable: { type: Boolean },
  };

  constructor() {
    super();
    /** @type {ContextWebsite[]} */
    this.websites = [];
    this.chipType = "context-chip";
    this.removable = false;
  }

  #onRemoveWebsite(website, event) {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("ai-website-chip:remove", {
        bubbles: true,
        composed: true,
        detail: { url: website.url, label: website.label },
      })
    );
  }

  render() {
    if (!this.websites.length) {
      return nothing;
    }

    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/website-chip-container.css"
      />
      <div class="chip-container">
        <div class="scroller" role="list">
          ${repeat(
            this.websites,
            website => website.url,
            website =>
              website.historyDeleted
                ? html`<div class="chip-history-deleted" role="listitem">
                    <img
                      class="chip-history-deleted-icon"
                      src="chrome://global/skin/icons/defaultFavicon.svg"
                    />
                    <span
                      data-l10n-id="aiwindow-website-chip-history-deleted"
                    ></span>
                  </div>`
                : html`<ai-website-chip
                    .type=${this.chipType}
                    .label=${website.label}
                    .href=${website.url}
                    .iconSrc=${website.iconSrc ?? ""}
                    .removable=${this.removable}
                    @ai-website-chip:remove=${e =>
                      this.#onRemoveWebsite(website, e)}
                  ></ai-website-chip>`
          )}
        </div>
      </div>
    `;
  }
}

customElements.define("website-chip-container", WebsiteChipContainer);
