/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1815733 - Annoying "Paste" overlay when trying to paste
 *
 * As per https://bugzilla.mozilla.org/show_bug.cgi?id=1815733#c13, Outlook
 * is calling clipboard.read() again when they shouldn't. This is causing a
 * visible "Paste" prompt for the user, which is stealing focus and can be
 * annoying.
 */

if (!window.__firefoxWebCompatFixBug1815733) {
  Object.defineProperty(window, "__firefoxWebCompatFixBug1815733", {
    configurable: false,
    value: true,
  });

  console.info(
    "navigator.clipboard.read() has been overridden with a no-op. See https://bugzilla.mozilla.org/show_bug.cgi?id=1815733#c13 for details."
  );

  Object.defineProperty(navigator.clipboard, "read", {
    configurable: true,
    value() {
      return Promise.resolve();
    },
  });
}
