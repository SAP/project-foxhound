/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "config.h"

#include <cassert>
#include <cstddef>
#include <cstdint>

#include "nss_scoped_ptrs.h"
#ifndef IS_DTLS_FUZZ
#include "nssb64.h"  // IWYU pragma: keep
#endif
#include "pk11pub.h"
#include "prio.h"
#include "prtypes.h"
#include "seccomon.h"
#include "ssl.h"
#include "sslexp.h"
#include "sslt.h"

#include "common.h"

const SSLCertificateCompressionAlgorithm kCompressionAlg = {
    0x1337, "fuzz", TlsCommon::DummyCompressionEncode,
    TlsCommon::DummyCompressionDecode};
const PRUint8 kPskIdentity[] = "fuzz-psk-identity";

#ifndef IS_DTLS_FUZZ
const char kEchConfigs[] =
    "AEX+"
    "DQBBcQAgACDh4IuiuhhInUcKZx5uYcehlG9PQ1ZlzhvVZyjJl7dscQAEAAEAAQASY2xvdWRmbG"
    "FyZS1lY2guY29tAAA=";
#endif  // IS_DTLS_FUZZ
const unsigned char kAlpnProtos[] = "\x02h2\x08http/1.1";

namespace TlsConfig {

// === Client ===

SECStatus Client::AuthCertificateHook(void* arg, PRFileDesc* fd,
                                      PRBool checksig, PRBool isServer) {
  assert(!isServer);

  auto config = reinterpret_cast<Client*>(arg);
  if (config->FailCertificateAuthentication()) return SECFailure;

  return SECSuccess;
}

SECStatus Client::CanFalseStartCallback(PRFileDesc* fd, void* arg,
                                        PRBool* canFalseStart) {
  auto config = reinterpret_cast<Client*>(arg);
  *canFalseStart = config->CanFalseStart();

  return SECSuccess;
}

// XOR 64-bit chunks of data to build a bitmap of config options derived from
// the fuzzing input. This seems the only way to fuzz various options while
// still maintaining compatibility with BoringSSL or OpenSSL fuzzers.
Client::Client(const uint8_t* data, size_t len) {
  union {
    uint64_t bitmap;
    struct {
      uint32_t config;
      uint16_t sslVersionRangeMin;
      uint16_t sslVersionRangeMax;
    };
  };

  bitmap = 0;
  for (size_t i = 0; i < len; i++) {
    bitmap ^= static_cast<uint64_t>(data[i]) << (8 * (i % 8));
  }

  // Map SSL version values to a valid range.
  sslVersionRangeMin = SSL_VERSION_RANGE_MIN_VALID +
                       (sslVersionRangeMin % (1 + SSL_VERSION_RANGE_MAX_VALID -
                                              SSL_VERSION_RANGE_MIN_VALID));
  sslVersionRangeMax = sslVersionRangeMin +
                       (sslVersionRangeMax %
                        (1 + SSL_VERSION_RANGE_MAX_VALID - sslVersionRangeMin));

  mConfig = config;
  mSslVersionRange = {
      .min = sslVersionRangeMin,
      .max = sslVersionRangeMax,
  };
}

void Client::SetCallbacks(PRFileDesc* fd) {
  SECStatus rv = SSL_AuthCertificateHook(fd, Client::AuthCertificateHook, this);
  assert(rv == SECSuccess);

  rv = SSL_SetCanFalseStartCallback(fd, Client::CanFalseStartCallback, this);
  assert(rv == SECSuccess);
}

void Client::SetSocketOptions(PRFileDesc* fd) {
  SECStatus rv = SSL_OptionSet(fd, SSL_ENABLE_EXTENDED_MASTER_SECRET,
                               this->EnableExtendedMasterSecret());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_REQUIRE_DH_NAMED_GROUPS,
                     this->RequireDhNamedGroups());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_FALSE_START, this->EnableFalseStart());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_DEFLATE, this->EnableDeflate());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_CBC_RANDOM_IV, this->CbcRandomIv());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_REQUIRE_SAFE_NEGOTIATION,
                     this->RequireSafeNegotiation());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_NO_CACHE, this->NoCache());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_GREASE, this->EnableGrease());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_CH_EXTENSION_PERMUTATION,
                     this->EnableCHExtensionPermutation());
  assert(rv == SECSuccess);

  if (this->SetCertificateCompressionAlgorithm()) {
    rv = SSL_SetCertificateCompressionAlgorithm(fd, kCompressionAlg);
    assert(rv == SECSuccess);
  }

