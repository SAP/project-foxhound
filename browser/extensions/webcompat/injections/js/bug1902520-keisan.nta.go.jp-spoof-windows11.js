/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (!navigator.userAgent.includes("NT 11.0")) {
  let val;
  Object.defineProperty(window, "OS_TYPE_ETAX", {
    configurable: true,
    get: () => val,
    set: x => {
      val = x;
      x.OTHER_WINDOWS = x.WINDOWS_11;
      x.WINDOWS_10 = x.WINDOWS_11;
    },
  });

  const final_ua = navigator.userAgent.replace("NT 10", "NT 11.0");
  const nav = Object.getPrototypeOf(navigator);
  const ua = Object.getOwnPropertyDescriptor(nav, "userAgent");
  ua.get = () => final_ua;
  Object.defineProperty(nav, "userAgent", ua);
}
