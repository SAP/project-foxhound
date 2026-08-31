/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include <memory>

#include "CamerasParent.h"
#include "VideoEngine.h"
#include "api/video/i420_buffer.h"
#include "fake_video_capture/device_info_empty.h"
#include "fake_video_capture/device_info_fake.h"
#include "gmock/gmock.h"
#include "gtest/gtest.h"
#include "mozilla/SyncRunnable.h"
#include "mozilla/gtest/WaitFor.h"
#include "mozilla/ipc/BackgroundParent.h"
#include "video_engine/video_capture_factory.h"

using testing::_;
using testing::AtLeast;
using testing::Eq;
using testing::InSequence;
using testing::Matcher;
using testing::NiceMock;
using testing::Property;
using testing::Return;
using testing::Test;
using webrtc::VideoCaptureModule;
using webrtc::videocapturemodule::DeviceInfoEmpty;
using webrtc::videocapturemodule::DeviceInfoFake;

namespace mozilla::camera {
static void WaitForBackgroundThread() {
  nsCOMPtr<nsISerialEventTarget> backgroundThread =
      ipc::BackgroundParent::GetBackgroundThread();
  MOZ_ALWAYS_SUCCEEDS(SyncRunnable::DispatchToThread(
      backgroundThread,
      NS_NewRunnableFunction("TestAggregateCapturer::TearDown", [] {})));
}

class MockCamerasParent : public CamerasParent {
 public:
  static already_AddRefed<MockCamerasParent> Create() {
    nsCOMPtr<nsISerialEventTarget> backgroundThread =
        ipc::BackgroundParent::GetBackgroundThread();

    RefPtr<MockCamerasParent> parent;
    MOZ_ALWAYS_SUCCEEDS(SyncRunnable::DispatchToThread(
        backgroundThread,
        NS_NewRunnableFunction("TestAggregateCapturer::SetUp",
                               [&] { parent = new MockCamerasParent(); })));
    return parent.forget();
  }

  MOCK_METHOD(int, DeliverFrameOverIPC,
              (CaptureEngine, int, const Span<const int>&, const TrackingId&,
               (Variant<ShmemBuffer, webrtc::VideoFrame>&&),
               const VideoFrameProperties&),
              (override));
};

class MockVideoCapturer : public webrtc::VideoCaptureModule {
 public:
  MOCK_METHOD(void, RegisterCaptureDataCallback,
              (webrtc::VideoSinkInterface<webrtc::VideoFrame>*), (override));
  MOCK_METHOD(void, RegisterCaptureDataCallback,
              (webrtc::RawVideoSinkInterface*), (override));
  MOCK_METHOD(void, DeRegisterCaptureDataCallback, (), (override));
  MOCK_METHOD(int32_t, StartCapture, (const webrtc::VideoCaptureCapability&),
              (override));
  MOCK_METHOD(int32_t, StopCapture, (), (override));
  MOCK_METHOD(const char*, CurrentDeviceName, (), (const, override));
  MOCK_METHOD(bool, CaptureStarted, (), (override));
  MOCK_METHOD(int32_t, CaptureSettings, (webrtc::VideoCaptureCapability&),
              (override));
  MOCK_METHOD(int32_t, SetCaptureRotation, (webrtc::VideoRotation), (override));
  MOCK_METHOD(bool, SetApplyRotation, (bool), (override));
  MOCK_METHOD(bool, GetApplyRotation, (), (override));

  MockVideoCapturer() {
    ON_CALL(*this,
            RegisterCaptureDataCallback(
                Matcher<webrtc::VideoSinkInterface<webrtc::VideoFrame>*>(_)))
        .WillByDefault(Return());
    ON_CALL(*this, DeRegisterCaptureDataCallback).WillByDefault(Return());
    ON_CALL(*this, StartCapture).WillByDefault(Return(0));
    ON_CALL(*this, StopCapture).WillByDefault(Return(0));
  }
};

template <typename DeviceInfoType>
class MockVideoCaptureFactory : public VideoCaptureFactory {
 public:
  MOCK_METHOD(std::shared_ptr<VideoCaptureModule::DeviceInfo>, CreateDeviceInfo,
              (CaptureDeviceType), (override));
  MOCK_METHOD(VideoCaptureFactory::CreateVideoCaptureResult, CreateVideoCapture,
              (int32_t, const char*, CaptureDeviceType), (override));

