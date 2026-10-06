/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * The IOpenWithLauncher api call protocol shared by the producer
 * (ShellService.setAsDefault{PDF,Protocol}Handler) and the consumer
 * (WindowsSetDefaultAppCmdHandler).
 *
 * ShellService arms a one-shot redirect before launching the OS "Open with"
 * picker via IOpenWithLauncher; once the user picks Firefox, the OS relaunches
 * Firefox with the same value and the command-line handler consumes it. This
 * module owns that shared state (the pref shape and the matching rules).
 */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  FileUtils: "resource://gre/modules/FileUtils.sys.mjs",
});

// This pref is an object { openWithArg, overrideUri, type } consumed by
// WindowsSetDefaultAppCmdHandler when the user picks a default (file type or
// protocol) using the IOpenWithLauncher API. It is reset anytime the dialog is
// used again, or when we intercept the OS reopening one of our openWithArgs.
export const SET_DEFAULT_REDIRECT_PREF =
  "browser.shell.setDefaultApp.pendingRedirect";

export class WindowsSetDefaultRedirect {
  // Supported default types to set using IOpenWithLauncher.
  static TYPE = {
    FILE: 1 << 0,
    PROTOCOL: 1 << 1,
  };

  /**
   * Stash a one-shot redirect for the IOpenWithLauncher call.
   *
   * @param {string} openWithArg
   *   The value handed to launchSetDefaultAppPicker, which the OS hands back as
   *   "-osint -url <openWithArg>" once the user picks a new default. Depending on
   *   type, this is either a file path on the system (file-type defaults) or a
   *   URL (protocol defaults).
   * @param {?string} overrideUri
   *   URI spec to open when openWithArg comes back, or null to consume the relaunch
   *   and open nothing.
   * @param {number} type
   *   One of WindowsSetDefaultRedirect.TYPE, identifying whether openWithArg is a
   *   file path or a URL.
   */
  static arm(openWithArg, overrideUri, type) {
    // Clear any stale object left by an older call.
    Services.prefs.clearUserPref(SET_DEFAULT_REDIRECT_PREF);

    Services.prefs.setStringPref(
      SET_DEFAULT_REDIRECT_PREF,
      JSON.stringify({ openWithArg, overrideUri: overrideUri ?? null, type })
    );
  }

  /**
   * Clear a pending redirect.
   */
  static clear() {
    Services.prefs.clearUserPref(SET_DEFAULT_REDIRECT_PREF);
  }

  /**
   * If `arg` is the openWithArg stashed by the most recent
   * launchSetDefaultAppPicker call, consume the one-shot redirect and return
   * its `{ overrideUri }`, where overrideUri is a URI spec to open or null to
   * just suppress the relaunch. Returns null when `arg` is unrelated to a
   * pending attempt to set a default.
   *
   * @param {string} arg - The -url value the OS handed back.
   * @returns {?{overrideUri: ?string}}
   */
  static consume(arg) {
    const state = this.#read();
    if (!state || !this.#matches(state, arg)) {
      return null;
    }
    Services.prefs.clearUserPref(SET_DEFAULT_REDIRECT_PREF);
    return { overrideUri: state.overrideUri ?? null };
  }

  /**
   * Read and validate the pending redirect stashed by arm().
   *
   * @returns {?{openWithArg: string, overrideUri: ?string, type: number}} The
   * stored state, or null when the pref is unset, holds the wrong type, or is
   * malformed JSON.
   */
  static #read() {
    let raw;
    try {
      raw = Services.prefs.getStringPref(SET_DEFAULT_REDIRECT_PREF, "");
    } catch (e) {
      return null;
    }
    if (!raw) {
      return null;
    }
    try {
      const state = JSON.parse(raw);
      return state && typeof state.openWithArg === "string" ? state : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Checks if the -url value the OS handed back matches the stashed redirect.
   *
   * @param {{openWithArg: string, type: number}} state - The stashed redirect.
   * @param {string} arg - The -url value from the OS relaunch.
   * @returns {boolean}
   */
  static #matches(state, arg) {
    switch (state.type) {
      case this.TYPE.PROTOCOL:
        return state.openWithArg === arg;
      case this.TYPE.FILE:
        try {
          return new lazy.FileUtils.File(state.openWithArg).equals(
            new lazy.FileUtils.File(arg)
          );
        } catch (e) {
          return false;
        }
      default:
        return false;
    }
  }
}
