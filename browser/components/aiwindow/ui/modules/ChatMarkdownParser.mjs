/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Markdown parser for Smart Window chat messages.
 */

import { MarkdownIt } from "chrome://browser/content/multilineeditor/prosemirror.bundle.mjs";

export const CHAT_WRAPPER_ELEMENTS = {
  table: {
    element: "ai-chat-table",
    attributes: ["message-id", "data-line-range"],
  },
};

// Create with default preset for markdown parsing similar to GFM. Among other
// things this enables us to render tables.
const md = MarkdownIt("default", { html: false });

// Add element wrapper rules.
for (const [element, { element: wrapper }] of Object.entries(
  CHAT_WRAPPER_ELEMENTS
)) {
  md.renderer.rules[`${element}_open`] = (
    tokens,
    index,
    options,
    _env,
    renderer
  ) => {
    const dataAttributes = new Map();
    if (element === "table") {
      const { map } = tokens[index];
      if (map) {
        dataAttributes.set("data-line-range", JSON.stringify(map));
      }
    }
    const attributesString = [...dataAttributes]
      .map(([key, value]) => `${key}="${md.utils.escapeHtml(value)}"`)
      .join(" ");
    return `<${wrapper}${attributesString ? ` ${attributesString}` : ""}>${renderer.renderToken(tokens, index, options)}`;
  };
  md.renderer.rules[`${element}_close`] = (
    tokens,
    index,
    options,
    _env,
    renderer
  ) => `${renderer.renderToken(tokens, index, options)}</${wrapper}>`;
}

/**
 * Parse markdown to HTML.
 *
 * @param {string} markdown - The markdown string to parse
 * @returns {string} HTML string
 */
export function parseMarkdown(markdown) {
  return md.render(markdown);
}
