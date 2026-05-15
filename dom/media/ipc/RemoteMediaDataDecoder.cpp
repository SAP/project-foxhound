/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#include "RemoteMediaDataDecoder.h"

#include "RemoteDecoderChild.h"
#include "RemoteMediaManagerChild.h"

namespace mozilla {

#ifdef LOG
#  undef LOG
#endif  // LOG
#define LOG(arg, ...)                                                  \
  DDMOZ_LOG(sPDMLog, mozilla::LogLevel::Debug, "::%s: " arg, __func__, \
            ##__VA_ARGS__)

RemoteMediaDataDecoder::RemoteMediaDataDecoder(RemoteDecoderChild* aChild)
    : mChild(aChild),
      mDescription("RemoteMediaDataDecoder"_ns),
      mProcessName("unknown"_ns),
      mCodecName("unknown"_ns),
      mIsHardwareAccelerated(false),
      mConversion(ConversionRequired::kNeedNone),
      mShouldDecoderAlwaysBeRecycled(false) {
  LOG("%p is created", this);
}

RemoteMediaDataDecoder::~RemoteMediaDataDecoder() {
  if (mChild) {
    // Shutdown didn't get called. This can happen if the creation of the
    // decoder got interrupted while pending.
    nsCOMPtr<nsISerialEventTarget> thread =
        RemoteMediaManagerChild::GetManagerThread();
    MOZ_ASSERT(thread);
    thread->Dispatch(NS_NewRunnableFunction(
        "RemoteMediaDataDecoderShutdown", [child = std::move(mChild), thread] {
          child->Shutdown()->Then(
              thread, __func__,
              [child](const ShutdownPromise::ResolveOrRejectValue& aValue) {
                child->DestroyIPDL();
              });
        }));
  }
  LOG("%p is released", this);
}

RefPtr<MediaDataDecoder::InitPromise> RemoteMediaDataDecoder::Init() {
  auto managerThread = RemoteMediaManagerChild::GetManagerThread();
  if (!managerThread) {
    return InitPromise::CreateAndReject(NS_ERROR_DOM_MEDIA_CANCELED, __func__);
  }
  RefPtr<RemoteMediaDataDecoder> self = this;
  return InvokeAsync(managerThread, __func__,
                     [self]() { return self->mChild->Init(); })
      ->Then(
          managerThread, __func__,
          [self, this](TrackType aTrack) {
            MutexAutoLock lock(mMutex);
            // If shutdown has started in the meantime shutdown promise may
            // be resloved before this task. In this case mChild will be null
            // and the init promise has to be canceled.
            if (!mChild) {
              return InitPromise::CreateAndReject(NS_ERROR_DOM_MEDIA_CANCELED,
                                                  __func__);
            }
            mDescription = mChild->GetDescriptionName();
            mProcessName = mChild->GetProcessName();
            mCodecName = mChild->GetCodecName();
            mIsHardwareAccelerated =
                mChild->IsHardwareAccelerated(mHardwareAcceleratedReason);
            mConversion = mChild->NeedsConversion();
            mDecodeProperties = mChild->GetDecodeProperties();
            mShouldDecoderAlwaysBeRecycled =
                mChild->ShouldDecoderAlwaysBeRecycled();
            LOG("%p RemoteDecoderChild has been initialized - description: %s, "
                "process: %s, codec: %s",
                this, mDescription.get(), mProcessName.get(), mCodecName.get());
            return InitPromise::CreateAndResolve(aTrack, __func__);
          },
          [self](const MediaResult& aError) {
            return InitPromise::CreateAndReject(aError, __func__);
          });
}

RefPtr<MediaDataDecoder::DecodePromise> RemoteMediaDataDecoder::Decode(
    MediaRawData* aSample) {
  auto managerThread = RemoteMediaManagerChild::GetManagerThread();
  if (!managerThread) {
    return DecodePromise::CreateAndReject(NS_ERROR_DOM_MEDIA_CANCELED,
                                          __func__);
  }
  RefPtr<RemoteMediaDataDecoder> self = this;
  RefPtr<MediaRawData> sample = aSample;
  return InvokeAsync(managerThread, __func__, [self, sample]() {
    return self->mChild->Decode(nsTArray<RefPtr<MediaRawData>>{sample});
  });
}

RefPtr<MediaDataDecoder::DecodePromise> RemoteMediaDataDecoder::DecodeBatch(
    nsTArray<RefPtr<MediaRawData>>&& aSamples) {
  auto managerThread = RemoteMediaManagerChild::GetManagerThread();
  if (!managerThread) {
    return DecodePromise::CreateAndReject(NS_ERROR_DOM_MEDIA_CANCELED,
                                          __func__);
  }
  RefPtr<RemoteMediaDataDecoder> self = this;
  return InvokeAsync(managerThread, __func__,
                     [self, samples = std::move(aSamples)]() {
                       return self->mChild->Decode(samples);
                     });
}

RefPtr<MediaDataDecoder::FlushPromise> RemoteMediaDataDecoder::Flush() {
  auto managerThread = RemoteMediaManagerChild::GetManagerThread();
  if (!managerThread) {
    return FlushPromise::CreateAndReject(NS_ERROR_DOM_MEDIA_CANCELED, __func__);
  }
  RefPtr<RemoteMediaDataDecoder> self = this;
  return InvokeAsync(managerThread, __func__,
                     [self]() { return self->mChild->Flush(); });
}

RefPtr<MediaDataDecoder::DecodePromise> RemoteMediaDataDecoder::Drain() {
  auto managerThread = RemoteMediaManagerChild::GetManagerThread();
  if (!managerThread) {
    return DecodePromise::CreateAndReject(NS_ERROR_DOM_MEDIA_CANCELED,
                                          __func__);
  }
  RefPtr<RemoteMediaDataDecoder> self = this;
  return InvokeAsync(managerThread, __func__,
                     [self]() { return self->mChild->Drain(); });
}

RefPtr<ShutdownPromise> RemoteMediaDataDecoder::Shutdown() {
  auto managerThread = RemoteMediaManagerChild::GetManagerThread();
  if (!managerThread) {
    return ShutdownPromise::CreateAndResolve(true, __func__);
  }
  RefPtr<RemoteMediaDataDecoder> self = this;
  return InvokeAsync(managerThread, __func__, [self]() {
    auto managerThread = RemoteMediaManagerChild::GetManagerThread();
    if (!managerThread) {
      return ShutdownPromise::CreateAndResolve(true, __func__);
    }

    RefPtr<ShutdownPromise> p = self->mChild->Shutdown();

    // We're about to be destroyed and drop our ref to
    // *DecoderChild. Make sure we put a ref into the
    // task queue for the *DecoderChild thread to keep
    // it alive until we send the delete message.
    p->Then(managerThread, __func__,
            [child = std::move(self->mChild)](
                const ShutdownPromise::ResolveOrRejectValue& aValue) {
              MOZ_ASSERT(aValue.IsResolve());
              child->DestroyIPDL();
              return ShutdownPromise::CreateAndResolveOrReject(aValue,
                                                               __func__);
            });
    return p;
  });
}

bool RemoteMediaDataDecoder::IsHardwareAccelerated(
    nsACString& aFailureReason) const {
  MutexAutoLock lock(mMutex);
  aFailureReason = mHardwareAcceleratedReason;
  return mIsHardwareAccelerated;
}

void RemoteMediaDataDecoder::SetSeekThreshold(const media::TimeUnit& aTime) {
  auto managerThread = RemoteMediaManagerChild::GetManagerThread();
  if (!managerThread) {
    return;
  }
  RefPtr<RemoteMediaDataDecoder> self = this;
  media::TimeUnit time = aTime;
  managerThread->Dispatch(
      NS_NewRunnableFunction("dom::RemoteMediaDataDecoder::SetSeekThreshold",
                             [=]() {
                               MOZ_ASSERT(self->mChild);
                               self->mChild->SetSeekThreshold(time);
                             }),
      NS_DISPATCH_NORMAL);
}

MediaDataDecoder::ConversionRequired RemoteMediaDataDecoder::NeedsConversion()
    const {
  MutexAutoLock lock(mMutex);
  return mConversion;
}

Maybe<MediaDataDecoder::PropertyValue>
RemoteMediaDataDecoder::GetDecodeProperty(
    MediaDataDecoder::PropertyName aName) const {
  MutexAutoLock lock(mMutex);
  return mDecodeProperties[aName];
}

nsCString RemoteMediaDataDecoder::GetDescriptionName() const {
  MutexAutoLock lock(mMutex);
  return mDescription;
}

nsCString RemoteMediaDataDecoder::GetProcessName() const {
  MutexAutoLock lock(mMutex);
  return mProcessName;
}

nsCString RemoteMediaDataDecoder::GetCodecName() const {
  MutexAutoLock lock(mMutex);
  return mCodecName;
}

bool RemoteMediaDataDecoder::ShouldDecoderAlwaysBeRecycled() const {
  MutexAutoLock lock(mMutex);
  return mShouldDecoderAlwaysBeRecycled;
}

#undef LOG

}  // namespace mozilla
