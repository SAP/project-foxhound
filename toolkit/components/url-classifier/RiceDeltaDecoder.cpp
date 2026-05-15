/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "RiceDeltaDecoder.h"
#include "mozilla/Logging.h"
#include "nsString.h"

#include <limits>

extern mozilla::LazyLogModule gUrlClassifierDbServiceLog;
#define LOG(args) \
  MOZ_LOG(gUrlClassifierDbServiceLog, mozilla::LogLevel::Debug, args)

namespace {

////////////////////////////////////////////////////////////////////////
// BitBuffer is copied and modified from webrtc/base/bitbuffer.h
//

/*
 *  Copyright 2015 The WebRTC Project Authors. All rights reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree (webrtc/base/bitbuffer.h/cc). An additional intellectual property
 *  rights grant can be found in the file PATENTS.  All contributing
 *  project authors may be found in the AUTHORS file in the root of
 *  the source tree.
 */

class BitBuffer {
 public:
  BitBuffer(const uint8_t* bytes, size_t byte_count);

  // The remaining bits in the byte buffer.
  uint64_t RemainingBitCount() const;

  // Reads bit-sized values from the buffer. Returns false if there isn't enough
  // data left for the specified bit count..
  bool ReadBits(uint32_t* val, size_t bit_count);

  // Peeks bit-sized values from the buffer. Returns false if there isn't enough
  // data left for the specified number of bits. Doesn't move the current
  // offset.
  bool PeekBits(uint32_t* val, size_t bit_count);

  // Reads the exponential golomb encoded value at the current offset.
  // Exponential golomb values are encoded as:
  // 1) x = source val + 1
  // 2) In binary, write [countbits(x) - 1] 1s, then x
  // To decode, we count the number of leading 1 bits, read that many + 1 bits,
  // and increment the result by 1.
  // Returns false if there isn't enough data left for the specified type, or if
  // the value wouldn't fit in a uint32_t.
  bool ReadExponentialGolomb(uint32_t* val);

  // Moves current position |bit_count| bits forward. Returns false if
  // there aren't enough bits left in the buffer.
  bool ConsumeBits(size_t bit_count);

 protected:
  const uint8_t* const bytes_;
  // The total size of |bytes_|.
  size_t byte_count_;
  // The current offset, in bytes, from the start of |bytes_|.
  size_t byte_offset_;
  // The current offset, in bits, into the current byte.
  size_t bit_offset_;
};

}  // end of unnamed namespace

static void ReverseByte(uint8_t& b) {
  b = (b & 0xF0) >> 4 | (b & 0x0F) << 4;
  b = (b & 0xCC) >> 2 | (b & 0x33) << 2;
  b = (b & 0xAA) >> 1 | (b & 0x55) << 1;
}

// Template for multi-precision numbers. Supports 128-bit (2 uint64_t) and
// 256-bit (4 uint64_t)
template <size_t N>
struct Number {
  static_assert(
      N >= 2 && N <= 4,
      "Number template only supports 128-bit (N=2) and 256-bit (N=4)");

  Number() {
    for (size_t i = 0; i < N; i++) {
      mData[i] = 0;
    }
  }

  // Constructor that takes an array of values
  explicit Number(const uint64_t (&values)[N]) {
    for (size_t i = 0; i < N; i++) {
      mData[i] = values[i];
    }
  }

  const char* get() const { return reinterpret_cast<const char*>(mData); }

  Number operator+(const Number& aOther) const {
    uint64_t result[N];
    uint64_t carry = 0;

    // Add from least significant to most significant, propagating carry
    for (size_t i = 0; i < N; i++) {
      uint64_t sum = mData[i] + aOther.mData[i] + carry;
      result[i] = sum;
      // Check for overflow: if the sum is less than either operand (when carry
      // is 0) or if the sum is less than the sum without carry (when carry is
      // 1)
      carry = (sum < mData[i]) || (carry && sum < (mData[i] + aOther.mData[i]))
                  ? 1
                  : 0;
    }

    return Number(result);
  }

