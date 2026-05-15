/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <algorithm>

#include "AnnexB.h"
#include "BufferReader.h"
#include "H264.h"
#include "ImageContainer.h"
#include "PEMFactory.h"
#include "TimeUnits.h"
#include "VPXDecoder.h"
#include "VideoUtils.h"
#include "gtest/gtest.h"
#include "mozilla/AbstractThread.h"
#include "mozilla/Preferences.h"
#include "mozilla/SpinEventLoopUntil.h"
#include "mozilla/gtest/WaitFor.h"
#include "mozilla/media/MediaUtils.h"  // For media::Await

#ifdef MOZ_WIDGET_ANDROID
// Create/init a H.264 encoder and check if it's SW.
#  define SKIP_IF_ANDROID_SW()                                                \
    do {                                                                      \
      RefPtr<MediaDataEncoder> e = CreateH264Encoder(                         \
          Usage::Record,                                                      \
          EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),       \
          kImageSize, ScalabilityMode::None, AsVariant(kH264SpecificAnnexB)); \
      if (EnsureInit(e)) {                                                    \
        nsCString dummy;                                                      \
        bool isSW = !e->IsHardwareAccelerated(dummy);                         \
        WaitForShutdown(e);                                                   \
        if (isSW) {                                                           \
          return;                                                             \
        }                                                                     \
      }                                                                       \
    } while (0)
#else
#  define SKIP_IF_ANDROID_SW() \
    do {                       \
    } while (0)
#endif

#define RUN_IF_SUPPORTED(codecType, test)         \
  do {                                            \
    RefPtr<PEMFactory> f(new PEMFactory());       \
    if (!f->SupportsCodec(codecType).isEmpty()) { \
      test();                                     \
    }                                             \
  } while (0)

#define GET_OR_RETURN_ON_ERROR(expr)                      \
  __extension__({                                         \
    auto mozTryVarTempResult = ::mozilla::ToResult(expr); \
    if (MOZ_UNLIKELY(mozTryVarTempResult.isErr())) {      \
      EXPECT_TRUE(false);                                 \
      return;                                             \
    }                                                     \
    mozTryVarTempResult.unwrap();                         \
  })

#define BLOCK_SIZE 64
#define NUM_FRAMES 150UL
#define FRAME_RATE 30
#define FRAME_DURATION (1000000 / FRAME_RATE)
#define BIT_RATE (1000 * 1000)  // 1Mbps
#define BIT_RATE_MODE BitrateMode::Variable
#define KEYFRAME_INTERVAL FRAME_RATE  // 1 keyframe per second

using namespace mozilla;

static gfx::IntSize kImageSize(640, 480);
static gfx::IntSize kImageSize4K(3840, 2160);
// Set codec to avc1.42001E - Base profile, constraint 0, level 30.
MOZ_RUNINIT const H264Specific kH264SpecificAnnexB(H264_PROFILE_BASE,
                                                   H264_LEVEL::H264_LEVEL_3,
                                                   H264BitStreamFormat::ANNEXB);
MOZ_RUNINIT const H264Specific kH264SpecificAVCC(H264_PROFILE_BASE,
                                                 H264_LEVEL::H264_LEVEL_3,
                                                 H264BitStreamFormat::AVC);

class MediaDataEncoderTest : public testing::Test {
 protected:
  void SetUp() override {
    mData.Init(kImageSize);
    mData4K.Init(kImageSize4K);
  }

  void TearDown() override {
    mData.Deinit();
    mData4K.Deinit();
  }

 public:
  struct FrameSource final {
    gfx::IntSize mSize = gfx::IntSize(0, 0);
    layers::PlanarYCbCrData mYUV;
    UniquePtr<uint8_t[]> mBuffer;
    RefPtr<layers::BufferRecycleBin> mRecycleBin;
    int16_t mColorStep = 4;

    gfx::IntSize GetSize() const { return mSize; }

    void Init(const gfx::IntSize& aSize) {
      mSize = aSize;
      mYUV.mPictureRect = gfx::IntRect(0, 0, aSize.width, aSize.height);
      mYUV.mYStride = aSize.width;
      mYUV.mCbCrStride = (aSize.width + 1) / 2;
      mYUV.mChromaSubsampling = gfx::ChromaSubsampling::HALF_WIDTH_AND_HEIGHT;
      auto ySize = mYUV.YDataSize();
      auto cbcrSize = mYUV.CbCrDataSize();
      size_t bufferSize =
          mYUV.mYStride * ySize.height + 2 * mYUV.mCbCrStride * cbcrSize.height;
      mBuffer = MakeUnique<uint8_t[]>(bufferSize);
      std::fill_n(mBuffer.get(), bufferSize, 0x7F);
      mYUV.mYChannel = mBuffer.get();
      mYUV.mCbChannel = mYUV.mYChannel + mYUV.mYStride * ySize.height;
      mYUV.mCrChannel = mYUV.mCbChannel + mYUV.mCbCrStride * cbcrSize.height;
      mYUV.mChromaSubsampling = gfx::ChromaSubsampling::HALF_WIDTH_AND_HEIGHT;
      mRecycleBin = new layers::BufferRecycleBin();
    }

    void Deinit() {
      mBuffer.reset();
      mRecycleBin = nullptr;
      mSize = gfx::IntSize(0, 0);
    }

    already_AddRefed<MediaData> GetFrame(const size_t aIndex) {
      Draw(aIndex);
      RefPtr<layers::PlanarYCbCrImage> img =
          new layers::RecyclingPlanarYCbCrImage(mRecycleBin);
      img->CopyData(mYUV);
      RefPtr<MediaData> frame = VideoData::CreateFromImage(
          kImageSize, 0,
          // The precise time unit should be media::TimeUnit(1, FRAME_RATE)
          // instead of media::TimeUnit(FRAME_DURATION, USECS_PER_S)
          // (FRAME_DURATION microseconds), but this setting forces us to take
          // care some potential rounding issue, e.g., when converting to a time
          // unit based in FRAME_RATE by TimeUnit::ToTicksAtRate(FRAME_RATE),
          // the time unit would be calculated from 999990 / 1000000, which
          // could be zero.
          media::TimeUnit::FromMicroseconds(AssertedCast<int64_t>(aIndex) *
                                            FRAME_DURATION),
          media::TimeUnit::FromMicroseconds(FRAME_DURATION), img,
          (aIndex & 0xF) == 0,
          media::TimeUnit::FromMicroseconds(AssertedCast<int64_t>(aIndex) *
                                            FRAME_DURATION));
      return frame.forget();
    }

