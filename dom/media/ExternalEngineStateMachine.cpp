/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ExternalEngineStateMachine.h"

#include "PerformanceRecorder.h"
#ifdef MOZ_WMF_MEDIA_ENGINE
#  include "MFMediaEngineDecoderModule.h"
#  include "mozilla/MFMediaEngineChild.h"
#  include "mozilla/StaticPrefs_media.h"
#endif
#include "mozilla/Atomics.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/ProfilerLabels.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/StaticMutex.h"
#include "nsThreadUtils.h"

namespace mozilla {

extern LazyLogModule gMediaDecoderLog;

#define FMT(x, ...) \
  "Decoder=%p, State=%s, " x, mDecoderID, GetStateStr(), ##__VA_ARGS__
#define LOG(x, ...)                                                        \
  DDMOZ_LOG(gMediaDecoderLog, LogLevel::Debug, "Decoder=%p, State=%s, " x, \
            mDecoderID, GetStateStr(), ##__VA_ARGS__)
#define LOGV(x, ...)                                                         \
  DDMOZ_LOG(gMediaDecoderLog, LogLevel::Verbose, "Decoder=%p, State=%s, " x, \
            mDecoderID, GetStateStr(), ##__VA_ARGS__)
#define LOGW(x, ...) NS_WARNING(nsPrintfCString(FMT(x, ##__VA_ARGS__)).get())
#define LOGE(x, ...)                                                   \
  NS_DebugBreak(NS_DEBUG_WARNING,                                      \
                nsPrintfCString(FMT(x, ##__VA_ARGS__)).get(), nullptr, \
                __FILE__, __LINE__)

const char* ExternalEngineEventToStr(ExternalEngineEvent aEvent) {
#define EVENT_TO_STR(event)        \
  case ExternalEngineEvent::event: \
    return #event
  switch (aEvent) {
    EVENT_TO_STR(LoadedMetaData);
    EVENT_TO_STR(LoadedFirstFrame);
    EVENT_TO_STR(LoadedData);
    EVENT_TO_STR(Waiting);
    EVENT_TO_STR(Playing);
    EVENT_TO_STR(Seeked);
    EVENT_TO_STR(BufferingStarted);
    EVENT_TO_STR(BufferingEnded);
    EVENT_TO_STR(Timeupdate);
    EVENT_TO_STR(Ended);
    EVENT_TO_STR(RequestForAudio);
    EVENT_TO_STR(RequestForVideo);
    EVENT_TO_STR(AudioEnough);
    EVENT_TO_STR(VideoEnough);
    default:
      MOZ_ASSERT_UNREACHABLE("Undefined event!");
      return "Undefined";
  }
#undef EVENT_TO_STR
}

/**
 * This class monitors the amount of crash happened for a remote engine
 * process. It the amount of crash of the remote process exceeds the defined
 * threshold, then `ShouldRecoverProcess()` will return false to indicate that
 * we should not keep spawning that remote process because it's too easy to
 * crash.
 *
 * In addition, we also have another mechanism in the media format reader
 * (MFR) to detect crash amount of remote processes, but that would only
 * happen during the decoding process. The main reason to choose using this
 * simple monitor, instead of the mechanism in the MFR is because that
 * mechanism can't detect every crash happening in the remote process, such as
 * crash happening during initializing the remote engine, or setting the CDM
 * pipepline, which can happen prior to decoding.
 */
class ProcessCrashMonitor final {
 public:
  static void NotifyCrash() {
    StaticMutexAutoLock lock(sMutex);
    auto* monitor = ProcessCrashMonitor::EnsureInstance();
    if (!monitor) {
      return;
    }
    monitor->mCrashNums++;
  }
  static bool ShouldRecoverProcess() {
    StaticMutexAutoLock lock(sMutex);
    auto* monitor = ProcessCrashMonitor::EnsureInstance();
    if (!monitor) {
      return false;
    }
    return monitor->mCrashNums <= monitor->mMaxCrashes;
  }

 private:
  ProcessCrashMonitor() : mCrashNums(0) {
#ifdef MOZ_WMF_MEDIA_ENGINE
    mMaxCrashes = StaticPrefs::media_wmf_media_engine_max_crashes();
#else
    mMaxCrashes = 0;
#endif
  };
  ProcessCrashMonitor(const ProcessCrashMonitor&) = delete;
  ProcessCrashMonitor& operator=(const ProcessCrashMonitor&) = delete;

  static ProcessCrashMonitor* EnsureInstance() {
    if (sIsShutdown) {
      return nullptr;
    }
    if (!sCrashMonitor) {
      sCrashMonitor.reset(new ProcessCrashMonitor());
      GetMainThreadSerialEventTarget()->Dispatch(
          NS_NewRunnableFunction("ProcessCrashMonitor::EnsureInstance", [&] {
            RunOnShutdown(
                [&] {
                  StaticMutexAutoLock lock(sMutex);
                  sCrashMonitor.reset();
                  sIsShutdown = true;
                },
                ShutdownPhase::XPCOMShutdown);
          }));
    }
    return sCrashMonitor.get();
  }

  static inline StaticMutex sMutex;
  static inline UniquePtr<ProcessCrashMonitor> sCrashMonitor;
  static inline Atomic<bool> sIsShutdown{false};

  uint32_t mCrashNums;
  uint32_t mMaxCrashes;
};

/* static */
const char* ExternalEngineStateMachine::StateToStr(State aNextState) {
#define STATE_TO_STR(state) \
  case State::state:        \
    return #state
  switch (aNextState) {
    STATE_TO_STR(InitEngine);
    STATE_TO_STR(ReadingMetadata);
    STATE_TO_STR(RunningEngine);
    STATE_TO_STR(SeekingData);
    STATE_TO_STR(ShutdownEngine);
    STATE_TO_STR(RecoverEngine);
    default:
      MOZ_ASSERT_UNREACHABLE("Undefined state!");
      return "Undefined";
  }
#undef STATE_TO_STR
}

const char* ExternalEngineStateMachine::GetStateStr() const {
  return StateToStr(mState.mName);
}

void ExternalEngineStateMachine::ChangeStateTo(State aNextState) {
  LOG("Change state : '%s' -> '%s' (play-state=%d)", StateToStr(mState.mName),
      StateToStr(aNextState), mPlayState.Ref());
  // Assert the possible state transitions.
  MOZ_ASSERT_IF(mState.IsInitEngine(), aNextState == State::ReadingMetadata ||
                                           aNextState == State::ShutdownEngine);
  MOZ_ASSERT_IF(mState.IsReadingMetadata(),
                aNextState == State::RunningEngine ||
                    aNextState == State::ShutdownEngine);
  MOZ_ASSERT_IF(mState.IsRunningEngine(),
                aNextState == State::SeekingData ||
                    aNextState == State::ShutdownEngine ||
                    aNextState == State::RecoverEngine);
  MOZ_ASSERT_IF(mState.IsSeekingData(),
                aNextState == State::RunningEngine ||
                    aNextState == State::ShutdownEngine ||
                    aNextState == State::RecoverEngine);
  MOZ_ASSERT_IF(mState.IsShutdownEngine(), aNextState == State::ShutdownEngine);
  MOZ_ASSERT_IF(
      mState.IsRecoverEngine(),
      aNextState == State::SeekingData || aNextState == State::ShutdownEngine);
  if (aNextState == State::SeekingData) {
    mState = StateObject({StateObject::SeekingData()});
  } else if (aNextState == State::ReadingMetadata) {
    mState = StateObject({StateObject::ReadingMetadata()});
  } else if (aNextState == State::RunningEngine) {
    mState = StateObject({StateObject::RunningEngine()});
  } else if (aNextState == State::ShutdownEngine) {
    mState = StateObject({StateObject::ShutdownEngine()});
  } else if (aNextState == State::RecoverEngine) {
    mState = StateObject({StateObject::RecoverEngine()});
  } else {
    MOZ_ASSERT_UNREACHABLE("Wrong state!");
  }
}

ExternalEngineStateMachine::ExternalEngineStateMachine(
    MediaDecoder* aDecoder, MediaFormatReader* aReader)
    : MediaDecoderStateMachineBase(aDecoder, aReader) {
  LOG("Created ExternalEngineStateMachine");
  MOZ_ASSERT(mState.IsInitEngine());
  InitEngine();
}

void ExternalEngineStateMachine::InitEngine() {
  MOZ_ASSERT(mState.IsInitEngine() || mState.IsRecoverEngine());
#ifdef MOZ_WMF_MEDIA_ENGINE
  mEngine.reset(new MFMediaEngineWrapper(this, mFrameStats));
#endif
  if (mEngine) {
    auto* state = mState.AsInitEngine();
    state->mInitPromise = mEngine->Init(!mMinimizePreroll);
    state->mInitPromise
        ->Then(OwnerThread(), __func__, this,
               &ExternalEngineStateMachine::OnEngineInitSuccess,
               &ExternalEngineStateMachine::OnEngineInitFailure)
        ->Track(state->mEngineInitRequest);
  }
}

void ExternalEngineStateMachine::OnEngineInitSuccess() {
  AssertOnTaskQueue();
  AUTO_PROFILER_LABEL("ExternalEngineStateMachine::OnEngineInitSuccess",
                      MEDIA_PLAYBACK);
  MOZ_ASSERT(mState.IsInitEngine() || mState.IsRecoverEngine());
  LOG("Initialized the external playback engine %" PRIu64, mEngine->Id());
  auto* state = mState.AsInitEngine();
  state->mEngineInitRequest.Complete();
  mReader->UpdateMediaEngineId(mEngine->Id());
  state->mInitPromise = nullptr;
  if (mState.IsInitEngine()) {
    ChangeStateTo(State::ReadingMetadata);
    ReadMetadata();
    return;
  }
  // We just recovered from CDM process crash, so we need to update the media
  // info to the new CDM process.
  MOZ_ASSERT(mInfo);
  mEngine->SetMediaInfo(*mInfo);
  SeekTarget target(mCurrentPosition.Ref(), SeekTarget::Type::Accurate);
  Seek(target);
}

void ExternalEngineStateMachine::OnEngineInitFailure() {
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsInitEngine() || mState.IsRecoverEngine());
  LOGE("Failed to initialize the external playback engine");
  auto* state = mState.AsInitEngine();
  state->mEngineInitRequest.Complete();
  state->mInitPromise = nullptr;
  // TODO : Should fallback to the normal playback with media engine.
  DecodeError(MediaResult(NS_ERROR_DOM_MEDIA_FATAL_ERR, __func__));
}

void ExternalEngineStateMachine::ReadMetadata() {
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsReadingMetadata());
  mReader->ReadMetadata()
      ->Then(OwnerThread(), __func__, this,
             &ExternalEngineStateMachine::OnMetadataRead,
             &ExternalEngineStateMachine::OnMetadataNotRead)
      ->Track(mState.AsReadingMetadata()->mMetadataRequest);
}

void ExternalEngineStateMachine::OnMetadataRead(MetadataHolder&& aMetadata) {
  AssertOnTaskQueue();
  AUTO_PROFILER_LABEL("ExternalEngineStateMachine::OnMetadataRead",
                      MEDIA_PLAYBACK);
  MOZ_ASSERT(mState.IsReadingMetadata());
  LOG("OnMetadataRead");

  mState.AsReadingMetadata()->mMetadataRequest.Complete();
  mInfo.emplace(*aMetadata.mInfo);
  mMediaSeekable = Info().mMediaSeekable;
  mMediaSeekableOnlyInBufferedRanges =
      Info().mMediaSeekableOnlyInBufferedRanges;

  if (!IsFormatSupportedByExternalEngine(*mInfo)) {
    // The external engine doesn't support the type, try to notify the decoder
    // to use our own state machine again.
    DecodeError(
        MediaResult(NS_ERROR_DOM_MEDIA_EXTERNAL_ENGINE_NOT_SUPPORTED_ERR));
    return;
  }

#ifdef MOZ_WMF_MEDIA_ENGINE
  // Only support encrypted playback.
  if (!mInfo->IsEncrypted() &&
      StaticPrefs::media_wmf_media_engine_enabled() == 2) {
    LOG("External engine only supports encrypted playback by the pref");
    DecodeError(
        MediaResult(NS_ERROR_DOM_MEDIA_EXTERNAL_ENGINE_NOT_SUPPORTED_ERR));
    return;
  }
#endif

  mEngine->SetMediaInfo(*mInfo);

  if (Info().mMetadataDuration.isSome()) {
    mDuration = Info().mMetadataDuration;
  } else if (Info().mUnadjustedMetadataEndTime.isSome()) {
    const media::TimeUnit unadjusted = Info().mUnadjustedMetadataEndTime.ref();
    const media::TimeUnit adjustment = Info().mStartTime;
    mInfo->mMetadataDuration.emplace(unadjusted - adjustment);
    mDuration = Info().mMetadataDuration;
  }

  // If we don't know the duration by this point, we assume infinity, per spec.
  if (mDuration.Ref().isNothing()) {
    mDuration = Some(media::TimeUnit::FromInfinity());
  }
  MOZ_ASSERT(mDuration.Ref().isSome());

  if (mInfo->HasVideo()) {
    mVideoDisplay = mInfo->mVideo.mDisplay;
  }

  LOG("Metadata loaded : a=%s, v=%s, size=[%dx%d], duration=%s",
      mInfo->HasAudio() ? mInfo->mAudio.mMimeType.get() : "none",
      mInfo->HasVideo() ? mInfo->mVideo.mMimeType.get() : "none",
      mVideoDisplay.width, mVideoDisplay.height,
      mDuration.Ref()->ToString().get());

  mMetadataLoadedEvent.Notify(std::move(aMetadata.mInfo),
                              std::move(aMetadata.mTags),
                              MediaDecoderEventVisibility::Observable);
  StartRunningEngine();
}

void ExternalEngineStateMachine::OnMetadataNotRead(const MediaResult& aError) {
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsReadingMetadata());
  LOGE("Decode metadata failed, shutting down decoder");
  mState.AsReadingMetadata()->mMetadataRequest.Complete();
  DecodeError(aError);
}

bool ExternalEngineStateMachine::IsFormatSupportedByExternalEngine(
    const MediaInfo& aInfo) {
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsReadingMetadata());
#ifdef MOZ_WMF_MEDIA_ENGINE
  const bool audioSupported =
      !aInfo.HasAudio() ||
      MFMediaEngineDecoderModule::SupportsConfig(aInfo.mAudio);
  const bool videoSupported =
      !aInfo.HasVideo() ||
      MFMediaEngineDecoderModule::SupportsConfig(aInfo.mVideo);
  LOG("audio=%s (supported=%d), video=%s(supported=%d)",
      aInfo.HasAudio() ? aInfo.mAudio.mMimeType.get() : "none", audioSupported,
      aInfo.HasVideo() ? aInfo.mVideo.mMimeType.get() : "none", videoSupported);
  return audioSupported && videoSupported;
#else
  return false;
#endif
}

RefPtr<MediaDecoder::SeekPromise> ExternalEngineStateMachine::Seek(
    const SeekTarget& aTarget) {
  AssertOnTaskQueue();
  if (!mState.IsRunningEngine() && !mState.IsSeekingData() &&
      !mState.IsRecoverEngine()) {
    MOZ_ASSERT(false, "Can't seek due to unsupported state.");
    return MediaDecoder::SeekPromise::CreateAndReject(true, __func__);
  }
  // We don't support these type of seek, because they're depending on the
  // implementation of the external engine, which might not be supported.
  if (aTarget.IsNextFrame() || aTarget.IsVideoOnly()) {
    return MediaDecoder::SeekPromise::CreateAndReject(true, __func__);
  }

  LOG("Start seeking to %" PRId64, aTarget.GetTime().ToMicroseconds());
  auto* state = mState.AsSeekingData();
  if (!state) {
    // We're in other states, so change the state to seeking.
    ChangeStateTo(State::SeekingData);
    state = mState.AsSeekingData();
  }
  state->SetTarget(aTarget);

  // Update related status.
  mSentPlaybackEndedEvent = false;
  mOnPlaybackEvent.Notify(MediaPlaybackEvent::SeekStarted);
  mOnNextFrameStatus.Notify(MediaDecoderOwner::NEXT_FRAME_UNAVAILABLE_SEEKING);

  // Notify the external playback engine about seeking. After the engine changes
  // its current time, it would send `seeked` event.
  mEngine->Seek(aTarget.GetTime());
  state->mWaitingEngineSeeked = true;
  SeekReader();
  return state->mSeekJob.mPromise.Ensure(__func__);
}

void ExternalEngineStateMachine::SeekReader() {
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsSeekingData());
  auto* state = mState.AsSeekingData();

