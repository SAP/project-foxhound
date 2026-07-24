/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Smart pointer which leaks its owning refcounted object by default. */

#ifndef MaybeLeakRefPtr_h
#define MaybeLeakRefPtr_h

#include "mozilla/RefPtr.h"

namespace mozilla {

/**
 * Instances of this class are a RefPtr<T> which may not call Release() from its
 * destructor. This is done by leaking the stored reference on destruction.
 *
 * This behaviour is customizable for methods like nsIEventTarget::Dispatch
 * which have customizable leak-on-error semantics.
 */
template <class T>
class MaybeLeakRefPtr : public RefPtr<T> {
 public:
  explicit MaybeLeakRefPtr(already_AddRefed<T>&& aPtr, bool aAutoRelease)
      : RefPtr<T>(std::move(aPtr)), mAutoRelease(aAutoRelease) {}
  MaybeLeakRefPtr(const MaybeLeakRefPtr&) = delete;
  MaybeLeakRefPtr& operator=(const MaybeLeakRefPtr&) = delete;

  ~MaybeLeakRefPtr() {
    if (!mAutoRelease) {
      // If mAutoRelease is not set, take the value out of this and leak it
      // before the base class destructor would call Release().
      RefPtr<T>::forget().leak();
    }
  }

 private:
  bool mAutoRelease = false;
};

}  // namespace mozilla

#endif  // MaybeLeakRefPtr_h
