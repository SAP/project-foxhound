/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

{
  const alertsToHide = "param:alertsToHide";
  const { alert } = window;
  window.alert = function (msg) {
    const lc = msg?.toLowerCase?.();
    if (lc) {
      for (const alertToHide of alertsToHide) {
        if (lc.includes(alertToHide)) {
          return;
        }
      }
    }
    alert(msg);
  };
}
