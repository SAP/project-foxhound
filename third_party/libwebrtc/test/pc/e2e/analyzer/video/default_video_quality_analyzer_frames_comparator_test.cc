/*
 *  Copyright (c) 2021 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree. An additional intellectual property rights grant can be found
 *  in the file PATENTS.  All contributing project authors may
 *  be found in the AUTHORS file in the root of the source tree.
 */

#include "test/pc/e2e/analyzer/video/default_video_quality_analyzer_frames_comparator.h"

#include <map>
#include <vector>

#include "api/test/create_frame_generator.h"
#include "api/units/timestamp.h"
#include "rtc_base/strings/string_builder.h"
#include "system_wrappers/include/clock.h"
#include "test/gmock.h"
#include "test/gtest.h"
#include "test/pc/e2e/analyzer/video/default_video_quality_analyzer_cpu_measurer.h"
#include "test/pc/e2e/analyzer/video/default_video_quality_analyzer_shared_objects.h"

namespace webrtc {
namespace {

using ::testing::Eq;
using ::testing::IsEmpty;

using StatsSample = ::webrtc::SamplesStatsCounter::StatsSample;

constexpr int kMaxFramesInFlightPerStream = 10;

DefaultVideoQualityAnalyzerOptions AnalyzerOptionsForTest() {
  DefaultVideoQualityAnalyzerOptions options;
  options.compute_psnr = false;
  options.compute_ssim = false;
  options.adjust_cropping_before_comparing_frames = false;
  options.max_frames_in_flight_per_stream_count = kMaxFramesInFlightPerStream;
  return options;
}

VideoFrame CreateFrame(uint16_t frame_id,
                       int width,
                       int height,
                       Timestamp timestamp) {
  std::unique_ptr<test::FrameGeneratorInterface> frame_generator =
      test::CreateSquareFrameGenerator(width, height,
                                       /*type=*/absl::nullopt,
                                       /*num_squares=*/absl::nullopt);
  test::FrameGeneratorInterface::VideoFrameData frame_data =
      frame_generator->NextFrame();
  return VideoFrame::Builder()
      .set_id(frame_id)
      .set_video_frame_buffer(frame_data.buffer)
      .set_update_rect(frame_data.update_rect)
      .set_timestamp_us(timestamp.us())
      .build();
}

StreamCodecInfo Vp8CodecForOneFrame(uint16_t frame_id, Timestamp time) {
  StreamCodecInfo info;
  info.codec_name = "VP8";
  info.first_frame_id = frame_id;
  info.last_frame_id = frame_id;
  info.switched_on_at = time;
  info.switched_from_at = time;
  return info;
}

FrameStats FrameStatsWith10msDeltaBetweenPhasesAnd10x10Frame(
    Timestamp captured_time) {
  FrameStats frame_stats(captured_time);
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);
  frame_stats.encoded_time = captured_time + TimeDelta::Millis(20);
  frame_stats.received_time = captured_time + TimeDelta::Millis(30);
  frame_stats.decode_start_time = captured_time + TimeDelta::Millis(40);
  // Decode time is in microseconds.
  frame_stats.decode_end_time = captured_time + TimeDelta::Micros(40010);
  frame_stats.rendered_time = captured_time + TimeDelta::Millis(60);
  frame_stats.used_encoder = Vp8CodecForOneFrame(1, frame_stats.encoded_time);
  frame_stats.used_decoder =
      Vp8CodecForOneFrame(1, frame_stats.decode_end_time);
  frame_stats.rendered_frame_width = 10;
  frame_stats.rendered_frame_height = 10;
  return frame_stats;
}

FrameStats ShiftStatsOn(const FrameStats& stats, TimeDelta delta) {
  FrameStats frame_stats(stats.captured_time + delta);
  frame_stats.pre_encode_time = stats.pre_encode_time + delta;
  frame_stats.encoded_time = stats.encoded_time + delta;
  frame_stats.received_time = stats.received_time + delta;
  frame_stats.decode_start_time = stats.decode_start_time + delta;
  frame_stats.decode_end_time = stats.decode_end_time + delta;
  frame_stats.rendered_time = stats.rendered_time + delta;

  frame_stats.used_encoder = stats.used_encoder;
  frame_stats.used_decoder = stats.used_decoder;
  frame_stats.rendered_frame_width = stats.rendered_frame_width;
  frame_stats.rendered_frame_height = stats.rendered_frame_height;

  return frame_stats;
}

double GetFirstOrDie(const SamplesStatsCounter& counter) {
  EXPECT_TRUE(!counter.IsEmpty()) << "Counter has to be not empty";
  return counter.GetSamples()[0];
}

std::string ToString(const SamplesStatsCounter& counter) {
  rtc::StringBuilder out;
  for (const StatsSample& s : counter.GetTimedSamples()) {
    out << "{ time_ms=" << s.time.ms() << "; value=" << s.value << "}, ";
  }
  return out.str();
}

void expectEmpty(const SamplesStatsCounter& counter) {
  EXPECT_TRUE(counter.IsEmpty())
      << "Expected empty SamplesStatsCounter, but got " << ToString(counter);
}

void expectEmpty(const SamplesRateCounter& counter) {
  EXPECT_TRUE(counter.IsEmpty())
      << "Expected empty SamplesRateCounter, but got "
      << counter.GetEventsPerSecond();
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     StatsPresentedAfterAddingOneComparison) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer, AnalyzerOptionsForTest());

  Timestamp stream_start_time = Clock::GetRealTimeClock()->CurrentTime();
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  size_t peers_count = 2;
  InternalStatsKey stats_key(stream, sender, receiver);

  FrameStats frame_stats =
      FrameStatsWith10msDeltaBetweenPhasesAnd10x10Frame(stream_start_time);

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, peers_count,
                                  stream_start_time, stream_start_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kRegular, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  std::map<InternalStatsKey, StreamStats> stats = comparator.stream_stats();
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.at(stats_key).transport_time_ms), 20.0);
  EXPECT_DOUBLE_EQ(
      GetFirstOrDie(stats.at(stats_key).total_delay_incl_transport_ms), 60.0);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.at(stats_key).encode_time_ms), 10.0);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.at(stats_key).decode_time_ms), 0.01);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.at(stats_key).receive_to_render_time_ms),
                   30.0);
  EXPECT_DOUBLE_EQ(
      GetFirstOrDie(stats.at(stats_key).resolution_of_rendered_frame), 100.0);
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     MultiFrameStatsPresentedAfterAddingTwoComparisonWith10msDelay) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer, AnalyzerOptionsForTest());

  Timestamp stream_start_time = Clock::GetRealTimeClock()->CurrentTime();
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  size_t peers_count = 2;
  InternalStatsKey stats_key(stream, sender, receiver);

  FrameStats frame_stats1 =
      FrameStatsWith10msDeltaBetweenPhasesAnd10x10Frame(stream_start_time);
  FrameStats frame_stats2 = FrameStatsWith10msDeltaBetweenPhasesAnd10x10Frame(
      stream_start_time + TimeDelta::Millis(15));
  frame_stats2.prev_frame_rendered_time = frame_stats1.rendered_time;

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, peers_count,
                                  stream_start_time, stream_start_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kRegular, frame_stats1);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kRegular, frame_stats2);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  std::map<InternalStatsKey, StreamStats> stats = comparator.stream_stats();
  EXPECT_DOUBLE_EQ(
      GetFirstOrDie(stats.at(stats_key).time_between_rendered_frames_ms), 15.0);
  EXPECT_DOUBLE_EQ(stats.at(stats_key).encode_frame_rate.GetEventsPerSecond(),
                   2.0 / 15 * 1000)
      << "There should be 2 events with interval of 15 ms";
  ;
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     FrameInFlightStatsAreHandledCorrectly) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer, AnalyzerOptionsForTest());

  Timestamp stream_start_time = Clock::GetRealTimeClock()->CurrentTime();
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  size_t peers_count = 2;
  InternalStatsKey stats_key(stream, sender, receiver);

  // There are 7 different timings inside frame stats: captured, pre_encode,
  // encoded, received, decode_start, decode_end, rendered. captured is always
  // set and received is set together with decode_start. So we create 6
  // different frame stats with interval of 15 ms, where for each stat next
  // timings will be set
  //   * 1st - captured
  //   * 2nd - captured, pre_encode
  //   * 3rd - captured, pre_encode, encoded
  //   * 4th - captured, pre_encode, encoded, received, decode_start
  //   * 5th - captured, pre_encode, encoded, received, decode_start, decode_end
  //   * 6th - all of them set
  std::vector<FrameStats> stats;
  // 1st stat
  FrameStats frame_stats(stream_start_time);
  stats.push_back(frame_stats);
  // 2nd stat
  frame_stats = ShiftStatsOn(frame_stats, TimeDelta::Millis(15));
  frame_stats.pre_encode_time =
      frame_stats.captured_time + TimeDelta::Millis(10);
  stats.push_back(frame_stats);
  // 3rd stat
  frame_stats = ShiftStatsOn(frame_stats, TimeDelta::Millis(15));
  frame_stats.encoded_time = frame_stats.captured_time + TimeDelta::Millis(20);
  frame_stats.used_encoder = Vp8CodecForOneFrame(1, frame_stats.encoded_time);
  stats.push_back(frame_stats);
  // 4th stat
  frame_stats = ShiftStatsOn(frame_stats, TimeDelta::Millis(15));
  frame_stats.received_time = frame_stats.captured_time + TimeDelta::Millis(30);
  frame_stats.decode_start_time =
      frame_stats.captured_time + TimeDelta::Millis(40);
  stats.push_back(frame_stats);
  // 5th stat
  frame_stats = ShiftStatsOn(frame_stats, TimeDelta::Millis(15));
  frame_stats.decode_end_time =
      frame_stats.captured_time + TimeDelta::Millis(50);
  frame_stats.used_decoder =
      Vp8CodecForOneFrame(1, frame_stats.decode_end_time);
  stats.push_back(frame_stats);
  // 6th stat
  frame_stats = ShiftStatsOn(frame_stats, TimeDelta::Millis(15));
  frame_stats.rendered_time = frame_stats.captured_time + TimeDelta::Millis(60);
  frame_stats.rendered_frame_width = 10;
  frame_stats.rendered_frame_height = 10;
  stats.push_back(frame_stats);

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, peers_count,
                                  stream_start_time, stream_start_time);
  for (size_t i = 0; i < stats.size() - 1; ++i) {
    comparator.AddComparison(stats_key,
                             /*captured=*/absl::nullopt,
                             /*rendered=*/absl::nullopt,
                             FrameComparisonType::kFrameInFlight, stats[i]);
  }
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kRegular,
                           stats[stats.size() - 1]);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats result_stats = comparator.stream_stats().at(stats_key);

  EXPECT_DOUBLE_EQ(result_stats.transport_time_ms.GetAverage(), 20.0)
      << ToString(result_stats.transport_time_ms);
  EXPECT_EQ(result_stats.transport_time_ms.NumSamples(), 3);

  EXPECT_DOUBLE_EQ(result_stats.total_delay_incl_transport_ms.GetAverage(),
                   60.0)
      << ToString(result_stats.total_delay_incl_transport_ms);
  EXPECT_EQ(result_stats.total_delay_incl_transport_ms.NumSamples(), 1);

  EXPECT_DOUBLE_EQ(result_stats.encode_time_ms.GetAverage(), 10)
      << ToString(result_stats.encode_time_ms);
  EXPECT_EQ(result_stats.encode_time_ms.NumSamples(), 4);

  EXPECT_DOUBLE_EQ(result_stats.decode_time_ms.GetAverage(), 10)
      << ToString(result_stats.decode_time_ms);
  EXPECT_EQ(result_stats.decode_time_ms.NumSamples(), 2);

  EXPECT_DOUBLE_EQ(result_stats.receive_to_render_time_ms.GetAverage(), 30)
      << ToString(result_stats.receive_to_render_time_ms);
  EXPECT_EQ(result_stats.receive_to_render_time_ms.NumSamples(), 1);

  EXPECT_DOUBLE_EQ(result_stats.resolution_of_rendered_frame.GetAverage(), 100)
      << ToString(result_stats.resolution_of_rendered_frame);
  EXPECT_EQ(result_stats.resolution_of_rendered_frame.NumSamples(), 1);

  EXPECT_DOUBLE_EQ(result_stats.encode_frame_rate.GetEventsPerSecond(),
                   4.0 / 45 * 1000)
      << "There should be 4 events with interval of 15 ms";
}

