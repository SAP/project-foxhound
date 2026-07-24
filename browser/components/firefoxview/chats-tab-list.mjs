/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  classMap,
  html,
  ifDefined,
  styleMap,
  when,
} from "chrome://global/content/vendor/lit.all.mjs";
import {
  FxviewTabListBase,
  FxviewTabRowBase,
} from "chrome://browser/content/firefoxview/fxview-tab-list.mjs";

/**
 * A list of clickable chat history items
 */
export class ChatsTabList extends FxviewTabListBase {
  static queries = {
    ...FxviewTabListBase.queries,
    rowEls: {
      all: "chats-tab-row",
    },
  };

  itemTemplate = (tabItem, i) => {
    let time;
    if (tabItem.time || tabItem.closedAt) {
      let stringTime = (tabItem.time || tabItem.closedAt).toString();
      // Different APIs return time in different units, so we use
      // the length to decide if it's milliseconds or nanoseconds.
      if (stringTime.length === 16) {
        time = (tabItem.time || tabItem.closedAt) / 1000;
      } else {
        time = tabItem.time || tabItem.closedAt;
      }
    }

    return html`<chats-tab-row
      ?active=${i == this.activeIndex}
      ?compact=${this.compactRows}
      .currentActiveElementId=${this.currentActiveElementId}
      .favicon=${ifDefined(tabItem.icon)}
      .pageUrl=${ifDefined(tabItem.pageUrl)}
      .primaryL10nId=${tabItem.primaryL10nId}
      .primaryL10nArgs=${ifDefined(tabItem.primaryL10nArgs)}
      .secondaryL10nId=${tabItem.secondaryL10nId}
      .secondaryL10nArgs=${ifDefined(tabItem.secondaryL10nArgs)}
      .tertiaryL10nId=${ifDefined(tabItem.tertiaryL10nId)}
      .tertiaryL10nArgs=${ifDefined(tabItem.tertiaryL10nArgs)}
      .secondaryActionClass=${this.secondaryActionClass}
      .tertiaryActionClass=${ifDefined(this.tertiaryActionClass)}
      .sourceClosedId=${ifDefined(tabItem.sourceClosedId)}
      .sourceWindowId=${ifDefined(tabItem.sourceWindowId)}
      .closedId=${ifDefined(tabItem.closedId || tabItem.closedId)}
      role="listitem"
      .time=${ifDefined(time)}
      .title=${tabItem.title}
      .url=${tabItem.url}
      .searchQuery=${ifDefined(this.searchQuery)}
      .timeMsPref=${ifDefined(this.timeMsPref)}
      .hasPopup=${this.hasPopup}
      .dateTimeFormat=${this.dateTimeFormat}
      .convId=${tabItem.convId}
    ></chats-tab-row>`;
  };
}

customElements.define("chats-tab-list", ChatsTabList);

/**
 * A chat history item that displays favicon with optional overlay, title, url, and time
 *
 * @property {string} pageUrl - The last visited URL associated with this chat, if any
 */
export class ChatsTabRow extends FxviewTabRowBase {
  static properties = {
    ...FxviewTabRowBase.properties,
    pageUrl: { type: String },
    convId: { type: String },
  };

  faviconTemplate() {
    // Determine the icon and overlay based on whether chat has an associated page URL
    let faviconUrl;
    let overlayUrl = null;

    // Treat about: URLs as internal/no external page
    const hasExternalUrl = this.pageUrl && !this.pageUrl.startsWith("about:");

    if (hasExternalUrl) {
      // Chat has an associated page URL - show page favicon with chat overlay
      faviconUrl = this.getImageUrl(this.favicon, this.pageUrl);
      overlayUrl = "chrome://browser/content/firefoxview/empty-chat.svg";
    } else {
      // Chat has no page URL or internal about: page - show generic chat icon, no overlay
      faviconUrl = "chrome://browser/content/firefoxview/view-chats.svg";
    }

    const backgroundImage = overlayUrl
      ? `url(${faviconUrl}), url(${overlayUrl})`
      : `url(${faviconUrl})`;

    return html`<span
      class=${classMap({
        "fxview-tab-row-favicon": true,
        icon: true,
        "chat-overlay": !!overlayUrl,
      })}
      id="fxview-tab-row-favicon"
      style=${styleMap({
        backgroundImage,
      })}
    ></span>`;
  }

  urlTemplate() {
    const urlToDisplay =
      this.pageUrl && !this.pageUrl.startsWith("about:") ? this.pageUrl : "";

    return html`<span
      class="fxview-tab-row-url text-truncated-ellipsis"
      id="fxview-tab-row-url"
    >
      ${when(
        this.searchQuery,
        () => this.highlightSearchMatches(this.searchQuery, urlToDisplay),
        () => urlToDisplay
      )}
    </span>`;
  }

  render() {
    return html`
      ${this.stylesheets()}
      <link
        rel="stylesheet"
        href="chrome://browser/content/firefoxview/chats-tab-list.css"
      />
      <a
        href=${ifDefined(this.url)}
        class="fxview-tab-row-main"
        id="fxview-tab-row-main"
        tabindex=${this.active &&
        this.currentActiveElementId === "fxview-tab-row-main"
          ? "0"
          : "-1"}
        data-l10n-id=${ifDefined(this.primaryL10nId)}
        data-l10n-args=${ifDefined(this.primaryL10nArgs)}
        @click=${this.primaryActionHandler}
        @keydown=${this.primaryActionHandler}
        title=${!this.primaryL10nId ? this.url : null}
        data-conv-id=${ifDefined(this.convId)}
      >
        ${this.faviconTemplate()} ${this.titleTemplate()}
        ${when(
          !this.compact,
          () =>
            html`${this.urlTemplate()} ${this.dateTemplate()}
            ${this.timeTemplate()}`
        )}
      </a>
      ${this.secondaryButtonTemplate()} ${this.tertiaryButtonTemplate()}
    `;
  }
}

customElements.define("chats-tab-row", ChatsTabRow);
