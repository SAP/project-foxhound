/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/ClipboardWriteRequestParent.h"

#include "mozilla/dom/ContentParent.h"
#include "mozilla/net/CookieJarSettings.h"
#include "nsComponentManagerUtils.h"
#include "nsIClipboard.h"
#include "nsITransferable.h"
#include "nsWidgetsCID.h"

static NS_DEFINE_CID(kCClipboardCID, NS_CLIPBOARD_CID);

using mozilla::dom::ContentParent;
using mozilla::ipc::IPCResult;

namespace mozilla {

NS_IMPL_ISUPPORTS(ClipboardWriteRequestParent, nsIAsyncClipboardRequestCallback)

ClipboardWriteRequestParent::ClipboardWriteRequestParent(
    ContentParent* aManager)
    : mManager(aManager) {}

ClipboardWriteRequestParent::~ClipboardWriteRequestParent() = default;

nsresult ClipboardWriteRequestParent::Init(const int32_t& aClipboardType) {
  nsCOMPtr<nsIClipboard> clipboard(do_GetService(kCClipboardCID));
  if (!clipboard) {
    Unused << PClipboardWriteRequestParent::Send__delete__(this,
                                                           NS_ERROR_FAILURE);
    return NS_ERROR_FAILURE;
  }

  nsresult rv = clipboard->AsyncSetData(aClipboardType, this,
                                        getter_AddRefs(mAsyncSetClipboardData));
  if (NS_FAILED(rv)) {
    Unused << PClipboardWriteRequestParent::Send__delete__(this, rv);
    return rv;
  }

  return NS_OK;
}

NS_IMETHODIMP ClipboardWriteRequestParent::OnComplete(nsresult aResult) {
  nsCOMPtr<nsIAsyncSetClipboardData> clipboardData =
      std::move(mAsyncSetClipboardData);
  if (clipboardData) {
    Unused << PClipboardWriteRequestParent::Send__delete__(this, aResult);
  }
  return NS_OK;
}

IPCResult ClipboardWriteRequestParent::RecvSetData(
    const IPCTransferable& aTransferable) {
  if (!mManager->ValidatePrincipal(
          aTransferable.requestingPrincipal(),
          {ContentParent::ValidatePrincipalOptions::AllowNullPtr,
           ContentParent::ValidatePrincipalOptions::AllowExpanded,
           ContentParent::ValidatePrincipalOptions::AllowSystem})) {
    ContentParent::LogAndAssertFailedPrincipalValidationInfo(
        aTransferable.requestingPrincipal(), __func__);
  }

  if (!mAsyncSetClipboardData) {
    return IPC_OK();
  }

  nsresult rv = NS_ERROR_FAILURE;
  nsCOMPtr<nsITransferable> trans =
      do_CreateInstance("@mozilla.org/widget/transferable;1", &rv);
  if (NS_FAILED(rv)) {
    mAsyncSetClipboardData->Abort(rv);
    return IPC_OK();
  }

  trans->Init(nullptr);
  rv = nsContentUtils::IPCTransferableToTransferable(
      aTransferable, true /* aAddDataFlavor */, trans,
      true /* aFilterUnknownFlavors */);
  if (NS_FAILED(rv)) {
    mAsyncSetClipboardData->Abort(rv);
    return IPC_OK();
  }

  mAsyncSetClipboardData->SetData(trans, nullptr);
  return IPC_OK();
}

IPCResult ClipboardWriteRequestParent::Recv__delete__(nsresult aReason) {
#ifndef FUZZING_SNAPSHOT
  MOZ_DIAGNOSTIC_ASSERT(NS_FAILED(aReason));
#endif
  nsCOMPtr<nsIAsyncSetClipboardData> clipboardData =
      std::move(mAsyncSetClipboardData);
  if (clipboardData) {
    clipboardData->Abort(aReason);
  }
  return IPC_OK();
}

void ClipboardWriteRequestParent::ActorDestroy(ActorDestroyReason aReason) {
  nsCOMPtr<nsIAsyncSetClipboardData> clipboardData =
      std::move(mAsyncSetClipboardData);
  if (clipboardData) {
    clipboardData->Abort(NS_ERROR_ABORT);
  }
}

}  // namespace mozilla
