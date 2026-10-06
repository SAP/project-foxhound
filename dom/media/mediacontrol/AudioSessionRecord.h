/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_MEDIACONTROL_AUDIOSESSIONRECORD_H_
#define DOM_MEDIA_MEDIACONTROL_AUDIOSESSIONRECORD_H_

#include <cstdint>

#include "mozilla/Maybe.h"
#include "mozilla/dom/AudioSessionBinding.h"

namespace mozilla::dom {

// Priority rank of an audio-session type. Higher rank wins. The enum values
// in AudioSession.webidl are ordered so that the integer is the rank
// directly. `Auto` is rank 0 and never participates in selection.
inline int AudioSessionTypePriorityRank(AudioSessionType aType) {
  return static_cast<int>(aType);
}

// Default type when no source ranks (the spec fallback,
// https://w3c.github.io/audio-session/#compute-the-audio-session-type step 6).
inline constexpr AudioSessionType DefaultAudioSessionType() {
  return AudioSessionType::Ambient;
}

// https://w3c.github.io/audio-session/#exclusive-type
inline constexpr AudioSessionType kExclusiveAudioSessionTypes[] = {
    AudioSessionType::Play_and_record,
    AudioSessionType::Playback,
    AudioSessionType::Transient_solo,
};

inline constexpr AudioSessionType kNonExclusiveAudioSessionTypes[] = {
    AudioSessionType::Transient,
    AudioSessionType::Ambient,
};

inline bool IsExclusiveAudioSessionType(AudioSessionType aType) {
  for (const AudioSessionType t : kExclusiveAudioSessionTypes) {
    if (t == aType) {
      return true;
    }
  }
  return false;
}

/**
 * Per-browsing-context AudioSession spec state held in the parent process by
 * MediaController. Lifetime is independent of ContextMediaInfo (the audibility
 * store on MediaPlaybackStatus): an override can be present on a browsing
 * context that has never played media, and ContextMediaInfo can exist without
 * any matching AudioSessionRecord.
 */
class AudioSessionRecord {
 public:
  // The AudioSession type the user set on this browsing context. `Nothing()`
  // when the user has not set one (or assigned "auto"); in that case the
  // effective type comes from walking the audible sources.
  // https://w3c.github.io/audio-session/#enumdef-audiosessiontype
  Maybe<AudioSessionType> GetTypeOverride() const { return mTypeOverride; }

  // Milliseconds since process creation captured when the browsing context
  // most recently became audible. `Nothing()` when the browsing context is
  // currently silent.
  Maybe<int64_t> GetAudibleAtMs() const { return mAudibleAtMs; }

  // Spec state for this browsing context's audio session. Defaults to
  // Inactive; transitions are driven by the §5.2 mutators on
  // AudioSessionManager.
  // https://w3c.github.io/audio-session/#audio-session-states
  AudioSessionState GetState() const { return mState; }

  bool IsEmpty() const {
    return mTypeOverride.isNothing() && mAudibleAtMs.isNothing() &&
           mState == AudioSessionState::Inactive;
  }

  void SetTypeOverride(uint64_t aBcId, Maybe<AudioSessionType> aTypeOverride);
  void SetAudibleAtMs(uint64_t aBcId, Maybe<int64_t> aAudibleAtMs);
  void SetState(uint64_t aBcId, AudioSessionState aState);

  // Pushes the current state to the content-side AudioSession via IPC, so
  // the `state` attribute and `statechange` event reflect the spec mutation.
  void DispatchStateChange(uint64_t aBcId) const;

 private:
  void LogState(uint64_t aBcId) const;

  Maybe<AudioSessionType> mTypeOverride;
  Maybe<int64_t> mAudibleAtMs;
  AudioSessionState mState = AudioSessionState::Inactive;
};

}  // namespace mozilla::dom

#endif  // DOM_MEDIA_MEDIACONTROL_AUDIOSESSIONRECORD_H_
