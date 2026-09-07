/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

class PictureInPictureVideoWrapper {
  constructor(video) {
    this.player =
      video.closest("disney-web-player").wrappedJSObject.mediaPlayer;
  }

  setCaptionContainerObserver(video, updateCaptionsFunction) {
    // Handle Disney+ (US)
    let container = document.querySelector(".TimedTextOverlay");

    if (container) {
      const callback = () => {
        let textNodeList = container.querySelectorAll(
          ".hive-subtitle-renderer-line"
        );

        if (!textNodeList.length) {
          updateCaptionsFunction("");
          return;
        }

        updateCaptionsFunction(
          Array.from(textNodeList, x => x.textContent).join("\n")
        );
      };

      // immediately invoke the callback function to add subtitles to the PiP window
      callback();

      this.captionsObserver = new MutationObserver(callback);
      this.captionsObserver.observe(container, {
        attributes: false,
        childList: true,
        subtree: true,
      });
      return;
    }

    // Handle Disney+ (non US version)
    container = document.querySelector(".shaka-text-container");
    if (container) {
      updateCaptionsFunction("");
      const callback = function () {
        let textNodeList = container?.querySelectorAll("span");
        if (!textNodeList) {
          updateCaptionsFunction("");
          return;
        }

        updateCaptionsFunction(
          Array.from(textNodeList, x => x.textContent).join("\n")
        );
      };

      // immediately invoke the callback function to add subtitles to the PiP window
      callback([1], null);

      this.captionsObserver = new MutationObserver(callback);

      this.captionsObserver.observe(container, {
        attributes: false,
        childList: true,
        subtree: true,
      });
    }
  }

  removeCaptionContainerObserver() {
    this.captionsObserver?.disconnect();
  }

  play() {
    this.player.play();
  }

  pause() {
    this.player.pause();
  }

  getPaused() {
    return this.player.playbackStatus.paused;
  }

  getEnded() {
    return this.player.playbackStatus.ended;
  }

  getDuration() {
    return Math.floor(this.player.heartbeat.playbackDuration / 1000);
  }

  getCurrentTime() {
    return Math.floor(this.player.heartbeat.playheadPosition / 1000);
  }

  setCurrentTime(video, position) {
    this.player.seek(position * 1000);
  }

  getVolume() {
    return this.player.volume.level / 100;
  }

  setVolume(video, volume) {
    this.player.volume.level = volume * 100;
  }

  isMuted(video) {
    if (!this.muteButton) {
      this.muteButton =
        video.ownerDocument.querySelector("toggle-mute-button").wrappedJSObject;
    }
    return this.muteButton.store.volume.muted;
  }

  setMuted(video, shouldMute) {
    if (shouldMute) {
      this.player.volume.mute();
    } else {
      this.player.volume.unmute();
    }
  }

  isLive() {
    return this.player.isLive;
  }
}

this.PictureInPictureVideoWrapper = PictureInPictureVideoWrapper;
