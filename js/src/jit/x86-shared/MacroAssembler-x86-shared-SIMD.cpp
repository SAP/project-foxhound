/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "jit/MacroAssembler.h"
#include "jit/x86-shared/MacroAssembler-x86-shared.h"

#include "jit/MacroAssembler-inl.h"

using namespace js;
using namespace js::jit;

using mozilla::DebugOnly;
using mozilla::FloatingPoint;
using mozilla::Maybe;
using mozilla::SpecificNaN;

void MacroAssemblerX86Shared::splatX16(Register input, FloatRegister output) {
  ScratchSimd128Scope scratch(asMasm());

  vmovd(input, output);
  zeroSimd128Int(scratch);
  vpshufb(scratch, output, output);
}

void MacroAssemblerX86Shared::splatX8(Register input, FloatRegister output) {
  vmovd(input, output);
  vpshuflw(0, output, output);
  vpshufd(0, output, output);
}

void MacroAssemblerX86Shared::splatX4(Register input, FloatRegister output) {
  vmovd(input, output);
  vpshufd(0, output, output);
}

void MacroAssemblerX86Shared::splatX4(FloatRegister input,
                                      FloatRegister output) {
  MOZ_ASSERT(input.isSingle() && output.isSimd128());
  asMasm().moveSimd128Float(input.asSimd128(), output);
  vshufps(0, output, output, output);
}

void MacroAssemblerX86Shared::splatX2(FloatRegister input,
                                      FloatRegister output) {
  MOZ_ASSERT(input.isDouble() && output.isSimd128());
  asMasm().moveSimd128Float(input.asSimd128(), output);
  vshufpd(0, output, output, output);
}

void MacroAssemblerX86Shared::extractLaneInt32x4(FloatRegister input,
                                                 Register output,
                                                 unsigned lane) {
  if (lane == 0) {
    // The value we want to extract is in the low double-word
    moveLowInt32(input, output);
  } else {
    vpextrd(lane, input, output);
  }
}

void MacroAssemblerX86Shared::extractLaneFloat32x4(FloatRegister input,
                                                   FloatRegister output,
                                                   unsigned lane) {
  if (lane == 0) {
    // The value we want to extract is in the low double-word
    if (input != output) {
      moveFloat32(input, output);
    }
  } else if (lane == 2) {
    moveHighPairToLowPairFloat32(input, output);
  } else {
    uint32_t mask = MacroAssembler::ComputeShuffleMask(lane);
    shuffleFloat32(mask, input, output.asSimd128());
  }
}

void MacroAssemblerX86Shared::extractLaneFloat64x2(FloatRegister input,
                                                   FloatRegister output,
                                                   unsigned lane) {
  if (lane == 0) {
    // The value we want to extract is in the low quadword
    if (input != output) {
      moveDouble(input, output);
    }
  } else {
    vpalignr(Operand(input), output, 8);
  }
}

void MacroAssemblerX86Shared::extractLaneInt16x8(FloatRegister input,
                                                 Register output, unsigned lane,
                                                 SimdSign sign) {
  vpextrw(lane, input, output);
  if (sign == SimdSign::Signed) {
    movswl(output, output);
  }
}

void MacroAssemblerX86Shared::extractLaneInt8x16(FloatRegister input,
                                                 Register output, unsigned lane,
                                                 SimdSign sign) {
  vpextrb(lane, input, output);
  if (sign == SimdSign::Signed) {
    movsbl(output, output);
  }
}

void MacroAssemblerX86Shared::replaceLaneFloat32x4(FloatRegister rhs,
                                                   FloatRegister lhsDest,
                                                   unsigned lane) {
  MOZ_ASSERT(lhsDest.isSimd128() && rhs.isSingle());

  if (lane == 0) {
    if (rhs.asSimd128() == lhsDest) {
      // no-op, although this should not normally happen for type checking
      // reasons higher up in the stack.
    } else {
      // move low dword of value into low dword of output
      vmovss(rhs, lhsDest, lhsDest);
    }
  } else {
    vinsertps(vinsertpsMask(0, lane), rhs, lhsDest, lhsDest);
  }
}

void MacroAssemblerX86Shared::replaceLaneFloat64x2(FloatRegister rhs,
                                                   FloatRegister lhsDest,
                                                   unsigned lane) {
  MOZ_ASSERT(lhsDest.isSimd128() && rhs.isDouble());

  if (lane == 0) {
    if (rhs.asSimd128() == lhsDest) {
      // no-op, although this should not normally happen for type checking
      // reasons higher up in the stack.
    } else {
      // move low qword of value into low qword of output
      vmovsd(rhs, lhsDest, lhsDest);
    }
  } else {
    // move low qword of value into high qword of output
    vshufpd(0, rhs, lhsDest, lhsDest);
  }
}

void MacroAssemblerX86Shared::blendInt8x16(FloatRegister lhs, FloatRegister rhs,
                                           FloatRegister output,
                                           FloatRegister temp,
                                           const uint8_t lanes[16]) {
  MOZ_ASSERT(lhs == output);
  MOZ_ASSERT(lhs == rhs || !temp.isInvalid());

  // TODO: Consider whether PBLENDVB would not be better, even if it is variable
  // and requires xmm0 to be free and the loading of a mask.

  // Set scratch = lanes to select from lhs.
  int8_t mask[16];
  for (unsigned i = 0; i < 16; i++) {
    mask[i] = ~lanes[i];
  }
  ScratchSimd128Scope scratch(asMasm());
  asMasm().loadConstantSimd128Int(SimdConstant::CreateX16(mask), scratch);
  if (lhs == rhs) {
    asMasm().moveSimd128Int(rhs, temp);
    rhs = temp;
  }
  vpand(Operand(scratch), lhs, lhs);
  vpandn(Operand(rhs), scratch, scratch);
  vpor(scratch, lhs, lhs);
}

void MacroAssemblerX86Shared::blendInt16x8(FloatRegister lhs, FloatRegister rhs,
                                           FloatRegister output,
                                           const uint16_t lanes[8]) {
  MOZ_ASSERT(lhs == output);

  uint32_t mask = 0;
  for (unsigned i = 0; i < 8; i++) {
    if (lanes[i]) {
      mask |= (1 << i);
    }
  }
  vpblendw(mask, rhs, lhs, lhs);
}

