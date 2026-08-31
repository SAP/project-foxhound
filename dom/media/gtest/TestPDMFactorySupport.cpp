/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PDMFactorySupport.h"
#include "VideoUtils.h"
#include "gtest/gtest.h"
#include "mozilla/Preferences.h"
#include "mozilla/SpinEventLoopUntil.h"
#include "mozilla/TaskQueue.h"
#include "mozilla/gfx/gfxVars.h"
#include "mozilla/gtest/WaitFor.h"

using namespace mozilla;

// Lazy construction: first `Instance()` builds, repeated calls share the same
// underlying object until something invalidates it.
TEST(PDMFactorySupport, LazyConstruction)
{
  PDMFactorySupport::Invalidate();
  RefPtr<PDMFactorySupport> first = PDMFactorySupport::Instance();
  RefPtr<PDMFactorySupport> second = PDMFactorySupport::Instance();
  EXPECT_TRUE(first);
  EXPECT_TRUE(second);
  EXPECT_EQ(first.get(), second.get());
}

// Toggling a registered pref must drop the cached instance so the next
// `Instance()` call rebuilds it.
TEST(PDMFactorySupport, PrefChangeInvalidatesCache)
{
  PDMFactorySupport::Invalidate();
  RefPtr<PDMFactorySupport> before = PDMFactorySupport::Instance();
  ASSERT_TRUE(before);

  const bool original = Preferences::GetBool("media.use-blank-decoder", false);
  Preferences::SetBool("media.use-blank-decoder", !original);

  RefPtr<PDMFactorySupport> after = PDMFactorySupport::Instance();
  EXPECT_TRUE(after);
  EXPECT_NE(before.get(), after.get());

  Preferences::SetBool("media.use-blank-decoder", original);
}

// Toggling a registered `gfxVar` must drop the cached instance so the next
// `Instance()` call rebuilds it. The hardware-decoding `gfxVar` is registered
// on every platform.
TEST(PDMFactorySupport, GfxVarChangeInvalidatesCache)
{
  if (!gfx::gfxVars::IsInitialized()) {
    GTEST_SKIP() << "gfxVars not initialized in this gtest environment";
  }

  PDMFactorySupport::Invalidate();
  RefPtr<PDMFactorySupport> before = PDMFactorySupport::Instance();
  ASSERT_TRUE(before);

  const bool original = gfx::gfxVars::CanUseHardwareVideoDecoding();
  gfx::gfxVars::SetCanUseHardwareVideoDecoding(!original);

  RefPtr<PDMFactorySupport> after = PDMFactorySupport::Instance();
  EXPECT_TRUE(after);
  EXPECT_NE(before.get(), after.get());

  gfx::gfxVars::SetCanUseHardwareVideoDecoding(original);
}

// Concurrent first calls from multiple threads must all converge on the same
// instance. With a single registration of pref/`gfxVar` listeners, no double
// registration occurs.
TEST(PDMFactorySupport, ConcurrentInstanceCalls)
{
  PDMFactorySupport::Invalidate();

  constexpr int kThreads = 4;
  AutoTArray<RefPtr<TaskQueue>, kThreads> queues;
  AutoTArray<RefPtr<GenericPromise>, kThreads> promises;
  AutoTArray<RefPtr<PDMFactorySupport>, kThreads> results;
  results.SetLength(kThreads);

  for (int i = 0; i < kThreads; ++i) {
    queues.AppendElement(
        TaskQueue::Create(GetMediaThreadPool(MediaThreadType::SUPERVISOR),
                          "TestPDMFactorySupportConcurrent"));
    promises.AppendElement(InvokeAsync(queues[i], __func__, [&results, i]() {
      results[i] = PDMFactorySupport::Instance();
      return GenericPromise::CreateAndResolve(true, __func__);
    }));
  }

  (void)WaitFor(
      GenericPromise::All(GetMainThreadSerialEventTarget(), promises));

  for (int i = 0; i < kThreads; ++i) {
    queues[i]->BeginShutdown();
    queues[i]->AwaitShutdownAndIdle();
    EXPECT_TRUE(results[i]);
  }
  for (int i = 1; i < kThreads; ++i) {
    EXPECT_EQ(results[0].get(), results[i].get());
  }
}

