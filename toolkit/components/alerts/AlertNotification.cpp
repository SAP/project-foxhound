/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/AlertNotification.h"

#include "imgIContainer.h"
#include "imgINotificationObserver.h"
#include "imgIRequest.h"
#include "imgLoader.h"
#include "nsAlertsUtils.h"
#include "nsAppDirectoryServiceDefs.h"
#include "nsComponentManagerUtils.h"
#include "nsContentUtils.h"
#include "nsDirectoryServiceUtils.h"
#include "nsNetUtil.h"
#include "nsServiceManagerUtils.h"
#include "mozilla/BasePrincipal.h"

namespace mozilla {

NS_IMPL_ISUPPORTS(AlertNotification, nsIAlertNotification)

NS_IMETHODIMP
AlertNotification::Init(const nsAString& aName, const nsAString& aImageURL,
                        const nsAString& aTitle, const nsAString& aText,
                        bool aTextClickable, const nsAString& aCookie,
                        const nsAString& aDir, const nsAString& aLang,
                        const nsAString& aData, nsIPrincipal* aPrincipal,
                        bool aInPrivateBrowsing, bool aRequireInteraction,
                        bool aSilent, const nsTArray<uint32_t>& aVibrate) {
  if (!mId.IsEmpty()) {
    return NS_ERROR_ALREADY_INITIALIZED;
  }

  mName = aName;
  mImageURL = aImageURL;
  mTitle = aTitle;
  mText = aText;
  mTextClickable = aTextClickable;
  mCookie = aCookie;
  mDir = aDir;
  mLang = aLang;
  mData = aData;
  mPrincipal = aPrincipal;
  mInPrivateBrowsing = aInPrivateBrowsing;
  mRequireInteraction = aRequireInteraction;
  mSilent = aSilent;
  mVibrate = aVibrate.Clone();

  return InitId();
}

NS_IMETHODIMP
AlertNotification::InitWithObject(nsIAlertNotification* aAlertNotification) {
  MOZ_TRY(aAlertNotification->GetName(mName));
  MOZ_TRY(aAlertNotification->GetImageURL(mImageURL));
  MOZ_TRY(aAlertNotification->GetImage(getter_AddRefs(mImage)));
  MOZ_TRY(aAlertNotification->GetTitle(mTitle));
  MOZ_TRY(aAlertNotification->GetText(mText));
  MOZ_TRY(aAlertNotification->GetTextClickable(&mTextClickable));
  MOZ_TRY(aAlertNotification->GetCookie(mCookie));
  MOZ_TRY(aAlertNotification->GetDir(mDir));
  MOZ_TRY(aAlertNotification->GetLang(mLang));
  MOZ_TRY(aAlertNotification->GetData(mData));
  MOZ_TRY(aAlertNotification->GetPrincipal(getter_AddRefs(mPrincipal)));
  MOZ_TRY(aAlertNotification->GetInPrivateBrowsing(&mInPrivateBrowsing));
  MOZ_TRY(aAlertNotification->GetRequireInteraction(&mRequireInteraction));
  MOZ_TRY(aAlertNotification->GetSilent(&mSilent));
  if (NS_FAILED(aAlertNotification->GetVibrate(mVibrate))) {
    mVibrate.Clear();
  };
  nsTArray<RefPtr<nsIAlertAction>> actions;
  if (NS_SUCCEEDED(aAlertNotification->GetActions(actions))) {
    for (auto& action : actions) {
      if (RefPtr<nsIAlertAction> copied =
              AlertAction::Copy(*action).unwrapOr(nullptr)) {
        mActions.AppendElement(copied);
      }
    }
  };
  return InitId();
}

nsresult AlertNotification::InitId() {
  nsAutoString id;

  // Multiple profiles might overwrite each other's toast messages when a
  // common name is used for a given origin. We prevent this by including
  // the profile directory as part of the toast hash.
  nsCOMPtr<nsIFile> profDir;
  MOZ_TRY(NS_GetSpecialDirectory(NS_APP_USER_PROFILE_50_DIR,
                                 getter_AddRefs(profDir)));
  MOZ_TRY(profDir->Normalize());
  MOZ_TRY(profDir->GetPath(id));

  if (mPrincipal && mPrincipal->GetIsContentPrincipal()) {
    // Notification originated from a web notification.
    nsAutoCString origin;
    MOZ_TRY(mPrincipal->GetOrigin(origin));
    id += NS_ConvertUTF8toUTF16(origin);
  } else {
    id += u"chrome";
  }

  if (mName.IsEmpty()) {
    // No associated name, append a UUID to prevent reuse of the same tag.
    nsIDToCString uuidString(nsID::GenerateUUID());
    size_t len = strlen(uuidString.get());
    MOZ_ASSERT(len == NSID_LENGTH - 1);
    nsAutoString uuid;
    CopyASCIItoUTF16(nsDependentCSubstring(uuidString.get(), len), uuid);

    id += u"#notag:"_ns;
    id += uuid;
  } else {
    id += u"#tag:"_ns;
    id += mName;
  }

  // Windows notification tags are limited to 16 characters, or 64 characters
  // after the Creators Update; therefore we hash the tag to fit the minimum
  // range.
  HashNumber hash = HashString(id);
  mId.AppendPrintf("%010u", hash);
  return NS_OK;
}

NS_IMETHODIMP AlertNotification::GetId(nsAString& aId) {
  if (mId.IsEmpty()) {
    return NS_ERROR_NOT_INITIALIZED;
  }
  aId = mId;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::SetActions(
    const nsTArray<RefPtr<nsIAlertAction>>& aActions) {
  mActions = aActions.Clone();
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetName(nsAString& aName) {
  if (mPrincipal && mPrincipal->GetIsContentPrincipal()) {
    // mName is no longer unique, but there has been a long assumption
    // throughout the codebase that GetName will be unique. So we return mId for
    // GetName for web triggered notifications to keep uniqueness without
    // accidentially causing subtle breakage in other modules.
    aName = mId;
  } else {
    // System callers has always been expected to provide unique names
    // themselves, so it's fine to return mName as is.
    aName = mName;
  }
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetImageURL(nsAString& aImageURL) {
  aImageURL = mImageURL;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::SetImage(imgIContainer* aImage) {
  mImage = aImage;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetImage(imgIContainer** aImage) {
  nsCOMPtr<imgIContainer> image = mImage;
  image.forget(aImage);
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetTitle(nsAString& aTitle) {
  aTitle = mTitle;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetText(nsAString& aText) {
  aText = mText;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetTextClickable(bool* aTextClickable) {
  *aTextClickable = mTextClickable;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetCookie(nsAString& aCookie) {
  aCookie = mCookie;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetDir(nsAString& aDir) {
  aDir = mDir;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetLang(nsAString& aLang) {
  aLang = mLang;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetRequireInteraction(bool* aRequireInteraction) {
  *aRequireInteraction = mRequireInteraction;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetData(nsAString& aData) {
  aData = mData;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetPrincipal(nsIPrincipal** aPrincipal) {
  NS_IF_ADDREF(*aPrincipal = mPrincipal);
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetURI(nsIURI** aURI) {
  if (!nsAlertsUtils::IsActionablePrincipal(mPrincipal)) {
    *aURI = nullptr;
    return NS_OK;
  }
  auto* basePrin = BasePrincipal::Cast(mPrincipal);
  return basePrin->GetURI(aURI);
}

NS_IMETHODIMP
AlertNotification::GetInPrivateBrowsing(bool* aInPrivateBrowsing) {
  *aInPrivateBrowsing = mInPrivateBrowsing;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetActionable(bool* aActionable) {
  *aActionable = nsAlertsUtils::IsActionablePrincipal(mPrincipal);
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetSilent(bool* aSilent) {
  *aSilent = mSilent;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetVibrate(nsTArray<uint32_t>& aVibrate) {
  aVibrate = mVibrate.Clone();
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetActions(nsTArray<RefPtr<nsIAlertAction>>& aActions) {
  aActions = mActions.Clone();
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetSource(nsAString& aSource) {
  nsAlertsUtils::GetSourceHostPort(mPrincipal, aSource);
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetOrigin(nsACString& aOrigin) {
  return nsAlertsUtils::GetOrigin(mPrincipal, aOrigin);
}

NS_IMETHODIMP
AlertNotification::GetOpaqueRelaunchData(nsAString& aOpaqueRelaunchData) {
  aOpaqueRelaunchData = mOpaqueRelaunchData;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::SetOpaqueRelaunchData(const nsAString& aOpaqueRelaunchData) {
  mOpaqueRelaunchData = aOpaqueRelaunchData;
  return NS_OK;
}

NS_IMETHODIMP
AlertNotification::GetAction(const nsAString& aName,
                             nsIAlertAction** aAlertAction) {
  NS_ENSURE_ARG_POINTER(aAlertAction);
  for (const auto& action : mActions) {
    nsString name;
    MOZ_TRY(action->GetAction(name));
    if (name.Equals(aName)) {
      RefPtr<nsIAlertAction> match = action;
      match.forget(aAlertAction);
      return NS_OK;
    }
  }
  *aAlertAction = nullptr;
  return NS_OK;
}

NS_IMPL_ISUPPORTS(AlertAction, nsIAlertAction)

AlertAction::AlertAction(const nsAString& aAction, const nsAString& aTitle)
    : mAction(aAction), mTitle(aTitle) {}

Result<already_AddRefed<AlertAction>, nsresult> AlertAction::Copy(
    nsIAlertAction& aAction) {
  nsAutoString action;
  nsAutoString title;
  MOZ_TRY(aAction.GetAction(action));
  MOZ_TRY(aAction.GetTitle(title));
  return do_AddRef(new AlertAction(action, title));
}

NS_IMETHODIMP
AlertAction::GetAction(nsAString& aAction) {
  aAction = mAction;
  return NS_OK;
}

NS_IMETHODIMP
AlertAction::GetTitle(nsAString& aTitle) {
  aTitle = mTitle;
  return NS_OK;
}

NS_IMETHODIMP
AlertAction::GetIconURL(nsAString& aTitle) {
  aTitle.Truncate();
  return NS_OK;
}

NS_IMETHODIMP
AlertAction::GetWindowsSystemActivationType(bool* aType) {
  *aType = false;
  return NS_OK;
}

NS_IMETHODIMP
AlertAction::GetOpaqueRelaunchData(nsAString& aData) {
  aData.Truncate();
  return NS_OK;
}

}  // namespace mozilla
