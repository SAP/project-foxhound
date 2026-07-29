/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "UrlClassifierFeatureSocialTrackingProtection.h"

#include "mozilla/AntiTrackingUtils.h"
#include "mozilla/net/ChannelClassifierUtils.h"
#include "mozilla/net/UrlClassifierCommon.h"
#include "mozilla/ScopedPrefs.h"
#include "nsNetUtil.h"
#include "mozilla/StaticPtr.h"
#include "nsIWebProgressListener.h"
#include "nsIChannel.h"

namespace mozilla {
namespace net {

namespace {

#define SOCIALTRACKING_FEATURE_NAME "socialtracking-protection"

#define URLCLASSIFIER_SOCIALTRACKING_BLOCKLIST \
  "urlclassifier.features.socialtracking.blacklistTables"
#define URLCLASSIFIER_SOCIALTRACKING_BLOCKLIST_TEST_ENTRIES \
  "urlclassifier.features.socialtracking.blacklistHosts"
#define URLCLASSIFIER_SOCIALTRACKING_ENTITYLIST \
  "urlclassifier.features.socialtracking.whitelistTables"
#define URLCLASSIFIER_SOCIALTRACKING_ENTITYLIST_TEST_ENTRIES \
  "urlclassifier.features.socialtracking.whitelistHosts"
#define URLCLASSIFIER_SOCIALTRACKING_EXCEPTION_URLS \
  "urlclassifier.features.socialtracking.skipURLs"
#define TABLE_SOCIALTRACKING_BLOCKLIST_PREF "socialtracking-blocklist-pref"
#define TABLE_SOCIALTRACKING_ENTITYLIST_PREF "socialtracking-entitylist-pref"

StaticRefPtr<UrlClassifierFeatureSocialTrackingProtection>
    gFeatureSocialTrackingProtection;

}  // namespace

UrlClassifierFeatureSocialTrackingProtection::
    UrlClassifierFeatureSocialTrackingProtection()
    : UrlClassifierFeatureAntiTrackingBase(
          nsLiteralCString(SOCIALTRACKING_FEATURE_NAME),
          nsLiteralCString(URLCLASSIFIER_SOCIALTRACKING_BLOCKLIST),
          nsLiteralCString(URLCLASSIFIER_SOCIALTRACKING_ENTITYLIST),
          nsLiteralCString(URLCLASSIFIER_SOCIALTRACKING_BLOCKLIST_TEST_ENTRIES),
          nsLiteralCString(
              URLCLASSIFIER_SOCIALTRACKING_ENTITYLIST_TEST_ENTRIES),
          nsLiteralCString(TABLE_SOCIALTRACKING_BLOCKLIST_PREF),
          nsLiteralCString(TABLE_SOCIALTRACKING_ENTITYLIST_PREF),
          nsLiteralCString(URLCLASSIFIER_SOCIALTRACKING_EXCEPTION_URLS)) {}

/* static */ const char* UrlClassifierFeatureSocialTrackingProtection::Name() {
  return SOCIALTRACKING_FEATURE_NAME;
}

/* static */
void UrlClassifierFeatureSocialTrackingProtection::MaybeInitialize() {
  UC_LOG_LEAK(
      ("UrlClassifierFeatureSocialTrackingProtection::MaybeInitialize"));

  if (!gFeatureSocialTrackingProtection) {
    gFeatureSocialTrackingProtection =
        new UrlClassifierFeatureSocialTrackingProtection();
    gFeatureSocialTrackingProtection->InitializePreferences();
  }
}

/* static */
void UrlClassifierFeatureSocialTrackingProtection::MaybeShutdown() {
  UC_LOG_LEAK(("UrlClassifierFeatureSocialTrackingProtection::MaybeShutdown"));

  if (gFeatureSocialTrackingProtection) {
    gFeatureSocialTrackingProtection->ShutdownPreferences();
    gFeatureSocialTrackingProtection = nullptr;
  }
}

/* static */
already_AddRefed<UrlClassifierFeatureSocialTrackingProtection>
UrlClassifierFeatureSocialTrackingProtection::MaybeCreate(
    nsIChannel* aChannel) {
  MOZ_ASSERT(aChannel);

  UC_LOG_LEAK(
      ("UrlClassifierFeatureSocialTrackingProtection::MaybeCreate - channel %p",
       aChannel));

  if (!ScopedPrefs::BoolPrefScoped(
          ScopedPrefs::PRIVACY_TRACKINGPROTECTION_SOCIALTRACKING_ENABLED,
          aChannel)) {
    return nullptr;
  }

  RefPtr<nsILoadInfo> loadInfo = aChannel->LoadInfo();
  bool isThirdParty = loadInfo->GetIsThirdPartyContextToTopWindow();
  if (!isThirdParty) {
    UC_LOG(
        ("UrlClassifierFeatureSocialTrackingProtection::MaybeCreate - "
         "skipping first party or top-level load for channel %p",
         aChannel));
    return nullptr;
  }

  if (!UrlClassifierCommon::ShouldEnableProtectionForChannel(aChannel)) {
    return nullptr;
  }

  MaybeInitialize();
  MOZ_ASSERT(gFeatureSocialTrackingProtection);

  RefPtr<UrlClassifierFeatureSocialTrackingProtection> self =
      gFeatureSocialTrackingProtection;
  return self.forget();
}

/* static */
already_AddRefed<nsIUrlClassifierFeature>
UrlClassifierFeatureSocialTrackingProtection::GetIfNameMatches(
    const nsACString& aName) {
  if (!aName.EqualsLiteral(SOCIALTRACKING_FEATURE_NAME)) {
    return nullptr;
  }

  MaybeInitialize();
  MOZ_ASSERT(gFeatureSocialTrackingProtection);

  RefPtr<UrlClassifierFeatureSocialTrackingProtection> self =
      gFeatureSocialTrackingProtection;
  return self.forget();
}

NS_IMETHODIMP
UrlClassifierFeatureSocialTrackingProtection::ProcessChannel(
    nsIChannel* aChannel, const nsTArray<nsCString>& aList,
    const nsTArray<nsCString>& aHashes, bool* aShouldContinue) {
  NS_ENSURE_ARG_POINTER(aChannel);
  NS_ENSURE_ARG_POINTER(aShouldContinue);

  bool isAllowListed = ChannelClassifierUtils::IsAllowListed(aChannel);

  // This is a blocking feature.
  *aShouldContinue = isAllowListed;

  if (isAllowListed) {
    return NS_OK;
  }

  bool ShouldProcessByProtectionFeature =
      UrlClassifierCommon::ShouldProcessWithProtectionFeature(aChannel);

  *aShouldContinue = !ShouldProcessByProtectionFeature;

  if (!ShouldProcessByProtectionFeature) {
    return NS_OK;
  }

  nsAutoCString list;
  UrlClassifierCommon::TablesToString(aList, list);

  // We are reusing the replaced and allowed tracking content events here if
  // the shim allowed or replaced the channel.
  // Note: If we need to account for which kind of tracker was replaced,
  // we need to create a new event type in nsIWebProgressListener
  ChannelBlockDecision decision;
  nsresult rv = ChannelClassifierUtils::MaybeBlockChannel(
      aChannel, mName, list, NS_ERROR_SOCIALTRACKING_URI,
      nsIWebProgressListener::STATE_REPLACED_TRACKING_CONTENT,
      nsIWebProgressListener::STATE_ALLOWED_TRACKING_CONTENT, &decision);
  *aShouldContinue = (decision != ChannelBlockDecision::Blocked);
  return rv;
}

NS_IMETHODIMP
UrlClassifierFeatureSocialTrackingProtection::GetURIByListType(
    nsIChannel* aChannel, nsIUrlClassifierFeature::listType aListType,
    nsIUrlClassifierFeature::URIType* aURIType, nsIURI** aURI) {
  NS_ENSURE_ARG_POINTER(aChannel);
  NS_ENSURE_ARG_POINTER(aURIType);
  NS_ENSURE_ARG_POINTER(aURI);

  if (aListType == nsIUrlClassifierFeature::blocklist) {
    *aURIType = nsIUrlClassifierFeature::blocklistURI;
    return aChannel->GetURI(aURI);
  }

  MOZ_ASSERT(aListType == nsIUrlClassifierFeature::entitylist);

  *aURIType = nsIUrlClassifierFeature::pairwiseEntitylistURI;
  return UrlClassifierCommon::CreatePairwiseEntityListURI(aChannel, aURI);
}

}  // namespace net
}  // namespace mozilla
