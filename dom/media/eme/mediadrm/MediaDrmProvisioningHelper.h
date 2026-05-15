/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_EME_MEDIADRM_MEDIADRMPROVISIONINGHELPER_H_
#define DOM_MEDIA_EME_MEDIADRM_MEDIADRMPROVISIONINGHELPER_H_

#include "mozilla/PRemoteCDMChild.h"
#include "mozilla/dom/PromiseNativeHandler.h"
#include "nsISerialEventTarget.h"

namespace mozilla {

/**
 * MediaDrm may require us to provision during EME playback, which consists of
 * sending a POST request to the given URL with a given sequence of request
 * bytes, granted by AMediaDrm_getProvisionRequest. When we receive the
 * response, we need to call AMediaDrm_provideProvisionResponse. This class runs
 * in the content process to perform this network request on behalf of the
 * decrypting process.
 */
class MediaDrmProvisioningHelper final : public dom::PromiseNativeHandler {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS

  explicit MediaDrmProvisioningHelper(
      const RemoteCDMProvisionRequestIPDL& aRequest,
      PRemoteCDMChild::ProvisionResolver&& aResolver);

  void Provision();

  MOZ_CAN_RUN_SCRIPT
  void ResolvedCallback(JSContext* aCx, JS::Handle<JS::Value> aValue,
                        ErrorResult& aRv) override;

  MOZ_CAN_RUN_SCRIPT
  void RejectedCallback(JSContext* aCx, JS::Handle<JS::Value> aValue,
                        ErrorResult& aRv) override;

 private:
  ~MediaDrmProvisioningHelper() override;

  template <class T>
  void MaybeResolve(T&& aResult) {
    if (!mResolver) {
      return;
    }

    (void)mEventTarget->Dispatch(NS_NewRunnableFunction(
        __func__, [result = std::move(aResult),
                   resolver = std::move(mResolver)]() { resolver(result); }));
    mResolver = nullptr;
  }

  const nsCOMPtr<nsISerialEventTarget> mEventTarget;
  nsString mServerUrl;
  nsString mRequestData;
  PRemoteCDMChild::ProvisionResolver mResolver;
};

}  // namespace mozilla

#endif  // DOM_MEDIA_EME_MEDIADRM_MEDIADRMPROVISIONINGHELPER_H_
