/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Regression test for Bug 2031968: deadlock when DNS completion callbacks are
// invoked while nsHostResolver's mDBLock write lock is held.

#include "gtest/gtest.h"

#include "mozilla/CondVar.h"
#include "mozilla/Mutex.h"
#include "mozilla/gtest/MozAssertions.h"
#include "nsHostRecord.h"
#include "nsHostResolver.h"
#include "prthread.h"

using namespace mozilla;
using namespace mozilla::net;

namespace {

// A callback that, on its first invocation, immediately calls ResolveHost
// again on the same resolver.
class ReentrantCallback final : public nsResolveHostCallback {
 public:
  NS_DECL_ISUPPORTS

  ReentrantCallback(nsHostResolver* aResolver, bool aShouldReenter,
                    Mutex& aMutex, CondVar& aCondVar, bool& aCompleted)
      : mResolver(aResolver),
        mShouldReenter(aShouldReenter),
        mMutex(aMutex),
        mCondVar(aCondVar),
        mCompleted(aCompleted) {}

  void OnResolveHostComplete(nsHostResolver* aResolver, nsHostRecord* aRecord,
                             nsresult aStatus) override {
    if (mShouldReenter) {
      RefPtr<ReentrantCallback> inner = new ReentrantCallback(
          mResolver, /* aShouldReenter */ false, mMutex, mCondVar, mCompleted);
      mResolver->ResolveHost(
          "localhost"_ns, ""_ns, -1, nsIDNSService::RESOLVE_TYPE_DEFAULT,
          OriginAttributes(), nsIDNSService::RESOLVE_DEFAULT_FLAGS,
          PR_AF_UNSPEC, inner);
    }
    MutexAutoLock lock(mMutex);
    mCompleted = true;
    mCondVar.Notify();
  }

  bool EqualsAsyncListener(nsIDNSListener* aListener) override { return false; }

  size_t SizeOfIncludingThis(
      mozilla::MallocSizeOf aMallocSizeOf) const override {
    return aMallocSizeOf(this);
  }

 private:
  ~ReentrantCallback() = default;

  RefPtr<nsHostResolver> mResolver;
  const bool mShouldReenter;
  Mutex& mMutex;
  CondVar& mCondVar;
  bool& mCompleted;
};

NS_IMPL_ISUPPORTS0(ReentrantCallback)

struct WorkerArgs {
  RefPtr<nsHostResolver> resolver;
  Mutex* mutex;
  CondVar* condVar;
  bool* completed;
};

static void WorkerThread(void* aArg) {
  WorkerArgs* args = static_cast<WorkerArgs*>(aArg);
  RefPtr<ReentrantCallback> callback =
      new ReentrantCallback(args->resolver, /* aShouldReenter */ true,
                            *args->mutex, *args->condVar, *args->completed);
  args->resolver->ResolveHost(
      "localhost"_ns, ""_ns, -1, nsIDNSService::RESOLVE_TYPE_DEFAULT,
      OriginAttributes(), nsIDNSService::RESOLVE_DEFAULT_FLAGS, PR_AF_UNSPEC,
      callback);
}

}  // namespace

// Verify that a DNS completion callback can safely call back into ResolveHost.
TEST(TestDNS, ResolveHostCallbackCanReenterResolveHost)
{
  RefPtr<nsHostResolver> resolver;
  nsresult rv = nsHostResolver::Create(getter_AddRefs(resolver));
  ASSERT_NS_SUCCEEDED(rv);

  Mutex mutex MOZ_UNANNOTATED("TestDNS.mutex");
  CondVar condVar(mutex, "TestDNS.condVar");
  bool completed = false;

  WorkerArgs args{resolver, &mutex, &condVar, &completed};

  // Run on a worker thread so the main thread can apply a timeout.
  PRThread* thread =
      PR_CreateThread(PR_USER_THREAD, WorkerThread, &args, PR_PRIORITY_NORMAL,
                      PR_GLOBAL_THREAD, PR_JOINABLE_THREAD, 0);
  ASSERT_TRUE(thread);

  bool wasCompleted;
  {
    MutexAutoLock lock(mutex);
    // Wait up to 10 seconds for completion; a timeout indicates deadlock.
    condVar.Wait(TimeDuration::FromSeconds(10));
    wasCompleted = completed;
    EXPECT_TRUE(wasCompleted)
        << "Deadlock detected (Bug 2031968): OnResolveHostComplete was invoked "
           "while mDBLock write was held; the callback could not re-enter "
           "ResolveHost.";
  }

  // If deadlocked, the thread is abandoned rather than blocking forever.
  if (wasCompleted) {
    PR_JoinThread(thread);
    resolver->Shutdown();
  }
}
