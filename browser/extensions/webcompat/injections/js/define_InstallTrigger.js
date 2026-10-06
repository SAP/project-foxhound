/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (!window.InstallTrigger) {
  window.InstallTrigger =
    "This property has been shimmed for Web Compatibility reasons.";
  window.__webcompat = (window.__webcompat ?? new Set()).add("InstallTrigger");
}
