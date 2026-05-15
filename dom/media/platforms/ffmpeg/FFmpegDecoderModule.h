/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef FFmpegDecoderModule_h_
#define FFmpegDecoderModule_h_

#include "FFmpegAudioDecoder.h"
#include "FFmpegLibWrapper.h"
#include "FFmpegUtils.h"
#include "FFmpegVideoDecoder.h"
#include "MP4Decoder.h"
#include "PlatformDecoderModule.h"
#include "VPXDecoder.h"
#include "VideoUtils.h"
#include "mozilla/DataMutex.h"
#include "mozilla/StaticPrefs_media.h"
#include "mozilla/gfx/gfxVars.h"
#include "prenv.h"

#ifdef DEBUG
#  include "mozilla/AppShutdown.h"
#endif

namespace mozilla {

template <int V>
class FFmpegDecoderModule : public PlatformDecoderModule {
 public:
  const char* Name() const override {
#ifdef FFVPX_VERSION
    return "FFmpeg(FFVPX)";
#else
    return "FFmpeg(OS library)";
#endif
  }
  static void Init(const FFmpegLibWrapper* aLib) {
#if (defined(XP_WIN) || defined(MOZ_WIDGET_GTK) || \
     defined(MOZ_WIDGET_ANDROID)) &&               \
    defined(MOZ_USE_HWDECODE) && !defined(MOZ_FFVPX_AUDIOONLY)
#  ifdef XP_WIN
    if (!XRE_IsGPUProcess()) {
      return;
    }
#  else
    if (!XRE_IsRDDProcess() && !XRE_IsUtilityProcess() &&
        !(XRE_IsParentProcess() && PR_GetEnv("MOZ_RUN_GTEST"))) {
      return;
    }
#  endif

    if (!gfx::gfxVars::IsInitialized()) {
      MOZ_ASSERT(AppShutdown::IsInOrBeyond(ShutdownPhase::XPCOMShutdown));
      return;
    }

    const AVHWDeviceType kDeviceTypes[] = {
#  ifdef XP_WIN
        AV_HWDEVICE_TYPE_D3D11VA,
#  endif
#  ifdef MOZ_WIDGET_GTK
        AV_HWDEVICE_TYPE_VAAPI,
        AV_HWDEVICE_TYPE_NONE,  // Placeholder for V4L2.
#  endif
#  ifdef MOZ_WIDGET_ANDROID
        AV_HWDEVICE_TYPE_MEDIACODEC,
        AV_HWDEVICE_TYPE_NONE,  // Placeholder for audio.
#  endif
    };

    struct CodecEntry {
      AVCodecID mId;
      bool mHwAllowed;
    };

    const CodecEntry kCodecIDs[] = {
    // The following open video codecs can be decoded via hardware by using the
    // system ffmpeg or ffvpx.
#  if LIBAVCODEC_VERSION_MAJOR >= 59
        {AV_CODEC_ID_AV1, gfx::gfxVars::UseAV1HwDecode()},
#  endif
#  if LIBAVCODEC_VERSION_MAJOR >= 55
        {AV_CODEC_ID_VP9, gfx::gfxVars::UseVP9HwDecode()},
#  endif
#  if (defined(MOZ_WIDGET_GTK) || defined(MOZ_WIDGET_ANDROID)) && \
      LIBAVCODEC_VERSION_MAJOR >= 54
        {AV_CODEC_ID_VP8, gfx::gfxVars::UseVP8HwDecode()},
#  endif

#  if defined(MOZ_WIDGET_GTK) && !defined(FFVPX_VERSION)
    // These proprietary video codecs can only be decoded via hardware by using
    // the system ffmpeg, not supported by ffvpx.
#    if LIBAVCODEC_VERSION_MAJOR >= 55
        {AV_CODEC_ID_HEVC, gfx::gfxVars::UseHEVCHwDecode()},
#    endif
        {AV_CODEC_ID_H264, gfx::gfxVars::UseH264HwDecode()},
#  endif
#  ifdef MOZ_WIDGET_ANDROID
        // These proprietary codecs can only be decoded via MediaCodec decoders,
        // but the underlying implementation may be software or hardware.
        {AV_CODEC_ID_HEVC, true},
        {AV_CODEC_ID_H264, true},
        {AV_CODEC_ID_AAC, true},
#  endif
    };