  // Reset the reader first and ask it to perform a demuxer seek.
  ResetDecode();
  state->mWaitingReaderSeeked = true;
  LOG("Seek reader to %" PRId64, state->GetTargetTime().ToMicroseconds());
  mReader->Seek(state->mSeekJob.mTarget.ref())
      ->Then(OwnerThread(), __func__, this,
             &ExternalEngineStateMachine::OnSeekResolved,
             &ExternalEngineStateMachine::OnSeekRejected)
      ->Track(state->mSeekRequest);
}

void ExternalEngineStateMachine::OnSeekResolved(const media::TimeUnit& aUnit) {
  AUTO_PROFILER_LABEL("ExternalEngineStateMachine::OnSeekResolved",
                      MEDIA_PLAYBACK);
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsSeekingData());
  auto* state = mState.AsSeekingData();

  LOG("OnReaderSeekResolved");
  state->mSeekRequest.Complete();
  state->mWaitingReaderSeeked = false;

  // Start sending new data to the external playback engine.
  if (HasAudio()) {
    mHasEnoughAudio = false;
    OnRequestAudio();
  }
  if (HasVideo()) {
    mHasEnoughVideo = false;
    OnRequestVideo();
  }
  CheckIfSeekCompleted();
}

void ExternalEngineStateMachine::OnSeekRejected(
    const SeekRejectValue& aReject) {
  AUTO_PROFILER_LABEL("ExternalEngineStateMachine::OnSeekRejected",
                      MEDIA_PLAYBACK);
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsSeekingData());
  auto* state = mState.AsSeekingData();

  LOG("OnReaderSeekRejected");
  state->mSeekRequest.Complete();
  if (aReject.mError == NS_ERROR_DOM_MEDIA_WAITING_FOR_DATA) {
    LOG("OnSeekRejected reason=WAITING_FOR_DATA type=%s",
        MediaData::TypeToStr(aReject.mType));
    MOZ_ASSERT_IF(aReject.mType == MediaData::Type::AUDIO_DATA,
                  !IsRequestingAudioData());
    MOZ_ASSERT_IF(aReject.mType == MediaData::Type::VIDEO_DATA,
                  !IsRequestingVideoData());
    MOZ_ASSERT_IF(aReject.mType == MediaData::Type::AUDIO_DATA,
                  !IsWaitingAudioData());
    MOZ_ASSERT_IF(aReject.mType == MediaData::Type::VIDEO_DATA,
                  !IsWaitingVideoData());

    // Fire 'waiting' to notify the player that we are waiting for data.
    mOnNextFrameStatus.Notify(
        MediaDecoderOwner::NEXT_FRAME_UNAVAILABLE_SEEKING);
    WaitForData(aReject.mType);
    return;
  }

  if (aReject.mError == NS_ERROR_DOM_MEDIA_END_OF_STREAM) {
    EndOfStream(aReject.mType);
    return;
  }

  MOZ_ASSERT(NS_FAILED(aReject.mError),
             "Cancels should also disconnect mSeekRequest");
  state->RejectIfExists(__func__);
  DecodeError(aReject.mError);
}

