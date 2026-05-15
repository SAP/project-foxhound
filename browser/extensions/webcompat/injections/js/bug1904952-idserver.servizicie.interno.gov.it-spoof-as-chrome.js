/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1904952 - UA spoof for idserver.servizicie.interno.gov.it
 *
 * This site is checking for Chrome in navigator.userAgent, navigatorvendor and window.chrome, so let's spoof those.
 */

if (!window.chrome) {
  console.info(
    "navigator.userAgent, navigator.platform and window.chrome are being shimmed for compatibility reasons. https://bugzilla.mozilla.org/show_bug.cgi?id=1904952 for details."
  );

  window.chrome = {};

  const userAgent = navigator.userAgent;
  const androidVer = userAgent.match(/Android [0-9.]+/) || "Android 6.0";
  const device = userAgent.includes("Mobile")
    ? "Nexus 5 Build/MRA58N"
    : "Nexus 7 Build/JSS15Q";
  const osSegment = `Linux; ${androidVer}; ${device}`;
  const CHROME_UA = `Mozilla/5.0 (${osSegment}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36`;

  const nav = Object.getPrototypeOf(navigator);

  const ua = Object.getOwnPropertyDescriptor(nav, "userAgent");
  ua.get = () => CHROME_UA;
  Object.defineProperty(nav, "userAgent", ua);

  const vendor = Object.getOwnPropertyDescriptor(nav, "vendor");
  vendor.get = () => "Google Inc.";
  Object.defineProperty(nav, "vendor", vendor);
}
