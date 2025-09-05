/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef __FFmpegVideoDecoder_h__
#define __FFmpegVideoDecoder_h__

#include <atomic>

#include "ImageContainer.h"
#include "FFmpegDataDecoder.h"
#include "FFmpegLibWrapper.h"
#include "PerformanceRecorder.h"
#include "SimpleMap.h"
#include "mozilla/ScopeExit.h"
#include "nsTHashSet.h"
#if LIBAVCODEC_VERSION_MAJOR >= 57 && LIBAVUTIL_VERSION_MAJOR >= 56
#  include "mozilla/layers/TextureClient.h"
#endif
#if defined(MOZ_USE_HWDECODE) && defined(MOZ_WIDGET_GTK)
#  include "FFmpegVideoFramePool.h"
#endif
#include "libavutil/pixfmt.h"
#if LIBAVCODEC_VERSION_MAJOR < 54
#  define AVPixelFormat PixelFormat
#endif

struct _VADRMPRIMESurfaceDescriptor;
typedef struct _VADRMPRIMESurfaceDescriptor VADRMPRIMESurfaceDescriptor;

namespace mozilla {

class ImageBufferWrapper;

#ifdef MOZ_ENABLE_D3D11VA
class DXVA2Manager;
#endif

template <int V>
class FFmpegVideoDecoder : public FFmpegDataDecoder<V> {};

template <>
class FFmpegVideoDecoder<LIBAV_VER>;
DDLoggedTypeNameAndBase(FFmpegVideoDecoder<LIBAV_VER>,
                        FFmpegDataDecoder<LIBAV_VER>);

template <>
class FFmpegVideoDecoder<LIBAV_VER>
    : public FFmpegDataDecoder<LIBAV_VER>,
      public DecoderDoctorLifeLogger<FFmpegVideoDecoder<LIBAV_VER>> {
  typedef mozilla::layers::Image Image;
  typedef mozilla::layers::ImageContainer ImageContainer;
  typedef mozilla::layers::KnowsCompositor KnowsCompositor;
  typedef SimpleMap<int64_t, int64_t, ThreadSafePolicy> DurationMap;

 public:
  FFmpegVideoDecoder(FFmpegLibWrapper* aLib, const VideoInfo& aConfig,
                     KnowsCompositor* aAllocator,
                     ImageContainer* aImageContainer, bool aLowLatency,
                     bool aDisableHardwareDecoding,
                     Maybe<TrackingId> aTrackingId);

  ~FFmpegVideoDecoder();

  RefPtr<InitPromise> Init() override;
  void InitCodecContext() MOZ_REQUIRES(sMutex) override;
  nsCString GetDescriptionName() const override {
#ifdef USING_MOZFFVPX
    return "ffvpx video decoder"_ns;
#else
    return "ffmpeg video decoder"_ns;
#endif
  }
  nsCString GetCodecName() const override;
  ConversionRequired NeedsConversion() const override {
#if LIBAVCODEC_VERSION_MAJOR >= 55
    if (mCodecID == AV_CODEC_ID_HEVC) {
      return ConversionRequired::kNeedHVCC;
    }
#endif
    return mCodecID == AV_CODEC_ID_H264 ? ConversionRequired::kNeedAVCC
                                        : ConversionRequired::kNeedNone;
  }

  static AVCodecID GetCodecId(const nsACString& aMimeType);

#if LIBAVCODEC_VERSION_MAJOR >= 57 && LIBAVUTIL_VERSION_MAJOR >= 56
  int GetVideoBuffer(struct AVCodecContext* aCodecContext, AVFrame* aFrame,
                     int aFlags);
  int GetVideoBufferDefault(struct AVCodecContext* aCodecContext,
                            AVFrame* aFrame, int aFlags) {
    mIsUsingShmemBufferForDecode = Some(false);
    return mLib->avcodec_default_get_buffer2(aCodecContext, aFrame, aFlags);
  }
  void ReleaseAllocatedImage(ImageBufferWrapper* aImage) {
    mAllocatedImages.Remove(aImage);
  }
#endif
  bool IsHardwareAccelerated() const {
    nsAutoCString dummy;
    return IsHardwareAccelerated(dummy);
  }

 private:
  RefPtr<FlushPromise> ProcessFlush() override;
  void ProcessShutdown() override;
  MediaResult DoDecode(MediaRawData* aSample, uint8_t* aData, int aSize,
                       bool* aGotFrame, DecodedData& aResults) override;
  void OutputDelayedFrames();
  bool NeedParser() const override {
    return
#if LIBAVCODEC_VERSION_MAJOR >= 58
        false;
#else
#  if LIBAVCODEC_VERSION_MAJOR >= 55
        mCodecID == AV_CODEC_ID_VP9 ||
#  endif
        mCodecID == AV_CODEC_ID_VP8;
#endif
  }
  gfx::ColorDepth GetColorDepth(const AVPixelFormat& aFormat) const;
  gfx::YUVColorSpace GetFrameColorSpace() const;
  gfx::ColorSpace2 GetFrameColorPrimaries() const;
  gfx::ColorRange GetFrameColorRange() const;
  gfx::SurfaceFormat GetSurfaceFormat() const;

  MediaResult CreateImage(int64_t aOffset, int64_t aPts, int64_t aDuration,
                          MediaDataDecoder::DecodedData& aResults) const;

  bool IsHardwareAccelerated(nsACString& aFailureReason) const override;

#if LIBAVCODEC_VERSION_MAJOR >= 57 && LIBAVUTIL_VERSION_MAJOR >= 56
  layers::TextureClient* AllocateTextureClientForImage(
      struct AVCodecContext* aCodecContext, layers::PlanarYCbCrImage* aImage);

  gfx::IntSize GetAlignmentVideoFrameSize(struct AVCodecContext* aCodecContext,
                                          int32_t aWidth,
                                          int32_t aHeight) const;
#endif

  RefPtr<KnowsCompositor> mImageAllocator;

#ifdef MOZ_USE_HWDECODE
  // This will be called inside the ctor.
  void InitHWDecoderIfAllowed();

  enum class ContextType {
    D3D11VA,
    VAAPI,
    V4L2,
  };
  void InitHWCodecContext(ContextType aType);

  // True if hardware decoding is disabled explicitly.
  const bool mHardwareDecodingDisabled;
#endif

#ifdef MOZ_ENABLE_D3D11VA
  MediaResult InitD3D11VADecoder();

  MediaResult CreateImageD3D11(int64_t aOffset, int64_t aPts, int64_t aDuration,
                               MediaDataDecoder::DecodedData& aResults);
  bool CanUseZeroCopyVideoFrame() const;

  int32_t mTextureAlignment;
  AVBufferRef* mD3D11VADeviceContext = nullptr;
  RefPtr<ID3D11Device> mDevice;
  UniquePtr<DXVA2Manager> mDXVA2Manager;
  // Number of HW Textures are already in use by Gecko
  std::atomic<uint8_t> mNumOfHWTexturesInUse{0};
#endif

#if defined(MOZ_USE_HWDECODE) && defined(MOZ_WIDGET_GTK)
  bool ShouldEnableLinuxHWDecoding() const;
  MediaResult InitVAAPIDecoder();
  MediaResult InitV4L2Decoder();
  bool CreateVAAPIDeviceContext();
  AVCodec* FindVAAPICodec();
  bool GetVAAPISurfaceDescriptor(VADRMPRIMESurfaceDescriptor* aVaDesc);
  void AddAcceleratedFormats(nsTArray<AVCodecID>& aCodecList,
                             AVCodecID aCodecID, AVVAAPIHWConfig* hwconfig);
  nsTArray<AVCodecID> GetAcceleratedFormats();
  bool IsFormatAccelerated(AVCodecID aCodecID) const;

  MediaResult CreateImageVAAPI(int64_t aOffset, int64_t aPts, int64_t aDuration,
                               MediaDataDecoder::DecodedData& aResults);
  MediaResult CreateImageV4L2(int64_t aOffset, int64_t aPts, int64_t aDuration,
                              MediaDataDecoder::DecodedData& aResults);
  void AdjustHWDecodeLogging();

  AVBufferRef* mVAAPIDeviceContext = nullptr;
  bool mUsingV4L2 = false;
  VADisplay mDisplay = nullptr;
  UniquePtr<VideoFramePool<LIBAV_VER>> mVideoFramePool;
  static nsTArray<AVCodecID> mAcceleratedFormats;
#endif

  RefPtr<ImageContainer> mImageContainer;
  VideoInfo mInfo;

#if LIBAVCODEC_VERSION_MAJOR >= 58
  class DecodeStats {
   public:
    void DecodeStart();
    void UpdateDecodeTimes(const AVFrame* aFrame);
    bool IsDecodingSlow() const;

   private:
    uint32_t mDecodedFrames = 0;

    float mAverageFrameDecodeTime = 0;
    float mAverageFrameDuration = 0;

    // Number of delayed frames until we consider decoding as slow.
    const uint32_t mMaxLateDecodedFrames = 15;
    // How many frames is decoded behind its pts time, i.e. video decode lags.
    uint32_t mDecodedFramesLate = 0;

    // Reset mDecodedFramesLate every 3 seconds of correct playback.
    const uint32_t mDelayedFrameReset = 3000;

    uint32_t mLastDelayedFrameNum = 0;

    TimeStamp mDecodeStart;
  };

  DecodeStats mDecodeStats;
#endif

#if LIBAVCODEC_VERSION_MAJOR < 58
  class PtsCorrectionContext {
   public:
    PtsCorrectionContext();
    int64_t GuessCorrectPts(int64_t aPts, int64_t aDts);
    void Reset();
    int64_t LastDts() const { return mLastDts; }

   private:
    int64_t mNumFaultyPts;  /// Number of incorrect PTS values so far
    int64_t mNumFaultyDts;  /// Number of incorrect DTS values so far
    int64_t mLastPts;       /// PTS of the last frame
    int64_t mLastDts;       /// DTS of the last frame
  };

  PtsCorrectionContext mPtsContext;
  DurationMap mDurationMap;
#endif

  const bool mLowLatency;
  const Maybe<TrackingId> mTrackingId;
  PerformanceRecorderMulti<DecodeStage> mPerformanceRecorder;
  PerformanceRecorderMulti<DecodeStage> mPerformanceRecorder2;

  // True if we're allocating shmem for ffmpeg decode buffer.
  Maybe<Atomic<bool>> mIsUsingShmemBufferForDecode;

#if LIBAVCODEC_VERSION_MAJOR >= 57 && LIBAVUTIL_VERSION_MAJOR >= 56
  // These images are buffers for ffmpeg in order to store decoded data when
  // using custom allocator for decoding. We want to explictly track all images
  // we allocate to ensure that we won't leak any of them.
  //
  // All images tracked by mAllocatedImages are used by ffmpeg,
  // i.e. ffmpeg holds a reference to them and uses them in
  // its internal decoding queue.
  //
  // When an image is removed from mAllocatedImages it's recycled
  // for a new frame by AllocateTextureClientForImage() in
  // FFmpegVideoDecoder::GetVideoBuffer().
  nsTHashSet<RefPtr<ImageBufferWrapper>> mAllocatedImages;
#endif
};

#if LIBAVCODEC_VERSION_MAJOR >= 57 && LIBAVUTIL_VERSION_MAJOR >= 56
class ImageBufferWrapper final {
 public:
  typedef mozilla::layers::Image Image;
  typedef mozilla::layers::PlanarYCbCrImage PlanarYCbCrImage;

  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(ImageBufferWrapper)

  ImageBufferWrapper(Image* aImage, void* aDecoder)
      : mImage(aImage), mDecoder(aDecoder) {
    MOZ_ASSERT(aImage);
    MOZ_ASSERT(mDecoder);
  }

  Image* AsImage() { return mImage; }

  void ReleaseBuffer() {
    auto* decoder = static_cast<FFmpegVideoDecoder<LIBAV_VER>*>(mDecoder);
    decoder->ReleaseAllocatedImage(this);
  }

 private:
  ~ImageBufferWrapper() = default;
  const RefPtr<Image> mImage;
  void* const MOZ_NON_OWNING_REF mDecoder;
};
#endif

}  // namespace mozilla

#endif  // __FFmpegVideoDecoder_h__
