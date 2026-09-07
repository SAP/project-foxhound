/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Object.defineProperty(navigator.clipboard, "read", {
  configurable: true,
  value() {
    return Promise.resolve();
  },
});

window.__webcompat = (window.__webcompat ?? new Set()).add(
  "navigator.clipboard.read"
);
