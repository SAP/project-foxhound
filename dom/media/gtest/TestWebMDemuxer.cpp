/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MediaDataDemuxer.h"
#include "MockMediaResource.h"
#include "VideoUtils.h"
#include "WebMDemuxer.h"
#include "gtest/gtest.h"
#include "mozilla/MozPromise.h"
#include "mozilla/SharedThreadPool.h"
#include "mozilla/TaskQueue.h"
#include "mozilla/gfx/Types.h"

using namespace mozilla;

TEST(WebMDemuxer, HDRMetadata)
{
  RefPtr<MockMediaResource> resource =
      new MockMediaResource("tos-vp9-hdr-cll.webm");
  ASSERT_EQ(NS_OK, resource->Open());

  RefPtr<WebMDemuxer> demuxer = new WebMDemuxer(resource);
  RefPtr<TaskQueue> taskQueue = TaskQueue::Create(
      GetMediaThreadPool(MediaThreadType::SUPERVISOR), "TestWebMDemuxer");

  bool ran = false;
  InvokeAsync(taskQueue, __func__, [demuxer]() { return demuxer->Init(); })
      ->Then(
          taskQueue, __func__,
          [&ran, demuxer, taskQueue]() {
            EXPECT_EQ(demuxer->GetNumberTracks(TrackInfo::kVideoTrack), 1u);

            UniquePtr<TrackInfo> info =
                demuxer->GetTrackInfo(TrackInfo::kVideoTrack, 0);
            ASSERT_TRUE(info != nullptr);
            VideoInfo* videoInfo = info->GetAsVideoInfo();
            ASSERT_TRUE(videoInfo != nullptr);

            ASSERT_TRUE(videoInfo->mHDRMetadata.isSome());
            ASSERT_TRUE(videoInfo->mHDRMetadata->mSmpte2086.isSome());
            const auto& smpte = videoInfo->mHDRMetadata->mSmpte2086.value();

            EXPECT_FLOAT_EQ(smpte.displayPrimaryRed.x, 0.68f);
            EXPECT_FLOAT_EQ(smpte.displayPrimaryRed.y, 0.32f);
            EXPECT_FLOAT_EQ(smpte.displayPrimaryGreen.x, 0.265f);
            EXPECT_FLOAT_EQ(smpte.displayPrimaryGreen.y, 0.69f);
            EXPECT_FLOAT_EQ(smpte.displayPrimaryBlue.x, 0.15f);
            EXPECT_FLOAT_EQ(smpte.displayPrimaryBlue.y, 0.06f);
            EXPECT_FLOAT_EQ(smpte.whitePoint.x, 0.3127f);
            EXPECT_FLOAT_EQ(smpte.whitePoint.y, 0.329f);
            EXPECT_FLOAT_EQ(smpte.maxLuminance, 1000.0f);
            EXPECT_FLOAT_EQ(smpte.minLuminance, 0.0001f);

            ASSERT_TRUE(videoInfo->mHDRMetadata->mContentLightLevel.isSome());
            const auto& cll =
                videoInfo->mHDRMetadata->mContentLightLevel.value();
            EXPECT_EQ(cll.maxContentLightLevel, 1000u);
            EXPECT_EQ(cll.maxFrameAverageLightLevel, 400u);

            ran = true;
            taskQueue->BeginShutdown();
          },
          [taskQueue](const MediaResult& aError) {
            EXPECT_TRUE(false) << "WebMDemuxer::Init() failed";
            taskQueue->BeginShutdown();
          });

  taskQueue->AwaitShutdownAndIdle();
  EXPECT_TRUE(ran);
}
