/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-*/
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MediaTrackGraphImpl.h"

#include "gmock/gmock.h"
#include "gtest/gtest-printers.h"
#include "gtest/gtest.h"

#include "CrossGraphPort.h"
#include "DeviceInputTrack.h"
#ifdef MOZ_WEBRTC
#  include "MediaEngineWebRTCAudio.h"
#endif  // MOZ_WEBRTC
#include "MockCubeb.h"
#include "mozilla/Preferences.h"
#include "mozilla/SpinEventLoopUntil.h"
#include "mozilla/StaticPrefs_media.h"
#include "WaitFor.h"
#include "WavDumper.h"

#define DRIFT_BUFFERING_PREF "media.clockdrift.buffering"

using namespace mozilla;

namespace {
// Short-hand for InvokeAsync on the current thread.
#define Invoke(f) InvokeAsync(GetCurrentSerialEventTarget(), __func__, f)

// Short-hand for DispatchToCurrentThread with a function.
#define DispatchFunction(f) \
  NS_DispatchToCurrentThread(NS_NewRunnableFunction(__func__, f))

// Short-hand for DispatchToCurrentThread with a method with arguments
#define DispatchMethod(t, m, args...) \
  NS_DispatchToCurrentThread(NewRunnableMethod(__func__, t, m, ##args))

#ifdef MOZ_WEBRTC
/*
 * Common ControlMessages
 */
struct StartInputProcessing : public ControlMessage {
  const RefPtr<AudioProcessingTrack> mProcessingTrack;
  const RefPtr<AudioInputProcessing> mInputProcessing;

  StartInputProcessing(AudioProcessingTrack* aTrack,
                       AudioInputProcessing* aInputProcessing)
      : ControlMessage(aTrack),
        mProcessingTrack(aTrack),
        mInputProcessing(aInputProcessing) {}
  void Run() override { mInputProcessing->Start(mTrack->GraphImpl()); }
};

struct StopInputProcessing : public ControlMessage {
  const RefPtr<AudioInputProcessing> mInputProcessing;

  explicit StopInputProcessing(AudioProcessingTrack* aTrack,
                               AudioInputProcessing* aInputProcessing)
      : ControlMessage(aTrack), mInputProcessing(aInputProcessing) {}
  void Run() override { mInputProcessing->Stop(mTrack->GraphImpl()); }
};

struct SetPassThrough : public ControlMessage {
  const RefPtr<AudioInputProcessing> mInputProcessing;
  const bool mPassThrough;

  SetPassThrough(MediaTrack* aTrack, AudioInputProcessing* aInputProcessing,
                 bool aPassThrough)
      : ControlMessage(aTrack),
        mInputProcessing(aInputProcessing),
        mPassThrough(aPassThrough) {}
  void Run() override {
    EXPECT_EQ(mInputProcessing->PassThrough(mTrack->GraphImpl()),
              !mPassThrough);
    mInputProcessing->SetPassThrough(mTrack->GraphImpl(), mPassThrough);
  }
};

struct SetRequestedInputChannelCount : public ControlMessage {
  const CubebUtils::AudioDeviceID mDeviceId;
  const RefPtr<AudioInputProcessing> mInputProcessing;
  const uint32_t mChannelCount;

  SetRequestedInputChannelCount(MediaTrack* aTrack,
                                CubebUtils::AudioDeviceID aDeviceId,
                                AudioInputProcessing* aInputProcessing,
                                uint32_t aChannelCount)
      : ControlMessage(aTrack),
        mDeviceId(aDeviceId),
        mInputProcessing(aInputProcessing),
        mChannelCount(aChannelCount) {}
  void Run() override {
    mInputProcessing->SetRequestedInputChannelCount(mTrack->GraphImpl(),
                                                    mDeviceId, mChannelCount);
  }
};
#endif  // MOZ_WEBRTC

class GoFaster : public ControlMessage {
  MockCubeb* mCubeb;

 public:
  explicit GoFaster(MockCubeb* aCubeb)
      : ControlMessage(nullptr), mCubeb(aCubeb) {}
  void Run() override { mCubeb->GoFaster(); }
};

struct StartNonNativeInput : public ControlMessage {
  const RefPtr<NonNativeInputTrack> mInputTrack;
  RefPtr<AudioInputSource> mInputSource;

  StartNonNativeInput(NonNativeInputTrack* aInputTrack,
                      RefPtr<AudioInputSource>&& aInputSource)
      : ControlMessage(aInputTrack),
        mInputTrack(aInputTrack),
        mInputSource(std::move(aInputSource)) {}
  void Run() override { mInputTrack->StartAudio(std::move(mInputSource)); }
};

struct StopNonNativeInput : public ControlMessage {
  const RefPtr<NonNativeInputTrack> mInputTrack;

  explicit StopNonNativeInput(NonNativeInputTrack* aInputTrack)
      : ControlMessage(aInputTrack), mInputTrack(aInputTrack) {}
  void Run() override { mInputTrack->StopAudio(); }
};

}  // namespace

/*
 * The set of tests here are a bit special. In part because they're async and
 * depends on the graph thread to function. In part because they depend on main
 * thread stable state to send messages to the graph.
 *
 * Any message sent from the main thread to the graph through the graph's
 * various APIs are scheduled to run in stable state. Stable state occurs after
 * a task in the main thread eventloop has run to completion.
 *
 * Since gtests are generally sync and on main thread, calling into the graph
 * may schedule a stable state runnable but with no task in the eventloop to
 * trigger stable state. Therefore care must be taken to always call into the
 * graph from a task, typically via InvokeAsync or a dispatch to main thread.
 */

TEST(TestAudioTrackGraph, DifferentDeviceIDs)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraph* g1 = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::AUDIO_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE,
      /*OutputDeviceID*/ nullptr, GetMainThreadSerialEventTarget());

  MediaTrackGraph* g2 = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::AUDIO_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE,
      /*OutputDeviceID*/ reinterpret_cast<cubeb_devid>(1),
      GetMainThreadSerialEventTarget());

  MediaTrackGraph* g1_2 = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::AUDIO_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE,
      /*OutputDeviceID*/ nullptr, GetMainThreadSerialEventTarget());

  MediaTrackGraph* g2_2 = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::AUDIO_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE,
      /*OutputDeviceID*/ reinterpret_cast<cubeb_devid>(1),
      GetMainThreadSerialEventTarget());

  EXPECT_NE(g1, g2) << "Different graphs due to different device ids";
  EXPECT_EQ(g1, g1_2) << "Same graphs for same device ids";
  EXPECT_EQ(g2, g2_2) << "Same graphs for same device ids";

  for (MediaTrackGraph* g : {g1, g2}) {
    // Dummy track to make graph rolling. Add it and remove it to remove the
    // graph from the global hash table and let it shutdown.

    using SourceTrackPromise = MozPromise<SourceMediaTrack*, nsresult, true>;
    auto p = Invoke([g] {
      return SourceTrackPromise::CreateAndResolve(
          g->CreateSourceTrack(MediaSegment::AUDIO), __func__);
    });

    WaitFor(cubeb->StreamInitEvent());
    RefPtr<SourceMediaTrack> dummySource = WaitFor(p).unwrap();

    DispatchMethod(dummySource, &SourceMediaTrack::Destroy);

    WaitFor(cubeb->StreamDestroyEvent());
  }
}

TEST(TestAudioTrackGraph, SetOutputDeviceID)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  // Set the output device id in GetInstance method confirm that it is the one
  // used in cubeb_stream_init.
  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::AUDIO_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE,
      /*OutputDeviceID*/ reinterpret_cast<cubeb_devid>(2),
      GetMainThreadSerialEventTarget());

  // Dummy track to make graph rolling. Add it and remove it to remove the
  // graph from the global hash table and let it shutdown.
  RefPtr<SourceMediaTrack> dummySource;
  DispatchFunction(
      [&] { dummySource = graph->CreateSourceTrack(MediaSegment::AUDIO); });

  RefPtr<SmartMockCubebStream> stream = WaitFor(cubeb->StreamInitEvent());

  EXPECT_EQ(stream->GetOutputDeviceID(), reinterpret_cast<cubeb_devid>(2))
      << "After init confirm the expected output device id";

  // Test has finished, destroy the track to shutdown the MTG.
  DispatchMethod(dummySource, &SourceMediaTrack::Destroy);
  WaitFor(cubeb->StreamDestroyEvent());
}

TEST(TestAudioTrackGraph, NotifyDeviceStarted)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::AUDIO_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  RefPtr<SourceMediaTrack> dummySource;
  Unused << WaitFor(Invoke([&] {
    // Dummy track to make graph rolling. Add it and remove it to remove the
    // graph from the global hash table and let it shutdown.
    dummySource = graph->CreateSourceTrack(MediaSegment::AUDIO);

    return graph->NotifyWhenDeviceStarted(dummySource);
  }));

  {
    MediaTrackGraphImpl* graph = dummySource->GraphImpl();
    MonitorAutoLock lock(graph->GetMonitor());
    EXPECT_TRUE(graph->CurrentDriver()->AsAudioCallbackDriver());
    EXPECT_TRUE(graph->CurrentDriver()->ThreadRunning());
  }

  // Test has finished, destroy the track to shutdown the MTG.
  DispatchMethod(dummySource, &SourceMediaTrack::Destroy);
  WaitFor(cubeb->StreamDestroyEvent());
}

TEST(TestAudioTrackGraph, NonNativeInputTrackStartAndStop)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  const CubebUtils::AudioDeviceID deviceId = (CubebUtils::AudioDeviceID)1;

  // Add a NonNativeInputTrack to graph, making graph create an output-only
  // AudioCallbackDriver since NonNativeInputTrack is an audio-type MediaTrack.
  RefPtr<NonNativeInputTrack> track;
  auto started = Invoke([&] {
    track = new NonNativeInputTrack(graph->GraphRate(), deviceId,
                                    PRINCIPAL_HANDLE_NONE);
    graph->AddTrack(track);
    return graph->NotifyWhenDeviceStarted(track);
  });

  RefPtr<SmartMockCubebStream> driverStream = WaitFor(cubeb->StreamInitEvent());
  Result<bool, nsresult> rv = WaitFor(started);
  EXPECT_TRUE(rv.unwrapOr(false));
  EXPECT_FALSE(driverStream->mHasInput);
  EXPECT_TRUE(driverStream->mHasOutput);

  // Main test below:
  {
    const AudioInputSource::Id sourceId = 1;
    const uint32_t channels = 2;
    const TrackRate rate = 48000;
    const uint32_t bufferingMs = StaticPrefs::media_clockdrift_buffering();

    // Start and stop the audio in NonNativeInputTrack.
    {
      struct DeviceInfo {
        uint32_t mChannelCount;
        AudioInputType mType;
      };
      using DeviceQueryPromise =
          MozPromise<DeviceInfo, nsresult, /* IsExclusive = */ true>;

      struct DeviceQueryMessage : public ControlMessage {
        const NonNativeInputTrack* mInputTrack;
        MozPromiseHolder<DeviceQueryPromise> mHolder;

        DeviceQueryMessage(NonNativeInputTrack* aInputTrack,
                           MozPromiseHolder<DeviceQueryPromise>&& aHolder)
            : ControlMessage(aInputTrack),
              mInputTrack(aInputTrack),
              mHolder(std::move(aHolder)) {}
        void Run() override {
          DeviceInfo info = {mInputTrack->NumberOfChannels(),
                             mInputTrack->DevicePreference()};
          // mHolder.Resolve(info, __func__);
          mTrack->GraphImpl()->Dispatch(NS_NewRunnableFunction(
              "TestAudioTrackGraph::DeviceQueryMessage",
              [holder = std::move(mHolder), devInfo = info]() mutable {
                holder.Resolve(devInfo, __func__);
              }));
        }
      };

      // No input channels and device preference before start.
      {
        MozPromiseHolder<DeviceQueryPromise> h;
        RefPtr<DeviceQueryPromise> p = h.Ensure(__func__);
        DispatchFunction([&] {
          track->GraphImpl()->AppendMessage(
              MakeUnique<DeviceQueryMessage>(track.get(), std::move(h)));
        });
        Result<DeviceInfo, nsresult> r = WaitFor(p);
        ASSERT_TRUE(r.isOk());
        DeviceInfo info = r.unwrap();

        EXPECT_EQ(info.mChannelCount, 0U);
        EXPECT_EQ(info.mType, AudioInputType::Unknown);
      }

      DispatchFunction([&] {
        track->GraphImpl()->AppendMessage(MakeUnique<StartNonNativeInput>(
            track.get(),
            MakeRefPtr<AudioInputSource>(
                MakeRefPtr<AudioInputSourceListener>(track.get()), sourceId,
                deviceId, channels, true /* voice */, PRINCIPAL_HANDLE_NONE,
                rate, graph->GraphRate(), bufferingMs)));
      });
      RefPtr<SmartMockCubebStream> nonNativeStream =
          WaitFor(cubeb->StreamInitEvent());
      EXPECT_TRUE(nonNativeStream->mHasInput);
      EXPECT_FALSE(nonNativeStream->mHasOutput);
      EXPECT_EQ(nonNativeStream->GetInputDeviceID(), deviceId);
      EXPECT_EQ(nonNativeStream->InputChannels(), channels);
      EXPECT_EQ(nonNativeStream->InputSampleRate(),
                static_cast<uint32_t>(rate));

      // Input channels and device preference should be set after start.
      {
        MozPromiseHolder<DeviceQueryPromise> h;
        RefPtr<DeviceQueryPromise> p = h.Ensure(__func__);
        DispatchFunction([&] {
          track->GraphImpl()->AppendMessage(
              MakeUnique<DeviceQueryMessage>(track.get(), std::move(h)));
        });
        Result<DeviceInfo, nsresult> r = WaitFor(p);
        ASSERT_TRUE(r.isOk());
        DeviceInfo info = r.unwrap();

        EXPECT_EQ(info.mChannelCount, channels);
        EXPECT_EQ(info.mType, AudioInputType::Voice);
      }

      Unused << WaitFor(nonNativeStream->FramesProcessedEvent());

      DispatchFunction([&] {
        track->GraphImpl()->AppendMessage(
            MakeUnique<StopNonNativeInput>(track.get()));
      });
      RefPtr<SmartMockCubebStream> destroyedStream =
          WaitFor(cubeb->StreamDestroyEvent());
      EXPECT_EQ(destroyedStream.get(), nonNativeStream.get());

      // No input channels and device preference after stop.
      {
        MozPromiseHolder<DeviceQueryPromise> h;
        RefPtr<DeviceQueryPromise> p = h.Ensure(__func__);
        DispatchFunction([&] {
          track->GraphImpl()->AppendMessage(
              MakeUnique<DeviceQueryMessage>(track.get(), std::move(h)));
        });
        Result<DeviceInfo, nsresult> r = WaitFor(p);
        ASSERT_TRUE(r.isOk());
        DeviceInfo info = r.unwrap();

        EXPECT_EQ(info.mChannelCount, 0U);
        EXPECT_EQ(info.mType, AudioInputType::Unknown);
      }
    }

    // Make sure the NonNativeInputTrack can restart and stop its audio.
    {
      DispatchFunction([&] {
        track->GraphImpl()->AppendMessage(MakeUnique<StartNonNativeInput>(
            track.get(),
            MakeRefPtr<AudioInputSource>(
                MakeRefPtr<AudioInputSourceListener>(track.get()), sourceId,
                deviceId, channels, true, PRINCIPAL_HANDLE_NONE, rate,
                graph->GraphRate(), bufferingMs)));
      });
      RefPtr<SmartMockCubebStream> nonNativeStream =
          WaitFor(cubeb->StreamInitEvent());
      EXPECT_TRUE(nonNativeStream->mHasInput);
      EXPECT_FALSE(nonNativeStream->mHasOutput);
      EXPECT_EQ(nonNativeStream->GetInputDeviceID(), deviceId);
      EXPECT_EQ(nonNativeStream->InputChannels(), channels);
      EXPECT_EQ(nonNativeStream->InputSampleRate(),
                static_cast<uint32_t>(rate));

      Unused << WaitFor(nonNativeStream->FramesProcessedEvent());

      DispatchFunction([&] {
        track->GraphImpl()->AppendMessage(
            MakeUnique<StopNonNativeInput>(track.get()));
      });
      RefPtr<SmartMockCubebStream> destroyedStream =
          WaitFor(cubeb->StreamDestroyEvent());
      EXPECT_EQ(destroyedStream.get(), nonNativeStream.get());
    }
  }

  // Clean up.
  DispatchFunction([&] { track->Destroy(); });
  RefPtr<SmartMockCubebStream> destroyedStream =
      WaitFor(cubeb->StreamDestroyEvent());
  EXPECT_EQ(destroyedStream.get(), driverStream.get());
}