// Tests to validate that stats for each possible input frame are computed
// correctly.
// Frame in flight start
TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     CapturedOnlyInFlightFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kFrameInFlight, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  expectEmpty(stats.transport_time_ms);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  expectEmpty(stats.encode_time_ms);
  expectEmpty(stats.decode_time_ms);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  expectEmpty(stats.target_encode_bitrate);
  expectEmpty(stats.recv_key_frame_size_bytes);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 0);
  EXPECT_EQ(stats.num_send_key_frames, 0);
  EXPECT_EQ(stats.num_recv_key_frames, 0);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 0},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_THAT(stats.encoders, IsEmpty());
  EXPECT_THAT(stats.decoders, IsEmpty());
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     PreEncodedInFlightFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);
  // Frame pre encoded
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kFrameInFlight, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  expectEmpty(stats.transport_time_ms);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  expectEmpty(stats.encode_time_ms);
  expectEmpty(stats.decode_time_ms);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  expectEmpty(stats.target_encode_bitrate);
  expectEmpty(stats.recv_key_frame_size_bytes);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 0);
  EXPECT_EQ(stats.num_send_key_frames, 0);
  EXPECT_EQ(stats.num_recv_key_frames, 0);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 0},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_THAT(stats.encoders, IsEmpty());
  EXPECT_THAT(stats.decoders, IsEmpty());
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     EncodedInFlightKeyFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  uint16_t frame_id = 1;
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);
  // Frame pre encoded
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);
  // Frame encoded
  frame_stats.encoded_time = captured_time + TimeDelta::Millis(20);
  frame_stats.used_encoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.encoded_time);
  frame_stats.encoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.encoded_image_size = DataSize::Bytes(1000);
  frame_stats.target_encode_bitrate = 2000;

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kFrameInFlight, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  expectEmpty(stats.transport_time_ms);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.encode_time_ms), 10.0);
  expectEmpty(stats.decode_time_ms);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.target_encode_bitrate), 2000.0);
  expectEmpty(stats.recv_key_frame_size_bytes);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 1000);
  EXPECT_EQ(stats.num_send_key_frames, 1);
  EXPECT_EQ(stats.num_recv_key_frames, 0);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 0},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_EQ(stats.encoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_encoder});
  EXPECT_THAT(stats.decoders, IsEmpty());
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     EncodedInFlightDeltaFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  uint16_t frame_id = 1;
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);
  // Frame pre encoded
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);
  // Frame encoded
  frame_stats.encoded_time = captured_time + TimeDelta::Millis(20);
  frame_stats.used_encoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.encoded_time);
  frame_stats.encoded_frame_type = VideoFrameType::kVideoFrameDelta;
  frame_stats.encoded_image_size = DataSize::Bytes(1000);
  frame_stats.target_encode_bitrate = 2000;

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kFrameInFlight, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  expectEmpty(stats.transport_time_ms);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.encode_time_ms), 10.0);
  expectEmpty(stats.decode_time_ms);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.target_encode_bitrate), 2000.0);
  expectEmpty(stats.recv_key_frame_size_bytes);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 1000);
  EXPECT_EQ(stats.num_send_key_frames, 0);
  EXPECT_EQ(stats.num_recv_key_frames, 0);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 0},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_EQ(stats.encoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_encoder});
  EXPECT_THAT(stats.decoders, IsEmpty());
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     PreDecodedInFlightKeyFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  uint16_t frame_id = 1;
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);
  // Frame pre encoded
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);
  // Frame encoded
  frame_stats.encoded_time = captured_time + TimeDelta::Millis(20);
  frame_stats.used_encoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.encoded_time);
  frame_stats.encoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.encoded_image_size = DataSize::Bytes(1000);
  frame_stats.target_encode_bitrate = 2000;
  // Frame pre decoded
  frame_stats.pre_decoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.pre_decoded_image_size = DataSize::Bytes(500);
  frame_stats.received_time = captured_time + TimeDelta::Millis(30);
  frame_stats.decode_start_time = captured_time + TimeDelta::Millis(40);

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kFrameInFlight, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.transport_time_ms), 20.0);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.encode_time_ms), 10.0);
  expectEmpty(stats.decode_time_ms);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.target_encode_bitrate), 2000.0);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.recv_key_frame_size_bytes), 500.0);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 1000);
  EXPECT_EQ(stats.num_send_key_frames, 1);
  EXPECT_EQ(stats.num_recv_key_frames, 1);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 0},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_EQ(stats.encoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_encoder});
  EXPECT_THAT(stats.decoders, IsEmpty());
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     DecodedInFlightKeyFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  uint16_t frame_id = 1;
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);
  // Frame pre encoded
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);
  // Frame encoded
  frame_stats.encoded_time = captured_time + TimeDelta::Millis(20);
  frame_stats.used_encoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.encoded_time);
  frame_stats.encoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.encoded_image_size = DataSize::Bytes(1000);
  frame_stats.target_encode_bitrate = 2000;
  // Frame pre decoded
  frame_stats.pre_decoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.pre_decoded_image_size = DataSize::Bytes(500);
  frame_stats.received_time = captured_time + TimeDelta::Millis(30);
  frame_stats.decode_start_time = captured_time + TimeDelta::Millis(40);
  // Frame decoded
  frame_stats.decode_end_time = captured_time + TimeDelta::Millis(50);
  frame_stats.used_decoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.decode_end_time);

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kFrameInFlight, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.transport_time_ms), 20.0);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.encode_time_ms), 10.0);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.decode_time_ms), 10.0);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.target_encode_bitrate), 2000.0);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.recv_key_frame_size_bytes), 500.0);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 1000);
  EXPECT_EQ(stats.num_send_key_frames, 1);
  EXPECT_EQ(stats.num_recv_key_frames, 1);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 0},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_EQ(stats.encoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_encoder});
  EXPECT_EQ(stats.decoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_decoder});
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     DecoderFailureOnInFlightKeyFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  uint16_t frame_id = 1;
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);
  // Frame pre encoded
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);
  // Frame encoded
  frame_stats.encoded_time = captured_time + TimeDelta::Millis(20);
  frame_stats.used_encoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.encoded_time);
  frame_stats.encoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.encoded_image_size = DataSize::Bytes(1000);
  frame_stats.target_encode_bitrate = 2000;
  // Frame pre decoded
  frame_stats.pre_decoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.pre_decoded_image_size = DataSize::Bytes(500);
  frame_stats.received_time = captured_time + TimeDelta::Millis(30);
  frame_stats.decode_start_time = captured_time + TimeDelta::Millis(40);
  // Frame decoded
  frame_stats.decoder_failed = true;
  frame_stats.used_decoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.decode_end_time);

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kFrameInFlight, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.transport_time_ms), 20.0);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.encode_time_ms), 10.0);
  expectEmpty(stats.decode_time_ms);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.target_encode_bitrate), 2000.0);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.recv_key_frame_size_bytes), 500.0);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 1000);
  EXPECT_EQ(stats.num_send_key_frames, 1);
  EXPECT_EQ(stats.num_recv_key_frames, 1);
  // All frame in flight are not considered as dropped.
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 0},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_EQ(stats.encoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_encoder});
  EXPECT_EQ(stats.decoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_decoder});
}
// Frame in flight end

