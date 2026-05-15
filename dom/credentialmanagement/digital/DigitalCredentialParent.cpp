/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/DigitalCredentialParent.h"

namespace mozilla::dom {

mozilla::ipc::IPCResult DigitalCredentialParent::RecvGetDigitalCredential(
    nsTArray<IPCDigitalCredentialRequest>&& aRequests,
    const GetDigitalCredentialResolver&& aResolver) {
  if (mGetResolver.isSome() || mCreateResolver.isSome()) {
    aResolver(NS_ERROR_FAILURE);
    return IPC_OK();
  }

  mGetResolver.emplace(aResolver);
  return IPC_OK();
}

mozilla::ipc::IPCResult DigitalCredentialParent::RecvCreateDigitalCredential(
    nsTArray<IPCDigitalCredentialRequest>&& aRequests,
    const CreateDigitalCredentialResolver&& aResolver) {
  if (mGetResolver.isSome() || mCreateResolver.isSome()) {
    aResolver(NS_ERROR_FAILURE);
    return IPC_OK();
  }

  mCreateResolver.emplace(aResolver);
  return IPC_OK();
}

mozilla::ipc::IPCResult DigitalCredentialParent::RecvCancelOperationInParent() {
  if (mGetResolver.isSome()) {
    GetDigitalCredentialResolver resolver(mGetResolver.extract());
    resolver(NS_ERROR_DOM_ABORT_ERR);
  }
  if (mCreateResolver.isSome()) {
    CreateDigitalCredentialResolver resolver(mCreateResolver.extract());
    resolver(NS_ERROR_DOM_ABORT_ERR);
  }
  return IPC_OK();
}

void DigitalCredentialParent::ActorDestroy(ActorDestroyReason aWhy) {
  MOZ_ASSERT(NS_IsMainThread());
  mGetResolver.reset();
  mCreateResolver.reset();
}

}  // namespace mozilla::dom
