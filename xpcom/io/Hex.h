/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_Hex_h_
#define mozilla_Hex_h_

#include <cstdint>

#include "mozilla/Span.h"
#include "nscore.h"
#include "nsStringFwd.h"
#include "nsTArrayForwardDeclare.h"

namespace mozilla {

// Replaces |aOut| with the hexadecimal encoding of |aBytes| (two characters per
// byte; e.g. {0xAB, 0x0C} becomes "ab0c"). The output is lowercase unless
// |aUpperCase| is true. This is the binary->text analogue of Base64Encode;
// prefer it over hand-rolling yet another hex loop.
void HexEncode(Span<const uint8_t> aBytes, nsACString& aOut,
               bool aUpperCase = false);

// Decodes the hexadecimal text |aHex| into the raw bytes |aOut|, accepting
// upper- and lowercase digits; this is the inverse of HexEncode. Returns
// NS_ERROR_INVALID_ARG (and leaves |aOut| empty) if |aHex| has an odd length or
// contains a character outside [0-9a-fA-F].
nsresult HexDecode(const nsACString& aHex, nsTArray<uint8_t>& aOut);

}  // namespace mozilla

#endif  // mozilla_Hex_h_
