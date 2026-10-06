/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

class AntiTrackingPanel {
  /**
   * Constructor.
   *
   * @param {Window} panelWin
   *        The frame/window dedicated to this panel.
   * @param {Toolbox} toolbox
   *        The toolbox instance responsible for this panel.
   * @param {object} commands
   *        The commands object with all interfaces defined from devtools/shared/commands/
   */
  constructor(panelWin, toolbox, commands) {
    this.panelWin = panelWin;
    this.toolbox = toolbox;
    this.commands = commands;
  }

  async open() {
    await this.panelWin.AntiTracking.bootstrap({
      toolbox: this.toolbox,
      commands: this.commands,
      panel: this,
    });

    return this;
  }

  destroy() {
    this.panelWin.AntiTracking.destroy();
    this.panelWin = null;
    this.toolbox = null;
    this.commands = null;
    this.emit("destroyed");
  }
}

exports.AntiTrackingPanel = AntiTrackingPanel;
