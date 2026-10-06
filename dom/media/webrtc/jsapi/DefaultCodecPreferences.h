/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_WEBRTC_JSAPI_DEFAULTCODECPREFERENCES_H_
#define DOM_MEDIA_WEBRTC_JSAPI_DEFAULTCODECPREFERENCES_H_

#include "jsep/JsepCodecDescription.h"
#include "nsTArrayForwardDeclare.h"

namespace mozilla {

enum class OverrideRtxPreference {
  NoOverride,
  OverrideWithEnabled,
  OverrideWithDisabled,
};

void EnumerateDefaultVideoCodecs(
    nsTArray<UniquePtr<JsepCodecDescription>>& aSupportedCodecs,
    const OverrideRtxPreference aOverrideRtxPreference);

void EnumerateDefaultVideoCodecs(
    nsTArray<UniquePtr<JsepCodecDescription>>& aSupportedCodecs,
    const JsepCodecPreferences& aPrefs);

void EnumerateDefaultAudioCodecs(
    nsTArray<UniquePtr<JsepCodecDescription>>& aSupportedCodecs);

void EnumerateDefaultAudioCodecs(
    nsTArray<UniquePtr<JsepCodecDescription>>& aSupportedCodecs,
    const JsepCodecPreferences& aPrefs);

class DefaultCodecPreferences final : public JsepCodecPreferences {
 public:
  explicit DefaultCodecPreferences(
      const OverrideRtxPreference aOverrideRtxPreference)
      : mOverrideRtxEnabled(aOverrideRtxPreference) {}

  bool AV1Enabled() const override { return mAV1Enabled; }
  bool AV1Preferred() const override { return mAV1Preferred; }
  bool H264Enabled() const override { return mH264Enabled; }

  bool SoftwareH264Enabled() const override { return mSoftwareH264Enabled; }
  bool HardwareH264Enabled() const { return mHardwareH264Enabled; }

  bool SendingH264PacketizationModeZeroSupported() const override {
    return mSendingH264PacketizationModeZeroSupported;
  }

  bool H264BaselineDisabled() const override { return mH264BaselineDisabled; }

  uint8_t H264Level() const override { return mH264Level; }

  uint32_t H264MaxBr() const override { return mH264MaxBr; }

  uint32_t H264MaxMbps() const override { return mH264MaxMbps; }

  bool VP9Enabled() const override { return mVP9Enabled; }

  bool VP9Preferred() const override { return mVP9Preferred; }

  uint32_t VP8MaxFs() const override { return mVP8MaxFs; }

  uint32_t VP8MaxFr() const override { return mVP8MaxFr; }

  bool UseTmmbr() const override { return mUseTmmbr; }

  bool UseRemb() const override { return mUseRemb; }

  bool UseRtx() const override {
    if (mOverrideRtxEnabled == OverrideRtxPreference::NoOverride) {
      return mUseRtx;
    }
    return mOverrideRtxEnabled == OverrideRtxPreference::OverrideWithEnabled;
  }

  bool UseTransportCC() const override { return mUseTransportCC; }

  bool UseAudioTransportCC() const override { return mUseAudioTransportCC; }

  bool UseAudioFec() const override { return mUseAudioFec; }

  bool RedUlpfecEnabled() const override { return mRedUlpfecEnabled; }

  static bool AV1EnabledStatic();

  static bool AV1PreferredStatic();

  static bool H264EnabledStatic();

  static bool SoftwareH264EnabledStatic();

  static bool HardwareH264EnabledStatic();

  static bool SendingH264PacketizationModeZeroSupportedStatic();

  static bool H264BaselineDisabledStatic();

  static uint8_t H264LevelStatic();

  static uint32_t H264MaxBrStatic();

  static uint32_t H264MaxMbpsStatic();

  static bool VP9EnabledStatic();

  static bool VP9PreferredStatic();

  static uint32_t VP8MaxFsStatic();

  static uint32_t VP8MaxFrStatic();

  static bool UseTmmbrStatic();

  static bool UseRembStatic();

  static bool UseRtxStatic();

  static bool UseTransportCCStatic();

  static bool UseAudioTransportCCStatic();

  static bool UseAudioFecStatic();

  static bool RedUlpfecEnabledStatic();

  // This is to accommodate the behavior of
  // RTCRtpTransceiver::SetCodecPreferences
  const OverrideRtxPreference mOverrideRtxEnabled =
      OverrideRtxPreference::NoOverride;

  const bool mAV1Enabled = AV1EnabledStatic();
  const bool mAV1Preferred = AV1PreferredStatic();
  const bool mH264Enabled = H264EnabledStatic();
  const bool mSoftwareH264Enabled = SoftwareH264EnabledStatic();
  const bool mHardwareH264Enabled = HardwareH264EnabledStatic();
  const bool mSendingH264PacketizationModeZeroSupported =
      SendingH264PacketizationModeZeroSupportedStatic();
  const bool mH264BaselineDisabled = H264BaselineDisabledStatic();
  const uint8_t mH264Level = H264LevelStatic();
  const uint32_t mH264MaxBr = H264MaxBrStatic();
  const uint32_t mH264MaxMbps = H264MaxMbpsStatic();
  const bool mVP9Enabled = VP9EnabledStatic();
  const bool mVP9Preferred = VP9PreferredStatic();
  const uint32_t mVP8MaxFs = VP8MaxFsStatic();
  const uint32_t mVP8MaxFr = VP8MaxFrStatic();
  const bool mUseTmmbr = UseTmmbrStatic();
  const bool mUseRemb = UseRembStatic();
  const bool mUseRtx = UseRtxStatic();
  const bool mUseTransportCC = UseTransportCCStatic();
  const bool mUseAudioTransportCC = UseAudioTransportCCStatic();
  const bool mUseAudioFec = UseAudioFecStatic();
  const bool mRedUlpfecEnabled = RedUlpfecEnabledStatic();
};
}  // namespace mozilla
#endif  // DOM_MEDIA_WEBRTC_JSAPI_DEFAULTCODECPREFERENCES_H_
