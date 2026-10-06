/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "UrlClassifierFeatureTrackingProtection.h"

#include "mozilla/AntiTrackingUtils.h"
#include "mozilla/ScopedPrefs.h"
#include "mozilla/net/ChannelClassifierUtils.h"
#include "mozilla/net/UrlClassifierCommon.h"
#include "nsIChannel.h"
#include "nsILoadContext.h"
#include "nsNetUtil.h"
#include "mozilla/StaticPtr.h"
#include "nsXULAppAPI.h"
#include "nsIWebProgressListener.h"

namespace mozilla {
namespace net {

namespace {

#define TRACKING_PROTECTION_FEATURE_NAME "tracking-protection"

#define URLCLASSIFIER_TRACKING_BLOCKLIST "urlclassifier.trackingTable"
#define URLCLASSIFIER_TRACKING_BLOCKLIST_TEST_ENTRIES \
  "urlclassifier.trackingTable.testEntries"
#define URLCLASSIFIER_TRACKING_ENTITYLIST "urlclassifier.trackingWhitelistTable"
#define URLCLASSIFIER_TRACKING_ENTITYLIST_TEST_ENTRIES \
  "urlclassifier.trackingWhitelistTable.testEntries"
#define URLCLASSIFIER_TRACKING_PROTECTION_EXCEPTION_URLS \
  "urlclassifier.trackingSkipURLs"
#define TABLE_TRACKING_BLOCKLIST_PREF "tracking-blocklist-pref"
#define TABLE_TRACKING_ENTITYLIST_PREF "tracking-entitylist-pref"

StaticRefPtr<UrlClassifierFeatureTrackingProtection> gFeatureTrackingProtection;

}  // namespace

UrlClassifierFeatureTrackingProtection::UrlClassifierFeatureTrackingProtection()
    : UrlClassifierFeatureAntiTrackingBase(
          nsLiteralCString(TRACKING_PROTECTION_FEATURE_NAME),
          nsLiteralCString(URLCLASSIFIER_TRACKING_BLOCKLIST),
          nsLiteralCString(URLCLASSIFIER_TRACKING_ENTITYLIST),
          nsLiteralCString(URLCLASSIFIER_TRACKING_BLOCKLIST_TEST_ENTRIES),
          nsLiteralCString(URLCLASSIFIER_TRACKING_ENTITYLIST_TEST_ENTRIES),
          nsLiteralCString(TABLE_TRACKING_BLOCKLIST_PREF),
          nsLiteralCString(TABLE_TRACKING_ENTITYLIST_PREF),
          nsLiteralCString(URLCLASSIFIER_TRACKING_PROTECTION_EXCEPTION_URLS)) {}

/* static */ const char* UrlClassifierFeatureTrackingProtection::Name() {
  return TRACKING_PROTECTION_FEATURE_NAME;
}

/* static */
void UrlClassifierFeatureTrackingProtection::MaybeInitialize() {
  MOZ_ASSERT(XRE_IsParentProcess());
  UC_LOG_LEAK(("UrlClassifierFeatureTrackingProtection::MaybeInitialize"));

  if (!gFeatureTrackingProtection) {
    gFeatureTrackingProtection = new UrlClassifierFeatureTrackingProtection();
    gFeatureTrackingProtection->InitializePreferences();
  }
}

/* static */
void UrlClassifierFeatureTrackingProtection::MaybeShutdown() {
  UC_LOG_LEAK(("UrlClassifierFeatureTrackingProtection::MaybeShutdown"));

  if (gFeatureTrackingProtection) {
    gFeatureTrackingProtection->ShutdownPreferences();
    gFeatureTrackingProtection = nullptr;
  }
}

/* static */
already_AddRefed<UrlClassifierFeatureTrackingProtection>
UrlClassifierFeatureTrackingProtection::MaybeCreate(nsIChannel* aChannel) {
  MOZ_ASSERT(aChannel);

  UC_LOG_LEAK(
      ("UrlClassifierFeatureTrackingProtection::MaybeCreate - channel %p",
       aChannel));

#ifdef ANDROID  // TODO(Bug 2005278): keep behavior between platforms consistent
  nsCOMPtr<nsILoadContext> loadContext;
  NS_QueryNotificationCallbacks(aChannel, loadContext);
  if (!loadContext) {
    // Some channels don't have a loadcontext, check the global tracking
    // protection preference with potential scoped overrides
    if (!ScopedPrefs::BoolPrefScoped(
            ScopedPrefs::PRIVACY_TRACKINGPROTECTION_ENABLED, aChannel)) {
      return nullptr;
    }
  } else if (!loadContext->UseTrackingProtection()) {
    return nullptr;
  }
#else   // !ANDROID
  // Always check tracking protection pref on desktop
  if (!ScopedPrefs::BoolPrefScoped(
          ScopedPrefs::PRIVACY_TRACKINGPROTECTION_ENABLED, aChannel)) {
    return nullptr;
  }
#endif  // ANDROID

  RefPtr<nsILoadInfo> loadInfo = aChannel->LoadInfo();
  bool isThirdParty = loadInfo->GetIsThirdPartyContextToTopWindow();
  if (!isThirdParty) {
    UC_LOG(
        ("UrlClassifierFeatureTrackingProtection::MaybeCreate - "
         "skipping first party or top-level load for channel %p",
         aChannel));
    return nullptr;
  }

  if (!UrlClassifierCommon::ShouldEnableProtectionForChannel(aChannel)) {
    return nullptr;
  }

  MaybeInitialize();
  MOZ_ASSERT(gFeatureTrackingProtection);

  RefPtr<UrlClassifierFeatureTrackingProtection> self =
      gFeatureTrackingProtection;
  return self.forget();
}

/* static */
already_AddRefed<nsIUrlClassifierFeature>
UrlClassifierFeatureTrackingProtection::GetIfNameMatches(
    const nsACString& aName) {
  if (!aName.EqualsLiteral(TRACKING_PROTECTION_FEATURE_NAME)) {
    return nullptr;
  }

  MaybeInitialize();
  MOZ_ASSERT(gFeatureTrackingProtection);

  RefPtr<UrlClassifierFeatureTrackingProtection> self =
      gFeatureTrackingProtection;
  return self.forget();
}

NS_IMETHODIMP
UrlClassifierFeatureTrackingProtection::ProcessChannel(
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

  ChannelBlockDecision decision;
  nsresult rv = ChannelClassifierUtils::MaybeBlockChannel(
      aChannel, mName, list, NS_ERROR_TRACKING_URI,
      nsIWebProgressListener::STATE_REPLACED_TRACKING_CONTENT,
      nsIWebProgressListener::STATE_ALLOWED_TRACKING_CONTENT, &decision);
  *aShouldContinue = (decision != ChannelBlockDecision::Blocked);
  return rv;
}

NS_IMETHODIMP
UrlClassifierFeatureTrackingProtection::GetURIByListType(
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
