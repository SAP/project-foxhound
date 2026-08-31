/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (document.readyState !== "complete") {
  const { prototype } = window.EventTarget;
  const { addEventListener } = prototype;
  prototype.addEventListener = function (type, b, c, d) {
    if (
      this !== window ||
      document.readyState !== "complete" ||
      type?.toLowerCase() !== "load"
    ) {
      return addEventListener.call(this, type, b, c, d);
    }
    console.log("window.addEventListener(load) called too late, so calling", b);
    try {
      b?.call();
    } catch (e) {
      console.error(e);
    }
    return undefined;
  };
  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "late window.addEventListener calls"
  );
}
