/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://w3c.github.io/audio-session/
 */

[Exposed=Window, Pref="dom.audio_session.enabled"]
interface AudioSession : EventTarget {
  attribute AudioSessionType type;

  readonly attribute AudioSessionState state;
  attribute EventHandler onstatechange;
};

// Ordered so that the C++ enum value doubles as the priority rank used by
// `compute the audio session type`. "auto" is the user request to let the
// UA pick a type and is intentionally first (rank 0); the rest follow from
// lowest to highest priority.
enum AudioSessionType {
  "auto",
  "ambient",
  "transient",
  "transient-solo",
  "playback",
  "play-and-record"
};

enum AudioSessionState {
  "inactive",
  "active",
  "interrupted"
};
