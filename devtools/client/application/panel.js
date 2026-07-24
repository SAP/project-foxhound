/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * DevTools panel responsible for the application tool, which lists and allows to debug
 * service workers.
 */
class ApplicationPanel {
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
    await this.panelWin.Application.bootstrap({
      toolbox: this.toolbox,
      commands: this.commands,
      panel: this,
    });

    return this;
  }

  destroy() {
    this.panelWin.Application.destroy();
    this.panelWin = null;
    this.toolbox = null;
    this.emit("destroyed");
  }

  /**
   * Called by toolbox.js on `Esc` keydown to check if the application panel
   * should prevent the split console from being toggled.
   *
   * @returns {boolean} true if the split console toggle should be prevented.
   */
  shouldPreventSplitConsoleToggle() {
    // If a popover is displayed, hide it and prevent the split console from
    // being toggled.
    const popoverEl = this.panelWin.document.querySelector(":popover-open");
    if (popoverEl) {
      popoverEl.hidePopover();
      return true;
    }

    return false;
  }
}

exports.ApplicationPanel = ApplicationPanel;