#ifndef IS_DTLS_FUZZ
  if (this->SetClientEchConfigs()) {
    ScopedSECItem echConfigsBin(NSSBase64_DecodeBuffer(
        nullptr, nullptr, kEchConfigs, sizeof(kEchConfigs)));
    assert(echConfigsBin);

    rv = SSL_SetClientEchConfigs(fd, echConfigsBin->data, echConfigsBin->len);
    assert(rv == SECSuccess);
  }
#endif  // IS_DTLS_FUZZ

  if (this->SetVersionRange()) {
    rv = SSL_VersionRangeSet(fd, &mSslVersionRange);
    assert(rv == SECSuccess);
  }

  if (this->AddExternalPsk()) {
    ScopedPK11SlotInfo slot(PK11_GetInternalSlot());
    assert(slot);

    ScopedPK11SymKey key(PK11_KeyGen(slot.get(), CKM_NSS_CHACHA20_POLY1305,
                                     nullptr, 32, nullptr));
    assert(key);

    rv = SSL_AddExternalPsk(fd, key.get(), kPskIdentity,
                            sizeof(kPskIdentity) - 1, this->PskHashType());
    assert(rv == SECSuccess);
  }

  rv = SSL_OptionSet(fd, SSL_ENABLE_POST_HANDSHAKE_AUTH,
                     this->EnablePostHandshakeAuth());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_0RTT_DATA, this->EnableZeroRtt());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_ALPN, this->EnableAlpn());
  assert(rv == SECSuccess);

  if (this->EnableAlpn()) {
    rv = SSL_SetNextProtoNego(fd, kAlpnProtos, sizeof(kAlpnProtos) - 1);
    assert(rv == SECSuccess);
  }

  rv = SSL_OptionSet(fd, SSL_ENABLE_FALLBACK_SCSV, this->EnableFallbackScsv());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_OCSP_STAPLING, this->EnableOcspStapling());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_SESSION_TICKETS,
                     this->EnableSessionTickets());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_TLS13_COMPAT_MODE,
                     this->EnableTls13CompatMode());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_NO_LOCKS, this->NoLocks());
  assert(rv == SECSuccess);

  rv = SSL_EnableTls13GreaseEch(fd, this->EnableTls13GreaseEch());
  assert(rv == SECSuccess);

  rv = SSL_SetDtls13VersionWorkaround(fd, this->SetDtls13VersionWorkaround());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_DELEGATED_CREDENTIALS,
                     this->EnableDelegatedCredentials());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_DTLS_SHORT_HEADER,
                     this->EnableDtlsShortHeader());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_SIGNED_CERT_TIMESTAMPS,
                     this->EnableSignedCertTimestamps());
  assert(rv == SECSuccess);

  if (this->SetSmallRecordSizeLimit()) {
    rv = SSL_OptionSet(fd, SSL_RECORD_SIZE_LIMIT, 64);
    assert(rv == SECSuccess);
  }

#ifndef IS_DTLS_FUZZ
  rv =
      SSL_OptionSet(fd, SSL_ENABLE_RENEGOTIATION, SSL_RENEGOTIATE_UNRESTRICTED);
  assert(rv == SECSuccess);
#endif  // IS_DTLS_FUZZ
}

// === Server ===

SECStatus Server::AuthCertificateHook(void* arg, PRFileDesc* fd,
                                      PRBool checksig, PRBool isServer) {
  assert(isServer);
  auto config = reinterpret_cast<Server*>(arg);
  if (config->FailCertificateAuthentication()) return SECFailure;

  return SECSuccess;
}

SECStatus Server::CanFalseStartCallback(PRFileDesc* fd, void* arg,
                                        PRBool* canFalseStart) {
  *canFalseStart = true;
  return SECSuccess;
}

// XOR 64-bit chunks of data to build a bitmap of config options derived from
// the fuzzing input. This seems the only way to fuzz various options while
// still maintaining compatibility with BoringSSL or OpenSSL fuzzers.
Server::Server(const uint8_t* data, size_t len) {
  union {
    uint64_t bitmap;
    struct {
      uint32_t config;
      uint16_t sslVersionRangeMin;
      uint16_t sslVersionRangeMax;
    };
  };

  bitmap = 0;
  for (size_t i = 0; i < len; i++) {
    bitmap ^= static_cast<uint64_t>(data[i]) << (8 * (i % 8));
  }

  // Map SSL version values to a valid range.
  sslVersionRangeMin = SSL_VERSION_RANGE_MIN_VALID +
                       (sslVersionRangeMin % (1 + SSL_VERSION_RANGE_MAX_VALID -
                                              SSL_VERSION_RANGE_MIN_VALID));
  sslVersionRangeMax = sslVersionRangeMin +
                       (sslVersionRangeMax %
                        (1 + SSL_VERSION_RANGE_MAX_VALID - sslVersionRangeMin));

  mConfig = config;
  mSslVersionRange = {
      .min = sslVersionRangeMin,
      .max = sslVersionRangeMax,
  };
}

