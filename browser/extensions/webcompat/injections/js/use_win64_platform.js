/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (navigator.platform != "Win64") {
  const nav = Object.getPrototypeOf(navigator);
  const platform = Object.getOwnPropertyDescriptor(nav, "platform");
  platform.get = () => "Win64";
  Object.defineProperty(nav, "platform", platform);

  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "navigator.platform"
  );
}
