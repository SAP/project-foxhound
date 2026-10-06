/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_QUOTA_NSSRANDOMACCESSCIPHERSTRATEGY_H_
#define DOM_QUOTA_NSSRANDOMACCESSCIPHERSTRATEGY_H_

#include <array>
#include <cstddef>
#include <cstdint>

#include "CipherStrategy.h"  // for CipherMode
#include "ScopedNSSTypes.h"
#include "mozilla/Maybe.h"
#include "mozilla/ResultExtensions.h"
#include "mozilla/Span.h"

namespace mozilla::dom::quota {

/**
 * |NSSRandomAccessCipherStrategy| is a cipher strategy for random access using
 * ChaCha20-Poly1305. It enables random access because each block can be
 * accessed directly by block number, the index in the stream, without following
 * a fixed access pattern. Each block has the unique nonce to enable the block
 * to be decrypted only using the data contained by itself. To avoid the nonce
 * collision, the key is unique by each block. The key is derived using block
 * number.
 *
 * In other words, unlike |NSSCipherStrategy|, which maintains mutable cipher
 * state and is intended for sequential input/output streams, this strategy is
 * effectively stateless and encrypts/decrypts each block independently.
 *
 * NOTE: This does NOT implement the interface of |CipherStrategy|.
 */
struct NSSRandomAccessCipherStrategy {
  using KeyType = std::array<uint8_t, 32>;
  using BlockNumberType = uint64_t;

  // NOTE: In ChaCha20-Poly1305, nonce is always 12 bytes.
  static constexpr size_t BlockNonceSize = 12;

  // NOTE: In ChaCha20-Poly1305, authentication tag is always 16 bytes.
  static constexpr size_t AuthenticationTagSize = 16;

  static Result<KeyType, nsresult> GenerateKey();

  static nsresult Init();

  // NOTE: |mNonce| cannot be const due to the interface of |PK11_AEADOp|.
  struct EncryptionInput {
    const KeyType mMasterKey;
    const BlockNumberType mBlockNumber;
    Span<uint8_t, BlockNonceSize> mNonce;
    Span<const uint8_t> mPlaintext;
    Span<const uint8_t> mAad;
  };

  struct EncryptionOutput {
    Span<uint8_t> mCiphertext;
    Span<uint8_t, AuthenticationTagSize> mTag;
  };

  static nsresult Encrypt(const EncryptionInput& aInput,
                          EncryptionOutput& aOutput);

  // NOTE: |mNonce| and |mTag| cannot be const due to the interface of
  // |PK11_AEADOp|.
  struct DecryptionInput {
    const KeyType mMasterKey;
    const BlockNumberType mBlockNumber;
    Span<uint8_t, BlockNonceSize> mNonce;
    Span<const uint8_t> mCiphertext;
    Span<const uint8_t> mAad;
    Span<uint8_t, AuthenticationTagSize> mTag;
  };

  struct DecryptionOutput {
    Span<uint8_t> mPlaintext;
  };

  static nsresult Decrypt(const DecryptionInput& aInput,
                          DecryptionOutput& aOutput);

  static std::array<uint8_t, BlockNonceSize> MakeBlockNonce();

  static Span<const uint8_t> SerializeKey(const KeyType& aKey);

  static Maybe<KeyType> DeserializeKey(Span<const uint8_t> aSerializedKey);

 private:
  static nsresult InitContextWithDerivedKey(UniquePK11Context& aContext,
                                            const KeyType& aKey,
                                            CipherMode aCipherMode);

  template <uint32_t V>
  static nsresult DeriveKey(const KeyType& aKey, BlockNumberType aBlockNumber,
                            KeyType& aDerivedKey);
};

}  // namespace mozilla::dom::quota

#endif  // DOM_QUOTA_NSSRANDOMACCESSCIPHERSTRATEGY_H_
