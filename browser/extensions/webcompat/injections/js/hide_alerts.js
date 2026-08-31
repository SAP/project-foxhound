/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals browser, exportFunction */

"use strict";

if (typeof browser === "undefined") {
  window.alert = __webcompat_alert => {
    window.postMessage({ __webcompat_alert }, location.origin);
  };
} else {
  window.hide_alerts_status = { blocked: [], allowed: [] };

  const pendingEarlyAlerts = [];
  let connected = false;
  let alertsToHide;

  const maybeAlert = msg => {
    const lc = msg?.toLowerCase?.();
    if (lc) {
      for (const alertToHide of alertsToHide) {
        if (lc.includes(alertToHide)) {
          window.hide_alerts_status.blocked.push(lc);
          return;
        }
        window.hide_alerts_status.allowed.push(lc);
      }
    }
    alert(msg);
  };

  window.addEventListener(
    "message",
    ({ data: { __webcompat_alert }, origin }) => {
      if (!__webcompat_alert || origin !== location.origin) {
        return;
      }
      if (connected) {
        maybeAlert(__webcompat_alert);
      } else {
        pendingEarlyAlerts.push(__webcompat_alert);
      }
    }
  );

  window.metadata ??= new Promise(resolve => {
    const port = browser.runtime.connect();
    port.onMessage.addListener(metadata => {
      resolve(metadata);
    });
  });

  window.metadata.then(metadata => {
    alertsToHide = metadata.alertsToHide;
    connected = true;
    pendingEarlyAlerts.forEach(maybeAlert);
  });
}
