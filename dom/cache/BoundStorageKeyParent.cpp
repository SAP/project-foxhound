/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "BoundStorageKeyParent.h"

#include "mozilla/dom/cache/ActorUtils.h"
#include "mozilla/dom/cache/PCacheStorageParent.h"
#include "mozilla/dom/quota/PrincipalUtils.h"
#include "mozilla/ipc/PBackgroundParent.h"

namespace mozilla::dom::cache {

using mozilla::ipc::PBackgroundParent;
using mozilla::ipc::PrincipalInfo;

BoundStorageKeyParent::BoundStorageKeyParent(
    PBackgroundParent* aBackgroundParent)
    : mBackgroundParent(aBackgroundParent) {
  MOZ_COUNT_CTOR(BoundStorageKeyParent);
}

BoundStorageKeyParent::~BoundStorageKeyParent() {
  MOZ_COUNT_DTOR(BoundStorageKeyParent);
}

// declared in ActorUtils.h
already_AddRefed<dom::cache::PCacheStorageParent>
BoundStorageKeyParent::AllocPCacheStorageParent(
    const Namespace& aNamespace, const PrincipalInfo& aPrincipalInfo) {
  if (!mBackgroundParent || !mBackgroundParent->CanSend()) {
    return nullptr;
  }
  return dom::cache::AllocPCacheStorageParent(mBackgroundParent, this,
                                              aNamespace, aPrincipalInfo);
}

}  // namespace mozilla::dom::cache
