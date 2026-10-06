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
#include "utilrename.h"

#include "asn1/mutators.h"
#include "base/database.h"

extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
  static NSSDatabase db = NSSDatabase();

  SECItem derPki = {siBuffer, (unsigned char*)data, (unsigned int)size};

  ScopedPK11SlotInfo slot(PK11_GetInternalSlot());
  assert(slot);

  SECKEYPrivateKey* privKey = nullptr;
  if (PK11_ImportDERPrivateKeyInfoAndReturnKey(
          slot.get(), &derPki, nullptr, nullptr, false, false, KU_ALL, &privKey,
          nullptr) != SECSuccess) {
    return 0;
  }

  // Basic properties.
  (void)SECKEY_GetPrivateKeyType(privKey);
  (void)SECKEY_PrivateKeyStrengthInBits(privKey);
  (void)PK11_SignatureLen(privKey);
  (void)PK11_GetPrivateModulusLen(privKey);

  ScopedSECItem keyID(PK11_GetLowLevelKeyIDForPrivateKey(privKey));

  SECKEYPQGParams* params = PK11_GetPQGParamsFromPrivateKey(privKey);
  if (params && params->arena) {
    PORT_FreeArena(params->arena, PR_FALSE);
  }

  // Key and nickname.
  ScopedSECKEYPublicKey pubKey(SECKEY_ConvertToPublicKey(privKey));
  ScopedCERTCertificate cert(PK11_GetCertFromPrivateKey(privKey));

  char* nickname = PK11_GetPrivateKeyNickname(privKey);
  PORT_Free(nickname);

  // Export.
  ScopedSECItem derExport(PK11_ExportDERPrivateKeyInfo(privKey, nullptr));

  SECKEY_DestroyPrivateKey(privKey);

  return 0;
}

extern "C" size_t LLVMFuzzerCustomMutator(uint8_t* data, size_t size,
                                          size_t maxSize, unsigned int seed) {
  return ASN1Mutators::CustomMutator(data, size, maxSize, seed);
}

extern "C" size_t LLVMFuzzerCustomCrossOver(const uint8_t* data1, size_t size1,
                                            const uint8_t* data2, size_t size2,
                                            uint8_t* out, size_t maxOutSize,
                                            unsigned int seed) {
  return ASN1Mutators::CustomCrossOver(data1, size1, data2, size2, out,
                                       maxOutSize, seed);
}
