/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const nodeConstants = require("resource://devtools/shared/dom-node-constants.js");

/**
 * Creates an editor for non-editable nodes.
 */
class ReadOnlyEditor {
  constructor(container, nodeFront) {
    this.container = container;
    this.markup = this.container.markup;
    this.buildMarkup();

    if (nodeFront.nodeType == nodeConstants.DOCUMENT_TYPE_NODE) {
      this.elt.classList.add("comment", "doctype");
      this.tag.textContent = nodeFront.doctypeString;
    } else if (nodeFront.isShadowRoot) {
      this.tag.textContent = `#shadow-root (${nodeFront.shadowRootMode})`;
    } else {
      this.tag.textContent = nodeFront.displayName;
      if (nodeFront.isPseudoElement) {
        this.tag.classList.add("pseudo", "force-color-on-flash");
      }
    }

    // Make the "tag" part of this editor focusable.
    this.tag.setAttribute("tabindex", "-1");
  }
  buildMarkup() {
    const doc = this.markup.doc;

    this.elt = doc.createElement("span");
    this.elt.classList.add("editor");

    this.tag = doc.createElement("span");
    this.tag.classList.add("tag");
    this.elt.appendChild(this.tag);
  }

  destroy() {
    // We might be already destroyed.
    if (!this.elt) {
      return;
    }

    this.elt.remove();
    this.elt = null;
    this.tag = null;
  }

  /**
   * Show overflow highlight if showOverflowHighlight is true, otherwise hide it.
   *
   * @param {boolean} showOverflowHighlight
   */
  setOverflowHighlight(showOverflowHighlight) {
    this.container.tagState.classList.toggle(
      "overflow-causing-highlighted",
      showOverflowHighlight
    );
  }

  /**
   * Stub method for consistency with ElementEditor.
   */
  getInfoAtNode() {
    return null;
  }
}

module.exports = ReadOnlyEditor;
