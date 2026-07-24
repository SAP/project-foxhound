/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "UrlClassifierFeatureHarmfulAddonProtection.h"

#include "mozilla/AntiTrackingUtils.h"
#include "mozilla/extensions/WebExtensionPolicy.h"
#include "mozilla/glean/GleanPings.h"
#include "mozilla/glean/NetwerkMetrics.h"
#include "mozilla/net/UrlClassifierCommon.h"
#include "ChannelClassifierService.h"
#include "mozilla/StaticPrefs_privacy.h"
#include "nsNetUtil.h"
#include "mozilla/StaticPtr.h"
#include "nsIChannel.h"
#include "nsIEffectiveTLDService.h"
#include "nsIHttpChannelInternal.h"
#include "nsIObserverService.h"
#include "nsIWebProgressListener.h"
#include "nsIWritablePropertyBag2.h"

namespace mozilla {
namespace net {

namespace {

#define HARMFULADDON_FEATURE_NAME "harmfuladdon-protection"

#define URLCLASSIFIER_HARMFULADDON_BLOCKLIST \
  "urlclassifier.features.harmfuladdon.blocklistTables"
#define URLCLASSIFIER_HARMFULADDON_BLOCKLIST_TEST_ENTRIES \
  "urlclassifier.features.harmfuladdon.blocklistHosts"
#define URLCLASSIFIER_HARMFULADDON_ENTITYLIST \
  "urlclassifier.features.harmfuladdon.entitylistTables"
#define URLCLASSIFIER_HARMFULADDON_ENTITYLIST_TEST_ENTRIES \
  "urlclassifier.features.harmfuladdon.entitylistHosts"
#define URLCLASSIFIER_HARMFULADDON_EXCEPTION_URLS \
  "urlclassifier.features.harmfuladdon.skipURLs"
#define TABLE_HARMFULADDON_BLOCKLIST_PREF "harmfuladdon-blocklist-pref"
#define TABLE_HARMFULADDON_ENTITYLIST_PREF "harmfuladdon-entitylist-pref"

StaticRefPtr<UrlClassifierFeatureHarmfulAddonProtection>
    gFeatureHarmfulAddonProtection;

extensions::WebExtensionPolicy* GetAddonPolicy(nsIChannel* aChannel) {
  nsCOMPtr<nsILoadInfo> loadInfo = aChannel->LoadInfo();

  nsCOMPtr<nsIPrincipal> triggeringPrincipal;
  if (NS_FAILED(loadInfo->GetTriggeringPrincipal(
          getter_AddRefs(triggeringPrincipal)))) {
    return nullptr;
  }

  nsCOMPtr<nsIPrincipal> loadingPrincipal;
  if (NS_FAILED(
          loadInfo->GetLoadingPrincipal(getter_AddRefs(loadingPrincipal)))) {
    return nullptr;
  }

  extensions::WebExtensionPolicy* policy = nullptr;

  if (triggeringPrincipal) {
    policy = BasePrincipal::Cast(triggeringPrincipal)->AddonPolicy();

    if (!policy) {
      policy =
          BasePrincipal::Cast(triggeringPrincipal)->ContentScriptAddonPolicy();
    }
  }

  if (!policy && loadingPrincipal) {
    policy = BasePrincipal::Cast(loadingPrincipal)->AddonPolicy();

    if (!policy) {
      policy =
          BasePrincipal::Cast(loadingPrincipal)->ContentScriptAddonPolicy();
    }
  }

  return policy;
}

bool GetAddonIdAndVersion(nsIChannel* aChannel, nsACString& aAddonID,
                          nsACString& aAddonVersion) {
  extensions::WebExtensionPolicy* policy = GetAddonPolicy(aChannel);
  if (!policy) {
    return false;
  }

  CopyUTF16toUTF8(nsDependentAtomString(policy->Id()), aAddonID);
  CopyUTF16toUTF8(policy->Version(), aAddonVersion);
  return true;
}

bool GetAddonName(nsIChannel* aChannel, nsACString& aAddonName) {
  extensions::WebExtensionPolicy* policy = GetAddonPolicy(aChannel);
  if (!policy) {
    return false;
  }

  CopyUTF16toUTF8(policy->Name(), aAddonName);
  return true;
}

bool GetETLD(nsIChannel* aChannel, nsACString& aETLD) {
  nsCOMPtr<nsIURI> uri;
  nsresult rv = aChannel->GetURI(getter_AddRefs(uri));
  if (NS_WARN_IF(NS_FAILED(rv)) || !uri) {
    return false;
  }

  nsCOMPtr<nsIEffectiveTLDService> etld(
      do_GetService(NS_EFFECTIVETLDSERVICE_CONTRACTID));
  if (NS_WARN_IF(!etld)) {
    return false;
  }

  rv = etld->GetBaseDomain(uri, 0, aETLD);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return false;
  }

