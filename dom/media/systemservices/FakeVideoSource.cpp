/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FakeVideoSource.h"

#include "ImageContainer.h"
#include "mozilla/CheckedInt.h"
#include "mozilla/SyncRunnable.h"
#include "mozilla/gfx/Tools.h"

#ifdef MOZ_WEBRTC
#  include "common/YuvStamper.h"
#  include "prtime.h"
#endif

using namespace mozilla::gfx;

namespace mozilla {

FakeVideoSource::FakeVideoSource(nsISerialEventTarget* aTarget)
    : mTarget(aTarget) {}

FakeVideoSource::~FakeVideoSource() = default;

int32_t FakeVideoSource::StartCapture(int32_t aWidth, int32_t aHeight,
                                      const TimeDuration& aFrameInterval) {
  MutexAutoLock lock(mMutex);

  mTimer = NS_NewTimer(mTarget.GetEventTarget());
  if (!mTimer) {
    return -1;
  }

  Maybe<int32_t> maybeYStride = GetAlignedStride<2>(aWidth, 1);
  if (!maybeYStride) {
    return -1;
  }
  CheckedInt32 yStride = *maybeYStride;
  CheckedInt<size_t> yLen = yStride.toChecked<size_t>() * aHeight;
  CheckedInt32 cbcrStride = yStride / 2;
  Maybe<int32_t> maybeHeightStride = GetAlignedStride<2>(aHeight, 1);
  if (!maybeHeightStride) {
    return -1;
  }
  CheckedInt<size_t> cbLen =
      cbcrStride.toChecked<size_t>() * *maybeHeightStride / 2;
  CheckedInt<size_t> crLen = cbLen;
  CheckedInt<size_t> frameLen = yLen + cbLen + crLen;
  if (!frameLen.isValid() || frameLen.value() == 0) {
    return -1;
  }
  MOZ_ASSERT(yStride.isValid());
  MOZ_ASSERT(yLen.isValid());
  MOZ_ASSERT(cbcrStride.isValid());
  MOZ_ASSERT(cbLen.isValid());
  MOZ_ASSERT(crLen.isValid());

  nsTArray<uint8_t> frame;
  if (!frame.SetLength(frameLen.value(), fallible)) {
    return -1;
  }

  auto data = std::make_unique<layers::PlanarYCbCrData>();
  data->mYChannel = frame.Elements();
  data->mYStride = yStride.value();
  data->mCbCrStride = cbcrStride.value();
  data->mCbChannel = data->mYChannel + yLen.value();
  data->mCrChannel = data->mCbChannel + cbLen.value();
  data->mPictureRect = IntRect(0, 0, aWidth, aHeight);
  data->mStereoMode = StereoMode::MONO;
  data->mYUVColorSpace = gfx::YUVColorSpace::BT601;
  data->mChromaSubsampling = gfx::ChromaSubsampling::HALF_WIDTH_AND_HEIGHT;

  MOZ_ALWAYS_SUCCEEDS(mTarget.Dispatch(NS_NewRunnableFunction(
      "FakeVideoSource::StartCapture",
      [self = RefPtr(this), this, aWidth, aHeight, frame = std::move(frame),
       data = std::move(data)]() mutable {
        mTarget.AssertOnCurrentThread();
        if (!mImageContainer) {
          mImageContainer = MakeAndAddRef<layers::ImageContainer>(
              layers::ImageUsageType::Webrtc,
              layers::ImageContainer::ASYNCHRONOUS);
        }
        mWidth = aWidth;
        mHeight = aHeight;
        mFrame = std::move(frame);
        mFrameData = std::move(data);
      })));

  // Start timer for subsequent frames
  mTimer->InitHighResolutionWithNamedFuncCallback(
      [](nsITimer* aTimer, void* aClosure) {
        RefPtr<FakeVideoSource> capturer =
            static_cast<FakeVideoSource*>(aClosure);
        capturer->mTarget.AssertOnCurrentThread();
        capturer->GenerateImage();
      },
      this, aFrameInterval, nsITimer::TYPE_REPEATING_PRECISE_CAN_SKIP,
      "FakeVideoSource::GenerateFrame"_ns);

  return 0;
}

int32_t FakeVideoSource::StopCapture() {
  MutexAutoLock lock(mMutex);

  if (!mTimer) {
    return 0;
  }

  mTimer->Cancel();
  mTimer = nullptr;

  MOZ_ALWAYS_SUCCEEDS(SyncRunnable::DispatchToThread(
      mTarget.GetEventTarget(),
      NS_NewRunnableFunction(
          "FakeVideoSource::StopCapture", [self = RefPtr(this), this] {
            mTarget.AssertOnCurrentThread();
            if (!mImageContainer) {
              mImageContainer = MakeAndAddRef<layers::ImageContainer>(
                  layers::ImageUsageType::Webrtc,
                  layers::ImageContainer::ASYNCHRONOUS);
            }
            mFrameData = nullptr;
            mFrame.Clear();
          })));

  return 0;
}

bool FakeVideoSource::CaptureStarted() {
  MutexAutoLock lock(mMutex);
  return mTimer;
}

void FakeVideoSource::SetTrackingId(uint32_t aTrackingIdProcId) {
  MOZ_ALWAYS_SUCCEEDS(mTarget.Dispatch(NS_NewRunnableFunction(
      "FakeVideoSource:::SetTrackingId",
      [self = RefPtr(this), this, aTrackingIdProcId] {
        mTarget.AssertOnCurrentThread();
        if (NS_WARN_IF(mTrackingId.isSome())) {
          // This capture instance must be shared across multiple camera
          // requests. For now ignore other requests than the first.
          return;
        }
        mTrackingId.emplace(TrackingId::Source::Camera, aTrackingIdProcId);
      })));
}

void FakeVideoSource::GenerateImage() {
  mTarget.AssertOnCurrentThread();

  const TimeStamp now = TimeStamp::Now();

  if (mTrackingId) {
    mCaptureRecorder.Start(0, "FakeVideoSource"_ns, *mTrackingId, mWidth,
                           mHeight, CaptureStage::ImageType::I420);
  }

  // Update the target color
  if (mCr <= 16) {
    if (mCb < 240) {
      mCb++;
    } else {
      mCr++;
    }
  } else if (mCb >= 240) {
    if (mCr < 240) {
      mCr++;
    } else {
      mCb--;
    }
  } else if (mCr >= 240) {
    if (mCb > 16) {
      mCb--;
    } else {
      mCr--;
    }
  } else {
    mCr--;
  }

  RefPtr<layers::PlanarYCbCrImage> ycbcr_image =
      mImageContainer->CreatePlanarYCbCrImage();
  const size_t yLen = mFrameData->mCbChannel - mFrameData->mYChannel;
  const size_t cbLen = mFrameData->mCrChannel - mFrameData->mCbChannel;
  const size_t crLen = cbLen;
  MOZ_RELEASE_ASSERT(mFrame.Length() == yLen + cbLen + crLen);
  memset(mFrame.Elements(), 0x80, yLen);
  memset(mFrame.Elements() + yLen, mCb, cbLen);
  memset(mFrame.Elements() + yLen + cbLen, mCr, crLen);

#ifdef MOZ_WEBRTC
  uint64_t timestamp = PR_Now();
  YuvStamper::Encode(mWidth, mHeight, mWidth, mFrameData->mYChannel,
                     reinterpret_cast<unsigned char*>(&timestamp),
                     sizeof(timestamp), 0, 0);
#endif

  bool copied = NS_SUCCEEDED(ycbcr_image->CopyData(*mFrameData));
  MOZ_ASSERT(copied);
  if (!copied) {
    return;
  }

  mGeneratedImageEvent.Notify(ycbcr_image, now);
  mCaptureRecorder.Record(0);
}

}  // namespace mozilla
