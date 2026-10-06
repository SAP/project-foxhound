/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "BounceTrackingRecord.h"
#include "mozilla/Logging.h"

namespace mozilla {

extern LazyLogModule gBounceTrackingProtectionLog;

NS_IMPL_ISUPPORTS(BounceTrackingRecord, nsIBounceTrackingRecord);

BounceTrackingRecord::~BounceTrackingRecord() = default;

void BounceTrackingRecord::SetInitialHost(const nsACString& aHost) {
  mInitialHost = aHost;
}

const nsACString& BounceTrackingRecord::GetInitialHost() const {
  return mInitialHost;
}

void BounceTrackingRecord::SetFinalHost(const nsACString& aHost) {
  mFinalHost = aHost;
}

const nsACString& BounceTrackingRecord::GetFinalHost() const {
  return mFinalHost;
}

void BounceTrackingRecord::AddBounceHost(const nsACString& aHost) {
  MOZ_ASSERT(!aHost.IsEmpty());

  mBounceHosts.Insert(aHost);
  MOZ_LOG_FMT(gBounceTrackingProtectionLog, LogLevel::Debug, "{}: {}",
              __FUNCTION__, *this);
}

void BounceTrackingRecord::AddUserActivationHost(const nsACString& aHost) {
  if (!aHost.IsEmpty()) {
    mUserActivationHosts.Insert(aHost);
  }
}

const nsTHashSet<nsCStringHashKey>& BounceTrackingRecord::GetBounceHosts()
    const {
  return mBounceHosts;
}

const nsTHashSet<nsCStringHashKey>&
BounceTrackingRecord::GetUserActivationHosts() const {
  return mUserActivationHosts;
}

// nsIBounceTrackingRecord

NS_IMETHODIMP BounceTrackingRecord::GetInitialHost(nsACString& aResult) {
  aResult = mInitialHost;
  return NS_OK;
}

NS_IMETHODIMP BounceTrackingRecord::GetFinalHost(nsACString& aResult) {
  aResult = mFinalHost;
  return NS_OK;
}

NS_IMETHODIMP BounceTrackingRecord::GetBounceHosts(
    nsTArray<nsCString>& aResult) {
  for (const auto& host : mBounceHosts) {
    if (!host.EqualsLiteral("null")) {
      aResult.AppendElement(host);
    }
  }
  return NS_OK;
}

}  // namespace mozilla
