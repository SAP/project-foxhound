/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "BounceTrackingRecord.h"
#include "mozilla/Logging.h"

namespace mozilla {

extern LazyLogModule gBounceTrackingProtectionLog;

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

void BounceTrackingRecord::AddStorageAccessHost(const nsACString& aHost) {
  MOZ_ASSERT(!aHost.IsEmpty());

  mStorageAccessHosts.Insert(aHost);
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
BounceTrackingRecord::GetStorageAccessHosts() const {
  return mStorageAccessHosts;
}

const nsTHashSet<nsCStringHashKey>&
BounceTrackingRecord::GetUserActivationHosts() const {
  return mUserActivationHosts;
}

}  // namespace mozilla