    void DrawChessboard(uint8_t* aAddr, const size_t aWidth,
                        const size_t aHeight, const size_t aOffset) {
      uint8_t pixels[2][BLOCK_SIZE];
      size_t x = aOffset % BLOCK_SIZE;
      if ((aOffset / BLOCK_SIZE) & 1) {
        x = BLOCK_SIZE - x;
      }
      for (size_t i = 0; i < x; i++) {
        pixels[0][i] = 0x00;
        pixels[1][i] = 0xFF;
      }
      for (size_t i = x; i < BLOCK_SIZE; i++) {
        pixels[0][i] = 0xFF;
        pixels[1][i] = 0x00;
      }

      uint8_t* p = aAddr;
      for (size_t row = 0; row < aHeight; row++) {
        for (size_t col = 0; col < aWidth; col += BLOCK_SIZE) {
          memcpy(p, pixels[((row / BLOCK_SIZE) + (col / BLOCK_SIZE)) % 2],
                 BLOCK_SIZE);
          p += BLOCK_SIZE;
        }
      }
    }

    void Draw(const size_t aIndex) {
      auto ySize = mYUV.YDataSize();
      DrawChessboard(mYUV.mYChannel, ySize.width, ySize.height, aIndex << 1);
      int16_t color = AssertedCast<int16_t>(mYUV.mCbChannel[0] + mColorStep);
      if (color > 255 || color < 0) {
        mColorStep = AssertedCast<int16_t>(-mColorStep);
        color = AssertedCast<int16_t>(mYUV.mCbChannel[0] + mColorStep);
      }

      size_t size = (mYUV.mCrChannel - mYUV.mCbChannel);

      std::fill_n(mYUV.mCbChannel, size, static_cast<uint8_t>(color));
      std::fill_n(mYUV.mCrChannel, size, 0xFF - static_cast<uint8_t>(color));
    }
  };

 public:
  FrameSource mData;
  FrameSource mData4K;
};

already_AddRefed<MediaDataEncoder> CreateVideoEncoder(
    CodecType aCodec, Usage aUsage, EncoderConfig::SampleFormat aFormat,
    gfx::IntSize aSize, ScalabilityMode aScalabilityMode,
    const EncoderConfig::CodecSpecific& aSpecific) {
  RefPtr<PEMFactory> f(new PEMFactory());

  if (f->SupportsCodec(aCodec).isEmpty()) {
    return nullptr;
  }

  const EncoderConfig config(
      aCodec, aSize, aUsage, aFormat, FRAME_RATE /* FPS */,
      KEYFRAME_INTERVAL /* keyframe interval */, BIT_RATE /* bitrate */, 0, 0,
      BIT_RATE_MODE, HardwarePreference::None /* hardware preference */,
      aScalabilityMode, aSpecific);
  if (f->Supports(config).isEmpty()) {
    return nullptr;
  }

  const RefPtr<TaskQueue> taskQueue(
      TaskQueue::Create(GetMediaThreadPool(MediaThreadType::PLATFORM_ENCODER),
                        "TestMediaDataEncoder"));
  RefPtr<MediaDataEncoder> e = f->CreateEncoder(config, taskQueue);
  return e.forget();
}

static bool EnsureInit(const RefPtr<MediaDataEncoder>& aEncoder) {
  if (!aEncoder) {
    return false;
  }
  auto r = WaitFor(aEncoder->Init());
  return r.isOk();
}

void WaitForShutdown(const RefPtr<MediaDataEncoder>& aEncoder) {
  MOZ_RELEASE_ASSERT(aEncoder);

  Maybe<bool> result;
  // media::Await() supports exclusive promises only, but ShutdownPromise is
  // not.
  aEncoder->Shutdown()->Then(
      AbstractThread::MainThread(), __func__,
      [&result](bool rv) {
        EXPECT_TRUE(rv);
        result = Some(true);
      },
      []() { FAIL() << "Shutdown should never be rejected"; });
  SpinEventLoopUntil("TestMediaDataEncoder.cpp:WaitForShutdown"_ns,
                     [&result]() { return result; });
}

static Result<MediaDataEncoder::EncodedData, MediaResult> Drain(
    const RefPtr<MediaDataEncoder>& aEncoder) {
  MOZ_RELEASE_ASSERT(aEncoder);

  size_t pending = 0;
  MediaDataEncoder::EncodedData output;
  do {
    MediaDataEncoder::EncodedData data = MOZ_TRY(WaitFor(aEncoder->Drain()));
    pending = data.Length();
    output.AppendElements(std::move(data));
  } while (pending > 0);

  return output;
}

struct EncodeResult {
  MediaDataEncoder::EncodedData mEncodedData;
  size_t mInputKeyframes = 0;
};
static Result<EncodeResult, MediaResult> EncodeWithInputStats(
    const RefPtr<MediaDataEncoder>& aEncoder, const size_t aNumFrames,
    MediaDataEncoderTest::FrameSource& aSource) {
  MOZ_RELEASE_ASSERT(aEncoder);

  size_t inputKeyframes = 0;
  MediaDataEncoder::EncodedData output;
  for (size_t i = 0; i < aNumFrames; i++) {
    RefPtr<MediaData> frame = aSource.GetFrame(i);
    if (frame->mKeyframe) {
      inputKeyframes++;
    }
    output.AppendElements(MOZ_TRY(WaitFor(aEncoder->Encode(frame))));
  }
  output.AppendElements(std::move(MOZ_TRY(Drain(aEncoder))));
  return EncodeResult{std::move(output), inputKeyframes};
}

