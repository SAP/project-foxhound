/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (!navigator.userAgent.includes("SAMSUNG")) {
  const newUA = navigator.userAgent + " SAMSUNG";
  const nav = Object.getPrototypeOf(navigator);
  const ua = Object.getOwnPropertyDescriptor(nav, "userAgent");
  ua.get = () => newUA;
  Object.defineProperty(nav, "userAgent", ua);

  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "navigator.userAgent"
  );
}
