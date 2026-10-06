/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (navigator.userAgent.includes("Firefox")) {
  const ua = navigator.userAgent.replace("Firefox", "Fire_fox");
  const nav = Object.getPrototypeOf(navigator);
  const desc = Object.getOwnPropertyDescriptor(nav, "userAgent");
  desc.get = () => ua;
  Object.defineProperty(nav, "userAgent", desc);

  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "navigator.userAgent"
  );
}
