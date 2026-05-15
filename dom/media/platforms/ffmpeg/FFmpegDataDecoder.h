/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef FFmpegDataDecoder_h_
#define FFmpegDataDecoder_h_

#include "FFmpegLibWrapper.h"
#include "PlatformDecoderModule.h"
#include "mozilla/StaticMutex.h"

// This must be the last header included
#include "FFmpegLibs.h"

namespace mozilla {
#if defined(MOZ_WIDGET_ANDROID) && defined(USING_MOZFFVPX)
class MediaDrmCrypto;
class MediaDrmRemoteCDMParent;
#endif

template <int V>
class FFmpegDataDecoder : public MediaDataDecoder {};

template <>
class FFmpegDataDecoder<LIBAV_VER>;
DDLoggedTypeNameAndBase(FFmpegDataDecoder<LIBAV_VER>, MediaDataDecoder);

template <>
class FFmpegDataDecoder<LIBAV_VER>
    : public MediaDataDecoder,
      public DecoderDoctorLifeLogger<FFmpegDataDecoder<LIBAV_VER>> {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(FFmpegDataDecoder, final);

  FFmpegDataDecoder(const FFmpegLibWrapper* aLib, AVCodecID aCodecID,
                    PRemoteCDMActor* aCDM);

  static bool Link();

  RefPtr<InitPromise> Init() override = 0;
  RefPtr<DecodePromise> Decode(MediaRawData* aSample) override;
  RefPtr<DecodePromise> Drain() override;
  RefPtr<FlushPromise> Flush() override;
  RefPtr<ShutdownPromise> Shutdown() override;

  static AVCodec* FindSoftwareAVCodec(const FFmpegLibWrapper* aLib,
                                      AVCodecID aCodec);
#ifdef MOZ_USE_HWDECODE
  static AVCodec* FindHardwareAVCodec(
      const FFmpegLibWrapper* aLib, AVCodecID aCodec,
      AVHWDeviceType aDeviceType = AV_HWDEVICE_TYPE_NONE);
#endif

 protected:
  // Flush and Drain operation, always run
  virtual RefPtr<FlushPromise> ProcessFlush();
  virtual void ProcessShutdown();
  virtual void InitCodecContext() MOZ_REQUIRES(sMutex) {}
  void ReleaseCodecContext() MOZ_REQUIRES(sMutex);
  AVFrame* PrepareFrame();
  void ReleaseFrame();
  MediaResult InitSWDecoder(AVDictionary** aOptions);
  MediaResult InitDecoder(AVCodec* aCodec, AVDictionary** aOptions);
  MediaResult AllocateExtraData();
  MediaResult DoDecode(MediaRawData* aSample, bool* aGotFrame,
                       DecodedData& aResults);

#if defined(MOZ_WIDGET_ANDROID) && defined(USING_MOZFFVPX)
  static void CryptoInfoAddRef(void* aCryptoInfo);
  static void CryptoInfoRelease(void* aCryptoInfo);
  MediaResult MaybeAttachCryptoInfo(MediaRawData* aSample, AVPacket* aPacket);
  MediaResult MaybeAttachCDM();
  void MaybeDetachCDM();
#endif

  const FFmpegLibWrapper* mLib;  // set in constructor

  // mCodecContext is accessed on taskqueue only, no locking needed
  AVCodecContext* mCodecContext;
  AVCodecParserContext* mCodecParser;
  AVFrame* mFrame;
  RefPtr<MediaByteBuffer> mExtraData;
#if defined(MOZ_WIDGET_ANDROID) && defined(FFVPX_VERSION)
  RefPtr<MediaDrmCrypto> mCrypto;
  RefPtr<MediaDrmRemoteCDMParent> mCDM;
#endif
  AVCodecID mCodecID;  // set in constructor
  bool mVideoCodec;

 protected:
  virtual ~FFmpegDataDecoder();

  static StaticMutex sMutex;  // used to provide critical-section locking
                              // for calls into ffmpeg
  const RefPtr<TaskQueue> mTaskQueue;  // set in constructor

  RefPtr<DecodePromise> ProcessDrain();
  MozPromiseHolder<DecodePromise> mDrainPromise;

 private:
  RefPtr<DecodePromise> ProcessDecode(MediaRawData* aSample);
  virtual MediaResult DoDecode(MediaRawData* aSample, uint8_t* aData, int aSize,
                               bool* aGotFrame,
                               MediaDataDecoder::DecodedData& aOutResults) = 0;
  virtual bool NeedParser() const { return false; }
  virtual int ParserFlags() const { return PARSER_FLAG_COMPLETE_FRAMES; }

  MozPromiseHolder<DecodePromise> mPromise;
  media::TimeUnit mLastInputDts;  // used on Taskqueue
};

}  // namespace mozilla

#endif  // FFmpegDataDecoder_h_
