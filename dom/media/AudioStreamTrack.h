/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-*/
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef AUDIOSTREAMTRACK_H_
#define AUDIOSTREAMTRACK_H_

#include "CrossGraphPort.h"
#include "DOMMediaStream.h"
#include "MediaStreamTrack.h"
#include "nsClassHashtable.h"

namespace mozilla::dom {

class AudioStreamTrack : public MediaStreamTrack {
 public:
  AudioStreamTrack(
      nsPIDOMWindowInner* aWindow, mozilla::MediaTrack* aInputTrack,
      MediaStreamTrackSource* aSource,
      MediaStreamTrackState aReadyState = MediaStreamTrackState::Live,
      bool aMuted = false,
      const MediaTrackConstraints& aConstraints = MediaTrackConstraints())
      : MediaStreamTrack(aWindow, aInputTrack, aSource, aReadyState, aMuted,
                         aConstraints) {}

  already_AddRefed<MediaStreamTrack> Clone() override;

  AudioStreamTrack* AsAudioStreamTrack() override { return this; }
  const AudioStreamTrack* AsAudioStreamTrack() const override { return this; }

  // Direct output to aSink, or the default output device if aSink is null.
  // No more than one output may exist for a single aKey at any one time.
  // Returns a promise that resolves when the device is processing audio.
  RefPtr<GenericPromise> AddAudioOutput(void* aKey, AudioDeviceInfo* aSink);
  void RemoveAudioOutput(void* aKey);
  void SetAudioOutputVolume(void* aKey, float aVolume);

  // Use AddConsumerPort instead of ForwardTrackContentsTo when possible, since
  // it handles CrossGraphPort creation automatically. Must be balanced with a
  // corresponding RemoveConsumerPort call.
  already_AddRefed<MediaInputPort> AddConsumerPort(ProcessedMediaTrack* aTrack);
  void RemoveConsumerPort(MediaInputPort* aPort);

  // WebIDL
  void GetKind(nsAString& aKind) override { aKind.AssignLiteral("audio"); }

  void GetLabel(nsAString& aLabel, CallerType aCallerType) override;

 protected:
  void SetReadyState(MediaStreamTrackState aState) override;

 private:
  // Main thread only
  struct CrossGraphConnection {
    UniquePtr<CrossGraphPort> mPort;
    size_t mRefCount;

    explicit CrossGraphConnection(UniquePtr<CrossGraphPort> aPort)
        : mPort(std::move(aPort)), mRefCount(1) {}
  };
  nsTArray<CrossGraphConnection> mCrossGraphs;
};

}  // namespace mozilla::dom

#endif /* AUDIOSTREAMTRACK_H_ */