  return !aETLD.IsEmpty();
}

void RecordGleanAddonBlocked(nsIChannel* aChannel,
                             const nsACString& aTableStr) {
  nsAutoCString etld;
  if (!GetETLD(aChannel, etld)) {
    return;
  }

  nsAutoCString addonId;
  nsAutoCString addonVersion;
  if (!GetAddonIdAndVersion(aChannel, addonId, addonVersion)) {
    return;
  }

  glean::network::urlclassifier_harmful_addon_block.Record(
      Some(glean::network::UrlclassifierHarmfulAddonBlockExtra{
          mozilla::Some(addonId), mozilla::Some(addonVersion),
          mozilla::Some(etld), mozilla::Some(nsCString(aTableStr))}));
}

}  // namespace

class UrlClassifierFeatureHarmfulAddonProtection::PingSender final
    : public nsIObserver {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIOBSERVER

  PingSender() = default;

  void Register() {
    MOZ_ASSERT(NS_IsMainThread());

    nsCOMPtr<nsIObserverService> obsService =
        mozilla::services::GetObserverService();
    if (obsService) {
      obsService->AddObserver(this, "idle-daily", false);
    }
  }

  void Unregister() {
    MOZ_ASSERT(NS_IsMainThread());

    nsCOMPtr<nsIObserverService> obsService =
        mozilla::services::GetObserverService();
    if (obsService) {
      obsService->RemoveObserver(this, "idle-daily");
    }
  }

 private:
  ~PingSender() = default;
};

NS_IMPL_ISUPPORTS(UrlClassifierFeatureHarmfulAddonProtection::PingSender,
                  nsIObserver)

NS_IMETHODIMP
UrlClassifierFeatureHarmfulAddonProtection::PingSender::Observe(
    nsISupports* aSubject, const char* aTopic, const char16_t*) {
  glean_pings::UrlClassifierHarmfulAddon.Submit();
  return NS_OK;
}

UrlClassifierFeatureHarmfulAddonProtection::
    UrlClassifierFeatureHarmfulAddonProtection()
    : UrlClassifierFeatureAntiTrackingBase(
          nsLiteralCString(HARMFULADDON_FEATURE_NAME),
          nsLiteralCString(URLCLASSIFIER_HARMFULADDON_BLOCKLIST),
          nsLiteralCString(URLCLASSIFIER_HARMFULADDON_ENTITYLIST),
          nsLiteralCString(URLCLASSIFIER_HARMFULADDON_BLOCKLIST_TEST_ENTRIES),
          nsLiteralCString(URLCLASSIFIER_HARMFULADDON_ENTITYLIST_TEST_ENTRIES),
          nsLiteralCString(TABLE_HARMFULADDON_BLOCKLIST_PREF),
          nsLiteralCString(TABLE_HARMFULADDON_ENTITYLIST_PREF),
          nsLiteralCString(URLCLASSIFIER_HARMFULADDON_EXCEPTION_URLS)) {
  mPingSender = new UrlClassifierFeatureHarmfulAddonProtection::PingSender();
  mPingSender->Register();
}

/* static */ const char* UrlClassifierFeatureHarmfulAddonProtection::Name() {
  return HARMFULADDON_FEATURE_NAME;
}

UrlClassifierFeatureHarmfulAddonProtection::
    ~UrlClassifierFeatureHarmfulAddonProtection() {
  if (mPingSender) {
    mPingSender->Unregister();
    mPingSender = nullptr;
  }
}

/* static */
void UrlClassifierFeatureHarmfulAddonProtection::MaybeInitialize() {
  UC_LOG_LEAK(("UrlClassifierFeatureHarmfulAddonProtection::MaybeInitialize"));

  if (!gFeatureHarmfulAddonProtection) {
    gFeatureHarmfulAddonProtection =
        new UrlClassifierFeatureHarmfulAddonProtection();
    gFeatureHarmfulAddonProtection->InitializePreferences();
  }
}

/* static */
void UrlClassifierFeatureHarmfulAddonProtection::MaybeShutdown() {
  UC_LOG_LEAK(("UrlClassifierFeatureHarmfulAddonProtection::MaybeShutdown"));

  if (gFeatureHarmfulAddonProtection) {
    gFeatureHarmfulAddonProtection->ShutdownPreferences();
    gFeatureHarmfulAddonProtection = nullptr;
  }
}

/* static */
already_AddRefed<UrlClassifierFeatureHarmfulAddonProtection>
UrlClassifierFeatureHarmfulAddonProtection::MaybeCreate(nsIChannel* aChannel) {
  MOZ_ASSERT(aChannel);

  UC_LOG_LEAK(
      ("UrlClassifierFeatureHarmfulAddonProtection::MaybeCreate - channel %p",
       aChannel));

  if (!StaticPrefs::privacy_trackingprotection_harmfuladdon_enabled()) {
    return nullptr;
  }

  RefPtr<nsILoadInfo> loadInfo = aChannel->LoadInfo();
  nsIPrincipal* triggeringPrincipal = loadInfo->TriggeringPrincipal();
  bool addonTriggeringPrincipal =
      triggeringPrincipal &&
      triggeringPrincipal->GetIsAddonOrExpandedAddonPrincipal();

  nsIPrincipal* loadingPrincipal = loadInfo->GetLoadingPrincipal();
  bool addonLoadingPrincipal =
      loadingPrincipal &&
      loadingPrincipal->GetIsAddonOrExpandedAddonPrincipal();

  if (!addonTriggeringPrincipal && !addonLoadingPrincipal) {
    return nullptr;
  }

  // Recommended add-ons are exempt.
  extensions::WebExtensionPolicy* policy = GetAddonPolicy(aChannel);
  if (policy && policy->HasRecommendedState()) {
    return nullptr;
  }

  MaybeInitialize();
  MOZ_ASSERT(gFeatureHarmfulAddonProtection);

  RefPtr<UrlClassifierFeatureHarmfulAddonProtection> self =
      gFeatureHarmfulAddonProtection;
  return self.forget();
}

/* static */
already_AddRefed<nsIUrlClassifierFeature>
UrlClassifierFeatureHarmfulAddonProtection::GetIfNameMatches(
    const nsACString& aName) {
  if (!aName.EqualsLiteral(HARMFULADDON_FEATURE_NAME)) {
    return nullptr;
  }

  MaybeInitialize();
  MOZ_ASSERT(gFeatureHarmfulAddonProtection);

  RefPtr<UrlClassifierFeatureHarmfulAddonProtection> self =
      gFeatureHarmfulAddonProtection;
  return self.forget();
}

NS_IMETHODIMP
UrlClassifierFeatureHarmfulAddonProtection::ProcessChannel(
    nsIChannel* aChannel, const nsTArray<nsCString>& aList,
    const nsTArray<nsCString>& aHashes, bool* aShouldContinue) {
  NS_ENSURE_ARG_POINTER(aChannel);
  NS_ENSURE_ARG_POINTER(aShouldContinue);

  bool isAllowListed = UrlClassifierCommon::IsAllowListed(aChannel);

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

  ChannelBlockDecision decision =
      ChannelClassifierService::OnBeforeBlockChannel(aChannel, mName, list);
  if (decision != ChannelBlockDecision::Blocked) {
    *aShouldContinue = true;
    return NS_OK;
  }

  RecordGleanAddonBlocked(aChannel, list);

  nsAutoCString addonName;
  if (GetAddonName(aChannel, addonName)) {
    nsCOMPtr<nsIWritablePropertyBag2> props(do_QueryInterface(aChannel));
    if (props) {
      props->SetPropertyAsACString(u"blockedExtension"_ns, addonName);
    }
  }

  UrlClassifierCommon::SetBlockedContent(aChannel, NS_ERROR_HARMFULADDON_URI,
                                         list, ""_ns, ""_ns);

  UC_LOG(
      ("UrlClassifierFeatureHarmfulAddonProtection::ProcessChannel - "
       "cancelling channel %p",
       aChannel));

  (void)aChannel->Cancel(NS_ERROR_HARMFULADDON_URI);
  return NS_OK;
}

NS_IMETHODIMP
UrlClassifierFeatureHarmfulAddonProtection::GetURIByListType(
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
  return aChannel->GetURI(aURI);
}

}  // namespace net
}  // namespace mozilla