TEST(TestAudioTrackGraph, NonNativeInputTrackErrorCallback)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  const CubebUtils::AudioDeviceID deviceId = (CubebUtils::AudioDeviceID)1;

  // Add a NonNativeInputTrack to graph, making graph create an output-only
  // AudioCallbackDriver since NonNativeInputTrack is an audio-type MediaTrack.
  RefPtr<NonNativeInputTrack> track;
  auto started = Invoke([&] {
    track = new NonNativeInputTrack(graph->GraphRate(), deviceId,
                                    PRINCIPAL_HANDLE_NONE);
    graph->AddTrack(track);
    return graph->NotifyWhenDeviceStarted(track);
  });

  RefPtr<SmartMockCubebStream> driverStream = WaitFor(cubeb->StreamInitEvent());
  Result<bool, nsresult> rv = WaitFor(started);
  EXPECT_TRUE(rv.unwrapOr(false));
  EXPECT_FALSE(driverStream->mHasInput);
  EXPECT_TRUE(driverStream->mHasOutput);

  // Main test below:
  {
    const AudioInputSource::Id sourceId = 1;
    const uint32_t channels = 2;
    const TrackRate rate = 48000;
    const uint32_t bufferingMs = StaticPrefs::media_clockdrift_buffering();

    // Launch and start the non-native audio stream.
    DispatchFunction([&] {
      track->GraphImpl()->AppendMessage(MakeUnique<StartNonNativeInput>(
          track.get(),
          MakeRefPtr<AudioInputSource>(
              MakeRefPtr<AudioInputSourceListener>(track.get()), sourceId,
              deviceId, channels, true, PRINCIPAL_HANDLE_NONE, rate,
              graph->GraphRate(), bufferingMs)));
    });
    RefPtr<SmartMockCubebStream> nonNativeStream =
        WaitFor(cubeb->StreamInitEvent());
    EXPECT_TRUE(nonNativeStream->mHasInput);
    EXPECT_FALSE(nonNativeStream->mHasOutput);
    EXPECT_EQ(nonNativeStream->GetInputDeviceID(), deviceId);
    EXPECT_EQ(nonNativeStream->InputChannels(), channels);
    EXPECT_EQ(nonNativeStream->InputSampleRate(), static_cast<uint32_t>(rate));

    // Make sure the audio stream is running.
    Unused << WaitFor(nonNativeStream->FramesProcessedEvent());

    // Force an error. This results in the audio stream destroying.
    DispatchFunction([&] { nonNativeStream->ForceError(); });
    WaitFor(nonNativeStream->ErrorForcedEvent());

    RefPtr<SmartMockCubebStream> destroyedStream =
        WaitFor(cubeb->StreamDestroyEvent());
    EXPECT_EQ(destroyedStream.get(), nonNativeStream.get());
  }

  // Make sure it's ok to call audio stop again.
  DispatchFunction([&] {
    track->GraphImpl()->AppendMessage(
        MakeUnique<StopNonNativeInput>(track.get()));
  });

  // Clean up.
  DispatchFunction([&] { track->Destroy(); });
  RefPtr<SmartMockCubebStream> destroyedStream =
      WaitFor(cubeb->StreamDestroyEvent());
  EXPECT_EQ(destroyedStream.get(), driverStream.get());
}

class TestDeviceInputConsumerTrack : public DeviceInputConsumerTrack {
 public:
  static TestDeviceInputConsumerTrack* Create(MediaTrackGraph* aGraph) {
    MOZ_ASSERT(NS_IsMainThread());
    TestDeviceInputConsumerTrack* track =
        new TestDeviceInputConsumerTrack(aGraph->GraphRate());
    aGraph->AddTrack(track);
    return track;
  }

  void Destroy() {
    MOZ_ASSERT(NS_IsMainThread());
    DisconnectDeviceInput();
    DeviceInputConsumerTrack::Destroy();
  }

  void ProcessInput(GraphTime aFrom, GraphTime aTo, uint32_t aFlags) override {
    if (aFrom >= aTo) {
      return;
    }

    if (mInputs.IsEmpty()) {
      GetData<AudioSegment>()->AppendNullData(aTo - aFrom);
    } else {
      MOZ_ASSERT(mInputs.Length() == 1);
      AudioSegment data;
      DeviceInputConsumerTrack::GetInputSourceData(data, mInputs[0], aFrom,
                                                   aTo);
      GetData<AudioSegment>()->AppendFrom(&data);
    }
  };

  uint32_t NumberOfChannels() const override {
    if (mInputs.IsEmpty()) {
      return 0;
    }
    DeviceInputTrack* t = mInputs[0]->GetSource()->AsDeviceInputTrack();
    MOZ_ASSERT(t);
    return t->NumberOfChannels();
  }

 private:
  explicit TestDeviceInputConsumerTrack(TrackRate aSampleRate)
      : DeviceInputConsumerTrack(aSampleRate) {}
};

TEST(TestAudioTrackGraph, DeviceChangedCallback)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraphImpl* graphImpl = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  class TestAudioDataListener : public AudioDataListener {
   public:
    TestAudioDataListener(uint32_t aChannelCount, bool aIsVoice)
        : mChannelCount(aChannelCount),
          mIsVoice(aIsVoice),
          mDeviceChangedCount(0) {}

    uint32_t RequestedInputChannelCount(MediaTrackGraphImpl* aGraph) override {
      return mChannelCount;
    }
    bool IsVoiceInput(MediaTrackGraphImpl* aGraph) const override {
      return mIsVoice;
    };
    void DeviceChanged(MediaTrackGraphImpl* aGraph) override {
      ++mDeviceChangedCount;
    }
    void Disconnect(MediaTrackGraphImpl* aGraph) override{/* Ignored */};
    uint32_t DeviceChangedCount() { return mDeviceChangedCount; }

   private:
    ~TestAudioDataListener() = default;
    const uint32_t mChannelCount;
    const bool mIsVoice;
    std::atomic<uint32_t> mDeviceChangedCount;
  };

  // Create a full-duplex AudioCallbackDriver by creating a NativeInputTrack.
  const CubebUtils::AudioDeviceID device1 = (CubebUtils::AudioDeviceID)1;
  RefPtr<TestAudioDataListener> listener1 = new TestAudioDataListener(1, false);
  RefPtr<TestDeviceInputConsumerTrack> track1 =
      TestDeviceInputConsumerTrack::Create(graphImpl);
  track1->ConnectDeviceInput(device1, listener1.get(), PRINCIPAL_HANDLE_NONE);

  EXPECT_TRUE(track1->ConnectToNativeDevice());
  EXPECT_FALSE(track1->ConnectToNonNativeDevice());
  auto started =
      Invoke([&] { return graphImpl->NotifyWhenDeviceStarted(track1); });
  RefPtr<SmartMockCubebStream> stream1 = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream1->mHasInput);
  EXPECT_TRUE(stream1->mHasOutput);
  EXPECT_EQ(stream1->GetInputDeviceID(), device1);
  Unused << WaitFor(started);

  // Create a NonNativeInputTrack, and make sure its DeviceChangeCallback works.
  const CubebUtils::AudioDeviceID device2 = (CubebUtils::AudioDeviceID)2;
  RefPtr<TestAudioDataListener> listener2 = new TestAudioDataListener(2, true);
  RefPtr<TestDeviceInputConsumerTrack> track2 =
      TestDeviceInputConsumerTrack::Create(graphImpl);
  track2->ConnectDeviceInput(device2, listener2.get(), PRINCIPAL_HANDLE_NONE);

  EXPECT_FALSE(track2->ConnectToNativeDevice());
  EXPECT_TRUE(track2->ConnectToNonNativeDevice());
  RefPtr<SmartMockCubebStream> stream2 = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream2->mHasInput);
  EXPECT_FALSE(stream2->mHasOutput);
  EXPECT_EQ(stream2->GetInputDeviceID(), device2);

  // Produce a device-changed event for the NonNativeInputTrack.
  DispatchFunction([&] { stream2->ForceDeviceChanged(); });
  WaitFor(stream2->DeviceChangeForcedEvent());

  // Produce a device-changed event for the NativeInputTrack.
  DispatchFunction([&] { stream1->ForceDeviceChanged(); });
  WaitFor(stream1->DeviceChangeForcedEvent());

  // Destroy the NonNativeInputTrack.
  DispatchFunction([&] {
    track2->DisconnectDeviceInput();
    track2->Destroy();
  });
  RefPtr<SmartMockCubebStream> destroyedStream =
      WaitFor(cubeb->StreamDestroyEvent());
  EXPECT_EQ(destroyedStream.get(), stream2.get());

  // Make sure we only have one device-changed event for the NativeInputTrack.
  EXPECT_EQ(listener2->DeviceChangedCount(), 1U);

  // Destroy the NativeInputTrack.
  DispatchFunction([&] {
    track1->DisconnectDeviceInput();
    track1->Destroy();
  });
  destroyedStream = WaitFor(cubeb->StreamDestroyEvent());
  EXPECT_EQ(destroyedStream.get(), stream1.get());

  // Make sure we only have one device-changed event for the NativeInputTrack.
  EXPECT_EQ(listener1->DeviceChangedCount(), 1U);
}

