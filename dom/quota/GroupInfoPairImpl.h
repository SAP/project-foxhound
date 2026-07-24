/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_QUOTA_GROUPINFOPAIRIMPL_H_
#define DOM_QUOTA_GROUPINFOPAIRIMPL_H_

#include <algorithm>

#include "GroupInfo.h"
#include "GroupInfoPair.h"
#include "OriginInfo.h"

namespace mozilla::dom::quota {

template <typename Iterator, typename Pred>
void GroupInfoPair::MaybeInsertOriginInfos(Iterator aDest, Pred aPred) const {
  const auto copy = [&aDest, &aPred](const GroupInfo& groupInfo) {
    std::copy_if(groupInfo.mOriginInfos.cbegin(), groupInfo.mOriginInfos.cend(),
                 aDest, aPred);
  };

  if (mTemporaryStorageGroupInfo) {
    copy(*mTemporaryStorageGroupInfo);
  }
  if (mDefaultStorageGroupInfo) {
    copy(*mDefaultStorageGroupInfo);
  }
  if (mPrivateStorageGroupInfo) {
    copy(*mPrivateStorageGroupInfo);
  }
}

template <typename Iterator>
void GroupInfoPair::MaybeInsertNonPersistedOriginInfos(Iterator aDest) const {
  MaybeInsertOriginInfos(aDest, [](const auto& originInfo) {
    return !originInfo->LockedPersisted();
  });
}

template <typename Iterator>
void GroupInfoPair::MaybeInsertNonPersistedZeroUsageOriginInfos(
    Iterator aDest, const Maybe<int64_t>& aCutoffAccessTime) const {
  MaybeInsertOriginInfos(aDest, [aCutoffAccessTime](const auto& originInfo) {
    return !originInfo->LockedPersisted() && originInfo->LockedUsage() == 0 &&
           (!aCutoffAccessTime ||
            originInfo->LockedAccessTime() < *aCutoffAccessTime);
  });
}

}  // namespace mozilla::dom::quota

#endif  // DOM_QUOTA_GROUPINFOPAIRIMPL_H_
