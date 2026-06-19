/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global Sanitizer */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import {
  parseMarkdown,
  CHAT_WRAPPER_ELEMENTS,
} from "chrome://browser/content/aiwindow/modules/ChatMarkdownParser.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/aiwindow/components/ai-chat-table.mjs";

/**
 * A custom element for rendering a single chat message, either a user message or an
 * assistant message. It handles the markdown rendering and any custom link handling.
 */
export class AIChatMessage extends MozLitElement {
  #lastMessage = null;
  #lastMessageElement = "";

  /**
   * Track if link unfurling needs to re-run, as it needs to manually manipulate
   * the rendered element.
   *
   * @param {boolean}
   */
  #unfurledUrlsNeedUpdating = true;

  /**
   * Track which unseen URLs are in the message to avoid unnecessary re-renders when the
   * seen URLs change.
   *
   * @type {Set<string>}
   */
  #urlsUnfurledInMessage = new Set();

  static properties = {
    role: { type: String }, // "user" | "assistant"
    message: { type: String },
    messageId: { type: String, reflect: true, attribute: "data-message-id" },
    complete: { type: Boolean },
    seenUrls: { type: Object, attribute: false },
    conversationId: { type: String },
  };

  constructor() {
    super();

    /**
     * The URLs seen in the conversation, used for link unfurling.
     *
     * @type {Set<string>}
     */
    this.seenUrls = new Set();

    /**
     * Invalidate the unfurled URL rendering when the conversation ID changes.
     *
     * @type {string}
     */
    this.conversationId = "";
  }