// The native audio stream (a.k.a. GraphDriver) and the non-native audio stream
// should always be the same as the max requested input channel of its paired
// DeviceInputTracks. This test checks if the audio stream paired with the
// DeviceInputTrack will follow the max requested input channel or not.
//
// The main focus for this test is to make sure DeviceInputTrack::OpenAudio and
// ::CloseAudio works as what we expect. Besides, This test also confirms
// MediaTrackGraphImpl::ReevaluateInputDevice works correctly by using a
// test-only AudioDataListener.
//
// This test is pretty similar to RestartAudioIfProcessingMaxChannelCountChanged
// below, which tests the same thing but using AudioProcessingTrack.
// AudioProcessingTrack is the consumer of the  DeviceInputTrack used in wild.
// It has its own customized AudioDataListener. However, it only tests when
// MOZ_WEBRTC is defined.
TEST(TestAudioTrackGraph, RestartAudioIfMaxChannelCountChanged)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());
  auto unforcer = WaitFor(cubeb->ForceAudioThread()).unwrap();
  Unused << unforcer;

  MediaTrackGraphImpl* graphImpl = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  // A test-only AudioDataListener that simulates AudioInputProcessing's setter
  // and getter for the input channel count.
  class TestAudioDataListener : public AudioDataListener {
   public:
    TestAudioDataListener(uint32_t aChannelCount, bool aIsVoice)
        : mChannelCount(aChannelCount), mIsVoice(aIsVoice) {}
    // Main thread API
    void SetInputChannelCount(MediaTrackGraphImpl* aGraph,
                              CubebUtils::AudioDeviceID aDevice,
                              uint32_t aChannelCount) {
      MOZ_ASSERT(NS_IsMainThread());

      struct Message : public ControlMessage {
        MediaTrackGraphImpl* mGraph;
        TestAudioDataListener* mListener;
        CubebUtils::AudioDeviceID mDevice;
        uint32_t mChannelCount;

        Message(MediaTrackGraphImpl* aGraph, TestAudioDataListener* aListener,
                CubebUtils::AudioDeviceID aDevice, uint32_t aChannelCount)
            : ControlMessage(nullptr),
              mGraph(aGraph),
              mListener(aListener),
              mDevice(aDevice),
              mChannelCount(aChannelCount) {}
        void Run() override {
          mListener->mChannelCount = mChannelCount;
          mGraph->ReevaluateInputDevice(mDevice);
        }
      };

      aGraph->AppendMessage(
          MakeUnique<Message>(aGraph, this, aDevice, aChannelCount));
    }
    // Graph thread APIs: AudioDataListenerInterface implementations.
    uint32_t RequestedInputChannelCount(MediaTrackGraphImpl* aGraph) override {
      MOZ_ASSERT(aGraph->OnGraphThread());
      return mChannelCount;
    }
    bool IsVoiceInput(MediaTrackGraphImpl* aGraph) const override {
      return mIsVoice;
    };
    void DeviceChanged(MediaTrackGraphImpl* aGraph) override { /* Ignored */
    }
    void Disconnect(MediaTrackGraphImpl* aGraph) override{/* Ignored */};

   private:
    ~TestAudioDataListener() = default;

    // Graph thread-only.
    uint32_t mChannelCount;
    // Any thread.
    const bool mIsVoice;
  };

  // Request a new input channel count and expect to have a new stream.
  auto setNewChannelCount = [&](const RefPtr<TestAudioDataListener>& aListener,
                                RefPtr<SmartMockCubebStream>& aStream,
                                uint32_t aChannelCount) {
    ASSERT_TRUE(!!aListener);
    ASSERT_TRUE(!!aStream);
    ASSERT_TRUE(aStream->mHasInput);
    ASSERT_NE(aChannelCount, 0U);

    const CubebUtils::AudioDeviceID device = aStream->GetInputDeviceID();

    bool destroyed = false;
    MediaEventListener destroyListener = cubeb->StreamDestroyEvent().Connect(
        AbstractThread::GetCurrent(),
        [&](const RefPtr<SmartMockCubebStream>& aDestroyed) {
          destroyed = aDestroyed.get() == aStream.get();
        });

    RefPtr<SmartMockCubebStream> newStream;
    MediaEventListener restartListener = cubeb->StreamInitEvent().Connect(
        AbstractThread::GetCurrent(),
        [&](const RefPtr<SmartMockCubebStream>& aCreated) {
          newStream = aCreated;
        });

    DispatchFunction([&] {
      aListener->SetInputChannelCount(graphImpl, device, aChannelCount);
    });

    SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
        "TEST(TestAudioTrackGraph, RestartAudioIfMaxChannelCountChanged) #1"_ns,
        [&] { return destroyed && newStream; });

    destroyListener.Disconnect();
    restartListener.Disconnect();

    aStream = newStream;
  };

  // Open a new track and expect to have a new stream.
  auto openTrack = [&](RefPtr<SmartMockCubebStream>& aCurrentStream,
                       RefPtr<TestDeviceInputConsumerTrack>& aTrack,
                       const RefPtr<TestAudioDataListener>& aListener,
                       CubebUtils::AudioDeviceID aDevice) {
    ASSERT_TRUE(!!aCurrentStream);
    ASSERT_TRUE(aCurrentStream->mHasInput);
    ASSERT_TRUE(!aTrack);
    ASSERT_TRUE(!!aListener);

    bool destroyed = false;
    MediaEventListener destroyListener = cubeb->StreamDestroyEvent().Connect(
        AbstractThread::GetCurrent(),
        [&](const RefPtr<SmartMockCubebStream>& aDestroyed) {
          destroyed = aDestroyed.get() == aCurrentStream.get();
        });

    RefPtr<SmartMockCubebStream> newStream;
    MediaEventListener restartListener = cubeb->StreamInitEvent().Connect(
        AbstractThread::GetCurrent(),
        [&](const RefPtr<SmartMockCubebStream>& aCreated) {
          newStream = aCreated;
        });

    aTrack = TestDeviceInputConsumerTrack::Create(graphImpl);
    aTrack->ConnectDeviceInput(aDevice, aListener.get(), PRINCIPAL_HANDLE_NONE);

    SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
        "TEST(TestAudioTrackGraph, RestartAudioIfMaxChannelCountChanged) #2"_ns,
        [&] { return destroyed && newStream; });

    destroyListener.Disconnect();
    restartListener.Disconnect();

    aCurrentStream = newStream;
  };

  // Test for the native input device first then non-native device. The
  // non-native device will be destroyed before the native device in case of
  // causing a driver switching.

  // Test for the native device.
  const CubebUtils::AudioDeviceID nativeDevice = (CubebUtils::AudioDeviceID)1;
  RefPtr<TestDeviceInputConsumerTrack> track1;
  RefPtr<TestAudioDataListener> listener1;
  RefPtr<SmartMockCubebStream> nativeStream;
  RefPtr<TestDeviceInputConsumerTrack> track2;
  RefPtr<TestAudioDataListener> listener2;
  {
    // Open a 1-channel NativeInputTrack.
    listener1 = new TestAudioDataListener(1, false);
    track1 = TestDeviceInputConsumerTrack::Create(graphImpl);
    track1->ConnectDeviceInput(nativeDevice, listener1.get(),
                               PRINCIPAL_HANDLE_NONE);

    EXPECT_TRUE(track1->ConnectToNativeDevice());
    EXPECT_FALSE(track1->ConnectToNonNativeDevice());
    auto started =
        Invoke([&] { return graphImpl->NotifyWhenDeviceStarted(track1); });
    nativeStream = WaitFor(cubeb->StreamInitEvent());
    EXPECT_TRUE(nativeStream->mHasInput);
    EXPECT_TRUE(nativeStream->mHasOutput);
    EXPECT_EQ(nativeStream->GetInputDeviceID(), nativeDevice);
    Unused << WaitFor(started);

    // Open a 2-channel NativeInputTrack and wait for a new driver since the
    // max-channel for the native device becomes 2 now.
    listener2 = new TestAudioDataListener(2, false);
    openTrack(nativeStream, track2, listener2, nativeDevice);
    EXPECT_EQ(nativeStream->InputChannels(), 2U);

    // Set the second NativeInputTrack to 1-channel and wait for a new driver
    // since the max-channel for the native device becomes 1 now.
    setNewChannelCount(listener2, nativeStream, 1);
    EXPECT_EQ(nativeStream->InputChannels(), 1U);

    // Set the first NativeInputTrack to 2-channel and wait for a new driver
    // since the max input channel for the native device becomes 2 now.
    setNewChannelCount(listener1, nativeStream, 2);
    EXPECT_EQ(nativeStream->InputChannels(), 2U);
  }

  // Test for the non-native device.
  {
    const CubebUtils::AudioDeviceID nonNativeDevice =
        (CubebUtils::AudioDeviceID)2;

    // Open a 1-channel NonNativeInputTrack.
    RefPtr<TestAudioDataListener> listener3 =
        new TestAudioDataListener(1, false);
    RefPtr<TestDeviceInputConsumerTrack> track3 =
        TestDeviceInputConsumerTrack::Create(graphImpl);
    track3->ConnectDeviceInput(nonNativeDevice, listener3.get(),
                               PRINCIPAL_HANDLE_NONE);
    EXPECT_FALSE(track3->ConnectToNativeDevice());
    EXPECT_TRUE(track3->ConnectToNonNativeDevice());

    RefPtr<SmartMockCubebStream> nonNativeStream =
        WaitFor(cubeb->StreamInitEvent());
    EXPECT_TRUE(nonNativeStream->mHasInput);
    EXPECT_FALSE(nonNativeStream->mHasOutput);
    EXPECT_EQ(nonNativeStream->GetInputDeviceID(), nonNativeDevice);
    EXPECT_EQ(nonNativeStream->InputChannels(), 1U);

    // Open a 2-channel NonNativeInputTrack and wait for a new stream since
    // the max-channel for the non-native device becomes 2 now.
    RefPtr<TestAudioDataListener> listener4 =
        new TestAudioDataListener(2, false);
    RefPtr<TestDeviceInputConsumerTrack> track4;
    openTrack(nonNativeStream, track4, listener4, nonNativeDevice);
    EXPECT_EQ(nonNativeStream->InputChannels(), 2U);
    EXPECT_EQ(nonNativeStream->GetInputDeviceID(), nonNativeDevice);

    // Set the second NonNativeInputTrack to 1-channel and wait for a new
    // driver since the max-channel for the non-native device becomes 1 now.
    setNewChannelCount(listener4, nonNativeStream, 1);
    EXPECT_EQ(nonNativeStream->InputChannels(), 1U);

    // Set the first NonNativeInputTrack to 2-channel and wait for a new
    // driver since the max input channel for the non-native device becomes 2
    // now.
    setNewChannelCount(listener3, nonNativeStream, 2);
    EXPECT_EQ(nonNativeStream->InputChannels(), 2U);

    // Close the second NonNativeInputTrack (1-channel) then the first one
    // (2-channel) so we won't result in another stream creation.
    DispatchFunction([&] {
      track4->DisconnectDeviceInput();
      track4->Destroy();
    });
    DispatchFunction([&] {
      track3->DisconnectDeviceInput();
      track3->Destroy();
    });
    RefPtr<SmartMockCubebStream> destroyedStream =
        WaitFor(cubeb->StreamDestroyEvent());
    EXPECT_EQ(destroyedStream.get(), nonNativeStream.get());
  }

  // Tear down for the native device.
  {
    // Close the second NativeInputTrack (1-channel) then the first one
    // (2-channel) so we won't have driver switching.
    DispatchFunction([&] {
      track2->DisconnectDeviceInput();
      track2->Destroy();
    });
    DispatchFunction([&] {
      track1->DisconnectDeviceInput();
      track1->Destroy();
    });
    RefPtr<SmartMockCubebStream> destroyedStream =
        WaitFor(cubeb->StreamDestroyEvent());
    EXPECT_EQ(destroyedStream.get(), nativeStream.get());
  }
}

