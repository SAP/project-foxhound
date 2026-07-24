/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/ipc/Endpoint.h"
#include "chrome/common/ipc_message.h"
#include "ipc/IPCMessageUtilsSpecializations.h"
#include "nsThreadUtils.h"
#include "mozilla/ipc/ProtocolMessageUtils.h"

namespace mozilla::ipc {

UntypedManagedEndpoint::UntypedManagedEndpoint(IProtocol* aActor)
    : mInner(Some(Inner{
          /* mOtherSide */ aActor->GetWeakLifecycleProxy(),
          /* mToplevel */ nullptr,
          aActor->Id(),
          aActor->GetProtocolId(),
          aActor->Manager()->Id(),
          aActor->Manager()->GetProtocolId(),
      })) {}

UntypedManagedEndpoint::~UntypedManagedEndpoint() {
  if (!IsValid()) {
    return;
  }

  if (mInner->mOtherSide) {
    // If this ManagedEndpoint was never sent over IPC, deliver a fake
    // MANAGED_ENDPOINT_DROPPED_MESSAGE_TYPE message directly to the other side
    // actor.
    mInner->mOtherSide->ActorEventTarget()->Dispatch(NS_NewRunnableFunction(
        "~ManagedEndpoint (Local)",
        [otherSide = mInner->mOtherSide, id = mInner->mId] {
          if (IProtocol* actor = otherSide->Get(); actor && actor->CanRecv()) {
            MOZ_DIAGNOSTIC_ASSERT(actor->Id() == id, "Wrong Actor?");
            RefPtr<ActorLifecycleProxy> strongProxy(actor->GetLifecycleProxy());
            strongProxy->Get()->OnMessageReceived(
                IPC::Message(id, MANAGED_ENDPOINT_DROPPED_MESSAGE_TYPE));
          }
        }));
  } else if (mInner->mToplevel) {
    // If it was sent over IPC, we'll need to send the message to the sending
    // side. Let's send the message async.
    mInner->mToplevel->ActorEventTarget()->Dispatch(NS_NewRunnableFunction(
        "~ManagedEndpoint (Remote)",
        [toplevel = mInner->mToplevel, id = mInner->mId] {
          if (IProtocol* actor = toplevel->Get();
              actor && actor->CanSend() && actor->GetIPCChannel()) {
            // Clear the reservation which was taken when the
            // UntypedManagedEndpoint was deserialized.
            actor->ToplevelProtocol()->ClearReservation(id);
            actor->GetIPCChannel()->Send(MakeUnique<IPC::Message>(
                id, MANAGED_ENDPOINT_DROPPED_MESSAGE_TYPE));
          }
        }));
  }
}

bool UntypedManagedEndpoint::IsValidForManager(
    IRefCountedProtocol* aManager) const {
  return IsValid() && aManager && aManager->Id() == mInner->mManagerId &&
         aManager->GetProtocolId() == mInner->mManagerType;
}

bool UntypedManagedEndpoint::IsValidForManager(
    const UntypedManagedEndpoint& aManager) const {
  return IsValid() && aManager.IsValid() &&
         aManager.mInner->mId == mInner->mManagerId &&
         aManager.mInner->mType == mInner->mManagerType;
}

bool UntypedManagedEndpoint::BindCommon(IProtocol* aActor,
                                        IRefCountedProtocol* aManager) {
  MOZ_ASSERT(aManager);
  if (!aActor) {
    NS_WARNING("Cannot bind to null actor");
    return false;
  }

  if (!IsForProtocol(aActor->GetProtocolId())) {
    NS_WARNING("Cannot bind to incorrect protocol");
    return false;
  }

  if (!IsValidForManager(aManager)) {
    NS_WARNING("Cannot bind to invalid endpoint");
    return false;
  }

  // Perform thread assertions.
  if (mInner->mToplevel) {
    MOZ_DIAGNOSTIC_ASSERT(
        mInner->mToplevel->ActorEventTarget()->IsOnCurrentThread());
    MOZ_DIAGNOSTIC_ASSERT(aManager->ToplevelProtocol() ==
                          mInner->mToplevel->Get());
  }

  if (!aManager->CanSend() || !aManager->GetIPCChannel()) {
    NS_WARNING("Manager cannot send");
    return false;
  }

  // The endpoint was never sent over IPC, so instead we'll reserve the
  // ActorId as-if it was sent over IPC.
  // WARNING: If you introduce error return paths after this point, but before
  // SetManagerAndRegister, we may leak our ActorId reservation.
  if (!mInner->mToplevel &&
      !aManager->ToplevelProtocol()->TryReserve(mInner->mId)) {
    MOZ_ASSERT_UNREACHABLE(
        "Failed to reserve ActorId for in-proc UntypedManagedEndpoint");
    return false;
  }

  ActorId id = mInner->mId;
  mInner.reset();

  // Our typed caller will insert the actor into the managed container.
  MOZ_ALWAYS_TRUE(aActor->SetManagerAndRegister(aManager, id));

  aManager->GetIPCChannel()->Send(
      MakeUnique<IPC::Message>(id, MANAGED_ENDPOINT_BOUND_MESSAGE_TYPE));
  return true;
}

}  // namespace mozilla::ipc

