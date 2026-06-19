/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

const DEFAULT_FAVICON = "chrome://global/skin/icons/defaultFavicon.svg";

/**
 * A card component for rendering URLs in Smart Window
 *
 * TODO: Bug 2045156 update with moz-card
 */
export class AIChatCard extends MozLitElement {
  static properties = {
    url: { type: String },
    title: { type: String },
    favicon: { type: String },
    thumbnail: { type: String },
    timestamp: { type: String },
    thumbnailError: { type: Boolean, state: true },
  };

  get domain() {
    const url = URL.parse(this.url);
    return url?.hostname ?? "";
  }

  willUpdate(changed) {
    if (changed.has("thumbnail")) {
      this.thumbnailError = false;
    }
  }

  renderImage() {
    if (this.thumbnailError) {
      return this.renderFallback();
    }

    if (this.thumbnail) {
      return html`<img
        part="thumbnail"
        decoding="async"
        loading="lazy"
        class="thumbnail"
        src=${this.thumbnail}
        role="presentation"
        @error=${() => {
          this.thumbnailError = true;
        }}
      />`;
    }

    if (this.favicon) {
      return html`<div part="thumbnail" class="thumbnail">
        <div>
          <img
            part="thumbnail"
            decoding="async"
            loading="lazy"
            src=${this.favicon}
            role="presentation"
            @error=${e => {
              e.target.src = DEFAULT_FAVICON;
            }}
          />
        </div>
      </div>`;
    }

    return this.renderFallback();
  }

  renderFavicon() {
    return html`<img
      class="favicon"
      src=${this.favicon || DEFAULT_FAVICON}
      role="presentation"
      @error=${e => {
        e.target.src = DEFAULT_FAVICON;
      }}
    />`;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/ai-chat-card.css"
      />
      <a class="ai-chat-card" href=${this.url} target="_blank">
        ${this.renderImage()}
        <div class="description">
          <span part="title" class="title">${this.title}</span>
          <div class="meta">
            <div class="site">
              ${this.renderFavicon()}
              <span class="domain" title=${this.domain}>${this.domain}</span>
            </div>
            <span part="timestamp" class="timestamp">${this.timestamp}</span>
          </div>
        </div>
      </a>
    `;
  }

  renderFallback() {
    return html`
      <svg
        class="ai-chat-card-thumbnail-fallback"
        preserveAspectRatio="none"
        viewBox="0 0 221 142"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect class="background" width="221" height="142" fill="context-fill" />
        <rect
          class="box"
          x="12"
          y="12"
          width="111"
          height="55"
          rx="4"
          fill="context-fill"
          fill-opacity="context-fill-opacity"
        />
        <rect
          class="box"
          x="131"
          y="22"
          width="67"
          height="5"
          rx="2.5"
          fill="context-fill"
          fill-opacity="context-fill-opacity"
        />
        <rect
          class="box"
          x="131"
          y="32"
          width="78"
          height="5"
          rx="2.5"
          fill="context-fill"
          fill-opacity="context-fill-opacity"
        />
        <rect
          class="box"
          x="131"
          y="42"
          width="60"
          height="5"
          rx="2.5"
          fill="context-fill"
          fill-opacity="context-fill-opacity"
        />
        <rect
          class="box"
          x="131"
          y="52"
          width="67"
          height="5"
          rx="2.5"
          fill="context-fill"
          fill-opacity="context-fill-opacity"
        />
        <rect
          class="box"
          x="12"
          y="85"
          width="67"
          height="5"
          rx="2.5"
          fill="context-fill"
          fill-opacity="context-fill-opacity"
        />
        <rect
          class="box"
          x="12"
          y="95"
          width="78"
          height="5"
          rx="2.5"
          fill="context-fill"
          fill-opacity="context-fill-opacity"
        />
        <rect
          class="box"
          x="12"
          y="105"
          width="60"
          height="5"
          rx="2.5"
          fill="context-fill"
          fill-opacity="context-fill-opacity"
        />
        <rect
          class="box"
          x="12"
          y="115"
          width="67"
          height="5"
          rx="2.5"
          fill="context-fill"
          fill-opacity="context-fill-opacity"
        />
        <rect
          class="box"
          x="98"
          y="75"
          width="111"
          height="55"
          rx="4"
          fill="context-fill"
          fill-opacity="context-fill-opacity"
        />
      </svg>
    `;
  }
}

customElements.define("ai-chat-card", AIChatCard);
