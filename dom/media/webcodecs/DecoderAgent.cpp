/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "DecoderAgent.h"

#include "ImageContainer.h"
#include "MP4Decoder.h"
#include "MediaDataDecoderProxy.h"
#include "PDMFactory.h"
#include "VideoUtils.h"
#include "mozilla/DebugOnly.h"
#include "mozilla/Logging.h"
#include "mozilla/StaticPrefs_media.h"
#include "mozilla/layers/ImageBridgeChild.h"
#include "nsThreadUtils.h"

extern mozilla::LazyLogModule gWebCodecsLog;

namespace mozilla {

#ifdef LOG_INTERNAL
#  undef LOG_INTERNAL
#endif  // LOG_INTERNAL
#define LOG_INTERNAL(level, msg, ...) \
  MOZ_LOG_FMT(gWebCodecsLog, LogLevel::level, msg, ##__VA_ARGS__)

#ifdef LOG
#  undef LOG
#endif  // LOG
#define LOG(msg, ...) LOG_INTERNAL(Debug, msg, ##__VA_ARGS__)

#ifdef LOGW
#  undef LOGW
#endif  // LOGE
#define LOGW(msg, ...) LOG_INTERNAL(Warning, msg, ##__VA_ARGS__)

#ifdef LOGE
#  undef LOGE
#endif  // LOGE
#define LOGE(msg, ...) LOG_INTERNAL(Error, msg, ##__VA_ARGS__)

#ifdef LOGV
#  undef LOGV
#endif  // LOGV
#define LOGV(msg, ...) LOG_INTERNAL(Verbose, msg, ##__VA_ARGS__)

DecoderAgent::DecoderAgent(Id aId, UniquePtr<TrackInfo>&& aInfo)
    : mId(aId),
      mInfo(std::move(aInfo)),
      mOwnerThread(GetCurrentSerialEventTarget()),
      mPDMFactory(MakeRefPtr<PDMFactory>()),
      mImageContainer(MakeAndAddRef<layers::ImageContainer>(
          layers::ImageUsageType::WebCodecs,
          layers::ImageContainer::ASYNCHRONOUS)),
      mDecoder(nullptr),
      mState(State::Unconfigured) {
  MOZ_ASSERT(mInfo);
  MOZ_ASSERT(mOwnerThread);
  MOZ_ASSERT(mPDMFactory);
  MOZ_ASSERT(mImageContainer);
  LOG("DecoderAgent #{} ({}) ctor", mId, fmt::ptr(this));
}

DecoderAgent::~DecoderAgent() {
  LOG("DecoderAgent #{} ({}) dtor", mId, fmt::ptr(this));
  MOZ_ASSERT(mState == State::Unconfigured, "decoder release in wrong state");
  MOZ_ASSERT(!mDecoder, "decoder must be shutdown");
}

RefPtr<DecoderAgent::ConfigurePromise> DecoderAgent::Configure(
    bool aPreferSoftwareDecoder, bool aLowLatency) {
  MOZ_ASSERT(mOwnerThread->IsOnCurrentThread());
  MOZ_ASSERT(mState == State::Unconfigured || mState == State::Error);
  MOZ_ASSERT(mConfigurePromise.IsEmpty());
  MOZ_ASSERT(!mCreateRequest.Exists());
  MOZ_ASSERT(!mInitRequest.Exists());

  if (mState == State::Error) {
    LOGE("DecoderAgent #{} ({}) tried to configure in error state", mId,
         fmt::ptr(this));
    return ConfigurePromise::CreateAndReject(
        MediaResult(NS_ERROR_DOM_MEDIA_FATAL_ERR,
                    "Cannot configure in error state"),
        __func__);
  }

  MOZ_ASSERT(mState == State::Unconfigured);
  MOZ_ASSERT(!mDecoder);
  SetState(State::Configuring);

  RefPtr<layers::KnowsCompositor> knowsCompositor =
      layers::ImageBridgeChild::GetSingleton();

  auto params = CreateDecoderParams{
      *mInfo,
      CreateDecoderParams::OptionSet(
          aPreferSoftwareDecoder
              ? CreateDecoderParams::Option::HardwareDecoderNotAllowed
              : CreateDecoderParams::Option::Default),
      mInfo->GetType(), mImageContainer, knowsCompositor};
  if (aLowLatency) {
    params.mOptions += CreateDecoderParams::Option::LowLatency;
  }
  // MediaChangeMonitor is requested to decode raw AAC in ADTS.
  if (MP4Decoder::IsAAC(mInfo->mMimeType)) {
    params.mWrappers += media::Wrapper::MediaChangeMonitor;
  }
  // This should only be used for testing.
  if (StaticPrefs::media_test_null_decoder_creation_failure()) {
    params.mUseNullDecoder = CreateDecoderParams::UseNullDecoder(true);
  }

  // Always even use the pts that were set on the input samples when returning
  // decoded video frames.
  params.mOptions += CreateDecoderParams::Option::KeepOriginalPts;

  LOG("DecoderAgent #{} ({}) is creating a decoder (mime: {}) - PreferSW: {}, "
      "low-latency: {}, create-decoder-params: {}",
      mId, fmt::ptr(this), mInfo->mMimeType.get(),
      aPreferSoftwareDecoder ? "yes" : "no", aLowLatency ? "yes" : "no",
      params.ToString().get());

  RefPtr<ConfigurePromise> p = mConfigurePromise.Ensure(__func__);

  mPDMFactory->CreateDecoder(params)
      ->Then(
          mOwnerThread, __func__,
          [self = RefPtr{this}](RefPtr<MediaDataDecoder>&& aDecoder) {
            self->mCreateRequest.Complete();

            // If DecoderAgent has been shut down, shut the created decoder down
            // and return.
            if (!self->mShutdownWhileCreationPromise.IsEmpty()) {
              MOZ_ASSERT(self->mState == State::ShuttingDown);
              MOZ_ASSERT(self->mConfigurePromise.IsEmpty(),
                         "configuration should have been rejected");

              LOGW(
                  "DecoderAgent #{} ({}) has been shut down. We need to shut "
                  "the newly created decoder down",
                  self->mId, fmt::ptr(self.get()));
              aDecoder->Shutdown()->Then(
                  self->mOwnerThread, __func__,
                  [self](const ShutdownPromise::ResolveOrRejectValue& aValue) {
                    MOZ_ASSERT(self->mState == State::ShuttingDown);

                    LOGW(
                        "DecoderAgent #{} ({}), newly created decoder shutdown "
                        "has been {}",
                        self->mId, fmt::ptr(self.get()),
                        aValue.IsResolve() ? "resolved" : "rejected");

                    self->SetState(State::Unconfigured);

                    self->mShutdownWhileCreationPromise.ResolveOrReject(
                        aValue, __func__);
                  });
              return;
            }

            self->mDecoder = new MediaDataDecoderProxy(
                aDecoder.forget(),
                CreateMediaDecodeTaskQueue("DecoderAgent TaskQueue"));
            LOG("DecoderAgent #{} ({}) has created a decoder, now initialize "
                "it",
                self->mId, fmt::ptr(self.get()));
            self->mDecoder->Init()
                ->Then(
                    self->mOwnerThread, __func__,
                    [self](const TrackInfo::TrackType aTrackType) {
                      self->mInitRequest.Complete();
                      LOG("DecoderAgent #{} ({}) has initialized the decoder",
                          self->mId, fmt::ptr(self.get()));
                      MOZ_ASSERT(aTrackType == self->mInfo->GetType());
                      self->SetState(State::Configured);
                      self->mConfigurePromise.Resolve(true, __func__);
                    },
                    [self](const MediaResult& aError) {
                      self->mInitRequest.Complete();
                      LOGE(
                          "DecoderAgent #{} ({}) failed to initialize the "
                          "decoder",
                          self->mId, fmt::ptr(self.get()));
                      self->SetState(State::Error);
                      self->mConfigurePromise.Reject(aError, __func__);
                    })
                ->Track(self->mInitRequest);
          },
          [self = RefPtr{this}](const MediaResult& aError) {
            self->mCreateRequest.Complete();
            LOGE("DecoderAgent #{} ({}) failed to create a decoder", self->mId,
                 fmt::ptr(self.get()));

            // If DecoderAgent has been shut down, we need to resolve the
            // shutdown promise.
            if (!self->mShutdownWhileCreationPromise.IsEmpty()) {
              MOZ_ASSERT(self->mState == State::ShuttingDown);
              MOZ_ASSERT(self->mConfigurePromise.IsEmpty(),
                         "configuration should have been rejected");

              LOGW(
                  "DecoderAgent #{} ({}) has been shut down. Resolve the "
                  "shutdown promise right away since decoder creation failed",
                  self->mId, fmt::ptr(self.get()));

              self->SetState(State::Unconfigured);
              self->mShutdownWhileCreationPromise.Resolve(true, __func__);
              return;
            }

            self->SetState(State::Error);
            self->mConfigurePromise.Reject(aError, __func__);
          })
      ->Track(mCreateRequest);

  return p;
}

RefPtr<ShutdownPromise> DecoderAgent::Shutdown() {
  MOZ_ASSERT(mOwnerThread->IsOnCurrentThread());

  LOG("DecoderAgent #{} ({}), shutdown in {} state", mId, fmt::ptr(this),
      EnumValueToString(mState));

  MOZ_ASSERT(mShutdownWhileCreationPromise.IsEmpty(),
             "Shutdown while shutting down is prohibited");

  auto r =
      MediaResult(NS_ERROR_DOM_MEDIA_CANCELED, "Canceled by decoder shutdown");

  // If the decoder creation has not been completed yet, wait until the decoder
  // being created has been shut down.
  if (mCreateRequest.Exists()) {
    MOZ_ASSERT(!mInitRequest.Exists());
    MOZ_ASSERT(!mConfigurePromise.IsEmpty());
    MOZ_ASSERT(!mDecoder);
    MOZ_ASSERT(mState == State::Configuring);

    LOGW(
        "DecoderAgent #{} ({}) shutdown while the decoder-creation for "
        "configuration is in flight. Reject the configuration now and defer "
        "the shutdown until the created decoder has been shut down",
        mId, fmt::ptr(this));

    // Reject the configuration in flight.
    mConfigurePromise.Reject(r, __func__);

    // Get the promise that will be resolved when the decoder being created has
    // been destroyed.
    SetState(State::ShuttingDown);
    return mShutdownWhileCreationPromise.Ensure(__func__);
  }

  // If decoder creation has been completed but failed, no decoder is set.
  if (!mDecoder) {
    LOG("DecoderAgent #{} ({}) shutdown without an active decoder", mId,
        fmt::ptr(this));
    MOZ_ASSERT(mState == State::Error);
    MOZ_ASSERT(!mInitRequest.Exists());
    MOZ_ASSERT(mConfigurePromise.IsEmpty());
    MOZ_ASSERT(!mDecodeRequest.Exists());
    MOZ_ASSERT(mDecodePromise.IsEmpty());
    MOZ_ASSERT(!mDrainRequest.Exists());
    MOZ_ASSERT(!mFlushRequest.Exists());
    MOZ_ASSERT(!mDryRequest.Exists());
    MOZ_ASSERT(mDryPromise.IsEmpty());
    MOZ_ASSERT(mDrainAndFlushPromise.IsEmpty());
    // ~DecoderAgent() will ensure that the decoder is shutdown.
    SetState(State::Unconfigured);
    return ShutdownPromise::CreateAndResolve(true, __func__);
  }

  // If decoder creation has succeeded, we must have the decoder now.

  // Cancel pending initialization for configuration in flight if any.
  mInitRequest.DisconnectIfExists();
  mConfigurePromise.RejectIfExists(r, __func__);

  // Cancel decode in flight if any.
  mDecodeRequest.DisconnectIfExists();
  mDecodePromise.RejectIfExists(r, __func__);

  // Cancel flush-out in flight if any.
  mDrainRequest.DisconnectIfExists();
  mFlushRequest.DisconnectIfExists();
  mDryRequest.DisconnectIfExists();
  mDryPromise.RejectIfExists(r, __func__);
  mDrainAndFlushPromise.RejectIfExists(r, __func__);
  mDryData.Clear();
  mDrainAndFlushData.Clear();

  SetState(State::Unconfigured);

  RefPtr<MediaDataDecoder> decoder = std::move(mDecoder);
  return decoder->Shutdown();
}

RefPtr<DecoderAgent::DecodePromise> DecoderAgent::Decode(
    MediaRawData* aSample) {
  MOZ_ASSERT(mOwnerThread->IsOnCurrentThread());
  MOZ_ASSERT(aSample);
  MOZ_ASSERT(mState == State::Configured || mState == State::Error);
  MOZ_ASSERT(mDecodePromise.IsEmpty());
  MOZ_ASSERT(!mDecodeRequest.Exists());

  if (mState == State::Error) {
    LOGE("DecoderAgent #{} ({}) tried to decode in error state", mId,
         fmt::ptr(this));
    return DecodePromise::CreateAndReject(
        MediaResult(NS_ERROR_DOM_MEDIA_FATAL_ERR,
                    "Cannot decode in error state"),
        __func__);
  }

  MOZ_ASSERT(mState == State::Configured);
  MOZ_ASSERT(mDecoder);
  SetState(State::Decoding);

  RefPtr<DecodePromise> p = mDecodePromise.Ensure(__func__);

  mDecoder->Decode(aSample)
      ->Then(
          mOwnerThread, __func__,
          [self = RefPtr{this}](MediaDataDecoder::DecodedData&& aData) {
            self->mDecodeRequest.Complete();
            LOGV("DecoderAgent #{} ({}) decode successfully", self->mId,
                 fmt::ptr(self.get()));
            self->SetState(State::Configured);
            self->mDecodePromise.Resolve(std::move(aData), __func__);
          },
          [self = RefPtr{this}](const MediaResult& aError) {
            self->mDecodeRequest.Complete();
            LOGV("DecoderAgent #{} ({}) failed to decode", self->mId,
                 fmt::ptr(self.get()));
            self->SetState(State::Error);
            self->mDecodePromise.Reject(aError, __func__);
          })
      ->Track(mDecodeRequest);

  return p;
}

RefPtr<DecoderAgent::DecodePromise> DecoderAgent::DrainAndFlush() {
  MOZ_ASSERT(mOwnerThread->IsOnCurrentThread());
  MOZ_ASSERT(mState == State::Configured || mState == State::Error);
  MOZ_ASSERT(mDrainAndFlushPromise.IsEmpty());
  MOZ_ASSERT(mDrainAndFlushData.IsEmpty());
  MOZ_ASSERT(!mDryRequest.Exists());
  MOZ_ASSERT(mDryPromise.IsEmpty());
  MOZ_ASSERT(mDryData.IsEmpty());
  MOZ_ASSERT(!mDrainRequest.Exists());
  MOZ_ASSERT(!mFlushRequest.Exists());

  if (mState == State::Error) {
    LOGE("DecoderAgent #{} ({}) tried to flush-out in error state", mId,
         fmt::ptr(this));
    return DecodePromise::CreateAndReject(
        MediaResult(NS_ERROR_DOM_MEDIA_FATAL_ERR,
                    "Cannot flush in error state"),
        __func__);
  }

  MOZ_ASSERT(mState == State::Configured);
  MOZ_ASSERT(mDecoder);
  SetState(State::Flushing);

  RefPtr<DecoderAgent::DecodePromise> p =
      mDrainAndFlushPromise.Ensure(__func__);

  Dry()
      ->Then(
          mOwnerThread, __func__,
          [self = RefPtr{this}](MediaDataDecoder::DecodedData&& aData) {
            self->mDryRequest.Complete();
            LOG("DecoderAgent #{} ({}) has dried the decoder. Now flushing the "
                "decoder",
                self->mId, fmt::ptr(self.get()));
            MOZ_ASSERT(self->mDrainAndFlushData.IsEmpty());
            self->mDrainAndFlushData.AppendElements(std::move(aData));
            self->mDecoder->Flush()
                ->Then(
                    self->mOwnerThread, __func__,
                    [self](const bool /* aUnUsed */) {
                      self->mFlushRequest.Complete();
                      LOG("DecoderAgent #{} ({}) has flushed the decoder",
                          self->mId, fmt::ptr(self.get()));
                      self->SetState(State::Configured);
                      self->mDrainAndFlushPromise.Resolve(
                          std::move(self->mDrainAndFlushData), __func__);
                    },
                    [self](const MediaResult& aError) {
                      self->mFlushRequest.Complete();
                      LOGE("DecoderAgent #{} ({}) failed to flush the decoder",
                           self->mId, fmt::ptr(self.get()));
                      self->SetState(State::Error);
                      self->mDrainAndFlushData.Clear();
                      self->mDrainAndFlushPromise.Reject(aError, __func__);
                    })
                ->Track(self->mFlushRequest);
          },
          [self = RefPtr{this}](const MediaResult& aError) {
            self->mDryRequest.Complete();
            LOGE("DecoderAgent #{} ({}) failed to dry the decoder", self->mId,
                 fmt::ptr(self.get()));
            self->SetState(State::Error);
            self->mDrainAndFlushPromise.Reject(aError, __func__);
          })
      ->Track(mDryRequest);

  return p;
}

RefPtr<DecoderAgent::DecodePromise> DecoderAgent::Dry() {
  MOZ_ASSERT(mOwnerThread->IsOnCurrentThread());
  MOZ_ASSERT(mState == State::Flushing);
  MOZ_ASSERT(mDryPromise.IsEmpty());
  MOZ_ASSERT(!mDryRequest.Exists());
  MOZ_ASSERT(mDryData.IsEmpty());
  MOZ_ASSERT(mDecoder);

  RefPtr<DecodePromise> p = mDryPromise.Ensure(__func__);
  DrainUntilDry();
  return p;
}

void DecoderAgent::DrainUntilDry() {
  MOZ_ASSERT(mOwnerThread->IsOnCurrentThread());
  MOZ_ASSERT(mState == State::Flushing);
  MOZ_ASSERT(!mDryPromise.IsEmpty());
  MOZ_ASSERT(!mDrainRequest.Exists());
  MOZ_ASSERT(mDecoder);

  LOG("DecoderAgent #{} ({}) is drainng the decoder", mId, fmt::ptr(this));
  mDecoder->Drain()
      ->Then(
          mOwnerThread, __func__,
          [self = RefPtr{this}](MediaDataDecoder::DecodedData&& aData) {
            self->mDrainRequest.Complete();

            if (aData.IsEmpty()) {
              LOG("DecoderAgent #{} ({}) is dry now", self->mId,
                  fmt::ptr(self.get()));
              self->mDryPromise.Resolve(std::move(self->mDryData), __func__);
              return;
            }

            LOG("DecoderAgent #{} ({}) drained {} decoded data. Keep draining "
                "until dry",
                self->mId, fmt::ptr(self.get()), aData.Length());
            self->mDryData.AppendElements(std::move(aData));
            self->DrainUntilDry();
          },
          [self = RefPtr{this}](const MediaResult& aError) {
            self->mDrainRequest.Complete();

            LOGE("DecoderAgent {} failed to drain decoder",
                 fmt::ptr(self.get()));
            self->mDryData.Clear();
            self->mDryPromise.Reject(aError, __func__);
          })
      ->Track(mDrainRequest);
}

void DecoderAgent::SetState(State aState) {
  MOZ_ASSERT(mOwnerThread->IsOnCurrentThread());

  auto validateStateTransition = [](State aOldState, State aNewState) {
    switch (aOldState) {
      case State::Unconfigured:
        return aNewState == State::Configuring;
      case State::Configuring:
        return aNewState == State::Configured || aNewState == State::Error ||
               aNewState == State::Unconfigured ||
               aNewState == State::ShuttingDown;
      case State::Configured:
        return aNewState == State::Unconfigured ||
               aNewState == State::Decoding || aNewState == State::Flushing;
      case State::Decoding:
      case State::Flushing:
        return aNewState == State::Configured || aNewState == State::Error ||
               aNewState == State::Unconfigured;
      case State::ShuttingDown:
        return aNewState == State::Unconfigured;
      case State::Error:
        return aNewState == State::Unconfigured;
      default:
        break;
    }
    MOZ_ASSERT_UNREACHABLE("Unhandled state transition");
    return false;
  };

  DebugOnly<bool> isValid = validateStateTransition(mState, aState);
  MOZ_ASSERT(isValid);
  LOG("DecoderAgent #{} ({}) state change: {} -> {}", mId, fmt::ptr(this),
      EnumValueToString(mState), EnumValueToString(aState));
  mState = aState;
}

#undef LOG
#undef LOGW
#undef LOGE
#undef LOGV
#undef LOG_INTERNAL

}  // namespace mozilla
