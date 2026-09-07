/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://w3c.github.io/webrtc-pc/#dom-rtcerror
 */

enum RTCErrorDetailType {
  "data-channel-failure",
  "dtls-failure",
  "fingerprint-failure",
  "sctp-failure",
  "sdp-syntax-error",
  "hardware-encoder-not-available",
  "hardware-encoder-error"
};

[Pref="media.peerconnection.enabled",
 Exposed=Window]
interface RTCError : DOMException {
  constructor(RTCErrorInit init, optional UTF8String message = "");
  readonly attribute RTCErrorDetailType errorDetail;
  readonly attribute long? sdpLineNumber;
  readonly attribute long? sctpCauseCode;
  readonly attribute unsigned long? receivedAlert;
  readonly attribute unsigned long? sentAlert;
};

dictionary RTCErrorInit {
  required RTCErrorDetailType errorDetail;
  long sdpLineNumber;
  long sctpCauseCode;
  unsigned long receivedAlert;
  unsigned long sentAlert;
};
