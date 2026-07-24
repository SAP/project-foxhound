/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_SYSTEMSERVICES_FAKE_VIDEO_CAPTURE_VIDEO_CAPTURE_FAKE_H_
#define DOM_MEDIA_SYSTEMSERVICES_FAKE_VIDEO_CAPTURE_VIDEO_CAPTURE_FAKE_H_

#include "MediaEventSource.h"
#include "modules/video_capture/video_capture_impl.h"
#include "mozilla/Maybe.h"
#include "mozilla/RefPtr.h"
#include "mozilla/ThreadSafety.h"
#include "mozilla/TimeStamp.h"
#include "system_wrappers/include/clock.h"

class nsISerialEventTarget;

namespace mozilla {
class FakeVideoSource;
namespace layers {
class Image;
}
}  // namespace mozilla

namespace webrtc::videocapturemodule {
class VideoCaptureFake : public webrtc::videocapturemodule::VideoCaptureImpl {
 public:
  explicit VideoCaptureFake(Clock* clock, nsISerialEventTarget* aTarget);
  ~VideoCaptureFake() override;

  static webrtc::scoped_refptr<webrtc::VideoCaptureModule> Create(
      nsISerialEventTarget* aTarget);

  // Implementation of VideoCaptureImpl.

  // Starts capturing synchronously. Idempotent. If an existing capture is live
  // and another capability is requested we'll restart the underlying backend
  // with the new capability.
  int32_t StartCapture(const VideoCaptureCapability& aCapability)
      MOZ_EXCLUDES(api_lock_) override;
  // Stops capturing synchronously. Idempotent.
  int32_t StopCapture() MOZ_EXCLUDES(api_lock_) override;
  bool CaptureStarted() MOZ_EXCLUDES(api_lock_) override;
  int32_t CaptureSettings(VideoCaptureCapability& aSettings) override;

  void SetTrackingId(uint32_t aTrackingIdProcId)
      MOZ_EXCLUDES(api_lock_) override;

 private:
  void OnGeneratedImage(const RefPtr<mozilla::layers::Image>& aImage,
                        mozilla::TimeStamp aTime);

  const nsCOMPtr<nsISerialEventTarget> mTarget;
  const RefPtr<mozilla::FakeVideoSource> mSource;
  mozilla::Maybe<mozilla::TimeStamp> mStart;
  mozilla::MediaEventListener mGeneratedImageListener;
};
}  // namespace webrtc::videocapturemodule

#endif
