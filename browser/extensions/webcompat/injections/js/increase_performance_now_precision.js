/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (
  (function () {
    return [performance.now(), performance.now()][1].toString().includes(".");
  })()
) {
  let counter = 0;
  let previousVal = 0;

  const perf = Object.getPrototypeOf(performance);
  const now = perf.now;
  perf.now = function () {
    let originalVal = now.call(this);
    if (originalVal === previousVal) {
      originalVal += 0.00000003 * ++counter;
    } else {
      previousVal = originalVal;
      counter = 0;
    }
    return originalVal;
  };

  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "performance.now precision"
  );
}
