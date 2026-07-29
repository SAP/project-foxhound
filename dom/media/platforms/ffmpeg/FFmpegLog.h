/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef FFmpegLog_h_
#define FFmpegLog_h_

#include "mozilla/Logging.h"

static mozilla::LazyLogModule sFFmpegVideoLog("FFmpegVideo");
static mozilla::LazyLogModule sFFmpegAudioLog("FFmpegAudio");

#ifdef FFVPX_VERSION
#  define FFMPEG_LOG(str, ...)                                   \
    MOZ_LOG_FMT(mVideoCodec ? sFFmpegVideoLog : sFFmpegAudioLog, \
                mozilla::LogLevel::Debug, "FFVPX: " str, ##__VA_ARGS__)
#  define FFMPEGV_LOG(str, ...)                                           \
    MOZ_LOG_FMT(sFFmpegVideoLog, mozilla::LogLevel::Debug, "FFVPX: " str, \
                ##__VA_ARGS__)
#  define FFMPEGA_LOG(str, ...)                                           \
    MOZ_LOG_FMT(sFFmpegAudioLog, mozilla::LogLevel::Debug, "FFVPX: " str, \
                ##__VA_ARGS__)
#  define FFMPEGP_LOG(str, ...) \
    MOZ_LOG_FMT(sPDMLog, mozilla::LogLevel::Debug, "FFVPX: " str, ##__VA_ARGS__)
#else
#  define FFMPEG_LOG(str, ...)                                   \
    MOZ_LOG_FMT(mVideoCodec ? sFFmpegVideoLog : sFFmpegAudioLog, \
                mozilla::LogLevel::Debug, "FFMPEG: " str, ##__VA_ARGS__)
#  define FFMPEGV_LOG(str, ...)                                            \
    MOZ_LOG_FMT(sFFmpegVideoLog, mozilla::LogLevel::Debug, "FFMPEG: " str, \
                ##__VA_ARGS__)
#  define FFMPEGA_LOG(str, ...)                                            \
    MOZ_LOG_FMT(sFFmpegAudioLog, mozilla::LogLevel::Debug, "FFMPEG: " str, \
                ##__VA_ARGS__)
#  define FFMPEGP_LOG(str, ...)                                    \
    MOZ_LOG_FMT(sPDMLog, mozilla::LogLevel::Debug, "FFMPEG: " str, \
                ##__VA_ARGS__)
#endif

#define FFMPEG_LOGV(...)                                       \
  MOZ_LOG_FMT(mVideoCodec ? sFFmpegVideoLog : sFFmpegAudioLog, \
              mozilla::LogLevel::Verbose, __VA_ARGS__)

#endif  // FFmpegLog_h_