// This test is pretty similar to SwitchNativeAudioProcessingTrack below, which
// tests the same thing but using AudioProcessingTrack. AudioProcessingTrack is
// the consumer of the  DeviceInputTrack used in wild. It has its own customized
// AudioDataListener. However, it only tests when MOZ_WEBRTC is defined.
TEST(TestAudioTrackGraph, SwitchNativeInputDevice)
{
  class TestAudioDataListener : public AudioDataListener {
   public:
    TestAudioDataListener(uint32_t aChannelCount, bool aIsVoice)
        : mChannelCount(aChannelCount),
          mIsVoice(aIsVoice),
          mDeviceChangedCount(0) {}

    uint32_t RequestedInputChannelCount(MediaTrackGraphImpl* aGraph) override {
      return mChannelCount;
    }
    bool IsVoiceInput(MediaTrackGraphImpl* aGraph) const override {
      return mIsVoice;
    };
    void DeviceChanged(MediaTrackGraphImpl* aGraph) override {
      ++mDeviceChangedCount;
    }
    void Disconnect(MediaTrackGraphImpl* aGraph) override{/* Ignored */};
    uint32_t DeviceChangedCount() { return mDeviceChangedCount; }

   private:
    ~TestAudioDataListener() = default;
    const uint32_t mChannelCount;
    const bool mIsVoice;
    std::atomic<uint32_t> mDeviceChangedCount;
  };

  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraphImpl* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  auto switchNativeDevice =
      [&](RefPtr<SmartMockCubebStream>&& aCurrentNativeStream,
          RefPtr<TestDeviceInputConsumerTrack>& aCurrentNativeTrack,
          RefPtr<SmartMockCubebStream>& aNextNativeStream,
          RefPtr<TestDeviceInputConsumerTrack>& aNextNativeTrack) {
        ASSERT_TRUE(aCurrentNativeStream->mHasInput);
        ASSERT_TRUE(aCurrentNativeStream->mHasOutput);
        ASSERT_TRUE(aNextNativeStream->mHasInput);
        ASSERT_FALSE(aNextNativeStream->mHasOutput);

        std::cerr << "Switching native input from device "
                  << aCurrentNativeStream->GetInputDeviceID() << " to "
                  << aNextNativeStream->GetInputDeviceID() << std::endl;

        uint32_t destroyed = 0;
        MediaEventListener destroyListener =
            cubeb->StreamDestroyEvent().Connect(
                AbstractThread::GetCurrent(),
                [&](const RefPtr<SmartMockCubebStream>& aDestroyed) {
                  if (aDestroyed.get() == aCurrentNativeStream.get() ||
                      aDestroyed.get() == aNextNativeStream.get()) {
                    std::cerr << "cubeb stream " << aDestroyed.get()
                              << " (device " << aDestroyed->GetInputDeviceID()
                              << ") has been destroyed" << std::endl;
                    destroyed += 1;
                  }
                });

        RefPtr<SmartMockCubebStream> newStream;
        MediaEventListener restartListener = cubeb->StreamInitEvent().Connect(
            AbstractThread::GetCurrent(),
            [&](const RefPtr<SmartMockCubebStream>& aCreated) {
              // Make sure new stream has input, to prevent from getting a
              // temporary output-only AudioCallbackDriver after closing current
              // native device but before setting a new native input.
              if (aCreated->mHasInput) {
                ASSERT_TRUE(aCreated->mHasOutput);
                newStream = aCreated;
              }
            });

        std::cerr << "Close device " << aCurrentNativeStream->GetInputDeviceID()
                  << std::endl;
        DispatchFunction([&] {
          aCurrentNativeTrack->DisconnectDeviceInput();
          aCurrentNativeTrack->Destroy();
        });

        std::cerr << "Wait for the switching" << std::endl;
        SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
            "TEST(TestAudioTrackGraph, SwitchNativeInputDevice)"_ns,
            [&] { return destroyed >= 2 && newStream; });

        destroyListener.Disconnect();
        restartListener.Disconnect();

        aCurrentNativeStream = nullptr;
        aNextNativeStream = newStream;

        std::cerr << "Now the native input is device "
                  << aNextNativeStream->GetInputDeviceID() << std::endl;
      };

  // Open a DeviceInputConsumerTrack for device 1.
  const CubebUtils::AudioDeviceID device1 = (CubebUtils::AudioDeviceID)1;
  RefPtr<TestDeviceInputConsumerTrack> track1 =
      TestDeviceInputConsumerTrack::Create(graph);
  RefPtr<TestAudioDataListener> listener1 = new TestAudioDataListener(1, false);
  track1->ConnectDeviceInput(device1, listener1, PRINCIPAL_HANDLE_NONE);
  EXPECT_EQ(track1->DeviceId().value(), device1);

  auto started = Invoke([&] { return graph->NotifyWhenDeviceStarted(track1); });

  RefPtr<SmartMockCubebStream> stream1 = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream1->mHasInput);
  EXPECT_TRUE(stream1->mHasOutput);
  EXPECT_EQ(stream1->InputChannels(), 1U);
  EXPECT_EQ(stream1->GetInputDeviceID(), device1);
  Unused << WaitFor(started);
  std::cerr << "Device " << device1 << " is opened (stream " << stream1.get()
            << ")" << std::endl;

  // Open a DeviceInputConsumerTrack for device 2.
  const CubebUtils::AudioDeviceID device2 = (CubebUtils::AudioDeviceID)2;
  RefPtr<TestDeviceInputConsumerTrack> track2 =
      TestDeviceInputConsumerTrack::Create(graph);
  RefPtr<TestAudioDataListener> listener2 = new TestAudioDataListener(2, false);
  track2->ConnectDeviceInput(device2, listener2, PRINCIPAL_HANDLE_NONE);
  EXPECT_EQ(track2->DeviceId().value(), device2);

  RefPtr<SmartMockCubebStream> stream2 = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream2->mHasInput);
  EXPECT_FALSE(stream2->mHasOutput);
  EXPECT_EQ(stream2->InputChannels(), 2U);
  EXPECT_EQ(stream2->GetInputDeviceID(), device2);
  std::cerr << "Device " << device2 << " is opened (stream " << stream2.get()
            << ")" << std::endl;

  // Open a DeviceInputConsumerTrack for device 3.
  const CubebUtils::AudioDeviceID device3 = (CubebUtils::AudioDeviceID)3;
  RefPtr<TestDeviceInputConsumerTrack> track3 =
      TestDeviceInputConsumerTrack::Create(graph);
  RefPtr<TestAudioDataListener> listener3 = new TestAudioDataListener(1, false);
  track3->ConnectDeviceInput(device3, listener3, PRINCIPAL_HANDLE_NONE);
  EXPECT_EQ(track3->DeviceId().value(), device3);

  RefPtr<SmartMockCubebStream> stream3 = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream3->mHasInput);
  EXPECT_FALSE(stream3->mHasOutput);
  EXPECT_EQ(stream3->InputChannels(), 1U);
  EXPECT_EQ(stream3->GetInputDeviceID(), device3);
  std::cerr << "Device " << device3 << " is opened (stream " << stream3.get()
            << ")" << std::endl;

  // Close device 1, so the native input device is switched from device 1 to
  // device 2.
  switchNativeDevice(std::move(stream1), track1, stream2, track2);
  EXPECT_TRUE(stream2->mHasInput);
  EXPECT_TRUE(stream2->mHasOutput);
  EXPECT_EQ(stream2->InputChannels(), 2U);
  EXPECT_EQ(stream2->GetInputDeviceID(), device2);
  {
    NativeInputTrack* native =
        track2->GraphImpl()->GetNativeInputTrackMainThread();
    ASSERT_TRUE(!!native);
    EXPECT_EQ(native->mDeviceId, device2);
  }

  // Close device 2, so the native input device is switched from device 2 to
  // device 3.
  switchNativeDevice(std::move(stream2), track2, stream3, track3);
  EXPECT_TRUE(stream3->mHasInput);
  EXPECT_TRUE(stream3->mHasOutput);
  EXPECT_EQ(stream3->InputChannels(), 1U);
  EXPECT_EQ(stream3->GetInputDeviceID(), device3);
  {
    NativeInputTrack* native =
        track3->GraphImpl()->GetNativeInputTrackMainThread();
    ASSERT_TRUE(!!native);
    EXPECT_EQ(native->mDeviceId, device3);
  }

  // Clean up.
  std::cerr << "Close device " << device3 << std::endl;
  DispatchFunction([&] {
    track3->DisconnectDeviceInput();
    track3->Destroy();
  });
  RefPtr<SmartMockCubebStream> destroyedStream =
      WaitFor(cubeb->StreamDestroyEvent());
  EXPECT_EQ(destroyedStream.get(), stream3.get());
  {
    auto* graphImpl = static_cast<MediaTrackGraphImpl*>(graph);
    NativeInputTrack* native = graphImpl->GetNativeInputTrackMainThread();
    ASSERT_TRUE(!native);
  }
  std::cerr << "No native input now" << std::endl;
}

#ifdef MOZ_WEBRTC
TEST(TestAudioTrackGraph, ErrorCallback)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  const CubebUtils::AudioDeviceID deviceId = (CubebUtils::AudioDeviceID)1;

  // Dummy track to make graph rolling. Add it and remove it to remove the
  // graph from the global hash table and let it shutdown.
  //
  // We open an input through this track so that there's something triggering
  // EnsureNextIteration on the fallback driver after the callback driver has
  // gotten the error.
  RefPtr<AudioProcessingTrack> processingTrack;
  RefPtr<AudioInputProcessing> listener;
  auto started = Invoke([&] {
    processingTrack = AudioProcessingTrack::Create(graph);
    listener = new AudioInputProcessing(2);
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<SetPassThrough>(processingTrack, listener, true));
    processingTrack->SetInputProcessing(listener);
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<StartInputProcessing>(processingTrack, listener));
    processingTrack->ConnectDeviceInput(deviceId, listener,
                                        PRINCIPAL_HANDLE_NONE);
    EXPECT_EQ(processingTrack->DeviceId().value(), deviceId);
    return graph->NotifyWhenDeviceStarted(processingTrack);
  });

  RefPtr<SmartMockCubebStream> stream = WaitFor(cubeb->StreamInitEvent());
  Result<bool, nsresult> rv = WaitFor(started);
  EXPECT_TRUE(rv.unwrapOr(false));

  // Force a cubeb state_callback error and see that we don't crash.
  DispatchFunction([&] { stream->ForceError(); });

  // Wait for both the error to take effect, and the driver to restart.
  bool errored = false, init = false;
  MediaEventListener errorListener = stream->ErrorForcedEvent().Connect(
      AbstractThread::GetCurrent(), [&] { errored = true; });
  MediaEventListener initListener = cubeb->StreamInitEvent().Connect(
      AbstractThread::GetCurrent(), [&] { init = true; });
  SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
      "TEST(TestAudioTrackGraph, ErrorCallback)"_ns,
      [&] { return errored && init; });
  errorListener.Disconnect();
  initListener.Disconnect();

  // Clean up.
  DispatchFunction([&] {
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<StopInputProcessing>(processingTrack, listener));
    processingTrack->DisconnectDeviceInput();
    processingTrack->Destroy();
  });
  WaitFor(cubeb->StreamDestroyEvent());
}

TEST(TestAudioTrackGraph, AudioProcessingTrack)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());
  auto unforcer = WaitFor(cubeb->ForceAudioThread()).unwrap();
  Unused << unforcer;

  // Start on a system clock driver, then switch to full-duplex in one go. If we
  // did output-then-full-duplex we'd risk a second NotifyWhenDeviceStarted
  // resolving early after checking the first audio driver only.
  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  const CubebUtils::AudioDeviceID deviceId = (CubebUtils::AudioDeviceID)1;

  RefPtr<AudioProcessingTrack> processingTrack;
  RefPtr<ProcessedMediaTrack> outputTrack;
  RefPtr<MediaInputPort> port;
  RefPtr<AudioInputProcessing> listener;
  auto p = Invoke([&] {
    processingTrack = AudioProcessingTrack::Create(graph);
    outputTrack = graph->CreateForwardedInputTrack(MediaSegment::AUDIO);
    outputTrack->QueueSetAutoend(false);
    outputTrack->AddAudioOutput(reinterpret_cast<void*>(1));
    port = outputTrack->AllocateInputPort(processingTrack);
    /* Primary graph: Open Audio Input through SourceMediaTrack */
    listener = new AudioInputProcessing(2);
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<SetPassThrough>(processingTrack, listener, true));
    processingTrack->SetInputProcessing(listener);
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<StartInputProcessing>(processingTrack, listener));
    // Device id does not matter. Ignore.
    processingTrack->ConnectDeviceInput(deviceId, listener,
                                        PRINCIPAL_HANDLE_NONE);
    return graph->NotifyWhenDeviceStarted(processingTrack);
  });

  RefPtr<SmartMockCubebStream> stream = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream->mHasInput);
  Unused << WaitFor(p);

  // Wait for a second worth of audio data. GoFaster is dispatched through a
  // ControlMessage so that it is called in the first audio driver iteration.
  // Otherwise the audio driver might be going very fast while the fallback
  // system clock driver is still in an iteration.
  DispatchFunction([&] {
    processingTrack->GraphImpl()->AppendMessage(MakeUnique<GoFaster>(cubeb));
  });
  uint32_t totalFrames = 0;
  WaitUntil(stream->FramesVerifiedEvent(), [&](uint32_t aFrames) {
    totalFrames += aFrames;
    return totalFrames > static_cast<uint32_t>(graph->GraphRate());
  });
  cubeb->DontGoFaster();

  // Clean up.
  DispatchFunction([&] {
    outputTrack->RemoveAudioOutput((void*)1);
    outputTrack->Destroy();
    port->Destroy();
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<StopInputProcessing>(processingTrack, listener));
    processingTrack->DisconnectDeviceInput();
    processingTrack->Destroy();
  });

  uint32_t inputRate = stream->InputSampleRate();
  uint32_t inputFrequency = stream->InputFrequency();
  uint64_t preSilenceSamples;
  uint32_t estimatedFreq;
  uint32_t nrDiscontinuities;
  Tie(preSilenceSamples, estimatedFreq, nrDiscontinuities) =
      WaitFor(stream->OutputVerificationEvent());

  EXPECT_EQ(estimatedFreq, inputFrequency);
  std::cerr << "PreSilence: " << preSilenceSamples << std::endl;
  // We buffer 128 frames. See DeviceInputTrack::ProcessInput.
  EXPECT_GE(preSilenceSamples, 128U);
  // If the fallback system clock driver is doing a graph iteration before the
  // first audio driver iteration comes in, that iteration is ignored and
  // results in zeros. It takes one fallback driver iteration *after* the audio
  // driver has started to complete the switch, *usually* resulting two
  // 10ms-iterations of silence; sometimes only one.
  EXPECT_LE(preSilenceSamples, 128U + 2 * inputRate / 100 /* 2*10ms */);
  // The waveform from AudioGenerator starts at 0, but we don't control its
  // ending, so we expect a discontinuity there.
  EXPECT_LE(nrDiscontinuities, 1U);
}

