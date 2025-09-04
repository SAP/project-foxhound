/*
 *  Copyright 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree. An additional intellectual property rights grant can be found
 *  in the file PATENTS.  All contributing project authors may
 *  be found in the AUTHORS file in the root of the source tree.
 */

#ifndef P2P_DTLS_DTLS_TRANSPORT_FACTORY_H_
#define P2P_DTLS_DTLS_TRANSPORT_FACTORY_H_

#include <memory>

#include "api/crypto/crypto_options.h"
#include "p2p/base/ice_transport_internal.h"
#include "p2p/dtls/dtls_transport_internal.h"
#include "rtc_base/ssl_stream_adapter.h"

namespace cricket {

// This interface is used to create DTLS transports. The external transports
// can be injected into the JsepTransportController through it.
//
// TODO(qingsi): Remove this factory in favor of one that produces
// DtlsTransportInterface given by the public API if this is going to be
// injectable.
class DtlsTransportFactory {
 public:
  virtual ~DtlsTransportFactory() = default;

  virtual std::unique_ptr<DtlsTransportInternal> CreateDtlsTransport(
      IceTransportInternal* ice,
      const webrtc::CryptoOptions& crypto_options,
      rtc::SSLProtocolVersion max_version) = 0;
};

}  // namespace cricket

#endif  // P2P_DTLS_DTLS_TRANSPORT_FACTORY_H_
