/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1950282 - UA spoof for f1tv.formula1.com
 *
 * This site is deliberately blocking Firefox, possibly due to bug 1992579.
 */

if (!window.chrome) {
  console.info(
    "The window environment is being altered for compatibility reasons. If you're a web developer working on this site, please get in touch with developer-outreach@mozilla.com. See https://bugzilla.mozilla.org/show_bug.cgi?id=1950282 for details."
  );

  delete window.InstallTrigger;
  delete window.mozInnerScreenX;
  delete window.mozInnerScreenY;
  delete window.MozConsentBanner;

  const nav = Object.getPrototypeOf(navigator);
  const vendor = Object.getOwnPropertyDescriptor(nav, "vendor");
  vendor.get = () => "Google Inc.";
  Object.defineProperty(nav, "vendor", vendor);

  const supports = Object.getOwnPropertyDescriptor(CSS, "supports");
  const oldSupports = supports.value;
  supports.value = function (query) {
    if (query.includes("moz-")) {
      return false;
    }
    return oldSupports.call(this, query);
  };
  Object.defineProperty(CSS, "supports", supports);

  function generateTimeStamp(base, factor = 10) {
    if (base) {
      // increase another timestamp by a little
      return (base + Math.random() * factor).toString().substr(0, 14);
    }
    const r = Math.random().toString();
    const d10 = `1${r.substr(5, 9)}`;
    const d3 = r.substr(2, 3);
    return parseFloat(`${d10}.${d3}`);
  }

  const startLoadTime = generateTimeStamp();
  const commitLoadTime = generateTimeStamp(startLoadTime);
  const firstPaintTime = generateTimeStamp(commitLoadTime);
  const finishDocumentLoadTime = generateTimeStamp(firstPaintTime);
  const finishLoadTime = generateTimeStamp(finishDocumentLoadTime);

  const csi = {
    onloadT: parseInt(finishDocumentLoadTime * 100),
    pageT: generateTimeStamp().toString().substr(-11),
    startE: parseInt(parseFloat(startLoadTime * 100)),
    tran: 10 + parseInt(4 + Math.random() * 4),
  };

  const loadTimes = {
    commitLoadTime,
    connectionInfo: "h3",
    finishDocumentLoadTime,
    finishLoadTime,
    firstPaintAfterLoadTime: 0,
    firstPaintTime,
    navigationType: "Other",
    npnNegotiatedProtocol: "h3",
    requestTime: startLoadTime,
    startLoadTime,
    wasAlternateProtocolAvailable: false,
    wasFetchedViaSpdy: true,
    wasNpnNegotiated: true,
  };

  window.chrome = {
    app: {
      InstallState: {
        DISABLED: "disabled",
        INSTALLED: "installed",
        NOT_INSTALLED: "not_installed",
      },
      RunningState: {
        CANNOT_RUN: "cannot_run",
        READY_TO_RUN: "ready_to_run",
        RUNNING: "running",
      },
      getDetails() {
        return null;
      },
      getIsInstalled() {
        return false;
      },
      installState() {
        return undefined;
      },
      isInstalled: false,
      runningState() {
        return window.chrome.app.InstallState.NOT_INSTALLED;
      },
    },
    csi() {
      return csi;
    },
    loadTimes() {
      return loadTimes;
    },
  };

  const ua = navigator.userAgent;
  const mobile = ua.includes("Android");

  // Very roughly matches Chromium's GetPlatformForUAMetadata()
  let platform = "Linux";
  if (mobile) {
    platform = "Android";
  } else if (navigator.platform.startsWith("Win")) {
    platform = "Windows";
  } else if (navigator.platform.startsWith("Mac")) {
    platform = "macOS";
  }

  const version = ua.match(/Chrome\/([0-9]+)/)[1];

  // These match Chrome's output as of version 126.
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

  // Site checks the high-entropy platformVersion on Windows.
  const userAgentData = {
    brands,
    mobile,
    platform,
    getHighEntropyValues() {
      return Promise.resolve({
        brands,
        mobile,
        platform,
        platformVersion: "19.0.0",
      });
    },
  };

  Object.defineProperty(nav, "userAgentData", {
    get: () => userAgentData,
    set: () => {},
  });
}