static Result<MediaDataEncoder::EncodedData, MediaResult> Encode(
    const RefPtr<MediaDataEncoder>& aEncoder, const size_t aNumFrames,
    MediaDataEncoderTest::FrameSource& aSource) {
  EncodeResult r = MOZ_TRY(EncodeWithInputStats(aEncoder, aNumFrames, aSource));
  return std::move(r.mEncodedData);
}

static Result<EncodeResult, MediaResult> EncodeBatchWithInputStats(
    const RefPtr<MediaDataEncoder>& aEncoder, const size_t aTotalNumFrames,
    MediaDataEncoderTest::FrameSource& aSource, const size_t aBatchSize) {
  if (aBatchSize == 0 || aTotalNumFrames == 0) {
    return Err(MediaResult(
        NS_ERROR_INVALID_ARG,
        "Batch size and total number of frames must be greater than 0"));
  }

  size_t inputKeyframes = 0;
  MediaDataEncoder::EncodedData output;
  nsTArray<RefPtr<MediaData>> frames;
  for (size_t i = 0; i < aTotalNumFrames; i++) {
    RefPtr<MediaData> frame = aSource.GetFrame(i);
    frames.AppendElement(frame);
    if (frame->mKeyframe) {
      inputKeyframes++;
    }
    if (frames.Length() == aBatchSize || i == aTotalNumFrames - 1) {
      nsTArray<RefPtr<MediaData>> batch = std::move(frames);
      output.AppendElements(
          MOZ_TRY(WaitFor(aEncoder->Encode(std::move(batch)))));
    }
  }
  MOZ_RELEASE_ASSERT(frames.IsEmpty());

  output.AppendElements(std::move(MOZ_TRY(Drain(aEncoder))));
  return EncodeResult{std::move(output), inputKeyframes};
}

template <typename T>
size_t GetKeyFrameCount(const T& aData) {
  size_t count = 0;
  for (auto sample : aData) {
    if (sample->mKeyframe) {
      count++;
    }
  }
  return count;
}

Result<uint8_t, nsresult> GetNALUSize(const mozilla::MediaRawData* aSample) {
  return AVCCConfig::Parse(aSample).map(
      [](AVCCConfig config) { return config.NALUSize(); });
}

Result<Ok, nsresult> IsValidAVCC(const mozilla::MediaRawData* aSample,
                                 uint8_t aNALUSize) {
  BufferReader reader(aSample->Data(), aSample->Size());
  while (reader.Remaining() >= aNALUSize) {
    uint32_t nalLen;
    switch (aNALUSize) {
      case 1:
        nalLen = MOZ_TRY(reader.ReadU8());
        break;
      case 2:
        nalLen = MOZ_TRY(reader.ReadU16());
        break;
      case 3:
        nalLen = MOZ_TRY(reader.ReadU24());
        break;
      case 4:
        nalLen = MOZ_TRY(reader.ReadU32());
        break;
      default:
        return Err(NS_ERROR_INVALID_ARG);
    }
    const uint8_t* p = reader.Read(nalLen);
    if (!p) {
      return Err(NS_ERROR_ILLEGAL_VALUE);
    }
  }
  return Ok();
}

static already_AddRefed<MediaDataEncoder> CreateH264Encoder(
    Usage aUsage = Usage::Realtime,
    EncoderConfig::SampleFormat aFormat =
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
    gfx::IntSize aSize = kImageSize,
    ScalabilityMode aScalabilityMode = ScalabilityMode::None,
    const EncoderConfig::CodecSpecific& aSpecific =
        AsVariant(kH264SpecificAnnexB)) {
  return CreateVideoEncoder(CodecType::H264, aUsage, aFormat, aSize,
                            aScalabilityMode, aSpecific);
}

TEST_F(MediaDataEncoderTest, H264Create) {
  RUN_IF_SUPPORTED(CodecType::H264, []() {
    RefPtr<MediaDataEncoder> e = CreateH264Encoder();
    EXPECT_TRUE(e);
    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, H264Inits) {
  RUN_IF_SUPPORTED(CodecType::H264, []() {
    // w/o codec specific: should fail for h264.
    RefPtr<MediaDataEncoder> e = CreateH264Encoder(
        Usage::Realtime,
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        kImageSize, ScalabilityMode::None, AsVariant(void_t{}));
    EXPECT_FALSE(e);

    // w/ codec specific
    e = CreateH264Encoder();
    EXPECT_TRUE(EnsureInit(e));
    WaitForShutdown(e);
  });
}

static void H264EncodesTest(Usage aUsage,
                            const EncoderConfig::CodecSpecific& aSpecific,
                            MediaDataEncoderTest::FrameSource& aFrameSource) {
  ASSERT_TRUE(aSpecific.is<H264Specific>());
  ASSERT_TRUE(aSpecific.as<H264Specific>().mFormat ==
                  H264BitStreamFormat::ANNEXB ||
              aSpecific.as<H264Specific>().mFormat == H264BitStreamFormat::AVC);

  RUN_IF_SUPPORTED(CodecType::H264, [&]() {
    bool isAVCC =
        aSpecific.as<H264Specific>().mFormat == H264BitStreamFormat::AVC;

    // Encode one frame and output in AnnexB/AVCC format.
    RefPtr<MediaDataEncoder> e = CreateH264Encoder(
        aUsage, EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        aFrameSource.GetSize(), ScalabilityMode::None, aSpecific);
    EXPECT_TRUE(EnsureInit(e));
    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, 1UL, aFrameSource));
    EXPECT_EQ(output.Length(), 1UL);
    EXPECT_TRUE(isAVCC ? AnnexB::IsAVCC(output[0])
                       : AnnexB::IsAnnexB(*output[0]));
    WaitForShutdown(e);
    output.Clear();

    // Encode multiple frames and output in AnnexB/AVCC format.
    e = CreateH264Encoder(
        aUsage, EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        aFrameSource.GetSize(), ScalabilityMode::None, aSpecific);
    EXPECT_TRUE(EnsureInit(e));
    const bool is4KOrLarger = kImageSize4K <= aFrameSource.GetSize();
    const size_t numFrames = NUM_FRAMES / (is4KOrLarger ? 3 : 1);
    EncodeResult r = GET_OR_RETURN_ON_ERROR(
        EncodeWithInputStats(e, numFrames, aFrameSource));
    output = std::move(r.mEncodedData);
    if (aUsage == Usage::Realtime && is4KOrLarger) {
      // Realtime encoding may drop frames for large frame sizes.
      EXPECT_LE(output.Length(), numFrames);
    } else {
      EXPECT_EQ(output.Length(), numFrames);
    }
    EXPECT_GE(GetKeyFrameCount(output), r.mInputKeyframes);
    if (isAVCC) {
      uint8_t naluSize = GetNALUSize(output[0]).unwrapOr(0);
      EXPECT_GT(naluSize, 0);
      EXPECT_LE(naluSize, 4);
      for (auto frame : output) {
        if (frame->mExtraData && !frame->mExtraData->IsEmpty()) {
          naluSize = GetNALUSize(frame).unwrapOr(0);
          EXPECT_GT(naluSize, 0);
          EXPECT_LE(naluSize, 4);
        }
        EXPECT_TRUE(IsValidAVCC(frame, naluSize).isOk());
      }
    } else {
      for (auto frame : output) {
        EXPECT_TRUE(AnnexB::IsAnnexB(*frame));
      }
    }

    WaitForShutdown(e);
  });
};

