/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef IntegrityPolicy_h_
#define IntegrityPolicy_h_

#include "mozilla/EnumSet.h"
#include "mozilla/EnumTypeTraits.h"
#include "mozilla/Maybe.h"
#include "nsIContentPolicy.h"
#include "nsIIntegrityPolicy.h"
#include "nsTArray.h"

#define NS_INTEGRITYPOLICY_CONTRACTID "@mozilla.org/integritypolicy;1"

class nsISFVDictionary;
class nsILoadInfo;

namespace mozilla {
namespace ipc {
class IntegrityPolicyArgs;
}  // namespace ipc
namespace dom {

class IntegrityPolicy : public nsIIntegrityPolicy {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSISERIALIZABLE
  NS_DECL_NSIINTEGRITYPOLICY

  IntegrityPolicy() = default;

  static nsresult ParseHeaders(const nsACString& aHeader,
                               const nsACString& aHeaderRO,
                               IntegrityPolicy** aPolicy);

  enum class SourceType : uint8_t { Inline };

  // Trimmed down version of dom::RequestDestination
  enum class DestinationType : uint8_t { Script, Style };

  using Sources = EnumSet<SourceType>;
  using Destinations = EnumSet<DestinationType>;

  void PolicyContains(DestinationType aDestination, bool* aContains,
                      bool* aROContains) const;

  void Endpoints(nsTArray<nsCString>& aEnforcement,
                 nsTArray<nsCString>& aReportOnly) const;

  static Maybe<DestinationType> ContentTypeToDestinationType(
      nsContentPolicyType aType);

  static void ToArgs(const IntegrityPolicy* aPolicy,
                     mozilla::ipc::IntegrityPolicyArgs& aArgs);

  static void FromArgs(const mozilla::ipc::IntegrityPolicyArgs& aArgs,
                       IntegrityPolicy** aPolicy);

  void InitFromOther(IntegrityPolicy* aOther);

  static IntegrityPolicy* Cast(nsIIntegrityPolicy* aPolicy) {
    return static_cast<IntegrityPolicy*>(aPolicy);
  }

  static bool Equals(const IntegrityPolicy* aPolicy,
                     const IntegrityPolicy* aOtherPolicy);

 protected:
  virtual ~IntegrityPolicy();

 private:
  class Entry final {
   public:
    Entry(Sources aSources, Destinations aDestinations,
          nsTArray<nsCString>&& aEndpoints)
        : mSources(aSources),
          mDestinations(aDestinations),
          mEndpoints(std::move(aEndpoints)) {}

    Entry(const Entry& aOther)
        : mSources(aOther.mSources),
          mDestinations(aOther.mDestinations),
          mEndpoints(aOther.mEndpoints.Clone()) {}

    ~Entry() = default;

    static bool Equals(const Maybe<Entry>& aPolicy,
                       const Maybe<Entry>& aOtherPolicy);

    const Sources mSources;
    const Destinations mDestinations;
    const nsTArray<nsCString> mEndpoints;
  };

  Maybe<Entry> mEnforcement;
  Maybe<Entry> mReportOnly;
};
}  // namespace dom

template <>
struct MaxEnumValue<dom::IntegrityPolicy::SourceType> {
  static constexpr unsigned int value =
      static_cast<unsigned int>(dom::IntegrityPolicy::SourceType::Inline);
};

template <>
struct MaxEnumValue<dom::IntegrityPolicy::DestinationType> {
  static constexpr unsigned int value =
      static_cast<unsigned int>(dom::IntegrityPolicy::DestinationType::Script);
};

}  // namespace mozilla

#endif /* IntegrityPolicy_h_ */
