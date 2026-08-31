/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_WEBRTC_SDP_SIPCCSDPPARSER_H_
#define DOM_MEDIA_WEBRTC_SDP_SIPCCSDPPARSER_H_

#include <string>

#include "mozilla/UniquePtr.h"
#include "sdp/Sdp.h"
#include "sdp/SdpParser.h"

namespace mozilla {

class SipccSdpParser final : public SdpParser {
  static const std::string& ParserName();

 public:
  SipccSdpParser() = default;
  virtual ~SipccSdpParser() = default;

  const std::string& Name() const override { return ParserName(); }

  UniquePtr<SdpParser::Results> Parse(const std::string& aText) override;

  static bool IsNamed(const std::string& aName);
};

}  // namespace mozilla

#endif
