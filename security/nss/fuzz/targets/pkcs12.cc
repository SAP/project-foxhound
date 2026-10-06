/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <algorithm>
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <cstdio>

#include "nss_scoped_ptrs.h"
#include "p12.h"
#include "pk11pub.h"
#include "seccomon.h"

#include "asn1/mutators.h"
#include "base/database.h"

static SECItem* nicknameCollision(SECItem* oldNick, PRBool* cancel,
                                  void* wincx) {
  static unsigned int counter = 0;

  // Always return a unique nickname.
  SECItem* item = SECITEM_AllocItem(nullptr, nullptr, 12);
  item->len = snprintf((char*)item->data, 12, "%u", counter++) + 1;

  return item;
}

extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
  static NSSDatabase db = NSSDatabase();

  ScopedPK11SlotInfo slot(PK11_GetInternalSlot());
  assert(slot);

  // Initialize the decoder.
  SECItem pwItem = {siBuffer, nullptr, 0};
  ScopedSEC_PKCS12DecoderContext dcx(
      SEC_PKCS12DecoderStart(&pwItem, slot.get(), nullptr, nullptr, nullptr,
                             nullptr, nullptr, nullptr));
  assert(dcx);

  // Cap the max element length at 1 MB to avoid OOMs during fuzzing.
  SEC_PKCS12DecoderSetMaxElementLen(dcx.get(),
                                    std::max(1024 * 1024, (int)size));

  // Cycle through target token CA modes.
  SECPKCS12TargetTokenCAs modes[] = {SECPKCS12TargetTokenNoCAs,
                                     SECPKCS12TargetTokenIntermediateCAs,
                                     SECPKCS12TargetTokenAllCAs};
  SEC_PKCS12DecoderSetTargetTokenCAs(dcx.get(), modes[size % 3]);

  SECStatus rv = SEC_PKCS12DecoderUpdate(dcx.get(), (unsigned char*)data, size);
  if (rv != SECSuccess) {
    return 0;
  }

  // Verify the blob.
  rv = SEC_PKCS12DecoderVerify(dcx.get());
  if (rv != SECSuccess) {
    return 0;
  }

  // Validate bags.
  rv = SEC_PKCS12DecoderValidateBags(dcx.get(), nicknameCollision);
  if (rv != SECSuccess) {
    return 0;
  }

  // Import cert and key.
  rv = SEC_PKCS12DecoderImportBags(dcx.get());
  if (rv != SECSuccess) {
    return 0;
  }

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