  connectedCallback() {
    super.connectedCallback();
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
              detail: {
                url: target.href,
                shiftKey: event.shiftKey,
                metaKey: event.metaKey,
                ctrlKey: event.ctrlKey,
                altKey: event.altKey,
                button: event.button,
              },
            })
          );
          return;
        }
        target = target.parentElement;
      }
    });
  }

  /**
   * Link unfurling for unseen URLs may need to re-run.
   *
   * @param {Map} changed
   */
  willUpdate(changed) {
    if (
      changed.has("seenUrls") &&
      this.#urlsUnfurledInMessage.intersection(this.seenUrls).size
    ) {
      // A link that was unfurled is now in the "seen" set of URLs and needs updating.
      // The "seen" set of URLs can only grow, never shrink.
      this.#unfurledUrlsNeedUpdating = true;
    }

    if (changed.has("conversationId")) {
      // The conversation changed. The unfurled URLs need to be recomputed as the seen
      // urls can be completely different.
      this.#unfurledUrlsNeedUpdating = true;
    }
  }

  updated(changed) {
    if (changed.has("complete") && this.complete && this.role === "assistant") {
      const messageEl = this.shadowRoot?.querySelector(`.message-${this.role}`);
      const text = messageEl
        ? (messageEl.innerText || messageEl.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
        : "";
      this.dispatchEvent(
        new CustomEvent("ai-chat-message:complete", {
          bubbles: true,
          composed: true,
          detail: { messageId: this.messageId, text },
        })
      );
    }
  }

  #getIconSrc = linkHref => {
    // Since we use the "page-icon:" CSP rule we can just look at the page URL for the img src
    const finalIcon = linkHref
      ? `page-icon:${linkHref}`
      : "chrome://global/skin/icons/defaultFavicon.svg";
    return finalIcon;
  };

  /**
   * Replaces "website mention" markdown links rendered as anchors with an
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

  static #SETTINGS_URL = new URL("about:preferences");
  static #SETTINGS_ALIAS_URL = new URL("about:settings");

  /**
   * Returns true if the parsed URL points to the browser settings page.
   * Matches both about:preferences and its about:settings alias,
   *
   * @param {URL} parsed - A parsed URL object
   * @returns {boolean}
   */
  #isSettingsURL(parsed) {
    if (!parsed) {
      return false;
    }
    return (
      parsed.protocol === AIChatMessage.#SETTINGS_URL.protocol &&
      (parsed.pathname === AIChatMessage.#SETTINGS_URL.pathname ||
        parsed.pathname === AIChatMessage.#SETTINGS_ALIAS_URL.pathname)
    );
  }

  /**
   * This functions handles unfurling links that have not been seen by the conversation.
   * Language models can hallucinate URLs and can be forced by untrusted content to
   * generate URLs. We unfurl these unseen links so that the user has a disclosure as
   * to the contents of the links. Unseen link text is no longer clickable (but dash
   * underlined) while the link is fully displayed as an underlined and clickable link
   * surrounded by parentheses. If the text is just a raw link, then the unfurling is
   * skipped.
   *
   * @param {Element} root - The element containing rendered markdown
   */
  #unfurlUnseenLinks(root) {
    this.#urlsUnfurledInMessage = new Set();

    // Go through each link in the rendered markdown. It's important to do this after
    // the markdown library renders the links, so we don't have to manually extract
    // the links from the text. If we did this, then there may be a disagreement between
    // what is considered a link by the library and what we think is a link.
    for (const anchor of root.querySelectorAll("a[href]")) {
      const parsed = URL.parse(anchor.href);

      // Settings pages are always trusted
      if (this.#isSettingsURL(parsed)) {
        continue;
      }

      // Disallowed scheme, strip href to prevent navigation.
      if (
        !parsed ||
        (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      ) {
        anchor.removeAttribute("href");
        continue;
      }

      if (!this.seenUrls.has(anchor.href)) {
        // Track every URL present in the message.
        this.#urlsUnfurledInMessage.add(anchor.href);

        const { textContent, href } = anchor;
        const textUrl = URL.parse(textContent.trim());
        if (textUrl) {
          // This is just a raw URL, no disclosure is needed.
          continue;
        }

        const doc = anchor.ownerDocument;

        const label = doc.createElement("span");
        label.className = "untrusted-link-label";
        label.textContent = textContent;

        const link = doc.createElement("a");
        link.href = href;
        link.textContent = href;

        const disclosure = doc.createElement("span");
        disclosure.append(" (", link, ")");

        anchor.replaceWith(label, disclosure);
      }
    }
  }

  /**
   * Custom sanitizer for chat messages.
   *
   * @type {Sanitizer}
   */
  static #chatMessageSanitizer;
  static {
    this.#chatMessageSanitizer = new Sanitizer();
    for (const element of Object.values(CHAT_WRAPPER_ELEMENTS)) {
      this.#chatMessageSanitizer.allowElement(element);
    }
  }

  /**
   * Parse markdown content to HTML.
   *
   * @param {string} markdown the Markdown to parse
   * @param {Element} element the element in which to insert the parsed markdown.
   */
  #parseMarkdown(markdown, element) {
    element.setHTML(parseMarkdown(markdown), {
      sanitizer: AIChatMessage.#chatMessageSanitizer,
    });
  }

  /**
   * Parse markdown and replace mentions for user messages
   *
   * @param {string} markdown
   * @param {Element} element
   */
  parseUserMarkdown(markdown, element) {
    this.#parseMarkdown(markdown, element);
    this.#replaceWebsiteMentions(element);
  }

  /**
   * Render the assistant message by parsing parsing the markdown and then manually
   * unfurl any unseen links. This function is memoized based on the message contents
   * and seen links Set to guard against unneccessary re-renders.
   *
   * @returns {HTMLElement}
   */
  getAssistantMessage() {
    if (this.message == this.#lastMessage && !this.#unfurledUrlsNeedUpdating) {
      // The message is the same and the seen URLs haven't changed.
      return this.#lastMessageElement;
    }

    let messageElement = this.ownerDocument.createElement("div");
    messageElement.className = "message-" + this.role;
    if (!this.message) {
      // There is no message to show. Use an empty message element.
      this.#lastMessage = this.message;
      this.#lastMessageElement = messageElement;
      return messageElement;
    }

    // Parse the message into markdown, and unfurl any unseen links.
    this.#parseMarkdown(this.message, messageElement);
    this.#unfurlUnseenLinks(messageElement);

    // Track the properties for memoization.
    this.#lastMessage = this.message;
    this.#lastMessageElement = messageElement;
    this.#unfurledUrlsNeedUpdating = false;

    return messageElement;
  }

  /**
   * Parse the markdown in a user's message. No link unfurling is necessary since
   * the contents don't come from untrusted content. This function is memoized
   * based on the message contents.
   *
   * @returns {HTMLElement}
   */
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
      </article>
    `;
  }
}

customElements.define("ai-chat-message", AIChatMessage);