namespace IPC {

/* static */
void ParamTraits<mozilla::ipc::UntypedManagedEndpoint>::Write(
    MessageWriter* aWriter, paramType&& aParam) {
  bool isValid = aParam.mInner.isSome();
  WriteParam(aWriter, isValid);
  if (!isValid) {
    return;
  }

  auto inner = std::move(*aParam.mInner);
  aParam.mInner.reset();

  MOZ_RELEASE_ASSERT(inner.mOtherSide, "Has not been sent over IPC yet");
  MOZ_RELEASE_ASSERT(inner.mOtherSide->ActorEventTarget()->IsOnCurrentThread(),
                     "Must be being sent from the correct thread");
  MOZ_RELEASE_ASSERT(inner.mOtherSide->Get() && aWriter->GetActor() &&
                         inner.mOtherSide->Get()->ToplevelProtocol() ==
                             aWriter->GetActor()->ToplevelProtocol(),
                     "Must be being sent over the same toplevel protocol");

  WriteParam(aWriter, inner.mId);
  WriteParam(aWriter, inner.mType);
  WriteParam(aWriter, inner.mManagerId);
  WriteParam(aWriter, inner.mManagerType);
}

/* static */
bool ParamTraits<mozilla::ipc::UntypedManagedEndpoint>::Read(
    MessageReader* aReader, paramType* aResult) {
  *aResult = mozilla::ipc::UntypedManagedEndpoint{};
  bool isValid = false;
  if (!aReader->GetActor() || !ReadParam(aReader, &isValid)) {
    return false;
  }
  if (!isValid) {
    return true;
  }

  mozilla::ipc::IToplevelProtocol* toplevel =
      aReader->GetActor()->ToplevelProtocol();

  mozilla::ipc::ActorId id = 0;
  if (!ReadParam(aReader, &id)) {
    return false;
  }

  // Attempt to perform a reservation.
  // If this succeeds, immediately construct mInner, so that the reservation is
  // cleaned up when the ManagedEndpoint is destroyed.
  if (!toplevel->TryReserve(id)) {
    aReader->FatalError("Failed to reserve remote ActorId with toplevel");
    return false;
  }

  aResult->mInner.emplace();
  auto& inner = *aResult->mInner;
  inner.mToplevel = toplevel->GetWeakLifecycleProxy();
  inner.mId = id;

  return ReadParam(aReader, &inner.mType) &&
         ReadParam(aReader, &inner.mManagerId) &&
         ReadParam(aReader, &inner.mManagerType);
}

void ParamTraits<mozilla::ipc::UntypedEndpoint>::Write(MessageWriter* aWriter,
                                                       paramType&& aParam) {
  IPC::WriteParam(aWriter, std::move(aParam.mPort));
  IPC::WriteParam(aWriter, aParam.mMessageChannelId);
  IPC::WriteParam(aWriter, aParam.mMyProcInfo);
  IPC::WriteParam(aWriter, aParam.mOtherProcInfo);
}

bool ParamTraits<mozilla::ipc::UntypedEndpoint>::Read(MessageReader* aReader,
                                                      paramType* aResult) {
  return IPC::ReadParam(aReader, &aResult->mPort) &&
         IPC::ReadParam(aReader, &aResult->mMessageChannelId) &&
         IPC::ReadParam(aReader, &aResult->mMyProcInfo) &&
         IPC::ReadParam(aReader, &aResult->mOtherProcInfo);
}

}  // namespace IPC
