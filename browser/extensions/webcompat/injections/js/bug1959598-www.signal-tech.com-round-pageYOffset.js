/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1959598 - new products do not load in while scrolling at certain zoom values
 *
 * The page's logic seems to rely on integer values being returned by window.pageYOffset.
 */

if (!window.__firefoxWebCompatFixBug1959598) {
  Object.defineProperty(window, "__firefoxWebCompatFixBug1959598", {
    configurable: false,
    value: true,
  });

  const pyo = Object.getOwnPropertyDescriptor(window, "pageYOffset");
  const pyoGet = pyo.get;
  pyo.get = function () {
    return Math.round(pyoGet.call(this));
  };
  Object.defineProperty(window, "pageYOffset", pyo);
}
