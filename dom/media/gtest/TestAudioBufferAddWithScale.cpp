/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <cstring>

#include "AudioNodeEngine.h"
#include "gtest/gtest.h"

// Bit-identical-output regression tests for AudioBufferAddWithScale.
//
// AudioBufferAddWithScale runtime-dispatches to one of:
//   Engine<xsimd::sse4_2>               (decently modern x86-64)
//   Engine<xsimd::sse2>                 (older x86 / 32-bit x86)
//   Engine<xsimd::neon>                 (aarch64 / 32-bit ARM with NEON)
//   generic scalar fallback
//
// Before Bug 2036977, the SIMD body in AudioNodeEngineGenericImpl.h used
// xsimd::fma() — an explicit fused multiply-add that bypassed Mozilla's
// project-wide -ffp-contract=off and produced bit-different output across
// the four tiers (telemetry showed 3 distinct audio_fingerprint buckets
// that tracked CPU SIMD class) when targeting architecture that have built-in
// support for FMA instructions.
//
// The fix replaced xsimd::fma with separate
// vmul + vadd so all tiers compute the same IEEE-754 mul + add.
//
// These tests assert that, on whichever SIMD tier the host CPU and build
// flags select, the function's output is bit-identical to a portable
// scalar reference that does the same two IEEE-754 operations. Run on
// every supported build target (32-bit x86, 64-bit x86 with and without
// FMA3 hardware, aarch64) to confirm cross-architecture stability.

namespace {

// Scalar reference: separate IEEE-754 multiply, then separate add.
// Mozilla's build sets -ffp-contract=off project-wide, so the compiler
// is forbidden from contracting these into an FMA on any architecture.
// The two-statement form (with `product` as an explicit named
// intermediate) is also resistant to fusion regardless of the flag,
// since the C/C++ standard requires rounding at each assignment.
void ReferenceAddWithScale(const float* aInput, float aScale, float* aOutput,
                           uint32_t aSize) {
  for (uint32_t i = 0; i < aSize; ++i) {
    float product = aInput[i] * aScale;
    aOutput[i] = aOutput[i] + product;
  }
}

// Compare two float buffers bit-exactly. Reports the first mismatching
// sample and stops, so failure messages are localized.
void ExpectBitIdentical(const float* aActual, const float* aExpected,
                        uint32_t aSize, const char* aLabel) {
  for (uint32_t i = 0; i < aSize; ++i) {
    uint32_t actual_bits;
    uint32_t expected_bits;
    std::memcpy(&actual_bits, &aActual[i], sizeof(uint32_t));
    std::memcpy(&expected_bits, &aExpected[i], sizeof(uint32_t));
    if (actual_bits != expected_bits) {
      ADD_FAILURE() << aLabel << ": sample " << i
                    << " bit-mismatch: expected 0x" << std::hex << expected_bits
                    << " (" << aExpected[i] << "), got 0x" << actual_bits
                    << " (" << aActual[i] << ")";
      return;  // one mismatch is enough to localize
    }
  }
}

// Fill a buffer with a deterministic non-trivial signal — values that
// are not representable as round binary fractions, so any FMA-vs-not
// rounding divergence shows up.
void FillSignal(float* aBuffer, uint32_t aSize) {
  for (uint32_t i = 0; i < aSize; ++i) {
    aBuffer[i] = float(i % 17) * 0.0231f - 0.5f;
  }
}

}  // anonymous namespace

