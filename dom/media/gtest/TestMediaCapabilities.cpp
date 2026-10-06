/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MediaCapabilities.h"
#include "MediaInfo.h"
#include "MockDecoderModule.h"
#include "PDMFactory.h"
#include "VPXDecoder.h"
#include "VideoUtils.h"
#include "gtest/gtest.h"
#include "mozilla/gtest/WaitFor.h"

using namespace mozilla;
using namespace mozilla::dom;
using namespace testing;

TEST(TestMediaCapabilities, SoftwareDRMHardwareDecode)
{
  RefPtr<MockDecoderModule> pdm = new MockDecoderModule();
  ON_CALL(*pdm, CreateVideoDecoder)
      .WillByDefault([](const CreateDecoderParams& aParams) {
        RefPtr<MediaDataDecoder> decoder = new HardwareCapableMockDecoder(
            aParams, HardwareAcceleration::Hardware);
        return decoder.forget();
      });
  PDMFactory::AutoForcePDM autoForcePDM(pdm);

  RefPtr<TaskQueue> taskQueue =
      TaskQueue::Create(GetMediaThreadPool(MediaThreadType::SUPERVISOR),
                        "TestCheckVideoDecodingInfo");

  auto config = MakeUnique<VideoInfo>(1280, 720);
  config->mMimeType = "video/vp9"_ns;
  VPXDecoder::GetVPCCBox(config->mExtraData, VPXDecoder::VPXStreamInfo());

  auto promise = MediaCapabilities::CheckVideoDecodingInfo(
      taskQueue, nullptr, 30.0f, /* aShouldResistFingerprinting */ false,
      std::move(config));

  auto result = WaitFor(promise);
  ASSERT_TRUE(result.isOk());
  EXPECT_TRUE(result.unwrap().mPowerEfficient);
}

TEST(TestMediaCapabilities, SoftwareDRMSoftwareDecode)
{
  RefPtr<MockDecoderModule> pdm = new MockDecoderModule();
  ON_CALL(*pdm, CreateVideoDecoder)
      .WillByDefault([](const CreateDecoderParams& aParams) {
        RefPtr<MediaDataDecoder> decoder = new HardwareCapableMockDecoder(
            aParams, HardwareAcceleration::Software);
        return decoder.forget();
      });
  PDMFactory::AutoForcePDM autoForcePDM(pdm);

  RefPtr<TaskQueue> taskQueue =
      TaskQueue::Create(GetMediaThreadPool(MediaThreadType::SUPERVISOR),
                        "TestCheckVideoDecodingInfo");

  auto config = MakeUnique<VideoInfo>(1280, 720);
  config->mMimeType = "video/vp9"_ns;
  VPXDecoder::GetVPCCBox(config->mExtraData, VPXDecoder::VPXStreamInfo());

  auto promise = MediaCapabilities::CheckVideoDecodingInfo(
      taskQueue, nullptr, 30.0f, /* aShouldResistFingerprinting */ false,
      std::move(config));

  auto result = WaitFor(promise);
  ASSERT_TRUE(result.isOk());
  EXPECT_FALSE(result.unwrap().mPowerEfficient);
}

TEST(TestMediaCapabilities, RFPSuppressesPowerEfficient)
{
  RefPtr<MockDecoderModule> pdm = new MockDecoderModule();
  ON_CALL(*pdm, CreateVideoDecoder)
      .WillByDefault([](const CreateDecoderParams& aParams) {
        RefPtr<MediaDataDecoder> decoder = new HardwareCapableMockDecoder(
            aParams, HardwareAcceleration::Hardware);
        return decoder.forget();
      });
  PDMFactory::AutoForcePDM autoForcePDM(pdm);

  RefPtr<TaskQueue> taskQueue =
      TaskQueue::Create(GetMediaThreadPool(MediaThreadType::SUPERVISOR),
                        "TestCheckVideoDecodingInfo");

  auto config = MakeUnique<VideoInfo>(1280, 720);
  config->mMimeType = "video/vp9"_ns;
  VPXDecoder::GetVPCCBox(config->mExtraData, VPXDecoder::VPXStreamInfo());

  auto promise = MediaCapabilities::CheckVideoDecodingInfo(
      taskQueue, nullptr, 30.0f, /* aShouldResistFingerprinting */ true,
      std::move(config));

  auto result = WaitFor(promise);
  ASSERT_TRUE(result.isOk());
  EXPECT_FALSE(result.unwrap().mPowerEfficient);
}