void MacroAssemblerX86Shared::shuffleInt8x16(FloatRegister lhs,
                                             FloatRegister rhs,
                                             FloatRegister output,
                                             const uint8_t lanes[16]) {
  ScratchSimd128Scope scratch(asMasm());

  // Use pshufb instructions to gather the lanes from each source vector.
  // A negative index creates a zero lane, so the two vectors can be combined.

  // Register preference: lhs == output.

  // Set scratch = lanes from rhs.
  int8_t idx[16];
  for (unsigned i = 0; i < 16; i++) {
    idx[i] = lanes[i] >= 16 ? lanes[i] - 16 : -1;
  }
  moveSimd128Int(rhs, scratch);
  asMasm().vpshufbSimd128(SimdConstant::CreateX16(idx), scratch);

  // Set output = lanes from lhs.
  for (unsigned i = 0; i < 16; i++) {
    idx[i] = lanes[i] < 16 ? lanes[i] : -1;
  }
  moveSimd128Int(lhs, output);
  asMasm().vpshufbSimd128(SimdConstant::CreateX16(idx), output);

  // Combine.
  vpor(scratch, output, output);
}

static inline FloatRegister ToSimdFloatRegister(const Operand& op) {
  return FloatRegister(op.fpu(), FloatRegister::Codes::ContentType::Simd128);
}

void MacroAssemblerX86Shared::compareInt8x16(FloatRegister lhs, Operand rhs,
                                             Assembler::Condition cond,
                                             FloatRegister output) {
  static const SimdConstant allOnes = SimdConstant::SplatX16(-1);
  switch (cond) {
    case Assembler::Condition::GreaterThan:
      vpcmpgtb(rhs, lhs, output);
      break;
    case Assembler::Condition::Equal:
      vpcmpeqb(rhs, lhs, output);
      break;
    case Assembler::Condition::LessThan: {
      ScratchSimd128Scope scratch(asMasm());
      // This is bad, but Ion does not use it.
      // src := rhs
      if (rhs.kind() == Operand::FPREG) {
        moveSimd128Int(ToSimdFloatRegister(rhs), scratch);
      } else {
        loadAlignedSimd128Int(rhs, scratch);
      }
      // src := src > lhs (i.e. lhs < rhs)
      vpcmpgtb(Operand(lhs), scratch, scratch);
      moveSimd128Int(scratch, output);
      break;
    }
    case Assembler::Condition::NotEqual:
      vpcmpeqb(rhs, lhs, output);
      asMasm().bitwiseXorSimd128(allOnes, output);
      break;
    case Assembler::Condition::GreaterThanOrEqual: {
      ScratchSimd128Scope scratch(asMasm());
      // This is bad, but Ion does not use it.
      // src := rhs
      if (rhs.kind() == Operand::FPREG) {
        moveSimd128Int(ToSimdFloatRegister(rhs), scratch);
      } else {
        loadAlignedSimd128Int(rhs, scratch);
      }
      vpcmpgtb(Operand(lhs), scratch, scratch);
      asMasm().loadConstantSimd128Int(allOnes, output);
      vpxor(Operand(scratch), output, output);
      break;
    }
    case Assembler::Condition::LessThanOrEqual:
      // lhs <= rhs is equivalent to !(rhs < lhs), which we compute here.
      vpcmpgtb(rhs, lhs, output);
      asMasm().bitwiseXorSimd128(allOnes, output);
      break;
    default:
      MOZ_CRASH("unexpected condition op");
  }
}

void MacroAssemblerX86Shared::compareInt8x16(Assembler::Condition cond,
                                             const SimdConstant& rhs,
                                             FloatRegister lhsDest) {
  bool complement = false;
  switch (cond) {
    case Assembler::Condition::NotEqual:
      complement = true;
      [[fallthrough]];
    case Assembler::Condition::Equal:
      binarySimd128(rhs, lhsDest, &MacroAssembler::vpcmpeqb,
                    &MacroAssembler::vpcmpeqbSimd128);
      break;
    case Assembler::Condition::LessThanOrEqual:
      complement = true;
      [[fallthrough]];
    case Assembler::Condition::GreaterThan:
      binarySimd128(rhs, lhsDest, &MacroAssembler::vpcmpgtb,
                    &MacroAssembler::vpcmpgtbSimd128);
      break;
    default:
      MOZ_CRASH("unexpected condition op");
  }
  if (complement) {
    asMasm().bitwiseXorSimd128(SimdConstant::SplatX16(-1), lhsDest);
  }
}

void MacroAssemblerX86Shared::unsignedCompareInt8x16(
    FloatRegister lhs, Operand rhs, Assembler::Condition cond,
    FloatRegister output, FloatRegister tmp1, FloatRegister tmp2) {
  // We widen the inputs to 16 bits, transforming them to nonnegative values;
  // then compare them as signed using the logic from compareInt8x16(); then
  // merge the results (which is surprisingly complicated).  rhs is left
  // untouched.  The logic is open-coded to streamline it.
  //
  // TODO?  Rhs could be in memory (for Ion, anyway), in which case loading it
  // into scratch first would be better than loading it twice from memory.

  MOZ_ASSERT(lhs == output);
  MOZ_ASSERT(lhs != tmp1 && lhs != tmp2);
  MOZ_ASSERT_IF(
      rhs.kind() == Operand::FPREG,
      ToSimdFloatRegister(rhs) != tmp1 && ToSimdFloatRegister(rhs) != tmp2);

  bool complement = false;
  switch (cond) {
    case Assembler::Above:
    case Assembler::BelowOrEqual:
      complement = cond == Assembler::BelowOrEqual;

      // Low eight bytes of inputs widened to words
      vpmovzxbw(Operand(lhs), tmp1);
      vpmovzxbw(rhs, tmp2);
      // Compare leaving 16-bit results
      vpcmpgtw(Operand(tmp2), tmp1, tmp1);  // lhs < rhs in tmp1

      // High eight bytes of inputs widened to words
      vpalignr(rhs, tmp2, 8);
      vpmovzxbw(Operand(tmp2), tmp2);
      vpalignr(Operand(lhs), output, 8);
      vpmovzxbw(Operand(output), output);
      // Compare leaving 16-bit results
      vpcmpgtw(Operand(tmp2), output, output);  // lhs < rhs in output

      break;
    case Assembler::Below:
    case Assembler::AboveOrEqual:
      complement = cond == Assembler::AboveOrEqual;

      // Same as above but with operands reversed

      // Low eight bytes of inputs widened to words
      vpmovzxbw(Operand(lhs), tmp2);
      vpmovzxbw(rhs, tmp1);
      // Compare leaving 16-bit results
      vpcmpgtw(Operand(tmp2), tmp1, tmp1);  // rhs < lhs in tmp1

      // High eight bytes of inputs widened to words
      vpalignr(Operand(lhs), tmp2, 8);
      vpmovzxbw(Operand(tmp2), tmp2);
      vpalignr(rhs, output, 8);
      vpmovzxbw(Operand(output), output);
      // Compare leaving 16-bit results
      vpcmpgtw(Operand(tmp2), output, output);  // rhs < lhs in output

      break;
    default:
      MOZ_CRASH("Unsupported condition code");
  }

  // Merge output (results of high byte compares) and tmp1 (results of low byte
  // compares) by truncating word results to bytes (to avoid signed saturation),
  // packing, and then concatenating and shifting.
  vpsrlw(Imm32(8), tmp1, tmp1);
  vpackuswb(Operand(tmp1), tmp1, tmp1);
  vpsrlw(Imm32(8), output, output);
  vpackuswb(Operand(output), output, output);
  vpalignr(Operand(tmp1), output, 8);

  // Complement when needed for opposite sense of the operator.
  if (complement) {
    vpcmpeqd(Operand(tmp1), tmp1, tmp1);
    vpxor(Operand(tmp1), output, output);
  }
}

