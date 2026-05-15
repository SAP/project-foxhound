/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 2011862 - ZenPilot Copilot chatbot does not appear on web.tax1099.com on Firefox.
 *
 * The chatbot frame expects MozAppearance to be defined on Firefox, otherwise it does not appear.
 */

if (
  !(window.CSSStyleProperties ?? window.CSS2Properties).prototype.MozAppearance
) {
  console.info(
    "style.MozAppearance is being shimmed for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=2011862 for details."
  );

  const proto = (window.CSSStyleProperties ?? window.CSS2Properties).prototype;
  Object.defineProperty(proto, "MozAppearance", {
    configurable: true,
    enumerable: true,
    get: () => "",
    set() {},
  });
}
