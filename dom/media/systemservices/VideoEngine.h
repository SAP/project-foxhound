/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_VideoEngine_h
#define mozilla_VideoEngine_h

#include <memory>

#include "MediaEventSource.h"
#include "mozilla/DefineEnum.h"
#include "video_engine/video_capture_factory.h"

namespace webrtc {
class DesktopCaptureImpl;
}

namespace mozilla::camera {

MOZ_DEFINE_ENUM_CLASS_WITH_TOSTRING(CaptureDeviceType,
                                    (Camera, Screen, Window, Browser));

// Historically the video engine was part of libwebrtc.
// It was removed, and reimplemented in Talk.
//
// Now we are removing more and more of it. Currently it is a fairly thin proxy
// between CamerasParent and libwebrtc, mainly handling things like forwarding
// device-change events and cache invalidation of enumerated devices.
class VideoEngine : public webrtc::VideoInputFeedBack {
 private:
  virtual ~VideoEngine();

  // Base cache expiration period
  // Note because cameras use HW plug event detection, this
  // only applies to screen based modes.
  static const int64_t kCacheExpiryPeriodMs = 2000;

 public:
  NS_INLINE_DECL_REFCOUNTING(VideoEngine)

  static already_AddRefed<VideoEngine> Create(
      const CaptureDeviceType& aCaptureDeviceType,
      RefPtr<VideoCaptureFactory> aVideoCaptureFactory);
#if defined(ANDROID)
  static int SetAndroidObjects();
#endif
  int32_t GenerateId();
  // Thin layer on top of mVideoCaptureFactory.
  VideoCaptureFactory::CreateVideoCaptureResult CreateVideoCapture(
      int32_t aCaptureId, const char* aDeviceUniqueIdUTF8);

  /** Returns an existing or creates a new DeviceInfo.
   *   Camera info is cached to prevent repeated lengthy polling for "realness"
   *   of the hardware devices.  Other types of capture, e.g. screen share info,
   *   are cached for 1 second. This could be handled in a more elegant way in
   *   the future.
   *   @return on failure the shared_ptr will be null, otherwise it will contain
   *   a DeviceInfo.
   *   @see bug 1305212 https://bugzilla.mozilla.org/show_bug.cgi?id=1305212
   */
  std::shared_ptr<webrtc::VideoCaptureModule::DeviceInfo>
  GetOrCreateVideoCaptureDeviceInfo();

  /**
   * Destroys existing DeviceInfo.
   *  The DeviceInfo will be recreated the next time it is needed.
   */
  void ClearVideoCaptureDeviceInfo();

  void OnDeviceChange() override;

  MediaEventSource<void>& DeviceChangeEvent() { return mDeviceChangeEvent; }

 private:
  VideoEngine(const CaptureDeviceType& aCaptureDeviceType,
              RefPtr<VideoCaptureFactory> aVideoCaptureFactory);
  const CaptureDeviceType mCaptureDevType;
  const RefPtr<VideoCaptureFactory> mVideoCaptureFactory;
  std::shared_ptr<webrtc::VideoCaptureModule::DeviceInfo> mDeviceInfo;
  MediaEventProducer<void> mDeviceChangeEvent;
  // The validity period for non-camera capture device infos`
  webrtc::Timestamp mExpiryTime = webrtc::Timestamp::Micros(0);
};
}  // namespace mozilla::camera
#endif
