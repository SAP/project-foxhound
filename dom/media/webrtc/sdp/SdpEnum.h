/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_WEBRTC_SDP_SDPENUM_H_
#define DOM_MEDIA_WEBRTC_SDP_SDPENUM_H_

#include <ostream>

#include "mozilla/Assertions.h"
#include "mozilla/TypedEnumBits.h"

namespace mozilla::sdp {

enum NetType { kNetTypeNone, kInternet };

inline std::ostream& operator<<(std::ostream& os, const sdp::NetType t) {
  switch (t) {
    case sdp::kNetTypeNone:
      MOZ_ASSERT(false);
      return os << "NONE";
    case sdp::kInternet:
      return os << "IN";
  }
  MOZ_CRASH("Unknown NetType");
}

enum AddrType { kAddrTypeNone, kIPv4, kIPv6 };

inline std::ostream& operator<<(std::ostream& os, const sdp::AddrType t) {
  switch (t) {
    case sdp::kAddrTypeNone:
      MOZ_ASSERT(false);
      return os << "NONE";
    case sdp::kIPv4:
      return os << "IP4";
    case sdp::kIPv6:
      return os << "IP6";
  }
  MOZ_CRASH("Unknown AddrType");
}

enum Direction {
  // Start at 1 so these can be used as flags
  kSend = 1,
  kRecv = 2
};

MOZ_MAKE_ENUM_CLASS_BITWISE_OPERATORS(Direction);

inline std::ostream& operator<<(std::ostream& os, const sdp::Direction d) {
  switch (d) {
    case sdp::kSend:
      return os << "send";
    case sdp::kRecv:
      return os << "recv";
  }
  MOZ_CRASH("Unknown Direction");
}

enum SdpType { kOffer, kAnswer };

}  // namespace mozilla::sdp

#endif
