/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_QUOTA_DUMMYRANDOMACCESSCIPHERSTRATEGY_H_
#define DOM_QUOTA_DUMMYRANDOMACCESSCIPHERSTRATEGY_H_

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>

#include "ErrorList.h"
#include "mozilla/Maybe.h"
#include "mozilla/Result.h"
#include "mozilla/Span.h"

namespace mozilla::dom::quota {

struct DummyRandomAccessCipherStrategy {
  struct KeyType {};
  using BlockNumberType = uint64_t;

  static constexpr size_t BlockNonceSize = 12;
  static constexpr size_t AuthenticationTagSize = 16;

  static Result<KeyType, nsresult> GenerateKey() { return KeyType{}; }

  static nsresult Init() { return NS_OK; }

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
                          EncryptionOutput& aOutput) {
    std::transform(aInput.mPlaintext.cbegin(), aInput.mPlaintext.cend(),
                   aOutput.mCiphertext.begin(),
                   [](const uint8_t byte) { return byte ^ 42; });
    std::fill(aOutput.mTag.begin(), aOutput.mTag.end(), 0);
    return NS_OK;
  }

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
                          DecryptionOutput& aOutput) {
    std::transform(aInput.mCiphertext.cbegin(), aInput.mCiphertext.cend(),
                   aOutput.mPlaintext.begin(),
                   [](const uint8_t byte) { return byte ^ 42; });
    return NS_OK;
  }

  static std::array<uint8_t, BlockNonceSize> MakeBlockNonce() { return {}; }

  static Span<const uint8_t> SerializeKey(const KeyType&) { return {}; }

  static Maybe<KeyType> DeserializeKey(Span<const uint8_t>) {
    return Some(KeyType{});
  }
};

}  // namespace mozilla::dom::quota

#endif  // DOM_QUOTA_DUMMYRANDOMACCESSCIPHERSTRATEGY_H_
