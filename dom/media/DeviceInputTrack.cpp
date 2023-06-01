/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "DeviceInputTrack.h"

#include "MediaTrackGraphImpl.h"
#include "Tracing.h"

namespace mozilla {

#ifdef LOG_INTERNAL
#  undef LOG_INTERNAL
#endif  // LOG_INTERNAL
#define LOG_INTERNAL(level, msg, ...) \
  MOZ_LOG(gMediaTrackGraphLog, LogLevel::level, (msg, ##__VA_ARGS__))

#ifdef LOG
#  undef LOG
#endif  // LOG
#define LOG(msg, ...) LOG_INTERNAL(Debug, msg, ##__VA_ARGS__)

#ifdef LOGE
#  undef LOGE
#endif  // LOGE
#define LOGE(msg, ...) LOG_INTERNAL(Error, msg, ##__VA_ARGS__)

// This can only be called in graph thread since mGraph->CurrentDriver() is
// graph thread only
#ifdef TRACK_GRAPH_LOG_INTERNAL
#  undef TRACK_GRAPH_LOG_INTERNAL
#endif  // TRACK_GRAPH_LOG_INTERNAL
#define TRACK_GRAPH_LOG_INTERNAL(level, msg, ...)                        \
  LOG_INTERNAL(level, "(Graph %p, Driver %p) DeviceInputTrack %p, " msg, \
               this->mGraph, this->mGraph->CurrentDriver(), this,        \
               ##__VA_ARGS__)

#ifdef TRACK_GRAPH_LOG
#  undef TRACK_GRAPH_LOG
#endif  // TRACK_GRAPH_LOG
#define TRACK_GRAPH_LOG(msg, ...) \
  TRACK_GRAPH_LOG_INTERNAL(Debug, msg, ##__VA_ARGS__)

#ifdef TRACK_GRAPH_LOGV
#  undef TRACK_GRAPH_LOGV
#endif  // TRACK_GRAPH_LOGV
#define TRACK_GRAPH_LOGV(msg, ...) \
  TRACK_GRAPH_LOG_INTERNAL(Verbose, msg, ##__VA_ARGS__)

#ifdef TRACK_GRAPH_LOGE
#  undef TRACK_GRAPH_LOGE
#endif  // TRACK_GRAPH_LOGE
#define TRACK_GRAPH_LOGE(msg, ...) \
  TRACK_GRAPH_LOG_INTERNAL(Error, msg, ##__VA_ARGS__)

#ifdef CONSUMER_GRAPH_LOG_INTERNAL
#  undef CONSUMER_GRAPH_LOG_INTERNAL
#endif  // CONSUMER_GRAPH_LOG_INTERNAL
#define CONSUMER_GRAPH_LOG_INTERNAL(level, msg, ...)                    \
  LOG_INTERNAL(                                                         \
      level, "(Graph %p, Driver %p) DeviceInputConsumerTrack %p, " msg, \
      this->mGraph, this->mGraph->CurrentDriver(), this, ##__VA_ARGS__)

#ifdef CONSUMER_GRAPH_LOGV
#  undef CONSUMER_GRAPH_LOGV
#endif  // CONSUMER_GRAPH_LOGV
#define CONSUMER_GRAPH_LOGV(msg, ...) \
  CONSUMER_GRAPH_LOG_INTERNAL(Verbose, msg, ##__VA_ARGS__)

DeviceInputConsumerTrack::DeviceInputConsumerTrack(TrackRate aSampleRate)
    : ProcessedMediaTrack(aSampleRate, MediaSegment::AUDIO,
                          new AudioSegment()) {}

void DeviceInputConsumerTrack::ConnectDeviceInput(
    CubebUtils::AudioDeviceID aId, AudioDataListener* aListener,
    const PrincipalHandle& aPrincipal) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(GraphImpl());
  MOZ_ASSERT(aListener);
  MOZ_ASSERT(!mListener);
  MOZ_ASSERT(!mDeviceInputTrack);
  MOZ_ASSERT(mDeviceId.isNothing());
  MOZ_ASSERT(!mDeviceInputTrack,
             "Must disconnect a device input before connecting a new one");

  mListener = aListener;
  mDeviceId.emplace(aId);

  mDeviceInputTrack =
      DeviceInputTrack::OpenAudio(GraphImpl(), aId, aPrincipal, this);
  LOG("Open device %p (DeviceInputTrack %p) for consumer %p", aId,
      mDeviceInputTrack.get(), this);
  mPort = AllocateInputPort(mDeviceInputTrack.get());
}

void DeviceInputConsumerTrack::DisconnectDeviceInput() {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(GraphImpl());

  if (!mListener) {
    MOZ_ASSERT(mDeviceId.isNothing());
    MOZ_ASSERT(!mDeviceInputTrack);
    return;
  }

  MOZ_ASSERT(mPort);
  MOZ_ASSERT(mDeviceInputTrack);
  MOZ_ASSERT(mDeviceId.isSome());

  LOG("Close device %p (DeviceInputTrack %p) for consumer %p ", *mDeviceId,
      mDeviceInputTrack.get(), this);
  mPort->Destroy();
  DeviceInputTrack::CloseAudio(mDeviceInputTrack.forget(), this);
  mListener = nullptr;
  mDeviceId = Nothing();
}

Maybe<CubebUtils::AudioDeviceID> DeviceInputConsumerTrack::DeviceId() const {
  MOZ_ASSERT(NS_IsMainThread());
  return mDeviceId;
}

NotNull<AudioDataListener*> DeviceInputConsumerTrack::GetAudioDataListener()
    const {
  MOZ_ASSERT(NS_IsMainThread());
  return WrapNotNull(mListener.get());
}

bool DeviceInputConsumerTrack::ConnectToNativeDevice() const {
  MOZ_ASSERT(NS_IsMainThread());
  return mDeviceInputTrack && mDeviceInputTrack->AsNativeInputTrack();
}

bool DeviceInputConsumerTrack::ConnectToNonNativeDevice() const {
  MOZ_ASSERT(NS_IsMainThread());
  return mDeviceInputTrack && mDeviceInputTrack->AsNonNativeInputTrack();
}

void DeviceInputConsumerTrack::GetInputSourceData(AudioSegment& aOutput,
                                                  const MediaInputPort* aPort,
                                                  GraphTime aFrom,
                                                  GraphTime aTo) const {
  MOZ_ASSERT(mGraph->OnGraphThread());
  MOZ_ASSERT(aOutput.IsEmpty());

  MediaTrack* source = aPort->GetSource();
  GraphTime next;
  for (GraphTime t = aFrom; t < aTo; t = next) {
    MediaInputPort::InputInterval interval =
        MediaInputPort::GetNextInputInterval(aPort, t);
    interval.mEnd = std::min(interval.mEnd, aTo);

    const bool inputEnded =
        source->Ended() &&
        source->GetEnd() <=
            source->GraphTimeToTrackTimeWithBlocking(interval.mStart);

    TrackTime ticks = interval.mEnd - interval.mStart;
    next = interval.mEnd;

    if (interval.mStart >= interval.mEnd) {
      break;
    }

    if (inputEnded) {
      aOutput.AppendNullData(ticks);
      CONSUMER_GRAPH_LOGV(
          "Getting %" PRId64
          " ticks of null data from input port source (ended input)",
          ticks);
    } else if (interval.mInputIsBlocked) {
      aOutput.AppendNullData(ticks);
      CONSUMER_GRAPH_LOGV(
          "Getting %" PRId64
          " ticks of null data from input port source (blocked input)",
          ticks);
    } else if (source->IsSuspended()) {
      aOutput.AppendNullData(ticks);
      CONSUMER_GRAPH_LOGV(
          "Getting %" PRId64
          " ticks of null data from input port source (source is suspended)",
          ticks);
    } else {
      TrackTime start =
          source->GraphTimeToTrackTimeWithBlocking(interval.mStart);
      TrackTime end = source->GraphTimeToTrackTimeWithBlocking(interval.mEnd);
      MOZ_ASSERT(source->GetData<AudioSegment>()->GetDuration() >= end);
      aOutput.AppendSlice(*source->GetData<AudioSegment>(), start, end);
      CONSUMER_GRAPH_LOGV("Getting %" PRId64
                          " ticks of real data from input port source %p",
                          end - start, source);
    }
  }
}

/* static */
NotNull<RefPtr<DeviceInputTrack>> DeviceInputTrack::OpenAudio(
    MediaTrackGraphImpl* aGraph, CubebUtils::AudioDeviceID aDeviceId,
    const PrincipalHandle& aPrincipalHandle,
    DeviceInputConsumerTrack* aConsumer) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(aConsumer);
  MOZ_ASSERT(aGraph == aConsumer->GraphImpl());

  RefPtr<DeviceInputTrack> track =
      aGraph->GetDeviceInputTrackMainThread(aDeviceId);
  if (track) {
    MOZ_ASSERT(!track->mConsumerTracks.IsEmpty());
    track->AddDataListener(aConsumer->GetAudioDataListener());
  } else {
    // Create a NativeInputTrack or NonNativeInputTrack, depending on whether
    // the given graph already has a native device or not.
    if (aGraph->GetNativeInputTrackMainThread()) {
      // A native device is already in use. This device will be a non-native
      // device.
      track = new NonNativeInputTrack(aGraph->GraphRate(), aDeviceId,
                                      aPrincipalHandle);
    } else {
      // No native device is in use. This device will be the native device.
      track = new NativeInputTrack(aGraph->GraphRate(), aDeviceId,
                                   aPrincipalHandle);
    }
    LOG("Create %sNativeInputTrack %p in MTG %p for device %p",
        (track->AsNativeInputTrack() ? "" : "Non"), track.get(), aGraph,
        aDeviceId);
    aGraph->AddTrack(track);
    // Add the listener before opening the device so the device passed to
    // OpenAudioInput always has a non-zero input channel count.
    track->AddDataListener(aConsumer->GetAudioDataListener());
    aGraph->OpenAudioInput(track);
  }
  MOZ_ASSERT(track->AsNativeInputTrack() || track->AsNonNativeInputTrack());
  MOZ_ASSERT(track->mDeviceId == aDeviceId);

  MOZ_ASSERT(!track->mConsumerTracks.Contains(aConsumer));
  track->mConsumerTracks.AppendElement(aConsumer);

  LOG("DeviceInputTrack %p (device %p: %snative) in MTG %p has %zu users now",
      track.get(), track->mDeviceId,
      (track->AsNativeInputTrack() ? "" : "non-"), aGraph,
      track->mConsumerTracks.Length());
  if (track->mConsumerTracks.Length() > 1) {
    track->ReevaluateInputDevice();
  }

  return WrapNotNull(track);
}

/* static */
void DeviceInputTrack::CloseAudio(already_AddRefed<DeviceInputTrack> aTrack,
                                  DeviceInputConsumerTrack* aConsumer) {
  MOZ_ASSERT(NS_IsMainThread());

  RefPtr<DeviceInputTrack> track = aTrack;
  MOZ_ASSERT(track);

  track->RemoveDataListener(aConsumer->GetAudioDataListener());
  DebugOnly<bool> removed = track->mConsumerTracks.RemoveElement(aConsumer);
  MOZ_ASSERT(removed);
  LOG("DeviceInputTrack %p (device %p) in MTG %p has %zu users now",
      track.get(), track->mDeviceId, track->GraphImpl(),
      track->mConsumerTracks.Length());
  if (track->mConsumerTracks.IsEmpty()) {
    track->GraphImpl()->CloseAudioInput(track);
    track->Destroy();
  } else {
    track->ReevaluateInputDevice();
  }
}

const nsTArray<RefPtr<DeviceInputConsumerTrack>>&
DeviceInputTrack::GetConsumerTracks() const {
  MOZ_ASSERT(NS_IsMainThread());
  return mConsumerTracks;
}

DeviceInputTrack::DeviceInputTrack(TrackRate aSampleRate,
                                   CubebUtils::AudioDeviceID aDeviceId,
                                   const PrincipalHandle& aPrincipalHandle)
    : ProcessedMediaTrack(aSampleRate, MediaSegment::AUDIO, new AudioSegment()),
      mDeviceId(aDeviceId),
      mPrincipalHandle(aPrincipalHandle) {}

uint32_t DeviceInputTrack::MaxRequestedInputChannels() const {
  MOZ_ASSERT(mGraph->OnGraphThreadOrNotRunning());
  uint32_t maxInputChannels = 0;
  for (const auto& listener : mListeners) {
    maxInputChannels = std::max(maxInputChannels,
                                listener->RequestedInputChannelCount(mGraph));
  }
  return maxInputChannels;
}

bool DeviceInputTrack::HasVoiceInput() const {
  MOZ_ASSERT(mGraph->OnGraphThreadOrNotRunning());
  for (const auto& listener : mListeners) {
    if (listener->IsVoiceInput(mGraph)) {
      return true;
    }
  }
  return false;
}

void DeviceInputTrack::DeviceChanged(MediaTrackGraphImpl* aGraph) const {
  MOZ_ASSERT(aGraph->OnGraphThreadOrNotRunning());
  MOZ_ASSERT(aGraph == mGraph,
             "Receive device changed signal from another graph");
  TRACK_GRAPH_LOG("DeviceChanged");
  for (const auto& listener : mListeners) {
    listener->DeviceChanged(aGraph);
  }
}

void DeviceInputTrack::ReevaluateInputDevice() {
  MOZ_ASSERT(NS_IsMainThread());
  class Message : public ControlMessage {
   public:
    explicit Message(MediaTrack* aTrack, CubebUtils::AudioDeviceID aDeviceId)
        : ControlMessage(aTrack), mDeviceId(aDeviceId) {}
    void Run() override {
      TRACE("DeviceInputTrack::ReevaluateInputDevice ControlMessage");
      mTrack->GraphImpl()->ReevaluateInputDevice(mDeviceId);
    }
    CubebUtils::AudioDeviceID mDeviceId;
  };
  mGraph->AppendMessage(MakeUnique<Message>(this, mDeviceId));
}

void DeviceInputTrack::AddDataListener(AudioDataListener* aListener) {
  MOZ_ASSERT(NS_IsMainThread());

  class Message : public ControlMessage {
   public:
    Message(DeviceInputTrack* aInputTrack, AudioDataListener* aListener)
        : ControlMessage(nullptr),
          mInputTrack(aInputTrack),
          mListener(aListener) {}
    void Run() override {
      TRACE("DeviceInputTrack::AddDataListener ControlMessage");
      MOZ_ASSERT(!mInputTrack->mListeners.Contains(mListener.get()),
                 "Don't add a listener twice.");
      mInputTrack->mListeners.AppendElement(mListener.get());
    }
    RefPtr<DeviceInputTrack> mInputTrack;
    RefPtr<AudioDataListener> mListener;
  };

  mGraph->AppendMessage(MakeUnique<Message>(this, aListener));
}

void DeviceInputTrack::RemoveDataListener(AudioDataListener* aListener) {
  MOZ_ASSERT(NS_IsMainThread());

  class Message : public ControlMessage {
   public:
    Message(DeviceInputTrack* aInputTrack, AudioDataListener* aListener)
        : ControlMessage(nullptr),
          mInputTrack(aInputTrack),
          mListener(aListener) {}
    void Run() override {
      TRACE("DeviceInputTrack::RemoveDataListener ControlMessage");
      DebugOnly<bool> wasPresent =
          mInputTrack->mListeners.RemoveElement(mListener.get());
      MOZ_ASSERT(wasPresent, "Remove an unknown listener");
      mListener->Disconnect(mInputTrack->GraphImpl());
    }
    RefPtr<DeviceInputTrack> mInputTrack;
    RefPtr<AudioDataListener> mListener;
  };

  mGraph->AppendMessage(MakeUnique<Message>(this, aListener));
}

NativeInputTrack::NativeInputTrack(TrackRate aSampleRate,
                                   CubebUtils::AudioDeviceID aDeviceId,
                                   const PrincipalHandle& aPrincipalHandle)
    : DeviceInputTrack(aSampleRate, aDeviceId, aPrincipalHandle),
      mIsBufferingAppended(false),
      mInputChannels(0) {}

void NativeInputTrack::DestroyImpl() {
  MOZ_ASSERT(mGraph->OnGraphThreadOrNotRunning());
  mPendingData.Clear();
  ProcessedMediaTrack::DestroyImpl();
}

void NativeInputTrack::ProcessInput(GraphTime aFrom, GraphTime aTo,
                                    uint32_t aFlags) {
  MOZ_ASSERT(mGraph->OnGraphThread());
  TRACE_COMMENT("NativeInputTrack::ProcessInput", "%p", this);

  TRACK_GRAPH_LOGV("(Native) ProcessInput from %" PRId64 " to %" PRId64
                   ", needs %" PRId64 " frames",
                   aFrom, aTo, aTo - aFrom);

  TrackTime from = GraphTimeToTrackTime(aFrom);
  TrackTime to = GraphTimeToTrackTime(aTo);
  if (from >= to) {
    return;
  }

  MOZ_ASSERT_IF(!mIsBufferingAppended, mPendingData.IsEmpty());

  TrackTime need = to - from;
  TrackTime dataNeed = std::min(mPendingData.GetDuration(), need);
  TrackTime silenceNeed = std::max(need - dataNeed, (TrackTime)0);

  MOZ_ASSERT_IF(dataNeed > 0, silenceNeed == 0);

  GetData<AudioSegment>()->AppendSlice(mPendingData, 0, dataNeed);
  mPendingData.RemoveLeading(dataNeed);
  GetData<AudioSegment>()->AppendNullData(silenceNeed);
}

uint32_t NativeInputTrack::NumberOfChannels() const {
  MOZ_ASSERT(mGraph->OnGraphThreadOrNotRunning());
  return mInputChannels;
}

void NativeInputTrack::NotifyInputStopped(MediaTrackGraphImpl* aGraph) {
  MOZ_ASSERT(aGraph->OnGraphThreadOrNotRunning());
  MOZ_ASSERT(aGraph == mGraph,
             "Receive input stopped signal from another graph");
  TRACK_GRAPH_LOG("(Native) NotifyInputStopped");
  mInputChannels = 0;
  mIsBufferingAppended = false;
  mPendingData.Clear();
}

void NativeInputTrack::NotifyInputData(MediaTrackGraphImpl* aGraph,
                                       const AudioDataValue* aBuffer,
                                       size_t aFrames, TrackRate aRate,
                                       uint32_t aChannels,
                                       uint32_t aAlreadyBuffered) {
  MOZ_ASSERT(aGraph->OnGraphThread());
  MOZ_ASSERT(aGraph == mGraph, "Receive input data from another graph");
  TRACK_GRAPH_LOGV(
      "NotifyInputData: frames=%zu, rate=%d, channel=%u, alreadyBuffered=%u",
      aFrames, aRate, aChannels, aAlreadyBuffered);

  if (!mIsBufferingAppended) {
    // First time we see live frames getting added. Use what's already buffered
    // in the driver's scratch buffer as a starting point.
    MOZ_ASSERT(mPendingData.IsEmpty());
    constexpr TrackTime buffering = WEBAUDIO_BLOCK_SIZE;
    const TrackTime remaining =
        buffering - static_cast<TrackTime>(aAlreadyBuffered);
    mPendingData.AppendNullData(remaining);
    mIsBufferingAppended = true;
    TRACK_GRAPH_LOG("Set mIsBufferingAppended by appending %" PRId64 " frames.",
                    remaining);
  }

  MOZ_ASSERT(aChannels);
  if (!mInputChannels) {
    mInputChannels = aChannels;
  }
  mPendingData.AppendFromInterleavedBuffer(aBuffer, aFrames, aChannels,
                                           mPrincipalHandle);
}

NonNativeInputTrack::NonNativeInputTrack(
    TrackRate aSampleRate, CubebUtils::AudioDeviceID aDeviceId,
    const PrincipalHandle& aPrincipalHandle)
    : DeviceInputTrack(aSampleRate, aDeviceId, aPrincipalHandle),
      mAudioSource(nullptr),
      mSourceIdNumber(0),
      mGraphDriverThreadId(std::thread::id()) {}

void NonNativeInputTrack::DestroyImpl() {
  MOZ_ASSERT(mGraph->OnGraphThreadOrNotRunning());
  if (mAudioSource) {
    mAudioSource->Stop();
    mAudioSource = nullptr;
  }
  ProcessedMediaTrack::DestroyImpl();
}

void NonNativeInputTrack::ProcessInput(GraphTime aFrom, GraphTime aTo,
                                       uint32_t aFlags) {
  MOZ_ASSERT(mGraph->OnGraphThread());
  TRACE_COMMENT("NonNativeInputTrack::ProcessInput", "%p", this);

  TRACK_GRAPH_LOGV("(NonNative) ProcessInput from %" PRId64 " to %" PRId64
                   ", needs %" PRId64 " frames",
                   aFrom, aTo, aTo - aFrom);

  TrackTime from = GraphTimeToTrackTime(aFrom);
  TrackTime to = GraphTimeToTrackTime(aTo);
  if (from >= to) {
    return;
  }

  TrackTime delta = to - from;
  if (!mAudioSource) {
    GetData<AudioSegment>()->AppendNullData(delta);
    return;
  }

  // GetAudioSegment only checks the given reader if DEBUG is defined.
  AudioInputSource::Consumer consumer =
#ifdef DEBUG
      // If we are on GraphRunner, we should always be on the same thread.
      mGraph->mGraphRunner || !CheckGraphDriverChanged()
          ? AudioInputSource::Consumer::Same
          : AudioInputSource::Consumer::Changed;
#else
      AudioInputSource::Consumer::Same;
#endif

  AudioSegment data = mAudioSource->GetAudioSegment(delta, consumer);
  MOZ_ASSERT(data.GetDuration() == delta);
  GetData<AudioSegment>()->AppendFrom(&data);
}

uint32_t NonNativeInputTrack::NumberOfChannels() const {
  MOZ_ASSERT(mGraph->OnGraphThreadOrNotRunning());
  return mAudioSource ? mAudioSource->mChannelCount : 0;
}

void NonNativeInputTrack::StartAudio(
    RefPtr<AudioInputSource>&& aAudioInputSource) {
  MOZ_ASSERT(mGraph->OnGraphThread());
  MOZ_ASSERT(aAudioInputSource->mPrincipalHandle == mPrincipalHandle);
  MOZ_ASSERT(aAudioInputSource->mDeviceId == mDeviceId);

  TRACK_GRAPH_LOG("StartAudio with source %p", aAudioInputSource.get());
  mAudioSource = std::move(aAudioInputSource);
  mAudioSource->Start();
}

void NonNativeInputTrack::StopAudio() {
  MOZ_ASSERT(mGraph->OnGraphThread());

  TRACK_GRAPH_LOG("StopAudio from source %p", mAudioSource.get());
  if (!mAudioSource) {
    return;
  }
  mAudioSource->Stop();
  mAudioSource = nullptr;
}

AudioInputType NonNativeInputTrack::DevicePreference() const {
  MOZ_ASSERT(mGraph->OnGraphThreadOrNotRunning());
  return mAudioSource && mAudioSource->mIsVoice ? AudioInputType::Voice
                                                : AudioInputType::Unknown;
}

void NonNativeInputTrack::NotifyDeviceChanged(uint32_t aSourceId) {
  MOZ_ASSERT(mGraph->OnGraphThreadOrNotRunning());

  // No need to forward the notification if the audio input has been stopped or
  // restarted by it users.
  if (!mAudioSource || mAudioSource->mId != aSourceId) {
    TRACK_GRAPH_LOG("(NonNative) NotifyDeviceChanged: No need to forward");
    return;
  }

  TRACK_GRAPH_LOG("(NonNative) NotifyDeviceChanged");
  // Forward the notification.
  DeviceInputTrack::DeviceChanged(mGraph);
}

void NonNativeInputTrack::NotifyInputStopped(uint32_t aSourceId) {
  MOZ_ASSERT(mGraph->OnGraphThreadOrNotRunning());

  // No need to forward the notification if the audio input has been stopped or
  // restarted by it users.
  if (!mAudioSource || mAudioSource->mId != aSourceId) {
    TRACK_GRAPH_LOG("(NonNative) NotifyInputStopped: No need to forward");
    return;
  }

  TRACK_GRAPH_LOGE(
      "(NonNative) NotifyInputStopped: audio unexpectedly stopped");
  // Destory the underlying audio stream if it's stopped unexpectedly.
  mAudioSource->Stop();
}

AudioInputSource::Id NonNativeInputTrack::GenerateSourceId() {
  MOZ_ASSERT(mGraph->OnGraphThread());
  return mSourceIdNumber++;
}

bool NonNativeInputTrack::CheckGraphDriverChanged() {
  MOZ_ASSERT(mGraph->CurrentDriver()->OnThread());

  std::thread::id currentId = std::this_thread::get_id();
  if (mGraphDriverThreadId == currentId) {
    return false;
  }
  mGraphDriverThreadId = currentId;
  return true;
}

AudioInputSourceListener::AudioInputSourceListener(NonNativeInputTrack* aOwner)
    : mOwner(aOwner) {}

void AudioInputSourceListener::AudioDeviceChanged(
    AudioInputSource::Id aSourceId) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(mOwner);

  if (mOwner->IsDestroyed()) {
    LOG("NonNativeInputTrack %p has been destroyed. No need to forward the "
        "audio device-changed notification",
        mOwner.get());
    return;
  }

  class DeviceChangedMessage : public ControlMessage {
   public:
    DeviceChangedMessage(NonNativeInputTrack* aInputTrack,
                         AudioInputSource::Id aSourceId)
        : ControlMessage(nullptr),
          mInputTrack(aInputTrack),
          mSourceId(aSourceId) {
      MOZ_ASSERT(mInputTrack);
    }
    void Run() override {
      TRACE("NonNativeInputTrack::AudioDeviceChanged ControlMessage");
      mInputTrack->NotifyDeviceChanged(mSourceId);
    }
    RefPtr<NonNativeInputTrack> mInputTrack;
    AudioInputSource::Id mSourceId;
  };

  MOZ_DIAGNOSTIC_ASSERT(mOwner->GraphImpl());
  mOwner->GraphImpl()->AppendMessage(
      MakeUnique<DeviceChangedMessage>(mOwner.get(), aSourceId));
}

void AudioInputSourceListener::AudioStateCallback(
    AudioInputSource::Id aSourceId,
    AudioInputSource::EventListener::State aState) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(mOwner);

  const char* state =
      aState == AudioInputSource::EventListener::State::Started   ? "started"
      : aState == AudioInputSource::EventListener::State::Stopped ? "stopped"
      : aState == AudioInputSource::EventListener::State::Drained ? "drained"
                                                                  : "error";

  if (mOwner->IsDestroyed()) {
    LOG("NonNativeInputTrack %p has been destroyed. No need to forward the "
        "audio state-changed(%s) notification",
        mOwner.get(), state);
    return;
  }

  if (aState == AudioInputSource::EventListener::State::Started) {
    LOG("We can ignore %s notification for NonNativeInputTrack %p", state,
        mOwner.get());
    return;
  }

  LOG("Notify audio stopped due to entering %s state", state);

  class InputStoppedMessage : public ControlMessage {
   public:
    InputStoppedMessage(NonNativeInputTrack* aInputTrack,
                        AudioInputSource::Id aSourceId)
        : ControlMessage(nullptr),
          mInputTrack(aInputTrack),
          mSourceId(aSourceId) {
      MOZ_ASSERT(mInputTrack);
    }
    void Run() override {
      TRACE("NonNativeInputTrack::AudioStateCallback ControlMessage");
      mInputTrack->NotifyInputStopped(mSourceId);
    }
    RefPtr<NonNativeInputTrack> mInputTrack;
    AudioInputSource::Id mSourceId;
  };

  MOZ_DIAGNOSTIC_ASSERT(mOwner->GraphImpl());
  mOwner->GraphImpl()->AppendMessage(
      MakeUnique<InputStoppedMessage>(mOwner.get(), aSourceId));
}

#undef LOG_INTERNAL
#undef LOG
#undef LOGE
#undef TRACK_GRAPH_LOG_INTERNAL
#undef TRACK_GRAPH_LOG
#undef TRACK_GRAPH_LOGV
#undef TRACK_GRAPH_LOGE
#undef CONSUMER_GRAPH_LOG_INTERNAL
#undef CONSUMER_GRAPH_LOGV

}  // namespace mozilla
