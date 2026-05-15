/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_cache_ActorUtils_h
#define mozilla_dom_cache_ActorUtils_h

#include "mozilla/dom/cache/Types.h"

namespace mozilla {

namespace ipc {
class PBackgroundParent;
class PrincipalInfo;
}  // namespace ipc

namespace dom::cache {
class ActorChild;
class BoundStorageKeyParent;
class PCacheChild;
class PCacheParent;
class PCacheStreamControlChild;
class PCacheStreamControlParent;
class PCacheStorageChild;
class PCacheStorageParent;

// Factory methods for use in ipc/glue methods.  Implemented in individual actor
// cpp files.

// Creates and returns a CacheChild object
//
// aParentActor -> CacheChild being a non-top level action gets created as a
// child actor
//  If a parent wishes to get notified for child's lifecycle events like
//  destruction, it can do so by implementing and passing itself as a ActorChild
//  interface as parameter
already_AddRefed<PCacheChild> AllocPCacheChild(
    ActorChild* aParentActor = nullptr);

// Helper method to carry-out the destruction of CacheChild actor
void DeallocPCacheChild(PCacheChild* aActor);

// Helper method to carry-out the destruction of CacheParent actor
void DeallocPCacheParent(PCacheParent* aActor);

// Similar to CacheChild above, parent can get notified for
// CacheStreamControlChild lifecycle events
already_AddRefed<PCacheStreamControlChild> AllocPCacheStreamControlChild(
    ActorChild* aParentActor = nullptr);

void DeallocPCacheStreamControlParent(PCacheStreamControlParent* aActor);

// This method is used on the main process side to create CacheStorageParent
// actor in response to construction request received from the child process
// side
//
// caller is expected to pass below parameters:
// aBackgroundIPCActor -> BackgroundParent actor; required to verify
// PrincipalInfo aBoundStorageKeyActor -> In case this is getting created on
// BoundStorageKeyParent actor, nullptr otherwise aNamespace -> Namespace
// corresponding to this request aPrincipalInfo -> PrincipalInfo corresponding
// to this request
already_AddRefed<PCacheStorageParent> AllocPCacheStorageParent(
    mozilla::ipc::PBackgroundParent* aBackgroundIPCActor,
    PBoundStorageKeyParent* aBoundStorageKeyActor, Namespace aNamespace,
    const mozilla::ipc::PrincipalInfo& aPrincipalInfo);

// Helper method to carry-out the destruction of CacheStorageChild actor
void DeallocPCacheStorageChild(PCacheStorageChild* aActor);

// Helper method to carry-out the destruction of CacheStorageParent actor
void DeallocPCacheStorageParent(PCacheStorageParent* aActor);

}  // namespace dom::cache
}  // namespace mozilla

#endif  // mozilla_dom_cache_ActorUtils_h