TEST_F(MediaDataEncoderTest, H264EncodesAnnexBRecord) {
  H264EncodesTest(Usage::Record, AsVariant(kH264SpecificAnnexB), mData);
}

TEST_F(MediaDataEncoderTest, H264EncodesAnnexBRealtime) {
  H264EncodesTest(Usage::Realtime, AsVariant(kH264SpecificAnnexB), mData);
}

TEST_F(MediaDataEncoderTest, H264EncodesAVCCRecord) {
  H264EncodesTest(Usage::Record, AsVariant(kH264SpecificAVCC), mData);
}

TEST_F(MediaDataEncoderTest, H264EncodesAVCCRealtime) {
  H264EncodesTest(Usage::Realtime, AsVariant(kH264SpecificAVCC), mData);
}

TEST_F(MediaDataEncoderTest, H264Encodes4KAnnexBRecord) {
  SKIP_IF_ANDROID_SW();  // Android SW can't encode 4K.
  H264EncodesTest(Usage::Record, AsVariant(kH264SpecificAnnexB), mData4K);
}

TEST_F(MediaDataEncoderTest, H264Encodes4KAnnexBRealtime) {
  SKIP_IF_ANDROID_SW();  // Android SW can't encode 4K.
  H264EncodesTest(Usage::Realtime, AsVariant(kH264SpecificAnnexB), mData4K);
}

TEST_F(MediaDataEncoderTest, H264Encodes4KAVCCRecord) {
  SKIP_IF_ANDROID_SW();  // Android SW can't encode 4K.
  H264EncodesTest(Usage::Record, AsVariant(kH264SpecificAVCC), mData4K);
}

TEST_F(MediaDataEncoderTest, H264Encodes4KAVCCRealtime) {
  SKIP_IF_ANDROID_SW();  // Android SW can't encode 4K.
  H264EncodesTest(Usage::Realtime, AsVariant(kH264SpecificAVCC), mData4K);
}

static void H264EncodeBatchTest(
    Usage aUsage, const EncoderConfig::CodecSpecific& aSpecific,
    MediaDataEncoderTest::FrameSource& aFrameSource) {
  ASSERT_TRUE(aSpecific.is<H264Specific>());
  ASSERT_TRUE(aSpecific.as<H264Specific>().mFormat ==
                  H264BitStreamFormat::ANNEXB ||
              aSpecific.as<H264Specific>().mFormat == H264BitStreamFormat::AVC);

  RUN_IF_SUPPORTED(CodecType::H264, [&]() {
    bool isAVCC =
        aSpecific.as<H264Specific>().mFormat == H264BitStreamFormat::AVC;

    RefPtr<MediaDataEncoder> e = CreateH264Encoder(
        aUsage, EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        aFrameSource.GetSize(), ScalabilityMode::None, aSpecific);
    EXPECT_TRUE(EnsureInit(e));

    const bool is4KOrLarger = kImageSize4K <= aFrameSource.GetSize();
    const size_t numFrames = NUM_FRAMES / (is4KOrLarger ? 3 : 1);
    constexpr size_t batchSize = 6;
    EncodeResult r = GET_OR_RETURN_ON_ERROR(
        EncodeBatchWithInputStats(e, numFrames, aFrameSource, batchSize));
    MediaDataEncoder::EncodedData output = std::move(r.mEncodedData);
    if (aUsage == Usage::Realtime && is4KOrLarger) {
      // Realtime encoding may drop frames for large frame sizes.
      EXPECT_LE(output.Length(), numFrames);
    } else {
      EXPECT_EQ(output.Length(), numFrames);
    }
    EXPECT_GE(GetKeyFrameCount(output), r.mInputKeyframes);
    if (isAVCC) {
      uint8_t naluSize = GetNALUSize(output[0]).unwrapOr(0);
      EXPECT_GT(naluSize, 0);
      EXPECT_LE(naluSize, 4);
      for (auto frame : output) {
        if (frame->mExtraData && !frame->mExtraData->IsEmpty()) {
          naluSize = GetNALUSize(frame).unwrapOr(0);
          EXPECT_GT(naluSize, 0);
          EXPECT_LE(naluSize, 4);
        }
        EXPECT_TRUE(IsValidAVCC(frame, naluSize).isOk());
      }
    } else {
      for (auto frame : output) {
        EXPECT_TRUE(AnnexB::IsAnnexB(*frame));
      }
    }

    WaitForShutdown(e);
  });
};

