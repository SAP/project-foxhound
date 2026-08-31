/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1902507 - add to SDP a=ssrc lines with msid.
 *
 * riverside.com appears to explicitly fail its send() function if
 * it doesn't find msid in the a=ssrc line in the local description SDP.
 */

if (!window.__firefoxWebCompatFix2Bug1902507) {
  Object.defineProperty(window, "__firefoxWebCompatFix2Bug1902507", {
    configurable: false,
    value: true,
  });
  console.info(
    "createOffer/Answer() and local/remoteDescription is being shimmed for compatibility reasons. See https://bugzil.la/1902507 for details."
  );

  function addSsrcMsidLines(sdp) {
    if (typeof sdp != "string" || !sdp.length) {
      return sdp;
    }

    // Work per m= section so we use the correct a=msid for that section.
    const parts = sdp.split(/(\r\nm=)/);
    if (parts.length == 1) {
      return sdp;
    }

    let out = parts[0];
    for (let i = 1; i < parts.length; i += 2) {
      let section = parts[i] + parts[i + 1]; // includes the leading "\r\nm="

      const msidMatch = section.match(/(?:^|\r\n)a=msid:([^\r\n]+)/);
      if (!msidMatch) {
        out += section;
        continue;
      }

      const msidValue = msidMatch[1];

      // After every "a=ssrc:<id> cname:..." line, insert a matching
      // "a=ssrc:<id> msid:<msidValue>" line *iff* that msid line isn't already next.
      section = section.replace(
        /(^|\r\n)(a=ssrc:(\d+) cname:[^\r\n]+)(?!\r\na=ssrc:\3 msid:)/g,
        (m, prefix, cnameLine, ssrcId) =>
          `${prefix}${cnameLine}\r\na=ssrc:${ssrcId} msid:${msidValue}`
      );

      out += section;
    }

    return out;
  }

  const nativeCreateOffer = window.RTCPeerConnection.prototype.createOffer;
  window.RTCPeerConnection.prototype.createOffer =
    async function createOffer() {
      const description = await nativeCreateOffer.apply(this, arguments);

      if (description && typeof description.sdp == "string") {
        description.sdp = addSsrcMsidLines(description.sdp);
      }

      return description;
    };

  const nativeCreateAnswer = window.RTCPeerConnection.prototype.createAnswer;
  window.RTCPeerConnection.prototype.createAnswer =
    async function createAnswer() {
      const description = await nativeCreateAnswer.apply(this, arguments);

      if (description && typeof description.sdp == "string") {
        description.sdp = addSsrcMsidLines(description.sdp);
      }

      return description;
    };

  // Patch localDescription/remoteDescription getters too, since sites sometimes read SDP from there.
  const nativeLocalDescription = Object.getOwnPropertyDescriptor(
    window.RTCPeerConnection.prototype,
    "localDescription"
  );
  const nativeRemoteDescription = Object.getOwnPropertyDescriptor(
    window.RTCPeerConnection.prototype,
    "remoteDescription"
  );

  if (
    nativeLocalDescription &&
    typeof nativeLocalDescription.get == "function"
  ) {
    Object.defineProperty(
      window.RTCPeerConnection.prototype,
      "localDescription",
      {
        configurable: true,
        enumerable: nativeLocalDescription.enumerable,
        get() {
          const desc = nativeLocalDescription.get.call(this);
          if (desc && typeof desc.sdp == "string") {
            // Avoid mutating the native object: return a new RTCSessionDescription-ish object.
            return { type: desc.type, sdp: addSsrcMsidLines(desc.sdp) };
          }
          return desc;
        },
      }
    );
  }

  if (
    nativeRemoteDescription &&
    typeof nativeRemoteDescription.get == "function"
  ) {
    Object.defineProperty(
      window.RTCPeerConnection.prototype,
      "remoteDescription",
      {
        configurable: true,
        enumerable: nativeRemoteDescription.enumerable,
        get() {
          const desc = nativeRemoteDescription.get.call(this);
          if (desc && typeof desc.sdp == "string") {
            return { type: desc.type, sdp: addSsrcMsidLines(desc.sdp) };
          }
          return desc;
        },
      }
    );
  }
}
