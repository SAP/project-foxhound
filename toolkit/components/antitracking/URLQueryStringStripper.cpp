/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "URLQueryStringStripper.h"

#include "mozilla/ClearOnShutdown.h"
#include "mozilla/StaticPrefs_privacy.h"
#include "mozilla/StaticPtr.h"
#include "mozilla/Unused.h"
#include "mozilla/Telemetry.h"

#include "nsEffectiveTLDService.h"
#include "nsISupportsImpl.h"
#include "nsIURI.h"
#include "nsIURIMutator.h"
#include "nsUnicharUtils.h"
#include "nsURLHelper.h"

namespace {
mozilla::StaticRefPtr<mozilla::URLQueryStringStripper> gQueryStringStripper;
}  // namespace

namespace mozilla {

NS_IMPL_ISUPPORTS(URLQueryStringStripper, nsIURLQueryStrippingListObserver)

URLQueryStringStripper* URLQueryStringStripper::GetOrCreate() {
  if (!gQueryStringStripper) {
    gQueryStringStripper = new URLQueryStringStripper();
    gQueryStringStripper->Init();

    RunOnShutdown(
        [&] {
          gQueryStringStripper->Shutdown();
          gQueryStringStripper = nullptr;
        },
        ShutdownPhase::XPCOMShutdown);
  }

  return gQueryStringStripper;
}

/* static */
uint32_t URLQueryStringStripper::Strip(nsIURI* aURI, bool aIsPBM,
                                       nsCOMPtr<nsIURI>& aOutput) {
  if (aIsPBM) {
    if (!StaticPrefs::privacy_query_stripping_enabled_pbmode()) {
      return 0;
    }
  } else {
    if (!StaticPrefs::privacy_query_stripping_enabled()) {
      return 0;
    }
  }

  RefPtr<URLQueryStringStripper> stripper = GetOrCreate();

  if (stripper->CheckAllowList(aURI)) {
    return 0;
  }

  return stripper->StripQueryString(aURI, aOutput);
}

void URLQueryStringStripper::Init() {
  mService = do_GetService("@mozilla.org/query-stripping-list-service;1");
  NS_ENSURE_TRUE_VOID(mService);

  mService->Init();
  mService->RegisterAndRunObserver(this);
}

void URLQueryStringStripper::Shutdown() {
  mList.Clear();
  mAllowList.Clear();

  mService->UnregisterObserver(this);
  mService = nullptr;
}

uint32_t URLQueryStringStripper::StripQueryString(nsIURI* aURI,
                                                  nsCOMPtr<nsIURI>& aOutput) {
  MOZ_ASSERT(aURI);

  nsCOMPtr<nsIURI> uri(aURI);

  nsAutoCString query;
  nsresult rv = aURI->GetQuery(query);
  NS_ENSURE_SUCCESS(rv, false);

  uint32_t numStripped = 0;

  // We don't need to do anything if there is no query string.
  if (query.IsEmpty()) {
    return numStripped;
  }

  URLParams params;

  URLParams::Parse(query, [&](nsString&& name, nsString&& value) {
    nsAutoString lowerCaseName;

    ToLowerCase(name, lowerCaseName);

    if (mList.Contains(lowerCaseName)) {
      numStripped += 1;

      // Count how often a specific query param is stripped. For privacy reasons
      // this will only count query params listed in the Histogram definition.
      // Calls for any other query params will be discarded.
      nsAutoCString telemetryLabel("param_");
      AppendUTF16toUTF8(lowerCaseName, telemetryLabel);
      Telemetry::AccumulateCategorical(
          Telemetry::QUERY_STRIPPING_COUNT_BY_PARAM, telemetryLabel);

      return true;
    }

    params.Append(name, value);
    return true;
  });

  // Return if there is no parameter has been stripped.
  if (!numStripped) {
    return numStripped;
  }

  nsAutoString newQuery;
  params.Serialize(newQuery, false);

  Unused << NS_MutateURI(uri)
                .SetQuery(NS_ConvertUTF16toUTF8(newQuery))
                .Finalize(aOutput);

  return numStripped;
}

bool URLQueryStringStripper::CheckAllowList(nsIURI* aURI) {
  MOZ_ASSERT(aURI);

  // Get the site(eTLD+1) from the URI.
  nsAutoCString baseDomain;
  nsresult rv =
      nsEffectiveTLDService::GetInstance()->GetBaseDomain(aURI, 0, baseDomain);
  if (rv == NS_ERROR_INSUFFICIENT_DOMAIN_LEVELS) {
    return false;
  }
  NS_ENSURE_SUCCESS(rv, false);

  return mAllowList.Contains(baseDomain);
}

void URLQueryStringStripper::PopulateStripList(const nsAString& aList) {
  mList.Clear();

  for (const nsAString& item : aList.Split(' ')) {
    mList.Insert(item);
  }
}

void URLQueryStringStripper::PopulateAllowList(const nsACString& aList) {
  mAllowList.Clear();

  for (const nsACString& item : aList.Split(',')) {
    mAllowList.Insert(item);
  }
}

NS_IMETHODIMP
URLQueryStringStripper::OnQueryStrippingListUpdate(
    const nsAString& aStripList, const nsACString& aAllowList) {
  PopulateStripList(aStripList);
  PopulateAllowList(aAllowList);
  return NS_OK;
}

}  // namespace mozilla
