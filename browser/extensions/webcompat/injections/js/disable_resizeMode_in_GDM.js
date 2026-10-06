/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

if (navigator.mediaDevices?.getDisplayMedia) {
  const maybeDeleteResizeMode = video => {
    const { resizeMode, width, height, frameRate } = video;
    if (resizeMode == "none" && (width || height || frameRate)) {
      delete video.resizeMode;
    }
  };

  {
    const { prototype } = MediaDevices;
    const { getDisplayMedia: gDM } = prototype;
    prototype.getDisplayMedia = function getDisplayMedia(options) {
      const { video } = options || {};
      if (video) {
        maybeDeleteResizeMode(video);
      }
      return gDM.call(this, options);
    };
  }

  {
    const { prototype } = MediaStreamTrack;
    const { applyConstraints: aC } = prototype;
    prototype.applyConstraints = function applyConstraints(constraints) {
      // Don't allow adding resizeMode if it wasn't there from the start.
      // Ideally we'd check for a gDM-sourced track instead but there's no
      // spec-compliant way to do that.
      if (!this.getConstraints().resizeMode) {
        maybeDeleteResizeMode(constraints || {});
      }
      return aC.call(this, constraints);
    };
  }

  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "getDisplayMedia resizeMode"
  );
}
