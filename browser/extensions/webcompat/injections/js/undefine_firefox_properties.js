/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (typeof window.InstallTrigger != "undefined") {
  delete window.InstallTrigger;
}

if (typeof window.MozConsentBanner != "undefined") {
  delete window.MozConsentBanner;
}

if (typeof window.mozInnerScreenX != "undefined") {
  delete window.mozInnerScreenX;
  delete window.mozInnerScreenY;
}

if (CSS?.supports("-moz-appearance", "none")) {
  const supports = Object.getOwnPropertyDescriptor(CSS, "supports");
  const oldSupports = supports.value;
  supports.value = function (query) {
    if (query.includes("moz-")) {
      return false;
    }
    return oldSupports.call(this, query);
  };
  Object.defineProperty(CSS, "supports", supports);
}
