/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_SYSTEMSERVICES_FAKE_VIDEO_CAPTURE_DEVICE_INFO_EMPTY_H_
#define DOM_MEDIA_SYSTEMSERVICES_FAKE_VIDEO_CAPTURE_DEVICE_INFO_EMPTY_H_

#include "device_info_fake.h"
#include "modules/video_capture/device_info_impl.h"

namespace webrtc::videocapturemodule {

/**
 * DeviceInfo implementation that reports a single device with zero
 * capabilities. Paired with VideoCaptureFake for capturing, this simulates
 * real cameras (e.g. v4l2loopback) that do not enumerate capabilities.
 */
class DeviceInfoEmpty : public DeviceInfoImpl {
 public:
  ~DeviceInfoEmpty() override = default;

  int32_t Init() override { return 0; }
  uint32_t NumberOfDevices() override { return 1; }
  int32_t GetDeviceName(uint32_t aDeviceNumber, char* aDeviceNameUTF8,
                        uint32_t aDeviceNameLength, char* aDeviceUniqueIdUTF8,
                        uint32_t aDeviceUniqueIdUTF8Length,
                        char* aProductUniqueIdUTF8 = nullptr,
                        uint32_t aProductUniqueIdUTF8Length = 0,
                        pid_t* aPid = nullptr,
                        bool* deviceIsPlaceholder = nullptr) override;
  int32_t NumberOfCapabilities(const char*) override { return 0; }
  int32_t GetCapability(const char*, const uint32_t,
                        VideoCaptureCapability&) override {
    return -1;
  }
  int32_t DisplayCaptureSettingsDialogBox(const char*, const char*, void*,
                                          uint32_t, uint32_t) override {
    return -1;
  }
  int32_t CreateCapabilityMap(const char*) override { return -1; }

  static constexpr const char* kName = "Fake Empty Video Source";
  // Reuse DeviceInfoFake's unique id so VideoCaptureFake (which writes
  // DeviceInfoFake::kId into its _deviceUniqueId) continues to match.
  static constexpr const char* kId = DeviceInfoFake::kId;
};

}  // namespace webrtc::videocapturemodule

#endif