bool ExternalEngineStateMachine::IsSeeking() {
  AssertOnTaskQueue();
  const auto* state = mState.AsSeekingData();
  return state && state->IsSeeking();
}

void ExternalEngineStateMachine::CheckIfSeekCompleted() {
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsSeekingData());
  auto* state = mState.AsSeekingData();
  if (state->mWaitingEngineSeeked || state->mWaitingReaderSeeked) {
    LOG("Seek hasn't been completed yet, waitEngineSeeked=%d, "
        "waitReaderSeeked=%d",
        state->mWaitingEngineSeeked, state->mWaitingReaderSeeked);
    return;
  }

  // As seeking should be accurate and we can't control the exact timing inside
  // the external media engine. We always set the newCurrentTime = seekTime
  // so that the updated HTMLMediaElement.currentTime will always be the seek
  // target.
  if (state->GetTargetTime() != mCurrentPosition) {
    LOG("Force adjusting current time (%" PRId64
        ") to match to target (%" PRId64 ")",
        mCurrentPosition.Ref().ToMicroseconds(),
        state->GetTargetTime().ToMicroseconds());
    mCurrentPosition = state->GetTargetTime();
  }

  LOG("Seek completed");
  state->Resolve(__func__);
  mOnPlaybackEvent.Notify(MediaPlaybackEvent::Invalidate);
  mOnNextFrameStatus.Notify(MediaDecoderOwner::NEXT_FRAME_AVAILABLE);
  StartRunningEngine();
}

