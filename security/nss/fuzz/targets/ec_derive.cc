/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <cassert>
#include <cstddef>
#include <cstdint>

#include "keyhi.h"
#include "nss_scoped_ptrs.h"
#include "pk11pub.h"
#include "seccomon.h"

#include "base/database.h"

// P-256 OID (1.2.840.10045.3.1.7), DER-encoded as OBJECT IDENTIFIER.
const uint8_t kP256Params[] = {0x06, 0x08, 0x2a, 0x86, 0x48,
                               0xce, 0x3d, 0x03, 0x01, 0x07};

const CK_ULONG kKdfTypes[] = {CKD_NULL, CKD_SHA1_KDF, CKD_SHA256_KDF,
                              CKD_SHA384_KDF, CKD_SHA512_KDF};

extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
  static NSSDatabase db;
  static ScopedSECKEYPrivateKey privKey([] {
    ScopedPK11SlotInfo slot(PK11_GetInternalKeySlot());
    assert(slot);

    SECItem params = {siBuffer, (unsigned char*)kP256Params,
                      sizeof(kP256Params)};
    SECKEYPublicKey* pub = nullptr;
    auto* priv = PK11_GenerateKeyPair(slot.get(), CKM_EC_KEY_PAIR_GEN, &params,
                                      &pub, PR_FALSE, PR_FALSE, nullptr);
    assert(priv);

    SECKEY_DestroyPublicKey(pub);
    return priv;
  }());

  // Split using DER TLV structure: data[1] is the DER length byte,
  // so paramLen = tag(1) + length(1) + value(data[1]).
  if (size < 3 || 2u + data[1] >= size) {
    return 0;
  }

  size_t paramLen = 2 + data[1];
  size_t pubLen = size - paramLen;

  SECKEYPublicKey pubKey;
  memset(&pubKey, 0, sizeof(pubKey));
  pubKey.keyType = ecKey;
  pubKey.u.ec.DEREncodedParams.data = (unsigned char*)data;
  pubKey.u.ec.DEREncodedParams.len = (unsigned int)paramLen;
  pubKey.u.ec.publicValue.data = (unsigned char*)(data + paramLen);
  pubKey.u.ec.publicValue.len = (unsigned int)pubLen;

  CK_ULONG kdf = kKdfTypes[size % 5];
  ScopedPK11SymKey symKey(PK11_PubDeriveWithKDF(
      privKey.get(), &pubKey, PR_TRUE, nullptr, nullptr, CKM_ECDH1_DERIVE,
      CKM_AES_KEY_WRAP, CKA_WRAP, 32, kdf, nullptr, nullptr));

  return 0;
}
