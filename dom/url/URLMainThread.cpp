/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "URLMainThread.h"

#include "mozilla/dom/BindingUtils.h"
#include "mozilla/dom/Blob.h"
#include "mozilla/dom/BlobURLProtocolHandler.h"
#include "mozilla/dom/DocGroup.h"
#include "mozilla/dom/Document.h"
#include "nsContentUtils.h"
#include "nsGlobalWindowInner.h"
#include "nsNetUtil.h"
#include "nsThreadUtils.h"

namespace mozilla::dom {

/* static */
void URLMainThread::CreateObjectURL(const GlobalObject& aGlobal,
                                    const BlobOrMediaSource& aObj,
                                    nsACString& aResult, ErrorResult& aRv) {
  MOZ_ASSERT(NS_IsMainThread());

  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (NS_WARN_IF(!global)) {
    aRv.Throw(NS_ERROR_FAILURE);
    return;
  }

  // MediaSource URLs cannot be used across Agent boundaries, as they require
  // direct scriptable object sharing between registration and use.
  // A MediaSource URL also cannot be used for generic subresource fetches.
  // Because of this, they are registered on the DocGroup instead of globally.
  if (aObj.IsMediaSource()) {
    nsCOMPtr<nsPIDOMWindowInner> owner = do_QueryInterface(global);
    RefPtr<DocGroup> docGroup = owner ? owner->GetDocGroup() : nullptr;
    if (!docGroup) {
      aRv.ThrowSecurityError("MediaSource URL must be registered in a Window");
      return;
    }

    aRv = docGroup->RegisterMediaSourceURL(nsGlobalWindowInner::Cast(owner),
                                           &aObj.GetAsMediaSource(), aResult);
    return;
  }

  MOZ_RELEASE_ASSERT(aObj.IsBlob(), "MediaSource handled above");

  nsAutoString partKey;
  if (nsPIDOMWindowInner* owner = global->GetAsInnerWindow()) {
    if (Document* doc = owner->GetExtantDoc()) {
      nsCOMPtr<nsICookieJarSettings> cookieJarSettings =
          doc->CookieJarSettings();

      cookieJarSettings->GetPartitionKey(partKey);
    }
  }

  nsCOMPtr<nsIPrincipal> principal =
      nsContentUtils::ObjectPrincipal(aGlobal.Get());

  aRv = BlobURLProtocolHandler::AddDataEntry(aObj.GetAsBlob().Impl(), principal,
                                             NS_ConvertUTF16toUTF8(partKey),
                                             aResult);

  if (NS_WARN_IF(aRv.Failed())) {
    return;
  }

  global->RegisterHostObjectURI(aResult);
}

/* static */
void URLMainThread::RevokeObjectURL(const GlobalObject& aGlobal,
                                    const nsACString& aURL, ErrorResult& aRv) {
  MOZ_ASSERT(NS_IsMainThread());
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return;
  }

  nsAutoString partKey;
  if (nsPIDOMWindowInner* owner = global->GetAsInnerWindow()) {
    // If this is a Media Source URL, we can skip checking the global store.
    RefPtr<DocGroup> docGroup = owner->GetDocGroup();
    if (docGroup && docGroup->UnregisterMediaSourceURL(aURL)) {
      return;
    }

    if (Document* doc = owner->GetExtantDoc()) {
      nsCOMPtr<nsICookieJarSettings> cookieJarSettings =
          doc->CookieJarSettings();

      cookieJarSettings->GetPartitionKey(partKey);
    }
  }

  if (BlobURLProtocolHandler::RemoveDataEntry(
          aURL, nsContentUtils::ObjectPrincipal(aGlobal.Get()),
          NS_ConvertUTF16toUTF8(partKey))) {
    global->UnregisterHostObjectURI(aURL);
  }
}

// static
bool URLMainThread::IsBoundToBlob(const GlobalObject& aGlobal,
                                  const nsACString& aURL, ErrorResult& aRv) {
  MOZ_ASSERT(NS_IsMainThread());
  return BlobURLProtocolHandler::HasDataEntryTypeBlob(aURL);
}

}  // namespace mozilla::dom
