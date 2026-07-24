/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "StructuredCloneData.h"

#include "ipc/IPCMessageUtilsSpecializations.h"
#include "mozilla/dom/BlobImpl.h"
#include "mozilla/dom/DOMTypes.h"
#include "mozilla/dom/IPCBlobUtils.h"
#include "mozilla/ipc/SerializedStructuredCloneBuffer.h"
#include "nsContentUtils.h"

using namespace mozilla::ipc;

namespace mozilla::dom::ipc {

StructuredCloneData::StructuredCloneData()
    : StructuredCloneData(StructuredCloneScope::DifferentProcess,
                          StructuredCloneHolder::TransferringSupported) {}

StructuredCloneData::StructuredCloneData(
    StructuredCloneScope aScope, TransferringSupport aSupportsTransferring)
    : StructuredCloneHolder(StructuredCloneHolder::CloningSupported,
                            aSupportsTransferring, aScope) {
  MOZ_ASSERT(aScope == StructuredCloneScope::DifferentProcess ||
             aScope == StructuredCloneScope::UnknownDestination);
}

StructuredCloneData::~StructuredCloneData() = default;

void StructuredCloneData::WriteIPCParams(IPC::MessageWriter* aWriter) {
  MOZ_RELEASE_ASSERT(
      CloneScope() == StructuredCloneScope::DifferentProcess,
      "Cannot serialize same-process StructuredCloneData over IPC");
  AssertAttachmentsMatchFlags();

  WriteParam(aWriter, BufferVersion());
  WriteParam(aWriter, BufferData());

  // Write all cloneable attachments directly to IPC.
  std::apply([&](auto&... member) { WriteParams(aWriter, member...); },
             CloneableAttachmentArrays());

  // Also write all transferable members, if we support transferring.
  if (SupportsTransferring()) {
    std::apply([&](auto&... member) { WriteParams(aWriter, member...); },
               TransferableAttachmentArrays());
  }
}

bool StructuredCloneData::ReadIPCParams(IPC::MessageReader* aReader) {
  MOZ_ASSERT(!mBuffer, "StructuredCloneData was previously initialized");

  GeckoChildID originChildID =
      aReader->GetActor()
          ? aReader->GetActor()->ToplevelProtocol()->OtherChildIDMaybeInvalid()
          : kInvalidGeckoChildID;

  uint32_t version;
  JSStructuredCloneData data(JS::StructuredCloneScope::DifferentProcess);
  if (!ReadParam(aReader, &version) || !ReadParam(aReader, &data)) {
    return false;
  }

  Adopt(std::move(data), version, originChildID);

  if (!std::apply(
          [&](auto&... member) { return ReadParams(aReader, member...); },
          CloneableAttachmentArrays())) {
    return false;
  }

  if (SupportsTransferring()) {
    if (!std::apply(
            [&](auto&... member) { return ReadParams(aReader, member...); },
            TransferableAttachmentArrays())) {
      return false;
    }
  }

  AssertAttachmentsMatchFlags();
  return true;
}

bool StructuredCloneData::CopyExternalData(const char* aData,
                                           size_t aDataLength,
                                           uint32_t aVersion) {
  MOZ_ASSERT(!mBuffer, "StructuredCloneData was previously initialized");

  JSStructuredCloneData data(JS::StructuredCloneScope::DifferentProcess);
  if (!data.AppendBytes(aData, aDataLength)) {
    return false;
  }

  Adopt(std::move(data), aVersion);
  return true;
}

}  // namespace mozilla::dom::ipc

void IPC::ParamTraits<mozilla::dom::ipc::StructuredCloneData*>::Write(
    MessageWriter* aWriter, paramType* aParam) {
  WriteParam(aWriter, aParam != nullptr);
  if (aParam) {
    WriteParam(aWriter, aParam->SupportsTransferring());
    aParam->WriteIPCParams(aWriter);
  }
}

bool IPC::ParamTraits<mozilla::dom::ipc::StructuredCloneData*>::Read(
    MessageReader* aReader, RefPtr<paramType>* aResult) {
  bool notNull = false;
  if (!ReadParam(aReader, &notNull)) {
    return false;
  }
  if (notNull) {
    bool supportsTransferring;
    if (!ReadParam(aReader, &supportsTransferring)) {
      return false;
    }
    *aResult = mozilla::MakeRefPtr<paramType>(
        JS::StructuredCloneScope::DifferentProcess,
        supportsTransferring
            ? mozilla::dom::StructuredCloneHolder::TransferringSupported
            : mozilla::dom::StructuredCloneHolder::TransferringNotSupported);
    return (*aResult)->ReadIPCParams(aReader);
  }
  return true;
}
