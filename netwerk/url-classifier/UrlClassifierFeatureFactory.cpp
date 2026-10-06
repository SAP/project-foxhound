/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/net/UrlClassifierFeatureFactory.h"

// List of Features
#include "UrlClassifierFeatureAntiFraudAnnotation.h"
#include "UrlClassifierFeatureCryptominingAnnotation.h"
#include "UrlClassifierFeatureCryptominingProtection.h"
#include "UrlClassifierFeatureConsentManagerAnnotation.h"
#include "UrlClassifierFeatureEmailTrackingDataCollection.h"
#include "UrlClassifierFeatureEmailTrackingProtection.h"
#include "UrlClassifierFeatureFingerprintingAnnotation.h"
#include "UrlClassifierFeatureFingerprintingProtection.h"
#include "UrlClassifierFeatureGlobalCache.h"
#include "UrlClassifierFeatureHarmfulAddonProtection.h"
#include "UrlClassifierFeaturePhishingProtection.h"
#include "UrlClassifierFeatureSocialTrackingAnnotation.h"
#include "UrlClassifierFeatureSocialTrackingProtection.h"
#include "UrlClassifierFeatureTrackingProtection.h"
#include "UrlClassifierFeatureTrackingAnnotation.h"
#include "UrlClassifierFeatureCustomTables.h"

#include "nsAppRunner.h"

namespace mozilla {
namespace net {

/* static */
void UrlClassifierFeatureFactory::Shutdown() {
  // We want to expose Features only in the parent process.
  if (!XRE_IsParentProcess()) {
    return;
  }

  UrlClassifierFeatureCryptominingAnnotation::MaybeShutdown();
  UrlClassifierFeatureCryptominingProtection::MaybeShutdown();
  UrlClassifierFeatureConsentManagerAnnotation::MaybeShutdown();
  UrlClassifierFeatureAntiFraudAnnotation::MaybeShutdown();
  UrlClassifierFeatureEmailTrackingDataCollection::MaybeShutdown();
  UrlClassifierFeatureEmailTrackingProtection::MaybeShutdown();
  UrlClassifierFeatureFingerprintingAnnotation::MaybeShutdown();
  UrlClassifierFeatureFingerprintingProtection::MaybeShutdown();
  UrlClassifierFeatureGlobalCache::MaybeShutdown();
  UrlClassifierFeaturePhishingProtection::MaybeShutdown();
  UrlClassifierFeatureSocialTrackingAnnotation::MaybeShutdown();
  UrlClassifierFeatureSocialTrackingProtection::MaybeShutdown();
  UrlClassifierFeatureTrackingAnnotation::MaybeShutdown();
  UrlClassifierFeatureTrackingProtection::MaybeShutdown();
  UrlClassifierFeatureHarmfulAddonProtection::MaybeShutdown();
}

/* static */
void UrlClassifierFeatureFactory::GetFeaturesFromChannel(
    nsIChannel* aChannel,
    nsTArray<nsCOMPtr<nsIUrlClassifierFeature>>& aFeatures) {
  UrlClassifierFeatureFactory::GetCancelingFeaturesFromChannel(aChannel,
                                                               aFeatures);
  UrlClassifierFeatureFactory::GetNonCancelingFeaturesFromChannel(aChannel,
                                                                  aFeatures);
}

/* static */
void UrlClassifierFeatureFactory::GetCancelingFeaturesFromChannel(
    nsIChannel* aChannel,
    nsTArray<nsCOMPtr<nsIUrlClassifierFeature>>& aFeatures) {
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(aChannel);

  nsCOMPtr<nsIUrlClassifierFeature> feature;

  // Note that the order of the features is extremely important! When more than
  // 1 feature classifies the channel, we call ::ProcessChannel() following this
  // feature order, and this could produce different results with a different
  // feature ordering.

  // The first three features here do not actually perform the blocking
  // themselves, but they either must be run before any blocking features or
  // affect the outcome of other blocking features.

  // Email Tracking Data Collection
  // This needs to be run before other features so that other blocking features
  // won't stop us to collect data for email trackers. Note that this feature
  // is not a blocking feature.
  feature =
      UrlClassifierFeatureEmailTrackingDataCollection::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }

  // Consent Manager Annotation
  // This must be run before any blocking features because the annotation will
  // affect whether the channel should be blocked.
  feature = UrlClassifierFeatureConsentManagerAnnotation::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }

  // Anti-fraud Annotation
  // This must be run before any blocking features because the annotation will
  // affect whether the channel should be blocked.
  feature = UrlClassifierFeatureAntiFraudAnnotation::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }

  // Email Tracking Protection
  feature = UrlClassifierFeatureEmailTrackingProtection::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }

  // Cryptomining Protection
  feature = UrlClassifierFeatureCryptominingProtection::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }

  // Fingerprinting Protection
  feature = UrlClassifierFeatureFingerprintingProtection::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }

  // SocialTracking Protection
  feature = UrlClassifierFeatureSocialTrackingProtection::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }

  // Addon Protection
  feature = UrlClassifierFeatureHarmfulAddonProtection::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }

  // Tracking Protection
  feature = UrlClassifierFeatureTrackingProtection::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }
}

