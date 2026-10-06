/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef der_encode_h__
#define der_encode_h__

#include <cstdint>
#include <initializer_list>
#include <vector>

namespace nss_test {

using Bytes = std::vector<uint8_t>;

inline Bytes DerLen(size_t n) {
  if (n < 0x80) return {static_cast<uint8_t>(n)};
  if (n < 0x100) return {0x81, static_cast<uint8_t>(n)};
  if (n < 0x10000)
    return {0x82, static_cast<uint8_t>(n >> 8), static_cast<uint8_t>(n)};
  return {0x83, static_cast<uint8_t>(n >> 16), static_cast<uint8_t>(n >> 8),
          static_cast<uint8_t>(n)};
}

inline Bytes DerTagged(uint8_t tag, const Bytes& body) {
  Bytes r = {tag};
  Bytes len = DerLen(body.size());
  r.insert(r.end(), len.begin(), len.end());
  r.insert(r.end(), body.begin(), body.end());
  return r;
}

inline Bytes Cat(std::initializer_list<Bytes> parts) {
  Bytes r;
  for (const auto& p : parts) r.insert(r.end(), p.begin(), p.end());
  return r;
}

inline Bytes Seq(const Bytes& b) { return DerTagged(0x30, b); }
inline Bytes Ctx0(const Bytes& b) { return DerTagged(0xa0, b); }
inline Bytes OctetStr(const Bytes& b) { return DerTagged(0x04, b); }
inline Bytes OidVal(const uint8_t* oid, size_t len) {
  return DerTagged(0x06, Bytes(oid, oid + len));
}

}  // namespace nss_test

#endif  // der_encode_h__