// `Invalidate()` is the public path used by `PDMFactory::Supported(true)`
// after a GPU-process restart and by tests that swap the environment.
TEST(PDMFactorySupport, ExplicitInvalidate)
{
  PDMFactorySupport::Invalidate();
  RefPtr<PDMFactorySupport> first = PDMFactorySupport::Instance();
  ASSERT_TRUE(first);

  PDMFactorySupport::Invalidate();
  RefPtr<PDMFactorySupport> second = PDMFactorySupport::Instance();
  ASSERT_TRUE(second);
  EXPECT_NE(first.get(), second.get());
}

// A `RefPtr` taken before invalidation must remain alive past the
// invalidation. The held instance is released on scope exit; if its
// underlying object had been freed by the singleton swap, the `Release()`
// call would touch freed memory and crash under ASAN.
TEST(PDMFactorySupport, StaleReferenceSurvivesInvalidation)
{
  PDMFactorySupport::Invalidate();
  RefPtr<PDMFactorySupport> stale = PDMFactorySupport::Instance();
  ASSERT_TRUE(stale);

  PDMFactorySupport::Invalidate();
  RefPtr<PDMFactorySupport> fresh = PDMFactorySupport::Instance();
  ASSERT_TRUE(fresh);
  EXPECT_NE(stale.get(), fresh.get());
}

// `Invalidate()` may fire concurrently with `Instance()` — pref and `gfxVar`
// listeners run on whatever thread triggered the change, and that thread can
// race with another caller currently building the inner factory. This test
// stress-tests that interleaving: a worker thread floods `Invalidate()` while
// the main thread repeatedly calls `Instance()`. Every returned `RefPtr` must
// be valid and queryable, and once the storm is over, the next `Instance()`
// call drains the lingering staleness so two back-to-back calls after the
// storm share the same underlying object.
TEST(PDMFactorySupport, ConcurrentInvalidateAndInstance)
{
  PDMFactorySupport::Invalidate();
  RefPtr<PDMFactorySupport> seed = PDMFactorySupport::Instance();
  ASSERT_TRUE(seed);

  // Worker thread floods `Invalidate()` for the duration of the test.
  Atomic<bool> stop{false};
  RefPtr<TaskQueue> invalidator =
      TaskQueue::Create(GetMediaThreadPool(MediaThreadType::SUPERVISOR),
                        "TestPDMFactorySupportInvalidator");
  RefPtr<GenericPromise> invalidatorDone =
      InvokeAsync(invalidator, __func__, [&stop]() {
        while (!stop) {
          PDMFactorySupport::Invalidate();
        }
        return GenericPromise::CreateAndResolve(true, __func__);
      });

  // Main thread hammers `Instance()` while invalidations stream in. Every
  // returned instance must be non-null and survive its scope.
  for (int i = 0; i < 200; ++i) {
    RefPtr<PDMFactorySupport> got = PDMFactorySupport::Instance();
    ASSERT_TRUE(got);
  }

  stop = true;
  (void)WaitFor(invalidatorDone);
  invalidator->BeginShutdown();
  invalidator->AwaitShutdownAndIdle();

  // After the storm, two consecutive `Instance()` calls must return the same
  // pointer — confirming `sStale` is fully drained on `Instance()` return.
  PDMFactorySupport::Invalidate();
  RefPtr<PDMFactorySupport> a = PDMFactorySupport::Instance();
  RefPtr<PDMFactorySupport> b = PDMFactorySupport::Instance();
  ASSERT_TRUE(a);
  ASSERT_TRUE(b);
  EXPECT_EQ(a.get(), b.get());
}

// Calling `Instance()` from a non-main thread must complete the listener
// registration via `SyncRunnable` and return a valid instance.
TEST(PDMFactorySupport, OffMainThreadInstance)
{
  PDMFactorySupport::Invalidate();

  RefPtr<TaskQueue> taskQueue =
      TaskQueue::Create(GetMediaThreadPool(MediaThreadType::SUPERVISOR),
                        "TestPDMFactorySupportOffMainThread");

  RefPtr<PDMFactorySupport> result;
  (void)WaitFor(InvokeAsync(taskQueue, __func__, [&result]() {
    result = PDMFactorySupport::Instance();
    return GenericPromise::CreateAndResolve(true, __func__);
  }));

  taskQueue->BeginShutdown();
  taskQueue->AwaitShutdownAndIdle();
  EXPECT_TRUE(result);
}
