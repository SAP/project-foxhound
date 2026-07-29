/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <cstddef>
#include <cstdint>

#include "cryptohi.h"
#include "nss_scoped_ptrs.h"

#include "asn1/mutators.h"

// Representative raw signature lengths for DecodeDerSigToLen:
// DSA1 = 40, P-256 = 64, P-384 = 96, P-521 = 132.
const unsigned int kDecodeLens[] = {40, 64, 96, 132};

extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
  SECItem input = {siBuffer, (unsigned char*)data, (unsigned int)size};

  // Decode as variable-length (ECDSA / DSA2) signature.
  // len=40 also covers the DSAU_DecodeDerSig (DSA1) path since both
  // funnel into common_DecodeDerSig with the same component length.
  unsigned int len = kDecodeLens[size % 4];
  ScopedSECItem decoded(DSAU_DecodeDerSigToLen(&input, len));
  if (decoded) {
    StackSECItem encoded;
    (void)DSAU_EncodeDerSigWithLen(&encoded, decoded.get(), decoded->len);
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
