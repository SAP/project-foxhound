/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (navigator.vendor != "Google Inc.") {
  const nav = Object.getPrototypeOf(navigator);
  const vendor = Object.getOwnPropertyDescriptor(nav, "vendor");
  vendor.get = () => "Google Inc.";
  Object.defineProperty(nav, "vendor", vendor);

  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "navigator.vendor"
  );
}
