/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "UrlClassifierFeatureBase.h"
#include "Classifier.h"
#include "mozilla/Preferences.h"
#include "nsIUrlClassifierExceptionList.h"
#include "nsIUrlClassifierExceptionListEntry.h"

namespace mozilla {

using namespace safebrowsing;

namespace net {

namespace {

void OnPrefsChange(const char* aPrefName, void* aData) {
  auto* data = static_cast<UrlClassifierFeatureBase::PrefCallbackData*>(aData);
  MOZ_ASSERT(data && data->mArray);

  nsAutoCString value;
  Preferences::GetCString(aPrefName, value);
  MutexAutoLock lock(*data->mMutex);
  Classifier::SplitTables(value, *data->mArray);
}

}  // namespace

NS_INTERFACE_MAP_BEGIN(UrlClassifierFeatureBase)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, nsIUrlClassifierFeature)
  NS_INTERFACE_MAP_ENTRY(nsIUrlClassifierFeature)
  NS_INTERFACE_MAP_ENTRY(nsIUrlClassifierExceptionListObserver)
NS_INTERFACE_MAP_END

NS_IMPL_ADDREF(UrlClassifierFeatureBase)
NS_IMPL_RELEASE(UrlClassifierFeatureBase)

UrlClassifierFeatureBase::UrlClassifierFeatureBase(
    const nsACString& aName, const nsACString& aPrefBlocklistTables,
    const nsACString& aPrefEntitylistTables,
    const nsACString& aPrefBlocklistHosts,
    const nsACString& aPrefEntitylistHosts,
    const nsACString& aPrefBlocklistTableName,
    const nsACString& aPrefEntitylistTableName,
    const nsACString& aPrefExceptionHosts)
    : mName(aName), mPrefExceptionHosts(aPrefExceptionHosts) {
  static_assert(nsIUrlClassifierFeature::blocklist == 0,
                "nsIUrlClassifierFeature::blocklist must be 0");
  static_assert(nsIUrlClassifierFeature::entitylist == 1,
                "nsIUrlClassifierFeature::entitylist must be 1");

  mPrefTables[nsIUrlClassifierFeature::blocklist] = aPrefBlocklistTables;
  mPrefTables[nsIUrlClassifierFeature::entitylist] = aPrefEntitylistTables;

  mPrefHosts[nsIUrlClassifierFeature::blocklist] = aPrefBlocklistHosts;
  mPrefHosts[nsIUrlClassifierFeature::entitylist] = aPrefEntitylistHosts;

  mPrefTableNames[nsIUrlClassifierFeature::blocklist] = aPrefBlocklistTableName;
  mPrefTableNames[nsIUrlClassifierFeature::entitylist] =
      aPrefEntitylistTableName;
}

UrlClassifierFeatureBase::~UrlClassifierFeatureBase() = default;

void UrlClassifierFeatureBase::InitializePreferences() {
  for (uint32_t i = 0; i < 2; ++i) {
    if (!mPrefTables[i].IsEmpty()) {
      mTablesCbData[i] = {&mDataMutex, &mTables[i]};
      Preferences::RegisterCallbackAndCall(OnPrefsChange, mPrefTables[i],
                                           &mTablesCbData[i]);
    }

    if (!mPrefHosts[i].IsEmpty()) {
      mHostsCbData[i] = {&mDataMutex, &mHosts[i]};
      Preferences::RegisterCallbackAndCall(OnPrefsChange, mPrefHosts[i],
                                           &mHostsCbData[i]);
    }
  }

  nsCOMPtr<nsIUrlClassifierExceptionListService> exceptionListService =
      do_GetService("@mozilla.org/url-classifier/exception-list-service;1");
  if (NS_WARN_IF(!exceptionListService)) {
    return;
  }

  exceptionListService->RegisterAndRunExceptionListObserver(
      mName, mPrefExceptionHosts, this);
}

void UrlClassifierFeatureBase::ShutdownPreferences() {
  for (uint32_t i = 0; i < 2; ++i) {
    if (!mPrefTables[i].IsEmpty()) {
      Preferences::UnregisterCallback(OnPrefsChange, mPrefTables[i],
                                      &mTablesCbData[i]);
    }

    if (!mPrefHosts[i].IsEmpty()) {
      Preferences::UnregisterCallback(OnPrefsChange, mPrefHosts[i],
                                      &mHostsCbData[i]);
    }
  }

  nsCOMPtr<nsIUrlClassifierExceptionListService> exceptionListService =
      do_GetService("@mozilla.org/url-classifier/exception-list-service;1");
  if (exceptionListService) {
    exceptionListService->UnregisterExceptionListObserver(mName, this);
  }
}

NS_IMETHODIMP
UrlClassifierFeatureBase::OnExceptionListUpdate(
    nsIUrlClassifierExceptionList* aList) {
  mExceptionList = aList;

  return NS_OK;
}

NS_IMETHODIMP
UrlClassifierFeatureBase::GetName(nsACString& aName) {
  aName = mName;
  return NS_OK;
}

NS_IMETHODIMP
UrlClassifierFeatureBase::GetTables(nsIUrlClassifierFeature::listType aListType,
                                    nsTArray<nsCString>& aTables) {
  if (aListType != nsIUrlClassifierFeature::blocklist &&
      aListType != nsIUrlClassifierFeature::entitylist) {
    return NS_ERROR_INVALID_ARG;
  }

  MutexAutoLock lock(mDataMutex);
  aTables = mTables[aListType].Clone();
  return NS_OK;
}

NS_IMETHODIMP
UrlClassifierFeatureBase::HasTable(const nsACString& aTable,
                                   nsIUrlClassifierFeature::listType aListType,
                                   bool* aResult) {
  NS_ENSURE_ARG_POINTER(aResult);

  if (aListType != nsIUrlClassifierFeature::blocklist &&
      aListType != nsIUrlClassifierFeature::entitylist) {
    return NS_ERROR_INVALID_ARG;
  }

  MutexAutoLock lock(mDataMutex);
  *aResult = mTables[aListType].Contains(aTable);
  return NS_OK;
}

NS_IMETHODIMP
UrlClassifierFeatureBase::HasHostInPreferences(
    const nsACString& aHost, nsIUrlClassifierFeature::listType aListType,
    nsACString& aPrefTableName, bool* aResult) {
  NS_ENSURE_ARG_POINTER(aResult);

  if (aListType != nsIUrlClassifierFeature::blocklist &&
      aListType != nsIUrlClassifierFeature::entitylist) {
    return NS_ERROR_INVALID_ARG;
  }

  MutexAutoLock lock(mDataMutex);
  *aResult = mHosts[aListType].Contains(aHost);
  if (*aResult) {
    aPrefTableName = mPrefTableNames[aListType];
  }
  return NS_OK;
}

NS_IMETHODIMP
UrlClassifierFeatureBase::GetExceptionList(
    nsIUrlClassifierExceptionList** aList) {
  NS_ENSURE_ARG_POINTER(aList);

  *aList = mExceptionList;
  NS_IF_ADDREF(*aList);

  return NS_OK;
}

NS_IMETHODIMP
UrlClassifierFeatureAntiTrackingBase::GetExceptionList(
    nsIUrlClassifierExceptionList** aList) {
  if (!StaticPrefs::privacy_antitracking_enableWebcompat()) {
    *aList = nullptr;
    return NS_OK;
  }

  return UrlClassifierFeatureBase::GetExceptionList(aList);
}

}  // namespace net
}  // namespace mozilla
