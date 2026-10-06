/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CamerasTypes.h"

#ifdef MOZ_WEBRTC
#  include "common_video/libyuv/include/webrtc_libyuv.h"
#else
namespace webrtc {
enum class VideoType {};
}
#endif

namespace mozilla::camera {

TrackingId::Source CaptureEngineToTrackingSourceStr(
    const CaptureEngine& aEngine) {
  switch (aEngine) {
    case ScreenEngine:
      return TrackingId::Source::Screen;
    case BrowserEngine:
      return TrackingId::Source::Tab;
    case WinEngine:
      return TrackingId::Source::Window;
    case CameraEngine:
      return TrackingId::Source::Camera;
    default:
      return TrackingId::Source::Unimplemented;
  }
}

/* static */
bool WebrtcVideoTypeValidator::IsLegalValue(const int aValue) {
#ifdef MOZ_WEBRTC
  return IPC::ContiguousEnumValidatorInclusive<
      webrtc::VideoType, webrtc::VideoType::kUnknown,
      webrtc::VideoType::kNV12>::IsLegalValue(aValue);
#else
  return false;
#endif
}
}  // namespace mozilla::camera