  Number operator=(const Number& aOther) {
    for (size_t i = 0; i < N; i++) {
      mData[i] = aOther.mData[i];
    }
    return *this;
  }

  uint64_t mData[N];
};

// Type aliases for convenience
using Number128 = Number<2>;
using Number256 = Number<4>;

namespace mozilla {
namespace safebrowsing {

RiceDeltaDecoder::RiceDeltaDecoder(uint8_t* aEncodedData,
                                   size_t aEncodedDataSize)
    : mEncodedData(aEncodedData), mEncodedDataSize(aEncodedDataSize) {}

bool RiceDeltaDecoder::Decode(uint32_t aRiceParameter, uint32_t aFirstValue,
                              uint32_t aNumEntries, uint32_t* aDecodedData) {
  // Reverse each byte before reading bits from the byte buffer.
  for (size_t i = 0; i < mEncodedDataSize; i++) {
    ReverseByte(mEncodedData[i]);
  }

  BitBuffer bitBuffer(mEncodedData, mEncodedDataSize);

  // q = quotient
  // r = remainder
  // k = RICE parameter
  const uint32_t k = aRiceParameter;
  aDecodedData[0] = aFirstValue;
  for (uint32_t i = 0; i < aNumEntries; i++) {
    // Read the quotient of N.
    uint32_t q;
    if (!bitBuffer.ReadExponentialGolomb(&q)) {
      LOG(("Encoded data underflow!"));
      return false;
    }

    // Read the remainder of N, one bit at a time.
    uint32_t r = 0;
    for (uint32_t j = 0; j < k; j++) {
      uint32_t b = 0;
      if (!bitBuffer.ReadBits(&b, 1)) {
        // Insufficient bits. Just leave them as zeros.
        break;
      }
      // Add the bit to the right position so that it's in Little Endian order.
      r |= b << j;
    }

    // Caculate N from q,r,k.
    uint32_t N = (q << k) + r;

    // We start filling aDecodedData.
    aDecodedData[i + 1] = N + aDecodedData[i];
  }

  return true;
}

bool RiceDeltaDecoder::Decode64(uint32_t aRiceParameter, uint64_t aFirstValue,
                                uint32_t aNumEntries, uint64_t* aDecodedData) {
  // Reverse each byte before reading bits from the byte buffer.
  for (size_t i = 0; i < mEncodedDataSize; i++) {
    ReverseByte(mEncodedData[i]);
  }

  BitBuffer bitBuffer(mEncodedData, mEncodedDataSize);

  // q = quotient
  // r = remainder
  // k = RICE parameter
  const uint32_t k = aRiceParameter;
  aDecodedData[0] = aFirstValue;
  for (uint32_t i = 0; i < aNumEntries; i++) {
    // Read the quotient of N.
    uint32_t q;
    if (!bitBuffer.ReadExponentialGolomb(&q)) {
      LOG(("Encoded data underflow!"));
      return false;
    }

    // Read the remainder of N, one bit at a time.
    uint64_t r = 0;
    for (uint32_t j = 0; j < k; j++) {
      uint32_t b = 0;
      if (!bitBuffer.ReadBits(&b, 1)) {
        // Insufficient bits. Just leave them as zeros.
        break;
      }
      // Add the bit to the right position so that it's in Little Endian order.
      r |= static_cast<uint64_t>(b) << j;
    }

    // Calculate N from q,r,k.
    uint64_t N = (static_cast<uint64_t>(q) << k) + r;

    // We start filling aDecodedData.
    aDecodedData[i + 1] = N + aDecodedData[i];
  }

  return true;
}

bool RiceDeltaDecoder::Decode128(uint32_t aRiceParameter,
                                 uint64_t aFirstValueHigh,
                                 uint64_t aFirstValueLow, uint32_t aNumEntries,
                                 nsACString& aDecodedData) {
  // Reverse each byte before reading bits from the byte buffer.
  for (size_t i = 0; i < mEncodedDataSize; i++) {
    ReverseByte(mEncodedData[i]);
  }

  BitBuffer bitBuffer(mEncodedData, mEncodedDataSize);

  // q = quotient
  // r = remainder
  // k = RICE parameter
  const uint32_t k = aRiceParameter;
  Number128 firstValue({aFirstValueLow, aFirstValueHigh});

  aDecodedData.Append(firstValue.get(), sizeof(firstValue));

  Number128 previousValue = firstValue;
  for (uint32_t i = 0; i < aNumEntries; i++) {
    // Read the quotient of N.
    uint32_t q;
    if (!bitBuffer.ReadExponentialGolomb(&q)) {
      LOG(("Encoded data underflow!"));
      return false;
    }

    // The rice parameter is guaranteed to be between 99 and 126. So, the
    // quotient is guaranteed to be located at the first 4 bytes.
    uint64_t r[2] = {0, 0};
    for (uint32_t j = 0; j < k; j++) {
      uint32_t b = 0;
      if (!bitBuffer.ReadBits(&b, 1)) {
        // Insufficient bits. Just leave them as zeros.
        break;
      }
      // Add the bit to the right position so that it's in Little Endian order.
      r[j / 64] |= static_cast<uint64_t>(b) << (j % 64);
    }

    // Calculate N from q,r,k.
    uint64_t N[2] = {0, 0};
    N[0] = r[0];
    N[1] = (static_cast<uint64_t>(q) << (k - 64)) + r[1];

    // Create delta N and add it to the previous value
    Number128 deltaN(N);
    Number128 result = previousValue + deltaN;
    previousValue = result;

    // Append the result to the decoded data
    aDecodedData.Append(result.get(), sizeof(result));
  }

  return true;
}

bool RiceDeltaDecoder::Decode256(uint32_t aRiceParameter,
                                 uint64_t aFirstValueOne,
                                 uint64_t aFirstValueTwo,
                                 uint64_t aFirstValueThree,
                                 uint64_t aFirstValueFour, uint32_t aNumEntries,
                                 nsACString& aDecodedData) {
  // Reverse each byte before reading bits from the byte buffer.
  for (size_t i = 0; i < mEncodedDataSize; i++) {
    ReverseByte(mEncodedData[i]);
  }

  BitBuffer bitBuffer(mEncodedData, mEncodedDataSize);

  // q = quotient
  // r = remainder
  // k = RICE parameter
  const uint32_t k = aRiceParameter;
  // The first value is in the Big Endian order. The value one contains the
  // highest 64 bits, value two contains the second highest 64 bits, and so on.
  Number256 firstValue(
      {aFirstValueFour, aFirstValueThree, aFirstValueTwo, aFirstValueOne});

  aDecodedData.Append(firstValue.get(), sizeof(firstValue));

  Number256 previousValue = firstValue;
  for (uint32_t i = 0; i < aNumEntries; i++) {
    // Read the quotient of N.
    uint32_t q;
    if (!bitBuffer.ReadExponentialGolomb(&q)) {
      LOG(("Encoded data underflow!"));
      return false;
    }

    // Read the remainder of N, one bit at a time.
    uint64_t r[4] = {0, 0, 0, 0};

    for (uint32_t j = 0; j < k; j++) {
      uint32_t b = 0;
      if (!bitBuffer.ReadBits(&b, 1)) {
        // Insufficient bits. Just leave them as zeros.
        break;
      }
      // Add the bit to the right position so that it's in Little Endian order.
      r[j / 64] |= static_cast<uint64_t>(b) << (j % 64);
    }

    // Calculate N from q,r,k.
    // The rice parameter is guaranteed to be between 227 and 254. So, the
    // quotient is guaranteed to be located at the highest 4 bytes.
    uint64_t N[4] = {0, 0, 0, 0};
    N[0] = r[0];
    N[1] = r[1];
    N[2] = r[2];
    N[3] = (static_cast<uint64_t>(q) << (k - (64 * 3))) + r[3];

    // Create delta N and add it to the previous value
    Number256 deltaN(N);
    Number256 result = previousValue + deltaN;
    previousValue = result;

    // Append the result to the decoded data
    aDecodedData.Append(result.get(), sizeof(result));
  }

  return true;
}

}  // namespace safebrowsing
}  // namespace mozilla