void ExternalEngineStateMachine::ResetDecode() {
  AssertOnTaskQueue();
  if (!mInfo) {
    return;
  }

  LOG("ResetDecode");
  MediaFormatReader::TrackSet tracks;
  if (HasVideo()) {
    mVideoDataRequest.DisconnectIfExists();
    mVideoWaitRequest.DisconnectIfExists();
    tracks += TrackInfo::kVideoTrack;
  }
  if (HasAudio()) {
    mAudioDataRequest.DisconnectIfExists();
    mAudioWaitRequest.DisconnectIfExists();
    tracks += TrackInfo::kAudioTrack;
  }
  mReader->ResetDecode(tracks);
}

RefPtr<GenericPromise> ExternalEngineStateMachine::InvokeSetSink(
    const RefPtr<AudioDeviceInfo>& aSink) {
  MOZ_ASSERT(NS_IsMainThread());
  // TODO : can media engine support this?
  return GenericPromise::CreateAndReject(NS_ERROR_FAILURE, __func__);
}

RefPtr<ShutdownPromise> ExternalEngineStateMachine::Shutdown() {
  AssertOnTaskQueue();
  if (mState.IsShutdownEngine()) {
    LOG("Already shutdown");
    return mState.AsShutdownEngine()->mShutdown;
  }

  LOG("Shutdown");
  ChangeStateTo(State::ShutdownEngine);
  ResetDecode();

  mAudioDataRequest.DisconnectIfExists();
  mVideoDataRequest.DisconnectIfExists();
  mAudioWaitRequest.DisconnectIfExists();
  mVideoWaitRequest.DisconnectIfExists();

  mDuration.DisconnectAll();
  mCurrentPosition.DisconnectAll();
  // TODO : implement audible check
  mIsAudioDataAudible.DisconnectAll();

  mMetadataManager.Disconnect();

  mSetCDMProxyPromise.RejectIfExists(NS_ERROR_DOM_MEDIA_ABORT_ERR, __func__);
  mSetCDMProxyRequest.DisconnectIfExists();

  mEngine->Shutdown();

  auto* state = mState.AsShutdownEngine();
  state->mShutdown = mReader->Shutdown()->Then(
      OwnerThread(), __func__, [self = RefPtr{this}, this]() {
        LOG("Shutting down state machine task queue");
        return OwnerThread()->BeginShutdown();
      });
  return state->mShutdown;
}

void ExternalEngineStateMachine::BufferedRangeUpdated() {
  AssertOnTaskQueue();
  AUTO_PROFILER_LABEL("ExternalEngineStateMachine::BufferedRangeUpdated",
                      MEDIA_PLAYBACK);

  // While playing an unseekable stream of unknown duration, mDuration
  // is updated as we play. But if data is being downloaded
  // faster than played, mDuration won't reflect the end of playable data
  // since we haven't played the frame at the end of buffered data. So update
  // mDuration here as new data is downloaded to prevent such a lag.
  if (mBuffered.Ref().IsInvalid()) {
    return;
  }

  bool exists;
  media::TimeUnit end{mBuffered.Ref().GetEnd(&exists)};
  if (!exists) {
    return;
  }

  // Use estimated duration from buffer ranges when mDuration is unknown or
  // the estimated duration is larger.
  if (mDuration.Ref().isNothing() || mDuration.Ref()->IsInfinite() ||
      end > mDuration.Ref().ref()) {
    mDuration = Some(end);
    DDLOG(DDLogCategory::Property, "duration_us",
          mDuration.Ref()->ToMicroseconds());
  }
}

