/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsStructuredCloneContainer.h"

#include <cstddef>

#include "ErrorList.h"
#include "chrome/common/ipc_message_utils.h"
#include "ipc/IPCMessageUtilsSpecializations.h"
#include "js/RootingAPI.h"
#include "js/StructuredClone.h"
#include "js/Value.h"
#include "mozilla/Assertions.h"
#include "mozilla/Base64.h"
#include "mozilla/CheckedInt.h"
#include "mozilla/DebugOnly.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/fallible.h"
#include "nsDebug.h"
#include "nsError.h"
#include "nsString.h"
#include "nscore.h"

using namespace mozilla;
using namespace mozilla::dom;

NS_IMPL_ADDREF_INHERITED(nsStructuredCloneContainer,
                         mozilla::dom::ipc::StructuredCloneData)
NS_IMPL_RELEASE_INHERITED(nsStructuredCloneContainer,
                          mozilla::dom::ipc::StructuredCloneData)

NS_INTERFACE_MAP_BEGIN(nsStructuredCloneContainer)
  NS_INTERFACE_MAP_ENTRY(nsIStructuredCloneContainer)
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

nsStructuredCloneContainer::nsStructuredCloneContainer()
    : mozilla::dom::ipc::StructuredCloneData(
          JS::StructuredCloneScope::DifferentProcess,
          StructuredCloneHolder::TransferringNotSupported) {}

nsStructuredCloneContainer::~nsStructuredCloneContainer() = default;

NS_IMETHODIMP
nsStructuredCloneContainer::InitFromJSVal(JS::Handle<JS::Value> aData,
                                          JSContext* aCx) {
  if (HasData()) {
    return NS_ERROR_FAILURE;
  }

  IgnoredErrorResult rv;
  Write(aCx, aData, rv);
  if (NS_WARN_IF(rv.Failed())) {
    // XXX propagate the error message as well.
    // We cannot StealNSResult because we threw a DOM exception.
    return NS_ERROR_DOM_DATA_CLONE_ERR;
  }

  return NS_OK;
}

NS_IMETHODIMP
nsStructuredCloneContainer::InitFromBase64(const nsAString& aData,
                                           uint32_t aFormatVersion) {
  if (HasData()) {
    return NS_ERROR_FAILURE;
  }

  NS_ConvertUTF16toUTF8 data(aData);

  nsAutoCString binaryData;
  nsresult rv = Base64Decode(data, binaryData);
  NS_ENSURE_SUCCESS(rv, rv);

  if (!CopyExternalData(binaryData.get(), binaryData.Length(),
                        aFormatVersion)) {
    return NS_ERROR_OUT_OF_MEMORY;
  }

  return NS_OK;
}

nsresult nsStructuredCloneContainer::DeserializeToJsval(
    JSContext* aCx, JS::MutableHandle<JS::Value> aValue) {
  if (!HasData()) {
    return NS_ERROR_FAILURE;
  }

  aValue.setNull();
  JS::Rooted<JS::Value> jsStateObj(aCx);

  IgnoredErrorResult rv;
  Read(aCx, &jsStateObj, rv);
  if (NS_WARN_IF(rv.Failed())) {
    // XXX propagate the error message as well.
    // We cannot StealNSResult because we threw a DOM exception.
    return NS_ERROR_DOM_DATA_CLONE_ERR;
  }

  aValue.set(jsStateObj);
  return NS_OK;
}

NS_IMETHODIMP
nsStructuredCloneContainer::GetDataAsBase64(nsAString& aOut) {
  aOut.Truncate();

  if (!HasData()) {
    return NS_ERROR_FAILURE;
  }

  if (HasClonedDOMObjects()) {
    return NS_ERROR_FAILURE;
  }

  auto iter = BufferData().Start();
  size_t size = BufferData().Size();
  CheckedInt<nsAutoCString::size_type> sizeCheck(size);
  if (!sizeCheck.isValid()) {
    return NS_ERROR_FAILURE;
  }

  nsAutoCString binaryData;
  if (!binaryData.SetLength(size, fallible)) {
    return NS_ERROR_OUT_OF_MEMORY;
  }

  DebugOnly<bool> res =
      BufferData().ReadBytes(iter, binaryData.BeginWriting(), size);
  MOZ_ASSERT(res);

  nsresult rv = Base64Encode(binaryData, aOut);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return rv;
  }

  return NS_OK;
}

NS_IMETHODIMP
nsStructuredCloneContainer::GetSerializedNBytes(uint64_t* aSize) {
  NS_ENSURE_ARG_POINTER(aSize);

  if (!HasData()) {
    return NS_ERROR_FAILURE;
  }

  *aSize = BufferData().Size();
  return NS_OK;
}

NS_IMETHODIMP
nsStructuredCloneContainer::GetFormatVersion(uint32_t* aFormatVersion) {
  NS_ENSURE_ARG_POINTER(aFormatVersion);

  if (!HasData()) {
    return NS_ERROR_FAILURE;
  }

  *aFormatVersion = BufferVersion();
  return NS_OK;
}

void IPC::ParamTraits<nsStructuredCloneContainer*>::Write(
    IPC::MessageWriter* aWriter, paramType* aParam) {
  bool isNull = !aParam;
  WriteParam(aWriter, isNull);
  if (isNull) {
    return;
  }

  aParam->WriteIPCParams(aWriter);
}

bool IPC::ParamTraits<nsStructuredCloneContainer*>::Read(
    IPC::MessageReader* aReader, RefPtr<paramType>* aResult) {
  bool isNull;
  if (!ReadParam(aReader, &isNull)) {
    return false;
  }
  if (isNull) {
    *aResult = nullptr;
    return true;
  }
  *aResult = new nsStructuredCloneContainer();
  return (*aResult)->ReadIPCParams(aReader);
}