    {
      // Reset the list of supported hardware codecs and reevaluate them.
      auto hwCodecs = sSupportedHWCodecs.Lock();
      hwCodecs->Clear();
      for (const auto& entry : kCodecIDs) {
        if (!entry.mHwAllowed) {
          MOZ_LOG(sPDMLog, LogLevel::Debug,
                  ("Hw codec disabled by gfxVars for %s",
                   AVCodecToString(entry.mId)));
          continue;
        }

        const AVCodec* codec = nullptr;
        for (const auto& deviceType : kDeviceTypes) {
          codec = FFmpegVideoDecoder<V>::FindVideoHardwareAVCodec(
              aLib, entry.mId, deviceType);
          if (codec) {
            break;
          }
        }

        if (!codec) {
          MOZ_LOG(
              sPDMLog, LogLevel::Debug,
              ("No hw codec or decoder for %s", AVCodecToString(entry.mId)));
          continue;
        }

        hwCodecs->AppendElement(entry.mId);
        MOZ_LOG(sPDMLog, LogLevel::Debug,
                ("Support %s for hw decoding", AVCodecToString(entry.mId)));
      }
    }
#endif  // (XP_WIN || MOZ_WIDGET_GTK || MOZ_WIDGET_ANDROID) && MOZ_USE_HWDECODE
        // && !MOZ_FFVPX_AUDIOONLY
  }

  static already_AddRefed<PlatformDecoderModule> Create(
      const FFmpegLibWrapper* aLib) {
    RefPtr<PlatformDecoderModule> pdm = new FFmpegDecoderModule(aLib);

    return pdm.forget();
  }

  explicit FFmpegDecoderModule(const FFmpegLibWrapper* aLib) : mLib(aLib) {}
  virtual ~FFmpegDecoderModule() = default;

  already_AddRefed<MediaDataDecoder> CreateVideoDecoder(
      const CreateDecoderParams& aParams) override {
    if (Supports(SupportDecoderParams(aParams), nullptr).isEmpty()) {
      return nullptr;
    }
    auto decoder = MakeRefPtr<FFmpegVideoDecoder<V>>(
        mLib, aParams.VideoConfig(), aParams.mKnowsCompositor,
        aParams.mImageContainer,
        aParams.mOptions.contains(CreateDecoderParams::Option::LowLatency),
        aParams.mOptions.contains(
            CreateDecoderParams::Option::HardwareDecoderNotAllowed),
        aParams.mOptions.contains(
            CreateDecoderParams::Option::Output8BitPerChannel),
        aParams.mTrackingId, aParams.mCDM);

    // Ensure that decoding is exclusively performed using HW decoding in
    // the GPU process. If FFmpeg does not support HW decoding, reset the
    // decoder to allow PDMFactory to select an alternative HW-capable decoder
    // module if available. In contrast, in the RDD process, it is acceptable
    // to fallback to SW decoding when HW decoding is not available.
    if (XRE_IsGPUProcess()) {
      AVCodecID videoCodec =
          FFmpegVideoDecoder<V>::GetCodecId(aParams.mConfig.mMimeType);
      if (IsHWDecodingSupported(videoCodec) &&
          !decoder->IsHardwareAccelerated()) {
        MOZ_LOG(sPDMLog, LogLevel::Debug,
                ("FFmpeg video decoder can't perform hw decoding, abort!"));
        (void)decoder->Shutdown();
        decoder = nullptr;
      }
    }
    return decoder.forget();
  }

  already_AddRefed<MediaDataDecoder> CreateAudioDecoder(
      const CreateDecoderParams& aParams) override {
    if (Supports(SupportDecoderParams(aParams), nullptr).isEmpty()) {
      return nullptr;
    }
    RefPtr<MediaDataDecoder> decoder = new FFmpegAudioDecoder<V>(mLib, aParams);
    return decoder.forget();
  }

  media::DecodeSupportSet SupportsMimeType(
      const nsACString& aMimeType,
      DecoderDoctorDiagnostics* aDiagnostics) const override {
    UniquePtr<TrackInfo> trackInfo = CreateTrackInfoWithMIMEType(aMimeType);
    if (!trackInfo) {
      return media::DecodeSupportSet{};
    }
    return Supports(SupportDecoderParams(*trackInfo), aDiagnostics);
  }