void Server::SetCallbacks(PRFileDesc* fd) {
  SECStatus rv = SSL_AuthCertificateHook(fd, Server::AuthCertificateHook, this);
  assert(rv == SECSuccess);

  rv = SSL_SetCanFalseStartCallback(fd, Server::CanFalseStartCallback, nullptr);
  assert(rv == SECSuccess);
}

void Server::SetSocketOptions(PRFileDesc* fd) {
  SECStatus rv = SSL_OptionSet(fd, SSL_ENABLE_EXTENDED_MASTER_SECRET,
                               this->EnableExtendedMasterSecret());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_REQUEST_CERTIFICATE, this->RequestCertificate());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_REQUIRE_CERTIFICATE, this->RequireCertificate());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_DEFLATE, this->EnableDeflate());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_CBC_RANDOM_IV, this->EnableCbcRandomIv());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_REQUIRE_SAFE_NEGOTIATION,
                     this->RequireSafeNegotiation());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_NO_CACHE, this->NoCache());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_GREASE, this->EnableGrease());
  assert(rv == SECSuccess);

  if (this->SetCertificateCompressionAlgorithm()) {
    rv = SSL_SetCertificateCompressionAlgorithm(fd, kCompressionAlg);
    assert(rv == SECSuccess);
  }

  if (this->SetVersionRange()) {
    rv = SSL_VersionRangeSet(fd, &mSslVersionRange);
    assert(rv == SECSuccess);
  }

  if (this->AddExternalPsk()) {
    ScopedPK11SlotInfo slot(PK11_GetInternalSlot());
    assert(slot);

    ScopedPK11SymKey key(PK11_KeyGen(slot.get(), CKM_NSS_CHACHA20_POLY1305,
                                     nullptr, 32, nullptr));
    assert(key);

    rv = SSL_AddExternalPsk(fd, key.get(), kPskIdentity,
                            sizeof(kPskIdentity) - 1, this->PskHashType());
    assert(rv == SECSuccess);
  }

  rv = SSL_OptionSet(fd, SSL_ENABLE_0RTT_DATA, this->EnableZeroRtt());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_ALPN, this->EnableAlpn());
  assert(rv == SECSuccess);

  if (this->EnableAlpn()) {
    rv = SSL_SetNextProtoNego(fd, kAlpnProtos, sizeof(kAlpnProtos) - 1);
    assert(rv == SECSuccess);
  }

  rv = SSL_OptionSet(fd, SSL_ENABLE_FALLBACK_SCSV, this->EnableFallbackScsv());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_SESSION_TICKETS,
                     this->EnableSessionTickets());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_NO_LOCKS, this->NoLocks());
  assert(rv == SECSuccess);

  rv = SSL_EnableTls13BackendEch(fd, this->EnableTls13BackendEch());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_DELEGATED_CREDENTIALS,
                     this->EnableDelegatedCredentials());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_DTLS_SHORT_HEADER,
                     this->EnableDtlsShortHeader());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_SIGNED_CERT_TIMESTAMPS,
                     this->EnableSignedCertTimestamps());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_OCSP_STAPLING, this->EnableOcspStapling());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_ENABLE_TLS13_COMPAT_MODE,
                     this->EnableTls13CompatMode());
  assert(rv == SECSuccess);

  if (this->SetSmallRecordSizeLimit()) {
    rv = SSL_OptionSet(fd, SSL_RECORD_SIZE_LIMIT, 64);
    assert(rv == SECSuccess);
  }

  rv = SSL_OptionSet(fd, SSL_ENABLE_POST_HANDSHAKE_AUTH,
                     this->EnablePostHandshakeAuth());
  assert(rv == SECSuccess);

  rv = SSL_OptionSet(fd, SSL_REQUIRE_DH_NAMED_GROUPS,
                     this->RequireDhNamedGroups());
  assert(rv == SECSuccess);

#ifndef IS_DTLS_FUZZ
  rv =
      SSL_OptionSet(fd, SSL_ENABLE_RENEGOTIATION, SSL_RENEGOTIATE_UNRESTRICTED);
  assert(rv == SECSuccess);
#endif
}

}  // namespace TlsConfig
