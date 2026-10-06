/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef TLS_CONFIG_H_
#define TLS_CONFIG_H_

#include <cstddef>
#include <cstdint>
#include <iomanip>
#include <ostream>

#include "prio.h"
#include "sslt.h"

#ifdef IS_DTLS_FUZZ
#define SSL_VERSION_RANGE_MIN_VALID 0x0302
#else
#define SSL_VERSION_RANGE_MIN_VALID 0x0301
#endif
#define SSL_VERSION_RANGE_MAX_VALID 0x0304

// Single source of truth for all client config bit options: option(bit, name).
// To add a new option, add it here and handle it in SetSocketOptions.
// The getter and debug print are generated automatically.
// clang-format off
#define TLS_CLIENT_CONFIG_OPTIONS(option)              \
  option( 0, FailCertificateAuthentication)            \
  option( 1, EnableExtendedMasterSecret)               \
  option( 2, RequireDhNamedGroups)                     \
  option( 3, EnableFalseStart)                         \
  option( 4, EnableDeflate)                            \
  option( 5, CbcRandomIv)                              \
  option( 6, RequireSafeNegotiation)                   \
  option( 7, NoCache)                                  \
  option( 8, EnableGrease)                             \
  option( 9, EnableCHExtensionPermutation)             \
  option(10, SetCertificateCompressionAlgorithm)       \
  option(11, SetClientEchConfigs)                      \
  option(12, SetVersionRange)                          \
  option(13, AddExternalPsk)                           \
  option(14, EnablePostHandshakeAuth)                  \
  option(15, EnableZeroRtt)                            \
  option(16, EnableAlpn)                               \
  option(17, EnableFallbackScsv)                       \
  option(18, EnableOcspStapling)                       \
  option(19, EnableSessionTickets)                     \
  option(20, EnableTls13CompatMode)                    \
  option(21, NoLocks)                                  \
  option(22, EnableTls13GreaseEch)                     \
  option(23, SetDtls13VersionWorkaround)               \
  option(24, EnableDelegatedCredentials)               \
  option(25, EnableDtlsShortHeader)                    \
  option(26, EnableSignedCertTimestamps)               \
  option(27, SetSmallRecordSizeLimit)                  \
  option(28, CanFalseStart)
// clang-format on

#define TLS_CLIENT_OPTIONS_COUNTER(bit, name) +1
constexpr int kTlsClientConfigOptionCount =
    0 TLS_CLIENT_CONFIG_OPTIONS(TLS_CLIENT_OPTIONS_COUNTER);
#undef TLS_CLIENT_OPTIONS_COUNTER
static_assert(kTlsClientConfigOptionCount <= 32,
              "mConfig is uint32_t, cannot exceed 32 options");

// Single source of truth for all server config bit options: option(bit, name).
// To add a new option, add it here and handle it in SetSocketOptions.
// The getter and debug print are generated automatically.
// clang-format off
#define TLS_SERVER_CONFIG_OPTIONS(option)              \
  option( 0, EnableExtendedMasterSecret)               \
  option( 1, RequestCertificate)                       \
  option( 2, RequireCertificate)                       \
  option( 3, EnableDeflate)                            \
  option( 4, EnableCbcRandomIv)                        \
  option( 5, RequireSafeNegotiation)                   \
  option( 6, NoCache)                                  \
  option( 7, EnableGrease)                             \
  option( 8, SetCertificateCompressionAlgorithm)       \
  option( 9, SetVersionRange)                          \
  option(10, AddExternalPsk)                           \
  option(11, EnableZeroRtt)                            \
  option(12, EnableAlpn)                               \
  option(13, EnableFallbackScsv)                       \
  option(14, EnableSessionTickets)                     \
  option(15, NoLocks)                                  \
  option(16, FailCertificateAuthentication)            \
  option(17, EnableTls13BackendEch)                    \
  option(18, EnableDelegatedCredentials)               \
  option(19, EnableDtlsShortHeader)                    \
  option(20, EnableSignedCertTimestamps)               \
  option(21, EnableOcspStapling)                       \
  option(22, EnableTls13CompatMode)                    \
  option(23, SetSmallRecordSizeLimit)                  \
  option(24, EnablePostHandshakeAuth)                  \
  option(25, RequireDhNamedGroups)
// clang-format on

