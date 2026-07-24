/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1724868 - news.yahoo.co.jp - Override UA on Android and Linux
 * WebCompat issue #82605 - https://webcompat.com/issues/82605
 *
 * Yahoo Japan news doesn't allow playing video in Firefox on Android or Linux
 * as those are not in their support matrix. They check UA override twice
 * and display different UI with the same error. Changing the UA to Chrome via
 * content script allows playing the videos.
 */

if (!navigator.userAgent.includes("Chrome")) {
  console.info(
    "The user agent has been overridden for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=1724868 for details."
  );

  const nav = Object.getPrototypeOf(navigator);

  const version = "143.0.0.0";
  const userAgent = navigator.userAgent;
  let osSegment = "Windows NT 11.0; Win64; x64";
  if (userAgent.includes("Android")) {
    const androidVer = userAgent.match(/Android [0-9.]+/) || "Android 6.0";
    const device = userAgent.includes("Mobile")
      ? "Nexus 5 Build/MRA58N"
      : "Nexus 7 Build/JSS15Q";
    osSegment = `Linux; ${androidVer}; ${device}`;
  } else {
    // Linux
    const brands = [
      {
        brand: "Not/A)Brand",
        version: "8",
      },
      {
        brand: "Chromium",
        version,
      },
      {
        brand: "Google Chrome",
        version,
      },
    ];

    const userAgentData = {
      brands,
      mobile: false,
      platform: "Windows",
      getHighEntropyValues() {
        return Promise.resolve({
          brands,
          mobile: false,
          platform: "Windows",
        });
      },
    };

    Object.defineProperty(nav, "userAgentData", {
      get: () => userAgentData,
      set: () => {},
    });
  }
  const CHROME_UA = `Mozilla/5.0 (${osSegment}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;

  const ua = Object.getOwnPropertyDescriptor(nav, "userAgent");
  ua.get = () => CHROME_UA;
  Object.defineProperty(nav, "userAgent", ua);
}