// Dropped frame start
TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     CapturedOnlyDroppedFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kDroppedFrame, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  expectEmpty(stats.transport_time_ms);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  expectEmpty(stats.encode_time_ms);
  expectEmpty(stats.decode_time_ms);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  expectEmpty(stats.target_encode_bitrate);
  expectEmpty(stats.recv_key_frame_size_bytes);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 0);
  EXPECT_EQ(stats.num_send_key_frames, 0);
  EXPECT_EQ(stats.num_recv_key_frames, 0);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 1},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 0},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_THAT(stats.encoders, IsEmpty());
  EXPECT_THAT(stats.decoders, IsEmpty());
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     PreEncodedDroppedFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);
  // Frame pre encoded
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kDroppedFrame, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  expectEmpty(stats.transport_time_ms);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  expectEmpty(stats.encode_time_ms);
  expectEmpty(stats.decode_time_ms);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  expectEmpty(stats.target_encode_bitrate);
  expectEmpty(stats.recv_key_frame_size_bytes);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 0);
  EXPECT_EQ(stats.num_send_key_frames, 0);
  EXPECT_EQ(stats.num_recv_key_frames, 0);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 1},
                                          {FrameDropPhase::kTransport, 0},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_THAT(stats.encoders, IsEmpty());
  EXPECT_THAT(stats.decoders, IsEmpty());
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     EncodedDroppedKeyFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  uint16_t frame_id = 1;
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);
  // Frame pre encoded
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);
  // Frame encoded
  frame_stats.encoded_time = captured_time + TimeDelta::Millis(20);
  frame_stats.used_encoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.encoded_time);
  frame_stats.encoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.encoded_image_size = DataSize::Bytes(1000);
  frame_stats.target_encode_bitrate = 2000;

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kDroppedFrame, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  expectEmpty(stats.transport_time_ms);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.encode_time_ms), 10.0);
  expectEmpty(stats.decode_time_ms);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.target_encode_bitrate), 2000.0);
  expectEmpty(stats.recv_key_frame_size_bytes);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 1000);
  EXPECT_EQ(stats.num_send_key_frames, 1);
  EXPECT_EQ(stats.num_recv_key_frames, 0);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 1},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_EQ(stats.encoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_encoder});
  EXPECT_THAT(stats.decoders, IsEmpty());
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     EncodedDroppedDeltaFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  uint16_t frame_id = 1;
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);
  // Frame pre encoded
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);
  // Frame encoded
  frame_stats.encoded_time = captured_time + TimeDelta::Millis(20);
  frame_stats.used_encoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.encoded_time);
  frame_stats.encoded_frame_type = VideoFrameType::kVideoFrameDelta;
  frame_stats.encoded_image_size = DataSize::Bytes(1000);
  frame_stats.target_encode_bitrate = 2000;

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kDroppedFrame, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  expectEmpty(stats.transport_time_ms);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.encode_time_ms), 10.0);
  expectEmpty(stats.decode_time_ms);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.target_encode_bitrate), 2000.0);
  expectEmpty(stats.recv_key_frame_size_bytes);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 1000);
  EXPECT_EQ(stats.num_send_key_frames, 0);
  EXPECT_EQ(stats.num_recv_key_frames, 0);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 1},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_EQ(stats.encoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_encoder});
  EXPECT_THAT(stats.decoders, IsEmpty());
}

