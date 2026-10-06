/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1448747 - Neutralize FastClick
 *
 * This disables FastClick by making `FastClick.notNeeded` return `true`,
 * to fix various breakage on sites like drop-downs not working.
 */

if (
  (function notNeeded() {
    const div = document.createElement("div");
    div.style.touchAction = "auto";
    return div.style.touchAction == "auto";
  })()
) {
  const proto = (window.CSSStyleProperties ?? window.CSS2Properties).prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "touchAction");
  const { get } = descriptor;

  descriptor.get = function () {
    if (new Error().stack?.includes("notNeeded")) {
      return "none";
    }
    return get.call(this);
  };

  Object.defineProperty(proto, "touchAction", descriptor);

  window.__webcompat = (window.__webcompat ?? new Set()).add("FastClick");
}
