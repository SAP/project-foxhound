/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MediaDataEncoderProxy.h"

#include "nsProxyRelease.h"

namespace mozilla {

MediaDataEncoderProxy::MediaDataEncoderProxy(
    RefPtr<MediaDataEncoder>&& aProxyEncoder,
    nsCOMPtr<nsISerialEventTarget>&& aProxyThread)
    : mProxyEncoder(std::move(aProxyEncoder)),
      mProxyThread(std::move(aProxyThread)) {
  MOZ_ASSERT(mProxyEncoder);
  MOZ_ASSERT(mProxyThread);
}

MediaDataEncoderProxy::~MediaDataEncoderProxy() {
  NS_ProxyRelease("MediaDataEncoderProxy::mProxyEncoder", mProxyThread,
                  mProxyEncoder.forget());
}

RefPtr<MediaDataEncoder::InitPromise> MediaDataEncoderProxy::Init() {
  MOZ_ASSERT(!mIsShutdown);

  if (mProxyThread->IsOnCurrentThread()) {
    return mProxyEncoder->Init();
  }
  return InvokeAsync(mProxyThread, __func__, [self = RefPtr{this}] {
    return self->mProxyEncoder->Init();
  });
}

RefPtr<MediaDataEncoder::EncodePromise> MediaDataEncoderProxy::Encode(
    nsTArray<RefPtr<MediaData>>&& aSamples) {
  MOZ_ASSERT(!mIsShutdown);

  if (mProxyThread->IsOnCurrentThread()) {
    return mProxyEncoder->Encode(std::move(aSamples));
  }
  return InvokeAsync(
      mProxyThread, __func__,
      [self = RefPtr{this}, samples = std::move(aSamples)]() mutable {
        return self->mProxyEncoder->Encode(std::move(samples));
      });
}

RefPtr<MediaDataEncoder::EncodePromise> MediaDataEncoderProxy::Encode(
    const MediaData* aSample) {
  MOZ_ASSERT(!mIsShutdown);

  if (mProxyThread->IsOnCurrentThread()) {
    return mProxyEncoder->Encode(aSample);
  }
  return InvokeAsync(mProxyThread, __func__,
                     [self = RefPtr{this}, sample = RefPtr{aSample}] {
                       return self->mProxyEncoder->Encode(sample);
                     });
}

RefPtr<MediaDataEncoder::ReconfigurationPromise>
MediaDataEncoderProxy::Reconfigure(
    const RefPtr<const EncoderConfigurationChangeList>& aConfigurationChanges) {
  MOZ_ASSERT(!mIsShutdown);

  if (mProxyThread->IsOnCurrentThread()) {
    return mProxyEncoder->Reconfigure(aConfigurationChanges);
  }
  return InvokeAsync(
      mProxyThread, __func__,
      [self = RefPtr{this}, changes = RefPtr{aConfigurationChanges}] {
        return self->mProxyEncoder->Reconfigure(changes);
      });
}

RefPtr<MediaDataEncoder::EncodePromise> MediaDataEncoderProxy::Drain() {
  MOZ_ASSERT(!mIsShutdown);

  if (mProxyThread->IsOnCurrentThread()) {
    return mProxyEncoder->Drain();
  }
  return InvokeAsync(mProxyThread, __func__, [self = RefPtr{this}] {
    return self->mProxyEncoder->Drain();
  });
}

RefPtr<ShutdownPromise> MediaDataEncoderProxy::Shutdown() {
  MOZ_ASSERT(!mIsShutdown);

#if defined(DEBUG)
  mIsShutdown = true;
#endif

  if (mProxyThread->IsOnCurrentThread()) {
    return mProxyEncoder->Shutdown();
  }
  // We chain another promise to ensure that the proxied encoder gets destructed
  // on the proxy thread.
  return InvokeAsync(mProxyThread, __func__, [self = RefPtr{this}] {
    return self->mProxyEncoder->Shutdown();
  });
}

RefPtr<GenericPromise> MediaDataEncoderProxy::SetBitrate(uint32_t aBitsPerSec) {
  MOZ_ASSERT(!mIsShutdown);

  if (mProxyThread->IsOnCurrentThread()) {
    return mProxyEncoder->SetBitrate(aBitsPerSec);
  }
  return InvokeAsync(mProxyThread, __func__,
                     [self = RefPtr{this}, bitsPerSec = aBitsPerSec] {
                       return self->mProxyEncoder->SetBitrate(bitsPerSec);
                     });
}

bool MediaDataEncoderProxy::IsHardwareAccelerated(
    nsACString& aFailureReason) const {
  MOZ_ASSERT(!mIsShutdown);

  return mProxyEncoder->IsHardwareAccelerated(aFailureReason);
}

nsCString MediaDataEncoderProxy::GetDescriptionName() const {
  MOZ_ASSERT(!mIsShutdown);

  return mProxyEncoder->GetDescriptionName();
}

}  // namespace mozilla
