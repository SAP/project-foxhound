/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#if !defined(NIGHTLY_BUILD) || defined(MOZ_NO_SMART_CARDS)
#  error This file should only be used under NIGHTLY_BUILD and when MOZ_NO_SMART_CARDS is not defined.
#endif  // !NIGHTLY_BUILD || MOZ_NO_SMART_CARDS

#include "mozilla/psm/PKCS11ModuleChild.h"

#include "mozilla/ipc/Endpoint.h"
#include "nsDebugImpl.h"

#include <chrono>
#include <thread>

namespace mozilla::psm {

nsresult PKCS11ModuleChild::Start(Endpoint<PPKCS11ModuleChild>&& aEndpoint) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(!mTaskQueue);

  nsDebugImpl::SetMultiprocessMode("PKCS11ModuleChild");

  nsresult rv = NS_CreateBackgroundTaskQueue("PKCS11ModuleChild",
                                             getter_AddRefs(mTaskQueue));
  if (NS_FAILED(rv)) {
    return rv;
  }

  rv = mTaskQueue->Dispatch(NS_NewRunnableFunction(
      "PKCS11ModuleChild::StartBind",
      [self = RefPtr{this}, endpoint = std::move(aEndpoint)]() mutable {
        MOZ_ALWAYS_TRUE(endpoint.Bind(self));
      }));
  return rv;
}

ipc::IPCResult PKCS11ModuleChild::RecvLoadModule(
    nsString&& aModule, LoadModuleResolver&& aResolver) {
  if (aModule != u"MySecretModule"_ns) {
    aResolver(NS_ERROR_NOT_IMPLEMENTED);
    return IPC_OK();
  }

  // Simulate a long but successful load
  std::this_thread::sleep_for(std::chrono::seconds(1));
  aResolver(NS_OK);

  return IPC_OK();
}

}  // namespace mozilla::psm
