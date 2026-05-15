/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
#include "MediaCapabilitiesValidation.h"

#include <algorithm>
#include <array>
#include <cmath>

#include "MediaMIMETypes.h"
#include "mozilla/Assertions.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/Logging.h"
#include "mozilla/Result.h"
#include "mozilla/Variant.h"
#include "mozilla/dom/MediaCapabilitiesBinding.h"
#include "mozilla/dom/Promise.h"
#include "nsReadableUtils.h"

extern mozilla::LazyLogModule sMediaCapabilitiesLog;
#define LOG(args) MOZ_LOG(sMediaCapabilitiesLog, LogLevel::Debug, args)

namespace mozilla::mediacaps {
using dom::AudioConfiguration;
using dom::MediaConfiguration;
using dom::MediaDecodingConfiguration;
using dom::MediaDecodingType;
using dom::MediaEncodingConfiguration;
using dom::MediaEncodingType;
using dom::MSG_INVALID_MEDIA_AUDIO_CONFIGURATION;
using dom::MSG_INVALID_MEDIA_VIDEO_CONFIGURATION;
using dom::MSG_MISSING_REQUIRED_DICTIONARY_MEMBER;
using dom::Promise;
using dom::VideoConfiguration;

static nsAutoCString GetMIMEDebugString(const MediaConfiguration& aConfig);
static bool IsContainerType(const MediaExtendedMIMEType& aMime);
static bool IsSingleCodecType(const MediaExtendedMIMEType& aMime);

// If encodingOrDecodingType is webrtc (MediaEncodingType) or webrtc
// (MediaDecodingType) and mimeType is not one that is used with RTP
// (as defined in the specifications of the corresponding RTP payload formats
// [IANA-MEDIA-TYPES] [RFC6838]), return unsupported.
//
// Unsupported: iLBC, iSAC (Chrome, Safari)
// https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/WebRTC_codecs
static const std::array kSingleWebRTCCodecTypes = {
    // "audio/ilbc"_ns, "audio/isac"_ns,
    "audio/g711-alaw"_ns, "audio/g711-mlaw"_ns, "audio/g722"_ns,
    "audio/opus"_ns,      "audio/pcma"_ns,      "audio/pcmu"_ns,
    "video/av1"_ns,       "video/h264"_ns,      "video/vp8"_ns,
    "video/vp9"_ns,
};

static const std::array kContainerTypes = {"video/mkv"_ns,  "video/mp4"_ns,
                                           "video/webm"_ns, "audio/ogg"_ns,
                                           "audio/mp4"_ns,  "audio/webm"_ns};

// https://w3c.github.io/media-capabilities/#check-mime-type-support
ValidationResult CheckMIMETypeSupport(const MediaExtendedMIMEType& aMime,
                                      const AVType& aAVType,
                                      const MediaType& aMediaType) {
  // Step 1: If encodingOrDecodingType is webrtc (MediaEncodingType) or
  // webrtc (MediaDecodingType) and mimeType is not one that is used with
  // RTP (as defined in the specifications of the corresponding RTP payload
  // formats [IANA-MEDIA-TYPES] [RFC6838]), return unsupported.
  // TODO bug 1825286

  // Step 2: If colorGamut is present and is not valid for mimeType, return
  // unsupported.
  // TODO bug 1825286
  return Ok();
}

// Checks MIME type validity as per:
// https://w3c.github.io/media-capabilities/#check-mime-type-validity
// NOTE: Open issue, https://github.com/w3c/media-capabilities/issues/238
// "Do WebRTC encoding/decoding types have the single-codec restrictions?"
static ValidationResult CheckMIMETypeValidity(
    const MediaExtendedMIMEType& aMime, const AVType& aAVType,
    const MediaType& aMediaType) {
  // Step 1: If the type of mimeType per [RFC9110] is neither
  //         media nor application, return false.
  const MediaMIMEType& mimetype = aMime.Type();
  if (!mimetype.HasAudioMajorType() && !mimetype.HasVideoMajorType() &&
      !mimetype.HasApplicationMajorType()) {
    ValidationResult err =
        Err(aAVType == AVType::AUDIO ? ValidationError::InvalidAudioType
                                     : ValidationError::InvalidVideoType);
    LOG(
        ("[Invalid MIME Validity #1, %s] Rejecting - not media, not "
         "application %s",
         EnumValueToString(err.unwrapErr()), aMime.OriginalString().get()));
    return err;
  }

  // The following two steps don't appear to be explicitly defined in the spec
  // but are required for some WPT passes and seem like they'd make the most
  // sense to have here. The tests in question can be found here:
  // https://searchfox.org/firefox-main/rev/cd639e07f74b203d72b0f4a2bea757ae9e10401a/testing/web-platform/tests/media-capabilities/decodingInfo.any.js#140-161

  // Step 1a?: Test that decodingInfo rejects if the audio configuration
  // contentType is of type video
  if (aAVType == AVType::AUDIO && !aMime.Type().HasAudioMajorType()) {
    ValidationResult err = Err(ValidationError::InvalidAudioType);
    LOG(("[Invalid MIME Validity #1a?, %s] Rejecting '%s'",
         EnumValueToString(err.unwrapErr()), aMime.OriginalString().get()));
    return err;
  }

  // Step 1b?: Test that decodingInfo rejects if the video configuration
  // contentType is of type audio
  if (aAVType == AVType::VIDEO && !aMime.Type().HasVideoMajorType()) {
    ValidationResult err = Err(ValidationError::InvalidVideoType);
    LOG(("[Invalid MIME Validity #1b?, %s] Rejecting '%s'",
         EnumValueToString(err.unwrapErr()), aMime.OriginalString().get()));
    return err;
  }

  // Step 2: If the combined type and subtype members of mimeType allow a
  //         single media codec and the parameters member of mimeType is not
  //         empty, return false.
  //
  // (NOTE: WEBRTC EXCEPTION, SEE ISSUE)
  // https://github.com/w3c/media-capabilities/issues/238
  // TODO bug 1825286 (WebRTC)
  const size_t numParams = aMime.GetParameterCount();
  if (IsSingleCodecType(aMime) && numParams != 0) {
    ValidationResult err = Err(ValidationError::SingleCodecHasParams);
    LOG(("[Invalid MIME Validity #2, %s] Rejecting '%s'",
         EnumValueToString(err.unwrapErr()), aMime.OriginalString().get()));
    return err;
  }

  // Step 3: If the combined type and subtype members of mimeType allow
  // multiple media codecs, run the following steps:
  if (IsContainerType(aMime)) {
    // Step 3.1: If the parameters member of mimeType does not contain a single
    //            key named "codecs", return false.
    if ((numParams != 1) || !aMime.HaveCodecs()) {
      ValidationResult err = Err(ValidationError::ContainerMissingCodecsParam);
      LOG(("[Invalid MIME Validity #3.1, %s] Rejecting '%s'",
           EnumValueToString(err.unwrapErr()), aMime.OriginalString().get()));
      return err;
    }

    // Step 3.2: If the value of mimeType.parameters["codecs"] does not
    // describe a single media codec, return false.
    const auto& codecs = aMime.Codecs();
    if (!aMime.HaveCodecs() || codecs.IsEmpty() ||
        codecs.AsString().FindChar(',') != kNotFound) {
      ValidationResult err = Err(ValidationError::ContainerCodecsNotSingle);
      LOG(("[Invalid MIME #3.2, %s] Rejecting '%s'",
           EnumValueToString(err.unwrapErr()), aMime.OriginalString().get()));
      return err;
    }
  }

  // Step 4: Return true
  return Ok();
}

// https://w3c.github.io/media-capabilities/#audioconfiguration
ValidationResult IsValidAudioConfiguration(const AudioConfiguration& aConfig,
                                           const MediaType& aType) {
  // Step 1: Let mimeType be the result of running parse a MIME type with
  // configuration’s contentType.
  const Maybe<MediaExtendedMIMEType> mime =
      MakeMediaExtendedMIMEType(aConfig.mContentType);

  // Step 2: If mimeType is failure, return false.
  if (!mime) {
    ValidationResult err = Err(ValidationError::InvalidAudioType);
    LOG(("[Invalid AudioConfiguration #2, %s] Rejecting '%s'\n",
         EnumValueToString(err.unwrapErr()),
         NS_ConvertUTF16toUTF8(aConfig.mContentType).get()));
    return err;
  }

  // Return the result of running check MIME type validity with mimeType and
  // audio. The channels member represents the audio channels used by the audio
  // track. channels is only applicable to the decoding types media-source,
  // file, and webrtc and the encoding type webrtc.
  return CheckMIMETypeValidity(mime.ref(), AVType::AUDIO, aType);
}

// https://w3c.github.io/media-capabilities/#audioconfiguration
// To check if a VideoConfiguration configuration is a valid video
// configuration, the following steps MUST be run...
template <typename CodingType>
ValidationResult IsValidVideoConfiguration(const VideoConfiguration& aConfig,
                                           const CodingType& aType) {
  static_assert(std::is_same_v<std::decay_t<CodingType>, MediaEncodingType> ||
                    std::is_same_v<CodingType, MediaDecodingType>,
                "tType must be MediaEncodingType or MediaDecodingType");

  // Step 1: If framerate is not finite or is not greater than 0,
  // return false and abort these steps.
  if (!isfinite(aConfig.mFramerate) || !(aConfig.mFramerate > 0)) {
    ValidationResult err = Err(ValidationError::FramerateInvalid);
    LOG(("[Invalid VideoConfiguration (Framerate, %s) #1] Rejecting '%s'\n",
         EnumValueToString(err.unwrapErr()),
         NS_ConvertUTF16toUTF8(aConfig.mContentType).get()));
    return err;
  }

  if (aConfig.mWidth <= 0 || aConfig.mHeight <= 0) {
    ValidationResult err = Err(ValidationError::InvalidVideoConfiguration);
    LOG(
        ("[Invalid VideoConfiguration (Dimensions, %s) #1] Rejecting '%s' "
         "(width=%u, height=%u)\n",
         EnumValueToString(err.unwrapErr()),
         NS_ConvertUTF16toUTF8(aConfig.mContentType).get(), aConfig.mWidth,
         aConfig.mHeight));
    return err;
  }

  // Step 2: If an optional member is specified for a MediaDecodingType or
  // MediaEncodingType to which it’s not applicable, return false and abort
  // these steps. See applicability rules in the member definitions below.
  if constexpr (std::is_same_v<CodingType, MediaDecodingType>) {
    // hdrMetadataType is only applicable to MediaDecodingConfiguration
    // for types media-source and file.
    if (aConfig.mHdrMetadataType.WasPassed() &&
        aType != MediaDecodingType::File &&
        aType != MediaDecodingType::Media_source) {
      ValidationResult err = Err(ValidationError::InapplicableMember);
      LOG(("[Invalid VideoConfiguration (HDR, %s) #2] Rejecting '%s'\n",
           EnumValueToString(err.unwrapErr()),
           NS_ConvertUTF16toUTF8(aConfig.mContentType).get()));
      return err;
    }
    // colorGamut is only applicable to
    // MediaDecodingConfiguration for types media-source and file.
    if (aConfig.mColorGamut.WasPassed() && aType != MediaDecodingType::File &&
        aType != MediaDecodingType::Media_source) {
      ValidationResult err = Err(ValidationError::InapplicableMember);
      LOG(("[Invalid VideoConfiguration (Color Gamut, %s) #2] Rejecting '%s'\n",
           EnumValueToString(err.unwrapErr()),
           NS_ConvertUTF16toUTF8(aConfig.mContentType).get()));
      return err;
    }

    // transferFunction is only
    // applicable to MediaDecodingConfiguration for types media-source and file.
    if (aConfig.mTransferFunction.WasPassed() &&
        aType != MediaDecodingType::File &&
        aType != MediaDecodingType::Media_source) {
      ValidationResult err = Err(ValidationError::InapplicableMember);
      LOG(
          ("[Invalid VideoConfiguration (Transfer Function, %s) #2] Rejecting "
           "'%s'\n",
           EnumValueToString(err.unwrapErr()),
           NS_ConvertUTF16toUTF8(aConfig.mContentType).get()));
      return err;
    }
  }

  // ScalabilityMode is only applicable to MediaEncodingConfiguration
  // for type webrtc.
  // TODO bug 1825286

  // Step 3: Let mimeType be the result of running parse a MIME type with
  // configuration’s contentType.
  const Maybe<MediaExtendedMIMEType> mime =
      MakeMediaExtendedMIMEType(aConfig.mContentType);

  // Step 4: If mimeType is failure, return false.
  if (!mime) {
    ValidationResult err = Err(ValidationError::InvalidVideoType);
    LOG(("[Invalid VideoConfiguration (MIME failure, %s) #4] Rejecting '%s'\n",
         EnumValueToString(err.unwrapErr()),
         NS_ConvertUTF16toUTF8(aConfig.mContentType).get()));
    return err;
  }

  // Step 5: Return the result of running check MIME type validity
  // with mimeType and video.
  return CheckMIMETypeValidity(mime.ref(), AVType::VIDEO, AsVariant(aType));
}

template ValidationResult IsValidVideoConfiguration<MediaEncodingType>(
    const VideoConfiguration&, const MediaEncodingType&);
template ValidationResult IsValidVideoConfiguration<MediaDecodingType>(
    const VideoConfiguration&, const MediaDecodingType&);

ValidationResult IsValidVideoConfiguration(const VideoConfiguration& aConfig,
                                           const MediaType& aType) {
  return aType.match(
      [&](const MediaEncodingType& t) {
        return IsValidVideoConfiguration(aConfig, t);
      },
      [&](const MediaDecodingType& t) {
        return IsValidVideoConfiguration(aConfig, t);
      });
}

// https://w3c.github.io/media-capabilities/#mediaconfiguration
ValidationResult IsValidMediaConfiguration(const MediaConfiguration& aConfig,
                                           const MediaType& aType) {
  // Step 1: audio and/or video MUST exist.
  if (!aConfig.mVideo.WasPassed() && !aConfig.mAudio.WasPassed()) {
    ValidationResult err = Err(ValidationError::MissingType);
    LOG(("[Invalid Media Configuration (No A/V, %s) #1] '%s'",
         EnumValueToString(err.unwrapErr()),
         GetMIMEDebugString(aConfig).get()));
    return err;
  }

  // Step 2: audio MUST be a valid audio configuration if it exists.
  if (aConfig.mAudio.WasPassed()) {
    auto rv = IsValidAudioConfiguration(aConfig.mAudio.Value(), aType);
    if (rv.isErr()) {
      LOG(("[Invalid Media Configuration (Invalid Audio, %s) #2] '%s'",
           EnumValueToString(rv.unwrapErr()),
           GetMIMEDebugString(aConfig).get()));
      return rv;
    }
  }

  // Step 3: video MUST be a valid video configuration if it exists.
  if (aConfig.mVideo.WasPassed()) {
    auto rv = IsValidVideoConfiguration(aConfig.mVideo.Value(), aType);
    if (rv.isErr()) {
      LOG(("[Invalid Media Configuration (Invalid Video, %s) #3] '%s'",
           EnumValueToString(rv.unwrapErr()),
           GetMIMEDebugString(aConfig).get()));
      return rv;
    }
  }
  return Ok();
}

// No specific validation steps in the spec...
ValidationResult IsValidMediaEncodingConfiguration(
    const MediaEncodingConfiguration& aConfig) {
  return IsValidMediaConfiguration(aConfig, AsVariant(aConfig.mType));
}

// https://w3c.github.io/media-capabilities/#mediaconfiguration
ValidationResult IsValidMediaDecodingConfiguration(
    const MediaDecodingConfiguration& aConfig) {
  // For a MediaDecodingConfiguration to be a valid MediaDecodingConfiguration,
  // all of the following conditions MUST be true:

  // Step 1: It MUST be a valid MediaConfiguration.
  auto base = IsValidMediaConfiguration(aConfig, AsVariant(aConfig.mType));
  if (base.isErr()) {
    LOG(
        ("[Invalid MediaDecodingConfiguration (Invalid MediaConfiguration, %s) "
         "#1]",
         EnumValueToString(base.unwrapErr())));
    return base;
  }
  // Step 2: If keySystemConfiguration exists...
  if (aConfig.mKeySystemConfiguration.WasPassed()) {
    const auto& keySystemConfig = aConfig.mKeySystemConfiguration.Value();

    // Step 2.1: The type MUST be media-source or file.
    if (aConfig.mType != MediaDecodingType::File &&
        aConfig.mType != MediaDecodingType::Media_source) {
      ValidationResult err = Err(ValidationError::KeySystemWrongType);
      LOG(("[Invalid MediaDecodingConfiguration (keysystem, %s) #2.1]",
           EnumValueToString(err.unwrapErr())));
      return err;
    }

    // Step 2.2: If keySystemConfiguration.audio exists, audio MUST also exist.
    if (keySystemConfig.mAudio.WasPassed() && !aConfig.mAudio.WasPassed()) {
      ValidationResult err = Err(ValidationError::KeySystemAudioMissing);
      LOG(("[Invalid MediaDecodingConfiguration (keysystem, %s) #2.2]",
           EnumValueToString(err.unwrapErr())));
      return err;
    }

    // Step 2.3: If keySystemConfiguration.video exists, video MUST also exist.
    if (keySystemConfig.mVideo.WasPassed() && !aConfig.mVideo.WasPassed()) {
      ValidationResult err = Err(ValidationError::KeySystemVideoMissing);
      LOG(("[Invalid MediaDecodingConfiguration (keysystem, %s) #2.3]",
           EnumValueToString(err.unwrapErr())));
      return err;
    }
  }
  return Ok();
}

/////////////////////////////////
// Helper functions begin here //
/////////////////////////////////

void RejectWithValidationResult(Promise* aPromise, const ValidationError aErr) {
  switch (aErr) {
    case ValidationError::MissingType:
      aPromise->MaybeRejectWithTypeError(
          "'audio' or 'video' member of argument of MediaCapabilities");
      return;
    case ValidationError::InvalidAudioConfiguration:
      aPromise->MaybeRejectWithTypeError("Invalid AudioConfiguration!");
      return;
    case ValidationError::InvalidAudioType:
      aPromise->MaybeRejectWithTypeError(
          "Invalid AudioConfiguration MIME type");
      return;
    case ValidationError::InvalidVideoConfiguration:
      aPromise->MaybeRejectWithTypeError("Invalid VideoConfiguration!");
      return;
    case ValidationError::InvalidVideoType:
      aPromise->MaybeRejectWithTypeError("Invalid Video MIME type");
      return;
    case ValidationError::SingleCodecHasParams:
      aPromise->MaybeRejectWithTypeError("Single codec has parameters");
      return;
    case ValidationError::ContainerMissingCodecsParam:
      aPromise->MaybeRejectWithTypeError("Container missing codec parameters");
      return;
    case ValidationError::ContainerCodecsNotSingle:
      aPromise->MaybeRejectWithTypeError("Container has more than one codec");
      return;
    case ValidationError::FramerateInvalid:
      aPromise->MaybeRejectWithTypeError("Invalid frame rate");
      return;
    case ValidationError::InapplicableMember:
      aPromise->MaybeRejectWithTypeError("Inapplicable member");
      return;
    case ValidationError::KeySystemWrongType:
    case ValidationError::KeySystemAudioMissing:
    case ValidationError::KeySystemVideoMissing:
      aPromise->MaybeRejectWithTypeError("Invalid keysystem configuration");
      return;
    default:
      MOZ_ASSERT_UNREACHABLE("Unhandled MediaCapabilities validation error!");
      return;
  }
}

void ThrowWithValidationResult(ErrorResult& aRv, const ValidationError aErr) {
  switch (aErr) {
    case ValidationError::MissingType:
      aRv.ThrowTypeError<MSG_MISSING_REQUIRED_DICTIONARY_MEMBER>(
          "'audio' or 'video' member of argument of MediaCapabilities");
      return;
    case ValidationError::InvalidAudioConfiguration:
      aRv.ThrowTypeError<MSG_INVALID_MEDIA_AUDIO_CONFIGURATION>();
      return;
    case ValidationError::InvalidAudioType:
    case ValidationError::KeySystemAudioMissing:
      aRv.ThrowTypeError<MSG_INVALID_MEDIA_AUDIO_CONFIGURATION>();
      return;
    case ValidationError::InvalidVideoConfiguration:
    case ValidationError::InvalidVideoType:
    case ValidationError::SingleCodecHasParams:
    case ValidationError::ContainerMissingCodecsParam:
    case ValidationError::ContainerCodecsNotSingle:
    case ValidationError::FramerateInvalid:
    case ValidationError::InapplicableMember:
      aRv.ThrowTypeError<MSG_INVALID_MEDIA_VIDEO_CONFIGURATION>();
      return;
    case ValidationError::KeySystemWrongType:
    case ValidationError::KeySystemVideoMissing:
      aRv.ThrowTypeError<MSG_INVALID_MEDIA_VIDEO_CONFIGURATION>();
      return;
    default:
      MOZ_ASSERT_UNREACHABLE("Unhandled MediaCapabilities validation error!");
      return;
  }
}

template <size_t N>
static bool MimePrefixStartsWith(
    const MediaExtendedMIMEType& aMime,
    const std::array<nsLiteralCString, N>& aPrefixes) {
  const nsACString& s = aMime.OriginalString();
  return std::any_of(aPrefixes.begin(), aPrefixes.end(), [&](const auto& p) {
    return StringBeginsWith(s, p, nsCaseInsensitiveCStringComparator);
  });
}
static bool IsContainerType(const MediaExtendedMIMEType& aMime) {
  return MimePrefixStartsWith(aMime, kContainerTypes);
}
static bool IsSingleCodecType(const MediaExtendedMIMEType& aMime) {
  return MimePrefixStartsWith(aMime, kSingleWebRTCCodecTypes);
}

static nsAutoCString GetMIMEDebugString(const MediaConfiguration& aConfig) {
  nsAutoCString result;
  result.SetCapacity(64);
  result.AssignLiteral("Audio MIME: ");
  if (aConfig.mAudio.WasPassed()) {
    result.Append(NS_ConvertUTF16toUTF8(aConfig.mAudio.Value().mContentType));
  } else {
    result.AppendLiteral("(none)");
  }
  result.AppendLiteral(" Video MIME: ");
  if (aConfig.mVideo.WasPassed()) {
    result.Append(NS_ConvertUTF16toUTF8(aConfig.mVideo.Value().mContentType));
  } else {
    result.AppendLiteral("(none)");
  }
  return result;
}

}  // namespace mozilla::mediacaps
#undef LOG