TEST_F(MediaDataEncoderTest, H264EncodeBatchAnnexBRecord) {
  H264EncodeBatchTest(Usage::Record, AsVariant(kH264SpecificAnnexB), mData);
}

TEST_F(MediaDataEncoderTest, H264EncodeBatchAnnexBRealtime) {
  H264EncodeBatchTest(Usage::Realtime, AsVariant(kH264SpecificAnnexB), mData);
}

TEST_F(MediaDataEncoderTest, H264EncodeBatchAVCCRecord) {
  H264EncodeBatchTest(Usage::Record, AsVariant(kH264SpecificAVCC), mData);
}

TEST_F(MediaDataEncoderTest, H264EncodeBatchAVCCRealtime) {
  H264EncodeBatchTest(Usage::Realtime, AsVariant(kH264SpecificAVCC), mData);
}

TEST_F(MediaDataEncoderTest, H264EncodeBatch4KAnnexBRecord) {
  SKIP_IF_ANDROID_SW();  // Android SW can't encode 4K.
  H264EncodeBatchTest(Usage::Record, AsVariant(kH264SpecificAnnexB), mData4K);
}

TEST_F(MediaDataEncoderTest, H264EncodeBatch4KAnnexBRealtime) {
  SKIP_IF_ANDROID_SW();  // Android SW can't encode 4K.
  H264EncodeBatchTest(Usage::Realtime, AsVariant(kH264SpecificAnnexB), mData4K);
}

TEST_F(MediaDataEncoderTest, H264EncodeBatch4KAVCCRecord) {
  SKIP_IF_ANDROID_SW();  // Android SW can't encode 4K.
  H264EncodeBatchTest(Usage::Record, AsVariant(kH264SpecificAVCC), mData4K);
}

TEST_F(MediaDataEncoderTest, H264EncodeBatch4KAVCCRealtime) {
  SKIP_IF_ANDROID_SW();  // Android SW can't encode 4K.
  H264EncodeBatchTest(Usage::Realtime, AsVariant(kH264SpecificAVCC), mData4K);
}

#if !defined(ANDROID)
static void H264EncodeAfterDrainTest(
    Usage aUsage, const EncoderConfig::CodecSpecific& aSpecific,
    MediaDataEncoderTest::FrameSource& aFrameSource) {
  ASSERT_TRUE(aSpecific.is<H264Specific>());
  ASSERT_TRUE(aSpecific.as<H264Specific>().mFormat ==
                  H264BitStreamFormat::ANNEXB ||
              aSpecific.as<H264Specific>().mFormat == H264BitStreamFormat::AVC);

  RUN_IF_SUPPORTED(CodecType::H264, [&]() {
    RefPtr<MediaDataEncoder> e = CreateH264Encoder(
        aUsage, EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        aFrameSource.GetSize(), ScalabilityMode::None, aSpecific);

    EXPECT_TRUE(EnsureInit(e));

    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, aFrameSource));
    EXPECT_EQ(output.Length(), NUM_FRAMES);

    output = GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, aFrameSource));
    EXPECT_EQ(output.Length(), NUM_FRAMES);

    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, H264EncodeAfterDrainAnnexBRecord) {
  H264EncodeAfterDrainTest(Usage::Record, AsVariant(kH264SpecificAnnexB),
                           mData);
}

TEST_F(MediaDataEncoderTest, H264EncodeAfterDrainAnnexBRealtime) {
  H264EncodeAfterDrainTest(Usage::Realtime, AsVariant(kH264SpecificAnnexB),
                           mData);
}

TEST_F(MediaDataEncoderTest, H264EncodeAfterDrainAVCCRecord) {
  H264EncodeAfterDrainTest(Usage::Record, AsVariant(kH264SpecificAVCC), mData);
}

TEST_F(MediaDataEncoderTest, H264EncodeAfterDrainAVCCRealtime) {
  H264EncodeAfterDrainTest(Usage::Realtime, AsVariant(kH264SpecificAVCC),
                           mData);
}

