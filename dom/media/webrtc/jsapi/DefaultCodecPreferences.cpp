/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "DefaultCodecPreferences.h"

#include "PeerConnectionImpl.h"
#include "gmp/GMPUtils.h"
#include "libwebrtcglue/VideoConduit.h"
#include "mozilla/StaticPrefs_media.h"

namespace mozilla {

bool DefaultCodecPreferences::AV1EnabledStatic() {
  return WebrtcVideoConduit::HasAv1() &&
         StaticPrefs::media_webrtc_codec_video_av1_enabled();
}

bool DefaultCodecPreferences::AV1PreferredStatic() {
  return StaticPrefs::media_webrtc_codec_video_av1_experimental_preferred();
}

bool DefaultCodecPreferences::H264EnabledStatic() {
  return SoftwareH264EnabledStatic() || HardwareH264EnabledStatic();
}

bool DefaultCodecPreferences::SoftwareH264EnabledStatic() {
#ifdef MOZ_WIDGET_ANDROID
  // Although Play Store policy doesn't allow GMP plugin, Android has H.264 SW
  // codec.
  MOZ_ASSERT(!HaveGMPFor("encode-video"_ns, {"h264"_ns}),
             "GMP plugin not allowed on Android");
  return true;
#else
  return HaveGMPFor("encode-video"_ns, {"h264"_ns}) &&
         HaveGMPFor("decode-video"_ns, {"h264"_ns});
#endif
}

bool DefaultCodecPreferences::HardwareH264EnabledStatic() {
  return WebrtcVideoConduit::HasH264Hardware() &&
         StaticPrefs::media_webrtc_hw_h264_enabled();
}

bool DefaultCodecPreferences::
    SendingH264PacketizationModeZeroSupportedStatic() {
  // Packetization mode 0 is unsupported by MediaDataEncoder.
  return HaveGMPFor("encode-video"_ns, {"h264"_ns});
}

bool DefaultCodecPreferences::H264BaselineDisabledStatic() {
  return StaticPrefs::media_navigator_video_disable_h264_baseline();
}

uint8_t DefaultCodecPreferences::H264LevelStatic() {
  auto value = StaticPrefs::media_navigator_video_h264_level();
  if (value > 0xFF) {
    return StaticPrefs::GetPrefDefault_media_navigator_video_h264_level();
  }
  return value;
}

uint32_t DefaultCodecPreferences::H264MaxBrStatic() {
  return StaticPrefs::media_navigator_video_h264_max_br();
}

uint32_t DefaultCodecPreferences::H264MaxMbpsStatic() {
  return StaticPrefs::media_navigator_video_h264_max_mbps();
}

bool DefaultCodecPreferences::VP9EnabledStatic() {
  return StaticPrefs::media_peerconnection_video_vp9_enabled();
}

bool DefaultCodecPreferences::VP9PreferredStatic() {
  return StaticPrefs::media_peerconnection_video_vp9_preferred();
}

uint32_t DefaultCodecPreferences::VP8MaxFsStatic() {
  return StaticPrefs::media_navigator_video_max_fs();
}

uint32_t DefaultCodecPreferences::VP8MaxFrStatic() {
  return StaticPrefs::media_navigator_video_max_fr();
}

bool DefaultCodecPreferences::UseTmmbrStatic() {
  return StaticPrefs::media_navigator_video_use_tmmbr();
}

bool DefaultCodecPreferences::UseRembStatic() {
  return StaticPrefs::media_navigator_video_use_remb();
}

bool DefaultCodecPreferences::UseRtxStatic() {
  return StaticPrefs::media_peerconnection_video_use_rtx();
}

bool DefaultCodecPreferences::UseTransportCCStatic() {
  return StaticPrefs::media_navigator_video_use_transport_cc();
}

bool DefaultCodecPreferences::UseAudioTransportCCStatic() {
  return StaticPrefs::media_navigator_audio_use_transport_cc();
}

bool DefaultCodecPreferences::UseAudioFecStatic() {
  return StaticPrefs::media_navigator_audio_use_fec();
}

bool DefaultCodecPreferences::RedUlpfecEnabledStatic() {
  return StaticPrefs::media_navigator_video_red_ulpfec_enabled();
}

void EnumerateDefaultVideoCodecs(
    nsTArray<UniquePtr<JsepCodecDescription>>& aSupportedCodecs,
    const OverrideRtxPreference aOverrideRtxPreference) {
  const DefaultCodecPreferences prefs(aOverrideRtxPreference);
  EnumerateDefaultVideoCodecs(aSupportedCodecs, prefs);
}

void EnumerateDefaultVideoCodecs(
    nsTArray<UniquePtr<JsepCodecDescription>>& aSupportedCodecs,
    const JsepCodecPreferences& aPrefs) {
  // Supported video codecs.
  // Note: order here implies priority for building offers!
  aSupportedCodecs.AppendElement(
      JsepVideoCodecDescription::CreateDefaultVP8(aPrefs));
  aSupportedCodecs.AppendElement(
      JsepVideoCodecDescription::CreateDefaultVP9(aPrefs));
  aSupportedCodecs.AppendElement(
      JsepVideoCodecDescription::CreateDefaultH264_1(aPrefs));
  aSupportedCodecs.AppendElement(
      JsepVideoCodecDescription::CreateDefaultH264_0(aPrefs));
  aSupportedCodecs.AppendElement(
      JsepVideoCodecDescription::CreateDefaultH264Baseline_1(aPrefs));
  aSupportedCodecs.AppendElement(
      JsepVideoCodecDescription::CreateDefaultH264Baseline_0(aPrefs));
  aSupportedCodecs.AppendElement(
      JsepVideoCodecDescription::CreateDefaultAV1(aPrefs));
  aSupportedCodecs.AppendElement(
      JsepVideoCodecDescription::CreateDefaultUlpFec(aPrefs));
  aSupportedCodecs.AppendElement(
      JsepApplicationCodecDescription::CreateDefault());
  aSupportedCodecs.AppendElement(
      JsepVideoCodecDescription::CreateDefaultRed(aPrefs));

  CompareCodecPriority comparator;
  std::stable_sort(aSupportedCodecs.begin(), aSupportedCodecs.end(),
                   comparator);
}

void EnumerateDefaultAudioCodecs(
    nsTArray<UniquePtr<JsepCodecDescription>>& aSupportedCodecs) {
  const auto prefs = PeerConnectionImpl::GetDefaultCodecPreferences();
  EnumerateDefaultAudioCodecs(aSupportedCodecs, prefs);
}

void EnumerateDefaultAudioCodecs(
    nsTArray<UniquePtr<JsepCodecDescription>>& aSupportedCodecs,
    const JsepCodecPreferences& aPrefs) {
  aSupportedCodecs.AppendElement(
      JsepAudioCodecDescription::CreateDefaultOpus(aPrefs));
  aSupportedCodecs.AppendElement(
      JsepAudioCodecDescription::CreateDefaultG722(aPrefs));
  aSupportedCodecs.AppendElement(
      JsepAudioCodecDescription::CreateDefaultPCMU(aPrefs));
  aSupportedCodecs.AppendElement(
      JsepAudioCodecDescription::CreateDefaultPCMA(aPrefs));
  aSupportedCodecs.AppendElement(
      JsepAudioCodecDescription::CreateDefaultTelephoneEvent());
}

}  // namespace mozilla