TEST(TestAudioTrackGraph, ReConnectDeviceInput)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  // 48k is a native processing rate, and avoids a resampling pass compared
  // to 44.1k. The resampler may add take a few frames to stabilize, which show
  // as unexected discontinuities in the test.
  const TrackRate rate = 48000;

  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1, rate, nullptr,
      GetMainThreadSerialEventTarget());

  const CubebUtils::AudioDeviceID deviceId = (CubebUtils::AudioDeviceID)1;

  RefPtr<AudioProcessingTrack> processingTrack;
  RefPtr<ProcessedMediaTrack> outputTrack;
  RefPtr<MediaInputPort> port;
  RefPtr<AudioInputProcessing> listener;
  auto p = Invoke([&] {
    processingTrack = AudioProcessingTrack::Create(graph);
    outputTrack = graph->CreateForwardedInputTrack(MediaSegment::AUDIO);
    outputTrack->QueueSetAutoend(false);
    outputTrack->AddAudioOutput(reinterpret_cast<void*>(1));
    port = outputTrack->AllocateInputPort(processingTrack);
    listener = new AudioInputProcessing(2);
    processingTrack->SetInputProcessing(listener);
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<StartInputProcessing>(processingTrack, listener));
    processingTrack->ConnectDeviceInput(deviceId, listener,
                                        PRINCIPAL_HANDLE_NONE);
    return graph->NotifyWhenDeviceStarted(processingTrack);
  });

  RefPtr<SmartMockCubebStream> stream = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream->mHasInput);
  Unused << WaitFor(p);

  // Set a drift factor so that we don't dont produce perfect 10ms-chunks. This
  // will exercise whatever buffers are in the audio processing pipeline, and
  // the bookkeeping surrounding them.
  stream->SetDriftFactor(1.111);

  // Wait for a second worth of audio data. GoFaster is dispatched through a
  // ControlMessage so that it is called in the first audio driver iteration.
  // Otherwise the audio driver might be going very fast while the fallback
  // system clock driver is still in an iteration.
  DispatchFunction([&] {
    processingTrack->GraphImpl()->AppendMessage(MakeUnique<GoFaster>(cubeb));
  });
  {
    uint32_t totalFrames = 0;
    WaitUntil(stream->FramesProcessedEvent(), [&](uint32_t aFrames) {
      totalFrames += aFrames;
      return totalFrames > static_cast<uint32_t>(graph->GraphRate());
    });
  }
  cubeb->DontGoFaster();

  // Close the input to see that no asserts go off due to bad state.
  DispatchFunction([&] { processingTrack->DisconnectDeviceInput(); });

  stream = WaitFor(cubeb->StreamInitEvent());
  EXPECT_FALSE(stream->mHasInput);
  Unused << WaitFor(
      Invoke([&] { return graph->NotifyWhenDeviceStarted(processingTrack); }));

  // Output-only. Wait for another second before unmuting.
  DispatchFunction([&] {
    processingTrack->GraphImpl()->AppendMessage(MakeUnique<GoFaster>(cubeb));
  });
  {
    uint32_t totalFrames = 0;
    WaitUntil(stream->FramesProcessedEvent(), [&](uint32_t aFrames) {
      totalFrames += aFrames;
      return totalFrames > static_cast<uint32_t>(graph->GraphRate());
    });
  }
  cubeb->DontGoFaster();

  // Re-open the input to again see that no asserts go off due to bad state.
  DispatchFunction([&] {
    // Device id does not matter. Ignore.
    processingTrack->ConnectDeviceInput(deviceId, listener,
                                        PRINCIPAL_HANDLE_NONE);
  });

  stream = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream->mHasInput);
  Unused << WaitFor(
      Invoke([&] { return graph->NotifyWhenDeviceStarted(processingTrack); }));

  // Full-duplex. Wait for another second before finishing.
  DispatchFunction([&] {
    processingTrack->GraphImpl()->AppendMessage(MakeUnique<GoFaster>(cubeb));
  });
  {
    uint32_t totalFrames = 0;
    WaitUntil(stream->FramesProcessedEvent(), [&](uint32_t aFrames) {
      totalFrames += aFrames;
      return totalFrames > static_cast<uint32_t>(graph->GraphRate());
    });
  }
  cubeb->DontGoFaster();

  // Clean up.
  DispatchFunction([&] {
    outputTrack->RemoveAudioOutput((void*)1);
    outputTrack->Destroy();
    port->Destroy();
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<StopInputProcessing>(processingTrack, listener));
    processingTrack->DisconnectDeviceInput();
    processingTrack->Destroy();
  });

  uint32_t inputRate = stream->InputSampleRate();
  uint32_t inputFrequency = stream->InputFrequency();
  uint64_t preSilenceSamples;
  uint32_t estimatedFreq;
  uint32_t nrDiscontinuities;
  Tie(preSilenceSamples, estimatedFreq, nrDiscontinuities) =
      WaitFor(stream->OutputVerificationEvent());

  EXPECT_EQ(estimatedFreq, inputFrequency);
  std::cerr << "PreSilence: " << preSilenceSamples << std::endl;
  // We buffer 10ms worth of frames in non-passthrough mode, plus up to 128
  // frames as we round up to the nearest block. See
  // AudioInputProcessing::Process and DeviceInputTrack::PrcoessInput.
  EXPECT_GE(preSilenceSamples, 128U + inputRate / 100);
  // If the fallback system clock driver is doing a graph iteration before the
  // first audio driver iteration comes in, that iteration is ignored and
  // results in zeros. It takes one fallback driver iteration *after* the audio
  // driver has started to complete the switch, *usually* resulting two
  // 10ms-iterations of silence; sometimes only one.
  EXPECT_LE(preSilenceSamples, 128U + 3 * inputRate / 100 /* 3*10ms */);
  // The waveform from AudioGenerator starts at 0, but we don't control its
  // ending, so we expect a discontinuity there. Note that this check is only
  // for the waveform on the stream *after* re-opening the input.
  EXPECT_LE(nrDiscontinuities, 1U);
}

// Sum the signal to mono and compute the root mean square, in float32,
// regardless of the input format.
float rmsf32(AudioDataValue* aSamples, uint32_t aChannels, uint32_t aFrames) {
  float downmixed;
  float rms = 0.;
  uint32_t readIdx = 0;
  for (uint32_t i = 0; i < aFrames; i++) {
    downmixed = 0.;
    for (uint32_t j = 0; j < aChannels; j++) {
      downmixed += AudioSampleToFloat(aSamples[readIdx++]);
    }
    rms += downmixed * downmixed;
  }
  rms = rms / aFrames;
  return sqrt(rms);
}

TEST(TestAudioTrackGraph, AudioProcessingTrackDisabling)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  const CubebUtils::AudioDeviceID deviceId = (CubebUtils::AudioDeviceID)1;

  RefPtr<AudioProcessingTrack> processingTrack;
  RefPtr<ProcessedMediaTrack> outputTrack;
  RefPtr<MediaInputPort> port;
  RefPtr<AudioInputProcessing> listener;
  auto p = Invoke([&] {
    processingTrack = AudioProcessingTrack::Create(graph);
    outputTrack = graph->CreateForwardedInputTrack(MediaSegment::AUDIO);
    outputTrack->QueueSetAutoend(false);
    outputTrack->AddAudioOutput(reinterpret_cast<void*>(1));
    port = outputTrack->AllocateInputPort(processingTrack);
    /* Primary graph: Open Audio Input through SourceMediaTrack */
    listener = new AudioInputProcessing(2);
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<SetPassThrough>(processingTrack, listener, true));
    processingTrack->SetInputProcessing(listener);
    processingTrack->ConnectDeviceInput(deviceId, listener,
                                        PRINCIPAL_HANDLE_NONE);
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<StartInputProcessing>(processingTrack, listener));
    return graph->NotifyWhenDeviceStarted(processingTrack);
  });

  RefPtr<SmartMockCubebStream> stream = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream->mHasInput);
  Unused << WaitFor(p);

  stream->SetOutputRecordingEnabled(true);

  // Wait for a second worth of audio data.
  uint32_t totalFrames = 0;
  WaitUntil(stream->FramesProcessedEvent(), [&](uint32_t aFrames) {
    totalFrames += aFrames;
    return totalFrames > static_cast<uint32_t>(graph->GraphRate());
  });

  const uint32_t ITERATION_COUNT = 5;
  uint32_t iterations = ITERATION_COUNT;
  DisabledTrackMode currentMode = DisabledTrackMode::SILENCE_BLACK;
  while (iterations--) {
    // toggle the track enabled mode, wait a second, do this ITERATION_COUNT
    // times
    DispatchFunction([&] {
      processingTrack->SetDisabledTrackMode(currentMode);
      if (currentMode == DisabledTrackMode::SILENCE_BLACK) {
        currentMode = DisabledTrackMode::ENABLED;
      } else {
        currentMode = DisabledTrackMode::SILENCE_BLACK;
      }
    });

    totalFrames = 0;
    WaitUntil(stream->FramesProcessedEvent(), [&](uint32_t aFrames) {
      totalFrames += aFrames;
      return totalFrames > static_cast<uint32_t>(graph->GraphRate());
    });
  }

  // Clean up.
  DispatchFunction([&] {
    outputTrack->RemoveAudioOutput((void*)1);
    outputTrack->Destroy();
    port->Destroy();
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<StopInputProcessing>(processingTrack, listener));
    processingTrack->DisconnectDeviceInput();
    processingTrack->Destroy();
  });

  uint64_t preSilenceSamples;
  uint32_t estimatedFreq;
  uint32_t nrDiscontinuities;
  Tie(preSilenceSamples, estimatedFreq, nrDiscontinuities) =
      WaitFor(stream->OutputVerificationEvent());

  auto data = stream->TakeRecordedOutput();

  // check that there is non-silence and silence at the expected time in the
  // stereo recording, while allowing for a bit of scheduling uncertainty, by
  // checking half a second after the theoretical muting/unmuting.
  // non-silence starts around: 0s, 2s, 4s
  // silence start around: 1s, 3s, 5s
  // To detect silence or non-silence, we compute the RMS of the signal for
  // 100ms.
  float noisyTime_s[] = {0.5, 2.5, 4.5};
  float silenceTime_s[] = {1.5, 3.5, 5.5};

  uint32_t rate = graph->GraphRate();
  for (float& time : noisyTime_s) {
    uint32_t startIdx = time * rate * 2 /* stereo */;
    EXPECT_NE(rmsf32(&(data[startIdx]), 2, rate / 10), 0.0);
  }

  for (float& time : silenceTime_s) {
    uint32_t startIdx = time * rate * 2 /* stereo */;
    EXPECT_EQ(rmsf32(&(data[startIdx]), 2, rate / 10), 0.0);
  }
}

