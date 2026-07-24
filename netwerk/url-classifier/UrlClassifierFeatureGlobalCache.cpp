/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "UrlClassifierFeatureGlobalCache.h"

#include "mozilla/StaticPrefs_browser.h"
#include "mozilla/StaticPtr.h"
#include "nsCOMPtr.h"

namespace mozilla {
namespace net {

namespace {

#define GLOBAL_CACHE_FEATURE_NAME "globalCache"

#define URLCLASSIFIER_GLOBAL_CACHE_TABLE "urlclassifier.globalCacheTable"

StaticRefPtr<UrlClassifierFeatureGlobalCache> gFeatureGlobalCache;

}  // namespace

UrlClassifierFeatureGlobalCache::UrlClassifierFeatureGlobalCache()
    : UrlClassifierFeatureBase(
          nsLiteralCString(GLOBAL_CACHE_FEATURE_NAME),
          nsLiteralCString(URLCLASSIFIER_GLOBAL_CACHE_TABLE),
          ""_ns,  // aPrefEntitylistTables
          ""_ns,  // aPrefBlocklistHosts
          ""_ns,  // aPrefEntitylistHosts
          ""_ns,  // aPrefBlocklistTableName
          ""_ns,  // aPrefEntitylistTableName
          ""_ns)  // aPrefExceptionHosts
{}

/* static */
const char* UrlClassifierFeatureGlobalCache::Name() {
  return GLOBAL_CACHE_FEATURE_NAME;
}

/* static */
void UrlClassifierFeatureGlobalCache::MaybeInitialize() {
  if (!gFeatureGlobalCache) {
    gFeatureGlobalCache = new UrlClassifierFeatureGlobalCache();
    gFeatureGlobalCache->InitializePreferences();
  }
}

/* static */
void UrlClassifierFeatureGlobalCache::MaybeShutdown() {
  if (gFeatureGlobalCache) {
    gFeatureGlobalCache->ShutdownPreferences();
    gFeatureGlobalCache = nullptr;
  }
}

/* static */
already_AddRefed<UrlClassifierFeatureGlobalCache>
UrlClassifierFeatureGlobalCache::MaybeCreate() {
  if (!StaticPrefs::browser_safebrowsing_globalCache_enabled()) {
    return nullptr;
  }

  MaybeInitialize();
  MOZ_ASSERT(gFeatureGlobalCache);

  RefPtr<UrlClassifierFeatureGlobalCache> self = gFeatureGlobalCache;
  return self.forget();
}

/* static */
already_AddRefed<nsIUrlClassifierFeature>
UrlClassifierFeatureGlobalCache::GetIfNameMatches(const nsACString& aName) {
  if (!aName.EqualsLiteral(GLOBAL_CACHE_FEATURE_NAME)) {
    return nullptr;
  }

  MaybeInitialize();
  MOZ_ASSERT(gFeatureGlobalCache);

  nsCOMPtr<nsIUrlClassifierFeature> self = gFeatureGlobalCache.get();
  return self.forget();
}

NS_IMETHODIMP
UrlClassifierFeatureGlobalCache::ProcessChannel(
    nsIChannel* aChannel, const nsTArray<nsCString>& aList,
    const nsTArray<nsCString>& aHashes, bool* aShouldContinue) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
UrlClassifierFeatureGlobalCache::GetURIByListType(
    nsIChannel* aChannel, nsIUrlClassifierFeature::listType aListType,
    nsIUrlClassifierFeature::URIType* aURIType, nsIURI** aURI) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

}  // namespace net
}  // namespace mozilla
