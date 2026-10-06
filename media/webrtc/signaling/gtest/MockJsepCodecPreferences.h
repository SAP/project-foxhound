/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MEDIA_WEBRTC_SIGNALING_GTEST_MOCKJSEPCODECPREFERENCES_H_
#define MEDIA_WEBRTC_SIGNALING_GTEST_MOCKJSEPCODECPREFERENCES_H_

#include "jsep/JsepCodecDescription.h"
#include "mozilla/StaticPrefs_media.h"

namespace mozilla {

/*
This provides a stable set of codec preferences for unit tests. In order to
change a preference, you can set the member variable to the desired value.
*/
struct MockJsepCodecPreferences : public JsepCodecPreferences {
  bool AV1Enabled() const override { return mAv1Enabled; }
  bool AV1Preferred() const override { return mAv1Preferred; }
  bool H264Enabled() const override { return mH264Enabled; }
  bool SoftwareH264Enabled() const override { return mSoftwareH264Enabled; }
  bool SendingH264PacketizationModeZeroSupported() const override {
    return mH264PacketizationModeZeroSupported;
  }
  bool H264BaselineDisabled() const override { return mH264BaselineDisabled; }
  uint8_t H264Level() const override { return mH264Level; }
  uint32_t H264MaxBr() const override { return mH264MaxBr; }
  uint32_t H264MaxMbps() const override { return mH264MaxMbps; }
  bool VP9Enabled() const override { return mVp9Enabled; }
  bool VP9Preferred() const override { return mVp9Preferred; }
  uint32_t VP8MaxFs() const override { return mVp8MaxFs; }
  uint32_t VP8MaxFr() const override { return mVp8MaxFr; }
  bool UseTmmbr() const override { return mUseTmmbr; }
  bool UseRemb() const override { return mUseRemb; }
  bool UseRtx() const override { return mUseRtx; }
  bool UseTransportCC() const override { return mUseTransportCC; }
  bool UseAudioTransportCC() const override { return mUseAudioTransportCC; }
  bool UseAudioFec() const override { return mUseAudioFec; }
  bool RedUlpfecEnabled() const override { return mRedUlpfecEnabled; }

  bool mAv1Enabled = true;
  bool mAv1Preferred = false;
  bool mH264Enabled = true;
  bool mSoftwareH264Enabled = true;
  bool mH264PacketizationModeZeroSupported = true;
  bool mH264BaselineDisabled =
      StaticPrefs::GetPrefDefault_media_navigator_video_disable_h264_baseline();
  uint8_t mH264Level =
      StaticPrefs::GetPrefDefault_media_navigator_video_h264_level();
  uint32_t mH264MaxBr =
      StaticPrefs::GetPrefDefault_media_navigator_video_h264_max_br();
  uint32_t mH264MaxMbps =
      StaticPrefs::GetPrefDefault_media_navigator_video_h264_max_mbps();
  bool mVp9Enabled =
      StaticPrefs::GetPrefDefault_media_peerconnection_video_vp9_enabled();
  bool mVp9Preferred =
      StaticPrefs::GetPrefDefault_media_peerconnection_video_vp9_preferred();
  uint32_t mVp8MaxFs =
      StaticPrefs::GetPrefDefault_media_navigator_video_max_fs();
  uint32_t mVp8MaxFr =
      StaticPrefs::GetPrefDefault_media_navigator_video_max_fr();
  bool mUseTmmbr =
      StaticPrefs::GetPrefDefault_media_navigator_video_use_tmmbr();
  bool mUseRemb = StaticPrefs::GetPrefDefault_media_navigator_video_use_remb();
  bool mUseRtx =
      StaticPrefs::GetPrefDefault_media_peerconnection_video_use_rtx();
  bool mUseTransportCC =
      StaticPrefs::GetPrefDefault_media_navigator_video_use_transport_cc();
  bool mUseAudioTransportCC =
      StaticPrefs::GetPrefDefault_media_navigator_audio_use_transport_cc();
  bool mUseAudioFec =
      StaticPrefs::GetPrefDefault_media_navigator_audio_use_fec();
  bool mRedUlpfecEnabled =
      StaticPrefs::GetPrefDefault_media_navigator_video_red_ulpfec_enabled();
};
}  // namespace mozilla

#endif  // MEDIA_WEBRTC_SIGNALING_GTEST_MOCKJSEPCODECPREFERENCES_H_
