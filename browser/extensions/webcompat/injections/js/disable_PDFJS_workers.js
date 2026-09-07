/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (!window.PDFJS) {
  let globals = {};

  Object.defineProperty(window, "PDFJS", {
    configurable: true,

    get() {
      return globals;
    },

    set(value = {}) {
      globals = value;
      globals.disableWorker = true;
    },
  });

  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "window.PDFJS.disableWorker"
  );
}
