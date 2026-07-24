/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef RICE_DELTA_DECODER_H
#define RICE_DELTA_DECODER_H

#include <cstddef>
#include <cstdint>

#include "nsStringFwd.h"

namespace mozilla {
namespace safebrowsing {

class RiceDeltaDecoder {
 public:
  // This decoder is tailored for safebrowsing v4, including the
  // bit reading order and how the remainder part is interpreted.
  // The caller just needs to feed the byte stream received from
  // network directly. Note that the input buffer must be mutable
  // since the decoder will do some pre-processing before decoding.
  RiceDeltaDecoder(uint8_t* aEncodedData, size_t aEncodedDataSize);

  // @param aNumEntries The number of values to be decoded, not including
  //                    the first value.
  // @param aDecodedData A pre-allocated output buffer. Note that
  //                     aDecodedData[0] will be filled with |aFirstValue|
  //                     and the buffer length (in byte) should be
  //                     ((aNumEntries + 1) * sizeof(uint32_t)).
  bool Decode(uint32_t aRiceParameter, uint32_t aFirstValue,
              uint32_t aNumEntries, uint32_t* aDecodedData);

  // Decode the 64-bit encoded data.
  //
  // @param aFirstValue The first value of the encoded data.
  // @param aNumEntries The number of values to be decoded, not including
  //                    the first value.
  // @param aDecodedData A pre-allocated output buffer. Note that
  //                     aDecodedData[0] will be filled with |aFirstValue|
  //                     and the buffer length (in byte) should be
  //                     ((aNumEntries + 1) * sizeof(uint64_t)).
  bool Decode64(uint32_t aRiceParameter, uint64_t aFirstValue,
                uint32_t aNumEntries, uint64_t* aDecodedData);

  // Decode the 128-bit encoded data.
  //
  // @param aFirstValueHigh The high 64 bits of the first value of the encoded
  //                        data.
  // @param aFirstValueLow The low 64 bits of the first value of the encoded
  //                       data.
  // @param aNumEntries The number of values to be decoded, not including
  //                    the first value.
  // @param aDecodedData A pre-allocated output buffer. Note that
  //                     the first 16 bytes will be filled with |aFirstValue|
  //                     and the buffer length (in byte) should be
  //                     ((aNumEntries + 1) * 16).
  bool Decode128(uint32_t aRiceParameter, uint64_t aFirstValueHigh,
                 uint64_t aFirstValueLow, uint32_t aNumEntries,
                 nsACString& aDecodedData);

  // Decode the 256-bit encoded data.
  //
  // @param aFirstValueOne The first high 64 bits value of the encoded data.
  // @param aFirstValueTwo The second high 64 bits value of the encoded data.
  // @param aFirstValueThree The third high 64 bits value of the encoded data.
  // @param aFirstValueFour The fourth high 64 bits value of the encoded data.
  // @param aNumEntries The number of values to be decoded, not including
  //                    the first value.
  // @param aDecodedData A pre-allocated output buffer. Note that
  //                     the first 32 byteswill be filled with |aFirstValue|
  //                     and the buffer length (in byte) should be
  //                     ((aNumEntries + 1) * 32).
  bool Decode256(uint32_t aRiceParameter, uint64_t aFirstValueOne,
                 uint64_t aFirstValueTwo, uint64_t aFirstValueThree,
                 uint64_t aFirstValueFour, uint32_t aNumEntries,
                 nsACString& aDecodedData);

 private:
  uint8_t* mEncodedData;
  size_t mEncodedDataSize;
};

}  // namespace safebrowsing
}  // namespace mozilla

#endif  // UPDATE_V4_DECODER_H
