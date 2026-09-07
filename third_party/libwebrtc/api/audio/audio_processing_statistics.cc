/*
 *  Copyright 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree. An additional intellectual property rights grant can be found
 *  in the file PATENTS.  All contributing project authors may
 *  be found in the AUTHORS file in the root of the source tree.
 */

#include "api/audio/audio_processing_statistics.h"

namespace webrtc {

AudioProcessingStats::AudioProcessingStats() = default;

// TODO: https://issues.webrtc.org/42221314 - remove pragma when deprecated
// field `voice_detected` is removed.
#if defined(__clang__)
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
#endif
AudioProcessingStats::AudioProcessingStats(const AudioProcessingStats& other) =
    default;
#if defined(__clang__)
#pragma clang diagnostic pop
#endif

AudioProcessingStats::~AudioProcessingStats() = default;

}  // namespace webrtc