static void H264InterleavedEncodeAndDrainTest(
    Usage aUsage, const EncoderConfig::CodecSpecific& aSpecific,
    MediaDataEncoderTest::FrameSource& aFrameSource) {
  ASSERT_TRUE(aSpecific.is<H264Specific>());
  ASSERT_TRUE(aSpecific.as<H264Specific>().mFormat ==
                  H264BitStreamFormat::ANNEXB ||
              aSpecific.as<H264Specific>().mFormat == H264BitStreamFormat::AVC);

  RUN_IF_SUPPORTED(CodecType::H264, [&]() {
    RefPtr<MediaDataEncoder> e = CreateH264Encoder(
        aUsage, EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        aFrameSource.GetSize(), ScalabilityMode::None, aSpecific);

    EXPECT_TRUE(EnsureInit(e));

    MediaDataEncoder::EncodedData output;
    for (size_t i = 0; i < NUM_FRAMES; i++) {
      RefPtr<MediaData> frame = aFrameSource.GetFrame(i);
      output.AppendElements(GET_OR_RETURN_ON_ERROR(WaitFor(e->Encode(frame))));
      if (i % 5 == 0) {
        output.AppendElements(GET_OR_RETURN_ON_ERROR(Drain(e)));
      }
    }
    output.AppendElements(GET_OR_RETURN_ON_ERROR(Drain(e)));

    EXPECT_EQ(output.Length(), NUM_FRAMES);

    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, H264InterleavedEncodeAndDrainAnnexBRecord) {
  H264InterleavedEncodeAndDrainTest(Usage::Record,
                                    AsVariant(kH264SpecificAnnexB), mData);
}

TEST_F(MediaDataEncoderTest, H264InterleavedEncodeAndDrainAnnexBRealtime) {
  H264InterleavedEncodeAndDrainTest(Usage::Realtime,
                                    AsVariant(kH264SpecificAnnexB), mData);
}

TEST_F(MediaDataEncoderTest, H264InterleavedEncodeAndDrainAVCCRecord) {
  H264InterleavedEncodeAndDrainTest(Usage::Record, AsVariant(kH264SpecificAVCC),
                                    mData);
}

TEST_F(MediaDataEncoderTest, H264InterleavedEncodeAndDrainAVCCRealtime) {
  H264InterleavedEncodeAndDrainTest(Usage::Realtime,
                                    AsVariant(kH264SpecificAVCC), mData);
}
#endif

TEST_F(MediaDataEncoderTest, H264Duration) {
  RUN_IF_SUPPORTED(CodecType::H264, [this]() {
    RefPtr<MediaDataEncoder> e = CreateH264Encoder();
    EXPECT_TRUE(EnsureInit(e));
    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (const auto& frame : output) {
      EXPECT_GT(frame->mDuration, media::TimeUnit::Zero());
    }
    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, H264InvalidSize) {
  RUN_IF_SUPPORTED(CodecType::H264, []() {
    RefPtr<MediaDataEncoder> e0x0 = CreateH264Encoder(
        Usage::Realtime,
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P), {0, 0},
        ScalabilityMode::None, AsVariant(kH264SpecificAnnexB));
    EXPECT_EQ(e0x0, nullptr);

    RefPtr<MediaDataEncoder> e0x1 = CreateH264Encoder(
        Usage::Realtime,
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P), {0, 1},
        ScalabilityMode::None, AsVariant(kH264SpecificAnnexB));
    EXPECT_EQ(e0x1, nullptr);

    RefPtr<MediaDataEncoder> e1x0 = CreateH264Encoder(
        Usage::Realtime,
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P), {1, 0},
        ScalabilityMode::None, AsVariant(kH264SpecificAnnexB));
    EXPECT_EQ(e1x0, nullptr);
  });
}

#if !defined(ANDROID)
TEST_F(MediaDataEncoderTest, H264AVCC) {
  RUN_IF_SUPPORTED(CodecType::H264, [this]() {
    // Encod frames in avcC format.
    RefPtr<MediaDataEncoder> e = CreateH264Encoder(
        Usage::Record,
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        kImageSize, ScalabilityMode::None, AsVariant(kH264SpecificAVCC));
    EXPECT_TRUE(EnsureInit(e));
    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (auto frame : output) {
      EXPECT_FALSE(AnnexB::IsAnnexB(*frame));
      if (frame->mKeyframe) {
        // The extradata may be included at the beginning, whenever it changes,
        // or with every keyframe to support robust seeking or decoder resets.
        if (frame->mExtraData && !frame->mExtraData->IsEmpty()) {
          EXPECT_TRUE(AnnexB::IsAVCC(frame));
          AVCCConfig config = AVCCConfig::Parse(frame).unwrap();
          EXPECT_EQ(config.mAVCProfileIndication,
                    static_cast<decltype(config.mAVCProfileIndication)>(
                        kH264SpecificAVCC.mProfile));
          EXPECT_EQ(config.mAVCLevelIndication,
                    static_cast<decltype(config.mAVCLevelIndication)>(
                        kH264SpecificAVCC.mLevel));
        }
      }
    }
    WaitForShutdown(e);
  });
}
#endif

// For Android HW encoder only.
#ifdef MOZ_WIDGET_ANDROID
TEST_F(MediaDataEncoderTest, AndroidNotSupportedSize) {
  SKIP_IF_ANDROID_SW();
  RUN_IF_SUPPORTED(CodecType::H264, []() {
    RefPtr<MediaDataEncoder> e = CreateH264Encoder(
        Usage::Realtime,
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P), {1, 1},
        ScalabilityMode::None, AsVariant(kH264SpecificAnnexB));
    EXPECT_NE(e, nullptr);
    EXPECT_FALSE(EnsureInit(e));
  });
}
#endif

#if !(defined(MOZ_WIDGET_GTK) && defined(__i386__))
static already_AddRefed<MediaDataEncoder> CreateVP8Encoder(
    Usage aUsage = Usage::Realtime,
    EncoderConfig::SampleFormat aFormat =
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
    gfx::IntSize aSize = kImageSize,
    ScalabilityMode aScalabilityMode = ScalabilityMode::None,
    const EncoderConfig::CodecSpecific& aSpecific = AsVariant(VP8Specific())) {
  return CreateVideoEncoder(CodecType::VP8, aUsage, aFormat, aSize,
                            aScalabilityMode, aSpecific);
}

static already_AddRefed<MediaDataEncoder> CreateVP9Encoder(
    Usage aUsage = Usage::Realtime,
    EncoderConfig::SampleFormat aFormat =
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
    gfx::IntSize aSize = kImageSize,
    ScalabilityMode aScalabilityMode = ScalabilityMode::None,
    const EncoderConfig::CodecSpecific& aSpecific = AsVariant(VP9Specific())) {
  return CreateVideoEncoder(CodecType::VP9, aUsage, aFormat, aSize,
                            aScalabilityMode, aSpecific);
}

