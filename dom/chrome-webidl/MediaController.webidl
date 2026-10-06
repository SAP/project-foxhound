/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * This enum lists all supported behaviors on the media controller.
 */
enum MediaControlKey {
  "focus",
  "play",
  "pause",
  "playpause",
  "previoustrack",
  "nexttrack",
  "seekbackward",
  "seekforward",
  "skipad",
  "seekto",
  "stop",
  "mute",
  "unmute",
  "setvolume",
};

/**
 * MediaController is used to control media playback for a tab, and each tab
 * would only have one media controller, which can be accessed from the
 * canonical browsing context.
 */
[Exposed=Window, ChromeOnly]
interface MediaController : EventTarget {
  readonly attribute unsigned long long id;
  readonly attribute boolean isActive;
  readonly attribute boolean isAudible;
  readonly attribute boolean isPlaying;
  readonly attribute boolean isAnyMediaBeingControlled;
  readonly attribute MediaSessionPlaybackState playbackState;

  // The effective audio-session type the tab is currently claiming. Chrome
  // consumers can use this to apply tab/application level audio-focus
  // management strategies based on the kind of audio the tab is playing.
  [BinaryName="GetEffectiveAudioSessionType"]
  readonly attribute AudioSessionType effectiveAudioSessionType;

  [Throws]
  MediaMetadataInit getMetadata();

  [Frozen, Cached, Pure]
  readonly attribute sequence<MediaControlKey> supportedKeys;

  attribute EventHandler onactivated;
  attribute EventHandler ondeactivated;
  attribute EventHandler onaudiblechange;
  attribute EventHandler oneffectiveaudiosessiontypechange;

  // Following events would only be dispatched after controller is active.
  attribute EventHandler onmetadatachange;
  attribute EventHandler onplaybackstatechange;
  attribute EventHandler onpositionstatechange;
  attribute EventHandler onsupportedkeyschange;

  undefined focus();
  undefined play();
  undefined pause();
  undefined stop();
  undefined prevTrack();
  undefined nextTrack();
  undefined seekBackward(double seekOffset);
  undefined seekForward(double seekOffset);
  undefined skipAd();
  undefined seekTo(double seekTime, optional boolean fastSeek = false);
};

[ChromeOnly,Exposed=Window,HeaderFile="mozilla/dom/MediaControlService.h"]
namespace MediaControlService {
  // This is used to generate fake media control keys event in testing.
  undefined generateMediaControlKey(MediaControlKey aKey, optional double aSeekValue = 0.0);

  // This is used to get the media metadata from the current main controller in
  // testing.
  MediaMetadataInit getCurrentActiveMediaMetadata();

  // This is used to get the actual media playback state from the current main
  // controller in testing.
  MediaSessionPlaybackState getCurrentMediaSessionPlaybackState();
};
