/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SharedMessageBody.h"

#include "mozilla/dom/File.h"
#include "mozilla/dom/MessagePort.h"
#include "mozilla/dom/PMessagePort.h"
#include "mozilla/dom/RefMessageBodyService.h"
#include "mozilla/ipc/BackgroundChild.h"
#include "mozilla/ipc/BackgroundParent.h"
#include "xpcpublic.h"

namespace mozilla {

using namespace ipc;

namespace dom {

SharedMessageBody::SharedMessageBody(
    StructuredCloneHolder::TransferringSupport aSupportsTransferring,
    const Maybe<nsID>& aAgentClusterId)
    : mRefDataId(Nothing()),
      mSupportsTransferring(aSupportsTransferring),
      mAgentClusterId(aAgentClusterId) {}

SharedMessageBody::~SharedMessageBody() = default;

void SharedMessageBody::Write(JSContext* aCx, JS::Handle<JS::Value> aValue,
                              JS::Handle<JS::Value> aTransfers, nsID& aPortID,
                              RefMessageBodyService* aRefMessageBodyService,
                              ErrorResult& aRv) {
  MOZ_ASSERT(!mCloneData && !mRefData);
  MOZ_ASSERT(aRefMessageBodyService);

  JS::CloneDataPolicy cloneDataPolicy;
  // During a writing, we don't know the destination, so we assume it is part of
  // the same agent cluster.
  cloneDataPolicy.allowIntraClusterClonableSharedObjects();

  nsIGlobalObject* global = xpc::CurrentNativeGlobal(aCx);
  MOZ_ASSERT(global);

  if (global->IsSharedMemoryAllowed()) {
    cloneDataPolicy.allowSharedMemoryObjects();
  }

  mCloneData = MakeRefPtr<ipc::StructuredCloneData>(
      JS::StructuredCloneScope::UnknownDestination, mSupportsTransferring);
  mCloneData->Write(aCx, aValue, aTransfers, cloneDataPolicy, aRv);
  if (NS_WARN_IF(aRv.Failed())) {
    return;
  }

  if (mCloneData->CloneScope() == JS::StructuredCloneScope::DifferentProcess) {
    return;
  }

  MOZ_ASSERT(mCloneData->CloneScope() == JS::StructuredCloneScope::SameProcess);
  RefPtr<RefMessageBody> refData = new RefMessageBody(aPortID, mCloneData);
  mCloneData = nullptr;

  mRefDataId.emplace(aRefMessageBodyService->Register(refData.forget(), aRv));
}

void SharedMessageBody::Read(JSContext* aCx,
                             JS::MutableHandle<JS::Value> aValue,
                             RefMessageBodyService* aRefMessageBodyService,
                             SharedMessageBody::ReadMethod aReadMethod,
                             ErrorResult& aRv) {
  MOZ_ASSERT(aRefMessageBodyService);

  if (mCloneData) {
    // Use a default cloneDataPolicy here, because SharedArrayBuffers and WASM
    // are not supported.
    return mCloneData->Read(aCx, aValue, JS::CloneDataPolicy(), aRv);
  }

  JS::CloneDataPolicy cloneDataPolicy;

  nsIGlobalObject* global = xpc::CurrentNativeGlobal(aCx);
  MOZ_ASSERT(global);

  // Clones within the same agent cluster are allowed to use shared array
  // buffers and WASM modules.
  if (mAgentClusterId.isSome()) {
    Maybe<nsID> agentClusterId = global->GetAgentClusterId();
    if (agentClusterId.isSome() &&
        mAgentClusterId.value().Equals(agentClusterId.value())) {
      cloneDataPolicy.allowIntraClusterClonableSharedObjects();
    }
  }

  if (global->IsSharedMemoryAllowed()) {
    cloneDataPolicy.allowSharedMemoryObjects();
  }

  MOZ_ASSERT(!mRefData);
  MOZ_ASSERT(mRefDataId.isSome());

  if (aReadMethod == SharedMessageBody::StealRefMessageBody) {
    mRefData = aRefMessageBodyService->Steal(mRefDataId.value());
  } else {
    MOZ_ASSERT(aReadMethod == SharedMessageBody::KeepRefMessageBody);
    mRefData = aRefMessageBodyService->GetAndCount(mRefDataId.value());
  }

  if (!mRefData) {
    aRv.Throw(NS_ERROR_DOM_DATA_CLONE_ERR);
    return;
  }

  mRefData->Read(aCx, aValue, cloneDataPolicy, aRv);
}

bool SharedMessageBody::TakeTransferredPortsAsSequence(
    Sequence<OwningNonNull<mozilla::dom::MessagePort>>& aPorts) {
  if (mCloneData) {
    return mCloneData->TakeTransferredPortsAsSequence(aPorts);
  }

  MOZ_ASSERT(mRefData);
  return mRefData->TakeTransferredPortsAsSequence(aPorts);
}

}  // namespace dom
}  // namespace mozilla

namespace IPC {

void ParamTraits<mozilla::dom::SharedMessageBody*>::Write(
    MessageWriter* aWriter, paramType* aParam) {
  bool isNull = aParam == nullptr;
  WriteParam(aWriter, isNull);
  if (isNull) {
    return;
  }

  bool supportsTransferring =
      aParam->mSupportsTransferring ==
      mozilla::dom::StructuredCloneHolder::TransferringSupported;
  WriteParam(aWriter, supportsTransferring);
  WriteParam(aWriter, aParam->mAgentClusterId);

  WriteParam(aWriter, aParam->mCloneData);
  if (!aParam->mCloneData) {
    WriteParam(aWriter, aParam->mRefDataId);
  }
}

bool ParamTraits<mozilla::dom::SharedMessageBody*>::Read(
    MessageReader* aReader, RefPtr<paramType>* aResult) {
  bool isNull;
  if (!ReadParam(aReader, &isNull)) {
    return false;
  }
  if (isNull) {
    *aResult = nullptr;
    return true;
  }

  bool supportsTransferring;
  mozilla::Maybe<nsID> agentClusterId;
  if (!ReadParam(aReader, &supportsTransferring) ||
      !ReadParam(aReader, &agentClusterId)) {
    return false;
  }

  RefPtr<paramType> result = new mozilla::dom::SharedMessageBody(
      supportsTransferring
          ? mozilla::dom::StructuredCloneHolder::TransferringSupported
          : mozilla::dom::StructuredCloneHolder::TransferringNotSupported,
      agentClusterId);

  if (!ReadParam(aReader, &result->mCloneData) ||
      (!result->mCloneData && !ReadParam(aReader, &result->mRefDataId))) {
    return false;
  }

  *aResult = result.forget();
  return true;
}

}  // namespace IPC
