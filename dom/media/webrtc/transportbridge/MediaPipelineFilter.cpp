/* */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Original author: bcampen@mozilla.com

#include "MediaPipelineFilter.h"

#include "api/rtp_headers.h"
#include "mozilla/Logging.h"

// defined in MediaPipeline.cpp
extern mozilla::LazyLogModule gMediaPipelineLog;

#define DEBUG_LOG(x) \
  MOZ_LOG_FMT(gMediaPipelineLog, LogLevel::Debug, MOZ_LOG_EXPAND_ARGS x)

namespace mozilla {
MediaPipelineFilter::MediaPipelineFilter(
    const std::vector<webrtc::RtpExtension>& aExtMap)
    : mExtMap(aExtMap) {}

void MediaPipelineFilter::SetRemoteMediaStreamId(
    const Maybe<std::string>& aMid) {
  if (aMid != mRemoteMid) {
    DEBUG_LOG(("MediaPipelineFilter 0x{} added new remote RTP MID: '{}'.",
               fmt::ptr(this), aMid.valueOr("").c_str()));
    mRemoteMid = aMid;
    mRemoteMidBindings.clear();
  }
}

bool MediaPipelineFilter::Filter(const webrtc::RTPHeader& header) {
  DEBUG_LOG(("MediaPipelineFilter 0x{} inspecting seq# {} SSRC: {}",
             fmt::ptr(this), header.sequenceNumber, header.ssrc));

  auto fromStreamId = [](const std::string& aId) {
    return Maybe<std::string>(aId.empty() ? Nothing() : Some(aId));
  };

  //
  //  MID Based Filtering
  //

  const auto mid = fromStreamId(header.extension.mid);

  // Check to see if a bound SSRC is moved to a new MID
  if (mRemoteMidBindings.count(header.ssrc) == 1 && mid && mRemoteMid != mid) {
    mRemoteMidBindings.erase(header.ssrc);
  }
  // Bind an SSRC if a matching MID is found
  if (mid && mRemoteMid == mid) {
    DEBUG_LOG(("MediaPipelineFilter 0x{} learned SSRC: {} for MID: '{}'",
               fmt::ptr(this), header.ssrc, mRemoteMid.value().c_str()));
    mRemoteMidBindings.insert(header.ssrc);
  }
  // Check for matching MID
  if (!mRemoteMidBindings.empty()) {
    MOZ_ASSERT(mRemoteMid != Nothing());
    if (mRemoteMidBindings.count(header.ssrc) == 1) {
      DEBUG_LOG(
          ("MediaPipelineFilter 0x{} SSRC: {} matched for MID: '{}'."
           " passing packet",
           fmt::ptr(this), header.ssrc, mRemoteMid.value().c_str()));
      return true;
    }
    DEBUG_LOG(
        ("MediaPipelineFilter 0x{} SSRC: {} did not match bound SSRC(s) for"
         " MID: '{}'. ignoring packet",
         fmt::ptr(this), header.ssrc, mRemoteMid.value().c_str()));
    for (const uint32_t ssrc : mRemoteMidBindings) {
      DEBUG_LOG(("MediaPipelineFilter 0x{} MID {} is associated with SSRC: {}",
                 fmt::ptr(this), mRemoteMid.value().c_str(), ssrc));
    }
    return false;
  }

  //
  // RTP-STREAM-ID based filtering (for tests only)
  //

  //
  // Remote SSRC based filtering
  //

  if (remote_ssrc_set_.count(header.ssrc)) {
    DEBUG_LOG(
        ("MediaPipelineFilter 0x{} SSRC: {} matched remote SSRC set."
         " passing packet",
         fmt::ptr(this), header.ssrc));
    return true;
  }
  DEBUG_LOG(
      ("MediaPipelineFilter 0x{} SSRC: {} did not match any of {}"
       " remote SSRCS.",
       fmt::ptr(this), header.ssrc, remote_ssrc_set_.size()));

  //
  // PT, payload type, last ditch effort filtering. We only try this if we do
  // not have any ssrcs configured (either by learning them, or negotiation).
  //

  if (unique_payload_type_set_.count(header.payloadType)) {
    DEBUG_LOG(
        ("MediaPipelineFilter 0x{} payload-type: {} matched {}"
         " unique payload type. learning ssrc. passing packet",
         fmt::ptr(this), header.ssrc, remote_ssrc_set_.size()));
    // Actual match. We need to update the ssrc map so we can route rtcp
    // sender reports correctly (these use a different payload-type field)
    AddRemoteSSRC(header.ssrc);
    return true;
  }
  DEBUG_LOG(
      ("MediaPipelineFilter 0x{} payload-type: {} did not match any of {}"
       " unique payload-types.",
       fmt::ptr(this), header.payloadType, unique_payload_type_set_.size()));
  DEBUG_LOG(
      ("MediaPipelineFilter 0x{} packet failed to match any criteria."
       " ignoring packet",
       fmt::ptr(this)));
  return false;
}

void MediaPipelineFilter::AddRemoteSSRC(uint32_t ssrc) {
  remote_ssrc_set_.insert(ssrc);
}

void MediaPipelineFilter::AddUniqueReceivePT(uint8_t payload_type) {
  unique_payload_type_set_.insert(payload_type);
}

void MediaPipelineFilter::AddOtherReceivePT(uint8_t payload_type) {
  other_payload_type_set_.insert(payload_type);
}

void MediaPipelineFilter::Update(const MediaPipelineFilter& filter_update,
                                 bool signalingStable) {
  // We will not stomp the remote_ssrc_set_ if the update has no ssrcs,
  // because we don't want to unlearn any remote ssrcs unless the other end
  // has explicitly given us a new set.
  if (!filter_update.remote_ssrc_set_.empty()) {
    remote_ssrc_set_ = filter_update.remote_ssrc_set_;
    for (const auto& ssrc : remote_ssrc_set_) {
      DEBUG_LOG(("MediaPipelineFilter 0x{} Now bound to remote SSRC {}",
                 fmt::ptr(this), ssrc));
    }
  }
  // We don't want to overwrite the learned binding unless we have changed MIDs
  // or the update contains a MID binding.
  if (!filter_update.mRemoteMidBindings.empty() ||
      (filter_update.mRemoteMid && filter_update.mRemoteMid != mRemoteMid)) {
    mRemoteMid = filter_update.mRemoteMid;
    mRemoteMidBindings = filter_update.mRemoteMidBindings;
    auto remoteMid = mRemoteMid.valueOrFrom([] { return std::string(); });
    DEBUG_LOG(("MediaPipelineFilter 0x{} Now bound to remote MID {}",
               fmt::ptr(this), remoteMid.c_str()));
    for (const auto& ssrc : mRemoteMidBindings) {
      DEBUG_LOG((
          "MediaPipelineFilter 0x{} Now bound to remote SSRC {} for remote MID "
          "{}",
          fmt::ptr(this), ssrc, remoteMid.c_str()));
    }
  }

  // If signaling is stable replace the pt filters, otherwise add to them.
  if (signalingStable) {
    unique_payload_type_set_ = filter_update.unique_payload_type_set_;
    other_payload_type_set_ = filter_update.other_payload_type_set_;
  } else {
    for (const auto& uniquePT : filter_update.unique_payload_type_set_) {
      if (!unique_payload_type_set_.count(uniquePT) &&
          !other_payload_type_set_.count(uniquePT)) {
        AddUniqueReceivePT(uniquePT);
      }
    }
  }
  for (const auto& pt : unique_payload_type_set_) {
    DEBUG_LOG(("MediaPipelineFilter 0x{} Now bound to remote unique PT {}",
               fmt::ptr(this), pt));
  }
  for (const auto& pt : other_payload_type_set_) {
    DEBUG_LOG(("MediaPipelineFilter 0x{} Now aware of other remote PT {}",
               fmt::ptr(this), pt));
  }

  // Use extmapping from new filter
  mExtMap = filter_update.mExtMap;
}

}  // end namespace mozilla
