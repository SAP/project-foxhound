/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 2034355 - Page appears blank, like it hasn't loaded
 *
 * Something about their Firefox-specific code is not working,
 * but luckily we can call their onresize function on load to
 * show the content, which behaves simliarly to their Chrome code.
 */

console.info(
  "onresize is being called for compatibility reasons. See https://bugzil.la/2034355 for details."
);

window.addEventListener("load", () => {
  let tries = 100;
  const fn = () => {
    if (!--tries || document.body.clientHeight) {
      return;
    }
    try {
      onresize();
    } catch (_) {}
    setTimeout(fn, 50);
  };
  fn();
});
