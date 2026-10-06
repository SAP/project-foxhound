/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (!navigator.userAgentData) {
  const { appVersion, userAgent } = navigator;

  let actualPlatform = "linux";
  if (appVersion.includes("Android")) {
    actualPlatform = "android";
  } else if (appVersion.includes("Macintosh")) {
    actualPlatform = "mac";
  } else if (appVersion.includes("Windows")) {
    actualPlatform = "windows";
  }

  const mobile = actualPlatform == "android";

  let version;
  if (userAgent.includes("Chrome")) {
    version = userAgent.match(/Chrome\/([0-9]+)/)[1];
  } else {
    version = (userAgent.match(/Firefox\/([0-9.]+)/) || ["", "58.0"])[1];
  }

  const wantedPlatform = window.__webcompat_spoof_platform ?? actualPlatform;

  // Very roughly matches Chromium's GetPlatformForUAMetadata()
  let platform = "Linux";
  let platformVersion = "";
  if (wantedPlatform == "android") {
    platform = "Android";
    platformVersion = "16.0.0";
  } else if (wantedPlatform.startsWith("windows")) {
    platform = "Windows";
    platformVersion = "19.0.0";
  } else if (wantedPlatform == "mac") {
    platform = "macOS";
    platformVersion = "26.0.0";
  }

  // These match Chrome's output as of version 146.
  const brands = [
    {
      brand: "Not-A.Brand",
      version: "24",
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
    mobile,
    platform,
    getHighEntropyValues() {
      return Promise.resolve({
        brands,
        mobile,
        platform,
        platformVersion,
      });
    },
  };

  Object.defineProperty(Object.getPrototypeOf(navigator), "userAgentData", {
    get: () => userAgentData,
    set: () => {},
  });

  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "navigator.userAgentData"
  );
}
