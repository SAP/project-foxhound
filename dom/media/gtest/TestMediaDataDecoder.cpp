/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <type_traits>

#include "H264.h"
#include "PDMFactory.h"
#include "gtest/gtest.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/gtest/WaitFor.h"

using namespace mozilla;

using MDD = MediaDataDecoder;
using ParamType = std::underlying_type<MDD::PropertyName>::type;

class PropertyTest : public ::testing::TestWithParam<ParamType> {
 public:
  static void SetUpTestSuite() {
    sFactory = MakeRefPtr<PDMFactory>();
    sAVCInfo = MakeUnique<VideoInfo>(sDummyVideoSize);
    sAVCInfo->mMimeType = "video/avc"_ns;
    sAVCInfo->mExtraData = H264::CreateExtraData(
        H264_PROFILE::H264_PROFILE_BASE, 0 /* constraint */,
        H264_LEVEL::H264_LEVEL_1, sDummyVideoSize);
    sVP9Info = MakeUnique<VideoInfo>(sDummyVideoSize);
    sVP9Info->mMimeType = "video/vp9"_ns;
    sVP9Info->SetAlpha(true);
  }

  static void TearDownTestSuite() {
    sFactory = nullptr;
    sTaskQueue = nullptr;
    sAVCInfo.reset();
    sVP9Info.reset();
  }

  static constexpr gfx::IntSize sDummyVideoSize{640, 480};
  static RefPtr<PDMFactory> sFactory;
  static RefPtr<TaskQueue> sTaskQueue;
  static UniquePtr<VideoInfo> sAVCInfo;
  static UniquePtr<VideoInfo> sVP9Info;
};

constinit RefPtr<PDMFactory> PropertyTest::sFactory;
constinit RefPtr<TaskQueue> PropertyTest::sTaskQueue;
constinit UniquePtr<VideoInfo> PropertyTest::sAVCInfo;
constinit UniquePtr<VideoInfo> PropertyTest::sVP9Info;

void CheckEquals(VideoInfo& aVideoInfo, MDD::PropertyName aPropertyName,
                 const Maybe<MDD::PropertyValue>&& aExpectedValue,
                 const char* aCallSite) {
  using V = Maybe<MDD::PropertyValue>;
  auto d = WaitFor(
      PropertyTest::sFactory->CreateDecoder(CreateDecoderParams{aVideoInfo}));
  EXPECT_TRUE(d.isOk());
  RefPtr<MDD> dec = d.unwrap();
  auto t = WaitFor(dec->Init());
  EXPECT_TRUE(t.isOk());
  EXPECT_EQ(t.unwrap(), TrackInfo::TrackType::kVideoTrack);
  const V v = dec->GetDecodeProperty(aPropertyName);
  // Although Maybe supports operator<<(), PropertyValue/Variant doesn't and
  // needs special care.
  auto maybeStr = [](const V& v) -> std::string {
    if (v.isNothing()) {
      return "undefined";
    }
    // Only uint32_t for now.
    return std::to_string(v.ref().match([](uint32_t x) { return x; }));
  };

  EXPECT_TRUE(v == aExpectedValue)
      << "[" << aCallSite << "] "
      << "Decode property: " << MDD::EnumValueToString(aPropertyName)
      << std::endl
      << "  Actual: " << maybeStr(v)
      << "  Expected: " << maybeStr(aExpectedValue);
}

#define CHECK_NOT_DEFINED(info, prop)             \
  do {                                            \
    CheckEquals(info, prop, Nothing(), __func__); \
  } while (0)

#ifdef MOZ_WIDGET_ANDROID
void CheckAndroid(VideoInfo& aVideoInfo, MDD::PropertyName aProperty) {
  switch (aProperty) {
    case MDD::PropertyName::MaxNumVideoBuffers:
      [[fallthrough]];
    case MDD::PropertyName::MinNumVideoBuffers:
      CheckEquals(aVideoInfo, aProperty, Some(MDD::PropertyValue(3U)),
                  __func__);
      break;
    case MDD::PropertyName::MaxNumCurrentImages:
      CheckEquals(aVideoInfo, aProperty, Some(MDD::PropertyValue(1U)),
                  __func__);
      break;
    default:
      CHECK_NOT_DEFINED(aVideoInfo, aProperty);
  }
}
#endif

#ifdef MOZ_APPLEMEDIA
void CheckApple(VideoInfo& aVideoInfo, MDD::PropertyName aProperty) {
  switch (aProperty) {
    case MDD::PropertyName::MinNumVideoBuffers:
      CheckEquals(aVideoInfo, aProperty, Some(MDD::PropertyValue(10U)),
                  __func__);
      break;
    default:
      CHECK_NOT_DEFINED(aVideoInfo, aProperty);
  }
}
#endif

INSTANTIATE_TEST_SUITE_P(TestMediaDataDecoder, PropertyTest,
                         ::testing::Range<ParamType>(0,
                                                     MDD::sPropertyNameCount),
                         [](const ::testing::TestParamInfo<ParamType>& info) {
                           return std::string(MDD::EnumValueToString(
                               static_cast<MDD::PropertyName>(info.param)));
                         });

TEST_P(PropertyTest, DefaultValues) {
  auto param = static_cast<MDD::PropertyName>(GetParam());
#ifdef MOZ_WIDGET_ANDROID
  CheckAndroid(*sAVCInfo, param);
#elif defined(MOZ_APPLEMEDIA)
  CheckApple(*sAVCInfo, param);
#else
  CHECK_NOT_DEFINED(*sAVCInfo, param);
#endif
}

// On Android, VP9 video with alpha channel is decoded with libvpx.
#ifdef MOZ_WIDGET_ANDROID
TEST_P(PropertyTest, NotDefinedForVP9WithAlphaOnAndroid) {
  CHECK_NOT_DEFINED(*sVP9Info, static_cast<MDD::PropertyName>(GetParam()));
}
#endif