void MacroAssemblerX86Shared::compareInt16x8(FloatRegister lhs, Operand rhs,
                                             Assembler::Condition cond,
                                             FloatRegister output) {
  static const SimdConstant allOnes = SimdConstant::SplatX8(-1);

  switch (cond) {
    case Assembler::Condition::GreaterThan:
      vpcmpgtw(rhs, lhs, output);
      break;
    case Assembler::Condition::Equal:
      vpcmpeqw(rhs, lhs, output);
      break;
    case Assembler::Condition::LessThan: {
      ScratchSimd128Scope scratch(asMasm());
      // This is bad, but Ion does not use it.
      // src := rhs
      if (rhs.kind() == Operand::FPREG) {
        moveSimd128Int(ToSimdFloatRegister(rhs), scratch);
      } else {
        loadAlignedSimd128Int(rhs, scratch);
      }
      // src := src > lhs (i.e. lhs < rhs)
      vpcmpgtw(Operand(lhs), scratch, scratch);
      moveSimd128Int(scratch, output);
      break;
    }
    case Assembler::Condition::NotEqual:
      vpcmpeqw(rhs, lhs, output);
      asMasm().bitwiseXorSimd128(allOnes, output);
      break;
    case Assembler::Condition::GreaterThanOrEqual: {
      ScratchSimd128Scope scratch(asMasm());
      // This is bad, but Ion does not use it.
      // src := rhs
      if (rhs.kind() == Operand::FPREG) {
        moveSimd128Int(ToSimdFloatRegister(rhs), scratch);
      } else {
        loadAlignedSimd128Int(rhs, scratch);
      }
      vpcmpgtw(Operand(lhs), scratch, scratch);
      asMasm().loadConstantSimd128Int(allOnes, output);
      vpxor(Operand(scratch), output, output);
      break;
    }
    case Assembler::Condition::LessThanOrEqual:
      // lhs <= rhs is equivalent to !(rhs < lhs), which we compute here.
      vpcmpgtw(rhs, lhs, output);
      asMasm().bitwiseXorSimd128(allOnes, output);
      break;
    default:
      MOZ_CRASH("unexpected condition op");
  }
}

void MacroAssemblerX86Shared::compareInt16x8(Assembler::Condition cond,
                                             const SimdConstant& rhs,
                                             FloatRegister lhsDest) {
  bool complement = false;
  switch (cond) {
    case Assembler::Condition::NotEqual:
      complement = true;
      [[fallthrough]];
    case Assembler::Condition::Equal:
      binarySimd128(rhs, lhsDest, &MacroAssembler::vpcmpeqw,
                    &MacroAssembler::vpcmpeqwSimd128);
      break;
    case Assembler::Condition::LessThanOrEqual:
      complement = true;
      [[fallthrough]];
    case Assembler::Condition::GreaterThan:
      binarySimd128(rhs, lhsDest, &MacroAssembler::vpcmpgtw,
                    &MacroAssembler::vpcmpgtwSimd128);
      break;
    default:
      MOZ_CRASH("unexpected condition op");
  }
  if (complement) {
    asMasm().bitwiseXorSimd128(SimdConstant::SplatX16(-1), lhsDest);
  }
}

void MacroAssemblerX86Shared::unsignedCompareInt16x8(
    FloatRegister lhs, Operand rhs, Assembler::Condition cond,
    FloatRegister output, FloatRegister tmp1, FloatRegister tmp2) {
  // See comments at unsignedCompareInt8x16.

  MOZ_ASSERT(lhs == output);
  MOZ_ASSERT(lhs != tmp1 && lhs != tmp2);
  MOZ_ASSERT_IF(
      rhs.kind() == Operand::FPREG,
      ToSimdFloatRegister(rhs) != tmp1 && ToSimdFloatRegister(rhs) != tmp2);

  bool complement = false;
  switch (cond) {
    case Assembler::Above:
    case Assembler::BelowOrEqual:
      complement = cond == Assembler::BelowOrEqual;

      vpmovzxwd(Operand(lhs), tmp1);
      vpmovzxwd(rhs, tmp2);
      vpcmpgtd(Operand(tmp2), tmp1, tmp1);

      vpalignr(rhs, tmp2, 8);
      vpmovzxwd(Operand(tmp2), tmp2);
      vpalignr(Operand(lhs), output, 8);
      vpmovzxwd(Operand(output), output);
      vpcmpgtd(Operand(tmp2), output, output);

      break;
    case Assembler::Below:
    case Assembler::AboveOrEqual:
      complement = cond == Assembler::AboveOrEqual;

      vpmovzxwd(Operand(lhs), tmp2);
      vpmovzxwd(rhs, tmp1);
      vpcmpgtd(Operand(tmp2), tmp1, tmp1);

      vpalignr(Operand(lhs), tmp2, 8);
      vpmovzxwd(Operand(tmp2), tmp2);
      vpalignr(rhs, output, 8);
      vpmovzxwd(Operand(output), output);
      vpcmpgtd(Operand(tmp2), output, output);

      break;
    default:
      MOZ_CRASH();
  }

  vpsrld(Imm32(16), tmp1, tmp1);
  vpackusdw(Operand(tmp1), tmp1, tmp1);
  vpsrld(Imm32(16), output, output);
  vpackusdw(Operand(output), output, output);
  vpalignr(Operand(tmp1), output, 8);

  if (complement) {
    vpcmpeqd(Operand(tmp1), tmp1, tmp1);
    vpxor(Operand(tmp1), output, output);
  }
}

