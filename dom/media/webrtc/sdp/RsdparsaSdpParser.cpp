/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "sdp/RsdparsaSdpParser.h"

#include "mozilla/UniquePtr.h"
#include "nsError.h"
#include "nsString.h"
#include "sdp/RsdparsaSdp.h"
#include "sdp/RsdparsaSdpGlue.h"
#include "sdp/RsdparsaSdpInc.h"
#include "sdp/Sdp.h"

namespace mozilla {

namespace ffi = mozilla::sdp::ffi;

const std::string& RsdparsaSdpParser::ParserName() {
  static const std::string& WEBRTC_SDP_NAME = "WEBRTCSDP";
  return WEBRTC_SDP_NAME;
}

UniquePtr<SdpParser::Results> RsdparsaSdpParser::Parse(
    const std::string& aText) {
  UniquePtr<SdpParser::InternalResults> results(
      new SdpParser::InternalResults(Name()));
  const ffi::SdpSession* result = nullptr;
  const ffi::SdpParserError* err = nullptr;
  ffi::StringView sdpTextView{reinterpret_cast<const uint8_t*>(aText.data()),
                              aText.length()};
  nsresult rv = parse_sdp(sdpTextView, false, &result, &err);
  if (rv != NS_OK) {
    size_t line = sdp_get_error_line_num(const_cast<ffi::SdpParserError*>(err));
    nsAutoCString errMsg;
    sdp_get_error_message(err, &errMsg);
    sdp_free_error(const_cast<ffi::SdpParserError*>(err));
    results->AddParseError(line, std::string(errMsg.get(), errMsg.Length()));
    return results;
  }

  if (err) {
    size_t line = sdp_get_error_line_num(const_cast<ffi::SdpParserError*>(err));
    nsAutoCString warningMsg;
    sdp_get_error_message(err, &warningMsg);
    results->AddParseWarning(
        line, std::string(warningMsg.get(), warningMsg.Length()));
    sdp_free_error(const_cast<ffi::SdpParserError*>(err));
  }

  RsdparsaSessionHandle uniqueResult(const_cast<ffi::SdpSession*>(result));
  ffi::RustSdpOrigin rustOrigin = sdp_get_origin(uniqueResult.get());
  auto address = convertExplicitlyTypedAddress(rustOrigin.addr);
  SdpOrigin origin(std::string(convertStringView(rustOrigin.username)),
                   rustOrigin.session_id, rustOrigin.session_version,
                   address.first, address.second);

  results->SetSdp(MakeUnique<RsdparsaSdp>(std::move(uniqueResult), origin));
  return results;
}

bool RsdparsaSdpParser::IsNamed(const std::string& aName) {
  return aName == ParserName();
}

}  // namespace mozilla
