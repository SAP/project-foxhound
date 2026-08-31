/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef DOM_MEDIA_WEBRTC_SDP_RSDPARSASDPGLUE_H_
#define DOM_MEDIA_WEBRTC_SDP_RSDPARSASDPGLUE_H_

#include <span>
#include <string>
#include <string_view>
#include <utility>

#include "SdpEnum.h"
#include "mozilla/Assertions.h"
#include "mozilla/UniquePtr.h"
#include "sdp/RsdparsaSdpInc.h"

namespace mozilla {

struct FreeRustSdpSession {
  void operator()(sdp::ffi::SdpSession* aSess) { sdp_free_session(aSess); }
};

using RsdparsaSessionHandle =
    UniquePtr<sdp::ffi::SdpSession, FreeRustSdpSession>;

template <typename T>
std::span<const T> convertRustSpan(sdp::ffi::RustSpan<T> s) {
  if (!s.buffer) {
    return std::span<const T>();
  }
  return std::span<const T>(s.buffer, s.len);
}

inline std::string_view convertStringView(sdp::ffi::StringView str) {
  if (!str.buffer) {
    return std::string_view();
  }
  return std::string_view(reinterpret_cast<const char*>(str.buffer), str.len);
}

inline std::string convertAddress(const sdp::ffi::RustAddress& address) {
  if (address.is_fqdn) {
    return std::string(convertStringView(address.fqdn));
  }
  return std::string(reinterpret_cast<const char*>(address.ip_address));
}

inline sdp::AddrType convertAddressType(sdp::ffi::RustAddressType type) {
  switch (type) {
    case sdp::ffi::RustAddressType::IP4:
      return sdp::kIPv4;
    case sdp::ffi::RustAddressType::IP6:
      return sdp::kIPv6;
  }
  MOZ_CRASH("unknown address type");
}

inline std::pair<sdp::AddrType, std::string> convertExplicitlyTypedAddress(
    const sdp::ffi::RustExplicitlyTypedAddress& address) {
  return std::make_pair(convertAddressType(address.address_type),
                        convertAddress(address.address));
}

}  // namespace mozilla

#endif
