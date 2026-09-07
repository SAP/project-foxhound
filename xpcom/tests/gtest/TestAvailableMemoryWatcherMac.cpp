/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"

#include "AvailableMemoryWatcher.h"
#include "mozilla/gtest/MozAssertions.h"
#include "mozilla/SpinEventLoopUntil.h"
#include "nsIObserver.h"
#include "nsIObserverService.h"
#include "nsITimer.h"
#include "nsMemoryPressure.h"
#include "TelemetryFixture.h"
#include "TelemetryTestHelpers.h"
#include "mozilla/glean/XpcomMetrics.h"

using namespace mozilla;

namespace {

template <typename ConditionT>
bool WaitUntil(const ConditionT& aCondition, uint32_t aTimeoutMs) {
  bool isTimeout = false;

  // The message queue can be empty and the loop stops
  // waiting for a new event before detecting timeout.
  // Creating a timer to fire a timeout event.
  nsCOMPtr<nsITimer> timer;
  NS_NewTimerWithFuncCallback(
      getter_AddRefs(timer),
      [](nsITimer*, void* isTimeout) {
        *reinterpret_cast<bool*>(isTimeout) = true;
      },
      &isTimeout, aTimeoutMs, nsITimer::TYPE_ONE_SHOT,
      "TestAvailableMemoryWatcherMac"_ns);

  SpinEventLoopUntil("TestAvailableMemoryWatcherMac"_ns, [&]() -> bool {
    if (isTimeout) {
      return true;
    }
    return aCondition();
  });

  return !isTimeout;
}

class Spinner final : public nsIObserver {
  nsCOMPtr<nsIObserverService> mObserverSvc;
  nsDependentCString mTopicToWatch;
  bool mTopicObserved;

  ~Spinner() = default;

 public:
  NS_DECL_ISUPPORTS

  Spinner(nsIObserverService* aObserverSvc, const char* const aTopic,
          const char16_t* const aSubTopic)
      : mObserverSvc(aObserverSvc),
        mTopicToWatch(aTopic),
        mTopicObserved(false) {}

  NS_IMETHOD Observe(nsISupports* aSubject, const char* aTopic,
                     const char16_t* aData) override {
    if (mTopicToWatch == aTopic) {
      mTopicObserved = true;
      mObserverSvc->RemoveObserver(this, aTopic);

      // Force the loop to move in case that there is no event in the queue.
      nsCOMPtr<nsIRunnable> dummyEvent = new Runnable(__func__);
      NS_DispatchToMainThread(dummyEvent);
    }
    return NS_OK;
  }

  void StartListening() {
    mTopicObserved = false;
    mObserverSvc->AddObserver(this, mTopicToWatch.get(), false);
  }

  bool Wait(uint32_t aTimeoutMs) {
    return WaitUntil([this]() { return this->mTopicObserved; }, aTimeoutMs);
  }
};

NS_IMPL_ISUPPORTS(Spinner, nsIObserver)

class MockTabUnloader final : public nsITabUnloader {
  ~MockTabUnloader() = default;

  uint32_t mCounter;

 public:
  MockTabUnloader() : mCounter(0) {}

  NS_DECL_THREADSAFE_ISUPPORTS

  void ResetCounter() { mCounter = 0; }
  uint32_t GetCounter() const { return mCounter; }

  NS_IMETHOD UnloadTabAsync() override {
    ++mCounter;
    // Issue a memory-pressure to verify OnHighMemory issues
    // a memory-pressure-stop event.
    NS_NotifyOfEventualMemoryPressure(MemoryPressureState::LowMemory);
    return NS_OK;
  }
};

NS_IMPL_ISUPPORTS(MockTabUnloader, nsITabUnloader)

}  // namespace

class AvailableMemoryWatcherFixture : public TelemetryTestFixture {
  nsCOMPtr<nsIObserverService> mObserverSvc;

 protected:
  RefPtr<nsAvailableMemoryWatcherBase> mWatcher;
  RefPtr<Spinner> mHighMemoryObserver;
  RefPtr<Spinner> mLowMemoryObserver;
  RefPtr<MockTabUnloader> mTabUnloader;

  static constexpr uint32_t kStateChangeTimeoutMs = 20000;
  static constexpr uint32_t kNotificationTimeoutMs = 20000;