void MacroAssemblerX86Shared::compareInt32x4(FloatRegister lhs, Operand rhs,
                                             Assembler::Condition cond,
                                             FloatRegister output) {
  static const SimdConstant allOnes = SimdConstant::SplatX4(-1);
  switch (cond) {
    case Assembler::Condition::GreaterThan:
      vpcmpgtd(rhs, lhs, lhs);
      break;
    case Assembler::Condition::Equal:
      vpcmpeqd(rhs, lhs, lhs);
      break;
    case Assembler::Condition::LessThan: {
      ScratchSimd128Scope scratch(asMasm());
      // This is bad, but Ion does not use it.
      // src := rhs
      if (rhs.kind() == Operand::FPREG) {
        moveSimd128Int(ToSimdFloatRegister(rhs), scratch);
      } else {
        loadAlignedSimd128Int(rhs, scratch);
      }
      // src := src > lhs (i.e. lhs < rhs)
      vpcmpgtd(Operand(lhs), scratch, scratch);
      moveSimd128Int(scratch, lhs);
      break;
    }
    case Assembler::Condition::NotEqual:
      vpcmpeqd(rhs, lhs, lhs);
      asMasm().bitwiseXorSimd128(allOnes, lhs);
      break;
    case Assembler::Condition::GreaterThanOrEqual: {
      ScratchSimd128Scope scratch(asMasm());
      // This is bad, but Ion does not use it.
      // src := rhs
      if (rhs.kind() == Operand::FPREG) {
        moveSimd128Int(ToSimdFloatRegister(rhs), scratch);
      } else {
        loadAlignedSimd128Int(rhs, scratch);
      }
      vpcmpgtd(Operand(lhs), scratch, scratch);
      asMasm().loadConstantSimd128Int(allOnes, lhs);
      vpxor(Operand(scratch), lhs, lhs);
      break;
    }
    case Assembler::Condition::LessThanOrEqual:
      // lhs <= rhs is equivalent to !(rhs < lhs), which we compute here.
      vpcmpgtd(rhs, lhs, lhs);
      asMasm().bitwiseXorSimd128(allOnes, lhs);
      break;
    default:
      MOZ_CRASH("unexpected condition op");
  }
}

void MacroAssemblerX86Shared::compareInt32x4(Assembler::Condition cond,
                                             const SimdConstant& rhs,
                                             FloatRegister lhsDest) {
  bool complement = false;
  switch (cond) {
    case Assembler::Condition::NotEqual:
      complement = true;
      [[fallthrough]];
    case Assembler::Condition::Equal:
      binarySimd128(rhs, lhsDest, &MacroAssembler::vpcmpeqd,
                    &MacroAssembler::vpcmpeqdSimd128);
      break;
    case Assembler::Condition::LessThanOrEqual:
      complement = true;
      [[fallthrough]];
    case Assembler::Condition::GreaterThan:
      binarySimd128(rhs, lhsDest, &MacroAssembler::vpcmpgtd,
                    &MacroAssembler::vpcmpgtdSimd128);
      break;
    default:
      MOZ_CRASH("unexpected condition op");
  }
  if (complement) {
    asMasm().bitwiseXorSimd128(SimdConstant::SplatX16(-1), lhsDest);
  }
}

void MacroAssemblerX86Shared::unsignedCompareInt32x4(
    FloatRegister lhs, Operand rhs, Assembler::Condition cond,
    FloatRegister output, FloatRegister tmp1, FloatRegister tmp2) {
  // See comments at unsignedCompareInt8x16, the logic is similar.  However we
  // only have PCMPGTQ on SSE4.2 or later, so for SSE4.1 we need to use subtract
  // to compute the flags.

  MOZ_ASSERT(lhs == output);
  MOZ_ASSERT(lhs != tmp1 && lhs != tmp2);
  MOZ_ASSERT_IF(
      rhs.kind() == Operand::FPREG,
      ToSimdFloatRegister(rhs) != tmp1 && ToSimdFloatRegister(rhs) != tmp2);

  bool complement = false;
  switch (cond) {
    case Assembler::Below:
    case Assembler::AboveOrEqual:
      complement = cond == Assembler::AboveOrEqual;

      // The effect of the subtract is that the high doubleword of each quadword
      // becomes either 0 (ge) or -1 (lt).

      vpmovzxdq(Operand(lhs), tmp1);
      vpmovzxdq(rhs, tmp2);
      vpsubq(Operand(tmp2), tmp1, tmp1);  // flag1 junk flag0 junk
      vpsrlq(Imm32(32), tmp1, tmp1);      // zero flag1 zero flag0
      vpshufd(MacroAssembler::ComputeShuffleMask(0, 2, 3, 3), tmp1,
              tmp1);  // zero zero flag1 flag0

      vpalignr(rhs, tmp2, 8);
      vpmovzxdq(Operand(tmp2), tmp2);
      vpalignr(Operand(lhs), output, 8);
      vpmovzxdq(Operand(output), output);
      vpsubq(Operand(tmp2), output, output);  // flag3 junk flag2 junk
      vpsrlq(Imm32(32), output, output);      // zero flag3 zero flag2
      vpshufd(MacroAssembler::ComputeShuffleMask(3, 3, 0, 2), output,
              output);  // flag3 flag2 zero zero

      vpor(Operand(tmp1), output, output);
      break;

    case Assembler::Above:
    case Assembler::BelowOrEqual:
      complement = cond == Assembler::BelowOrEqual;

      // The effect of the subtract is that the high doubleword of each quadword
      // becomes either 0 (le) or -1 (gt).

      vpmovzxdq(Operand(lhs), tmp2);
      vpmovzxdq(rhs, tmp1);
      vpsubq(Operand(tmp2), tmp1, tmp1);  // flag1 junk flag0 junk
      vpsrlq(Imm32(32), tmp1, tmp1);      // zero flag1 zero flag0
      vpshufd(MacroAssembler::ComputeShuffleMask(0, 2, 3, 3), tmp1,
              tmp1);  // zero zero flag1 flag0

      vpalignr(Operand(lhs), tmp2, 8);
      vpmovzxdq(Operand(tmp2), tmp2);
      vpalignr(rhs, output, 8);
      vpmovzxdq(Operand(output), output);
      vpsubq(Operand(tmp2), output, output);  // flag3 junk flag2 junk
      vpsrlq(Imm32(32), output, output);      // zero flag3 zero flag2
      vpshufd(MacroAssembler::ComputeShuffleMask(3, 3, 0, 2), output,
              output);  // flag3 flag2 zero zero

      vpor(Operand(tmp1), output, output);
      break;

    default:
      MOZ_CRASH();
  }

  if (complement) {
    vpcmpeqd(Operand(tmp1), tmp1, tmp1);
    vpxor(Operand(tmp1), output, output);
  }
}