  media::DecodeSupportSet Supports(
      const SupportDecoderParams& aParams,
      DecoderDoctorDiagnostics* aDiagnostics) const override {
    // This should only be supported by MFMediaEngineDecoderModule.
    if (aParams.mMediaEngineId) {
      return media::DecodeSupportSet{};
    }

    // Temporary - forces use of VPXDecoder when alpha is present.
    // Bug 1263836 will handle alpha scenario once implemented. It will shift
    // the check for alpha to PDMFactory but not itself remove the need for a
    // check.
    const auto& trackInfo = aParams.mConfig;
    const nsACString& mimeType = trackInfo.mMimeType;
    if (VPXDecoder::IsVPX(mimeType) && trackInfo.GetAsVideoInfo()->HasAlpha()) {
      MOZ_LOG(sPDMLog, LogLevel::Debug,
              ("FFmpeg decoder rejects requested type '%s'",
               mimeType.BeginReading()));
      return media::DecodeSupportSet{};
    }

    if (VPXDecoder::IsVP9(mimeType) &&
        aParams.mOptions.contains(CreateDecoderParams::Option::LowLatency)) {
      // SVC layers are unsupported, and may be used in low latency use cases
      // (WebRTC).
      MOZ_LOG(sPDMLog, LogLevel::Debug,
              ("FFmpeg decoder rejects requested type '%s' due to low latency",
               mimeType.BeginReading()));
      return media::DecodeSupportSet{};
    }

    if (MP4Decoder::IsHEVC(mimeType) && !StaticPrefs::media_hevc_enabled()) {
      MOZ_LOG(
          sPDMLog, LogLevel::Debug,
          ("FFmpeg decoder rejects requested type '%s' due to being disabled "
           "by the pref",
           mimeType.BeginReading()));
      return media::DecodeSupportSet{};
    }

    AVCodecID videoCodec = FFmpegVideoDecoder<V>::GetCodecId(mimeType);
    AVCodecID audioCodec = FFmpegAudioDecoder<V>::GetCodecId(
        mimeType,
        trackInfo.GetAsAudioInfo() ? *trackInfo.GetAsAudioInfo() : AudioInfo());
    if (audioCodec == AV_CODEC_ID_NONE && videoCodec == AV_CODEC_ID_NONE) {
      MOZ_LOG(sPDMLog, LogLevel::Debug,
              ("FFmpeg decoder rejects requested type '%s'",
               mimeType.BeginReading()));
      return media::DecodeSupportSet{};
    }
    AVCodecID codecId =
        audioCodec != AV_CODEC_ID_NONE ? audioCodec : videoCodec;

    media::DecodeSupportSet supports;
    if (IsSWDecodingSupported(codecId)) {
      supports += media::DecodeSupport::SoftwareDecode;
    }
    if (IsHWDecodingSupported(codecId)) {
#ifdef MOZ_WIDGET_ANDROID
      // Because we don't provide software implementations of H264 or HEVC on
      // Android, we must use the platform software decoders even if true
      // hardware decoding support is missing.
      switch (codecId) {
        case AV_CODEC_ID_H264:
          supports += gfx::gfxVars::UseH264HwDecode()
                          ? media::DecodeSupport::HardwareDecode
                          : media::DecodeSupport::SoftwareDecode;
          break;
        case AV_CODEC_ID_HEVC:
          supports += gfx::gfxVars::UseHEVCHwDecode()
                          ? media::DecodeSupport::HardwareDecode
                          : media::DecodeSupport::SoftwareDecode;
          break;
        default:
          supports += media::DecodeSupport::HardwareDecode;
          break;
      }
#else
      supports += media::DecodeSupport::HardwareDecode;
#endif
    }

#ifdef XP_WIN
    // TODO : add this for Android as well in bug 1974849.
    MOZ_ASSERT_IF(XRE_IsGPUProcess() && IsVideoCodec(codecId),
                  !supports.contains(media::DecodeSupport::SoftwareDecode));
#endif

    MOZ_LOG(
        sPDMLog, LogLevel::Debug,
        ("FFmpeg decoder %s requested type '%s'",
         supports.isEmpty() ? "rejects" : "supports", mimeType.BeginReading()));
    return supports;
  }

 protected:
  bool SupportsColorDepth(
      gfx::ColorDepth aColorDepth,
      DecoderDoctorDiagnostics* aDiagnostics) const override {
#if defined(MOZ_WIDGET_ANDROID)
    return aColorDepth == gfx::ColorDepth::COLOR_8;
#endif
    return true;
  }

  bool IsSWDecodingSupported(const AVCodecID& aCodec) const {
#ifdef XP_WIN
    // SW video decoding is not allowed in the GPU process.
    if (IsVideoCodec(aCodec) && XRE_IsGPUProcess()) {
      return false;
    }
#endif
    return FFmpegDataDecoder<V>::FindSoftwareAVCodec(mLib, aCodec);
  }

  bool IsHWDecodingSupported(AVCodecID aCodec) const {
#ifdef FFVPX_VERSION
    if (!StaticPrefs::media_ffvpx_hw_enabled()) {
      return false;
    }
#endif
    // We don't need to check the gfxVars again because we check them when we
    // populated sSupportedHWCodecs.
    auto hwCodecs = sSupportedHWCodecs.Lock();
    return hwCodecs->Contains(aCodec);
  }

 private:
  const FFmpegLibWrapper* mLib;
  MOZ_RUNINIT static inline StaticDataMutex<nsTArray<AVCodecID>>
      sSupportedHWCodecs{"sSupportedHWCodecs"};
};

}  // namespace mozilla

#endif  // FFmpegDecoderModule_h_