namespace {
//////////////////////////////////////////////////////////////////////////
// The BitBuffer impl is copied and modified from webrtc/base/bitbuffer.cc
//

// Returns the lowest (right-most) |bit_count| bits in |byte|.
uint8_t LowestBits(uint8_t byte, size_t bit_count) {
  return byte & ((1 << bit_count) - 1);
}

// Returns the highest (left-most) |bit_count| bits in |byte|, shifted to the
// lowest bits (to the right).
uint8_t HighestBits(uint8_t byte, size_t bit_count) {
  MOZ_ASSERT(bit_count < 8u);
  uint8_t shift = 8 - static_cast<uint8_t>(bit_count);
  uint8_t mask = 0xFF << shift;
  return (byte & mask) >> shift;
}

BitBuffer::BitBuffer(const uint8_t* bytes, size_t byte_count)
    : bytes_(bytes), byte_count_(byte_count), byte_offset_(), bit_offset_() {
  MOZ_ASSERT(static_cast<uint64_t>(byte_count_) <=
             std::numeric_limits<uint32_t>::max());
}

uint64_t BitBuffer::RemainingBitCount() const {
  return (static_cast<uint64_t>(byte_count_) - byte_offset_) * 8 - bit_offset_;
}

bool BitBuffer::PeekBits(uint32_t* val, size_t bit_count) {
  if (!val || bit_count > RemainingBitCount() || bit_count > 32) {
    return false;
  }
  const uint8_t* bytes = bytes_ + byte_offset_;
  size_t remaining_bits_in_current_byte = 8 - bit_offset_;
  uint32_t bits = LowestBits(*bytes++, remaining_bits_in_current_byte);
  // If we're reading fewer bits than what's left in the current byte, just
  // return the portion of this byte that we need.
  if (bit_count < remaining_bits_in_current_byte) {
    *val = HighestBits(bits, bit_offset_ + bit_count);
    return true;
  }
  // Otherwise, subtract what we've read from the bit count and read as many
  // full bytes as we can into bits.
  bit_count -= remaining_bits_in_current_byte;
  while (bit_count >= 8) {
    bits = (bits << 8) | *bytes++;
    bit_count -= 8;
  }
  // Whatever we have left is smaller than a byte, so grab just the bits we need
  // and shift them into the lowest bits.
  if (bit_count > 0) {
    bits <<= bit_count;
    bits |= HighestBits(*bytes, bit_count);
  }
  *val = bits;
  return true;
}

bool BitBuffer::ReadBits(uint32_t* val, size_t bit_count) {
  return PeekBits(val, bit_count) && ConsumeBits(bit_count);
}

bool BitBuffer::ConsumeBits(size_t bit_count) {
  if (bit_count > RemainingBitCount()) {
    return false;
  }

  byte_offset_ += (bit_offset_ + bit_count) / 8;
  bit_offset_ = (bit_offset_ + bit_count) % 8;
  return true;
}

bool BitBuffer::ReadExponentialGolomb(uint32_t* val) {
  if (!val) {
    return false;
  }

  *val = 0;

  // Count the number of leading 0 bits by peeking/consuming them one at a time.
  size_t one_bit_count = 0;
  uint32_t peeked_bit;
  while (PeekBits(&peeked_bit, 1) && peeked_bit == 1) {
    one_bit_count++;
    ConsumeBits(1);
  }
  if (!ConsumeBits(1)) {
    return false;  // The stream is incorrectly terminated at '1'.
  }

  *val = one_bit_count;
  return true;
}
}  // namespace
