/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AppleEncoderModule.h"

#include "AppleUtils.h"
#include "AppleVTEncoder.h"
#include "VideoUtils.h"

using mozilla::media::EncodeSupport;
using mozilla::media::EncodeSupportSet;

namespace mozilla {

extern LazyLogModule sPEMLog;
#define LOGE(fmt, ...)                           \
  MOZ_LOG_FMT(sPEMLog, mozilla::LogLevel::Error, \
              "[AppleEncoderModule] {}: " fmt, __func__, ##__VA_ARGS__)
#define LOGD(fmt, ...)                           \
  MOZ_LOG_FMT(sPEMLog, mozilla::LogLevel::Debug, \
              "[AppleEncoderModule] {}: " fmt, __func__, ##__VA_ARGS__)

EncodeSupportSet AppleEncoderModule::SupportsCodec(CodecType aCodec) const {
  if (aCodec != CodecType::H264) {
    return EncodeSupportSet{};
  }
  return EncodeSupportSet{EncodeSupport::HardwareEncode,
                          EncodeSupport::SoftwareEncode};
}

EncodeSupportSet AppleEncoderModule::Supports(
    const EncoderConfig& aConfig) const {
  if (!CanLikelyEncode(aConfig)) {
    return EncodeSupportSet{};
  }
  // Only two temporal layers supported, and only from 11.3 and
  // more recent
  if (aConfig.mScalabilityMode == ScalabilityMode::L1T3 ||
      (aConfig.mScalabilityMode != ScalabilityMode::None && !OSSupportsSVC())) {
    return EncodeSupportSet{};
  }
  return SupportsCodec(aConfig.mCodec);
}

already_AddRefed<MediaDataEncoder> AppleEncoderModule::CreateVideoEncoder(
    const EncoderConfig& aConfig, const RefPtr<TaskQueue>& aTaskQueue) const {
  RefPtr<MediaDataEncoder> encoder(new AppleVTEncoder(aConfig, aTaskQueue));
  return encoder.forget();
}

#undef LOGE
#undef LOGD

}  // namespace mozilla