#define TLS_SERVER_OPTIONS_COUNTER(bit, name) +1
constexpr int kTlsServerConfigOptionCount =
    0 TLS_SERVER_CONFIG_OPTIONS(TLS_SERVER_OPTIONS_COUNTER);
#undef TLS_SERVER_OPTIONS_COUNTER
static_assert(kTlsServerConfigOptionCount <= 32,
              "mConfig is uint32_t, cannot exceed 32 options");

namespace TlsConfig {

class Client {
 public:
  Client(const uint8_t* data, size_t len);

  static SECStatus AuthCertificateHook(void* arg, PRFileDesc* fd,
                                       PRBool checksig, PRBool isServer);
  static SECStatus CanFalseStartCallback(PRFileDesc* fd, void* arg,
                                         PRBool* canFalseStart);

  void SetCallbacks(PRFileDesc* fd);
  void SetSocketOptions(PRFileDesc* fd);

  SSLHashType PskHashType() {
    if (mConfig % 2) return ssl_hash_sha256;

    return ssl_hash_sha384;
  };
  SSLVersionRange SslVersionRange() { return mSslVersionRange; };

#define TLS_CLIENT_OPTIONS_GETTER(bit, name) \
  bool name() { return mConfig & (1 << bit); };
  TLS_CLIENT_CONFIG_OPTIONS(TLS_CLIENT_OPTIONS_GETTER)
#undef TLS_CLIENT_OPTIONS_GETTER

 private:
  uint32_t mConfig;
  SSLVersionRange mSslVersionRange;
};

inline std::ostream& operator<<(std::ostream& out, Client& config) {
  out << "============= ClientConfig =============\n";

#define TLS_CLIENT_DEBUG_PRINT(bit, name) \
  out << std::left << std::setw(36) << #name ":" << config.name() << "\n";
  TLS_CLIENT_CONFIG_OPTIONS(TLS_CLIENT_DEBUG_PRINT)
#undef TLS_CLIENT_DEBUG_PRINT

  out << std::left << std::setw(36)
      << "  SSL Version Range Min:" << config.SslVersionRange().min << "\n";
  out << std::left << std::setw(36)
      << "  SSL Version Range Max:" << config.SslVersionRange().max << "\n";
  out << std::left << std::setw(36) << "  PskHashType:" << config.PskHashType()
      << "\n";

  out << "========================================";
  return out;
}

class Server {
 public:
  Server(const uint8_t* data, size_t len);

  static SECStatus AuthCertificateHook(void* arg, PRFileDesc* fd,
                                       PRBool checksig, PRBool isServer);
  static SECStatus CanFalseStartCallback(PRFileDesc* fd, void* arg,
                                         PRBool* canFalseStart);

  void SetCallbacks(PRFileDesc* fd);
  void SetSocketOptions(PRFileDesc* fd);

  SSLHashType PskHashType() {
    if (mConfig % 2) return ssl_hash_sha256;

    return ssl_hash_sha384;
  };
  SSLVersionRange SslVersionRange() { return mSslVersionRange; };

#define TLS_SERVER_OPTIONS_GETTER(bit, name) \
  bool name() { return mConfig & (1 << bit); };
  TLS_SERVER_CONFIG_OPTIONS(TLS_SERVER_OPTIONS_GETTER)
#undef TLS_SERVER_OPTIONS_GETTER

 private:
  uint32_t mConfig;
  SSLVersionRange mSslVersionRange;
};

inline std::ostream& operator<<(std::ostream& out, Server& config) {
  out << "============= ServerConfig =============\n";

#define TLS_SERVER_DEBUG_PRINT(bit, name) \
  out << std::left << std::setw(36) << #name ":" << config.name() << "\n";
  TLS_SERVER_CONFIG_OPTIONS(TLS_SERVER_DEBUG_PRINT)
#undef TLS_SERVER_DEBUG_PRINT

  out << std::left << std::setw(36)
      << "  SSL Version Range Min:" << config.SslVersionRange().min << "\n";
  out << std::left << std::setw(36)
      << "  SSL Version Range Max:" << config.SslVersionRange().max << "\n";
  out << std::left << std::setw(36) << "  PskHashType:" << config.PskHashType()
      << "\n";

  out << "========================================";
  return out;
}

}  // namespace TlsConfig

#endif  // TLS_CONFIG_H_
