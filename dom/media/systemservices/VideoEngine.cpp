/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "VideoEngine.h"

#include "libwebrtcglue/SystemTime.h"
#include "video_engine/desktop_capture_impl.h"

#ifdef MOZ_WIDGET_ANDROID
#  include "mozilla/jni/Utils.h"
#endif

#if defined(ANDROID)
namespace webrtc {
int32_t SetCaptureAndroidVM(JavaVM* javaVM);
}
#endif

namespace mozilla::camera {

mozilla::LazyLogModule gVideoEngineLog("VideoEngine");
#define LOG(args)                                        \
  MOZ_LOG_FMT(gVideoEngineLog, mozilla::LogLevel::Debug, \
              MOZ_LOG_EXPAND_ARGS args)
#define LOG_ENABLED() MOZ_LOG_TEST(gVideoEngineLog, mozilla::LogLevel::Debug)

#if defined(ANDROID)
int VideoEngine::SetAndroidObjects() {
  LOG(("{}", __PRETTY_FUNCTION__));

  JavaVM* const javaVM = mozilla::jni::GetVM();
  if (!javaVM || webrtc::SetCaptureAndroidVM(javaVM) != 0) {
    LOG(("Could not set capture Android VM"));
    return -1;
  }
#  ifdef WEBRTC_INCLUDE_INTERNAL_VIDEO_RENDER
  if (webrtc::SetRenderAndroidVM(javaVM) != 0) {
    LOG(("Could not set render Android VM"));
    return -1;
  }
#  endif
  return 0;
}
#endif

VideoCaptureFactory::CreateVideoCaptureResult VideoEngine::CreateVideoCapture(
    int32_t aCaptureId, const char* aDeviceUniqueIdUTF8) {
  LOG(("{}", __PRETTY_FUNCTION__));
  MOZ_ASSERT(aDeviceUniqueIdUTF8);

  return mVideoCaptureFactory->CreateVideoCapture(
      aCaptureId, aDeviceUniqueIdUTF8, mCaptureDevType);
}

std::shared_ptr<webrtc::VideoCaptureModule::DeviceInfo>
VideoEngine::GetOrCreateVideoCaptureDeviceInfo() {
  LOG(("{}", __PRETTY_FUNCTION__));
  webrtc::Timestamp currentTime = webrtc::Timestamp::Micros(0);

  const char* capDevTypeName = EnumValueToString(mCaptureDevType);

  if (mDeviceInfo) {
    LOG(("Device cache available."));
    // Camera cache is invalidated by HW change detection elsewhere
    if (mCaptureDevType == CaptureDeviceType::Camera) {
      LOG(("returning cached CaptureDeviceInfo of type {}", capDevTypeName));
      return mDeviceInfo;
    }
    // Screen sharing cache is invalidated after the expiration time
    currentTime = WebrtcSystemTime();
    LOG(("Checking expiry, fetched current time of: {}", currentTime.ms()));
    LOG(("device cache expiration is {}", mExpiryTime.ms()));
    if (currentTime <= mExpiryTime) {
      LOG(("returning cached CaptureDeviceInfo of type {}", capDevTypeName));
      return mDeviceInfo;
    }
  }

  if (currentTime.IsZero()) {
    currentTime = WebrtcSystemTime();
    LOG(("Fetched current time of: {}", currentTime.ms()));
  }
  mExpiryTime = currentTime + webrtc::TimeDelta::Millis(kCacheExpiryPeriodMs);
  LOG(("new device cache expiration is {}", mExpiryTime.ms()));
  LOG(("creating a new VideoCaptureDeviceInfo of type {}", capDevTypeName));

#ifdef MOZ_WIDGET_ANDROID
  if (mCaptureDevType == CaptureDeviceType::Camera) {
    if (SetAndroidObjects()) {
      LOG(("VideoEngine::SetAndroidObjects Failed"));
      return mDeviceInfo;
    }
  }
#endif

  if (mDeviceInfo) {
    mDeviceInfo->DeRegisterVideoInputFeedBack(this);
  }

  mDeviceInfo = mVideoCaptureFactory->CreateDeviceInfo(mCaptureDevType);

  if (mDeviceInfo && mCaptureDevType == CaptureDeviceType::Camera) {
    mDeviceInfo->RegisterVideoInputFeedBack(this);
  }

  LOG(("EXIT {}", __PRETTY_FUNCTION__));
  return mDeviceInfo;
}

void VideoEngine::ClearVideoCaptureDeviceInfo() {
  LOG(("{}", __PRETTY_FUNCTION__));
  if (mDeviceInfo) {
    mDeviceInfo->DeRegisterVideoInputFeedBack(this);
    OnDeviceChange();
  }
  mDeviceInfo.reset();
  mVideoCaptureFactory->Invalidate();
}

already_AddRefed<VideoEngine> VideoEngine::Create(
    const CaptureDeviceType& aCaptureDeviceType,
    RefPtr<VideoCaptureFactory> aVideoCaptureFactory) {
  LOG(("{}", __PRETTY_FUNCTION__));
  return do_AddRef(
      new VideoEngine(aCaptureDeviceType, std::move(aVideoCaptureFactory)));
}

int32_t VideoEngine::GenerateId() {
  // XXX Something better than this (a map perhaps, or a simple boolean TArray,
  // given the number in-use is O(1) normally!)
  static int sId = 0;
  return sId++;
}

void VideoEngine::OnDeviceChange() { mDeviceChangeEvent.Notify(); }

VideoEngine::VideoEngine(const CaptureDeviceType& aCaptureDeviceType,
                         RefPtr<VideoCaptureFactory> aVideoCaptureFactory)
    : mCaptureDevType(aCaptureDeviceType),
      mVideoCaptureFactory(std::move(aVideoCaptureFactory)),
      mDeviceInfo(nullptr) {
  MOZ_ASSERT(mVideoCaptureFactory);
  LOG(("{}", __PRETTY_FUNCTION__));
  LOG(("Creating new VideoEngine with CaptureDeviceType {}",
       EnumValueToString(mCaptureDevType)));
}

VideoEngine::~VideoEngine() {
  if (mDeviceInfo) {
    mDeviceInfo->DeRegisterVideoInputFeedBack(this);
  }
}

#undef LOG
#undef LOG_ENABLED

}  // namespace mozilla::camera
