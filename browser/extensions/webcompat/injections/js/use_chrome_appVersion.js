/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (
  navigator.userAgent.startsWith("Mozilla/5.0 (") &&
  navigator.appVersion != navigator.userAgent.replace("Mozilla/", "")
) {
  const nav = Object.getPrototypeOf(navigator);
  const ver = navigator.userAgent.replace("Mozilla/", "");
  const desc = Object.getOwnPropertyDescriptor(nav, "appVersion");
  desc.get = () => ver;
  Object.defineProperty(nav, "appVersion", desc);
  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "navigator.appVersion"
  );
}