// Note: the variadic only supports passing member variables.
#define PERFORM_WHEN_ALLOW(Func, ...)                                         \
  do {                                                                        \
    /* Initialzation is not done yet, postpone the operation */               \
    if ((mState.IsInitEngine() || mState.IsRecoverEngine()) &&                \
        mState.AsInitEngine()->mInitPromise) {                                \
      LOG("%s is called before init", __func__);                              \
      mState.AsInitEngine()->mInitPromise->Then(                              \
          OwnerThread(), __func__,                                            \
          [self = RefPtr{this}, this](                                        \
              const GenericNonExclusivePromise::ResolveOrRejectValue& aVal) { \
            if (aVal.IsResolve()) {                                           \
              Func(__VA_ARGS__);                                              \
            }                                                                 \
          });                                                                 \
      return;                                                                 \
    } else if (mState.IsShutdownEngine()) {                                   \
      return;                                                                 \
    }                                                                         \
  } while (false)

void ExternalEngineStateMachine::SetPlaybackRate(double aPlaybackRate) {
  AssertOnTaskQueue();
  mPlaybackRate = aPlaybackRate;
  PERFORM_WHEN_ALLOW(SetPlaybackRate, mPlaybackRate);
  mEngine->SetPlaybackRate(aPlaybackRate);
}

void ExternalEngineStateMachine::VolumeChanged() {
  AssertOnTaskQueue();
  PERFORM_WHEN_ALLOW(VolumeChanged);
  mEngine->SetVolume(mVolume);
}

void ExternalEngineStateMachine::PreservesPitchChanged() {
  AssertOnTaskQueue();
  PERFORM_WHEN_ALLOW(PreservesPitchChanged);
  mEngine->SetPreservesPitch(mPreservesPitch);
}

void ExternalEngineStateMachine::PlayStateChanged() {
  AssertOnTaskQueue();
  PERFORM_WHEN_ALLOW(PlayStateChanged);
  if (mPlayState == MediaDecoder::PLAY_STATE_PLAYING) {
    mEngine->Play();
  } else if (mPlayState == MediaDecoder::PLAY_STATE_PAUSED) {
    mEngine->Pause();
  }
}

void ExternalEngineStateMachine::LoopingChanged() {
  AssertOnTaskQueue();
  PERFORM_WHEN_ALLOW(LoopingChanged);
  mEngine->SetLooping(mLooping);
}

#undef PERFORM_WHEN_ALLOW

void ExternalEngineStateMachine::EndOfStream(MediaData::Type aType) {
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsRunningEngine() || mState.IsSeekingData());
  static auto DataTypeToTrackType = [](const MediaData::Type& aType) {
    if (aType == MediaData::Type::VIDEO_DATA) {
      return TrackInfo::TrackType::kVideoTrack;
    }
    if (aType == MediaData::Type::AUDIO_DATA) {
      return TrackInfo::TrackType::kAudioTrack;
    }
    return TrackInfo::TrackType::kUndefinedTrack;
  };
  mEngine->NotifyEndOfStream(DataTypeToTrackType(aType));
}

void ExternalEngineStateMachine::WaitForData(MediaData::Type aType) {
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsRunningEngine() || mState.IsSeekingData());
  AUTO_PROFILER_LABEL("ExternalEngineStateMachine::WaitForData",
                      MEDIA_PLAYBACK);
  MOZ_ASSERT(aType == MediaData::Type::AUDIO_DATA ||
             aType == MediaData::Type::VIDEO_DATA);

  LOG("WaitForData");
  RefPtr<ExternalEngineStateMachine> self = this;
  if (aType == MediaData::Type::AUDIO_DATA) {
    MOZ_ASSERT(HasAudio());
    mReader->WaitForData(MediaData::Type::AUDIO_DATA)
        ->Then(
            OwnerThread(), __func__,
            [self, this](MediaData::Type aType) {
              AUTO_PROFILER_LABEL(
                  "ExternalEngineStateMachine::WaitForData:AudioResolved",
                  MEDIA_PLAYBACK);
              MOZ_ASSERT(aType == MediaData::Type::AUDIO_DATA);
              LOG("Done waiting for audio data");
              mAudioWaitRequest.Complete();
              MaybeFinishWaitForData();
            },
            [self, this](const WaitForDataRejectValue& aRejection) {
              AUTO_PROFILER_LABEL(
                  "ExternalEngineStateMachine::WaitForData:AudioRejected",
                  MEDIA_PLAYBACK);
              mAudioWaitRequest.Complete();
              DecodeError(NS_ERROR_DOM_MEDIA_WAITING_FOR_DATA);
            })
        ->Track(mAudioWaitRequest);
  } else {
    MOZ_ASSERT(HasVideo());
    mReader->WaitForData(MediaData::Type::VIDEO_DATA)
        ->Then(
            OwnerThread(), __func__,
            [self, this](MediaData::Type aType) {
              AUTO_PROFILER_LABEL(
                  "ExternalEngineStateMachine::WaitForData:VideoResolved",
                  MEDIA_PLAYBACK);
              MOZ_ASSERT(aType == MediaData::Type::VIDEO_DATA);
              LOG("Done waiting for video data");
              mVideoWaitRequest.Complete();
              MaybeFinishWaitForData();
            },
            [self, this](const WaitForDataRejectValue& aRejection) {
              AUTO_PROFILER_LABEL(
                  "ExternalEngineStateMachine::WaitForData:VideoRejected",
                  MEDIA_PLAYBACK);
              mVideoWaitRequest.Complete();
              DecodeError(NS_ERROR_DOM_MEDIA_WAITING_FOR_DATA);
            })
        ->Track(mVideoWaitRequest);
  }
}

void ExternalEngineStateMachine::MaybeFinishWaitForData() {
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsRunningEngine() || mState.IsSeekingData());

  bool isWaitingForAudio = HasAudio() && mAudioWaitRequest.Exists();
  bool isWaitingForVideo = HasVideo() && mVideoWaitRequest.Exists();
  if (isWaitingForAudio || isWaitingForVideo) {
    LOG("Still waiting for data (waitAudio=%d, waitVideo=%d)",
        isWaitingForAudio, isWaitingForVideo);
    return;
  }

  LOG("Finished waiting for data");
  if (mState.IsSeekingData()) {
    SeekReader();
    return;
  }
  if (HasAudio()) {
    RunningEngineUpdate(MediaData::Type::AUDIO_DATA);
  }
  if (HasVideo()) {
    RunningEngineUpdate(MediaData::Type::VIDEO_DATA);
  }
}

