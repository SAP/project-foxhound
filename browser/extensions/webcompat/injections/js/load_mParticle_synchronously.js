/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1919263 - nbcsports.com videos and photos are not displayed
 *
 * The site loads a script, mparticle.js, using a script tag with async=true,
 * but this can cause it to load too late for other scripts on the page. We
 * can prevent this by changing async to false when they try to load mparticle.js.
 */

if (
  (function () {
    const s = document.createElement("script");
    s.async = true;
    s.src = "mparticle.js";
    return s.async;
  })()
) {
  const { prototype } = HTMLScriptElement;
  const desc = Object.getOwnPropertyDescriptor(prototype, "src");
  const origSet = desc.set;
  desc.set = function (url) {
    if (url?.includes("mparticle.js")) {
      this.async = false;
    }
    return origSet.call(this, url);
  };
  Object.defineProperty(prototype, "src", desc);
  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "mparticle.js loading"
  );
}
