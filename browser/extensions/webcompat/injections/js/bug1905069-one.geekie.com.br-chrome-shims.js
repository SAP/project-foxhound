/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1905069 - UA spoof for one.geekie.com.br
 *
 * This site is checking for window.chrome and navigator.vendor, so let's spoof those.
 */

if (!window.chrome) {
  console.info(
    "window.chrome and navigator.vendor have been shimmed for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=1905069 for details."
  );

  window.chrome = {};

  const nav = Object.getPrototypeOf(navigator);
  const vendor = Object.getOwnPropertyDescriptor(nav, "vendor");
  vendor.get = () => "Google Inc.";
  Object.defineProperty(nav, "vendor", vendor);
}
