/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#if !defined(WMFVideoMFTManager_h_)
#  define WMFVideoMFTManager_h_

#  include "MFTDecoder.h"
#  include "MediaResult.h"
#  include "PerformanceRecorder.h"
#  include "WMF.h"
#  include "WMFDecoderModule.h"
#  include "WMFMediaDataDecoder.h"
#  include "mozilla/Atomics.h"
#  include "mozilla/RefPtr.h"
#  include "mozilla/gfx/Rect.h"

namespace mozilla {

class DXVA2Manager;

class WMFVideoMFTManager : public MFTManager {
 public:
  WMFVideoMFTManager(const VideoInfo& aConfig,
                     layers::KnowsCompositor* aKnowsCompositor,
                     layers::ImageContainer* aImageContainer, float aFramerate,
                     const CreateDecoderParams::OptionSet& aOptions,
                     bool aDXVAEnabled, Maybe<TrackingId> aTrackingId);
  ~WMFVideoMFTManager();

  MediaResult Init();

  HRESULT Input(MediaRawData* aSample) override;

  HRESULT Output(int64_t aStreamOffset, RefPtr<MediaData>& aOutput) override;

  void Flush() override;

  void Shutdown() override;

  bool IsHardwareAccelerated(nsACString& aFailureReason) const override;

  TrackInfo::TrackType GetType() override { return TrackInfo::kVideoTrack; }

  nsCString GetDescriptionName() const override;

  MediaDataDecoder::ConversionRequired NeedsConversion() const override {
    return mStreamType == WMFStreamType::H264
               ? MediaDataDecoder::ConversionRequired::kNeedAnnexB
               : MediaDataDecoder::ConversionRequired::kNeedNone;
  }

 private:
  MediaResult ValidateVideoInfo();

  bool InitializeDXVA();

  MediaResult InitInternal();

  HRESULT CreateBasicVideoFrame(IMFSample* aSample, int64_t aStreamOffset,
                                VideoData** aOutVideoData);

  HRESULT CreateD3DVideoFrame(IMFSample* aSample, int64_t aStreamOffset,
                              VideoData** aOutVideoData);

  HRESULT SetDecoderMediaTypes();

  bool CanUseDXVA(IMFMediaType* aInputType, IMFMediaType* aOutputType);

  // Gets the duration from aSample, and if an unknown or invalid duration is
  // returned from WMF, this instead returns the last known input duration.
  // The sample duration is unknown per `IMFSample::GetSampleDuration` docs
  // 'If the retrieved duration is zero, or if the method returns
  // MF_E_NO_SAMPLE_DURATION, the duration is unknown'. The same API also
  // suggests it may return other unspecified error codes, so we handle those
  // too. It also returns a signed int, but since a negative duration doesn't
  // make sense, we also handle that case.
  media::TimeUnit GetSampleDurationOrLastKnownDuration(
      IMFSample* aSample) const;

  // Video frame geometry.
  const VideoInfo mVideoInfo;
  const gfx::IntSize mImageSize;
  const WMFStreamType mStreamType;

  // The size we update from the IMFMediaType which might include paddings when
  // the stream format changes. This is only used for software decoding.
  gfx::IntSize mSoftwareImageSize;

  // The picture size we update from the IMFMediaType when the stream format
  // changes. We assume it's equal to the image size by default (no cropping).
  // This is only used for software decoding.
  gfx::IntSize mSoftwarePictureSize;

  uint32_t mVideoStride;
  Maybe<gfx::YUVColorSpace> mColorSpace;
  gfx::ColorRange mColorRange;

  RefPtr<layers::ImageContainer> mImageContainer;
  RefPtr<layers::KnowsCompositor> mKnowsCompositor;
  UniquePtr<DXVA2Manager> mDXVA2Manager;

  media::TimeUnit mLastDuration;

  bool mDXVAEnabled;
  bool mUseHwAccel;

  bool mZeroCopyNV12Texture;

  nsCString mDXVAFailureReason;

  const GUID& GetMediaSubtypeGUID();

  uint32_t mNullOutputCount = 0;
  bool mGotValidOutputAfterNullOutput = false;
  bool mGotExcessiveNullOutput = false;
  bool mIsValid = true;
  bool mIMFUsable = false;
  const float mFramerate;
  const bool mLowLatency;

  PerformanceRecorderMulti<DecodeStage> mPerformanceRecorder;
  const Maybe<TrackingId> mTrackingId;
};

}  // namespace mozilla

#endif  // WMFVideoMFTManager_h_
