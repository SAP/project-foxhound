/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

{
  const desc = Object.getOwnPropertyDescriptor(window, "pageYOffset");
  const { get } = desc;
  desc.get = function () {
    return Math.round(get.call(this));
  };
  Object.defineProperty(window, "pageYOffset", desc);

  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "window.pageYOffset"
  );
}