  MockVideoCaptureFactory() : mDeviceInfo(std::make_shared<DeviceInfoType>()) {
    ON_CALL(*this, CreateDeviceInfo)
        .WillByDefault([&](CaptureDeviceType aType)
                           -> std::shared_ptr<VideoCaptureModule::DeviceInfo> {
          MOZ_RELEASE_ASSERT(aType == CaptureDeviceType::Camera);
          return mDeviceInfo;
        });
    ON_CALL(*this, CreateVideoCapture)
        .WillByDefault(
            [&](int32_t aCaptureId, const char* aUniqueId,
                CaptureDeviceType aType) -> CreateVideoCaptureResult {
              MOZ_RELEASE_ASSERT(aType == CaptureDeviceType::Camera);
              auto capturer =
                  webrtc::make_ref_counted<NiceMock<MockVideoCapturer>>();
              mCapturers[aCaptureId] = capturer;
              return {.mCapturer = capturer};
            });
  }

  const std::shared_ptr<VideoCaptureModule::DeviceInfo> mDeviceInfo;
  std::map<int32_t, webrtc::scoped_refptr<MockVideoCapturer>> mCapturers;
};

template <typename DeviceInfoType>
struct TestAggregateCapturerWithDeviceInfo : public Test {
  static constexpr uint64_t kWindowId = 1;
  const CaptureEngine mCapEngine = CameraEngine;
  const CaptureDeviceType mDeviceType = ([&] {
    switch (mCapEngine) {
      case InvalidEngine:
      case MaxEngine:
      case CameraEngine:
        return CaptureDeviceType::Camera;
      case ScreenEngine:
        return CaptureDeviceType::Screen;
      case WinEngine:
        return CaptureDeviceType::Window;
      case BrowserEngine:
        return CaptureDeviceType::Browser;
    }
    return CaptureDeviceType::Camera;
  })();
  RefPtr<MockVideoCaptureFactory<DeviceInfoType>> mFactory =
      MakeRefPtr<NiceMock<MockVideoCaptureFactory<DeviceInfoType>>>();
  RefPtr<VideoEngine> mEngine = VideoEngine::Create(mDeviceType, mFactory);
  RefPtr<MockCamerasParent> mParent;
  std::unique_ptr<AggregateCapturer> mAggregator;

  void SetUp() override {
    nsTArray<webrtc::VideoCaptureCapability> capabilities;

    mParent = MockCamerasParent::Create();

    constexpr size_t capacity = 32;
    char deviceName[capacity], uniqueId[capacity];
    auto info = mEngine->GetOrCreateVideoCaptureDeviceInfo();
    info->GetDeviceName(0, deviceName, capacity, uniqueId, capacity);

    for (int i = 0; i < info->NumberOfCapabilities(uniqueId); ++i) {
      webrtc::VideoCaptureCapability cap;
      if (info->GetCapability(uniqueId, i, cap) == 0) {
        capabilities.AppendElement(std::move(cap));
      }
    }

    mAggregator =
        AggregateCapturer::Create(GetCurrentSerialEventTarget(), mCapEngine,
                                  mEngine, nsCString(uniqueId, capacity),
                                  kWindowId, std::move(capabilities), mParent);
  }

