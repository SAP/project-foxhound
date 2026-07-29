/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_BounceTrackingRecord_h
#define mozilla_BounceTrackingRecord_h

#include "nsIBounceTrackingRecord.h"
#include "mozilla/RefPtr.h"
#include "nsStringFwd.h"
#include "nsTHashSet.h"
#include "fmt/format.h"

namespace mozilla {

namespace dom {
class CanonicalBrowsingContext;
}

// Stores per-tab data relevant to bounce tracking protection for every extended
// navigation. Also implements nsIBounceTrackingRecord for XPCOM exposure.
class BounceTrackingRecord final : public nsIBounceTrackingRecord {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIBOUNCETRACKINGRECORD

  BounceTrackingRecord() = default;

  void SetInitialHost(const nsACString& aHost);

  const nsACString& GetInitialHost() const;

  void SetFinalHost(const nsACString& aHost);

  const nsACString& GetFinalHost() const;

  void AddBounceHost(const nsACString& aHost);

  void AddUserActivationHost(const nsACString& aHost);

  const nsTHashSet<nsCStringHashKey>& GetBounceHosts() const;

  const nsTHashSet<nsCStringHashKey>& GetUserActivationHosts() const;

 private:
  ~BounceTrackingRecord();

  // A site's host. The initiator site of the current extended navigation.
  nsAutoCString mInitialHost;

  // A site's host or null. The destination of the current extended navigation.
  // Updated after every document load.
  nsAutoCString mFinalHost;

  // A set of sites' hosts. All server-side and client-side redirects hit during
  // this extended navigation.
  nsTHashSet<nsCStringHashKey> mBounceHosts;

  // A set of sites' hosts. All sites which received user activation during
  // this extended navigation.
  // This is not used by bounce tracking protection itself, but are instead
  // used to enable storage access heuristics. See Bug 1935235.
  nsTHashSet<nsCStringHashKey> mUserActivationHosts;

  friend struct fmt::formatter<BounceTrackingRecord>;
};

inline auto format_as(const nsTHashSet<nsCStringHashKey>& aSet) {
  return fmt::join(aSet, ",");
}

}  // namespace mozilla

template <>
struct fmt::formatter<mozilla::BounceTrackingRecord>
    : fmt::formatter<std::string_view> {
  auto format(const mozilla::BounceTrackingRecord& aRec,
              fmt::format_context& aCtx) const {
    auto out = aCtx.out();
    return fmt::format_to(
        out,
        "{{mInitialHost:{}, mFinalHost:{}, mBounceHosts:[{}], "
        "mUserActivationHosts:[{}]}}",
        aRec.mInitialHost, aRec.mFinalHost, aRec.mBounceHosts,
        aRec.mUserActivationHosts);
  }
};

template <>
struct fmt::formatter<RefPtr<mozilla::BounceTrackingRecord>>
    : fmt::formatter<std::string_view> {
  auto format(const RefPtr<mozilla::BounceTrackingRecord>& aRec,
              fmt::format_context& aCtx) const {
    if (aRec) {
      return fmt::formatter<mozilla::BounceTrackingRecord>{}.format(*aRec,
                                                                    aCtx);
    }
    return fmt::format_to(aCtx.out(), "null");
  }
};

#endif
