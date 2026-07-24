/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "video_capture_fake.h"

#include "FakeVideoSource.h"
#include "device_info_fake.h"
#include "libwebrtcglue/WebrtcImageBuffer.h"

using mozilla::FakeVideoSource;
using mozilla::ImageBuffer;
using mozilla::MakeRefPtr;
using mozilla::TimeDuration;
using mozilla::TimeStamp;
using mozilla::layers::Image;

namespace webrtc::videocapturemodule {
webrtc::scoped_refptr<webrtc::VideoCaptureModule> VideoCaptureFake::Create(
    nsISerialEventTarget* aTarget) {
  return webrtc::make_ref_counted<VideoCaptureFake>(
      Clock::GetRealTimeClockRaw(), aTarget);
}

VideoCaptureFake::VideoCaptureFake(Clock* clock, nsISerialEventTarget* aTarget)
    : VideoCaptureImpl(clock),
      mTarget(aTarget),
      mSource(MakeRefPtr<FakeVideoSource>(aTarget)) {
  size_t len = strlen(DeviceInfoFake::kId);
  _deviceUniqueId = new (std::nothrow) char[len + 1];
  if (_deviceUniqueId) {
    memcpy(_deviceUniqueId, DeviceInfoFake::kId, len + 1);
  }
}

VideoCaptureFake::~VideoCaptureFake() { StopCapture(); }

int32_t VideoCaptureFake::StartCapture(
    const VideoCaptureCapability& aCapability) {
  if (!CaptureStarted()) {
    mGeneratedImageListener = mSource->GeneratedImageEvent().Connect(
        mTarget, this, &VideoCaptureFake::OnGeneratedImage);
  }
  return mSource->StartCapture(
      aCapability.width, aCapability.height,
      TimeDuration::FromSeconds(1.0 / aCapability.maxFPS));
}

int32_t VideoCaptureFake::StopCapture() {
  mGeneratedImageListener.DisconnectIfExists();
  return mSource->StopCapture();
}

bool VideoCaptureFake::CaptureStarted() { return mSource->CaptureStarted(); }

int32_t VideoCaptureFake::CaptureSettings(VideoCaptureCapability& aSettings) {
  return {};
}

void VideoCaptureFake::SetTrackingId(uint32_t aTrackingIdProcId) {
  mSource->SetTrackingId(aTrackingIdProcId);
}

void VideoCaptureFake::OnGeneratedImage(const RefPtr<Image>& aImage,
                                        TimeStamp aTime) {
  webrtc::scoped_refptr<ImageBuffer> buffer(
      new webrtc::RefCountedObject<ImageBuffer>(RefPtr(aImage)));
  if (!mStart) {
    mStart = Some(aTime);
  }
  auto videoFrame = webrtc::VideoFrame::Builder()
                        .set_video_frame_buffer(buffer)
                        .set_timestamp_us((aTime - *mStart).ToMicroseconds())
                        .build();
  webrtc::MutexLock lock(&api_lock_);
  DeliverCapturedFrame(videoFrame);
}

}  // namespace webrtc::videocapturemodule
