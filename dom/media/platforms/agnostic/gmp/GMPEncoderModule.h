/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GMPEncoderModule_h_
#define GMPEncoderModule_h_

#include "PlatformEncoderModule.h"

namespace mozilla {
class GMPEncoderModule final : public PlatformEncoderModule {
 public:
  GMPEncoderModule() = default;

  already_AddRefed<MediaDataEncoder> CreateVideoEncoder(
      const EncoderConfig& aConfig,
      const RefPtr<TaskQueue>& aTaskQueue) const override;

  media::EncodeSupportSet Supports(const EncoderConfig& aConfig) const override;
  media::EncodeSupportSet SupportsCodec(CodecType aCodecType) const override;

  const char* GetName() const override { return "GMP Encoder Module"; }
};

}  // namespace mozilla

#endif /* GMPEncoderModule_h_ */
