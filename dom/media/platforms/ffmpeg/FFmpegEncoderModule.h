/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_PLATFORMS_FFMPEG_FFMPEGENCODERMODULE_H_
#define DOM_MEDIA_PLATFORMS_FFMPEG_FFMPEGENCODERMODULE_H_

#include "FFmpegLibWrapper.h"
#include "PlatformEncoderModule.h"
#include "mozilla/DataMutex.h"

namespace mozilla {

extern LazyLogModule sPEMLog;

template <int V>
class FFmpegEncoderModule final : public PlatformEncoderModule {
 public:
  virtual ~FFmpegEncoderModule() = default;

  static void Init(const FFmpegLibWrapper* aLib);

  static already_AddRefed<PlatformEncoderModule> Create(
      const FFmpegLibWrapper* aLib) {
    RefPtr<PlatformEncoderModule> pem = new FFmpegEncoderModule(aLib);
    return pem.forget();
  }
  media::EncodeSupportSet Supports(const EncoderConfig& aConfig) const override;
  media::EncodeSupportSet SupportsCodec(CodecType aCodec) const override;

  const char* GetName() const override { return "FFmpeg Encoder Module"; }

  already_AddRefed<MediaDataEncoder> CreateVideoEncoder(
      const EncoderConfig& aConfig,
      const RefPtr<TaskQueue>& aTaskQueue) const override;

  already_AddRefed<MediaDataEncoder> CreateAudioEncoder(
      const EncoderConfig& aConfig,
      const RefPtr<TaskQueue>& aTaskQueue) const override;

 protected:
  explicit FFmpegEncoderModule(const FFmpegLibWrapper* aLib) : mLib(aLib) {
    MOZ_ASSERT(mLib);
  }

 private:
  // This refers to a static FFmpegLibWrapper, so raw pointer is adequate.
  const FFmpegLibWrapper* mLib;  // set in constructor
  constinit static inline StaticDataMutex<nsTArray<uint32_t>>
      sSupportedHWCodecs{"sSupportedHWCodecs"};
};

}  // namespace mozilla

#endif /* DOM_MEDIA_PLATFORMS_FFMPEG_FFMPEGENCODERMODULE_H_ */