TEST(TestAudioTrackGraph, SetRequestedInputChannelCount)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  // Open a 2-channel native input stream.
  const CubebUtils::AudioDeviceID device1 = (CubebUtils::AudioDeviceID)1;
  RefPtr<AudioProcessingTrack> track1 = AudioProcessingTrack::Create(graph);
  RefPtr<AudioInputProcessing> listener1 = new AudioInputProcessing(2);
  track1->SetInputProcessing(listener1);
  track1->GraphImpl()->AppendMessage(
      MakeUnique<SetPassThrough>(track1, listener1, true));
  track1->GraphImpl()->AppendMessage(
      MakeUnique<StartInputProcessing>(track1, listener1));
  track1->ConnectDeviceInput(device1, listener1, PRINCIPAL_HANDLE_NONE);
  EXPECT_EQ(track1->DeviceId().value(), device1);

  auto started = Invoke([&] { return graph->NotifyWhenDeviceStarted(track1); });

  RefPtr<SmartMockCubebStream> stream1 = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream1->mHasInput);
  EXPECT_TRUE(stream1->mHasOutput);
  EXPECT_EQ(stream1->InputChannels(), 2U);
  EXPECT_EQ(stream1->GetInputDeviceID(), device1);
  Unused << WaitFor(started);

  // Open a 1-channel non-native input stream.
  const CubebUtils::AudioDeviceID device2 = (CubebUtils::AudioDeviceID)2;
  RefPtr<AudioProcessingTrack> track2 = AudioProcessingTrack::Create(graph);
  RefPtr<AudioInputProcessing> listener2 = new AudioInputProcessing(1);
  track2->SetInputProcessing(listener2);
  track2->GraphImpl()->AppendMessage(
      MakeUnique<SetPassThrough>(track2, listener2, true));
  track2->GraphImpl()->AppendMessage(
      MakeUnique<StartInputProcessing>(track2, listener2));
  track2->ConnectDeviceInput(device2, listener2, PRINCIPAL_HANDLE_NONE);
  EXPECT_EQ(track2->DeviceId().value(), device2);

  RefPtr<SmartMockCubebStream> stream2 = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream2->mHasInput);
  EXPECT_FALSE(stream2->mHasOutput);
  EXPECT_EQ(stream2->InputChannels(), 1U);
  EXPECT_EQ(stream2->GetInputDeviceID(), device2);

  // Request a new input channel count. This should re-create new input stream
  // accordingly.
  auto setNewChannelCount = [&](const RefPtr<AudioProcessingTrack> aTrack,
                                const RefPtr<AudioInputProcessing>& aListener,
                                RefPtr<SmartMockCubebStream>& aStream,
                                uint32_t aChannelCount) {
    bool destroyed = false;
    MediaEventListener destroyListener = cubeb->StreamDestroyEvent().Connect(
        AbstractThread::GetCurrent(),
        [&](const RefPtr<SmartMockCubebStream>& aDestroyed) {
          destroyed = aDestroyed.get() == aStream.get();
        });

    RefPtr<SmartMockCubebStream> newStream;
    MediaEventListener restartListener = cubeb->StreamInitEvent().Connect(
        AbstractThread::GetCurrent(),
        [&](const RefPtr<SmartMockCubebStream>& aCreated) {
          newStream = aCreated;
        });

    DispatchFunction([&] {
      aTrack->GraphImpl()->AppendMessage(
          MakeUnique<SetRequestedInputChannelCount>(aTrack, *aTrack->DeviceId(),
                                                    aListener, aChannelCount));
    });

    SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
        "TEST(TestAudioTrackGraph, SetRequestedInputChannelCount)"_ns,
        [&] { return destroyed && newStream; });

    destroyListener.Disconnect();
    restartListener.Disconnect();

    aStream = newStream;
  };

  // Set the native input stream's input channel count to 1.
  setNewChannelCount(track1, listener1, stream1, 1);
  EXPECT_TRUE(stream1->mHasInput);
  EXPECT_TRUE(stream1->mHasOutput);
  EXPECT_EQ(stream1->InputChannels(), 1U);
  EXPECT_EQ(stream1->GetInputDeviceID(), device1);

  // Set the non-native input stream's input channel count to 2.
  setNewChannelCount(track2, listener2, stream2, 2);
  EXPECT_TRUE(stream2->mHasInput);
  EXPECT_FALSE(stream2->mHasOutput);
  EXPECT_EQ(stream2->InputChannels(), 2U);
  EXPECT_EQ(stream2->GetInputDeviceID(), device2);

  // Close the non-native input stream.
  DispatchFunction([&] {
    track2->GraphImpl()->AppendMessage(
        MakeUnique<StopInputProcessing>(track2, listener2));
    track2->DisconnectDeviceInput();
    track2->Destroy();
  });
  RefPtr<SmartMockCubebStream> destroyed = WaitFor(cubeb->StreamDestroyEvent());
  EXPECT_EQ(destroyed.get(), stream2.get());

  // Close the native input stream.
  DispatchFunction([&] {
    track1->GraphImpl()->AppendMessage(
        MakeUnique<StopInputProcessing>(track1, listener1));
    track1->DisconnectDeviceInput();
    track1->Destroy();
  });
  destroyed = WaitFor(cubeb->StreamDestroyEvent());
  EXPECT_EQ(destroyed.get(), stream1.get());
}

// The native audio stream (a.k.a. GraphDriver) and the non-native audio stream
// should always be the same as the max requested input channel of its paired
// AudioProcessingTracks. This test checks if the audio stream paired with the
// AudioProcessingTrack will follow the max requested input channel or not.
//
// This test is pretty similar to RestartAudioIfMaxChannelCountChanged above,
// which makes sure the related DeviceInputTrack operations for the test here
// works correctly. Instead of using a test-only AudioDataListener, we use
// AudioInputProcessing here to simulate the real world use case.
TEST(TestAudioTrackGraph, RestartAudioIfProcessingMaxChannelCountChanged)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());
  auto unforcer = WaitFor(cubeb->ForceAudioThread()).unwrap();
  Unused << unforcer;

  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  // Request a new input channel count and expect to have a new stream.
  auto setNewChannelCount = [&](const RefPtr<AudioProcessingTrack>& aTrack,
                                const RefPtr<AudioInputProcessing>& aListener,
                                RefPtr<SmartMockCubebStream>& aStream,
                                uint32_t aChannelCount) {
    ASSERT_TRUE(!!aTrack);
    ASSERT_TRUE(!!aListener);
    ASSERT_TRUE(!!aStream);
    ASSERT_TRUE(aStream->mHasInput);
    ASSERT_NE(aChannelCount, 0U);

    const CubebUtils::AudioDeviceID device = *aTrack->DeviceId();

    bool destroyed = false;
    MediaEventListener destroyListener = cubeb->StreamDestroyEvent().Connect(
        AbstractThread::GetCurrent(),
        [&](const RefPtr<SmartMockCubebStream>& aDestroyed) {
          destroyed = aDestroyed.get() == aStream.get();
        });

    RefPtr<SmartMockCubebStream> newStream;
    MediaEventListener restartListener = cubeb->StreamInitEvent().Connect(
        AbstractThread::GetCurrent(),
        [&](const RefPtr<SmartMockCubebStream>& aCreated) {
          newStream = aCreated;
        });

    DispatchFunction([&] {
      aTrack->GraphImpl()->AppendMessage(
          MakeUnique<SetRequestedInputChannelCount>(aTrack, device, aListener,
                                                    aChannelCount));
    });

    SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
        "TEST(TestAudioTrackGraph, RestartAudioIfProcessingMaxChannelCountChanged) #1"_ns,
        [&] { return destroyed && newStream; });

    destroyListener.Disconnect();
    restartListener.Disconnect();

    aStream = newStream;
  };

  // Open a new track and expect to have a new stream.
  auto openTrack = [&](RefPtr<SmartMockCubebStream>& aCurrentStream,
                       RefPtr<AudioProcessingTrack>& aTrack,
                       RefPtr<AudioInputProcessing>& aListener,
                       CubebUtils::AudioDeviceID aDevice,
                       uint32_t aChannelCount) {
    ASSERT_TRUE(!!aCurrentStream);
    ASSERT_TRUE(aCurrentStream->mHasInput);
    ASSERT_TRUE(aChannelCount > aCurrentStream->InputChannels());
    ASSERT_TRUE(!aTrack);
    ASSERT_TRUE(!aListener);

    bool destroyed = false;
    MediaEventListener destroyListener = cubeb->StreamDestroyEvent().Connect(
        AbstractThread::GetCurrent(),
        [&](const RefPtr<SmartMockCubebStream>& aDestroyed) {
          destroyed = aDestroyed.get() == aCurrentStream.get();
        });

    RefPtr<SmartMockCubebStream> newStream;
    MediaEventListener restartListener = cubeb->StreamInitEvent().Connect(
        AbstractThread::GetCurrent(),
        [&](const RefPtr<SmartMockCubebStream>& aCreated) {
          newStream = aCreated;
        });

    aTrack = AudioProcessingTrack::Create(graph);
    aListener = new AudioInputProcessing(aChannelCount);
    aTrack->SetInputProcessing(aListener);
    aTrack->GraphImpl()->AppendMessage(
        MakeUnique<SetPassThrough>(aTrack, aListener, true));
    aTrack->GraphImpl()->AppendMessage(
        MakeUnique<StartInputProcessing>(aTrack, aListener));

    DispatchFunction([&] {
      aTrack->ConnectDeviceInput(aDevice, aListener, PRINCIPAL_HANDLE_NONE);
    });

    SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
        "TEST(TestAudioTrackGraph, RestartAudioIfProcessingMaxChannelCountChanged) #2"_ns,
        [&] { return destroyed && newStream; });

    destroyListener.Disconnect();
    restartListener.Disconnect();

    aCurrentStream = newStream;
  };

  // Test for the native input device first then non-native device. The
  // non-native device will be destroyed before the native device in case of
  // causing a native-device-switching.

  // Test for the native device.
  const CubebUtils::AudioDeviceID nativeDevice = (CubebUtils::AudioDeviceID)1;
  RefPtr<AudioProcessingTrack> track1;
  RefPtr<AudioInputProcessing> listener1;
  RefPtr<SmartMockCubebStream> nativeStream;
  RefPtr<AudioProcessingTrack> track2;
  RefPtr<AudioInputProcessing> listener2;
  {
    // Open a 1-channel AudioProcessingTrack for the native device.
    track1 = AudioProcessingTrack::Create(graph);
    listener1 = new AudioInputProcessing(1);
    track1->SetInputProcessing(listener1);
    track1->GraphImpl()->AppendMessage(
        MakeUnique<SetPassThrough>(track1, listener1, true));
    track1->GraphImpl()->AppendMessage(
        MakeUnique<StartInputProcessing>(track1, listener1));
    track1->ConnectDeviceInput(nativeDevice, listener1, PRINCIPAL_HANDLE_NONE);
    EXPECT_EQ(track1->DeviceId().value(), nativeDevice);

    auto started =
        Invoke([&] { return graph->NotifyWhenDeviceStarted(track1); });

    nativeStream = WaitFor(cubeb->StreamInitEvent());
    EXPECT_TRUE(nativeStream->mHasInput);
    EXPECT_TRUE(nativeStream->mHasOutput);
    EXPECT_EQ(nativeStream->InputChannels(), 1U);
    EXPECT_EQ(nativeStream->GetInputDeviceID(), nativeDevice);
    Unused << WaitFor(started);

    // Open a 2-channel AudioProcessingTrack for the native device and wait for
    // a new driver since the max-channel for the native device becomes 2 now.
    openTrack(nativeStream, track2, listener2, nativeDevice, 2);
    EXPECT_EQ(nativeStream->InputChannels(), 2U);

    // Set the second AudioProcessingTrack for the native device to 1-channel
    // and wait for a new driver since the max-channel for the native device
    // becomes 1 now.
    setNewChannelCount(track2, listener2, nativeStream, 1);
    EXPECT_EQ(nativeStream->InputChannels(), 1U);

    // Set the first AudioProcessingTrack for the native device to 2-channel and
    // wait for a new driver since the max input channel for the native device
    // becomes 2 now.
    setNewChannelCount(track1, listener1, nativeStream, 2);
    EXPECT_EQ(nativeStream->InputChannels(), 2U);
  }

  // Test for the non-native device.
  {
    const CubebUtils::AudioDeviceID nonNativeDevice =
        (CubebUtils::AudioDeviceID)2;

    // Open a 1-channel AudioProcessingTrack for the non-native device.
    RefPtr<AudioProcessingTrack> track3 = AudioProcessingTrack::Create(graph);
    RefPtr<AudioInputProcessing> listener3 = new AudioInputProcessing(1);
    track3->SetInputProcessing(listener3);
    track3->GraphImpl()->AppendMessage(
        MakeUnique<SetPassThrough>(track3, listener3, true));
    track3->GraphImpl()->AppendMessage(
        MakeUnique<StartInputProcessing>(track3, listener3));
    track3->ConnectDeviceInput(nonNativeDevice, listener3,
                               PRINCIPAL_HANDLE_NONE);
    EXPECT_EQ(track3->DeviceId().value(), nonNativeDevice);

    RefPtr<SmartMockCubebStream> nonNativeStream =
        WaitFor(cubeb->StreamInitEvent());
    EXPECT_TRUE(nonNativeStream->mHasInput);
    EXPECT_FALSE(nonNativeStream->mHasOutput);
    EXPECT_EQ(nonNativeStream->InputChannels(), 1U);
    EXPECT_EQ(nonNativeStream->GetInputDeviceID(), nonNativeDevice);

    // Open a 2-channel AudioProcessingTrack for the non-native device and wait
    // for a new stream since the max-channel for the non-native device becomes
    // 2 now.
    RefPtr<AudioProcessingTrack> track4;
    RefPtr<AudioInputProcessing> listener4;
    openTrack(nonNativeStream, track4, listener4, nonNativeDevice, 2);
    EXPECT_EQ(nonNativeStream->InputChannels(), 2U);
    EXPECT_EQ(nonNativeStream->GetInputDeviceID(), nonNativeDevice);

    // Set the second AudioProcessingTrack for the non-native to 1-channel and
    // wait for a new driver since the max-channel for the non-native device
    // becomes 1 now.
    setNewChannelCount(track4, listener4, nonNativeStream, 1);
    EXPECT_EQ(nonNativeStream->InputChannels(), 1U);
    EXPECT_EQ(nonNativeStream->GetInputDeviceID(), nonNativeDevice);

    // Set the first AudioProcessingTrack for the non-native device to 2-channel
    // and wait for a new driver since the max input channel for the non-native
    // device becomes 2 now.
    setNewChannelCount(track3, listener3, nonNativeStream, 2);
    EXPECT_EQ(nonNativeStream->InputChannels(), 2U);
    EXPECT_EQ(nonNativeStream->GetInputDeviceID(), nonNativeDevice);

    // Close the second AudioProcessingTrack (1-channel) for the non-native
    // device then the first one (2-channel) so we won't result in another
    // stream creation.
    DispatchFunction([&] {
      track4->GraphImpl()->AppendMessage(
          MakeUnique<StopInputProcessing>(track4, listener4));
      track4->DisconnectDeviceInput();
      track4->Destroy();
    });
    DispatchFunction([&] {
      track3->GraphImpl()->AppendMessage(
          MakeUnique<StopInputProcessing>(track3, listener3));
      track3->DisconnectDeviceInput();
      track3->Destroy();
    });
    RefPtr<SmartMockCubebStream> destroyedStream =
        WaitFor(cubeb->StreamDestroyEvent());
    EXPECT_EQ(destroyedStream.get(), nonNativeStream.get());
  }

  // Tear down for the native device.
  {
    // Close the second AudioProcessingTrack (1-channel) for the native device
    // then the first one (2-channel) so we won't have driver switching.
    DispatchFunction([&] {
      track2->GraphImpl()->AppendMessage(
          MakeUnique<StopInputProcessing>(track2, listener2));
      track2->DisconnectDeviceInput();
      track2->Destroy();
    });
    DispatchFunction([&] {
      track1->GraphImpl()->AppendMessage(
          MakeUnique<StopInputProcessing>(track1, listener1));
      track1->DisconnectDeviceInput();
      track1->Destroy();
    });
    RefPtr<SmartMockCubebStream> destroyedStream =
        WaitFor(cubeb->StreamDestroyEvent());
    EXPECT_EQ(destroyedStream.get(), nativeStream.get());
  }
}

