/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_WEBRTC_LIBWEBRTCOVERRIDES_CALL_CALL_BASIC_STATS_H_
#define DOM_MEDIA_WEBRTC_LIBWEBRTCOVERRIDES_CALL_CALL_BASIC_STATS_H_

#include <optional>
#include <string>

#include "modules/congestion_controller/rtp/congestion_controller_feedback_stats.h"
#include "rtc_base/containers/flat_map.h"

namespace webrtc {

// named to avoid conflicts with video/call_stats.h
struct CallBasicStats {
  std::string ToString(int64_t time_ms) const;

  int send_bandwidth_bps = 0;       // Estimated available send bandwidth.
  int max_padding_bitrate_bps = 0;  // Cumulative configured max padding.
  int recv_bandwidth_bps = 0;       // Estimated available receive bandwidth.
  int64_t pacer_delay_ms = 0;
  int64_t rtt_ms = -1;
  std::optional<int64_t> ccfb_messages_received = std::nullopt;
  flat_map<uint32_t, SentCongestionControllerFeedbackStats>
      sent_ccfb_stats_per_ssrc;
};

}  // namespace webrtc

#endif  // DOM_MEDIA_WEBRTC_LIBWEBRTCOVERRIDES_CALL_CALL_BASIC_STATS_H_
