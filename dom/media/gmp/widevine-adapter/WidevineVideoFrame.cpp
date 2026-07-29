/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WidevineVideoFrame.h"

#include "GMPLog.h"
#include "WidevineUtils.h"
#include "mozilla/CheckedInt.h"
#include "mozilla/IntegerPrintfMacros.h"

namespace mozilla {

WidevineVideoFrame::WidevineVideoFrame()
    : mFormat(cdm::VideoFormat::kUnknownVideoFormat),
      mSize{0, 0},
      mBuffer(nullptr),
      mTimestamp(0) {
  MOZ_ASSERT(mSize.height == 0 && mSize.width == 0, "Size should be zeroed");
  GMP_LOG_DEBUG("WidevineVideoFrame::WidevineVideoFrame() this={}",
                fmt::ptr(this));
  memset(mPlaneOffsets, 0, sizeof(mPlaneOffsets));
  memset(mPlaneStrides, 0, sizeof(mPlaneStrides));
}

WidevineVideoFrame::WidevineVideoFrame(WidevineVideoFrame&& aOther)
    : mFormat(aOther.mFormat),
      mSize(aOther.mSize),
      mBuffer(aOther.mBuffer),
      mTimestamp(aOther.mTimestamp) {
  GMP_LOG_DEBUG(
      "WidevineVideoFrame::WidevineVideoFrame(WidevineVideoFrame&&) "
      "this={}, other={}",
      fmt::ptr(this), fmt::ptr(&aOther));
  memcpy(mPlaneOffsets, aOther.mPlaneOffsets, sizeof(mPlaneOffsets));
  memcpy(mPlaneStrides, aOther.mPlaneStrides, sizeof(mPlaneStrides));
  aOther.mBuffer = nullptr;
}

WidevineVideoFrame::~WidevineVideoFrame() {
  if (mBuffer) {
    mBuffer->Destroy();
    mBuffer = nullptr;
  }
}

void WidevineVideoFrame::SetFormat(cdm::VideoFormat aFormat) {
  GMP_LOG_DEBUG("WidevineVideoFrame::SetFormat({}) this={}",
                static_cast<int>(aFormat), fmt::ptr(this));
  mFormat = aFormat;
}

cdm::VideoFormat WidevineVideoFrame::Format() const { return mFormat; }

void WidevineVideoFrame::SetSize(cdm::Size aSize) {
  GMP_LOG_DEBUG("WidevineVideoFrame::SetSize({},{}) this={}", aSize.width,
                aSize.height, fmt::ptr(this));
  mSize.width = aSize.width;
  mSize.height = aSize.height;
}

cdm::Size WidevineVideoFrame::Size() const { return mSize; }

void WidevineVideoFrame::SetFrameBuffer(cdm::Buffer* aFrameBuffer) {
  GMP_LOG_DEBUG("WidevineVideoFrame::SetFrameBuffer({}) this={}",
                fmt::ptr(aFrameBuffer), fmt::ptr(this));
  MOZ_ASSERT(!mBuffer);
  mBuffer = aFrameBuffer;
}

cdm::Buffer* WidevineVideoFrame::FrameBuffer() { return mBuffer; }

void WidevineVideoFrame::SetPlaneOffset(cdm::VideoPlane aPlane,
                                        uint32_t aOffset) {
  GMP_LOG_DEBUG("WidevineVideoFrame::SetPlaneOffset({}, {}) this={}", aPlane,
                aOffset, fmt::ptr(this));
  mPlaneOffsets[aPlane] = aOffset;
}

uint32_t WidevineVideoFrame::PlaneOffset(cdm::VideoPlane aPlane) {
  return mPlaneOffsets[aPlane];
}

void WidevineVideoFrame::SetStride(cdm::VideoPlane aPlane, uint32_t aStride) {
  GMP_LOG_DEBUG("WidevineVideoFrame::SetStride({}, {}) this={}", aPlane,
                aStride, fmt::ptr(this));
  mPlaneStrides[aPlane] = aStride;
}

uint32_t WidevineVideoFrame::Stride(cdm::VideoPlane aPlane) {
  return mPlaneStrides[aPlane];
}

void WidevineVideoFrame::SetTimestamp(int64_t timestamp) {
  GMP_LOG_DEBUG("WidevineVideoFrame::SetTimestamp({}) this={}", timestamp,
                fmt::ptr(this));
  mTimestamp = timestamp;
}

int64_t WidevineVideoFrame::Timestamp() const { return mTimestamp; }

bool WidevineVideoFrame::InitToBlack(int32_t aWidth, int32_t aHeight,
                                     int64_t aTimeStamp) {
  if (NS_WARN_IF(aWidth < 0 || aHeight < 0)) {
    MOZ_ASSERT_UNREACHABLE("Frame dimensions should be positive");
    return false;
  }

  const uint32_t halfWidth = (uint32_t(aWidth) + 1) / 2;
  CheckedInt<size_t> ySizeChk = aWidth;
  ySizeChk *= aHeight;
  CheckedInt<size_t> uSizeChk = halfWidth;
  uSizeChk *= (uint32_t(aHeight) + 1) / 2;
  CheckedInt<size_t> yuSizeChk = ySizeChk + uSizeChk;
  if (NS_WARN_IF(!yuSizeChk.isValid())) {
    return false;
  }

  WidevineBuffer* buffer = new WidevineBuffer(yuSizeChk.value());
  const size_t ySize = ySizeChk.value();
  const size_t uSize = uSizeChk.value();
  // Black in YCbCr is (0,128,128).
  memset(buffer->Data(), 0, ySize);
  memset(buffer->Data() + ySize, 128, uSize);
  if (mBuffer) {
    mBuffer->Destroy();
    mBuffer = nullptr;
  }
  SetFormat(cdm::VideoFormat::kI420);
  SetSize(cdm::Size{aWidth, aHeight});
  SetFrameBuffer(buffer);
  SetPlaneOffset(cdm::kYPlane, 0);
  SetStride(cdm::kYPlane, aWidth);
  // Note: U and V planes are stored at the same place in order to
  // save memory since their contents are the same.
  SetPlaneOffset(cdm::kUPlane, ySize);
  SetStride(cdm::kUPlane, halfWidth);
  SetPlaneOffset(cdm::kVPlane, ySize);
  SetStride(cdm::kVPlane, halfWidth);
  SetTimestamp(aTimeStamp);
  return true;
}

}  // namespace mozilla