void MacroAssemblerX86Shared::compareFloat32x4(FloatRegister lhs, Operand rhs,
                                               Assembler::Condition cond,
                                               FloatRegister output) {
  if (HasAVX()) {
    MOZ_CRASH("Can do better here with three-address compares");
  }

  // Move lhs to output if lhs!=output; move rhs out of the way if rhs==output.
  // This is bad, but Ion does not need this fixup.
  ScratchSimd128Scope scratch(asMasm());
  if (!lhs.aliases(output)) {
    if (rhs.kind() == Operand::FPREG &&
        output.aliases(FloatRegister::FromCode(rhs.fpu()))) {
      vmovaps(rhs, scratch);
      rhs = Operand(scratch);
    }
    vmovaps(lhs, output);
  }

  switch (cond) {
    case Assembler::Condition::Equal:
      vcmpeqps(rhs, output);
      break;
    case Assembler::Condition::LessThan:
      vcmpltps(rhs, output);
      break;
    case Assembler::Condition::LessThanOrEqual:
      vcmpleps(rhs, output);
      break;
    case Assembler::Condition::NotEqual:
      vcmpneqps(rhs, output);
      break;
    case Assembler::Condition::GreaterThanOrEqual:
    case Assembler::Condition::GreaterThan:
      // We reverse these operations in the -inl.h file so that we don't have to
      // copy into and out of temporaries after codegen.
      MOZ_CRASH("should have reversed this");
    default:
      MOZ_CRASH("unexpected condition op");
  }
}

void MacroAssemblerX86Shared::compareFloat64x2(FloatRegister lhs, Operand rhs,
                                               Assembler::Condition cond,
                                               FloatRegister output) {
  if (HasAVX()) {
    MOZ_CRASH("Can do better here with three-address compares");
  }

  // Move lhs to output if lhs!=output; move rhs out of the way if rhs==output.
  // This is bad, but Ion does not need this fixup.
  ScratchSimd128Scope scratch(asMasm());
  if (!lhs.aliases(output)) {
    if (rhs.kind() == Operand::FPREG &&
        output.aliases(FloatRegister::FromCode(rhs.fpu()))) {
      vmovapd(rhs, scratch);
      rhs = Operand(scratch);
    }
    vmovapd(lhs, output);
  }

  switch (cond) {
    case Assembler::Condition::Equal:
      vcmpeqpd(rhs, output);
      break;
    case Assembler::Condition::LessThan:
      vcmpltpd(rhs, output);
      break;
    case Assembler::Condition::LessThanOrEqual:
      vcmplepd(rhs, output);
      break;
    case Assembler::Condition::NotEqual:
      vcmpneqpd(rhs, output);
      break;
    case Assembler::Condition::GreaterThanOrEqual:
    case Assembler::Condition::GreaterThan:
      // We reverse these operations in the -inl.h file so that we don't have to
      // copy into and out of temporaries after codegen.
      MOZ_CRASH("should have reversed this");
    default:
      MOZ_CRASH("unexpected condition op");
  }
}

// Semantics of wasm max and min.
//
//  * -0 < 0
//  * If one input is NaN then that NaN is the output
//  * If both inputs are NaN then the output is selected nondeterministically
//  * Any returned NaN is always made quiet
//  * The MVP spec 2.2.3 says "No distinction is made between signalling and
//    quiet NaNs", suggesting SNaN inputs are allowed and should not fault
//
// Semantics of maxps/minps/maxpd/minpd:
//
//  * If the values are both +/-0 the rhs is returned
//  * If the rhs is SNaN then the rhs is returned
//  * If either value is NaN then the rhs is returned
//  * An SNaN operand does not appear to give rise to an exception, at least
//    not in the JS shell on Linux, though the Intel spec lists Invalid
//    as one of the possible exceptions

// Various unaddressed considerations:
//
// It's pretty insane for this to take an Operand rhs - it really needs to be
// a register, given the number of times we access it.
//
// Constant load can be folded into the ANDPS.  Do we care?  It won't save us
// any registers, since output/temp1/temp2/scratch are all live at the same time
// after the first instruction of the slow path.
//
// Can we use blend for the NaN extraction/insertion?  We'd need xmm0 for the
// mask, which is no fun.  But it would be lhs UNORD lhs -> mask, blend;
// rhs UNORD rhs -> mask; blend.  Better than the mess we have below.  But
// we'd still need to setup the QNaN bits, unless we can blend those too
// with the lhs UNORD rhs mask?
//
// If we could determine that both input lanes are NaN then the result of the
// fast path should be fine modulo the QNaN bits, but it's not obvious this is
// much of an advantage.

void MacroAssemblerX86Shared::minMaxFloat32x4(bool isMin, FloatRegister lhs_,
                                              Operand rhs, FloatRegister temp1,
                                              FloatRegister temp2,
                                              FloatRegister output) {
  ScratchSimd128Scope scratch(asMasm());
  Label l;
  SimdConstant quietBits(SimdConstant::SplatX4(int32_t(0x00400000)));

  /* clang-format off */ /* leave my comments alone */
  FloatRegister lhs = reusedInputSimd128Float(lhs_, scratch);
  if (isMin) {
    vmovaps(lhs, output);                    // compute
    vminps(rhs, output, output);             //   min lhs, rhs
    vmovaps(rhs, temp1);                     // compute
    vminps(Operand(lhs), temp1, temp1);      //   min rhs, lhs
    vorps(temp1, output, output);            // fix min(-0, 0) with OR
  } else {
    vmovaps(lhs, output);                    // compute
    vmaxps(rhs, output, output);             //   max lhs, rhs
    vmovaps(rhs, temp1);                     // compute
    vmaxps(Operand(lhs), temp1, temp1);      //   max rhs, lhs
    vandps(temp1, output, output);           // fix max(-0, 0) with AND
  }
  vmovaps(lhs, temp1);                       // compute
  vcmpunordps(rhs, temp1);                   //   lhs UNORD rhs
  vptest(temp1, temp1);                      // check if any unordered
  j(Assembler::Equal, &l);                   //   and exit if not

  // Slow path.
  // output has result for non-NaN lanes, garbage in NaN lanes.
  // temp1 has lhs UNORD rhs.
  // temp2 is dead.

  vmovaps(temp1, temp2);                     // clear NaN lanes of result
  vpandn(output, temp2, temp2);              //   result now in temp2
  asMasm().vpandSimd128(quietBits, temp1);            // setup QNaN bits in NaN lanes
  vorps(temp1, temp2, temp2);                //   and OR into result
  vmovaps(lhs, temp1);                       // find NaN lanes
  vcmpunordps(Operand(temp1), temp1);        //   in lhs
  vmovaps(temp1, output);                    //     (and save them for later)
  vandps(lhs, temp1, temp1);                 //       and extract the NaNs
  vorps(temp1, temp2, temp2);                //         and add to the result
  vmovaps(rhs, temp1);                       // find NaN lanes
  vcmpunordps(Operand(temp1), temp1);        //   in rhs
  vpandn(temp1, output, output);             //     except if they were in lhs
  vandps(rhs, output, output);               //       and extract the NaNs
  vorps(temp2, output, output);              //         and add to the result

  bind(&l);
  /* clang-format on */
}