/* static */
void UrlClassifierFeatureFactory::GetNonCancelingFeaturesFromChannel(
    nsIChannel* aChannel,
    nsTArray<nsCOMPtr<nsIUrlClassifierFeature>>& aFeatures) {
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(aChannel);
  nsCOMPtr<nsIUrlClassifierFeature> feature;

  // Cryptomining Annotation
  feature = UrlClassifierFeatureCryptominingAnnotation::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }

  // Fingerprinting Annotation
  feature = UrlClassifierFeatureFingerprintingAnnotation::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }

  // SocialTracking Annotation
  feature = UrlClassifierFeatureSocialTrackingAnnotation::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }

  // Tracking Annotation
  feature = UrlClassifierFeatureTrackingAnnotation::MaybeCreate(aChannel);
  if (feature) {
    aFeatures.AppendElement(feature);
  }
}

/* static */
void UrlClassifierFeatureFactory::GetPhishingProtectionFeatures(
    nsTArray<RefPtr<nsIUrlClassifierFeature>>& aFeatures) {
  UrlClassifierFeaturePhishingProtection::MaybeCreate(aFeatures);
}

/* static */
void UrlClassifierFeatureFactory::GetRealTimeProtectionFeatures(
    nsTArray<RefPtr<nsIUrlClassifierFeature>>& aFeatures) {
  nsCOMPtr<nsIUrlClassifierFeature> feature;

  feature = UrlClassifierFeatureGlobalCache::MaybeCreate();
  if (feature) {
    aFeatures.AppendElement(feature);
  }
}

/* static */
already_AddRefed<nsIUrlClassifierFeature>
UrlClassifierFeatureFactory::GetFeatureByName(const nsACString& aName) {
  if (!XRE_IsParentProcess()) {
    return nullptr;
  }

  nsCOMPtr<nsIUrlClassifierFeature> feature;

  // Anti-fraud Annotation
  feature = UrlClassifierFeatureAntiFraudAnnotation::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // Cryptomining Annotation
  feature = UrlClassifierFeatureCryptominingAnnotation::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // Cryptomining Protection
  feature = UrlClassifierFeatureCryptominingProtection::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // Consent Manager Annotation
  feature =
      UrlClassifierFeatureConsentManagerAnnotation::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // Email Tracking Data Collection
  feature =
      UrlClassifierFeatureEmailTrackingDataCollection::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // Email Tracking Protection
  feature =
      UrlClassifierFeatureEmailTrackingProtection::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // Fingerprinting Annotation
  feature =
      UrlClassifierFeatureFingerprintingAnnotation::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // Fingerprinting Protection
  feature =
      UrlClassifierFeatureFingerprintingProtection::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // GlobalCache
  feature = UrlClassifierFeatureGlobalCache::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // SocialTracking Annotation
  feature =
      UrlClassifierFeatureSocialTrackingAnnotation::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // SocialTracking Protection
  feature =
      UrlClassifierFeatureSocialTrackingProtection::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // Tracking Protection
  feature = UrlClassifierFeatureTrackingProtection::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // Tracking Annotation
  feature = UrlClassifierFeatureTrackingAnnotation::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // PhishingProtection features
  feature = UrlClassifierFeaturePhishingProtection::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  // Addon Protection
  feature = UrlClassifierFeatureHarmfulAddonProtection::GetIfNameMatches(aName);
  if (feature) {
    return feature.forget();
  }

  return nullptr;
}

/* static */
void UrlClassifierFeatureFactory::GetFeatureNames(nsTArray<nsCString>& aArray) {
  if (!XRE_IsParentProcess()) {
    return;
  }

  nsAutoCString name;

  // Anti-fraud Annotation
  name.Assign(UrlClassifierFeatureAntiFraudAnnotation::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // Cryptomining Annotation
  name.Assign(UrlClassifierFeatureCryptominingAnnotation::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // Cryptomining Protection
  name.Assign(UrlClassifierFeatureCryptominingProtection::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // Consent Manager Annotation
  name.Assign(UrlClassifierFeatureConsentManagerAnnotation::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // Email Tracking Data Collection
  name.Assign(UrlClassifierFeatureEmailTrackingDataCollection::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // Email Tracking Protection
  name.Assign(UrlClassifierFeatureEmailTrackingProtection::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // Fingerprinting Annotation
  name.Assign(UrlClassifierFeatureFingerprintingAnnotation::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // Fingerprinting Protection
  name.Assign(UrlClassifierFeatureFingerprintingProtection::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // GlobalCache
  name.Assign(UrlClassifierFeatureGlobalCache::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // SocialTracking Annotation
  name.Assign(UrlClassifierFeatureSocialTrackingAnnotation::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // SocialTracking Protection
  name.Assign(UrlClassifierFeatureSocialTrackingProtection::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // Tracking Protection
  name.Assign(UrlClassifierFeatureTrackingProtection::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // Tracking Annotation
  name.Assign(UrlClassifierFeatureTrackingAnnotation::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // Addon Protection
  name.Assign(UrlClassifierFeatureHarmfulAddonProtection::Name());
  if (!name.IsEmpty()) {
    aArray.AppendElement(name);
  }

  // PhishingProtection features
  {
    nsTArray<nsCString> features;
    UrlClassifierFeaturePhishingProtection::GetFeatureNames(features);
    aArray.AppendElements(features);
  }
}

/* static */
already_AddRefed<nsIUrlClassifierFeature>
UrlClassifierFeatureFactory::CreateFeatureWithTables(
    const nsACString& aName, const nsTArray<nsCString>& aBlocklistTables,
    const nsTArray<nsCString>& aEntitylistTables) {
  nsCOMPtr<nsIUrlClassifierFeature> feature =
      new UrlClassifierFeatureCustomTables(aName, aBlocklistTables,
                                           aEntitylistTables);
  return feature.forget();
}

}  // namespace net
}  // namespace mozilla
