/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "RemoteCDMChild.h"

#include "RemoteCDMProxy.h"

namespace mozilla {

RemoteCDMChild::RemoteCDMChild() = default;

RemoteCDMChild::~RemoteCDMChild() = default;

void RemoteCDMChild::Initialize(RemoteCDMProxy* aProxy) { mProxy = aProxy; }

void RemoteCDMChild::Destroy() {
  if (CanSend()) {
    Send__delete__(this);
  }
  mProxy = nullptr;
}

void RemoteCDMChild::ActorDestroy(ActorDestroyReason aWhy) { mProxy = nullptr; }

mozilla::ipc::IPCResult RemoteCDMChild::RecvProvision(
    const RemoteCDMProvisionRequestIPDL& aRequest,
    ProvisionResolver&& aResolver) {
  if (mProxy) {
    mProxy->OnProvision(aRequest, std::move(aResolver));
  } else {
    aResolver(MediaResult(NS_ERROR_DOM_MEDIA_FATAL_ERR,
                          "Missing remote proxy owner"_ns));
  }
  return IPC_OK();
}

mozilla::ipc::IPCResult RemoteCDMChild::RecvOnSessionKeyStatus(
    const RemoteCDMKeyStatusIPDL& aMsg) {
  if (mProxy) {
    mProxy->OnSessionKeyStatus(aMsg);
  }
  return IPC_OK();
}

mozilla::ipc::IPCResult RemoteCDMChild::RecvOnSessionKeyExpiration(
    RemoteCDMKeyExpirationIPDL&& aMsg) {
  if (mProxy) {
    mProxy->OnSessionKeyExpiration(std::move(aMsg));
  }
  return IPC_OK();
}

mozilla::ipc::IPCResult RemoteCDMChild::RecvOnSessionKeyMessage(
    RemoteCDMKeyMessageIPDL&& aMsg) {
  if (mProxy) {
    mProxy->OnSessionKeyMessage(std::move(aMsg));
  }
  return IPC_OK();
}

}  // namespace mozilla
