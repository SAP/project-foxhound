/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef FFmpegVideoDecoder_h_
#define FFmpegVideoDecoder_h_

#include <atomic>

#include "AndroidSurfaceTexture.h"
#include "FFmpegDataDecoder.h"
#include "FFmpegLibWrapper.h"
#include "ImageContainer.h"
#include "PerformanceRecorder.h"
#include "SimpleMap.h"
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

#ifdef MOZ_WIDGET_ANDROID
#  include "mozilla/java/GeckoSurfaceWrappers.h"
#endif

#if LIBAVCODEC_VERSION_MAJOR < 58 || defined(MOZ_WIDGET_ANDROID)
#  define MOZ_FFMPEG_USE_INPUT_INFO_MAP
#endif

struct _VADRMPRIMESurfaceDescriptor;
typedef struct _VADRMPRIMESurfaceDescriptor VADRMPRIMESurfaceDescriptor;

namespace mozilla {
namespace layers {
class BufferRecycleBin;
}

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

 public:
  FFmpegVideoDecoder(const FFmpegLibWrapper* aLib, const VideoInfo& aConfig,
                     KnowsCompositor* aAllocator,
                     ImageContainer* aImageContainer, bool aLowLatency,
                     bool aDisableHardwareDecoding, bool a8BitOutput,
                     Maybe<TrackingId> aTrackingId, PRemoteCDMActor* aCDM);

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
#ifdef MOZ_WIDGET_ANDROID
    return mCodecID == AV_CODEC_ID_H264 || mCodecID == AV_CODEC_ID_HEVC
               ? ConversionRequired::kNeedAnnexB
               : ConversionRequired::kNeedNone;
#else
#  if LIBAVCODEC_VERSION_MAJOR >= 55
    if (mCodecID == AV_CODEC_ID_HEVC) {
      return ConversionRequired::kNeedHVCC;
    }
#  endif
    return mCodecID == AV_CODEC_ID_H264 ? ConversionRequired::kNeedAVCC
                                        : ConversionRequired::kNeedNone;
#endif
  }

#ifdef MOZ_WIDGET_ANDROID
  Maybe<MediaDataDecoder::PropertyValue> GetDecodeProperty(
      MediaDataDecoder::PropertyName aName) const override;
#endif

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
                          MediaDataDecoder::DecodedData& aResults);

  bool IsHardwareAccelerated(nsACString& aFailureReason) const override;

#if LIBAVCODEC_VERSION_MAJOR >= 57 && LIBAVUTIL_VERSION_MAJOR >= 56
  layers::TextureClient* AllocateTextureClientForImage(
      struct AVCodecContext* aCodecContext, layers::PlanarYCbCrImage* aImage);

  gfx::IntSize GetAlignmentVideoFrameSize(struct AVCodecContext* aCodecContext,
                                          int32_t aWidth,
                                          int32_t aHeight) const;
#endif

  RefPtr<KnowsCompositor> mImageAllocator;
  RefPtr<ImageContainer> mImageContainer;
  VideoInfo mInfo;

#ifdef MOZ_USE_HWDECODE
 public:
  static AVCodec* FindVideoHardwareAVCodec(
      const FFmpegLibWrapper* aLib, AVCodecID aCodec,
      AVHWDeviceType aDeviceType = AV_HWDEVICE_TYPE_NONE);

 private:
  // This will be called inside the ctor.
  void InitHWDecoderIfAllowed();

  enum class ContextType {
    D3D11VA,     // Windows
    MediaCodec,  // Android
    VAAPI,       // Linux Desktop
    V4L2,        // Linux embedded
  };
  void InitHWCodecContext(ContextType aType);

  bool ShouldDisableHWDecoding(bool aDisableHardwareDecoding) const;

  // True if hardware decoding is disabled explicitly.
  const bool mHardwareDecodingDisabled;
#endif

#ifdef MOZ_ENABLE_D3D11VA
  MediaResult InitD3D11VADecoder();

  MediaResult CreateImageD3D11(int64_t aOffset, int64_t aPts, int64_t aDuration,
                               MediaDataDecoder::DecodedData& aResults);
  bool CanUseZeroCopyVideoFrame() const;

  AVBufferRef* mD3D11VADeviceContext = nullptr;
  RefPtr<ID3D11Device> mDevice;
  UniquePtr<DXVA2Manager> mDXVA2Manager;
  // Number of HW Textures are already in use by Gecko
  std::atomic<uint8_t> mNumOfHWTexturesInUse{0};
#endif

#ifdef MOZ_WIDGET_ANDROID
#  ifdef USING_MOZFFVPX
  MediaResult AllocateExtraData();
