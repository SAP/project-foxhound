/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "TestCommon.h"
#include "gtest/gtest.h"

#include "mozilla/gtest/MozAssertions.h"
#include "nsCOMPtr.h"
#include "nsISocketTransport.h"
#include "../../base/nsSocketTransportService2.h"
#include "../../base/PollableEvent.h"
#include "nsServiceManagerUtils.h"
#include "nsThreadUtils.h"

using namespace mozilla;
using namespace mozilla::net;

// Test for bug 1993248 - PR_CreatePipe doesn't set nonblocking flag
// This test verifies that PollableEvent::Clear() doesn't block when called
TEST(TestPollableEvent, ClearDoesNotBlock)
{
  nsCOMPtr<nsISocketTransportService> service =
      do_GetService("@mozilla.org/network/socket-transport-service;1");
  ASSERT_TRUE(service);

  auto* sts = gSocketTransportService;
  ASSERT_TRUE(sts);

  NS_DispatchAndSpinEventLoopUntilComplete(
      "TestPollableEvent::ClearDoesNotBlock"_ns, sts,
      NS_NewRunnableFunction("TestPollableEvent::ClearDoesNotBlock", [&]() {
        // Create a PollableEvent
        PollableEvent event;
        ASSERT_TRUE(event.Valid());

        // The constructor signals the event, so Clear() should succeed
        ASSERT_TRUE(event.Clear());

        // Signal the event
        ASSERT_TRUE(event.Signal());

        // Clear should succeed and not block
        ASSERT_TRUE(event.Clear());

        // Calling Clear() again without Signal() should also not block
        // It should return true even when there's no data available
        ASSERT_TRUE(event.Clear());

        // Signal and clear multiple times to ensure robustness
        for (int i = 0; i < 10; i++) {
          ASSERT_TRUE(event.Signal());
          ASSERT_TRUE(event.Clear());
        }
      }));
}
