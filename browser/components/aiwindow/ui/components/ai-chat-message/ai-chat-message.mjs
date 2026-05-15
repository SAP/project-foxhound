/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import {
  defaultMarkdownParser,
  DOMSerializer,
} from "chrome://browser/content/multilineeditor/prosemirror.bundle.mjs";

const SERIALIZER = DOMSerializer.fromSchema(defaultMarkdownParser.schema);

// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/ai-chat-search-button.mjs";

/**
 * A custom element for managing AI Chat Content
 */
export class AIChatMessage extends MozLitElement {
  #lastMessage = null;
  #lastMessageElement = "";

  static properties = {
    role: { type: String }, // "user" | "assistant"
    message: { type: String },
    searchTokens: { type: Array },
  };

  constructor() {
    super();
    this.searchTokens = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(
      "AIWindow:chat-search",
      this.handleSearchHandoffEvent.bind(this)
    );
    this.#initLinkNavigationListener();
  }

  #initLinkNavigationListener() {
    this.shadowRoot.addEventListener("click", event => {
      let target = event.target;
      while (target && target !== this.shadowRoot) {
        if (target.tagName === "A" && target.href) {
          event.preventDefault();
          this.dispatchEvent(
            new CustomEvent("AIChatContent:OpenLink", {
              bubbles: true,
              composed: true,
              detail: { url: target.href },
            })
          );
          return;
        }
        target = target.parentElement;
      }
    });
  }

  /**
   * Handle search handoff events
   *
   * @param {CustomEvent} event - The custom event containing the search query.
   */
  handleSearchHandoffEvent(event) {
    const e = new CustomEvent("AIChatContent:DispatchSearch", {
      detail: event.detail,
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(e);
  }

  #getIconSrc = linkHref => {
    // Since we use the "page-icon:" CSP rule we can just look at the page URL for the img src
    const finalIcon = linkHref
      ? `page-icon:${linkHref}`
      : "chrome://global/skin/icons/defaultFavicon.svg";
    return finalIcon;
  };

  /**
   * Replaces “website mention” markdown links rendered as anchors with an
   * <ai-website-chip> custom element.
   *
   * Example markdown that produces such an anchor:
   *
   *   Look up [@Google](
   *     mention:?href=https%3A%2F%2Fwww.google.com
   *   )
   *
   * After ProseMirror renders the markdown, this method transforms:
   *
   *   <a href="mention:?...">@Google</a>
   *
   * into:
   *
   *   <ai-website-chip type="in-line" ...></ai-website-chip>
   *
   *
   * `mention:?` is intentional: the substring after it is a query string.
   * This lets us detect mention anchors and parse href but in the future additional params
   * for example type or src via `URLSearchParams`.
   *
   * @param {Element} root
   *   Root element that already contains sanitized HTML for the message
   *   (i.e., after `setHTML()` has inserted the ProseMirror-rendered output).
   */
  #replaceWebsiteMentions(root) {
    const MAX_URL_LENGTH = 2048;
    const MENTION_PREFIX = "mention:?";
    const links = root.querySelectorAll(`a[href^="${MENTION_PREFIX}"]`);

    for (const a of links) {
      const { href } = a;

      if (!href.startsWith(MENTION_PREFIX)) {
        continue;
      }

      const params = new URLSearchParams(href.substring(MENTION_PREFIX.length));

      // Build Data
      const linkHref = params.get("href") || "";

      if (!linkHref || linkHref.length > MAX_URL_LENGTH) {
        // TODO - https://bugzilla.mozilla.org/show_bug.cgi?id=2011538
        continue;
      }

      const label = a.textContent || linkHref;
      const iconSrc = this.#getIconSrc(linkHref);

      // Create Website Chip
      const chip = root.ownerDocument.createElement("ai-website-chip");
      chip.type = "in-line";
      chip.label = label;
      chip.iconSrc = iconSrc;
      chip.href = linkHref;

      a.replaceWith(chip);
    }
  }

  /**
   * Parse markdown content to HTML using ProseMirror
   *
   * @param {string} markdown the Markdown to parse
   * @param {Element} element the element in which to insert the parsed markdown.
   */
  parseMarkdown(markdown, element) {
    const node = defaultMarkdownParser.parse(markdown);
    const fragment = SERIALIZER.serializeFragment(node.content);

    // Convert DocumentFragment to HTML string
    const container = this.ownerDocument.createElement("div");
    container.appendChild(fragment);

    // Sanitize the HTML string by using "setHTML"
    element.setHTML(container.innerHTML);
  }

  /**
   * Parse markdown and replace mentions for user messages
   *
   * @param {string} markdown
   * @param {Element} element
   */
  parseUserMarkdown(markdown, element) {
    this.parseMarkdown(markdown, element);
    this.#replaceWebsiteMentions(element);
  }

  /**
   * Ensure our message element is up to date. This gets called from
   * render and memoizes based on `this.message` to avoid re-renders.
   *
   * @returns {Element} HTML element containing the parsed markdown
   */
  getAssistantMessage() {
    if (this.message == this.#lastMessage) {
      return this.#lastMessageElement;
    }
    let messageElement = this.ownerDocument.createElement("div");
    messageElement.className = "message-" + this.role;
    if (!this.message) {
      return messageElement;
    }

    this.parseMarkdown(this.message, messageElement);

    this.#lastMessage = this.message;
    this.#lastMessageElement = messageElement;

    return messageElement;
  }

  getUserMessage() {
    const messageElement = this.ownerDocument.createElement("div");
    messageElement.className = "message-" + this.role;

    if (!this.message) {
      return messageElement;
    }

    this.parseUserMarkdown(this.message, messageElement);

    return messageElement;
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/ai-chat-message.css"
      />

      <article>
        ${this.role === "user"
          ? this.getUserMessage()
          : this.getAssistantMessage()}
        ${this.role === "assistant"
          ? html`${this.searchTokens.map(
              token =>
                html`<ai-chat-search-button
                  .query=${token}
                  .label=${token}
                ></ai-chat-search-button>`
            )}`
          : null}
      </article>
    `;
  }
}

customElements.define("ai-chat-message", AIChatMessage);