#  endif
  MediaResult InitMediaCodecDecoder();
  MediaResult CreateImageMediaCodec(int64_t aOffset, int64_t aPts,
                                    int64_t aTimecode, int64_t aDuration,
                                    MediaDataDecoder::DecodedData& aResults);
  bool ReleaseFrameMediaCodec(void* aKey, bool aRender);
  void ReleaseFramesMediaCodec();
  int32_t mTextureAlignment;
  AVBufferRef* mMediaCodecDeviceContext = nullptr;
  java::GeckoSurface::GlobalRef mSurface;
  AndroidSurfaceTextureHandle mSurfaceHandle{};
  SimpleMap<void*, AVFrame*, ThreadSafePolicy> mFrameMap;
#endif

#if defined(MOZ_USE_HWDECODE) && defined(MOZ_WIDGET_GTK)
  bool UploadSWDecodeToDMABuf() const;
  bool IsLinuxHDR() const;
  MediaResult InitVAAPIDecoder();
  MediaResult InitV4L2Decoder();
  bool CreateVAAPIDeviceContext();
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
  // If video overlay is used we want to upload SW decoded frames to
  // DMABuf and present it as a external texture to rendering pipeline.
  bool mUploadSWDecodeToDMABuf = false;
  VADisplay mDisplay = nullptr;
  UniquePtr<VideoFramePool<LIBAV_VER>> mVideoFramePool;
  static nsTArray<AVCodecID> mAcceleratedFormats;
#endif

#if LIBAVCODEC_VERSION_MAJOR >= 58
  class DecodeStats {
   public:
    void DecodeStart();
    void UpdateDecodeTimes(int64_t aDuration);
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

#if LIBAVCODEC_VERSION_MAJOR >= 58
  bool mHasSentDrainPacket = false;
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
#endif

#ifdef MOZ_FFMPEG_USE_INPUT_INFO_MAP
  struct InputInfo {
    explicit InputInfo(const MediaRawData* aSample)
        : mDuration(aSample->mDuration.ToMicroseconds())
#  ifdef MOZ_WIDGET_ANDROID
          ,
          mTimecode(aSample->mTimecode.ToMicroseconds())
#  endif
    {
    }

    int64_t mDuration;
#  ifdef MOZ_WIDGET_ANDROID
    int64_t mTimecode;
#  endif
  };

  SimpleMap<int64_t, InputInfo, ThreadSafePolicy> mInputInfo;

  static int64_t GetSampleInputKey(const MediaRawData* aSample) {
#  ifdef MOZ_WIDGET_ANDROID
    return aSample->mTime.ToMicroseconds();
#  else
    return aSample->mTimecode.ToMicroseconds();
#  endif
  }

  static int64_t GetFrameInputKey(const AVFrame* aFrame) {
#  ifdef MOZ_WIDGET_ANDROID
    return aFrame->pts;
#  else
    return aFrame->pkt_dts;
#  endif
  }

  void InsertInputInfo(const MediaRawData* aSample) {
    // LibAV provides no API to retrieve the decoded sample's duration.
    // (FFmpeg >= 1.0 provides av_frame_get_pkt_duration)
    // Additionally some platforms (e.g. Android) do not supply a valid duration
    // after decoding. As such we instead use a map using the given ts as key
    // that we will retrieve later. The map will have a typical size of 16
    // entry.
    mInputInfo.Insert(GetSampleInputKey(aSample), InputInfo(aSample));
  }

  void TakeInputInfo(const AVFrame* aFrame, InputInfo& aEntry) {
    // Retrieve duration from the given ts.
    // We use the first entry found matching this ts (this is done to
    // handle damaged file with multiple frames with the same ts)
    if (!mInputInfo.Find(GetFrameInputKey(aFrame), aEntry)) {
      NS_WARNING("Unable to retrieve input info from map");
      // dts are probably incorrectly reported ; so clear the map as we're
      // unlikely to find them in the future anyway. This also guards
      // against the map becoming extremely big.
      mInputInfo.Clear();
    }
  }
#endif

  const bool mLowLatency;
  const Maybe<TrackingId> mTrackingId;

  void RecordFrame(const MediaRawData* aSample, const MediaData* aData);

  PerformanceRecorderMulti<DecodeStage> mPerformanceRecorder;

  bool MaybeQueueDrain(const MediaDataDecoder::DecodedData& aData);
#ifdef MOZ_WIDGET_ANDROID
  void QueueResumeDrain();
  void ResumeDrain();

  Atomic<bool> mShouldResumeDrain{false};
#endif

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

  // Convert dav1d output to 8-bit when GPU doesn't support higher bit images.
  // See bug 1970771 for details.
  Atomic<bool> m8BitOutput;
  RefPtr<layers::BufferRecycleBin> m8BitRecycleBin;
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

#endif  // FFmpegVideoDecoder_h_
