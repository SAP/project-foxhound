/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef CANDIDATE_INFO_H_
#define CANDIDATE_INFO_H_

#include <cstdint>
#include <string>

namespace mozilla {

// This is used both by IPDL code, and by signaling code.
struct CandidateInfo {
  std::string mCandidate;
  std::string mMDNSAddress;
  std::string mActualAddress;
  std::string mUfrag;
  std::string mDefaultHostRtp;
  uint16_t mDefaultPortRtp = 0;
  std::string mDefaultHostRtcp;
  uint16_t mDefaultPortRtcp = 0;
};

}  // namespace mozilla

#endif  // CANDIDATE_INFO_H_