void ExternalEngineStateMachine::StartRunningEngine() {
  ChangeStateTo(State::RunningEngine);
  // Manually check the play state because the engine might be recovered from
  // crash or just get recreated, so PlayStateChanged() won't be triggered.
  if (mPlayState == MediaDecoder::PLAY_STATE_PLAYING) {
    mEngine->Play();
  }
  if (HasAudio()) {
    RunningEngineUpdate(MediaData::Type::AUDIO_DATA);
  }
  if (HasVideo()) {
    RunningEngineUpdate(MediaData::Type::VIDEO_DATA);
  }
}

void ExternalEngineStateMachine::RunningEngineUpdate(MediaData::Type aType) {
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsRunningEngine() || mState.IsSeekingData());
  if (aType == MediaData::Type::AUDIO_DATA && !mHasEnoughAudio) {
    OnRequestAudio();
  }
  if (aType == MediaData::Type::VIDEO_DATA && !mHasEnoughVideo) {
    OnRequestVideo();
  }
}

void ExternalEngineStateMachine::OnRequestAudio() {
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsRunningEngine() || mState.IsSeekingData());
  LOGV("OnRequestAudio");

  if (!HasAudio()) {
    return;
  }

  if (IsRequestingAudioData() || mAudioWaitRequest.Exists() || IsSeeking()) {
    LOGV(
        "No need to request audio, isRequesting=%d, waitingAudio=%d, "
        "isSeeking=%d",
        IsRequestingAudioData(), mAudioWaitRequest.Exists(), IsSeeking());
    return;
  }

  LOGV("Start requesting audio");
  PerformanceRecorder<PlaybackStage> perfRecorder(MediaStage::RequestData);
  RefPtr<ExternalEngineStateMachine> self = this;
  mReader->RequestAudioData()
      ->Then(
          OwnerThread(), __func__,
          [this, self, perfRecorder(std::move(perfRecorder))](
              const RefPtr<AudioData>& aAudio) mutable {
            perfRecorder.Record();
            mAudioDataRequest.Complete();
            LOGV("Completed requesting audio");
            AUTO_PROFILER_LABEL(
                "ExternalEngineStateMachine::OnRequestAudio:Resolved",
                MEDIA_PLAYBACK);
            MOZ_ASSERT(aAudio);
            RunningEngineUpdate(MediaData::Type::AUDIO_DATA);
          },
          [this, self](const MediaResult& aError) {
            mAudioDataRequest.Complete();
            AUTO_PROFILER_LABEL(
                "ExternalEngineStateMachine::OnRequestAudio:Rejected",
                MEDIA_PLAYBACK);
            LOG("OnRequestAudio ErrorName=%s Message=%s",
                aError.ErrorName().get(), aError.Message().get());
            switch (aError.Code()) {
              case NS_ERROR_DOM_MEDIA_WAITING_FOR_DATA:
                WaitForData(MediaData::Type::AUDIO_DATA);
                break;
              case NS_ERROR_DOM_MEDIA_CANCELED:
                OnRequestAudio();
                break;
              case NS_ERROR_DOM_MEDIA_END_OF_STREAM:
                LOG("Reach to the end, no more audio data");
                EndOfStream(MediaData::Type::AUDIO_DATA);
                break;
              case NS_ERROR_DOM_MEDIA_REMOTE_DECODER_CRASHED_MF_CDM_ERR:
                // We will handle the process crash in `NotifyErrorInternal()`
                // so here just silently ignore this.
                break;
              default:
                DecodeError(aError);
            }
          })
      ->Track(mAudioDataRequest);
}

void ExternalEngineStateMachine::OnRequestVideo() {
  AssertOnTaskQueue();
  MOZ_ASSERT(mState.IsRunningEngine() || mState.IsSeekingData());
  LOGV("OnRequestVideo");

  if (!HasVideo()) {
    return;
  }

  if (IsRequestingVideoData() || mVideoWaitRequest.Exists() || IsSeeking()) {
    LOGV(
        "No need to request video, isRequesting=%d, waitingVideo=%d, "
        "isSeeking=%d",
        IsRequestingVideoData(), mVideoWaitRequest.Exists(), IsSeeking());
    return;
  }

  LOGV("Start requesting video");
  PerformanceRecorder<PlaybackStage> perfRecorder(MediaStage::RequestData,
                                                  Info().mVideo.mImage.height);
  RefPtr<ExternalEngineStateMachine> self = this;
  mReader->RequestVideoData(GetVideoThreshold(), false)
      ->Then(
          OwnerThread(), __func__,
          [this, self, perfRecorder(std::move(perfRecorder))](
              const RefPtr<VideoData>& aVideo) mutable {
            perfRecorder.Record();
            mVideoDataRequest.Complete();
            LOGV("Completed requesting video");
            AUTO_PROFILER_LABEL(
                "ExternalEngineStateMachine::OnRequestVideo:Resolved",
                MEDIA_PLAYBACK);
            MOZ_ASSERT(aVideo);
            if (!mHasReceivedFirstDecodedVideoFrame) {
              mHasReceivedFirstDecodedVideoFrame = true;
              OnLoadedFirstFrame();
            }
            RunningEngineUpdate(MediaData::Type::VIDEO_DATA);
            // Send image to PIP window.
            if (mSecondaryVideoContainer.Ref()) {
              mSecondaryVideoContainer.Ref()->SetCurrentFrame(
                  mVideoDisplay, aVideo->mImage, TimeStamp::Now());
            } else {
              mVideoFrameContainer->SetCurrentFrame(
                  mVideoDisplay, aVideo->mImage, TimeStamp::Now());
            }
          },
          [this, self](const MediaResult& aError) {
            mVideoDataRequest.Complete();
            AUTO_PROFILER_LABEL(
                "ExternalEngineStateMachine::OnRequestVideo:Rejected",
                MEDIA_PLAYBACK);
            LOG("OnRequestVideo ErrorName=%s Message=%s",
                aError.ErrorName().get(), aError.Message().get());
            switch (aError.Code()) {
              case NS_ERROR_DOM_MEDIA_WAITING_FOR_DATA:
                WaitForData(MediaData::Type::VIDEO_DATA);
                break;
              case NS_ERROR_DOM_MEDIA_CANCELED:
                OnRequestVideo();
                break;
              case NS_ERROR_DOM_MEDIA_END_OF_STREAM:
                LOG("Reach to the end, no more video data");
                EndOfStream(MediaData::Type::VIDEO_DATA);
                break;
              case NS_ERROR_DOM_MEDIA_REMOTE_DECODER_CRASHED_MF_CDM_ERR:
                // We will handle the process crash in `NotifyErrorInternal()`
                // so here just silently ignore this.
                break;
              default:
                DecodeError(aError);
            }
          })
      ->Track(mVideoDataRequest);
}

