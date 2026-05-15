/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOCK_GRAPH_INTERFACE_H_
#define MOCK_GRAPH_INTERFACE_H_

#include <tuple>

#include "GraphDriver.h"
#include "gmock/gmock.h"

namespace mozilla {

class MockGraphInterface : public GraphInterface {
  NS_DECL_THREADSAFE_ISUPPORTS
  explicit MockGraphInterface(TrackRate aSampleRate)
      : mSampleRate(aSampleRate) {}
  MOCK_METHOD(void, NotifyInputStopped, ());
  MOCK_METHOD(void, NotifyInputData,
              (const AudioDataValue*, size_t, TrackRate, uint32_t, uint32_t));
  MOCK_METHOD(void, NotifySetRequestedInputProcessingParamsResult,
              (AudioCallbackDriver*, int,
               (Result<cubeb_input_processing_params, int>&&)));
  MOCK_METHOD(void, DeviceChanged, ());
#ifdef DEBUG
  MOCK_METHOD(bool, InDriverIteration, (const GraphDriver*), (const));
#endif
  /* OneIteration cannot be mocked because IterationResult is non-memmovable and
   * cannot be passed as a parameter, which GMock does internally. */
  MOCK_METHOD(void, MockIteration, (GraphTime aStateComputedTime), ());
  IterationResult OneIteration(GraphTime aStateComputedTime,
                               MixerCallbackReceiver* aMixerReceiver) {
    MockIteration(aStateComputedTime);
    GraphDriver* driver = mCurrentDriver;
    if (aMixerReceiver) {
      mMixer.StartMixing();
      mMixer.Mix(nullptr, driver->AsAudioCallbackDriver()->OutputChannelCount(),
                 aStateComputedTime - mStateComputedTime, mSampleRate);
      aMixerReceiver->MixerCallback(mMixer.MixedChunk(), mSampleRate);
    }
    if (aStateComputedTime != mStateComputedTime) {
      mFramesIteratedEvent.Notify(aStateComputedTime - mStateComputedTime);
      ++mIterationCount;
    }
    mStateComputedTime = aStateComputedTime;
    if (!mKeepProcessing) {
      return IterationResult::CreateStop(
          NS_NewRunnableFunction(__func__, [] {}));
    }
    if (auto guard = mNextDriver.Lock(); guard->isSome()) {
      auto tup = guard->extract();
      const auto& [driver, switchedRunnable] = tup;
      return IterationResult::CreateSwitchDriver(driver, switchedRunnable);
    }
    if (mEnsureNextIteration) {
      driver->EnsureNextIteration();
    }
    return IterationResult::CreateStillProcessing();
  }
  void SetEnsureNextIteration(bool aEnsure) { mEnsureNextIteration = aEnsure; }

  size_t IterationCount() const { return mIterationCount; }

  GraphTime StateComputedTime() const { return mStateComputedTime; }
  void SetCurrentDriver(GraphDriver* aDriver) { mCurrentDriver = aDriver; }

  void StopIterating() { mKeepProcessing = false; }

  void SwitchTo(RefPtr<GraphDriver> aDriver,
                RefPtr<Runnable> aSwitchedRunnable = NS_NewRunnableFunction(
                    "DefaultNoopSwitchedRunnable", [] {})) {
    auto guard = mNextDriver.Lock();
    MOZ_RELEASE_ASSERT(guard->isNothing());
    *guard =
        Some(std::make_tuple(std::move(aDriver), std::move(aSwitchedRunnable)));
  }
  const TrackRate mSampleRate;

  MediaEventSource<uint32_t>& FramesIteratedEvent() {
    return mFramesIteratedEvent;
  }

 protected:
  Atomic<size_t> mIterationCount{0};
  Atomic<GraphTime> mStateComputedTime{0};
  Atomic<GraphDriver*> mCurrentDriver{nullptr};
  Atomic<bool> mEnsureNextIteration{false};
  Atomic<bool> mKeepProcessing{true};
  DataMutex<Maybe<std::tuple<RefPtr<GraphDriver>, RefPtr<Runnable>>>>
      mNextDriver{"MockGraphInterface::mNextDriver"};
  RefPtr<Runnable> mNextDriverSwitchedRunnable;
  MediaEventProducer<uint32_t> mFramesIteratedEvent;
  AudioMixer mMixer;
  virtual ~MockGraphInterface() = default;
};

}  // namespace mozilla

#endif  // MOCK_GRAPH_INTERFACE_H_
