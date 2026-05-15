/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef WMFMediaDataEncoder_h_
#define WMFMediaDataEncoder_h_

#include <comdef.h>

#include "MFTEncoder.h"
#include "PlatformEncoderModule.h"
#include "WMFDataEncoderUtils.h"
#include "WMFUtils.h"
#include "mozilla/WindowsProcessMitigations.h"

namespace mozilla {

class WMFMediaDataEncoder final : public MediaDataEncoder {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(WMFMediaDataEncoder, final);

  WMFMediaDataEncoder(const EncoderConfig& aConfig,
                      const RefPtr<TaskQueue>& aTaskQueue);

  RefPtr<InitPromise> Init() override;
  RefPtr<EncodePromise> Encode(const MediaData* aSample) override;
  RefPtr<EncodePromise> Encode(nsTArray<RefPtr<MediaData>>&& aSamples) override;
  RefPtr<EncodePromise> Drain() override;
  RefPtr<ShutdownPromise> Shutdown() override;
  RefPtr<GenericPromise> SetBitrate(uint32_t aBitsPerSec) override;
  bool IsHardwareAccelerated(nsACString& aFailureReason) const override {
    return mIsHardwareAccelerated;
  }

  RefPtr<ReconfigurationPromise> Reconfigure(
      const RefPtr<const EncoderConfigurationChangeList>& aConfigurationChanges)
      override;
  nsCString GetDescriptionName() const override;

 private:
  ~WMFMediaDataEncoder() = default;

  // Automatically lock/unlock IMFMediaBuffer.
  class LockBuffer final {
   public:
    explicit LockBuffer(RefPtr<IMFMediaBuffer>& aBuffer) : mBuffer(aBuffer) {
      mResult = mBuffer->Lock(&mBytes, &mCapacity, &mLength);
    }

    ~LockBuffer() {
      if (SUCCEEDED(mResult)) {
        mBuffer->Unlock();
      }
    }

    BYTE* Data() { return mBytes; }
    DWORD Capacity() { return mCapacity; }
    DWORD Length() { return mLength; }
    HRESULT Result() { return mResult; }

   private:
    RefPtr<IMFMediaBuffer> mBuffer;
    BYTE* mBytes{};
    DWORD mCapacity{};
    DWORD mLength{};
    HRESULT mResult{};
  };

  RefPtr<InitPromise> ProcessInit();

  HRESULT InitMFTEncoder(RefPtr<MFTEncoder>& aEncoder);
  void InitializeConfigData();
  void SetConfigData(const nsTArray<UINT8>& aHeader);

  RefPtr<EncodePromise> ProcessEncode(RefPtr<const VideoData>&& aSample);
  RefPtr<EncodePromise> ProcessEncodeBatch(
      nsTArray<RefPtr<const VideoData>>&& aSamples);
  RefPtr<EncodePromise> ProcessDrain();

  already_AddRefed<IMFSample> ConvertToNV12InputSample(
      RefPtr<const VideoData>&& aData);

  EncodedData ProcessOutputSamples(
      nsTArray<MFTEncoder::OutputSample>&& aSamples);
  already_AddRefed<MediaRawData> OutputSampleToMediaData(
      MFTEncoder::OutputSample& aSample);

  bool WriteFrameData(RefPtr<MediaRawData>& aDest, LockBuffer& aSrc,
                      bool aIsKeyframe);

  bool IsAnnexB() const;

  void AssertOnTaskQueue() { MOZ_ASSERT(mTaskQueue->IsCurrentThreadIn()); }

  EncoderConfig mConfig;
  const RefPtr<TaskQueue> mTaskQueue;
  const bool mHardwareNotAllowed;
  RefPtr<MFTEncoder> mEncoder;
  // SPS/PPS NALUs when encoding in AnnexB usage, avcC otherwise.
  RefPtr<MediaByteBuffer> mConfigData;

  // Can be accessed on any thread, but only written on during init.
  Atomic<bool> mIsHardwareAccelerated;

  // Both Encode and EncodeBatch share mEncodePromise and mEncodeRequest, as
  // concurrent calls are not allowed.
  MozPromiseHolder<EncodePromise> mEncodePromise;
  MozPromiseRequestHolder<MFTEncoder::EncodePromise> mEncodeRequest;

  MozPromiseHolder<EncodePromise> mDrainPromise;
  MozPromiseRequestHolder<MFTEncoder::EncodePromise> mDrainRequest;
};

}  // namespace mozilla

#endif
