/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const XHTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * Set the tooltip content of a provided HTMLTooltip instance to display an
 * attribute preview matching the provided text.
 *
 * @param  {HTMLTooltip} tooltip
 *         The tooltip instance on which the text preview content should be set.
 * @param  {Document} doc
 *         A document to create the HTML elements needed for the tooltip.
 * @param  {object} params
 * @param  {string} params.text
 *         Text to display in the tooltip (e.g. "42" or `"data-my-attribute is not defined"`).
 */
function setAttrTooltip(tooltip, doc, { text }) {
  // Create tooltip content
  const div = doc.createElementNS(XHTML_NS, "div");
  div.classList.add("devtools-monospace", "devtools-tooltip-css-attr");
  div.append(doc.createTextNode(text));

  tooltip.panel.replaceChildren(div);
  tooltip.setContentSize({ width: "auto", height: "auto" });
}

module.exports.setAttrTooltip = setAttrTooltip;
