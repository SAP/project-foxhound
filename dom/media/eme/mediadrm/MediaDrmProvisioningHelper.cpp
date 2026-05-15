/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MediaDrmProvisioningHelper.h"

#include "nsComponentManagerUtils.h"
#include "nsIMediaDrmProvisioning.h"

namespace mozilla {

NS_IMPL_ISUPPORTS0(MediaDrmProvisioningHelper);

MediaDrmProvisioningHelper::MediaDrmProvisioningHelper(
    const RemoteCDMProvisionRequestIPDL& aRequest,
    PRemoteCDMChild::ProvisionResolver&& aResolver)
    : mEventTarget(GetCurrentSerialEventTarget()),
      mServerUrl(aRequest.serverUrl()),
      mRequestData(NS_ConvertUTF8toUTF16(
          reinterpret_cast<const char*>(aRequest.request().Elements()),
          aRequest.request().Length())),
      mResolver(std::move(aResolver)) {}

MediaDrmProvisioningHelper::~MediaDrmProvisioningHelper() {
  MaybeResolve(
      MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR,
                  "Failed to resolve or reject provisioning promise"_ns));
}

void MediaDrmProvisioningHelper::Provision() {
  if (!NS_IsMainThread()) {
    NS_DispatchToMainThread(NS_NewRunnableFunction(
        __func__, [self = RefPtr{this}]() { self->Provision(); }));
    return;
  }

  nsresult rv;
  nsCOMPtr<nsIMediaDrmProvisioning> provisioning = do_CreateInstance(
      "@mozilla.org/dom/media/eme/mediadrm/provisioning;1", &rv);
  if (!provisioning) {
    MaybeResolve(
        MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR,
                    "Failed to create nsIMediaDrmProvisioning object"_ns));
    return;
  }

  RefPtr<dom::Promise> promise;
  rv = provisioning->Provision(mServerUrl, mRequestData,
                               getter_AddRefs(promise));
  if (NS_FAILED(rv)) {
    MaybeResolve(
        MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR,
                    "nsICDMProvisioning::ProvisionAMediaDrm call failed"_ns));
    return;
  }

  promise->AppendNativeHandler(this);
}

void MediaDrmProvisioningHelper::ResolvedCallback(JSContext* aCx,
                                                  JS::Handle<JS::Value> aValue,
                                                  ErrorResult& aRv) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(mResolver);

  dom::ArrayBufferView view;
  if (!view.Init(aValue.toObjectOrNull())) {
    MaybeResolve(MediaResult(
        NS_ERROR_DOM_INVALID_STATE_ERR,
        "Failed to initialize ArrayBufferView for provisioning response"_ns));
    return;
  }

  nsTArray<uint8_t> response;
  if (!view.AppendDataTo(response)) {
    MaybeResolve(MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR,
                             "Failed to copy provision response"_ns));
    return;
  }

  MaybeResolve(std::move(response));
}

void MediaDrmProvisioningHelper::RejectedCallback(JSContext* aCx,
                                                  JS::Handle<JS::Value> aValue,
                                                  ErrorResult& aRv) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(mResolver);
  MaybeResolve(MediaResult(NS_ERROR_DOM_INVALID_STATE_ERR,
                           "Failed to fetch provisioning response"_ns));
}

}  // namespace mozilla
