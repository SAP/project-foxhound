/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_BounceTrackingRecord_h
#define mozilla_BounceTrackingRecord_h

#include "nsStringFwd.h"
#include "nsTHashSet.h"
#include "mozilla/Maybe.h"
#include "fmt/format.h"

namespace mozilla {

namespace dom {
class CanonicalBrowsingContext;
}

// Stores per-tab data relevant to bounce tracking protection for every extended
// navigation.
class BounceTrackingRecord final {
 public:
  void SetInitialHost(const nsACString& aHost);

  const nsACString& GetInitialHost() const;

  void SetFinalHost(const nsACString& aHost);

  const nsACString& GetFinalHost() const;

  void AddBounceHost(const nsACString& aHost);

  void AddStorageAccessHost(const nsACString& aHost);

  void AddUserActivationHost(const nsACString& aHost);

  const nsTHashSet<nsCStringHashKey>& GetBounceHosts() const;

  const nsTHashSet<nsCStringHashKey>& GetStorageAccessHosts() const;

  const nsTHashSet<nsCStringHashKey>& GetUserActivationHosts() const;

 private:
  // A site's host. The initiator site of the current extended navigation.
  nsAutoCString mInitialHost;

  // A site's host or null. The destination of the current extended navigation.
  // Updated after every document load.
  nsAutoCString mFinalHost;

  // A set of sites' hosts. All server-side and client-side redirects hit during
  // this extended navigation.
  nsTHashSet<nsCStringHashKey> mBounceHosts;

  // A set of sites' hosts. All sites which accessed storage during this
  // extended navigation.
  nsTHashSet<nsCStringHashKey> mStorageAccessHosts;

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
        "mStorageAccessHosts:[{}], mUserActivationHosts:[{}]}}",
        aRec.mInitialHost, aRec.mFinalHost, aRec.mBounceHosts,
        aRec.mStorageAccessHosts, aRec.mUserActivationHosts);
  }
};

template <>
struct fmt::formatter<mozilla::Maybe<mozilla::BounceTrackingRecord>>
    : fmt::formatter<std::string_view> {
  auto format(const mozilla::Maybe<mozilla::BounceTrackingRecord>& aRec,
              fmt::format_context& aCtx) const {
    if (aRec) {
      return fmt::formatter<mozilla::BounceTrackingRecord>{}.format(*aRec,
                                                                    aCtx);
    }
    return fmt::format_to(aCtx.out(), "null");
  }
};

#endif
