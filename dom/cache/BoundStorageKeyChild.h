/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_cache_BoundStorageKeyChild_h
#define mozilla_dom_cache_BoundStorageKeyChild_h

#include "mozilla/dom/cache/ActorChild.h"
#include "mozilla/dom/cache/ActorUtils.h"
#include "mozilla/dom/cache/PBoundStorageKeyChild.h"
#include "mozilla/dom/cache/TypeUtils.h"
#include "mozilla/dom/cache/Types.h"
#include "mozilla/ipc/ProtocolUtils.h"

class nsIGlobalObject;

namespace mozilla::dom::cache {
class CacheWorkerRef;

class PCacheChild;
class PCacheStreamControlChild;
class CacheOpArgs;
class PCacheChild;
class PCacheOpChild;

using ActorDestroyReason = ::mozilla::ipc::IProtocol::ActorDestroyReason;
class BoundStorageKeyChild final : public PBoundStorageKeyChild,
                                   public ActorChild {
  friend class PBoundStorageKeyChild;

 public:
  explicit BoundStorageKeyChild(BoundStorageKeyChildListener* aListener);

  void ClearListener();

  // Our parent Listener object has gone out of scope and is being destroyed.
  void StartDestroyFromListener();

  NS_INLINE_DECL_REFCOUNTING(BoundStorageKeyChild, override)
  void NoteDeletedActor() override;

  already_AddRefed<PCacheChild> AllocPCacheChild() {
    return dom::cache::AllocPCacheChild(this);
  }

  already_AddRefed<PCacheStreamControlChild> AllocPCacheStreamControlChild() {
    return dom::cache::AllocPCacheStreamControlChild(this);
  }

 private:
  ~BoundStorageKeyChild();
  void DestroyInternal();

  // ActorChild methods
  // CacheWorkerRef is trying to destroy due to worker shutdown.
  virtual void StartDestroy() override;

  // PBoundStorageKeyChild methods
  virtual void ActorDestroy(ActorDestroyReason aReason) override;

  // utility methods
  inline uint32_t NumChildActors() {
    return ManagedPCacheStorageChild().Count() + ManagedPCacheChild().Count() +
           ManagedPCacheStreamControlChild().Count();
  }

  // Use a weak ref so actor does not hold DOM object alive past content use.
  // The BoundStorageKey object must call ClearListener() to null this before
  // its destroyed.
  BoundStorageKeyChildListener* MOZ_NON_OWNING_REF mListener;
  bool mDelayedDestroy;
};

}  // namespace mozilla::dom::cache

#endif  // mozilla_dom_cache_BoundStorageKeyChild_h
