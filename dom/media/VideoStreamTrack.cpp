/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "VideoStreamTrack.h"

#include "MediaTrackGraph.h"
#include "MediaTrackListener.h"
#include "VideoOutput.h"
#include "nsContentUtils.h"
#include "nsGlobalWindowInner.h"

namespace mozilla::dom {

VideoStreamTrack::VideoStreamTrack(nsPIDOMWindowInner* aWindow,
                                   mozilla::MediaTrack* aInputTrack,
                                   MediaStreamTrackSource* aSource,
                                   MediaStreamTrackState aReadyState,
                                   bool aMuted,
                                   const MediaTrackConstraints& aConstraints)
    : MediaStreamTrack(aWindow, aInputTrack, aSource, aReadyState, aMuted,
                       aConstraints) {}

void VideoStreamTrack::Destroy() {
  mVideoOutputs.Clear();
  MediaStreamTrack::Destroy();
}

void VideoStreamTrack::AddVideoOutput(VideoOutput* aOutput) {
  if (Ended()) {
    return;
  }
  MOZ_ASSERT(aOutput->mAttachment == VideoOutput::State::Detached);
  const bool exists = mVideoOutputs.Contains(aOutput);
  if (exists) {
    // A VideoOutput can be detached either through RemoveVideoOutput or by the
    // graph removing it during (forced) shutdown. In the latter case it will
    // still exist in mVideoOutputs in the detached state.
    // Allow re-attaching a detached VideoOutput as users may listen to and use
    // mAttachment to determine whether or not to re-try AddVideoOutput().
    if (aOutput->mAttachment == VideoOutput::State::Attached) {
      MOZ_ASSERT_UNREACHABLE("A VideoOutput was already added");
      return;
    }
  } else {
    mVideoOutputs.AppendElement(aOutput);
  }
  aOutput->mAttachment = VideoOutput::State::Attached;
  AddDirectListener(aOutput);
  AddListener(aOutput);
}

void VideoStreamTrack::RemoveVideoOutput(VideoOutput* aOutput) {
  for (const auto& output : mVideoOutputs.Clone()) {
    if (output == aOutput) {
      mVideoOutputs.RemoveElement(aOutput);
      // Don't mark the output detaching if it was already detached through
      // forced graph shutdown.
      if (aOutput->mAttachment == VideoOutput::State::Attached) {
        aOutput->mAttachment = VideoOutput::State::Detaching;
        RemoveDirectListener(aOutput);
        RemoveListener(aOutput);
      }
    }
  }
}

void VideoStreamTrack::GetLabel(nsAString& aLabel, CallerType aCallerType) {
  MediaStreamTrack::GetLabel(aLabel, aCallerType);
}

already_AddRefed<MediaStreamTrack> VideoStreamTrack::Clone() {
  return MediaStreamTrack::CloneInternal<VideoStreamTrack>();
}

}  // namespace mozilla::dom
