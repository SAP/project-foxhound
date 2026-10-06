/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1902507 - Hide the "frozen" RTCStatsIceCandidatePairState value.
 *
 * riverside.com appears to explicitly fail their WebRTC efforts if
 * they encounter this standard value in stats.
 */

if (!window.__firefoxWebCompatFixBug1902507) {
  Object.defineProperty(window, "__firefoxWebCompatFixBug1902507", {
    configurable: false,
    value: true,
  });
  console.info(
    "getStats() is being shimmed for compatibility reasons. See https://bugzil.la/1902507 for details."
  );

  const nativeGetStats = window.RTCPeerConnection.prototype.getStats;
  window.RTCPeerConnection.prototype.getStats = async function getStats() {
    const stats = await nativeGetStats.apply(this, arguments);
    stats.forEach(stat => {
      if (stat.type == "candidate-pair" && stat.state == "frozen") {
        stat.state = "waiting";
      }
    });
    return stats;
  };
}