  void TestSpecificSetUp() override {
    mObserverSvc = do_GetService(NS_OBSERVERSERVICE_CONTRACTID);
    ASSERT_TRUE(mObserverSvc);

    mHighMemoryObserver =
        new Spinner(mObserverSvc, "memory-pressure-stop", nullptr);
    mLowMemoryObserver = new Spinner(mObserverSvc, "memory-pressure", nullptr);

    mTabUnloader = new MockTabUnloader;

    mWatcher = nsAvailableMemoryWatcherBase::GetSingleton();
    mWatcher->RegisterTabUnloader(mTabUnloader);
  }
};

class MemoryWatcherTelemetryEvent {
  uint32_t mLastCountOfEvents;

  static uint32_t CurrentEventCount() {
    auto optEvents =
        mozilla::glean::memory_watcher::on_high_memory_stats.TestGetValue()
            .unwrap();
    return optEvents.isSome() ? optEvents.ref().Length() : 0;
  }

  static nsCString LastEventValue() {
    auto optEvents =
        mozilla::glean::memory_watcher::on_high_memory_stats.TestGetValue()
            .unwrap();
    if (optEvents.isNothing() || optEvents.ref().IsEmpty()) {
      return ""_ns;
    }
    for (const auto& extra : optEvents.ref().LastElement().mExtra) {
      if (std::get<0>(extra) == "value"_ns) {
        return nsCString(std::get<1>(extra));
      }
    }
    return ""_ns;
  }

 public:
  explicit MemoryWatcherTelemetryEvent(JSContext*)
      : mLastCountOfEvents(CurrentEventCount()) {}

  void ValidateLastEvent(JSContext*) {
    uint32_t currentCount = CurrentEventCount();
    // A new event was generated.
    EXPECT_EQ(currentCount, mLastCountOfEvents + 1);
    if (currentCount <= mLastCountOfEvents) {
      // No new event was added; nothing new to validate.
      return;
    }

    // Update mLastCountOfEvents for a subsequent call to ValidateLastEvent
    ++mLastCountOfEvents;

    nsCString value = LastEventValue();
    nsTArray<nsCString> tokens;
    for (const nsACString& token : value.Split(',')) {
      tokens.AppendElement(token);
    }
    EXPECT_EQ(tokens.Length(), 3U);

    // The third token should be a valid floating number.
    nsresult rv;
    tokens[2].ToDouble(&rv);
    EXPECT_NS_SUCCEEDED(rv);
  }
};

/*
 * Test the browser memory pressure reponse by artificially putting the system
 * into the "critical" level and ensuring 1) a tab unload attempt occurs and
 * 2) the Gecko memory-pressure notitificiation start and stop events occur.
 */
TEST_F(AvailableMemoryWatcherFixture, MemoryPressureResponse) {
  // Set the memory pressure state to normal in case we are already
  // running in a low memory pressure state.
  mWatcher->OnMemoryPressureChanged(MacMemoryPressureLevel::Value::eNormal);

  // Reset state
  mTabUnloader->ResetCounter();
  AutoJSContextWithGlobal cx(mCleanGlobal);
  MemoryWatcherTelemetryEvent telemetryEvent(cx.GetJSContext());

  // Simulate a low memory OS callback and make sure we observe
  // a memory-pressure event and a tab unload.
  mLowMemoryObserver->StartListening();
  mWatcher->OnMemoryPressureChanged(MacMemoryPressureLevel::Value::eWarning);
  mWatcher->OnMemoryPressureChanged(MacMemoryPressureLevel::Value::eCritical);
  EXPECT_TRUE(WaitUntil([this]() { return mTabUnloader->GetCounter() >= 1; },
                        kStateChangeTimeoutMs));
  EXPECT_TRUE(mLowMemoryObserver->Wait(kStateChangeTimeoutMs));

  // Simulate the normal memory pressure OS callback and make
  // sure we observe a memory-pressure-stop event.
  mHighMemoryObserver->StartListening();
  mWatcher->OnMemoryPressureChanged(MacMemoryPressureLevel::Value::eWarning);
  mWatcher->OnMemoryPressureChanged(MacMemoryPressureLevel::Value::eNormal);
  EXPECT_TRUE(mHighMemoryObserver->Wait(kStateChangeTimeoutMs));

  telemetryEvent.ValidateLastEvent(cx.GetJSContext());
}