  void TearDown() override {
    mAggregator->RemoveStreamsFor(mParent);
    mAggregator = nullptr;
    mParent = nullptr;
    mEngine = nullptr;
    mFactory = nullptr;
    // Resetting mParent bounces the delete to the background thread. Do it here
    // too, to stay in sync.
    WaitForBackgroundThread();
    // Process video capture thread messages from the CamerasParent dtor.
    NS_ProcessPendingEvents(nullptr);
  }
};

using TestAggregateCapturer =
    TestAggregateCapturerWithDeviceInfo<DeviceInfoFake>;
using TestAggregateCapturerNoCapabilities =
    TestAggregateCapturerWithDeviceInfo<DeviceInfoEmpty>;

TEST_F(TestAggregateCapturer, EmptyLifeCycle) {
  // Checks that lifecycle is OK with simple Create()/RemoveStreamsFor().
}

TEST_F(TestAggregateCapturer, TwoStreamsLifeCycle) {
  // Checks that lifecycle is OK with simple
  // Create()+AddStream()/RemoveStreamsFor().
  mAggregator->AddStream(mParent, mEngine->GenerateId(), kWindowId);
}

TEST_F(TestAggregateCapturer, StartStream) {
  const dom::VideoResizeModeEnum resizeMode = dom::VideoResizeModeEnum::None;
  const NormalizedConstraints constraints;
  webrtc::VideoCaptureCapability cap;
  mFactory->mDeviceInfo->GetCapability(DeviceInfoFake::kId, 0, cap);

  auto capturer = mFactory->mCapturers[mAggregator->mCaptureId];
  EXPECT_CALL(*capturer, StartCapture(Eq(cap))).WillOnce(Return(0));

  mAggregator->StartStream(mAggregator->mCaptureId, cap, constraints,
                           resizeMode);
}

TEST_F(TestAggregateCapturer, StartStreamCombined) {
  const dom::VideoResizeModeEnum resizeMode = dom::VideoResizeModeEnum::None;
  const NormalizedConstraints constraints;
  webrtc::VideoCaptureCapability cap1;
  mFactory->mDeviceInfo->GetCapability(DeviceInfoFake::kId, 0, cap1);
  webrtc::VideoCaptureCapability cap2;
  mFactory->mDeviceInfo->GetCapability(DeviceInfoFake::kId, 1, cap2);

  {
    InSequence seq;
    auto capturer = mFactory->mCapturers[mAggregator->mCaptureId];
    EXPECT_CALL(*capturer, StartCapture(Eq(cap1))).WillOnce(Return(0));
    EXPECT_CALL(*capturer, StartCapture(Eq(cap2))).WillOnce(Return(0));
    EXPECT_CALL(*capturer, StartCapture(Eq(cap1))).WillOnce(Return(0));
  }

  auto otherStreamId = mEngine->GenerateId();
  mAggregator->AddStream(mParent, otherStreamId, kWindowId);
  mAggregator->StartStream(mAggregator->mCaptureId, cap1, constraints,
                           resizeMode);
  mAggregator->StartStream(otherStreamId, cap2, constraints, resizeMode);
  mAggregator->StopStream(otherStreamId);
}

TEST_F(TestAggregateCapturer, CombinedCapabilityBadType) {
  const dom::VideoResizeModeEnum resizeMode = dom::VideoResizeModeEnum::None;
  const NormalizedConstraints constraints;
  webrtc::VideoCaptureCapability cap;
  cap.width = 99999;
  cap.height = 99999;
  cap.maxFPS = 99999;
  cap.videoType = webrtc::VideoType(99999);

  auto capturer = mFactory->mCapturers[mAggregator->mCaptureId];
  webrtc::VideoCaptureCapability expectedCap;
  mFactory->mDeviceInfo->GetCapability(DeviceInfoFake::kId, 1, expectedCap);
  EXPECT_CALL(*capturer, StartCapture(Eq(expectedCap))).WillOnce(Return(0));

  mAggregator->StartStream(mAggregator->mCaptureId, cap, constraints,
                           resizeMode);
}

TEST_F(TestAggregateCapturer, FrameDelivery) {
  webrtc::VideoCaptureCapability cap;
  mFactory->mDeviceInfo->GetCapability(DeviceInfoFake::kId, 0, cap);
  NormalizedConstraints constraints;
  dom::VideoResizeModeEnum resizeMode =
      dom::VideoResizeModeEnum::Crop_and_scale;
  mAggregator->StartStream(mAggregator->mCaptureId, cap, constraints,
                           resizeMode);

  constexpr int width = 240, height = 160;
  constexpr int64_t time = 123;

  EXPECT_CALL(*mParent,
              DeliverFrameOverIPC(
                  CameraEngine, mAggregator->mCaptureId, _, _, _,
                  Property(&VideoFrameProperties::renderTimeMs, Eq(time))));

  auto buffer = webrtc::I420Buffer::Create(width, height);
  webrtc::I420Buffer::SetBlack(buffer.get());
  auto frame = webrtc::VideoFrame::Builder()
                   .set_video_frame_buffer(buffer)
                   .set_timestamp_ms(time)
                   .build();
  mAggregator->OnFrame(frame);

  WaitForBackgroundThread();
}

TEST_F(TestAggregateCapturer, CamerasParentRemovalDuringFrameDelivery) {
  constexpr int width = 240, height = 160;
  constexpr int64_t time = 123;
  constexpr int numFrames = 100;
  auto buffer = webrtc::I420Buffer::Create(width, height);
  webrtc::I420Buffer::SetBlack(buffer.get());

  RefPtr<MockCamerasParent> parent2 = MockCamerasParent::Create();
  auto streamId2 = mEngine->GenerateId();
  mAggregator->AddStream(parent2, streamId2, kWindowId + 1);

  const NormalizedConstraints constraints;
  const dom::VideoResizeModeEnum resizeMode = dom::VideoResizeModeEnum::None;
  webrtc::VideoCaptureCapability cap;
  mFactory->mDeviceInfo->GetCapability(DeviceInfoFake::kId, 0, cap);
  mAggregator->StartStream(mAggregator->mCaptureId, cap, constraints,
                           resizeMode);
  mAggregator->StartStream(streamId2, cap, constraints, resizeMode);

  EXPECT_CALL(*mParent, DeliverFrameOverIPC).Times(numFrames);
  EXPECT_CALL(*parent2, DeliverFrameOverIPC).Times(AtLeast(1));

  nsCOMPtr<nsISerialEventTarget> backgroundQueue;
  MOZ_ALWAYS_SUCCEEDS(NS_CreateBackgroundTaskQueue(
      "TestAggregateCapturer", getter_AddRefs(backgroundQueue)));
  RefPtr<GenericPromise> primedPromise =
      InvokeAsync(backgroundQueue, __func__, [&] {
        auto frame = webrtc::VideoFrame::Builder()
                         .set_video_frame_buffer(buffer)
                         .set_timestamp_ms(time)
                         .build();
        mAggregator->OnFrame(frame);
        return GenericPromise::CreateAndResolve(true, "TestAggregateCapturer");
      });
  auto deliverPromise = InvokeAsync(backgroundQueue, __func__, [&] {
    for (int i = 1; i < numFrames; ++i) {
      auto frame = webrtc::VideoFrame::Builder()
                       .set_video_frame_buffer(buffer)
                       .set_timestamp_ms(time + i * 100)
                       .build();
      mAggregator->OnFrame(frame);
    }
    return GenericPromise::CreateAndResolve(true, "TestAggregateCapturer");
  });
  // Wait for the background TaskQueue to have a thread available, and a frame
  // delivered to both parents.
  (void)WaitFor(primedPromise);
  // Remove the 2nd CamerasParent during frame delivery as to provoke a race.
  EXPECT_EQ(mAggregator->RemoveStreamsFor(parent2).mNumRemainingStreams, 1U);
  parent2 = nullptr;
  // Wait for all frames to be delivered.
  (void)WaitFor(deliverPromise);

  // Wait for PBackground to receive all frames.
  WaitForBackgroundThread();
}

TEST_F(TestAggregateCapturerNoCapabilities, StartStream) {
  webrtc::VideoCaptureCapability cap;
  cap.width = 854;
  cap.height = 480;
  cap.maxFPS = 30;
  cap.videoType = webrtc::VideoType::kI420;

  auto capturer = mFactory->mCapturers[mAggregator->mCaptureId];
  EXPECT_CALL(*capturer, StartCapture(Eq(cap))).WillOnce(Return(0));

  mAggregator->StartStream(mAggregator->mCaptureId, cap,
                           NormalizedConstraints{},
                           dom::VideoResizeModeEnum::None);
}
}  // namespace mozilla::camera
