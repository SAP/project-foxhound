/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_StaticBackgroundTaskQueue_h
#define mozilla_StaticBackgroundTaskQueue_h

#include "mozilla/Attributes.h"
#include "mozilla/Mutex.h"
#include "mozilla/NeverDestroyed.h"
#include "mozilla/StaticString.h"
#include "nsCOMPtr.h"
#include "nsITargetShutdownTask.h"

namespace mozilla {

/**
 * Helper class for declaring a process-lifetime shared background task queue in
 * a thread-safe manner.
 *
 * This type is intended to be used as a static-local class, and will construct
 * the task queue when first accessed. The queue will automatically be cleaned
 * up during XPCOM shutdown, after which point Get() will return nullptr.
 *
 * This queue will run on the generic background task queue, and is created
 * using NS_CreateBackgroundTaskQueue.
 *
 * Example Usage:
 *
 *     static already_AddRefed<nsISerialEventTarget> FooBarQueue() {
 *       static StaticBackgroundTaskQueue sQueue("FooBar");
 *       return sQueue.Get();
 *     }
 */
class MOZ_STATIC_LOCAL_CLASS StaticBackgroundTaskQueue final {
 public:
  explicit StaticBackgroundTaskQueue(StaticString aName);

  already_AddRefed<nsISerialEventTarget> Get();

 private:
  // Inner Impl type. This is wrapped in NeverDestroyed<...> to avoid
  // introducing static destructors, and uses fake refcounting for the
  // nsITargetShutdownTask implementation.
  struct Impl final : public nsITargetShutdownTask {
    explicit Impl(StaticString aName);

    // nsISupports (fake refcounting, always static)
    NS_IMETHOD QueryInterface(REFNSIID aIID, void** aInstancePtr) override;
    NS_IMETHOD_(MozExternalRefCountType) AddRef() override { return 2; }
    NS_IMETHOD_(MozExternalRefCountType) Release() override { return 2; }

    // nsITargetShutdownTask
    void TargetShutdown() override;

    OffTheBooksMutex mMutex;
    nsCOMPtr<nsISerialEventTarget> mQueue MOZ_GUARDED_BY(mMutex);
  };

  NeverDestroyed<Impl> mImpl;
};

}  // namespace mozilla

#endif  // mozilla_StaticBackgroundTaskQueue_h
