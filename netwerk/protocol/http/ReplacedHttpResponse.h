/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef NETWERK_PROTOCOL_HTTP_REPLACEDHTTPRESPONSE_H_
#define NETWERK_PROTOCOL_HTTP_REPLACEDHTTPRESPONSE_H_

#include "nsString.h"
#include "nsHttpHeaderArray.h"
#include "nsIReplacedHttpResponse.h"
#include "mozilla/Atomics.h"

namespace mozilla::net {

// A ReplaceHttpResponse holds data which will be used to override the response
// of a http channel before the request is sent over the network.
// See nsIHttpChannelInternal::setResponseOverride to override the response.
class ReplacedHttpResponse : nsIReplacedHttpResponse {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIREPLACEDHTTPRESPONSE

 private:
  virtual ~ReplacedHttpResponse() = default;
  uint16_t mResponseStatus = 0;
  nsCString mResponseStatusText;
  nsCString mResponseBody;
  nsHttpHeaderArray mResponseHeaders;
  // Depth counter so nested visits cannot disarm the outer guard.
  Atomic<uint32_t> mInVisitHeaders{0};
};

}  // namespace mozilla::net

#endif  // NETWERK_PROTOCOL_HTTP_REPLACEDHTTPRESPONSE_H_
