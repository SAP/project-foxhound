/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FetchDecodedImage.h"

#include "imgINotificationObserver.h"
#include "imgITools.h"
#include "nsIChannel.h"
#include "nsNetUtil.h"
#include "nsServiceManagerUtils.h"

namespace mozilla::image {

namespace {

class FetchDecodedImageHelper;

MOZ_RUNINIT
HashSet<RefPtr<FetchDecodedImageHelper>,
        PointerHasher<FetchDecodedImageHelper*>>
    gDecodeRequests;

class FetchDecodedImageHelper : public imgIContainerCallback,
                                public imgINotificationObserver {
 public:
  NS_DECL_ISUPPORTS

  explicit FetchDecodedImageHelper(
      gfx::IntSize aSize, RefPtr<FetchDecodedImagePromise::Private> aPromise)
      : mSize(aSize), mPromise(aPromise) {
    // Let's make sure we are alive until the request completes
    MOZ_ALWAYS_TRUE(gDecodeRequests.putNew(this));
  }

  NS_IMETHOD
  OnImageReady(imgIContainer* aImage, nsresult aStatus) override {
    if (NS_FAILED(aStatus)) {
      OnError(aStatus);
      return NS_OK;
    }

    mImage = aImage;
    RequestDecode();
    return NS_OK;
  }

  void Notify(imgIRequest* aRequest, int32_t aType,
              const nsIntRect* aData) override {
    if (!mImage) {
      return;
    }

    if (aType == imgINotificationObserver::LOAD_COMPLETE ||
        aType == imgINotificationObserver::FRAME_UPDATE ||
        aType == imgINotificationObserver::FRAME_COMPLETE) {
      RequestDecode();
    }

    if (aType == imgINotificationObserver::DECODE_COMPLETE) {
      OnDecodeComplete();
    }
  }

  void OnError(nsresult aStatus) {
    gDecodeRequests.remove(this);
    mImage = nullptr;
    mPromise->Reject(aStatus, __func__);
    mPromise = nullptr;
  }

 private:
  virtual ~FetchDecodedImageHelper() {}

  void RequestDecode() {
    if (mSize.Width() && mSize.Height()) {
      if (NS_FAILED(mImage->RequestDecodeForSize(
              mSize, imgIContainer::FLAG_ASYNC_NOTIFY,
              imgIContainer::FRAME_FIRST))) {
        OnError(NS_ERROR_DOM_IMAGE_BROKEN);
      }

      return;
    }

    switch (mImage->RequestDecodeWithResult(imgIContainer::FLAG_ASYNC_NOTIFY,
                                            imgIContainer::FRAME_FIRST)) {
      case imgIContainer::DecodeResult::DECODE_REQUEST_FAILED:
        OnError(NS_ERROR_DOM_IMAGE_BROKEN);
        break;
      case imgIContainer::DecodeResult::DECODE_SURFACE_AVAILABLE:
        OnDecodeComplete();
        break;
      case imgIContainer::DecodeResult::DECODE_REQUESTED:
        break;
    }
  }

  void OnDecodeComplete() {
    gDecodeRequests.remove(this);
    mPromise->Resolve(mImage.forget(), __func__);
    mPromise = nullptr;
  }

  gfx::IntSize mSize;
  RefPtr<FetchDecodedImagePromise::Private> mPromise;
  nsCOMPtr<imgIContainer> mImage{};
};

NS_IMPL_ISUPPORTS(FetchDecodedImageHelper, imgIContainerCallback,
                  imgINotificationObserver)

}  // namespace

RefPtr<FetchDecodedImagePromise> FetchDecodedImage(
    nsIURI* aURI, gfx::IntSize aSize, nsIPrincipal* aLoadingPrincipal,
    nsSecurityFlags aSecurityFlags, nsContentPolicyType aContentPolicyType) {
  nsCOMPtr<nsIChannel> channel;
  nsresult rv = NS_NewChannel(getter_AddRefs(channel), aURI, aLoadingPrincipal,
                              aSecurityFlags, aContentPolicyType);
  if (NS_FAILED(rv)) {
    return FetchDecodedImagePromise::CreateAndReject(rv, __func__);
  }

  return FetchDecodedImage(aURI, channel, aSize);
}

RefPtr<FetchDecodedImagePromise> FetchDecodedImage(nsIURI* aURI,
                                                   nsIChannel* aChannel,
                                                   gfx::IntSize aSize) {
  nsresult rv;
  nsCOMPtr<imgITools> imgTools =
      do_GetService("@mozilla.org/image/tools;1", &rv);
  if (NS_FAILED(rv)) {
    return FetchDecodedImagePromise::CreateAndReject(rv, __func__);
  }

  auto promise = MakeRefPtr<FetchDecodedImagePromise::Private>(__func__);

  RefPtr<FetchDecodedImageHelper> helper =
      new FetchDecodedImageHelper(aSize, promise);

  rv = imgTools->DecodeImageFromChannelAsync(aURI, aChannel, helper, helper);
  if (NS_FAILED(rv)) {
    helper->OnError(rv);
  }

  return promise;
}

}  // namespace mozilla::image
