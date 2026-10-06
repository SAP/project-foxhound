/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef IntegrityPolicy_h_
#define IntegrityPolicy_h_

#include "mozilla/EnumSet.h"
#include "mozilla/EnumTypeTraits.h"
#include "mozilla/Maybe.h"
#include "mozilla/MozPromise.h"
#include "mozilla/dom/WAICTManifestBinding.h"
#include "mozilla/net/SFV.h"
#include "nsHashKeys.h"
#include "nsIContentPolicy.h"
#include "nsIIntegrityPolicy.h"
#include "nsTArray.h"
#include "nsTHashMap.h"
#include "nsTHashSet.h"

#define NS_INTEGRITYPOLICY_CONTRACTID "@mozilla.org/integritypolicy;1"

class nsILoadInfo;

namespace mozilla {
namespace ipc {
class IntegrityPolicyArgs;
}  // namespace ipc
namespace dom {

class Document;

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
  enum class DestinationType : uint8_t { Script, Style, Image };

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

  static Result<IntegrityPolicy::Destinations, nsresult> ParseDestinations(
      const net::SFV::DictResult& aDict, bool aIsWAICT);

  static Result<nsTArray<nsCString>, nsresult> ParseEndpoints(
      const net::SFV::DictResult& aDict);

 protected:
  virtual ~IntegrityPolicy() = default;

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
      static_cast<unsigned int>(dom::IntegrityPolicy::DestinationType::Image);
};

}  // namespace mozilla

#endif /* IntegrityPolicy_h_ */
