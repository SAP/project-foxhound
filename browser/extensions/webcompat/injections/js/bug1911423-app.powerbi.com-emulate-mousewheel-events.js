/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1911423 - app.powerbi.com - zooming is broken on maps
 *
 * They listen for non-standard mousewheel events, rather than wheel,
 * which breaks zooming. This emulates mousewheel events for them.
 */

if (!window.__firefoxWebCompatFixBug1911423) {
  Object.defineProperty(window, "__firefoxWebCompatFixBug1911423", {
    configurable: false,
    value: true,
  });

  console.info(
    "Emulating mousewheel events for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=1911423 for details."
  );

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
}
