/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_QUOTA_ENCRYPTEDRANDOMACCESSBLOCKVIEWV1_H_
#define DOM_QUOTA_ENCRYPTEDRANDOMACCESSBLOCKVIEWV1_H_

#include <cstdint>
#include <cstring>

#include "EncryptedRandomAccessBlock.h"
#include "mozilla/Span.h"

namespace mozilla::dom::quota {

/**
 * Version 1 interpretation of CipherMetadata of EncryptedRandomAccessBlock
 * (byte offsets relative to the start of CipherMetadata, i.e., byte 32 in the
 * full block):
 *
 *  --------+-----------------------------------------------+
 *   offset | field                                 size    |
 *  --------+-----------------------------------------------+
 *       0  | Nonce / IV                          12 bytes  |
 *      12  | Authentication tag                  16 bytes  |
 *      28  | Reserved (unused)                    4 bytes  |
 *  --------+-----------------------------------------------+
 *      32
 */
class EncryptedRandomAccessBlockViewV1 {
 public:
  static constexpr size_t NonceSize = 12;
  static constexpr size_t AuthenticationTagSize = 16;

  template <size_t N>
  using ConstSpan = Span<const uint8_t, N>;
  template <size_t N>
  using MutableSpan = Span<uint8_t, N>;

 private:
  static constexpr size_t ReservedBytesSize = 4;

  static_assert(NonceSize + AuthenticationTagSize + ReservedBytesSize ==
                EncryptedRandomAccessBlock::CipherMetadataSize);

 public:
  explicit EncryptedRandomAccessBlockViewV1(
      MutableSpan<NonceSize + AuthenticationTagSize + ReservedBytesSize> aBlock)
      : mCipherMetadata(aBlock) {}

  /** The AEAD nonce (initialization vector) for this block. */
  ConstSpan<NonceSize> Nonce() const {
    return mCipherMetadata.First<NonceSize>();
  }

  void SetNonce(ConstSpan<NonceSize> aNonce) {
    memcpy(mCipherMetadata.data(), aNonce.data(), NonceSize);
  }

  /** The AEAD authentication tag for this block. */
  ConstSpan<AuthenticationTagSize> AuthenticationTag() const {
    return mCipherMetadata.Subspan<NonceSize, AuthenticationTagSize>();
  }

  void SetAuthenticationTag(
      ConstSpan<AuthenticationTagSize> aAuthenticationTag) {
    memcpy(mCipherMetadata.data() + NonceSize, aAuthenticationTag.data(),
           AuthenticationTagSize);
  }

 private:
  MutableSpan<NonceSize + AuthenticationTagSize + ReservedBytesSize>
      mCipherMetadata;
};

}  // namespace mozilla::dom::quota

#endif  // DOM_QUOTA_ENCRYPTEDRANDOMACCESSBLOCKVIEWV1_H_
