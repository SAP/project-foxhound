/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (new WheelEvent("test").type !== "mousewheel") {
  Object.defineProperty(window.WheelEvent.prototype, "type", {
    configurable: true,
    get: () => "mousewheel",
    set: () => {},
  });

  const { prototype } = window.EventTarget;
  const { addEventListener } = prototype;
  prototype.addEventListener = function (type, fn, c, d) {
    if (type === "mousewheel") {
      type = "wheel";
    }
    return addEventListener.call(this, type, fn, c, d);
  };

  window.__webcompat ??= new Set();
  window.__webcompat.add("WheelEvent");
  window.__webcompat.add("addEventListener");
}
