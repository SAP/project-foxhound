/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1975651 - User agent override for comic.k-manga.jp
 */

if (!navigator.userAgent.includes("Chrome")) {
  console.info(
    "The user agent and navigator.appVersion have been shimmed for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=1975651 for details."
  );

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

  const appVersion = Object.getOwnPropertyDescriptor(nav, "appVersion");
  appVersion.get = () => CHROME_UA.replace("Mozilla/", "");
  Object.defineProperty(nav, "appVersion", appVersion);
}