TEST(TestAudioTrackGraph, SetInputChannelCountBeforeAudioCallbackDriver)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  // Set the input channel count of AudioInputProcessing, which will force
  // MediaTrackGraph to re-evaluate input device, when the MediaTrackGraph is
  // driven by the SystemClockDriver.

  const CubebUtils::AudioDeviceID deviceId = (CubebUtils::AudioDeviceID)1;
  RefPtr<AudioProcessingTrack> track;
  RefPtr<AudioInputProcessing> listener;
  {
    MozPromiseHolder<GenericPromise> h;
    RefPtr<GenericPromise> p = h.Ensure(__func__);

    struct GuardMessage : public ControlMessage {
      MozPromiseHolder<GenericPromise> mHolder;

      GuardMessage(MediaTrack* aTrack,
                   MozPromiseHolder<GenericPromise>&& aHolder)
          : ControlMessage(aTrack), mHolder(std::move(aHolder)) {}
      void Run() override {
        mTrack->GraphImpl()->Dispatch(NS_NewRunnableFunction(
            "TestAudioTrackGraph::SetInputChannel::Message::Resolver",
            [holder = std::move(mHolder)]() mutable {
              holder.Resolve(true, __func__);
            }));
      }
    };

    DispatchFunction([&] {
      track = AudioProcessingTrack::Create(graph);
      listener = new AudioInputProcessing(2);
      track->GraphImpl()->AppendMessage(
          MakeUnique<SetPassThrough>(track, listener, true));
      track->SetInputProcessing(listener);
      track->GraphImpl()->AppendMessage(
          MakeUnique<SetRequestedInputChannelCount>(track, deviceId, listener,
                                                    1));
      track->GraphImpl()->AppendMessage(
          MakeUnique<GuardMessage>(track, std::move(h)));
    });

    Unused << WaitFor(p);
  }

  // Open a full-duplex AudioCallbackDriver.

  RefPtr<MediaInputPort> port;
  DispatchFunction([&] {
    track->GraphImpl()->AppendMessage(
        MakeUnique<StartInputProcessing>(track, listener));
    track->ConnectDeviceInput(deviceId, listener, PRINCIPAL_HANDLE_NONE);
  });

  // MediaTrackGraph will create a output-only AudioCallbackDriver in
  // CheckDriver before we open an audio input above, since AudioProcessingTrack
  // is a audio-type MediaTrack, so we need to wait here until the duplex
  // AudioCallbackDriver is created.
  RefPtr<SmartMockCubebStream> stream;
  SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
      "TEST(TestAudioTrackGraph, SetInputChannelCountBeforeAudioCallbackDriver)"_ns,
      [&] {
        stream = WaitFor(cubeb->StreamInitEvent());
        EXPECT_TRUE(stream->mHasOutput);
        return stream->mHasInput;
      });
  EXPECT_EQ(stream->InputChannels(), 1U);

  Unused << WaitFor(
      Invoke([&] { return graph->NotifyWhenDeviceStarted(track); }));

  // Clean up.
  DispatchFunction([&] {
    track->GraphImpl()->AppendMessage(
        MakeUnique<StopInputProcessing>(track, listener));
    track->DisconnectDeviceInput();
    track->Destroy();
  });
  Unused << WaitFor(cubeb->StreamDestroyEvent());
}

TEST(TestAudioTrackGraph, StartAudioDeviceBeforeStartingAudioProcessing)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  // Create a duplex AudioCallbackDriver
  const CubebUtils::AudioDeviceID deviceId = (CubebUtils::AudioDeviceID)1;
  RefPtr<AudioProcessingTrack> track;
  RefPtr<AudioInputProcessing> listener;
  auto started = Invoke([&] {
    track = AudioProcessingTrack::Create(graph);
    listener = new AudioInputProcessing(2);
    track->GraphImpl()->AppendMessage(
        MakeUnique<SetPassThrough>(track, listener, true));
    track->SetInputProcessing(listener);
    // Start audio device without starting audio processing.
    track->ConnectDeviceInput(deviceId, listener, PRINCIPAL_HANDLE_NONE);
    return graph->NotifyWhenDeviceStarted(track);
  });

  RefPtr<SmartMockCubebStream> stream = WaitFor(cubeb->StreamInitEvent());
  Result<bool, nsresult> rv = WaitFor(started);
  EXPECT_TRUE(rv.unwrapOr(false));
  EXPECT_TRUE(stream->mHasInput);
  EXPECT_TRUE(stream->mHasOutput);

  // Wait for a second to make sure audio output callback has been fired.
  DispatchFunction(
      [&] { track->GraphImpl()->AppendMessage(MakeUnique<GoFaster>(cubeb)); });
  {
    uint32_t totalFrames = 0;
    WaitUntil(stream->FramesProcessedEvent(), [&](uint32_t aFrames) {
      totalFrames += aFrames;
      return totalFrames > static_cast<uint32_t>(graph->GraphRate());
    });
  }
  cubeb->DontGoFaster();

  // Start the audio processing.
  DispatchFunction([&] {
    track->GraphImpl()->AppendMessage(
        MakeUnique<StartInputProcessing>(track, listener));
  });

  // Wait for a second to make sure audio output callback has been fired.
  DispatchFunction(
      [&] { track->GraphImpl()->AppendMessage(MakeUnique<GoFaster>(cubeb)); });
  {
    uint32_t totalFrames = 0;
    WaitUntil(stream->FramesProcessedEvent(), [&](uint32_t aFrames) {
      totalFrames += aFrames;
      return totalFrames > static_cast<uint32_t>(graph->GraphRate());
    });
  }
  cubeb->DontGoFaster();

  // Clean up.
  DispatchFunction([&] {
    track->DisconnectDeviceInput();
    track->Destroy();
  });
  Unused << WaitFor(cubeb->StreamDestroyEvent());
}

TEST(TestAudioTrackGraph, StopAudioProcessingBeforeStoppingAudioDevice)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  // Create a duplex AudioCallbackDriver
  const CubebUtils::AudioDeviceID deviceId = (CubebUtils::AudioDeviceID)1;
  RefPtr<AudioProcessingTrack> track;
  RefPtr<AudioInputProcessing> listener;
  auto started = Invoke([&] {
    track = AudioProcessingTrack::Create(graph);
    listener = new AudioInputProcessing(2);
    track->GraphImpl()->AppendMessage(
        MakeUnique<SetPassThrough>(track, listener, true));
    track->SetInputProcessing(listener);
    track->GraphImpl()->AppendMessage(
        MakeUnique<StartInputProcessing>(track, listener));
    track->ConnectDeviceInput(deviceId, listener, PRINCIPAL_HANDLE_NONE);
    return graph->NotifyWhenDeviceStarted(track);
  });

  RefPtr<SmartMockCubebStream> stream = WaitFor(cubeb->StreamInitEvent());
  Result<bool, nsresult> rv = WaitFor(started);
  EXPECT_TRUE(rv.unwrapOr(false));
  EXPECT_TRUE(stream->mHasInput);
  EXPECT_TRUE(stream->mHasOutput);

  // Wait for a second to make sure audio output callback has been fired.
  DispatchFunction(
      [&] { track->GraphImpl()->AppendMessage(MakeUnique<GoFaster>(cubeb)); });
  {
    uint32_t totalFrames = 0;
    WaitUntil(stream->FramesProcessedEvent(), [&](uint32_t aFrames) {
      totalFrames += aFrames;
      return totalFrames > static_cast<uint32_t>(graph->GraphRate());
    });
  }
  cubeb->DontGoFaster();

  // Stop the audio processing
  DispatchFunction([&] {
    track->GraphImpl()->AppendMessage(
        MakeUnique<StopInputProcessing>(track, listener));
  });

  // Wait for a second to make sure audio output callback has been fired.
  DispatchFunction(
      [&] { track->GraphImpl()->AppendMessage(MakeUnique<GoFaster>(cubeb)); });
  {
    uint32_t totalFrames = 0;
    WaitUntil(stream->FramesProcessedEvent(), [&](uint32_t aFrames) {
      totalFrames += aFrames;
      return totalFrames > static_cast<uint32_t>(graph->GraphRate());
    });
  }
  cubeb->DontGoFaster();

  // Clean up.
  DispatchFunction([&] {
    track->DisconnectDeviceInput();
    track->Destroy();
  });
  Unused << WaitFor(cubeb->StreamDestroyEvent());
}

