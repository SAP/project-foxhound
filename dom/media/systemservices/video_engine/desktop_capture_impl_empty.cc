/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree. An additional intellectual property rights grant can be found
 *  in the file PATENTS.  All contributing project authors may
 *  be found in the AUTHORS file in the root of the source tree.
 */

#include "VideoEngine.h"
#include "desktop_capture_impl.h"

using mozilla::camera::CaptureDeviceType;

namespace webrtc {

DesktopCaptureImpl* DesktopCaptureImpl::Create(int32_t, const char*,
                                               const CaptureDeviceType) {
  return nullptr;
}

std::shared_ptr<VideoCaptureModule::DeviceInfo>
DesktopCaptureImpl::CreateDeviceInfo(const CaptureDeviceType) {
  return nullptr;
}

const char* DesktopCaptureImpl::CurrentDeviceName() const {
  return mDeviceUniqueId.c_str();
}

DesktopCaptureImpl::DesktopCaptureImpl(int32_t, const char*,
                                       const CaptureDeviceType)
    : mDeviceType(CaptureDeviceType::Camera),
      mNextFrameMinimumTime(Timestamp::Zero()),
      mCallback("DesktopCaptureImpl::mCallback") {
  MOZ_CRASH("Not used");
}

DesktopCaptureImpl::~DesktopCaptureImpl() {}

void DesktopCaptureImpl::RegisterCaptureDataCallback(
    webrtc::VideoSinkInterface<VideoFrame>*) {}

void DesktopCaptureImpl::DeRegisterCaptureDataCallback() {}

int32_t DesktopCaptureImpl::SetCaptureRotation(VideoRotation) { return -1; }

bool DesktopCaptureImpl::SetApplyRotation(bool) { return true; }

int32_t DesktopCaptureImpl::StartCapture(const VideoCaptureCapability&) {
  return -1;
}

bool DesktopCaptureImpl::FocusOnSelectedSource() { return false; }

int32_t DesktopCaptureImpl::StopCapture() { return -1; }

bool DesktopCaptureImpl::CaptureStarted() { return false; }

int32_t DesktopCaptureImpl::CaptureSettings(VideoCaptureCapability&) {
  return -1;
}

void DesktopCaptureImpl::OnCaptureResult(DesktopCapturer::Result,
                                         std::unique_ptr<DesktopFrame>) {}

void DesktopCaptureImpl::NotifyOnFrame(const VideoFrame& aFrame) {}

void DesktopCaptureImpl::InitOnThread(std::unique_ptr<DesktopCapturer>, int) {}

void DesktopCaptureImpl::UpdateOnThread(int) {}

void DesktopCaptureImpl::ShutdownOnThread() {}

void DesktopCaptureImpl::CaptureFrameOnThread() {}

mozilla::MediaEventSource<void>* DesktopCaptureImpl::CaptureEndedEvent() {
  return nullptr;
}

}  // namespace webrtc
