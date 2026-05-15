/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef SharedThreadPool_h_
#define SharedThreadPool_h_

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/MaybeLeakRefPtr.h"
#include "nsCOMPtr.h"
#include "nsID.h"
#include "nsIThreadPool.h"
#include "nsString.h"
#include "nscore.h"

class nsIRunnable;

namespace mozilla {

// Wrapper that makes an nsIThreadPool a singleton, and provides a
// consistent threadsafe interface to get instances. Callers simply get a
// SharedThreadPool by the name of its nsIThreadPool. All get requests of
// the same name get the same SharedThreadPool.
//
// The SharedThreadPool is threadsafe and will be automatically shut down
// during xpcom-shutdown-threads. It should not be manually shut down.
// Idle threads will be cleaned up after a short timeout.
//
// On Windows all threads in the pool have MSCOM initialized with
// COINIT_MULTITHREADED. Note that not all users of MSCOM use this mode see [1],
// and mixing MSCOM objects between the two is terrible for performance, and can
// cause some functions to fail. So be careful when using Win32 APIs on a
// SharedThreadPool, and avoid sharing objects if at all possible.
//
// [1]
// https://searchfox.org/mozilla-central/search?q=coinitialize&redirect=false
class SharedThreadPool final : public nsIThreadPool {
 public:
  // Gets (possibly creating) the shared thread pool singleton instance with
  // thread pool named aName.
  // Infallible, but may return a defunct SharedThreadPool during shutdown.
  static already_AddRefed<SharedThreadPool> Get(StaticString aName,
                                                uint32_t aThreadLimit = 4);

  NS_DECL_THREADSAFE_ISUPPORTS

  // Forward behaviour to the wrapped thread pool implementation.
  NS_FORWARD_SAFE_NSITHREADPOOL(mPool);

  // Call this when dispatching from an event on the same
  // threadpool that is about to complete. We should not create a new thread
  // in that case since a thread is about to become idle.
  nsresult DispatchFromEndOfTaskInThisPool(nsIRunnable* event) {
    return Dispatch(event, NS_DISPATCH_AT_END);
  }

  NS_IMETHOD DispatchFromScript(nsIRunnable* event,
                                DispatchFlags flags) override {
    return Dispatch(event, flags);
  }

  NS_IMETHOD Dispatch(already_AddRefed<nsIRunnable> event,
                      DispatchFlags flags = NS_DISPATCH_NORMAL) override {
    // NOTE: Like `nsThreadPool`, this method never leaks `event` on failure,
    // whether or not NS_DISPATCH_FALLIBLE is specified.
    nsCOMPtr<nsIRunnable> runnable(event);
    return NS_WARN_IF(!mPool) ? NS_ERROR_NULL_POINTER
                              : mPool->Dispatch(runnable.forget(), flags);
  }

  NS_IMETHOD DelayedDispatch(already_AddRefed<nsIRunnable>, uint32_t) override {
    return NS_ERROR_NOT_IMPLEMENTED;
  }

  using nsIEventTarget::Dispatch;

  NS_IMETHOD RegisterShutdownTask(nsITargetShutdownTask* task) override {
    return !mPool ? NS_ERROR_UNEXPECTED : mPool->RegisterShutdownTask(task);
  }

  NS_IMETHOD UnregisterShutdownTask(nsITargetShutdownTask* task) override {
    return !mPool ? NS_ERROR_UNEXPECTED : mPool->UnregisterShutdownTask(task);
  }

  NS_IMETHOD IsOnCurrentThread(bool* _retval) override {
    return !mPool ? NS_ERROR_UNEXPECTED : mPool->IsOnCurrentThread(_retval);
  }

  NS_IMETHOD_(bool) IsOnCurrentThreadInfallible() override {
    return mPool && mPool->IsOnCurrentThread();
  }

  // Creates necessary statics. Called once at startup.
  static void InitStatics();

  NS_IMETHOD_(FeatureFlags) GetFeatures() override {
    return SUPPORTS_SHUTDOWN_TASKS | SUPPORTS_SHUTDOWN_TASK_DISPATCH;
  }

 private:
  explicit SharedThreadPool(nsIThreadPool* aPool);
  ~SharedThreadPool();

  nsresult EnsureThreadLimitIsAtLeast(uint32_t aThreadLimit);

  // Thread pool being wrapped. May be null if the SharedThreadPool was created
  // during shutdown.
  const nsCOMPtr<nsIThreadPool> mPool;
};

}  // namespace mozilla

#endif  // SharedThreadPool_h_
