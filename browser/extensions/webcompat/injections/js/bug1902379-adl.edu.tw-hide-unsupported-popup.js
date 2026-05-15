/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1902379 - UA spoof for adl.edu.tw
 *
 * This site is checking for Chrome in navigator.userAgent and vendor, so let's spoof those.
 */

if (!navigator.userAgent.includes("Chrome")) {
  console.info(
    "navigator.userAgent and navigator.platform are being shimmed for compatibility reasons. https://bugzilla.mozilla.org/show_bug.cgi?id=1902379 for details."
  );

  const nav = Object.getPrototypeOf(navigator);
  const userAgent = navigator.userAgent;
  let osSegment = "Windows NT 11.0; Win64; x64";
  if (userAgent.includes("Android")) {
    const androidVer = userAgent.match(/Android [0-9.]+/) || "Android 6.0";
    const device = userAgent.includes("Mobile")
      ? "Nexus 5 Build/MRA58N"
      : "Nexus 7 Build/JSS15Q";
    osSegment = `Linux; ${androidVer}; ${device}`;
  } else if (userAgent.includes("Macintosh")) {
    osSegment = "Macintosh; Intel Mac OS X 10_15_7";
  } else if (userAgent.includes("Linux")) {
    osSegment = "X11; Ubuntu; Linux x86_64";
  }
  const CHROME_UA = `Mozilla/5.0 (${osSegment}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36`;

  const ua = Object.getOwnPropertyDescriptor(nav, "userAgent");
  ua.get = () => CHROME_UA;
  Object.defineProperty(nav, "userAgent", ua);

  const vendor = Object.getOwnPropertyDescriptor(nav, "vendor");
  vendor.get = () => "Google Inc.";
  Object.defineProperty(nav, "vendor", vendor);
}
