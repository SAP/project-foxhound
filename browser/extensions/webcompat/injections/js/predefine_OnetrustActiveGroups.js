/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (typeof OnetrustActiveGroups == "undefined") {
  window.OnetrustActiveGroups = {};
  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "window.OnetrustActiveGroups"
  );
}