TEST_F(MediaDataEncoderTest, VP8Create) {
  RUN_IF_SUPPORTED(CodecType::VP8, []() {
    RefPtr<MediaDataEncoder> e = CreateVP8Encoder();
    EXPECT_TRUE(e);
    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, VP8Inits) {
  RUN_IF_SUPPORTED(CodecType::VP8, []() {
    // w/o codec specific.
    RefPtr<MediaDataEncoder> e = CreateVP8Encoder(
        Usage::Realtime,
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        kImageSize, ScalabilityMode::None, AsVariant(void_t{}));
    EXPECT_TRUE(EnsureInit(e));
    WaitForShutdown(e);

    // w/ codec specific
    e = CreateVP8Encoder();
    EXPECT_TRUE(EnsureInit(e));
    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, VP8Encodes) {
  RUN_IF_SUPPORTED(CodecType::VP8, [this]() {
    // Encode one VPX frame.
    RefPtr<MediaDataEncoder> e = CreateVP8Encoder();
    EXPECT_TRUE(EnsureInit(e));
    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, 1UL, mData));
    EXPECT_EQ(output.Length(), 1UL);
    VPXDecoder::VPXStreamInfo info;
    EXPECT_TRUE(
        VPXDecoder::GetStreamInfo(*output[0], info, VPXDecoder::Codec::VP8));
    EXPECT_EQ(info.mKeyFrame, output[0]->mKeyframe);
    if (info.mKeyFrame) {
      EXPECT_EQ(info.mImage, kImageSize);
    }
    WaitForShutdown(e);

    // Encode multiple VPX frames.
    e = CreateVP8Encoder();
    EXPECT_TRUE(EnsureInit(e));
    output = GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (auto frame : output) {
      VPXDecoder::VPXStreamInfo info;
      EXPECT_TRUE(
          VPXDecoder::GetStreamInfo(*frame, info, VPXDecoder::Codec::VP8));
      EXPECT_EQ(info.mKeyFrame, frame->mKeyframe);
      if (info.mKeyFrame) {
        EXPECT_EQ(info.mImage, kImageSize);
      }
    }
    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, VP8Duration) {
  RUN_IF_SUPPORTED(CodecType::VP8, [this]() {
    RefPtr<MediaDataEncoder> e = CreateVP8Encoder();
    EXPECT_TRUE(EnsureInit(e));
    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (const auto& frame : output) {
      EXPECT_GT(frame->mDuration, media::TimeUnit::Zero());
    }
    WaitForShutdown(e);
  });
}

#  if !defined(ANDROID)
TEST_F(MediaDataEncoderTest, VP8EncodeAfterDrain) {
  RUN_IF_SUPPORTED(CodecType::VP8, [this]() {
    RefPtr<MediaDataEncoder> e = CreateVP8Encoder();
    EXPECT_TRUE(EnsureInit(e));

    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (auto frame : output) {
      VPXDecoder::VPXStreamInfo info;
      EXPECT_TRUE(
          VPXDecoder::GetStreamInfo(*frame, info, VPXDecoder::Codec::VP8));
      EXPECT_EQ(info.mKeyFrame, frame->mKeyframe);
      if (info.mKeyFrame) {
        EXPECT_EQ(info.mImage, kImageSize);
      }
    }
    output.Clear();

    output = GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (auto frame : output) {
      VPXDecoder::VPXStreamInfo info;
      EXPECT_TRUE(
          VPXDecoder::GetStreamInfo(*frame, info, VPXDecoder::Codec::VP8));
      EXPECT_EQ(info.mKeyFrame, frame->mKeyframe);
      if (info.mKeyFrame) {
        EXPECT_EQ(info.mImage, kImageSize);
      }
    }

    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, VP8EncodeWithScalabilityModeL1T2) {
  RUN_IF_SUPPORTED(CodecType::VP8, [this]() {
    VP8Specific specific(VPXComplexity::Normal, /* mComplexity */
                         true,                  /* mResilience */
                         2,                     /* mNumTemporalLayers */
                         true,                  /* mDenoising */
                         false,                 /* mAutoResize */
                         false                  /* mFrameDropping */
    );
    RefPtr<MediaDataEncoder> e = CreateVP8Encoder(
        Usage::Realtime,
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        kImageSize, ScalabilityMode::L1T2, AsVariant(specific));
    EXPECT_TRUE(EnsureInit(e));

    const nsTArray<uint8_t> pattern({0, 1});
    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    int temporal_idx = 0;
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (size_t i = 0; i < output.Length(); ++i) {
      const RefPtr<MediaRawData> frame = output[i];
      if (frame->mKeyframe) {
        temporal_idx = 0;
      }
      EXPECT_TRUE(frame->mTemporalLayerId);
      size_t idx = temporal_idx++ % pattern.Length();
      EXPECT_EQ(frame->mTemporalLayerId.value(), pattern[idx]);
    }
    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, VP8EncodeWithScalabilityModeL1T3) {
  RUN_IF_SUPPORTED(CodecType::VP8, [this]() {
    VP8Specific specific(VPXComplexity::Normal, /* mComplexity */
                         true,                  /* mResilience */
                         3,                     /* mNumTemporalLayers */
                         true,                  /* mDenoising */
                         false,                 /* mAutoResize */
                         false                  /* mFrameDropping */
    );
    RefPtr<MediaDataEncoder> e = CreateVP8Encoder(
        Usage::Realtime,
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        kImageSize, ScalabilityMode::L1T3, AsVariant(specific));
    EXPECT_TRUE(EnsureInit(e));

    const nsTArray<uint8_t> pattern({0, 2, 1, 2});
    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    int temporal_idx = 0;
    for (size_t i = 0; i < output.Length(); ++i) {
      const RefPtr<MediaRawData> frame = output[i];
      if (frame->mKeyframe) {
        temporal_idx = 0;
      }
      EXPECT_TRUE(frame->mTemporalLayerId);
      size_t idx = temporal_idx++ % pattern.Length();
      EXPECT_EQ(frame->mTemporalLayerId.value(), pattern[idx]);
    }
    WaitForShutdown(e);
  });
}
#  endif

TEST_F(MediaDataEncoderTest, VP9Create) {
  RUN_IF_SUPPORTED(CodecType::VP9, []() {
    RefPtr<MediaDataEncoder> e = CreateVP9Encoder();
    EXPECT_TRUE(e);
    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, VP9Inits) {
  RUN_IF_SUPPORTED(CodecType::VP9, []() {
    // w/o codec specific.
    RefPtr<MediaDataEncoder> e = CreateVP9Encoder(
        Usage::Realtime,
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        kImageSize, ScalabilityMode::None, AsVariant(void_t{}));
    EXPECT_TRUE(EnsureInit(e));
    WaitForShutdown(e);

    // w/ codec specific
    e = CreateVP9Encoder();
    EXPECT_TRUE(EnsureInit(e));
    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, VP9Encodes) {
  RUN_IF_SUPPORTED(CodecType::VP9, [this]() {
    RefPtr<MediaDataEncoder> e = CreateVP9Encoder();
    EXPECT_TRUE(EnsureInit(e));
    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, 1UL, mData));
    EXPECT_EQ(output.Length(), 1UL);
    VPXDecoder::VPXStreamInfo info;
    EXPECT_TRUE(
        VPXDecoder::GetStreamInfo(*output[0], info, VPXDecoder::Codec::VP9));
    EXPECT_EQ(info.mKeyFrame, output[0]->mKeyframe);
    if (info.mKeyFrame) {
      EXPECT_EQ(info.mImage, kImageSize);
    }
    WaitForShutdown(e);

    e = CreateVP9Encoder();
    EXPECT_TRUE(EnsureInit(e));
    output = GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (auto frame : output) {
      VPXDecoder::VPXStreamInfo info;
      EXPECT_TRUE(
          VPXDecoder::GetStreamInfo(*frame, info, VPXDecoder::Codec::VP9));
      EXPECT_EQ(info.mKeyFrame, frame->mKeyframe);
      if (info.mKeyFrame) {
        EXPECT_EQ(info.mImage, kImageSize);
      }
    }
    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, VP9Duration) {
  RUN_IF_SUPPORTED(CodecType::VP9, [this]() {
    RefPtr<MediaDataEncoder> e = CreateVP9Encoder();
    EXPECT_TRUE(EnsureInit(e));
    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (const auto& frame : output) {
      EXPECT_GT(frame->mDuration, media::TimeUnit::Zero());
    }
    WaitForShutdown(e);
  });
}

#  if !defined(ANDROID)
TEST_F(MediaDataEncoderTest, VP9EncodeAfterDrain) {
  RUN_IF_SUPPORTED(CodecType::VP9, [this]() {
    RefPtr<MediaDataEncoder> e = CreateVP9Encoder();
    EXPECT_TRUE(EnsureInit(e));

    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (auto frame : output) {
      VPXDecoder::VPXStreamInfo info;
      EXPECT_TRUE(
          VPXDecoder::GetStreamInfo(*frame, info, VPXDecoder::Codec::VP9));
      EXPECT_EQ(info.mKeyFrame, frame->mKeyframe);
      if (info.mKeyFrame) {
        EXPECT_EQ(info.mImage, kImageSize);
      }
    }
    output.Clear();

    output = GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (auto frame : output) {
      VPXDecoder::VPXStreamInfo info;
      EXPECT_TRUE(
          VPXDecoder::GetStreamInfo(*frame, info, VPXDecoder::Codec::VP9));
      EXPECT_EQ(info.mKeyFrame, frame->mKeyframe);
      if (info.mKeyFrame) {
        EXPECT_EQ(info.mImage, kImageSize);
      }
    }

    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, VP9EncodeWithScalabilityModeL1T2) {
  RUN_IF_SUPPORTED(CodecType::VP9, [this]() {
    VP9Specific specific(VPXComplexity::Normal, /* mComplexity */
                         true,                  /* mResilience */
                         2,                     /* mNumTemporalLayers */
                         true,                  /* mDenoising */
                         false,                 /* mAutoResize */
                         false,                 /* mFrameDropping */
                         true,                  /* mAdaptiveQp */
                         1,                     /* mNumSpatialLayers */
                         false                  /* mFlexible */
    );

    RefPtr<MediaDataEncoder> e = CreateVP9Encoder(
        Usage::Realtime,
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        kImageSize, ScalabilityMode::L1T2, AsVariant(specific));
    EXPECT_TRUE(EnsureInit(e));

    const nsTArray<uint8_t> pattern({0, 1});
    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    int temporal_idx = 0;
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (size_t i = 0; i < output.Length(); ++i) {
      const RefPtr<MediaRawData> frame = output[i];
      if (frame->mKeyframe) {
        temporal_idx = 0;
      }
      EXPECT_TRUE(frame->mTemporalLayerId);
      size_t idx = temporal_idx++ % pattern.Length();
      EXPECT_EQ(frame->mTemporalLayerId.value(), pattern[idx]);
    }
    WaitForShutdown(e);
  });
}

TEST_F(MediaDataEncoderTest, VP9EncodeWithScalabilityModeL1T3) {
  RUN_IF_SUPPORTED(CodecType::VP9, [this]() {
    VP9Specific specific(VPXComplexity::Normal, /* mComplexity */
                         true,                  /* mResilience */
                         3,                     /* mNumTemporalLayers */
                         true,                  /* mDenoising */
                         false,                 /* mAutoResize */
                         false,                 /* mFrameDropping */
                         true,                  /* mAdaptiveQp */
                         1,                     /* mNumSpatialLayers */
                         false                  /* mFlexible */
    );

    RefPtr<MediaDataEncoder> e = CreateVP9Encoder(
        Usage::Realtime,
        EncoderConfig::SampleFormat(dom::ImageBitmapFormat::YUV420P),
        kImageSize, ScalabilityMode::L1T3, AsVariant(specific));
    EXPECT_TRUE(EnsureInit(e));

    const nsTArray<uint8_t> pattern({0, 2, 1, 2});
    MediaDataEncoder::EncodedData output =
        GET_OR_RETURN_ON_ERROR(Encode(e, NUM_FRAMES, mData));
    int temporal_idx = 0;
    EXPECT_EQ(output.Length(), NUM_FRAMES);
    for (size_t i = 0; i < output.Length(); ++i) {
      const RefPtr<MediaRawData> frame = output[i];
      if (frame->mKeyframe) {
        temporal_idx = 0;
      }
      EXPECT_TRUE(frame->mTemporalLayerId);
      size_t idx = temporal_idx++ % pattern.Length();
      EXPECT_EQ(frame->mTemporalLayerId.value(), pattern[idx]);
    }
    WaitForShutdown(e);
  });
}
#  endif
#endif

#undef BLOCK_SIZE
#undef GET_OR_RETURN_ON_ERROR
#undef RUN_IF_SUPPORTED