// TODO(titovartem): add test that just pre decoded frame can't be received as
// dropped one because decoder always returns either decoded frame or error.

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     DecodedDroppedKeyFrameAccountedInStats) {
  // We don't really drop frames after decoder, so it's a bit unclear what is
  // correct way to account such frames in stats, so this test just fixes some
  // current way.
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  uint16_t frame_id = 1;
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);
  // Frame pre encoded
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);
  // Frame encoded
  frame_stats.encoded_time = captured_time + TimeDelta::Millis(20);
  frame_stats.used_encoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.encoded_time);
  frame_stats.encoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.encoded_image_size = DataSize::Bytes(1000);
  frame_stats.target_encode_bitrate = 2000;
  // Frame pre decoded
  frame_stats.pre_decoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.pre_decoded_image_size = DataSize::Bytes(500);
  frame_stats.received_time = captured_time + TimeDelta::Millis(30);
  frame_stats.decode_start_time = captured_time + TimeDelta::Millis(40);
  // Frame decoded
  frame_stats.decode_end_time = captured_time + TimeDelta::Millis(50);
  frame_stats.used_decoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.decode_end_time);

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kDroppedFrame, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  expectEmpty(stats.transport_time_ms);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.encode_time_ms), 10.0);
  expectEmpty(stats.decode_time_ms);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.target_encode_bitrate), 2000.0);
  expectEmpty(stats.recv_key_frame_size_bytes);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 1000);
  EXPECT_EQ(stats.num_send_key_frames, 1);
  EXPECT_EQ(stats.num_recv_key_frames, 0);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 0},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 1}}));
  EXPECT_EQ(stats.encoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_encoder});
  EXPECT_EQ(stats.decoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_decoder});
}

TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     DecoderFailedDroppedKeyFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  uint16_t frame_id = 1;
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  FrameStats frame_stats(captured_time);
  // Frame pre encoded
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);
  // Frame encoded
  frame_stats.encoded_time = captured_time + TimeDelta::Millis(20);
  frame_stats.used_encoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.encoded_time);
  frame_stats.encoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.encoded_image_size = DataSize::Bytes(1000);
  frame_stats.target_encode_bitrate = 2000;
  // Frame pre decoded
  frame_stats.pre_decoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.pre_decoded_image_size = DataSize::Bytes(500);
  frame_stats.received_time = captured_time + TimeDelta::Millis(30);
  frame_stats.decode_start_time = captured_time + TimeDelta::Millis(40);
  // Frame decoded
  frame_stats.decoder_failed = true;
  frame_stats.used_decoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.decode_end_time);

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/absl::nullopt,
                           /*rendered=*/absl::nullopt,
                           FrameComparisonType::kDroppedFrame, frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  expectEmpty(stats.psnr);
  expectEmpty(stats.ssim);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.transport_time_ms), 20.0);
  expectEmpty(stats.total_delay_incl_transport_ms);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.encode_time_ms), 10.0);
  expectEmpty(stats.decode_time_ms);
  expectEmpty(stats.receive_to_render_time_ms);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  expectEmpty(stats.resolution_of_rendered_frame);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.target_encode_bitrate), 2000.0);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.recv_key_frame_size_bytes), 500.0);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 1000);
  EXPECT_EQ(stats.num_send_key_frames, 1);
  EXPECT_EQ(stats.num_recv_key_frames, 1);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 0},
                                          {FrameDropPhase::kByDecoder, 1},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_EQ(stats.encoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_encoder});
  EXPECT_EQ(stats.decoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_decoder});
}
// Dropped frame end

