/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <gtest/gtest.h>

#include "MediaData.h"
#include "TimeUnits.h"

using namespace mozilla;
using mozilla::media::TimeInterval;
using mozilla::media::TimeUnit;

// SetTrimWindow must not set mFrames to a value that, combined with
// mDataOffset, overruns the backing buffer. When the container timescale
// (726) is incommensurate with the audio rate (48000), GetEndTime() rounds up
// via TimeUnit::FromSeconds, allowing a trim end time that maps to more frames
// than remain after the data offset. Concretely: floor(1*48000/726)=66 offset
// + floor(14*48000/726)=925 count = 991 > 960-frame buffer.
TEST(TestAudioData, IncommensurateTrimTimescaleDoesNotOverrunBuffer)
{
  // 960 frames, 1 channel, 48000 Hz.
  AlignedAudioBuffer samples;
  ASSERT_TRUE(samples.SetLength(960));

  // Non-zero start in base 726 so GetEndTime() = TimeUnit(1,726) +
  // TimeUnit(960,48000) takes the float path and rounds up to TimeUnit(16,726)
  // (true 15.522), letting TimeUnit(16,726) pass the trim bounds guard.
  RefPtr<AudioData> data =
      new AudioData(0, TimeUnit(1, 726), std::move(samples), 1, 48000);

  // trimBefore = TimeUnit(1,726)  -> frameOffset = floor(1*48000/726)  = 66
  // duration   = TimeUnit(14,726) -> frameCount  = floor(14*48000/726) = 925
  // availFrames = (960 - 66) / 1 = 894; 925 > 894 -> mFrames must be 0.
  TimeInterval trim(TimeUnit(2, 726), TimeUnit(16, 726));
  EXPECT_TRUE(data->SetTrimWindow(trim));
  EXPECT_EQ(data->Frames(), 0u);
}

// Verify that SetTrimWindow accepts a valid trim when the timescale matches
// the audio rate (no rounding), and the frame count fits after the offset.
TEST(TestAudioData, CommensurateTimescaleAcceptsTrim)
{
  // 960 frames, 1 channel, 48000 Hz. All arithmetic is exact.
  AlignedAudioBuffer samples;
  ASSERT_TRUE(samples.SetLength(960));

  RefPtr<AudioData> data =
      new AudioData(0, TimeUnit::Zero(), std::move(samples), 1, 48000);

  // Trim off the first 100 frames, keep the next 500.
  TimeInterval trim(TimeUnit(100, 48000), TimeUnit(600, 48000));
  EXPECT_TRUE(data->SetTrimWindow(trim));
  EXPECT_EQ(data->Frames(), 500u);
}
