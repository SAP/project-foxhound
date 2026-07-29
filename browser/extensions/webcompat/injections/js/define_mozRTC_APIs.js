/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (!window.mozRTCPeerConnection) {
  window.mozRTCPeerConnection = window.RTCPeerConnection;
  window.mozRTCSessionDescription = window.RTCSessionDescription;
  window.mozRTCIceCandidate = window.RTCIceCandidate;

  window.__webcompat ??= new Set();
  window.__webcompat.add("mozRTCPeerConnection");
  window.__webcompat.add("mozRTCSessionDescription");
  window.__webcompat.add("mozRTCIceCandidate");
}
