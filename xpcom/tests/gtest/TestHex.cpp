/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <cstdint>
#include <cstring>

#include "gtest/gtest.h"
#include "mozilla/Hex.h"
#include "mozilla/Span.h"
#include "mozilla/gtest/MozAssertions.h"
#include "nsString.h"
#include "nsTArray.h"

using mozilla::HexDecode;
using mozilla::HexEncode;
using mozilla::Span;

TEST(HexEncode, EncodeLowercase)
{
  const uint8_t bytes[] = {0xab, 0x0c, 0x00, 0xff};
  nsAutoCString out;
  HexEncode(Span(bytes), out);
  EXPECT_TRUE(out.EqualsASCII("ab0c00ff"));
}

TEST(HexEncode, EncodeUppercase)
{
  const uint8_t bytes[] = {0xab, 0x0c, 0xff};
  nsAutoCString out;
  HexEncode(Span(bytes), out, /* aUpperCase = */ true);
  EXPECT_TRUE(out.EqualsASCII("AB0CFF"));
}

TEST(HexEncode, EncodeEmpty)
{
  nsAutoCString out;
  HexEncode(Span<const uint8_t>(), out);
  EXPECT_TRUE(out.IsEmpty());
}

TEST(HexEncode, RoundTripAllByteValues)
{
  uint8_t bytes[256];
  for (size_t i = 0; i < 256; ++i) {
    bytes[i] = static_cast<uint8_t>(i);
  }
  nsAutoCString hex;
  HexEncode(Span(bytes), hex);
  EXPECT_EQ(hex.Length(), 512u);

  nsTArray<uint8_t> decoded;
  EXPECT_NS_SUCCEEDED(HexDecode(hex, decoded));
  ASSERT_EQ(decoded.Length(), 256u);
  EXPECT_EQ(0, memcmp(bytes, decoded.Elements(), sizeof(bytes)));
}

TEST(HexEncode, DecodeAcceptsMixedCase)
{
  nsTArray<uint8_t> out;
  EXPECT_NS_SUCCEEDED(HexDecode("Ab0C"_ns, out));
  ASSERT_EQ(out.Length(), 2u);
  EXPECT_EQ(out[0], 0xab);
  EXPECT_EQ(out[1], 0x0c);
}

TEST(HexEncode, DecodeEmpty)
{
  nsTArray<uint8_t> out;
  EXPECT_NS_SUCCEEDED(HexDecode(""_ns, out));
  EXPECT_TRUE(out.IsEmpty());
}

TEST(HexEncode, DecodeRejectsOddLength)
{
  nsTArray<uint8_t> out;
  EXPECT_EQ(HexDecode("abc"_ns, out), NS_ERROR_INVALID_ARG);
  EXPECT_TRUE(out.IsEmpty());
}

TEST(HexEncode, DecodeRejectsNonHexCharacter)
{
  nsTArray<uint8_t> out;
  EXPECT_EQ(HexDecode("0g"_ns, out), NS_ERROR_INVALID_ARG);
  EXPECT_TRUE(out.IsEmpty());
}
