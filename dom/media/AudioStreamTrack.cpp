/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-*/
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AudioStreamTrack.h"

#include "MediaTrackGraph.h"
#include "nsContentUtils.h"

extern mozilla::LazyLogModule gMediaStreamTrackLog;
#define LOG(type, msg) MOZ_LOG(gMediaStreamTrackLog, type, msg)

namespace mozilla::dom {

RefPtr<GenericPromise> AudioStreamTrack::AddAudioOutput(
    void* aKey, AudioDeviceInfo* aSink) {
  if (Ended()) {
    return GenericPromise::CreateAndResolve(true, __func__);
  }

  mTrack->AddAudioOutput(aKey, aSink);
  return mTrack->Graph()->NotifyWhenDeviceStarted(aSink);
}

void AudioStreamTrack::RemoveAudioOutput(void* aKey) {
  if (Ended()) {
    return;
  }

  mTrack->RemoveAudioOutput(aKey);
}

void AudioStreamTrack::SetAudioOutputVolume(void* aKey, float aVolume) {
  if (Ended()) {
    return;
  }

  mTrack->SetAudioOutputVolume(aKey, aVolume);
}

already_AddRefed<MediaInputPort> AudioStreamTrack::AddConsumerPort(
    ProcessedMediaTrack* aTrack) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(!mTrack == Ended());

  if (!mTrack || !aTrack || aTrack->IsDestroyed()) {
    LOG(LogLevel::Warning,
        ("AudioStreamTrack %p cannot forward contents: track ended or "
         "data/destination track ended/destroyed",
         this));
    return nullptr;
  }

  MOZ_ASSERT(!mTrack->IsDestroyed());
  if (mTrack->Graph() == aTrack->Graph()) {
    return ForwardTrackContentsTo(aTrack);
  }

  LOG(LogLevel::Verbose,
      ("AudioStreamTrack %p forwarding cross-graph contents from track %p "
       "(graph %p) to track %p (graph %p)",
       this, mTrack.get(), mTrack->Graph(), aTrack, aTrack->Graph()));

  // Route audio from mTrack through a cross-graph transmitter and receiver to
  // aTrack.
  MediaTrackGraph* rcvrGraph = aTrack->Graph();

  // Find existing connection for this graph
  for (auto& conn : mCrossGraphs) {
    if (conn.mPort->mReceiver->Graph() == rcvrGraph) {
      conn.mRefCount++;
      LOG(LogLevel::Verbose,
          ("AudioStreamTrack %p reusing cross-graph port "
           "to graph %p (rate %u), refcount now %zu",
           this, rcvrGraph, rcvrGraph->GraphRate(), conn.mRefCount));
      return aTrack->AllocateInputPort(conn.mPort->mReceiver);
    }
  }

  // Create new connection if none exists
  LOG(LogLevel::Verbose,
      ("AudioStreamTrack %p creating cross-graph port to graph %p (rate %u)",
       this, rcvrGraph, rcvrGraph->GraphRate()));
  CrossGraphConnection* conn = mCrossGraphs.AppendElement(
      CrossGraphConnection(CrossGraphPort::Connect(RefPtr{this}, rcvrGraph)));
  return aTrack->AllocateInputPort(conn->mPort->mReceiver);
}

void AudioStreamTrack::RemoveConsumerPort(MediaInputPort* aPort) {
  MOZ_ASSERT(NS_IsMainThread());

  if (!aPort) {
    return;
  }

  MediaTrackGraph* receiverGraph = aPort->Graph();

  // Decrement refcount for this graph's connection and remove if it reaches 0
  for (size_t i = 0; i < mCrossGraphs.Length(); ++i) {
    auto& conn = mCrossGraphs[i];
    if (conn.mPort->mReceiver->Graph() == receiverGraph) {
      MOZ_ASSERT(conn.mRefCount > 0);
      --conn.mRefCount;
      LOG(LogLevel::Verbose,
          ("AudioStreamTrack %p decrementing cross-graph port refcount to "
           "graph %p (rate %u), refcount now %zu",
           this, receiverGraph, receiverGraph->GraphRate(), conn.mRefCount));
      if (conn.mRefCount == 0) {
        LOG(LogLevel::Verbose,
            ("AudioStreamTrack %p removing cross-graph forwarding to graph %p "
             "(rate %u)",
             this, receiverGraph, receiverGraph->GraphRate()));
        mCrossGraphs.UnorderedRemoveElementAt(i);
      }
      return;
    }
  }
}

void AudioStreamTrack::GetLabel(nsAString& aLabel, CallerType aCallerType) {
  MediaStreamTrack::GetLabel(aLabel, aCallerType);
}

already_AddRefed<MediaStreamTrack> AudioStreamTrack::Clone() {
  return MediaStreamTrack::CloneInternal<AudioStreamTrack>();
}

void AudioStreamTrack::SetReadyState(MediaStreamTrackState aState) {
  MOZ_ASSERT(NS_IsMainThread());

  // When transitioning from Live to Ended, mTrack will be destroyed. Since
  // mTrack is the source for cross-graph data forwarding, keeping cross-graph
  // ports is unnecessary. Clearing them here ensures all related connections
  // are properly disconnected and prevents an assertion failure in
  // CrossGraphTransmitters::ProcessInput due to a missing source.
  //
  // This state transition may occur in various situations, such as when the
  // track is stopped by a user action, or when mTrack is ended during its
  // ProcessInput (because its source has ended), which is then detected by
  // MediaTrackGraph and ultimately notifies the ended-signal via MTGListener,
  // reaching this point.
  if (!mCrossGraphs.IsEmpty() && aState == MediaStreamTrackState::Ended) {
    MOZ_ASSERT(!Ended());
    LOG(LogLevel::Verbose,
        ("AudioStreamTrack %p ending, destroying %zu cross-graph ports", this,
         mCrossGraphs.Length()));
    mCrossGraphs.Clear();
  }

  MediaStreamTrack::SetReadyState(aState);
}

}  // namespace mozilla::dom

#undef LOG