// Exactly as above.
void MacroAssemblerX86Shared::minMaxFloat64x2(bool isMin, FloatRegister lhs_,
                                              Operand rhs, FloatRegister temp1,
                                              FloatRegister temp2,
                                              FloatRegister output) {
  ScratchSimd128Scope scratch(asMasm());
  Label l;
  SimdConstant quietBits(SimdConstant::SplatX2(int64_t(0x0008000000000000ull)));

  /* clang-format off */ /* leave my comments alone */
  FloatRegister lhs = reusedInputSimd128Float(lhs_, scratch);
  if (isMin) {
    vmovapd(lhs, output);                    // compute
    vminpd(rhs, output, output);             //   min lhs, rhs
    vmovapd(rhs, temp1);                     // compute
    vminpd(Operand(lhs), temp1, temp1);      //   min rhs, lhs
    vorpd(temp1, output, output);            // fix min(-0, 0) with OR
  } else {
    vmovapd(lhs, output);                    // compute
    vmaxpd(rhs, output, output);             //   max lhs, rhs
    vmovapd(rhs, temp1);                     // compute
    vmaxpd(Operand(lhs), temp1, temp1);      //   max rhs, lhs
    vandpd(temp1, output, output);           // fix max(-0, 0) with AND
  }
  vmovapd(lhs, temp1);                       // compute
  vcmpunordpd(rhs, temp1);                   //   lhs UNORD rhs
  vptest(temp1, temp1);                      // check if any unordered
  j(Assembler::Equal, &l);                   //   and exit if not

  // Slow path.
  // output has result for non-NaN lanes, garbage in NaN lanes.
  // temp1 has lhs UNORD rhs.
  // temp2 is dead.

  vmovapd(temp1, temp2);                     // clear NaN lanes of result
  vpandn(output, temp2, temp2);              //   result now in temp2
  asMasm().vpandSimd128(quietBits, temp1);   // setup QNaN bits in NaN lanes
  vorpd(temp1, temp2, temp2);                //   and OR into result
  vmovapd(lhs, temp1);                       // find NaN lanes
  vcmpunordpd(Operand(temp1), temp1);        //   in lhs
  vmovapd(temp1, output);                    //     (and save them for later)
  vandpd(lhs, temp1, temp1);                 //       and extract the NaNs
  vorpd(temp1, temp2, temp2);                //         and add to the result
  vmovapd(rhs, temp1);                       // find NaN lanes
  vcmpunordpd(Operand(temp1), temp1);        //   in rhs
  vpandn(temp1, output, output);             //     except if they were in lhs
  vandpd(rhs, output, output);               //       and extract the NaNs
  vorpd(temp2, output, output);              //         and add to the result

  bind(&l);
  /* clang-format on */
}

void MacroAssemblerX86Shared::minFloat32x4(FloatRegister lhs, Operand rhs,
                                           FloatRegister temp1,
                                           FloatRegister temp2,
                                           FloatRegister output) {
  minMaxFloat32x4(/*isMin=*/true, lhs, rhs, temp1, temp2, output);
}

void MacroAssemblerX86Shared::maxFloat32x4(FloatRegister lhs, Operand rhs,
                                           FloatRegister temp1,
                                           FloatRegister temp2,
                                           FloatRegister output) {
  minMaxFloat32x4(/*isMin=*/false, lhs, rhs, temp1, temp2, output);
}

void MacroAssemblerX86Shared::minFloat64x2(FloatRegister lhs, Operand rhs,
                                           FloatRegister temp1,
                                           FloatRegister temp2,
                                           FloatRegister output) {
  minMaxFloat64x2(/*isMin=*/true, lhs, rhs, temp1, temp2, output);
}

void MacroAssemblerX86Shared::maxFloat64x2(FloatRegister lhs, Operand rhs,
                                           FloatRegister temp1,
                                           FloatRegister temp2,
                                           FloatRegister output) {
  minMaxFloat64x2(/*isMin=*/false, lhs, rhs, temp1, temp2, output);
}

static inline void MaskSimdShiftCount(MacroAssembler& masm, unsigned shiftmask,
                                      Register count, Register temp,
                                      FloatRegister dest) {
  masm.mov(count, temp);
  masm.andl(Imm32(shiftmask), temp);
  masm.vmovd(temp, dest);
}

void MacroAssemblerX86Shared::packedShiftByScalarInt8x16(
    FloatRegister in, Register count, Register temp, FloatRegister xtmp,
    FloatRegister dest,
    void (MacroAssemblerX86Shared::*shift)(FloatRegister, FloatRegister,
                                           FloatRegister),
    void (MacroAssemblerX86Shared::*extend)(const Operand&, FloatRegister)) {
  ScratchSimd128Scope scratch(asMasm());
  MaskSimdShiftCount(asMasm(), 7, count, temp, scratch);

  // High bytes
  vpalignr(Operand(in), xtmp, 8);
  (this->*extend)(Operand(xtmp), xtmp);
  (this->*shift)(scratch, xtmp, xtmp);

  // Low bytes
  (this->*extend)(Operand(dest), dest);
  (this->*shift)(scratch, dest, dest);

  // Mask off garbage to avoid saturation during packing
  asMasm().loadConstantSimd128Int(SimdConstant::SplatX4(int32_t(0x00FF00FF)),
                                  scratch);
  vpand(Operand(scratch), xtmp, xtmp);
  vpand(Operand(scratch), dest, dest);

  vpackuswb(Operand(xtmp), dest, dest);
}

void MacroAssemblerX86Shared::packedLeftShiftByScalarInt8x16(
    FloatRegister in, Register count, Register temp, FloatRegister xtmp,
    FloatRegister dest) {
  packedShiftByScalarInt8x16(in, count, temp, xtmp, dest,
                             &MacroAssemblerX86Shared::vpsllw,
                             &MacroAssemblerX86Shared::vpmovzxbw);
}

