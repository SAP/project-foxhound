/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_QUOTA_CIPHERSTRATEGYUTILS_H_
#define DOM_QUOTA_CIPHERSTRATEGYUTILS_H_

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>

#include "ErrorList.h"
#include "ScopedNSSTypes.h"
#include "mozilla/Assertions.h"
#include "mozilla/Maybe.h"
#include "mozilla/Result.h"
#include "mozilla/ResultExtensions.h"
#include "mozilla/Span.h"
#include "pk11pub.h"

namespace mozilla::dom::quota {

template <typename KeyType>
Result<KeyType, nsresult> GenerateKey() {
  const auto slot = UniquePK11SlotInfo{PK11_GetInternalSlot()};
  if (slot == nullptr) {
    return Err(NS_ERROR_FAILURE);
  }
  const auto symKey = UniquePK11SymKey{PK11_KeyGen(
      slot.get(), CKM_CHACHA20_KEY_GEN, nullptr, sizeof(KeyType), nullptr)};
  if (symKey == nullptr) {
    return Err(NS_ERROR_FAILURE);
  }
  if (PK11_ExtractKeyValue(symKey.get()) != SECSuccess) {
    return Err(NS_ERROR_FAILURE);
  }
  // No need to free keyData as it is a buffer managed by symKey.
  SECItem* keyData = PK11_GetKeyData(symKey.get());
  if (keyData == nullptr) {
    return Err(NS_ERROR_FAILURE);
  }
  KeyType key;
  MOZ_RELEASE_ASSERT(keyData->len == key.size());
  std::copy(keyData->data, keyData->data + key.size(), key.data());
  return key;
}

template <size_t N>
std::array<uint8_t, N> MakeRandomData() {
  std::array<uint8_t, N> res;
  const auto rv = PK11_GenerateRandom(res.data(), res.size());
  /// XXX Allow return of error code to handle this gracefully.
  MOZ_RELEASE_ASSERT(rv == SECSuccess);
  return res;
}

template <typename KeyType>
Span<const uint8_t> SerializeKey(const KeyType& aKey) {
  return Span(aKey);
}

template <typename KeyType>
Maybe<KeyType> DeserializeKey(const Span<const uint8_t>& aSerializedKey) {
  KeyType res;
  if (res.size() != aSerializedKey.size()) {
    return Nothing();
  }
  std::copy(aSerializedKey.cbegin(), aSerializedKey.cend(), res.begin());
  return Some(res);
}

}  // namespace mozilla::dom::quota

#endif  // DOM_QUOTA_CIPHERSTRATEGYUTILS_H_
