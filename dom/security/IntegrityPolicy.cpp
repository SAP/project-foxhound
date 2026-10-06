/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IntegrityPolicy.h"

#include "mozilla/Logging.h"
#include "mozilla/StaticPrefs_security.h"
#include "mozilla/dom/RequestBinding.h"
#include "mozilla/dom/WindowGlobalChild.h"
#include "mozilla/ipc/PBackgroundSharedTypes.h"
#include "mozilla/net/SFV.h"
#include "nsCOMPtr.h"
#include "nsIClassInfoImpl.h"
#include "nsIObjectInputStream.h"
#include "nsIObjectOutputStream.h"
#include "nsString.h"

using namespace mozilla;

static LazyLogModule sIntegrityPolicyLogModule("IntegrityPolicy");
#define LOG(fmt, ...) \
  MOZ_LOG_FMT(sIntegrityPolicyLogModule, LogLevel::Debug, fmt, ##__VA_ARGS__)

namespace mozilla::dom {

RequestDestination ContentTypeToDestination(nsContentPolicyType aType) {
  // From SecFetch.cpp
  // https://searchfox.org/mozilla-central/rev/f1e32fa7054859d37eea8804e220dfcc7fb53b03/dom/security/SecFetch.cpp#24-32
  switch (aType) {
    case nsIContentPolicy::TYPE_INTERNAL_SCRIPT:
    case nsIContentPolicy::TYPE_INTERNAL_SCRIPT_PRELOAD:
    case nsIContentPolicy::TYPE_INTERNAL_MODULE:
    case nsIContentPolicy::TYPE_INTERNAL_MODULE_PRELOAD:
    // We currently only support documents.
    // case nsIContentPolicy::TYPE_INTERNAL_WORKER_IMPORT_SCRIPTS:
    case nsIContentPolicy::TYPE_INTERNAL_CHROMEUTILS_COMPILED_SCRIPT:
    case nsIContentPolicy::TYPE_INTERNAL_FRAME_MESSAGEMANAGER_SCRIPT:
    case nsIContentPolicy::TYPE_SCRIPT:
      return RequestDestination::Script;

    case nsIContentPolicy::TYPE_STYLESHEET:
    case nsIContentPolicy::TYPE_INTERNAL_STYLESHEET:
    case nsIContentPolicy::TYPE_INTERNAL_STYLESHEET_PRELOAD:
      return RequestDestination::Style;

    default:
      return RequestDestination::_empty;
  }
}

Maybe<IntegrityPolicy::DestinationType> DOMRequestDestinationToDestinationType(
    RequestDestination aDestination) {
  switch (aDestination) {
    case RequestDestination::Script:
      return Some(IntegrityPolicy::DestinationType::Script);
    case RequestDestination::Style:
      return StaticPrefs::security_integrity_policy_stylesheet_enabled()
                 ? Some(IntegrityPolicy::DestinationType::Style)
                 : Nothing{};

    default:
      return Nothing{};
  }
}

Maybe<IntegrityPolicy::DestinationType>
IntegrityPolicy::ContentTypeToDestinationType(nsContentPolicyType aType) {
  return DOMRequestDestinationToDestinationType(
      ContentTypeToDestination(aType));
}

// https://w3c.github.io/webappsec-subresource-integrity/#integrity-policy-section
// The headers' value is a Dictionary [RFC9651], with every member-value being
// an inner list of tokens.
nsresult GetTokenValuesFromInnerList(const net::SFV::InnerListResult& aList,
                                     nsTArray<nsCString>& aValues) {
  size_t len = aList.Length();
  for (size_t i = 0; i < len; i++) {
    auto item = aList.GetItemAt(i);
    if (!item.IsValid()) {
      return NS_ERROR_FAILURE;
    }

    nsAutoCString tokenValue;
    nsresult rv = item.GetValue<net::SFV::Token>(tokenValue);
    NS_ENSURE_SUCCESS(rv, rv);

    aValues.AppendElement(tokenValue);
  }

  return NS_OK;
}

/* static */
Result<IntegrityPolicy::Sources, nsresult> ParseSources(
    const net::SFV::DictResult& aDict) {
  // sources, a list of sources, Initially empty.

  // 3. If dictionary["sources"] does not exist or if its value contains
  // "inline", append "inline" to integrityPolicy's sources.
  auto innerList = aDict.GetInnerList("sources"_ns);
  if (!innerList.IsValid()) {
    // The key doesn't exists, set it to inline as per spec.
    return IntegrityPolicy::Sources(IntegrityPolicy::SourceType::Inline);
  }

  nsTArray<nsCString> sources;
  nsresult rv = GetTokenValuesFromInnerList(innerList, sources);
  NS_ENSURE_SUCCESS(rv, Err(rv));

  IntegrityPolicy::Sources result;
  for (const auto& source : sources) {
    if (source.EqualsLiteral("inline")) {
      result += IntegrityPolicy::SourceType::Inline;
    } else {
      LOG("ParseSources: Unknown source: {}", source.get());
      // Unknown source, we don't know how to handle it
      continue;
    }
  }

  return result;
}

/* static */
Result<IntegrityPolicy::Destinations, nsresult>
IntegrityPolicy::ParseDestinations(const net::SFV::DictResult& aDict,
                                   bool aIsWAICT) {
  // blocked destinations, a list of destinations, initially empty.

  auto innerList = aDict.GetInnerList("blocked-destinations"_ns);
  if (!innerList.IsValid()) {
    // Required in WAICT.
    if (aIsWAICT) {
      return Err(NS_ERROR_FAILURE);
    }
    return IntegrityPolicy::Destinations();
  }

  nsTArray<nsCString> destinations;
  nsresult rv = GetTokenValuesFromInnerList(innerList, destinations);
  NS_ENSURE_SUCCESS(rv, Err(rv));

  IntegrityPolicy::Destinations result;
  for (const auto& destination : destinations) {
    if (destination.EqualsLiteral("script")) {
      result += IntegrityPolicy::DestinationType::Script;
    } else if (destination.EqualsLiteral("style")) {
      if (StaticPrefs::security_integrity_policy_stylesheet_enabled()) {
        result += IntegrityPolicy::DestinationType::Style;
      }
    } else if (aIsWAICT && destination.EqualsLiteral("image")) {
      result += IntegrityPolicy::DestinationType::Image;
    } else {
      LOG("ParseDestinations: Unknown destination: {}", destination.get());
      // Unknown destination, we don't know how to handle it
      continue;
    }
  }

  return result;
}

/* static */
Result<nsTArray<nsCString>, nsresult> IntegrityPolicy::ParseEndpoints(
    const net::SFV::DictResult& aDict) {
  // endpoints, a list of strings, initially empty.
  auto innerList = aDict.GetInnerList("endpoints"_ns);
  if (!innerList.IsValid()) {
    // The key doesn't exists, return empty list.
    return nsTArray<nsCString>();
  }

  nsTArray<nsCString> endpoints;
  nsresult rv = GetTokenValuesFromInnerList(innerList, endpoints);
  NS_ENSURE_SUCCESS(rv, Err(rv));

  return endpoints;
}

/* static */
// https://w3c.github.io/webappsec-subresource-integrity/#processing-an-integrity-policy
nsresult IntegrityPolicy::ParseHeaders(const nsACString& aHeader,
                                       const nsACString& aHeaderRO,
                                       IntegrityPolicy** aPolicy) {
  if (!StaticPrefs::security_integrity_policy_enabled()) {
    return NS_OK;
  }

  // 1. Let integrityPolicy be a new integrity policy struct.
  // (Our struct contains two entries, one for the enforcement header and one
  // for report-only)
  RefPtr<IntegrityPolicy> policy = new IntegrityPolicy();

  LOG("[{}] Parsing headers: enforcement='{}' report-only='{}'",
      static_cast<void*>(policy), PromiseFlatCString(aHeader).get(),
      PromiseFlatCString(aHeaderRO).get());

  for (const auto& isROHeader : {false, true}) {
    const auto& headerString = isROHeader ? aHeaderRO : aHeader;

    if (headerString.IsEmpty()) {
      LOG("[{}] No {} header.", static_cast<void*>(policy),
          isROHeader ? "report-only" : "enforcement");
      continue;
    }

    // 2. Let dictionary be the result of getting a structured field value from
    // headers given headerName and "dictionary".
    auto dict = net::SFV::ParseDict(headerString);
    if (!dict.IsValid()) {
      LOG("[{}] Failed to parse {} header.", static_cast<void*>(policy),
          isROHeader ? "report-only" : "enforcement");
      continue;
    }

    // 3. If dictionary["sources"] does not exist or if its value contains
    // "inline", append "inline" to integrityPolicy’s sources.
    auto sourcesResult = ParseSources(dict);
    if (sourcesResult.isErr()) {
      LOG("[{}] Failed to parse sources for {} header.",
          static_cast<void*>(policy),
          isROHeader ? "report-only" : "enforcement");
      continue;
    }

    // 4. If dictionary["blocked-destinations"] exists:
    auto destinationsResult = ParseDestinations(dict, /* aIsWAICT */ false);
    if (destinationsResult.isErr()) {
      LOG("[{}] Failed to parse destinations for {} header.",
          static_cast<void*>(policy),
          isROHeader ? "report-only" : "enforcement");
      continue;
    }

    // 5. If dictionary["endpoints"] exists:
    auto endpointsResult = ParseEndpoints(dict);
    if (endpointsResult.isErr()) {
      LOG("[{}] Failed to parse endpoints for {} header.",
          static_cast<void*>(policy),
          isROHeader ? "report-only" : "enforcement");
      continue;
    }

    LOG("[{}] Creating policy for {} header. sources={} destinations={} "
        "endpoints=[{}]",
        static_cast<void*>(policy), isROHeader ? "report-only" : "enforcement",
        sourcesResult.unwrap().serialize(),
        destinationsResult.unwrap().serialize(),
        fmt::join(endpointsResult.unwrap(), ", "));

    Entry entry = Entry(sourcesResult.unwrap(), destinationsResult.unwrap(),
                        endpointsResult.unwrap());
    if (isROHeader) {
      policy->mReportOnly.emplace(entry);
    } else {
      policy->mEnforcement.emplace(entry);
    }
  }

  // 6. Return integrityPolicy.
  policy.forget(aPolicy);

  LOG("[{}] Finished parsing headers.", static_cast<void*>(policy));

  return NS_OK;
}

void IntegrityPolicy::PolicyContains(DestinationType aDestination,
                                     bool* aContains, bool* aROContains) const {
  // 10. Let block be a boolean, initially false.
  *aContains = false;
  // 11. Let reportBlock be a boolean, initially false.
  *aROContains = false;

  // 12. If policy’s sources contains "inline" and policy’s blocked destinations
  // contains request’s destination, set block to true.
  if (mEnforcement && mEnforcement->mDestinations.contains(aDestination) &&
      mEnforcement->mSources.contains(SourceType::Inline)) {
    *aContains = true;
  }

  // 13. If reportPolicy’s sources contains "inline" and reportPolicy’s blocked
  // destinations contains request’s destination, set reportBlock to true.
  if (mReportOnly && mReportOnly->mDestinations.contains(aDestination) &&
      mReportOnly->mSources.contains(SourceType::Inline)) {
    *aROContains = true;
  }
}

void IntegrityPolicy::Endpoints(nsTArray<nsCString>& aEnforcement,
                                nsTArray<nsCString>& aReportOnly) const {
  if (mEnforcement) {
    aEnforcement = mEnforcement->mEndpoints.Clone();
  }
  if (mReportOnly) {
    aReportOnly = mReportOnly->mEndpoints.Clone();
  }
}

void IntegrityPolicy::ToArgs(const IntegrityPolicy* aPolicy,
                             mozilla::ipc::IntegrityPolicyArgs& aArgs) {
  aArgs.enforcement() = Nothing();
  aArgs.reportOnly() = Nothing();

  if (!aPolicy) {
    return;
  }

  if (aPolicy->mEnforcement) {
    mozilla::ipc::IntegrityPolicyEntry entry;
    entry.sources() = aPolicy->mEnforcement->mSources;
    entry.destinations() = aPolicy->mEnforcement->mDestinations;
    entry.endpoints() = aPolicy->mEnforcement->mEndpoints.Clone();
    aArgs.enforcement() = Some(entry);
  }

  if (aPolicy->mReportOnly) {
    mozilla::ipc::IntegrityPolicyEntry entry;
    entry.sources() = aPolicy->mReportOnly->mSources;
    entry.destinations() = aPolicy->mReportOnly->mDestinations;
    entry.endpoints() = aPolicy->mReportOnly->mEndpoints.Clone();
    aArgs.reportOnly() = Some(entry);
  }
}

void IntegrityPolicy::FromArgs(const mozilla::ipc::IntegrityPolicyArgs& aArgs,
                               IntegrityPolicy** aPolicy) {
  RefPtr<IntegrityPolicy> policy = new IntegrityPolicy();

  if (aArgs.enforcement().isSome()) {
    const auto& entry = *aArgs.enforcement();
    policy->mEnforcement.emplace(Entry(entry.sources(), entry.destinations(),
                                       entry.endpoints().Clone()));
  }

  if (aArgs.reportOnly().isSome()) {
    const auto& entry = *aArgs.reportOnly();
    policy->mReportOnly.emplace(Entry(entry.sources(), entry.destinations(),
                                      entry.endpoints().Clone()));
  }

  policy.forget(aPolicy);
}

void IntegrityPolicy::InitFromOther(IntegrityPolicy* aOther) {
  if (!aOther) {
    return;
  }

  if (aOther->mEnforcement) {
    mEnforcement.emplace(Entry(*aOther->mEnforcement));
  }

  if (aOther->mReportOnly) {
    mReportOnly.emplace(Entry(*aOther->mReportOnly));
  }
}

bool IntegrityPolicy::Equals(const IntegrityPolicy* aPolicy,
                             const IntegrityPolicy* aOtherPolicy) {
  // Do a quick pointer check first, also checks if both are null.
  if (aPolicy == aOtherPolicy) {
    return true;
  }

  // We checked if they were null above, so make sure one of them is not null.
  if (!aPolicy || !aOtherPolicy) {
    return false;
  }

  if (!Entry::Equals(aPolicy->mEnforcement, aOtherPolicy->mEnforcement)) {
    return false;
  }

  if (!Entry::Equals(aPolicy->mReportOnly, aOtherPolicy->mReportOnly)) {
    return false;
  }

  return true;
}

bool IntegrityPolicy::Entry::Equals(const Maybe<Entry>& aPolicy,
                                    const Maybe<Entry>& aOtherPolicy) {
  // If one is set and the other is not, they are not equal.
  if (aPolicy.isSome() != aOtherPolicy.isSome()) {
    return false;
  }

  // If both are not set, they are equal.
  if (aPolicy.isNothing() && aOtherPolicy.isNothing()) {
    return true;
  }

  if (aPolicy->mSources != aOtherPolicy->mSources) {
    return false;
  }

  if (aPolicy->mDestinations != aOtherPolicy->mDestinations) {
    return false;
  }

  if (aPolicy->mEndpoints != aOtherPolicy->mEndpoints) {
    return false;
  }

  return true;
}

constexpr static const uint32_t kIntegrityPolicySerializationVersion = 1;

NS_IMETHODIMP
IntegrityPolicy::Read(nsIObjectInputStream* aStream) {
  uint32_t version;
  MOZ_TRY(aStream->Read32(&version));

  if (version != kIntegrityPolicySerializationVersion) {
    LOG("IntegrityPolicy::Read: Unsupported version: {}", version);
    return NS_ERROR_FAILURE;
  }

  for (const bool& isRO : {false, true}) {
    bool hasPolicy;
    MOZ_TRY(aStream->ReadBoolean(&hasPolicy));

    if (!hasPolicy) {
      continue;
    }

    uint32_t sources;
    MOZ_TRY(aStream->Read32(&sources));

    Sources sourcesSet;
    sourcesSet.deserialize(sources);

    uint32_t destinations;
    MOZ_TRY(aStream->Read32(&destinations));

    Destinations destinationsSet;
    destinationsSet.deserialize(destinations);

    uint32_t endpointsLen;
    MOZ_TRY(aStream->Read32(&endpointsLen));

    nsTArray<nsCString> endpoints(endpointsLen);
    for (size_t endpointI = 0; endpointI < endpointsLen; endpointI++) {
      nsCString endpoint;
      MOZ_TRY(aStream->ReadCString(endpoint));
      endpoints.AppendElement(std::move(endpoint));
    }

    Entry entry = Entry(sourcesSet, destinationsSet, std::move(endpoints));
    if (isRO) {
      mReportOnly.emplace(entry);
    } else {
      mEnforcement.emplace(entry);
    }
  }

  return NS_OK;
}

NS_IMETHODIMP
IntegrityPolicy::Write(nsIObjectOutputStream* aStream) {
  MOZ_TRY(aStream->Write32(kIntegrityPolicySerializationVersion));

  for (const auto& entry : {mEnforcement, mReportOnly}) {
    if (!entry) {
      MOZ_TRY(aStream->WriteBoolean(false));
      continue;
    }

    MOZ_TRY(aStream->WriteBoolean(true));

    MOZ_TRY(aStream->Write32(entry->mSources.serialize()));
    MOZ_TRY(aStream->Write32(entry->mDestinations.serialize()));

    MOZ_TRY(aStream->Write32(entry->mEndpoints.Length()));
    for (const auto& endpoint : entry->mEndpoints) {
      MOZ_TRY(aStream->WriteCString(endpoint));
    }
  }

  return NS_OK;
}

NS_IMPL_CLASSINFO(IntegrityPolicy, nullptr, 0, NS_IINTEGRITYPOLICY_IID)
NS_IMPL_ISUPPORTS_CI(IntegrityPolicy, nsIIntegrityPolicy, nsISerializable)

}  // namespace mozilla::dom

#undef LOG
