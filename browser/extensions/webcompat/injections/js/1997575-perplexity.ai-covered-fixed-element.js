/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1997575 - Perplexity toolbar hides behind the keyboard
 *
 * Dynamic toolbar in Firefox for Android is covering the input field in Perplexity.
 */

if (!window.__firefoxWebCompatFixBug1756970) {
  Object.defineProperty(window, "__firefoxWebCompatFixBug1756970", {
    configurable: false,
    value: true,
  });

  console.info(
    "interactive-widget is being applied for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=1997575 for details."
  );

  document.addEventListener("DOMContentLoaded", () => {
    let metaViewport = document.querySelector("meta[name=viewport]");
    if (!metaViewport) {
      return;
    }
    let content = metaViewport.content;
    if (!content.includes("interactive-widget")) {
      metaViewport.setAttribute(
        "content",
        content + ",interactive-widget=resizes-content"
      );
    }
  });
}