void ExternalEngineStateMachine::OnLoadedFirstFrame() {
  AssertOnTaskQueue();
  // We will wait until receive the first video frame.
  if (mInfo->HasVideo() && !mHasReceivedFirstDecodedVideoFrame) {
    LOGV("Hasn't received first decoded video frame");
    return;
  }
  LOGV("OnLoadedFirstFrame");
  MediaDecoderEventVisibility visibility =
      mSentFirstFrameLoadedEvent ? MediaDecoderEventVisibility::Suppressed
                                 : MediaDecoderEventVisibility::Observable;
  mSentFirstFrameLoadedEvent = true;
  mFirstFrameLoadedEvent.Notify(UniquePtr<MediaInfo>(new MediaInfo(Info())),
                                visibility);
  mOnNextFrameStatus.Notify(MediaDecoderOwner::NEXT_FRAME_AVAILABLE);
}

void ExternalEngineStateMachine::OnLoadedData() {
  AssertOnTaskQueue();
  // In case the external engine doesn't send the first frame loaded event
  // correctly.
  if (!mSentFirstFrameLoadedEvent) {
    OnLoadedFirstFrame();
  }
  mOnNextFrameStatus.Notify(MediaDecoderOwner::NEXT_FRAME_AVAILABLE);
}

void ExternalEngineStateMachine::OnWaiting() {
  AssertOnTaskQueue();
  mOnNextFrameStatus.Notify(
      MediaDecoderOwner::NEXT_FRAME_UNAVAILABLE_BUFFERING);
}

void ExternalEngineStateMachine::OnPlaying() {
  AssertOnTaskQueue();
  mOnNextFrameStatus.Notify(MediaDecoderOwner::NEXT_FRAME_AVAILABLE);
}

void ExternalEngineStateMachine::OnSeeked() {
  AssertOnTaskQueue();
  if (!mState.IsSeekingData()) {
    LOG("Engine Seeking has been completed, ignore the event");
    return;
  }
  MOZ_ASSERT(mState.IsSeekingData());

  const auto currentTime = mEngine->GetCurrentPosition();
  auto* state = mState.AsSeekingData();
  LOG("OnEngineSeeked, target=%" PRId64 ", currentTime=%" PRId64,
      state->GetTargetTime().ToMicroseconds(), currentTime.ToMicroseconds());
  // It's possible to receive multiple seeked event if we seek the engine
  // before the previous seeking finishes, so we would wait until the last
  // seeking is finished.
  if (currentTime >= state->GetTargetTime()) {
    state->mWaitingEngineSeeked = false;
    CheckIfSeekCompleted();
  }
}

void ExternalEngineStateMachine::OnBufferingStarted() {
  AssertOnTaskQueue();
  mOnNextFrameStatus.Notify(
      MediaDecoderOwner::NEXT_FRAME_UNAVAILABLE_BUFFERING);
  if (HasAudio()) {
    WaitForData(MediaData::Type::AUDIO_DATA);
  }
  if (HasVideo()) {
    WaitForData(MediaData::Type::VIDEO_DATA);
  }
}

void ExternalEngineStateMachine::OnBufferingEnded() {
  AssertOnTaskQueue();
  mOnNextFrameStatus.Notify(MediaDecoderOwner::NEXT_FRAME_AVAILABLE);
}

void ExternalEngineStateMachine::OnEnded() {
  AssertOnTaskQueue();
  if (mSentPlaybackEndedEvent) {
    return;
  }
  LOG("Playback is ended");
  mOnNextFrameStatus.Notify(MediaDecoderOwner::NEXT_FRAME_UNAVAILABLE);
  mOnPlaybackEvent.Notify(MediaPlaybackEvent::PlaybackEnded);
  mSentPlaybackEndedEvent = true;
}

void ExternalEngineStateMachine::OnTimeupdate() {
  AssertOnTaskQueue();
  if (IsSeeking()) {
    return;
  }
  mCurrentPosition = mEngine->GetCurrentPosition();
  if (mDuration.Ref().ref() < mCurrentPosition.Ref()) {
    mDuration = Some(mCurrentPosition.Ref());
  }
}

void ExternalEngineStateMachine::NotifyEventInternal(
    ExternalEngineEvent aEvent) {
  AssertOnTaskQueue();
  AUTO_PROFILER_LABEL("ExternalEngineStateMachine::NotifyEventInternal",
                      MEDIA_PLAYBACK);
  LOG("Receive event %s", ExternalEngineEventToStr(aEvent));
  if (mState.IsShutdownEngine()) {
    return;
  }
  switch (aEvent) {
    case ExternalEngineEvent::LoadedMetaData:
      // We read metadata by ourselves, ignore this if there is any.
      MOZ_ASSERT(mInfo);
      break;
    case ExternalEngineEvent::LoadedFirstFrame:
      OnLoadedFirstFrame();
      break;
    case ExternalEngineEvent::LoadedData:
      OnLoadedData();
      break;
    case ExternalEngineEvent::Waiting:
      OnWaiting();
      break;
    case ExternalEngineEvent::Playing:
      OnPlaying();
      break;
    case ExternalEngineEvent::Seeked:
      OnSeeked();
      break;
    case ExternalEngineEvent::BufferingStarted:
      OnBufferingStarted();
      break;
    case ExternalEngineEvent::BufferingEnded:
      OnBufferingEnded();
      break;
    case ExternalEngineEvent::Timeupdate:
      OnTimeupdate();
      break;
    case ExternalEngineEvent::Ended:
      OnEnded();
      break;
    case ExternalEngineEvent::RequestForAudio:
      mHasEnoughAudio = false;
      if (ShouldRunEngineUpdateForRequest()) {
        RunningEngineUpdate(MediaData::Type::AUDIO_DATA);
      }
      break;
    case ExternalEngineEvent::RequestForVideo:
      mHasEnoughVideo = false;
      if (ShouldRunEngineUpdateForRequest()) {
        RunningEngineUpdate(MediaData::Type::VIDEO_DATA);
      }
      break;
    case ExternalEngineEvent::AudioEnough:
      mHasEnoughAudio = true;
      break;
    case ExternalEngineEvent::VideoEnough:
      mHasEnoughVideo = true;
      break;
    default:
      MOZ_ASSERT_UNREACHABLE("Undefined event!");
      break;
  }
}

