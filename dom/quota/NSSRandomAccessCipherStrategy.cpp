/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "NSSRandomAccessCipherStrategy.h"

#include <array>
#include <cstdint>

#include "CipherStrategyUtils.h"
#include "mozilla/Maybe.h"
#include "mozilla/ResultExtensions.h"
#include "mozilla/Span.h"

namespace mozilla::dom::quota {

Result<NSSRandomAccessCipherStrategy::KeyType, nsresult>
NSSRandomAccessCipherStrategy::GenerateKey() {
  return mozilla::dom::quota::GenerateKey<KeyType>();
}

nsresult NSSRandomAccessCipherStrategy::Init() {
  MOZ_RELEASE_ASSERT(EnsureNSSInitializedChromeOrContent(),
                     "Could not initialize NSS.");
  return NS_OK;
}

nsresult NSSRandomAccessCipherStrategy::Encrypt(const EncryptionInput& aInput,
                                                EncryptionOutput& aOutput) {
  KeyType key{};
  nsresult rv = DeriveKey<1>(aInput.mMasterKey, aInput.mBlockNumber, key);
  if (rv != NS_OK) {
    return rv;
  }

  UniquePK11Context context;
  rv = InitContextWithDerivedKey(context, key, CipherMode::Encrypt);
  if (rv != NS_OK) {
    return rv;
  }

  int outLen = std::numeric_limits<int>::max();
  const SECStatus secRv = PK11_AEADOp(
      context.get(), CKG_NO_GENERATE, 0, aInput.mNonce.Elements(),
      aInput.mNonce.Length(), aInput.mAad.Elements(), aInput.mAad.Length(),
      aOutput.mCiphertext.Elements(), &outLen, aOutput.mCiphertext.Length(),
      aOutput.mTag.Elements(), aOutput.mTag.Length(),
      aInput.mPlaintext.Elements(), aInput.mPlaintext.Length());
  MOZ_DIAGNOSTIC_ASSERT(outLen != std::numeric_limits<int>::max(),
                        "PK11 AEAD operation failed.");

  return MapSECStatus(secRv);
}

nsresult NSSRandomAccessCipherStrategy::Decrypt(const DecryptionInput& aInput,
                                                DecryptionOutput& aOutput) {
  KeyType key{};
  nsresult rv = DeriveKey<1>(aInput.mMasterKey, aInput.mBlockNumber, key);
  if (rv != NS_OK) {
    return rv;
  }

  UniquePK11Context context;
  rv = InitContextWithDerivedKey(context, key, CipherMode::Decrypt);
  if (rv != NS_OK) {
    return rv;
  }

  int outLen = std::numeric_limits<int>::max();
  const SECStatus secRv = PK11_AEADOp(
      context.get(), CKG_NO_GENERATE, 0, aInput.mNonce.Elements(),
      aInput.mNonce.Length(), aInput.mAad.Elements(), aInput.mAad.Length(),
      aOutput.mPlaintext.Elements(), &outLen, aOutput.mPlaintext.Length(),
      aInput.mTag.Elements(), aInput.mTag.Length(),
      aInput.mCiphertext.Elements(), aInput.mCiphertext.Length());
  MOZ_DIAGNOSTIC_ASSERT(outLen != std::numeric_limits<int>::max(),
                        "PK11 AEAD operation failed.");

  return MapSECStatus(secRv);
}

std::array<uint8_t, NSSRandomAccessCipherStrategy::BlockNonceSize>
NSSRandomAccessCipherStrategy::MakeBlockNonce() {
  return MakeRandomData<BlockNonceSize>();
}

Span<const uint8_t> NSSRandomAccessCipherStrategy::SerializeKey(
    const KeyType& aKey) {
  return mozilla::dom::quota::SerializeKey(aKey);
}

Maybe<NSSRandomAccessCipherStrategy::KeyType>
NSSRandomAccessCipherStrategy::DeserializeKey(
    Span<const uint8_t> aSerializedKey) {
  return mozilla::dom::quota::DeserializeKey<KeyType>(aSerializedKey);
}

nsresult NSSRandomAccessCipherStrategy::InitContextWithDerivedKey(
    UniquePK11Context& aContext, const KeyType& aKey, CipherMode aCipherMode) {
  const auto slot = UniquePK11SlotInfo{PK11_GetInternalSlot()};
  if (slot == nullptr) {
    return NS_ERROR_FAILURE;
  }

  SECItem keyItem{.type = siBuffer,
                  .data = const_cast<uint8_t*>(aKey.data()),
                  .len = static_cast<unsigned int>(aKey.size())};
  const auto symKey = UniquePK11SymKey{
      PK11_ImportSymKey(slot.get(), CKM_CHACHA20_POLY1305, PK11_OriginDerive,
                        CKA_ENCRYPT, &keyItem, nullptr)};
  if (symKey == nullptr) {
    return NS_ERROR_FAILURE;
  }

  SECItem empty = {siBuffer, nullptr, 0};
  auto pk11Context = UniquePK11Context{PK11_CreateContextBySymKey(
      CKM_CHACHA20_POLY1305,
      CKA_NSS_MESSAGE |
          (CipherMode::Encrypt == aCipherMode ? CKA_ENCRYPT : CKA_DECRYPT),
      symKey.get(), &empty)};
  if (pk11Context == nullptr) {
    return NS_ERROR_FAILURE;
  }

  aContext = std::move(pk11Context);
  return NS_OK;
}

template <uint32_t Version>
nsresult NSSRandomAccessCipherStrategy::DeriveKey(const KeyType& aKey,
                                                  BlockNumberType aBlockNumber,
                                                  KeyType& aDerivedKey) {
  static_assert(Version == 1,
                "A new version was added and please review DeriveKey");

  const auto slot = UniquePK11SlotInfo{PK11_GetInternalSlot()};
  if (slot == nullptr) {
    return NS_ERROR_FAILURE;
  }

  SECItem keyItem{.type = siBuffer,
                  .data = const_cast<uint8_t*>(aKey.data()),
                  .len = static_cast<unsigned int>(aKey.size())};
  const auto ikmKey = UniquePK11SymKey{
      PK11_ImportSymKey(slot.get(), CKM_GENERIC_SECRET_KEY_GEN,
                        PK11_OriginUnwrap, CKA_DERIVE, &keyItem, nullptr)};
  if (ikmKey == nullptr) {
    return NS_ERROR_FAILURE;
  }

  std::array<uint8_t, sizeof(BlockNumberType)> salt;
  memcpy(salt.data(), &aBlockNumber, sizeof(BlockNumberType));

  static constexpr char kInfo[] = "EncryptedRandomAccessStream-block-key";
  CK_HKDF_PARAMS hkdfParams = {
      CK_TRUE,
      CK_TRUE,
      CKM_SHA256,
      CKF_HKDF_SALT_DATA,
      reinterpret_cast<CK_BYTE_PTR>(salt.data()),
      salt.size(),
      CK_INVALID_HANDLE,
      reinterpret_cast<CK_BYTE_PTR>(const_cast<char*>(kInfo)),
      // NOTE: To exclude the null-terminated string.
      sizeof(kInfo) - 1,
  };
  SECItem paramsItem = {siBuffer, reinterpret_cast<unsigned char*>(&hkdfParams),
                        sizeof(hkdfParams)};

  const auto derivedKey = UniquePK11SymKey{
      PK11_Derive(ikmKey.get(), CKM_HKDF_DERIVE, &paramsItem,
                  CKM_GENERIC_SECRET_KEY_GEN, CKA_DERIVE, sizeof(KeyType))};
  if (derivedKey == nullptr) {
    return NS_ERROR_FAILURE;
  }

  const SECStatus secRv = PK11_ExtractKeyValue(derivedKey.get());
  if (secRv != SECSuccess) {
    return NS_ERROR_FAILURE;
  }

  const SECItem* keyData = PK11_GetKeyData(derivedKey.get());
  if (keyData == nullptr || keyData->len != sizeof(KeyType)) {
    return NS_ERROR_FAILURE;
  }

  std::copy(keyData->data, keyData->data + aDerivedKey.size(),
            aDerivedKey.data());
  return NS_OK;
}

}  // namespace mozilla::dom::quota
