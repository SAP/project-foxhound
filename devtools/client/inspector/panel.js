/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  Inspector,
} = require("resource://devtools/client/inspector/inspector.js");

class InspectorPanel {
  constructor(iframeWindow, toolbox, commands) {
    this.#inspector = new Inspector(toolbox, commands, iframeWindow);
  }

  #inspector;

  /**
   * Initialize the inspector
   *
   * @param {object} options: see Inspector.init
   * @returns {Inspector}
   */
  open(options = {}) {
    return this.#inspector.init(options);
  }

  destroy() {
    this.#inspector.destroy();
  }
}
exports.InspectorPanel = InspectorPanel;
