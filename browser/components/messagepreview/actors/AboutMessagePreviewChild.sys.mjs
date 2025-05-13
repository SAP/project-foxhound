/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export class AboutMessagePreviewChild extends JSWindowActorChild {
  handleEvent(event) {
    console.log(`Received page event ${event.type}`);
  }

  actorCreated() {
    this.exportFunctions();
  }

  exportFunctions() {
    if (this.contentWindow) {
      for (const name of [
        "MPShowMessage",
        "MPIsEnabled",
        "MPShouldShowHint",
        "MPToggleLights",
      ]) {
        Cu.exportFunction(this[name].bind(this), this.contentWindow, {
          defineAs: name,
        });
      }
    }
  }

  /**
   * Check if the Message Preview feature is enabled. This reflects the value of
   * the pref `browser.newtabpage.activity-stream.asrouter.devtoolsEnabled`.
   *
   * @returns {boolean}
   */
  MPIsEnabled() {
    return Services.prefs.getBoolPref(
      "browser.newtabpage.activity-stream.asrouter.devtoolsEnabled",
      false
    );
  }

  /**
   * Check the browser theme and switch it.
   */
  MPToggleLights() {
    const isDark = this.contentWindow.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    this.sendAsyncMessage(`MessagePreview:CHANGE_THEME`, { isDark });
  }

  /**
   * Route a message to the parent process to be displayed with the relevant
   * messaging surface.
   *
   * @param {object} message
   */
  MPShowMessage(message) {
    this.sendAsyncMessage(`MessagePreview:SHOW_MESSAGE`, message);
  }

  /**
   * Check if a hint should be shown about how to enable Message Preview.
   *
   * @returns {boolean}
   */
  MPShouldShowHint() {
    return !this.MPIsEnabled();
  }
}
