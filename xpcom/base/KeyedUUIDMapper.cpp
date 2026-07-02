/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "KeyedUUIDMapper.h"

#include "mozilla/EndianUtils.h"
#include "mozilla/RandomNum.h"
#include "nsID.h"
#include "nsString.h"

namespace mozilla {

NS_IMPL_ISUPPORTS(KeyedUUIDMapper, nsIKeyedUUIDMapper)

const static uint64_t kJS_MAX_SAFE_UINTEGER = +9007199254740991ULL;

static void FormatUUID(const uint8_t (&aBytes)[16], nsACString& aOut) {
  nsID id;
  id.m0 = BigEndian::readUint32(&aBytes[0]);
  id.m1 = BigEndian::readUint16(&aBytes[4]);
  id.m2 = BigEndian::readUint16(&aBytes[6]);
  // m3 are bytes, we can memcpy without worrying about endianness:
  memcpy(id.m3, &aBytes[8], sizeof(id.m3));

  char buf[NSID_LENGTH];
  id.ToProvidedString(buf);
  // +1 to skip the "{" that nsID::ToProvidedString always prepends.
  aOut.Assign(buf + 1, 36);
}

static bool ParseUUID(const nsACString& aUUID, uint8_t (&aOut)[16]) {
  if (aUUID.Length() != 36) {
    // nsID is too permissive, it accepts UUID with "{" and "}", and it also
    // accepts trailing junk (bug 2046385). Enforcing the expected length
    // ensures that we only accept bracketless UUID inputs.
    return false;
  }
  nsID id;
  if (!id.Parse(PromiseFlatCString(aUUID).get())) {
    return false;
  }
  BigEndian::writeUint32(&aOut[0], id.m0);
  BigEndian::writeUint16(&aOut[4], id.m1);
  BigEndian::writeUint16(&aOut[6], id.m2);
  // m3 are bytes, we can memcpy without worrying about endianness:
  memcpy(&aOut[8], id.m3, sizeof(id.m3));
  return true;
}

NS_IMETHODIMP KeyedUUIDMapper::GenerateKey(nsTArray<uint8_t>& aKey) {
  aKey.SetLength(16);
  // Intentionally avoids NSS to allow callers to initialize the key early
  // during browser startup without forced NSS initialization (bug 2050882).
  if (!GenerateRandomBytesFromOS(aKey.Elements(), aKey.Length())) {
    aKey.Clear();
    return NS_ERROR_FAILURE;
  }
  return NS_OK;
}

NS_IMETHODIMP KeyedUUIDMapper::Init(const nsTArray<uint8_t>& aKey) {
  NS_ASSERT_OWNINGTHREAD(KeyedUUIDMapper);  // Avoid concurrent mSymKey changes.
  if (aKey.Length() != 16) {
    return NS_ERROR_INVALID_ARG;
  }

  if (!EnsureNSSInitializedChromeOrContent()) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  UniquePK11SlotInfo slot(PK11_GetInternalSlot());
  if (!slot) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  SECItem keyItem = {siBuffer, const_cast<uint8_t*>(aKey.Elements()), 16};
  mSymKey = UniquePK11SymKey(
      PK11_ImportSymKey(slot.get(), CKM_AES_ECB, PK11_OriginUnwrap,
                        CKA_ENCRYPT | CKA_DECRYPT, &keyItem, nullptr));
  return mSymKey ? NS_OK : NS_ERROR_FAILURE;
}

NS_IMETHODIMP KeyedUUIDMapper::ToUUID(uint64_t aValue, nsACString& aResult) {
  NS_ASSERT_OWNINGTHREAD(KeyedUUIDMapper);  // Avoid concurrent mSymKey changes.
  if (!mSymKey) {
    return NS_ERROR_NOT_INITIALIZED;
  }

  if (aValue > kJS_MAX_SAFE_UINTEGER) {
    return NS_ERROR_INVALID_ARG;
  }

  // value -> uuid is just AES encryption of value (with the key from Init()).

  uint8_t plaintext[16] = {};
  BigEndian::writeUint64(&plaintext[0], aValue);

  uint8_t ciphertext[16];
  unsigned int outLen = 0;
  SECItem params = {siBuffer, nullptr, 0};
  if (PK11_Encrypt(mSymKey.get(), CKM_AES_ECB, &params, ciphertext, &outLen,
                   sizeof(ciphertext), plaintext,
                   sizeof(plaintext)) != SECSuccess) {
    return NS_ERROR_UNEXPECTED;
  }

  FormatUUID(ciphertext, aResult);
  return NS_OK;
}

NS_IMETHODIMP KeyedUUIDMapper::FromUUID(const nsACString& aUUID,
                                        uint64_t* aResult) {
  NS_ASSERT_OWNINGTHREAD(KeyedUUIDMapper);  // Avoid concurrent mSymKey changes.
  if (!mSymKey) {
    return NS_ERROR_NOT_INITIALIZED;
  }

  uint8_t uuidBytes[16];
  if (!ParseUUID(aUUID, uuidBytes)) {
    return NS_ERROR_INVALID_ARG;
  }

  // uuid -> value is just AES decryption of uuid (with the key from Init()).

  uint8_t plaintext[16];
  unsigned int outLen = 0;
  SECItem params = {siBuffer, nullptr, 0};
  if (PK11_Decrypt(mSymKey.get(), CKM_AES_ECB, &params, plaintext, &outLen,
                   sizeof(plaintext), uuidBytes,
                   sizeof(uuidBytes)) != SECSuccess) {
    return NS_ERROR_UNEXPECTED;
  }

  if (BigEndian::readUint64(plaintext + 8) != 0) {
    // ToUUID only ever fills 8 out of 16 bytes. The other 8 should be 0.
    // If we find a value with non-zeroes here, then the input UUID is bogus
    // value that could never have been produced by us. Reject it.
    return NS_ERROR_INVALID_ARG;
  }

  uint64_t result = BigEndian::readUint64(plaintext);
  if (result > kJS_MAX_SAFE_UINTEGER) {
    // ToUUID rejects inputs beyond kJS_MAX_SAFE_UINTEGER, so we should not
    // receive it here either.
    return NS_ERROR_INVALID_ARG;
  }

  *aResult = result;
  return NS_OK;
}

}  // namespace mozilla
