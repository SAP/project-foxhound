/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <string>
#include <vector>

#include "gtest/gtest.h"

#include "cert.h"
#include "certt.h"
#include "secasn1.h"
#include "secitem.h"
#include "secport.h"

namespace nss_test {

class CERT_FormatNameUnitTest : public ::testing::Test {};

TEST_F(CERT_FormatNameUnitTest, Overflow) {
  // Construct a CERTName consisting of a single RDN with 20 organizational unit
  // AVAs and 20 domain component AVAs. The actual contents don't matter, just
  // the types.

  uint8_t oidValueBytes[] = {0x0c, 0x02, 0x58, 0x58};  // utf8String "XX"
  SECItem oidValue = {siBuffer, oidValueBytes, sizeof(oidValueBytes)};
  uint8_t oidTypeOUBytes[] = {0x55, 0x04, 0x0b};  // organizationalUnit
  SECItem oidTypeOU = {siBuffer, oidTypeOUBytes, sizeof(oidTypeOUBytes)};
  CERTAVA ouAVA = {oidTypeOU, oidValue};
  uint8_t oidTypeDCBytes[] = {0x09, 0x92, 0x26, 0x89, 0x93,
                              0xf2, 0x2c, 0x64, 0x1,  0x19};  // domainComponent
  SECItem oidTypeDC = {siBuffer, oidTypeDCBytes, sizeof(oidTypeDCBytes)};
  CERTAVA dcAVA = {oidTypeDC, oidValue};

  const int kNumEachAVA = 20;
  CERTAVA* avas[(2 * kNumEachAVA) + 1];
  for (int i = 0; i < kNumEachAVA; i++) {
    avas[2 * i] = &ouAVA;
    avas[(2 * i) + 1] = &dcAVA;
  }
  avas[2 * kNumEachAVA] = nullptr;

  CERTRDN rdn = {avas};
  CERTRDN* rdns[2];
  rdns[0] = &rdn;
  rdns[1] = nullptr;

  std::string expectedResult =
      "XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>"
      "XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>"
      "XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>XX<br>"
      "XX<br>XX<br>XX<br>XX<br>";

  CERTName name = {nullptr, rdns};
  char* result = CERT_FormatName(&name);
  EXPECT_EQ(expectedResult, result);
  PORT_Free(result);
}

TEST(QuickDERIntOverflow, CRLDistributionPoints) {
  const uint32_t kStructSize = sizeof(CRLDistributionPoint);
  const uint64_t kOverflowTarget = 0x100000000ULL;
  const uint32_t kEntries =
      static_cast<uint32_t>((kOverflowTarget / kStructSize) + 1);

  // Verify the 32-bit multiply wraps as expected on an unfixed build.
  // Route one operand through volatile to suppress MSVC C4307 on the
  // intentional constant-overflow.
  volatile uint32_t vStructSize = kStructSize;
  uint32_t wrapped = vStructSize * kEntries;
  ASSERT_LT(wrapped, kStructSize);

  // Build DER: SEQUENCE { entry-with-content, empty entries... }
  // Entry 0: 30 04 A0 02 04 00 — triggers a write to the first struct slot.
  // Entries 1..N-1: 30 00 — empty SEQUENCE (all fields OPTIONAL).
  const uint8_t kEntry0[] = {0x30, 0x04, 0xA0, 0x02, 0x04, 0x00};
  const uint8_t kEmptyEntry[] = {0x30, 0x00};

  size_t contentLen =
      sizeof(kEntry0) + static_cast<size_t>(kEntries - 1) * sizeof(kEmptyEntry);

  std::vector<uint8_t> der;
  der.reserve(6 + contentLen);
  der.push_back(0x30);
  der.push_back(0x84);
  der.push_back(static_cast<uint8_t>((contentLen >> 24) & 0xFF));
  der.push_back(static_cast<uint8_t>((contentLen >> 16) & 0xFF));
  der.push_back(static_cast<uint8_t>((contentLen >> 8) & 0xFF));
  der.push_back(static_cast<uint8_t>(contentLen & 0xFF));
  der.insert(der.end(), kEntry0, kEntry0 + sizeof(kEntry0));
  for (uint32_t i = 1; i < kEntries; i++) {
    der.push_back(0x30);
    der.push_back(0x00);
  }

  SECItem input = {siBuffer, der.data(), static_cast<unsigned int>(der.size())};

  PLArenaPool* arena = PORT_NewArena(DER_DEFAULT_CHUNKSIZE);
  ASSERT_NE(arena, nullptr);

  CERTCrlDistributionPoints* result =
      CERT_DecodeCRLDistributionPoints(arena, &input);
  (void)result;

  PORT_FreeArena(arena, PR_FALSE);
}

}  // namespace nss_test