// Regular frame start
TEST(DefaultVideoQualityAnalyzerFramesComparatorTest,
     RenderedKeyFrameAccountedInStats) {
  DefaultVideoQualityAnalyzerCpuMeasurer cpu_measurer;
  DefaultVideoQualityAnalyzerFramesComparator comparator(
      Clock::GetRealTimeClock(), cpu_measurer,
      DefaultVideoQualityAnalyzerOptions());

  Timestamp captured_time = Clock::GetRealTimeClock()->CurrentTime();
  uint16_t frame_id = 1;
  size_t stream = 0;
  size_t sender = 0;
  size_t receiver = 1;
  InternalStatsKey stats_key(stream, sender, receiver);

  // Frame captured
  VideoFrame frame =
      CreateFrame(frame_id, /*width=*/320, /*height=*/180, captured_time);
  FrameStats frame_stats(captured_time);
  // Frame pre encoded
  frame_stats.pre_encode_time = captured_time + TimeDelta::Millis(10);
  // Frame encoded
  frame_stats.encoded_time = captured_time + TimeDelta::Millis(20);
  frame_stats.used_encoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.encoded_time);
  frame_stats.encoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.encoded_image_size = DataSize::Bytes(1000);
  frame_stats.target_encode_bitrate = 2000;
  // Frame pre decoded
  frame_stats.pre_decoded_frame_type = VideoFrameType::kVideoFrameKey;
  frame_stats.pre_decoded_image_size = DataSize::Bytes(500);
  frame_stats.received_time = captured_time + TimeDelta::Millis(30);
  frame_stats.decode_start_time = captured_time + TimeDelta::Millis(40);
  // Frame decoded
  frame_stats.decode_end_time = captured_time + TimeDelta::Millis(50);
  frame_stats.used_decoder =
      Vp8CodecForOneFrame(frame_id, frame_stats.decode_end_time);
  // Frame rendered
  frame_stats.rendered_time = captured_time + TimeDelta::Millis(60);
  frame_stats.rendered_frame_width = 200;
  frame_stats.rendered_frame_height = 100;

  comparator.Start(/*max_threads_count=*/1);
  comparator.EnsureStatsForStream(stream, sender, /*peers_count=*/2,
                                  captured_time, captured_time);
  comparator.AddComparison(stats_key,
                           /*captured=*/frame,
                           /*rendered=*/frame, FrameComparisonType::kRegular,
                           frame_stats);
  comparator.Stop(/*last_rendered_frame_times=*/{});

  EXPECT_EQ(comparator.stream_stats().size(), 1lu);
  StreamStats stats = comparator.stream_stats().at(stats_key);
  EXPECT_EQ(stats.stream_started_time, captured_time);
  EXPECT_GE(GetFirstOrDie(stats.psnr), 20);
  EXPECT_GE(GetFirstOrDie(stats.ssim), 0.5);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.transport_time_ms), 20.0);
  EXPECT_GE(GetFirstOrDie(stats.total_delay_incl_transport_ms), 60.0);
  expectEmpty(stats.time_between_rendered_frames_ms);
  expectEmpty(stats.encode_frame_rate);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.encode_time_ms), 10.0);
  EXPECT_GE(GetFirstOrDie(stats.decode_time_ms), 10.0);
  EXPECT_GE(GetFirstOrDie(stats.receive_to_render_time_ms), 30.0);
  expectEmpty(stats.skipped_between_rendered);
  expectEmpty(stats.freeze_time_ms);
  expectEmpty(stats.time_between_freezes_ms);
  EXPECT_GE(GetFirstOrDie(stats.resolution_of_rendered_frame), 200 * 100.0);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.target_encode_bitrate), 2000.0);
  EXPECT_DOUBLE_EQ(GetFirstOrDie(stats.recv_key_frame_size_bytes), 500.0);
  expectEmpty(stats.recv_delta_frame_size_bytes);
  EXPECT_EQ(stats.total_encoded_images_payload, 1000);
  EXPECT_EQ(stats.num_send_key_frames, 1);
  EXPECT_EQ(stats.num_recv_key_frames, 1);
  EXPECT_THAT(stats.dropped_by_phase, Eq(std::map<FrameDropPhase, int64_t>{
                                          {FrameDropPhase::kBeforeEncoder, 0},
                                          {FrameDropPhase::kByEncoder, 0},
                                          {FrameDropPhase::kTransport, 0},
                                          {FrameDropPhase::kByDecoder, 0},
                                          {FrameDropPhase::kAfterDecoder, 0}}));
  EXPECT_EQ(stats.encoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_encoder});
  EXPECT_EQ(stats.decoders,
            std::vector<StreamCodecInfo>{*frame_stats.used_decoder});
}
// Regular frame end
// Stats validation tests end.

}  // namespace
}  // namespace webrtc
