/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "UrlClassifierFeatureEmailTrackingProtection.h"

#include "mozilla/AntiTrackingUtils.h"
#include "mozilla/net/ChannelClassifierUtils.h"
#include "mozilla/net/UrlClassifierCommon.h"
#include "mozilla/ScopedPrefs.h"
#include "mozilla/StaticPtr.h"
#include "nsIChannel.h"
#include "nsILoadContext.h"
#include "nsIWebProgressListener.h"
#include "nsNetUtil.h"

namespace mozilla::net {

namespace {

#define EMAIL_TRACKING_PROTECTION_FEATURE_NAME "emailtracking-protection"

#define URLCLASSIFIER_EMAIL_TRACKING_BLOCKLIST \
  "urlclassifier.features.emailtracking.blocklistTables"
#define URLCLASSIFIER_EMAIL_TRACKING_BLOCKLIST_TEST_ENTRIES \
  "urlclassifier.features.emailtracking.blocklistHosts"
#define URLCLASSIFIER_EMAIL_TRACKING_ENTITYLIST \
  "urlclassifier.features.emailtracking.allowlistTables"
#define URLCLASSIFIER_EMAIL_TRACKING_ENTITYLIST_TEST_ENTRIES \
  "urlclassifier.features.emailtracking.allowlistHosts"
#define URLCLASSIFIER_EMAIL_TRACKING_PROTECTION_EXCEPTION_URLS \
  "urlclassifier.features.emailtracking.skipURLs"
#define TABLE_EMAIL_TRACKING_BLOCKLIST_PREF "emailtracking-blocklist-pref"
#define TABLE_EMAIL_TRACKING_ENTITYLIST_PREF "emailtracking-allowlist-pref"

StaticRefPtr<UrlClassifierFeatureEmailTrackingProtection>
    gFeatureEmailTrackingProtection;

}  // namespace

UrlClassifierFeatureEmailTrackingProtection::
    UrlClassifierFeatureEmailTrackingProtection()
    : UrlClassifierFeatureAntiTrackingBase(
          nsLiteralCString(EMAIL_TRACKING_PROTECTION_FEATURE_NAME),
          nsLiteralCString(URLCLASSIFIER_EMAIL_TRACKING_BLOCKLIST),
          nsLiteralCString(URLCLASSIFIER_EMAIL_TRACKING_ENTITYLIST),
          nsLiteralCString(URLCLASSIFIER_EMAIL_TRACKING_BLOCKLIST_TEST_ENTRIES),
          nsLiteralCString(
              URLCLASSIFIER_EMAIL_TRACKING_ENTITYLIST_TEST_ENTRIES),
          nsLiteralCString(TABLE_EMAIL_TRACKING_BLOCKLIST_PREF),
          nsLiteralCString(TABLE_EMAIL_TRACKING_ENTITYLIST_PREF),
          nsLiteralCString(
              URLCLASSIFIER_EMAIL_TRACKING_PROTECTION_EXCEPTION_URLS)) {}

/* static */
const char* UrlClassifierFeatureEmailTrackingProtection::Name() {
  return EMAIL_TRACKING_PROTECTION_FEATURE_NAME;
}

/* static */
void UrlClassifierFeatureEmailTrackingProtection::MaybeInitialize() {
  MOZ_ASSERT(XRE_IsParentProcess());
  UC_LOG_LEAK(("UrlClassifierFeatureEmailTrackingProtection::MaybeInitialize"));

  if (!gFeatureEmailTrackingProtection) {
    gFeatureEmailTrackingProtection =
        new UrlClassifierFeatureEmailTrackingProtection();
    gFeatureEmailTrackingProtection->InitializePreferences();
  }
}

/* static */
void UrlClassifierFeatureEmailTrackingProtection::MaybeShutdown() {
  UC_LOG_LEAK(("UrlClassifierFeatureEmailTrackingProtection::MaybeShutdown"));

  if (gFeatureEmailTrackingProtection) {
    gFeatureEmailTrackingProtection->ShutdownPreferences();
    gFeatureEmailTrackingProtection = nullptr;
  }
}

/* static */
already_AddRefed<UrlClassifierFeatureEmailTrackingProtection>
UrlClassifierFeatureEmailTrackingProtection::MaybeCreate(nsIChannel* aChannel) {
  MOZ_ASSERT(aChannel);

  UC_LOG_LEAK(
      ("UrlClassifierFeatureEmailTrackingProtection::MaybeCreate - channel %p",
       aChannel));

  // Check if the email tracking protection is enabled.
  if (!ScopedPrefs::BoolPrefScoped(
          ScopedPrefs::PRIVACY_TRACKINGPROTECTION_EMAILTRACKING_ENABLED,
          aChannel)) {
    return nullptr;
  }

  RefPtr<nsILoadInfo> loadInfo = aChannel->LoadInfo();
  bool isThirdParty = loadInfo->GetIsThirdPartyContextToTopWindow();
  if (!isThirdParty) {
    UC_LOG(
        ("UrlClassifierFeatureEmailTrackingProtection::MaybeCreate - "
         "skipping first party or top-level load for channel %p",
         aChannel));
    return nullptr;
  }

  if (!UrlClassifierCommon::ShouldEnableProtectionForChannel(aChannel)) {
    return nullptr;
  }

  MaybeInitialize();
  MOZ_ASSERT(gFeatureEmailTrackingProtection);

  RefPtr<UrlClassifierFeatureEmailTrackingProtection> self =
      gFeatureEmailTrackingProtection;
  return self.forget();
}

/* static */
already_AddRefed<nsIUrlClassifierFeature>
UrlClassifierFeatureEmailTrackingProtection::GetIfNameMatches(
    const nsACString& aName) {
  if (!aName.EqualsLiteral(EMAIL_TRACKING_PROTECTION_FEATURE_NAME)) {
    return nullptr;
  }

  MaybeInitialize();
  MOZ_ASSERT(gFeatureEmailTrackingProtection);

  RefPtr<UrlClassifierFeatureEmailTrackingProtection> self =
      gFeatureEmailTrackingProtection;
  return self.forget();
}

NS_IMETHODIMP
UrlClassifierFeatureEmailTrackingProtection::ProcessChannel(
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
      aChannel, mName, list, NS_ERROR_EMAILTRACKING_URI,
      nsIWebProgressListener::STATE_REPLACED_TRACKING_CONTENT,
      nsIWebProgressListener::STATE_ALLOWED_TRACKING_CONTENT, &decision);
  *aShouldContinue = (decision != ChannelBlockDecision::Blocked);
  return rv;
}

NS_IMETHODIMP
UrlClassifierFeatureEmailTrackingProtection::GetURIByListType(
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

}  // namespace mozilla::net
