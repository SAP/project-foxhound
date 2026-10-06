/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/StaticBackgroundTaskQueue.h"

#include "nsThreadUtils.h"

namespace mozilla {

StaticBackgroundTaskQueue::StaticBackgroundTaskQueue(StaticString aName)
    : mImpl(aName) {}

already_AddRefed<nsISerialEventTarget> StaticBackgroundTaskQueue::Get() {
  OffTheBooksMutexAutoLock lock(mImpl->mMutex);
  return do_AddRef(mImpl->mQueue);
}

NS_IMPL_QUERY_INTERFACE(StaticBackgroundTaskQueue::Impl, nsITargetShutdownTask)

StaticBackgroundTaskQueue::Impl::Impl(StaticString aName) : mMutex(aName) {
  nsCOMPtr<nsISerialEventTarget> queue;
  nsresult rv = NS_CreateBackgroundTaskQueue(aName, getter_AddRefs(queue));
  NS_ENSURE_SUCCESS_VOID(rv);
  rv = queue->RegisterShutdownTask(this);
  NS_ENSURE_SUCCESS_VOID(rv);
  mQueue = queue.forget();
}

void StaticBackgroundTaskQueue::Impl::TargetShutdown() {
  OffTheBooksMutexAutoLock lock(mMutex);
  mQueue = nullptr;
}

}  // namespace mozilla