// This test is pretty similar to SwitchNativeInputDevice above, which makes
// sure the related DeviceInputTrack operations for the test here works
// correctly. Instead of using a test-only DeviceInputTrack consumer, we use
// AudioProcessingTrack here to simulate the real world use case.
TEST(TestAudioTrackGraph, SwitchNativeAudioProcessingTrack)
{
  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());

  MediaTrackGraph* graph = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1,
      MediaTrackGraph::REQUEST_DEFAULT_SAMPLE_RATE, nullptr,
      GetMainThreadSerialEventTarget());

  auto switchNativeDevice =
      [&](RefPtr<SmartMockCubebStream>&& aCurrentNativeStream,
          RefPtr<AudioProcessingTrack>& aCurrentNativeTrack,
          RefPtr<AudioInputProcessing>& aCurrentNativeListener,
          RefPtr<SmartMockCubebStream>& aNextNativeStream,
          RefPtr<AudioProcessingTrack>& aNextNativeTrack) {
        ASSERT_TRUE(aCurrentNativeStream->mHasInput);
        ASSERT_TRUE(aCurrentNativeStream->mHasOutput);
        ASSERT_TRUE(aNextNativeStream->mHasInput);
        ASSERT_FALSE(aNextNativeStream->mHasOutput);

        std::cerr << "Switching native input from device "
                  << aCurrentNativeStream->GetInputDeviceID() << " to "
                  << aNextNativeStream->GetInputDeviceID() << std::endl;

        uint32_t destroyed = 0;
        MediaEventListener destroyListener =
            cubeb->StreamDestroyEvent().Connect(
                AbstractThread::GetCurrent(),
                [&](const RefPtr<SmartMockCubebStream>& aDestroyed) {
                  if (aDestroyed.get() == aCurrentNativeStream.get() ||
                      aDestroyed.get() == aNextNativeStream.get()) {
                    std::cerr << "cubeb stream " << aDestroyed.get()
                              << " (device " << aDestroyed->GetInputDeviceID()
                              << ") has been destroyed" << std::endl;
                    destroyed += 1;
                  }
                });

        RefPtr<SmartMockCubebStream> newStream;
        MediaEventListener restartListener = cubeb->StreamInitEvent().Connect(
            AbstractThread::GetCurrent(),
            [&](const RefPtr<SmartMockCubebStream>& aCreated) {
              // Make sure new stream has input, to prevent from getting a
              // temporary output-only AudioCallbackDriver after closing current
              // native device but before setting a new native input.
              if (aCreated->mHasInput) {
                ASSERT_TRUE(aCreated->mHasOutput);
                newStream = aCreated;
              }
            });

        std::cerr << "Close device " << aCurrentNativeStream->GetInputDeviceID()
                  << std::endl;
        DispatchFunction([&] {
          aCurrentNativeTrack->GraphImpl()->AppendMessage(
              MakeUnique<StopInputProcessing>(aCurrentNativeTrack,
                                              aCurrentNativeListener));
          aCurrentNativeTrack->DisconnectDeviceInput();
          aCurrentNativeTrack->Destroy();
        });

        std::cerr << "Wait for the switching" << std::endl;
        SpinEventLoopUntil<ProcessFailureBehavior::IgnoreAndContinue>(
            "TEST(TestAudioTrackGraph, SwitchNativeAudioProcessingTrack)"_ns,
            [&] { return destroyed >= 2 && newStream; });

        destroyListener.Disconnect();
        restartListener.Disconnect();

        aCurrentNativeStream = nullptr;
        aNextNativeStream = newStream;

        std::cerr << "Now the native input is device "
                  << aNextNativeStream->GetInputDeviceID() << std::endl;
      };

  // Open a AudioProcessingTrack for device 1.
  const CubebUtils::AudioDeviceID device1 = (CubebUtils::AudioDeviceID)1;
  RefPtr<AudioProcessingTrack> track1 = AudioProcessingTrack::Create(graph);
  RefPtr<AudioInputProcessing> listener1 = new AudioInputProcessing(1);
  track1->SetInputProcessing(listener1);
  track1->GraphImpl()->AppendMessage(
      MakeUnique<SetPassThrough>(track1, listener1, true));
  track1->GraphImpl()->AppendMessage(
      MakeUnique<StartInputProcessing>(track1, listener1));
  track1->ConnectDeviceInput(device1, listener1, PRINCIPAL_HANDLE_NONE);
  EXPECT_EQ(track1->DeviceId().value(), device1);

  auto started = Invoke([&] { return graph->NotifyWhenDeviceStarted(track1); });

  RefPtr<SmartMockCubebStream> stream1 = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream1->mHasInput);
  EXPECT_TRUE(stream1->mHasOutput);
  EXPECT_EQ(stream1->InputChannels(), 1U);
  EXPECT_EQ(stream1->GetInputDeviceID(), device1);
  Unused << WaitFor(started);
  std::cerr << "Device " << device1 << " is opened (stream " << stream1.get()
            << ")" << std::endl;

  // Open a AudioProcessingTrack for device 2.
  const CubebUtils::AudioDeviceID device2 = (CubebUtils::AudioDeviceID)2;
  RefPtr<AudioProcessingTrack> track2 = AudioProcessingTrack::Create(graph);
  RefPtr<AudioInputProcessing> listener2 = new AudioInputProcessing(2);
  track2->SetInputProcessing(listener2);
  track2->GraphImpl()->AppendMessage(
      MakeUnique<SetPassThrough>(track2, listener2, true));
  track2->GraphImpl()->AppendMessage(
      MakeUnique<StartInputProcessing>(track2, listener2));
  track2->ConnectDeviceInput(device2, listener2, PRINCIPAL_HANDLE_NONE);
  EXPECT_EQ(track2->DeviceId().value(), device2);

  RefPtr<SmartMockCubebStream> stream2 = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream2->mHasInput);
  EXPECT_FALSE(stream2->mHasOutput);
  EXPECT_EQ(stream2->InputChannels(), 2U);
  EXPECT_EQ(stream2->GetInputDeviceID(), device2);
  std::cerr << "Device " << device2 << " is opened (stream " << stream2.get()
            << ")" << std::endl;

  // Open a AudioProcessingTrack for device 3.
  const CubebUtils::AudioDeviceID device3 = (CubebUtils::AudioDeviceID)3;
  RefPtr<AudioProcessingTrack> track3 = AudioProcessingTrack::Create(graph);
  RefPtr<AudioInputProcessing> listener3 = new AudioInputProcessing(1);
  track3->SetInputProcessing(listener3);
  track3->GraphImpl()->AppendMessage(
      MakeUnique<SetPassThrough>(track3, listener3, true));
  track3->GraphImpl()->AppendMessage(
      MakeUnique<StartInputProcessing>(track3, listener3));
  track3->ConnectDeviceInput(device3, listener3, PRINCIPAL_HANDLE_NONE);
  EXPECT_EQ(track3->DeviceId().value(), device3);

  RefPtr<SmartMockCubebStream> stream3 = WaitFor(cubeb->StreamInitEvent());
  EXPECT_TRUE(stream3->mHasInput);
  EXPECT_FALSE(stream3->mHasOutput);
  EXPECT_EQ(stream3->InputChannels(), 1U);
  EXPECT_EQ(stream3->GetInputDeviceID(), device3);
  std::cerr << "Device " << device3 << " is opened (stream " << stream3.get()
            << ")" << std::endl;

  // Close device 1, so the native input device is switched from device 1 to
  // device 2.
  switchNativeDevice(std::move(stream1), track1, listener1, stream2, track2);
  EXPECT_TRUE(stream2->mHasInput);
  EXPECT_TRUE(stream2->mHasOutput);
  EXPECT_EQ(stream2->InputChannels(), 2U);
  EXPECT_EQ(stream2->GetInputDeviceID(), device2);
  {
    NativeInputTrack* native =
        track2->GraphImpl()->GetNativeInputTrackMainThread();
    ASSERT_TRUE(!!native);
    EXPECT_EQ(native->mDeviceId, device2);
  }

  // Close device 2, so the native input device is switched from device 2 to
  // device 3.
  switchNativeDevice(std::move(stream2), track2, listener2, stream3, track3);
  EXPECT_TRUE(stream3->mHasInput);
  EXPECT_TRUE(stream3->mHasOutput);
  EXPECT_EQ(stream3->InputChannels(), 1U);
  EXPECT_EQ(stream3->GetInputDeviceID(), device3);
  {
    NativeInputTrack* native =
        track3->GraphImpl()->GetNativeInputTrackMainThread();
    ASSERT_TRUE(!!native);
    EXPECT_EQ(native->mDeviceId, device3);
  }

  // Clean up.
  std::cerr << "Close device " << device3 << std::endl;
  DispatchFunction([&] {
    track3->GraphImpl()->AppendMessage(
        MakeUnique<StopInputProcessing>(track3, listener3));
    track3->DisconnectDeviceInput();
    track3->Destroy();
  });
  RefPtr<SmartMockCubebStream> destroyedStream =
      WaitFor(cubeb->StreamDestroyEvent());
  EXPECT_EQ(destroyedStream.get(), stream3.get());
  {
    auto* graphImpl = static_cast<MediaTrackGraphImpl*>(graph);
    NativeInputTrack* native = graphImpl->GetNativeInputTrackMainThread();
    ASSERT_TRUE(!native);
  }
  std::cerr << "No native input now" << std::endl;
}

void TestCrossGraphPort(uint32_t aInputRate, uint32_t aOutputRate,
                        float aDriftFactor, uint32_t aBufferMs = 50) {
  std::cerr << "TestCrossGraphPort input: " << aInputRate
            << ", output: " << aOutputRate << ", driftFactor: " << aDriftFactor
            << std::endl;

  MockCubeb* cubeb = new MockCubeb();
  CubebUtils::ForceSetCubebContext(cubeb->AsCubebContext());
  auto unforcer = WaitFor(cubeb->ForceAudioThread()).unwrap();
  Unused << unforcer;

  cubeb->SetStreamStartFreezeEnabled(true);

  /* Primary graph: Create the graph. */
  MediaTrackGraph* primary = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER,
      /*Window ID*/ 1, aInputRate, nullptr, GetMainThreadSerialEventTarget());

  /* Partner graph: Create the graph. */
  MediaTrackGraph* partner = MediaTrackGraphImpl::GetInstance(
      MediaTrackGraph::SYSTEM_THREAD_DRIVER, /*Window ID*/ 1, aOutputRate,
      /*OutputDeviceID*/ reinterpret_cast<cubeb_devid>(1),
      GetMainThreadSerialEventTarget());

  const CubebUtils::AudioDeviceID deviceId = (CubebUtils::AudioDeviceID)1;

  RefPtr<AudioProcessingTrack> processingTrack;
  RefPtr<AudioInputProcessing> listener;
  auto primaryStarted = Invoke([&] {
    /* Primary graph: Create input track and open it */
    processingTrack = AudioProcessingTrack::Create(primary);
    listener = new AudioInputProcessing(2);
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<SetPassThrough>(processingTrack, listener, true));
    processingTrack->SetInputProcessing(listener);
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<StartInputProcessing>(processingTrack, listener));
    processingTrack->ConnectDeviceInput(deviceId, listener,
                                        PRINCIPAL_HANDLE_NONE);
    return primary->NotifyWhenDeviceStarted(processingTrack);
  });

  RefPtr<SmartMockCubebStream> inputStream = WaitFor(cubeb->StreamInitEvent());

  RefPtr<CrossGraphTransmitter> transmitter;
  RefPtr<MediaInputPort> port;
  RefPtr<CrossGraphReceiver> receiver;
  auto partnerStarted = Invoke([&] {
    /* Partner graph: Create CrossGraphReceiver */
    receiver = partner->CreateCrossGraphReceiver(primary->GraphRate());

    /* Primary graph: Create CrossGraphTransmitter */
    transmitter = primary->CreateCrossGraphTransmitter(receiver);

    /* How the input track connects to another ProcessedMediaTrack.
     * Check in MediaManager how it is connected to AudioStreamTrack. */
    port = transmitter->AllocateInputPort(processingTrack);
    receiver->AddAudioOutput((void*)1);
    return partner->NotifyWhenDeviceStarted(receiver);
  });

  RefPtr<SmartMockCubebStream> partnerStream =
      WaitFor(cubeb->StreamInitEvent());
  partnerStream->SetDriftFactor(aDriftFactor);

  cubeb->SetStreamStartFreezeEnabled(false);

  // One source of non-determinism in this type of test is that inputStream
  // and partnerStream are started in sequence by the CubebOperation thread pool
  // (of size 1). To minimize the chance that the stream that starts first sees
  // an iteration before the other has started - this is a source of pre-silence
  // - we freeze both on start and thaw them together here.
  // Note that another source of non-determinism is the fallback driver. Handing
  // over from the fallback to the audio driver requires first an audio callback
  // (deterministic with the fake audio thread), then a fallback driver
  // iteration (non-deterministic, since each graph has its own fallback driver,
  // each with its own dedicated thread, which we have no control over). This
  // non-determinism is worrisome, but both fallback drivers are likely to
  // exhibit similar characteristics, hopefully keeping the level of
  // non-determinism down sufficiently for this test to pass.
  inputStream->Thaw();
  partnerStream->Thaw();

  Unused << WaitFor(primaryStarted);
  Unused << WaitFor(partnerStarted);

  // Wait for 3s worth of audio data on the receiver stream.
  DispatchFunction([&] {
    processingTrack->GraphImpl()->AppendMessage(MakeUnique<GoFaster>(cubeb));
  });
  uint32_t totalFrames = 0;
  WaitUntil(partnerStream->FramesVerifiedEvent(), [&](uint32_t aFrames) {
    totalFrames += aFrames;
    return totalFrames > static_cast<uint32_t>(partner->GraphRate() * 3);
  });
  cubeb->DontGoFaster();

  DispatchFunction([&] {
    // Clean up on MainThread
    receiver->RemoveAudioOutput((void*)1);
    receiver->Destroy();
    transmitter->Destroy();
    port->Destroy();
    processingTrack->GraphImpl()->AppendMessage(
        MakeUnique<StopInputProcessing>(processingTrack, listener));
    processingTrack->DisconnectDeviceInput();
    processingTrack->Destroy();
  });

  uint32_t inputFrequency = inputStream->InputFrequency();
  uint32_t partnerRate = partnerStream->InputSampleRate();

  uint64_t preSilenceSamples;
  float estimatedFreq;
  uint32_t nrDiscontinuities;
  Tie(preSilenceSamples, estimatedFreq, nrDiscontinuities) =
      WaitFor(partnerStream->OutputVerificationEvent());

  EXPECT_NEAR(estimatedFreq, inputFrequency / aDriftFactor, 5);
  uint32_t expectedPreSilence =
      static_cast<uint32_t>(partnerRate * aDriftFactor / 1000 * aBufferMs);
  uint32_t margin = partnerRate / 20 /* +/- 50ms */;
  EXPECT_NEAR(preSilenceSamples, expectedPreSilence, margin);
  // The waveform from AudioGenerator starts at 0, but we don't control its
  // ending, so we expect a discontinuity there.
  EXPECT_LE(nrDiscontinuities, 1U);
}

TEST(TestAudioTrackGraph, CrossGraphPort)
{
  TestCrossGraphPort(44100, 44100, 1);
  TestCrossGraphPort(44100, 44100, 1.08);
  TestCrossGraphPort(44100, 44100, 0.92);

  TestCrossGraphPort(48000, 44100, 1);
  TestCrossGraphPort(48000, 44100, 1.08);
  TestCrossGraphPort(48000, 44100, 0.92);

  TestCrossGraphPort(44100, 48000, 1);
  TestCrossGraphPort(44100, 48000, 1.08);
  TestCrossGraphPort(44100, 48000, 0.92);

  TestCrossGraphPort(52110, 17781, 1);
  TestCrossGraphPort(52110, 17781, 1.08);
  TestCrossGraphPort(52110, 17781, 0.92);
}

TEST(TestAudioTrackGraph, CrossGraphPortLargeBuffer)
{
  const int32_t oldBuffering = Preferences::GetInt(DRIFT_BUFFERING_PREF);
  const int32_t longBuffering = 5000;
  Preferences::SetInt(DRIFT_BUFFERING_PREF, longBuffering);

  TestCrossGraphPort(44100, 44100, 1.02, longBuffering);
  TestCrossGraphPort(48000, 44100, 1.08, longBuffering);
  TestCrossGraphPort(44100, 48000, 0.95, longBuffering);
  TestCrossGraphPort(52110, 17781, 0.92, longBuffering);

  Preferences::SetInt(DRIFT_BUFFERING_PREF, oldBuffering);
}
#endif  // MOZ_WEBRTC
