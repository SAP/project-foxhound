/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/Hex.h"

#include "mozilla/TextUtils.h"
#include "nsError.h"
#include "nsString.h"
#include "nsTArray.h"

namespace mozilla {

void HexEncode(Span<const uint8_t> aBytes, nsACString& aOut, bool aUpperCase) {
  static const char kLowerHexChars[] = "0123456789abcdef";
  static const char kUpperHexChars[] = "0123456789ABCDEF";
  const char* const hexChars = aUpperCase ? kUpperHexChars : kLowerHexChars;
  aOut.SetLength(aBytes.Length() * 2);
  char* out = aOut.BeginWriting();
  for (uint8_t byte : aBytes) {
    *out++ = hexChars[(byte >> 4) & 0xF];
    *out++ = hexChars[byte & 0xF];
  }
}

nsresult HexDecode(const nsACString& aHex, nsTArray<uint8_t>& aOut) {
  aOut.Clear();
  const size_t length = aHex.Length();
  if (length % 2 != 0) {
    return NS_ERROR_INVALID_ARG;
  }
  // Pre-reserve the exact output size (fallible) so the per-byte appends below
  // never reallocate and an oversized input fails cleanly on OOM.
  if (!aOut.SetCapacity(length / 2, fallible)) {
    return NS_ERROR_OUT_OF_MEMORY;
  }
  const char* const hex = aHex.BeginReading();
  for (size_t i = 0; i < length; i += 2) {
    const char hi = hex[i];
    const char lo = hex[i + 1];
    if (!IsAsciiHexDigit(hi) || !IsAsciiHexDigit(lo)) {
      aOut.Clear();
      return NS_ERROR_INVALID_ARG;
    }
    aOut.AppendElement(static_cast<uint8_t>(
        (AsciiAlphanumericToNumber(hi) << 4) | AsciiAlphanumericToNumber(lo)));
  }
  return NS_OK;
}

}  // namespace mozilla