void MacroAssemblerX86Shared::packedLeftShiftByScalarInt8x16(
    Imm32 count, FloatRegister src, FloatRegister dest) {
  MOZ_ASSERT(count.value <= 7);
  asMasm().moveSimd128(src, dest);
  // Use the doubling trick for low shift counts, otherwise mask off the bits
  // that are shifted out of the low byte of each word and use word shifts.  The
  // optimal cutoff remains to be explored.
  if (count.value <= 3) {
    for (int32_t shift = count.value; shift > 0; --shift) {
      asMasm().addInt8x16(dest, dest);
    }
  } else {
    asMasm().bitwiseAndSimd128(SimdConstant::SplatX16(0xFF >> count.value),
                               dest);
    vpsllw(count, dest, dest);
  }
}

void MacroAssemblerX86Shared::packedRightShiftByScalarInt8x16(
    FloatRegister in, Register count, Register temp, FloatRegister xtmp,
    FloatRegister dest) {
  packedShiftByScalarInt8x16(in, count, temp, xtmp, dest,
                             &MacroAssemblerX86Shared::vpsraw,
                             &MacroAssemblerX86Shared::vpmovsxbw);
}

void MacroAssemblerX86Shared::packedRightShiftByScalarInt8x16(
    Imm32 count, FloatRegister src, FloatRegister temp, FloatRegister dest) {
  MOZ_ASSERT(count.value <= 7);
  ScratchSimd128Scope scratch(asMasm());

  asMasm().moveSimd128(src, scratch);
  vpslldq(Imm32(1), scratch, scratch);               // Low bytes -> high bytes
  vpsraw(Imm32(count.value + 8), scratch, scratch);  // Shift low bytes
  asMasm().moveSimd128(src, dest);
  vpsraw(count, dest, dest);  // Shift high bytes
  asMasm().loadConstantSimd128Int(SimdConstant::SplatX8(0xFF00), temp);
  vpand(Operand(temp), dest, dest);      // Keep high bytes
  vpandn(Operand(scratch), temp, temp);  // Keep low bytes
  vpor(Operand(temp), dest, dest);       // Combine
}

void MacroAssemblerX86Shared::packedUnsignedRightShiftByScalarInt8x16(
    FloatRegister in, Register count, Register temp, FloatRegister xtmp,
    FloatRegister dest) {
  packedShiftByScalarInt8x16(in, count, temp, xtmp, dest,
                             &MacroAssemblerX86Shared::vpsrlw,
                             &MacroAssemblerX86Shared::vpmovzxbw);
}

void MacroAssemblerX86Shared::packedUnsignedRightShiftByScalarInt8x16(
    Imm32 count, FloatRegister src, FloatRegister dest) {
  MOZ_ASSERT(count.value <= 7);
  asMasm().moveSimd128(src, dest);
  asMasm().bitwiseAndSimd128(
      SimdConstant::SplatX16((0xFF << count.value) & 0xFF), dest);
  vpsrlw(count, dest, dest);
}

void MacroAssemblerX86Shared::packedLeftShiftByScalarInt16x8(
    FloatRegister in, Register count, Register temp, FloatRegister dest) {
  ScratchSimd128Scope scratch(asMasm());
  MaskSimdShiftCount(asMasm(), 15, count, temp, scratch);
  vpsllw(scratch, in, dest);
}

void MacroAssemblerX86Shared::packedRightShiftByScalarInt16x8(
    FloatRegister in, Register count, Register temp, FloatRegister dest) {
  ScratchSimd128Scope scratch(asMasm());
  MaskSimdShiftCount(asMasm(), 15, count, temp, scratch);
  vpsraw(scratch, in, dest);
}

void MacroAssemblerX86Shared::packedUnsignedRightShiftByScalarInt16x8(
    FloatRegister in, Register count, Register temp, FloatRegister dest) {
  ScratchSimd128Scope scratch(asMasm());
  MaskSimdShiftCount(asMasm(), 15, count, temp, scratch);
  vpsrlw(scratch, in, dest);
}

void MacroAssemblerX86Shared::packedLeftShiftByScalarInt32x4(
    FloatRegister in, Register count, Register temp, FloatRegister dest) {
  ScratchSimd128Scope scratch(asMasm());
  MaskSimdShiftCount(asMasm(), 31, count, temp, scratch);
  vpslld(scratch, in, dest);
}

void MacroAssemblerX86Shared::packedRightShiftByScalarInt32x4(
    FloatRegister in, Register count, Register temp, FloatRegister dest) {
  ScratchSimd128Scope scratch(asMasm());
  MaskSimdShiftCount(asMasm(), 31, count, temp, scratch);
  vpsrad(scratch, in, dest);
}

void MacroAssemblerX86Shared::packedUnsignedRightShiftByScalarInt32x4(
    FloatRegister in, Register count, Register temp, FloatRegister dest) {
  ScratchSimd128Scope scratch(asMasm());
  MaskSimdShiftCount(asMasm(), 31, count, temp, scratch);
  vpsrld(scratch, in, dest);
}

void MacroAssemblerX86Shared::packedLeftShiftByScalarInt64x2(
    FloatRegister in, Register count, Register temp, FloatRegister dest) {
  ScratchSimd128Scope scratch(asMasm());
  MaskSimdShiftCount(asMasm(), 63, count, temp, scratch);
  vpsllq(scratch, in, dest);
}

void MacroAssemblerX86Shared::packedRightShiftByScalarInt64x2(
    FloatRegister in, Register count, Register temp1, FloatRegister temp2,
    FloatRegister dest) {
  ScratchSimd128Scope scratch(asMasm());
  movl(count, temp1);                   // temp1 is zero-extended shift count
  andl(Imm32(63), temp1);               // temp1 is masked shift count
  vmovd(temp1, scratch);                //   and scratch 64-bit ditto
  vpxor(Operand(temp2), temp2, temp2);  // temp2=0
  vpcmpgtq(Operand(in), temp2, temp2);  // temp2=~0 where `in` negative
  vpsrlq(scratch, in, dest);            // dest shifted, maybe wrong sign
  negl(temp1);                          // temp1 is - masked count
  addl(Imm32(63), temp1);               // temp1 is 63 - masked count
  vmovd(temp1, scratch);                //   and scratch ditto
  vpsllq(scratch, temp2, temp2);        // temp2 has the sign bits
  vpor(Operand(temp2), dest, dest);     // dest has right sign
}

void MacroAssemblerX86Shared::packedUnsignedRightShiftByScalarInt64x2(
    FloatRegister in, Register count, Register temp, FloatRegister dest) {
  ScratchSimd128Scope scratch(asMasm());
  MaskSimdShiftCount(asMasm(), 63, count, temp, scratch);
  vpsrlq(scratch, in, dest);
}

