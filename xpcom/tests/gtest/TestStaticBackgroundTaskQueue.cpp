/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/StaticBackgroundTaskQueue.h"
#include "mozilla/SyncRunnable.h"
#include "nsThreadUtils.h"

namespace TestStaticBackgroundTaskQueue {

using namespace mozilla;

static already_AddRefed<nsISerialEventTarget> GetTestQueue() {
  static StaticBackgroundTaskQueue sQueue("TestStaticBackgroundTaskQueue");
  return sQueue.Get();
}

TEST(StaticBackgroundTaskQueue, GetAndDispatch)
{
  nsCOMPtr<nsISerialEventTarget> queue = GetTestQueue();
  ASSERT_TRUE(queue);

  nsCOMPtr<nsISerialEventTarget> queue2 = GetTestQueue();
  ASSERT_EQ(queue, queue2);

  ASSERT_TRUE(NS_IsMainThread());
  ASSERT_FALSE(queue->IsOnCurrentThread());

  bool didRun = false;
  RefPtr syncWithThread = MakeRefPtr<SyncRunnable>(
      NS_NewRunnableFunction("TestStaticBackgroundTaskQueue", [&] {
        EXPECT_FALSE(NS_IsMainThread());
        EXPECT_TRUE(queue->IsOnCurrentThread());
        didRun = true;
      }));
  ASSERT_TRUE(NS_SUCCEEDED(syncWithThread->DispatchToThread(queue)));
  ASSERT_TRUE(didRun);
}

}  // namespace TestStaticBackgroundTaskQueue
