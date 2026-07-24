/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef BASEALLOC_H
#define BASEALLOC_H

#include "Mutex.h"

// The base allocator is a simple memory allocator used internally by
// mozjemalloc for its own structures.
class BaseAlloc {
 public:
  constexpr BaseAlloc() {};

  void Init() MOZ_REQUIRES(gInitLock);

  void* alloc(size_t aSize);

  void* calloc(size_t aNumber, size_t aSize);

  Mutex mMutex;

  struct Stats {
    size_t mMapped = 0;
    size_t mCommitted = 0;
  };
  Stats GetStats() MOZ_EXCLUDES(mMutex) {
    MutexAutoLock lock(mMutex);

    MOZ_ASSERT(mStats.mMapped >= mStats.mCommitted);
    return mStats;
  }

 private:
  // Allocate fresh pages to satsify at least minsize.
  bool pages_alloc(size_t minsize) MOZ_REQUIRES(mMutex);

  // BaseAlloc uses bump-pointer allocation from mNextAddr.  In general
  // mNextAddr <= mNextDecommitted <= mPastAddr.
  //
  // If an allocation would cause mNextAddr > mPastAddr then a new chunk is
  // required (from pages_alloc()).  Else-if an allocation would case
  // mNextAddr > mNextDecommitted then some of the memory is decommitted and
  // pages_committ() is needed before the memory can be used.
  uintptr_t mNextAddr MOZ_GUARDED_BY(mMutex) = 0;
  uintptr_t mNextDecommitted MOZ_GUARDED_BY(mMutex) = 0;
  // Address immediately past the current chunk of pages.
  uintptr_t mPastAddr MOZ_GUARDED_BY(mMutex) = 0;

  Stats mStats MOZ_GUARDED_BY(mMutex);
};

extern BaseAlloc sBaseAlloc;

// A specialization of the base allocator with a free list.
template <typename T>
struct TypedBaseAlloc {
  static T* sFirstFree;

  static size_t size_of() { return sizeof(T); }

  static T* alloc() {
    {
      MutexAutoLock lock(sBaseAlloc.mMutex);
      T* ret = sFirstFree;
      if (ret) {
        sFirstFree = *(T**)ret;
        return ret;
      }
    }

    return (T*)sBaseAlloc.alloc(size_of());
  }

  static void dealloc(T* aNode) {
    MutexAutoLock lock(sBaseAlloc.mMutex);
    *(T**)aNode = sFirstFree;
    sFirstFree = aNode;
  }
};

template <typename T>
T* TypedBaseAlloc<T>::sFirstFree = nullptr;

template <typename T>
struct BaseAllocFreePolicy {
  void operator()(T* aPtr) { TypedBaseAlloc<T>::dealloc(aPtr); }
};

#endif /* ! BASEALLOC_H */