// Aligned-buffer, scale != 1.0: exercises the SIMD body for every tier.
// 128 is a multiple of every supported batch::size (4 on SSE2/SSE4.2/NEON),
// so there is no scalar tail.
TEST(AudioBufferAddWithScale, BitIdenticalToScalarReference)
{
  constexpr uint32_t kSize = 128;
  alignas(64) float input[kSize];
  alignas(64) float actual[kSize];
  alignas(64) float reference[kSize];

  FillSignal(input, kSize);
  for (uint32_t i = 0; i < kSize; ++i) {
    actual[i] = 0.5f;
    reference[i] = 0.5f;
  }

  // Apply 4 passes to amplify any per-sample 1-ULP rounding divergence
  // (mirrors the depth of accumulation in the User Characteristics
  // audio_fingerprint signal that motivated this fix).
  for (int pass = 0; pass < 4; ++pass) {
    mozilla::AudioBufferAddWithScale(input, 0.7f, actual, kSize);
    ReferenceAddWithScale(input, 0.7f, reference, kSize);
  }

  ExpectBitIdentical(actual, reference, kSize, "scale=0.7, aligned");
}

// Aligned-buffer, scale == 1.0: takes a slightly different path in the
// alignment-prefix loop (no multiply), but the SIMD body is identical.
TEST(AudioBufferAddWithScale, ScaleOneBitIdenticalToScalarReference)
{
  constexpr uint32_t kSize = 128;
  alignas(64) float input[kSize];
  alignas(64) float actual[kSize];
  alignas(64) float reference[kSize];

  FillSignal(input, kSize);
  for (uint32_t i = 0; i < kSize; ++i) {
    actual[i] = 0.5f;
    reference[i] = 0.5f;
  }

  for (int pass = 0; pass < 4; ++pass) {
    mozilla::AudioBufferAddWithScale(input, 1.0f, actual, kSize);
    ReferenceAddWithScale(input, 1.0f, reference, kSize);
  }

  ExpectBitIdentical(actual, reference, kSize, "scale=1.0, aligned");
}

// Unaligned-buffer path: on architectures that require alignment
// (xsimd::sse2, xsimd::fma3<sse4_2>) the function runs a scalar prefix
// loop until the buffers are aligned, then enters the SIMD body. The
// arithmetic in that prefix loop must also match the scalar reference.
// On NEON, requires_alignment() is false and this runs entirely
// through the SIMD body — same expected output either way.
TEST(AudioBufferAddWithScale, UnalignedBitIdenticalToScalarReference)
{
  constexpr uint32_t kSize = 128;
  alignas(64) float input_storage[kSize + 8];
  alignas(64) float actual_storage[kSize + 8];
  alignas(64) float reference_storage[kSize + 8];

  // Offset by 1 float (4 bytes): aligned to 4 but not to 16.
  float* input = input_storage + 1;
  float* actual = actual_storage + 1;
  float* reference = reference_storage + 1;

  FillSignal(input, kSize);
  for (uint32_t i = 0; i < kSize; ++i) {
    actual[i] = 0.5f;
    reference[i] = 0.5f;
  }

  for (int pass = 0; pass < 4; ++pass) {
    mozilla::AudioBufferAddWithScale(input, 0.7f, actual, kSize);
    ReferenceAddWithScale(input, 0.7f, reference, kSize);
  }

  ExpectBitIdentical(actual, reference, kSize, "scale=0.7, unaligned");
}

// Non-block-multiple size: exercises the scalar tail for sizes not
// divisible by batch::size.
TEST(AudioBufferAddWithScale, NonBlockMultipleBitIdenticalToScalarReference)
{
  // 131 = 128 + 3 — three trailing samples go through the scalar tail
  // on every tier (batch::size is 4 everywhere we care about).
  constexpr uint32_t kSize = 131;
  alignas(64) float input[kSize + 1];
  alignas(64) float actual[kSize + 1];
  alignas(64) float reference[kSize + 1];

  FillSignal(input, kSize);
  for (uint32_t i = 0; i < kSize; ++i) {
    actual[i] = 0.5f;
    reference[i] = 0.5f;
  }

  for (int pass = 0; pass < 4; ++pass) {
    mozilla::AudioBufferAddWithScale(input, 0.7f, actual, kSize);
    ReferenceAddWithScale(input, 0.7f, reference, kSize);
  }

  ExpectBitIdentical(actual, reference, kSize, "scale=0.7, size=131");
}
