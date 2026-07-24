/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1448747 - Neutralize FastClick
 *
 * The patch is applied on sites using FastClick library
 * to make sure `FastClick.notNeeded` returns `true`.
 * This allows to disable FastClick and fix various breakage caused
 * by the library (mainly non-functioning drop-down lists).
 */

if (!window.__firefoxWebCompatFixFastclick) {
  Object.defineProperty(window, "__firefoxWebCompatFixFastclick", {
    configurable: false,
    value: true,
  });

  console.info(
    "FastClick is being disabled for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=1448747 for details."
  );

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
}