bool ExternalEngineStateMachine::ShouldRunEngineUpdateForRequest() {
  // Running engine update will request new data, which could be run on
  // `RunningEngine` or `SeekingData` state. However, in `SeekingData` we should
  // only request new data after finishing reader seek, otherwise the reader
  // would start requesting data from a wrong position.
  return mState.IsRunningEngine() ||
         (mState.AsSeekingData() &&
          !mState.AsSeekingData()->mWaitingReaderSeeked);
}

void ExternalEngineStateMachine::NotifyErrorInternal(
    const MediaResult& aError) {
  AssertOnTaskQueue();
  LOG("Engine error: %s", aError.Description().get());
  if (aError == NS_ERROR_DOM_MEDIA_NOT_SUPPORTED_ERR) {
    // The external engine doesn't support the type, try to notify the decoder
    // to use our own state machine again.
    DecodeError(
        MediaResult(NS_ERROR_DOM_MEDIA_EXTERNAL_ENGINE_NOT_SUPPORTED_ERR));
  } else if (aError == NS_ERROR_DOM_MEDIA_REMOTE_DECODER_CRASHED_MF_CDM_ERR) {
    RecoverFromCDMProcessCrashIfNeeded();
  } else {
    DecodeError(aError);
  }
}

void ExternalEngineStateMachine::NotifyResizingInternal(uint32_t aWidth,
                                                        uint32_t aHeight) {
  LOG("video resize from [%d,%d] to [%d,%d]", mVideoDisplay.width,
      mVideoDisplay.height, aWidth, aHeight);
  mVideoDisplay = gfx::IntSize{aWidth, aHeight};
}

void ExternalEngineStateMachine::RecoverFromCDMProcessCrashIfNeeded() {
  AssertOnTaskQueue();
  if (mState.IsRecoverEngine()) {
    return;
  }
  ProcessCrashMonitor::NotifyCrash();
  if (!ProcessCrashMonitor::ShouldRecoverProcess()) {
    LOG("CDM process has crashed too many times, abort recovery");
    DecodeError(
        MediaResult(NS_ERROR_DOM_MEDIA_EXTERNAL_ENGINE_NOT_SUPPORTED_ERR));
    return;
  }

  LOG("CDM process crashed, recover the engine again (last time=%" PRId64 ")",
      mCurrentPosition.Ref().ToMicroseconds());
  ChangeStateTo(State::RecoverEngine);
  if (HasVideo()) {
    mVideoDataRequest.DisconnectIfExists();
    mVideoWaitRequest.DisconnectIfExists();
  }
  if (HasAudio()) {
    mAudioDataRequest.DisconnectIfExists();
    mAudioWaitRequest.DisconnectIfExists();
  }
  // Ask the reader to shutdown current decoders which are no longer available
  // due to the remote process crash.
  mReader->ReleaseResources();
  InitEngine();
}

media::TimeUnit ExternalEngineStateMachine::GetVideoThreshold() {
  AssertOnTaskQueue();
  if (auto* state = mState.AsSeekingData()) {
    return state->GetTargetTime();
  }
  return mCurrentPosition.Ref();
}

void ExternalEngineStateMachine::UpdateSecondaryVideoContainer() {
  AssertOnTaskQueue();
  LOG("UpdateSecondaryVideoContainer=%p", mSecondaryVideoContainer.Ref().get());
  mOnSecondaryVideoContainerInstalled.Notify(mSecondaryVideoContainer.Ref());
}

RefPtr<SetCDMPromise> ExternalEngineStateMachine::SetCDMProxy(
    CDMProxy* aProxy) {
  if (mState.IsShutdownEngine()) {
    return SetCDMPromise::CreateAndReject(NS_ERROR_FAILURE, __func__);
  }

  if (mState.IsInitEngine() && mState.AsInitEngine()->mInitPromise) {
    LOG("SetCDMProxy is called before init");
    mState.AsInitEngine()->mInitPromise->Then(
        OwnerThread(), __func__,
        [self = RefPtr{this}, proxy = RefPtr{aProxy},
         this](const GenericNonExclusivePromise::ResolveOrRejectValue& aVal) {
          SetCDMProxy(proxy)
              ->Then(OwnerThread(), __func__,
                     [self = RefPtr{this},
                      this](const SetCDMPromise::ResolveOrRejectValue& aVal) {
                       mSetCDMProxyRequest.Complete();
                       if (aVal.IsResolve()) {
                         mSetCDMProxyPromise.Resolve(true, __func__);
                       } else {
                         mSetCDMProxyPromise.Reject(NS_ERROR_DOM_MEDIA_CDM_ERR,
                                                    __func__);
                       }
                     })
              ->Track(mSetCDMProxyRequest);
        });
    return mSetCDMProxyPromise.Ensure(__func__);
  }

  // TODO : set CDM proxy again if we recreate the media engine after crash.
  LOG("SetCDMProxy=%p", aProxy);
  MOZ_DIAGNOSTIC_ASSERT(mEngine);
  if (!mEngine->SetCDMProxy(aProxy)) {
    LOG("Failed to set CDM proxy on the engine");
    return SetCDMPromise::CreateAndReject(NS_ERROR_DOM_MEDIA_CDM_ERR, __func__);
  }
  return MediaDecoderStateMachineBase::SetCDMProxy(aProxy);
}

bool ExternalEngineStateMachine::IsCDMProxySupported(CDMProxy* aProxy) {
#ifdef MOZ_WMF_CDM
  MOZ_ASSERT(aProxy);
  // 1=enabled encrypted and clear, 2=enabled encrytped
  if (StaticPrefs::media_wmf_media_engine_enabled() != 1 &&
      StaticPrefs::media_wmf_media_engine_enabled() != 2) {
    return false;
  }

  // The CDM needs to be hosted in the same process of the external engine, and
  // only WMFCDM meets this requirement.
  return aProxy->AsWMFCDMProxy();
#else
  return false;
#endif
}

#undef FMT
#undef LOG
#undef LOGV
#undef LOGW
#undef LOGE

}  // namespace mozilla