void MacroAssemblerX86Shared::packedRightShiftByScalarInt64x2(
    Imm32 count, FloatRegister src, FloatRegister dest) {
  MOZ_ASSERT(count.value < 32);
#ifdef ENABLE_WASM_SIMD
  MOZ_ASSERT(!MacroAssembler::MustScalarizeShiftSimd128(wasm::SimdOp::I64x2ShrS,
                                                        count));
#endif

  ScratchSimd128Scope scratch(asMasm());
  // Compute high dwords and mask low dwords
  asMasm().moveSimd128(src, scratch);
  vpsrad(count, scratch, scratch);
  asMasm().vpandSimd128(SimdConstant::SplatX2(int64_t(0xFFFFFFFF00000000LL)),
                        scratch);
  // Compute low dwords (high dwords at most have clear high bits where the
  // result will have set low high bits)
  asMasm().moveSimd128(src, dest);
  vpsrlq(count, dest, dest);
  // Merge the parts
  vpor(scratch, dest, dest);
}

void MacroAssemblerX86Shared::selectSimd128(FloatRegister mask,
                                            FloatRegister onTrue,
                                            FloatRegister onFalse,
                                            FloatRegister temp,
                                            FloatRegister output) {
  // Normally the codegen will attempt to enforce these register assignments so
  // that the moves are avoided.

  asMasm().moveSimd128Int(onTrue, output);
  asMasm().moveSimd128Int(mask, temp);

  // SSE4.1 has plain blendvps which can do this, but it is awkward
  // to use because it requires the mask to be in xmm0.

  vpand(Operand(temp), output, output);
  vpandn(Operand(onFalse), temp, temp);
  vpor(Operand(temp), output, output);
}

// Code sequences for int32x4<->float32x4 culled from v8; commentary added.

void MacroAssemblerX86Shared::unsignedConvertInt32x4ToFloat32x4(
    FloatRegister src, FloatRegister dest) {
  ScratchSimd128Scope scratch(asMasm());
  asMasm().moveSimd128Int(src, dest);
  vpxor(Operand(scratch), scratch, scratch);  // extract low bits
  vpblendw(0x55, dest, scratch, scratch);     //   into scratch
  vpsubd(Operand(scratch), dest, dest);       //     and high bits into dest
  vcvtdq2ps(scratch, scratch);                // convert low bits
  vpsrld(Imm32(1), dest, dest);               // get high into unsigned range
  vcvtdq2ps(dest, dest);                      //   convert
  vaddps(Operand(dest), dest, dest);          //     and back into signed
  vaddps(Operand(scratch), dest, dest);       // combine high+low: may round
}

void MacroAssemblerX86Shared::truncSatFloat32x4ToInt32x4(FloatRegister src,
                                                         FloatRegister dest) {
  ScratchSimd128Scope scratch(asMasm());
  asMasm().moveSimd128Float(src, dest);

  // The cvttps2dq instruction is the workhorse but does not handle NaN or out
  // of range values as we need it to.  We want to saturate too-large positive
  // values to 7FFFFFFFh and too-large negative values to 80000000h.  NaN and -0
  // become 0.

  // Convert NaN to 0 by masking away values that compare unordered to itself.
  vmovaps(dest, scratch);
  vcmpeqps(Operand(scratch), scratch);
  vpand(Operand(scratch), dest, dest);

  // Compute the complement of each non-NaN lane's sign bit, we'll need this to
  // correct the result of cvttps2dq.  All other output bits are garbage.
  vpxor(Operand(dest), scratch, scratch);

  // Convert.  This will make the output 80000000h if the input is out of range.
  vcvttps2dq(dest, dest);

  // Preserve the computed complemented sign bit if the output was 80000000h.
  // The sign bit will be 1 precisely for nonnegative values that overflowed.
  vpand(Operand(dest), scratch, scratch);

  // Create a mask with that sign bit.  Now a lane is either FFFFFFFFh if there
  // was a positive overflow, otherwise zero.
  vpsrad(Imm32(31), scratch, scratch);

  // Convert overflow lanes to 0x7FFFFFFF.
  vpxor(Operand(scratch), dest, dest);
}

void MacroAssemblerX86Shared::unsignedTruncSatFloat32x4ToInt32x4(
    FloatRegister src, FloatRegister temp, FloatRegister dest) {
  ScratchSimd128Scope scratch(asMasm());
  asMasm().moveSimd128Float(src, dest);

  // The cvttps2dq instruction is the workhorse but does not handle NaN or out
  // of range values as we need it to.  We want to saturate too-large positive
  // values to FFFFFFFFh and negative values to zero.  NaN and -0 become 0.

  // Convert NaN and negative values to zeroes in dest.
  vpxor(Operand(scratch), scratch, scratch);
  vmaxps(Operand(scratch), dest, dest);

  // Place the largest positive signed integer in all lanes in scratch.
  // We use it to bias the conversion to handle edge cases.
  asMasm().loadConstantSimd128Float(SimdConstant::SplatX4(2147483647.f),
                                    scratch);

  // temp = dest - 7FFFFFFFh (as floating), this brings integers in the unsigned
  // range but above the signed range into the signed range; 0 => -7FFFFFFFh.
  vmovaps(dest, temp);
  vsubps(Operand(scratch), temp, temp);

  // scratch = mask of biased values that are greater than 7FFFFFFFh.
  vcmpleps(Operand(temp), scratch);

  // Convert the biased values to integer.  Positive values above 7FFFFFFFh will
  // have been converted to 80000000h, all others become the expected integer.
  vcvttps2dq(temp, temp);

  // As lanes of scratch are ~0 where the result overflows, this computes
  // 7FFFFFFF in lanes of temp that are 80000000h, and leaves other lanes
  // untouched as the biased integer.
  vpxor(Operand(scratch), temp, temp);

  // Convert negative biased lanes in temp to zero.  After this, temp will be
  // zero where the result should be zero or is less than 80000000h, 7FFFFFFF
  // where the result overflows, and will have the converted biased result in
  // other lanes (for input values >= 80000000h).
  vpxor(Operand(scratch), scratch, scratch);
  vpmaxsd(Operand(scratch), temp, temp);

  // Convert. Overflow lanes above 7FFFFFFFh will be 80000000h, other lanes will
  // be what they should be.
  vcvttps2dq(dest, dest);

  // Add temp to the result.  Overflow lanes with 80000000h becomes FFFFFFFFh,
  // biased high-value unsigned lanes become unbiased, everything else is left
  // unchanged.
  vpaddd(Operand(temp), dest, dest);
}
