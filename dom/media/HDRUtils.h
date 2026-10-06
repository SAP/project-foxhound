/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_HDRUTILS_H_
#define DOM_MEDIA_HDRUTILS_H_

#include <algorithm>

#include "ByteWriter.h"
#include "mozilla/EndianUtils.h"
#include "mozilla/gfx/Types.h"
#include "nsTArray.h"

namespace mozilla {

// Encodes aMeta into the 24-byte big-endian payload defined by ITU-T H.265
// §D.2.28 / §D.3.28 for the mastering display colour volume SEI message.
// Primaries are written in G, B, R wire order (c=0,1,2). Chromaticity
// coordinates are scaled by 50000; luminance by 10000. Returns false if buffer
// allocation fails.
[[nodiscard]] inline bool EncodeSmpte2086Payload(
    const gfx::Smpte2086Metadata& aMeta, nsTArray<uint8_t>& aBuf) {
  static constexpr float kChromaScale = 50000.0f;
  static constexpr float kLuminanceScale = 10000.0f;
  // C++ truncates float→int toward zero; +0.5f converts that truncation into
  // round-to-nearest, minimising fixed-point encoding error. std::max clamps
  // negatives to 0 (casting negative float to unsigned is UB). std::min
  // clamps values above the target type's max to avoid silent wrap-around.
  auto scaleU16 = [](float v, float scale) -> uint16_t {
    return static_cast<uint16_t>(
        std::min(static_cast<uint32_t>(std::max(v * scale + 0.5f, 0.0f)),
                 (uint32_t)UINT16_MAX));
  };
  auto scaleU32 = [](float v, float scale) -> uint32_t {
    uint64_t u = static_cast<uint64_t>(std::max(v * scale + 0.5f, 0.0f));
    return static_cast<uint32_t>(std::min(u, (uint64_t)UINT32_MAX));
  };
  // 3 primaries * 2 coords * u16 (12) + white point * 2 * u16 (4) +
  // max/min luminance * u32 (8) = 24 bytes.
  aBuf.SetCapacity(aBuf.Length() + 24);
  ByteWriter<BigEndian> w(aBuf);
  return w.WriteU16(scaleU16(aMeta.displayPrimaryGreen.x, kChromaScale)) &&
         w.WriteU16(scaleU16(aMeta.displayPrimaryGreen.y, kChromaScale)) &&
         w.WriteU16(scaleU16(aMeta.displayPrimaryBlue.x, kChromaScale)) &&
         w.WriteU16(scaleU16(aMeta.displayPrimaryBlue.y, kChromaScale)) &&
         w.WriteU16(scaleU16(aMeta.displayPrimaryRed.x, kChromaScale)) &&
         w.WriteU16(scaleU16(aMeta.displayPrimaryRed.y, kChromaScale)) &&
         w.WriteU16(scaleU16(aMeta.whitePoint.x, kChromaScale)) &&
         w.WriteU16(scaleU16(aMeta.whitePoint.y, kChromaScale)) &&
         w.WriteU32(scaleU32(aMeta.maxLuminance, kLuminanceScale)) &&
         w.WriteU32(scaleU32(aMeta.minLuminance, kLuminanceScale));
}

// Encodes aCll into the 4-byte big-endian payload defined by CTA-861.3 for the
// content light level SEI message. Returns false if buffer allocation fails.
[[nodiscard]] inline bool EncodeContentLightLevelPayload(
    const gfx::ContentLightLevel& aCll, nsTArray<uint8_t>& aBuf) {
  aBuf.SetCapacity(aBuf.Length() + 4);
  ByteWriter<BigEndian> w(aBuf);
  return w.WriteU16(aCll.maxContentLightLevel) &&
         w.WriteU16(aCll.maxFrameAverageLightLevel);
}

}  // namespace mozilla

#endif  // DOM_MEDIA_HDRUTILS_H_
