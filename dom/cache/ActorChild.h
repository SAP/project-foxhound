/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_cache_ActioChild_h
#define mozilla_dom_cache_ActioChild_h

#include "mozilla/dom/SafeRefPtr.h"

namespace mozilla::dom::cache {

class CacheWorkerRef;

// ActorChild is used in parent-child hierachies where parent actor implements
// the interface and expects the child actor class to notify it for various
// reasons. Child actor cannot bind directly to it's parent actor class (i.e.
// manager) as it could have multiple managers.
// TODO: I think it would be better to move this to a more general location as
// this is very generic interface and can represent any parent-child actor
// relationship.
class ActorChild {
 public:
  virtual void StartDestroy() = 0;
  virtual void NoteDeletedActor() { /*no-op*/ }

 protected:
  ActorChild() = default;
  ~ActorChild() = default;
};

// This is more specific interface and meant to be used by cache related
// parent/child actors. Each cache actor expects to keep the worker ref alive
// throughout it's lifetime.
class CacheActorChild : public ActorChild {
 public:
  void SetWorkerRef(SafeRefPtr<CacheWorkerRef> aWorkerRef);
  const SafeRefPtr<CacheWorkerRef>& GetWorkerRefPtr() const;
  void RemoveWorkerRef();

 protected:
  CacheActorChild() = default;
  ~CacheActorChild();

 private:
  SafeRefPtr<CacheWorkerRef> mWorkerRef;
};

}  // namespace mozilla::dom::cache

#endif  // mozilla_dom_cache_ActioChild_h
