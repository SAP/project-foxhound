/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MessagePortParent.h"

#include "MessagePortService.h"
#include "mozilla/dom/RefMessageBodyService.h"
#include "mozilla/dom/SharedMessageBody.h"

namespace mozilla::dom {

MessagePortParent::MessagePortParent(const nsID& aUUID)
    : mService(MessagePortService::GetOrCreate()),
      mUUID(aUUID),
      mEntangled(false),
      mCanSendData(true) {
  MOZ_ASSERT(mService);
}

MessagePortParent::~MessagePortParent() {
  MOZ_ASSERT(!mService);
  MOZ_ASSERT(!mEntangled);
}

bool MessagePortParent::Entangle(const nsID& aDestinationUUID,
                                 const uint32_t& aSequenceID) {
  if (!mService) {
    NS_WARNING("Entangle is called after a shutdown!");
    return false;
  }

  MOZ_ASSERT(!mEntangled);

  return mService->RequestEntangling(this, aDestinationUUID, aSequenceID);
}

mozilla::ipc::IPCResult MessagePortParent::RecvPostMessages(
    nsTArray<NotNull<RefPtr<SharedMessageBody>>>&& aMessages) {
  if (!mService) {
    NS_WARNING("PostMessages is called after a shutdown!");
    // This implies most probably that CloseAndDelete() has been already called
    // such that we have no better option than to silently ignore this call.
    return IPC_OK();
  }

  if (!mEntangled) {
    // If we were shut down, the above condition already bailed out. So this
    // should actually never happen and returning a failure is fine.
    return IPC_FAIL(this, "RecvPostMessages not entangled");
  }

  if (aMessages.IsEmpty()) {
    // An empty payload can be safely ignored.
    return IPC_OK();
  }

  if (!mService->PostMessages(this, std::move(aMessages))) {
    // TODO: Verify if all failure conditions of PostMessages() merit an
    // IPC_FAIL. See bug 1750499.
    return IPC_FAIL(this, "RecvPostMessages->PostMessages");
  }
  return IPC_OK();
}

mozilla::ipc::IPCResult MessagePortParent::RecvDisentangle(
    nsTArray<NotNull<RefPtr<SharedMessageBody>>>&& aMessages) {
  if (!mService) {
    NS_WARNING("Entangle is called after a shutdown!");
    // This implies most probably that CloseAndDelete() has been already called
    // such that we can silently ignore this call.
    return IPC_OK();
  }

  if (!mEntangled) {
    // If we were shut down, the above condition already bailed out. So this
    // should actually never happen and returning a failure is fine.
    return IPC_FAIL(this, "RecvDisentangle not entangled");
  }

  if (!mService->DisentanglePort(this, std::move(aMessages))) {
    // TODO: Verify if all failure conditions of DisentanglePort() merit an
    // IPC_FAIL. See bug 1750501.
    return IPC_FAIL(this, "RecvDisentangle->DisentanglePort");
  }

  CloseAndDelete();
  return IPC_OK();
}

mozilla::ipc::IPCResult MessagePortParent::RecvStopSendingData() {
  if (!mEntangled) {
    return IPC_OK();
  }

  mCanSendData = false;
  (void)SendStopSendingDataConfirmed();
  return IPC_OK();
}

mozilla::ipc::IPCResult MessagePortParent::RecvClose() {
  if (mService) {
    MOZ_ASSERT(mEntangled);

    if (!mService->ClosePort(this)) {
      return IPC_FAIL(this, "RecvClose->ClosePort");
    }

    Close();
  }

  MOZ_ASSERT(!mEntangled);

  (void)Send__delete__(this);
  return IPC_OK();
}

void MessagePortParent::ActorDestroy(ActorDestroyReason aWhy) {
  if (mService && mEntangled) {
    // When the last parent is deleted, this service is freed but this cannot
    // be done when the hashtables are written by CloseAll.
    RefPtr<MessagePortService> kungFuDeathGrip = mService;
    kungFuDeathGrip->ParentDestroy(this);
  }
}

bool MessagePortParent::Entangled(
    nsTArray<NotNull<RefPtr<SharedMessageBody>>>&& aMessages) {
  MOZ_ASSERT(!mEntangled);
  mEntangled = true;
  return SendEntangled(aMessages);
}

void MessagePortParent::CloseAndDelete() {
  Close();
  (void)Send__delete__(this);
}

void MessagePortParent::Close() {
  mService = nullptr;
  mEntangled = false;
}

/* static */
bool MessagePortParent::ForceClose(const nsID& aUUID,
                                   const nsID& aDestinationUUID,
                                   const uint32_t& aSequenceID) {
  MessagePortService* service = MessagePortService::Get();
  if (!service) {
    NS_WARNING(
        "The service must exist if we want to close an existing MessagePort.");
    // There is nothing to close so we are ok.
    return true;
  }

  return service->ForceClose(aUUID, aDestinationUUID, aSequenceID);
}

}  // namespace mozilla::dom
