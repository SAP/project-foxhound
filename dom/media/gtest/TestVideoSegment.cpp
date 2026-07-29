/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "VideoSegment.h"
#include "gtest/gtest.h"

using namespace mozilla;

namespace mozilla::layer {
class Image;
}  // namespace mozilla::layer

TEST(VideoSegment, TestAppendFrameForceBlack)
{
  RefPtr<layers::Image> testImage = nullptr;

  VideoSegment segment;
  segment.AppendFrame(testImage.forget(), mozilla::gfx::IntSize(640, 480),
                      PRINCIPAL_HANDLE_NONE, true);

  VideoSegment::ChunkIterator iter(segment);
  while (!iter.IsEnded()) {
    VideoChunk chunk = *iter;
    EXPECT_TRUE(chunk.mFrame.GetForceBlack());
    iter.Next();
  }
}

TEST(VideoSegment, TestAppendFrameNotForceBlack)
{
  RefPtr<layers::Image> testImage = nullptr;

  VideoSegment segment;
  segment.AppendFrame(testImage.forget(), mozilla::gfx::IntSize(640, 480),
                      PRINCIPAL_HANDLE_NONE);

  VideoSegment::ChunkIterator iter(segment);
  while (!iter.IsEnded()) {
    VideoChunk chunk = *iter;
    EXPECT_FALSE(chunk.mFrame.GetForceBlack());
    iter.Next();
  }
}

TEST(VideoSegment, TestBlackImageSize)
{
  // Valid size should produce an image.
  EXPECT_NE(
      RefPtr{VideoFrame::CreateBlackImage(mozilla::gfx::IntSize(640, 480))},
      nullptr);

  // Zero dimensions should fail.
  EXPECT_EQ(RefPtr{VideoFrame::CreateBlackImage(mozilla::gfx::IntSize(0, 480))},
            nullptr);
  EXPECT_EQ(RefPtr{VideoFrame::CreateBlackImage(mozilla::gfx::IntSize(640, 0))},
            nullptr);

  // Negative dimensions should fail.
  EXPECT_EQ(
      RefPtr{VideoFrame::CreateBlackImage(mozilla::gfx::IntSize(-1, 480))},
      nullptr);
  EXPECT_EQ(
      RefPtr{VideoFrame::CreateBlackImage(mozilla::gfx::IntSize(640, -1))},
      nullptr);
  EXPECT_EQ(
      RefPtr{VideoFrame::CreateBlackImage(mozilla::gfx::IntSize(-640, -480))},
      nullptr);

  // Overflowing dimensions should fail.
  EXPECT_EQ(
      RefPtr{VideoFrame::CreateBlackImage(mozilla::gfx::IntSize(INT_MAX, 480))},
      nullptr);
  EXPECT_EQ(
      RefPtr{VideoFrame::CreateBlackImage(mozilla::gfx::IntSize(640, INT_MAX))},
      nullptr);
  EXPECT_EQ(RefPtr{VideoFrame::CreateBlackImage(
                mozilla::gfx::IntSize(INT_MAX, INT_MAX))},
            nullptr);
}
