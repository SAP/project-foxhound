/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (!window.chrome) {
  const generateTimeStamp = function (base, factor = 10) {
    if (base) {
      // increase another timestamp by a little
      return (base + Math.random() * factor).toString().substr(0, 14);
    }
    const r = Math.random().toString();
    const d10 = `1${r.substr(5, 9)}`;
    const d3 = r.substr(2, 3);
    return parseFloat(`${d10}.${d3}`);
  };

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

  window.__webcompat = (window.__webcompat ?? new Set()).add("window.chrome");
}
