/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Copyright 2021 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
#include "jit/riscv64/MacroAssembler-riscv64.h"

#include "jit/Bailouts.h"
#include "jit/BaselineFrame.h"
#include "jit/JitFrames.h"
#include "jit/JitRuntime.h"
#include "jit/MacroAssembler.h"
#include "jit/MoveEmitter.h"
#include "jit/riscv64/SharedICRegisters-riscv64.h"
#include "util/Memory.h"
#include "util/PortableMath.h"
#include "vm/JitActivation.h"  // jit::JitActivation
#include "vm/JSContext.h"
#include "wasm/WasmStubs.h"

#include "jit/MacroAssembler-inl.h"

namespace js {
namespace jit {

MacroAssembler& MacroAssemblerRiscv64::asMasm() {
  return *static_cast<MacroAssembler*>(this);
}

const MacroAssembler& MacroAssemblerRiscv64::asMasm() const {
  return *static_cast<const MacroAssembler*>(this);
}

void MacroAssemblerRiscv64::ma_cmp_set(Register rd, Register rj, ImmWord imm,
                                       Condition c) {
  if (imm.value <= INT32_MAX) {
    ma_cmp_set(rd, rj, Imm32(uint32_t(imm.value)), c);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, imm);
    ma_cmp_set(rd, rj, scratch, c);
  }
}

void MacroAssemblerRiscv64::ma_cmp_set(Register rd, Register rj, ImmPtr imm,
                                       Condition c) {
  ma_cmp_set(rd, rj, ImmWord(uintptr_t(imm.value)), c);
}

void MacroAssemblerRiscv64::ma_cmp_set(Register rd, Register rj, ImmGCPtr imm,
                                       Condition c) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  ma_li(scratch, imm);
  ma_cmp_set(rd, rj, scratch, c);
}

void MacroAssemblerRiscv64::ma_cmp_set(Register rd, Address address,
                                       Register rhs, Condition c) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  ma_load(scratch2, address, SizeDouble);
  ma_cmp_set(rd, Register(scratch2), rhs, c);
}

void MacroAssemblerRiscv64::ma_cmp_set(Register rd, Address address, Imm32 imm,
                                       Condition c) {
  // TODO(riscv): 32-bit ma_cmp_set?
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  ma_load(scratch2, address, SizeWord);
  ma_cmp_set(rd, Register(scratch2), imm, c);
}

void MacroAssemblerRiscv64::ma_cmp_set(Register rd, Address address,
                                       ImmWord imm, Condition c) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  ma_load(scratch2, address, SizeDouble);
  ma_cmp_set(rd, Register(scratch2), imm, c);
}

void MacroAssemblerRiscv64::ma_cmp_set(Register rd, Register rj, Imm32 imm,
                                       Condition c) {
  if (imm.value == 0) {
    switch (c) {
      case Equal:
      case BelowOrEqual:
        ma_sltu(rd, rj, Operand(1));
        break;
      case NotEqual:
      case Above:
        sltu(rd, zero, rj);
        break;
      case AboveOrEqual:
      case Below:
        ori(rd, zero, c == AboveOrEqual ? 1 : 0);
        break;
      case GreaterThan:
      case LessThanOrEqual:
        slt(rd, zero, rj);
        if (c == LessThanOrEqual) {
          xori(rd, rd, 1);
        }
        break;
      case LessThan:
      case GreaterThanOrEqual:
        slt(rd, rj, zero);
        if (c == GreaterThanOrEqual) {
          xori(rd, rd, 1);
        }
        break;
      case Zero:
        ma_sltu(rd, rj, Operand(1));
        break;
      case NonZero:
        sltu(rd, zero, rj);
        break;
      case Signed:
        slt(rd, rj, zero);
        break;
      case NotSigned:
        slt(rd, rj, zero);
        xori(rd, rd, 1);
        break;
      default:
        MOZ_CRASH("Invalid condition.");
    }
    return;
  }

  switch (c) {
    case Equal:
    case NotEqual:
      ma_xor(rd, rj, imm);
      if (c == Equal) {
        ma_sltu(rd, rd, Operand(1));
      } else {
        sltu(rd, zero, rd);
      }
      break;
    case Zero:
    case NonZero:
    case Signed:
    case NotSigned:
      MOZ_CRASH("Invalid condition.");
    default:
      Condition cond = ma_cmp(rd, rj, imm, c);
      MOZ_ASSERT(cond == Equal || cond == NotEqual);

      if (cond == Equal) xori(rd, rd, 1);
  }
}

Assembler::Condition MacroAssemblerRiscv64::ma_cmp(Register dest, Register lhs,
                                                   Register rhs, Condition c) {
  switch (c) {
    case Above:
      // bgtu s,t,label =>
      //   sltu at,t,s
      //   bne at,$zero,offs
      sltu(dest, rhs, lhs);
      return NotEqual;
    case AboveOrEqual:
      // bgeu s,t,label =>
      //   sltu at,s,t
      //   beq at,$zero,offs
      sltu(dest, lhs, rhs);
      return Equal;
    case Below:
      // bltu s,t,label =>
      //   sltu at,s,t
      //   bne at,$zero,offs
      sltu(dest, lhs, rhs);
      return NotEqual;
    case BelowOrEqual:
      // bleu s,t,label =>
      //   sltu at,t,s
      //   beq at,$zero,offs
      sltu(dest, rhs, lhs);
      return Equal;
    case GreaterThan:
      // bgt s,t,label =>
      //   slt at,t,s
      //   bne at,$zero,offs
      slt(dest, rhs, lhs);
      return NotEqual;
    case GreaterThanOrEqual:
      // bge s,t,label =>
      //   slt at,s,t
      //   beq at,$zero,offs
      slt(dest, lhs, rhs);
      return Equal;
    case LessThan:
      // blt s,t,label =>
      //   slt at,s,t
      //   bne at,$zero,offs
      slt(dest, lhs, rhs);
      return NotEqual;
    case LessThanOrEqual:
      // ble s,t,label =>
      //   slt at,t,s
      //   beq at,$zero,offs
      slt(dest, rhs, lhs);
      return Equal;
    default:
      MOZ_CRASH("Invalid condition.");
  }
  return Always;
}

Assembler::Condition MacroAssemblerRiscv64::ma_cmp(Register dest, Register lhs,
                                                   Imm32 imm, Condition c) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  MOZ_RELEASE_ASSERT(lhs != scratch);

  switch (c) {
    case Above:
    case BelowOrEqual:
      if (imm.value != 0x7fffffff && is_intn(imm.value + 1, 12) &&
          imm.value != -1) {
        // lhs <= rhs via lhs < rhs + 1 if rhs + 1 does not overflow
        ma_sltu(dest, lhs, Operand(imm.value + 1));

        return (c == BelowOrEqual ? NotEqual : Equal);
      } else {
        ma_li(scratch, imm);
        sltu(dest, scratch, lhs);
        return (c == BelowOrEqual ? Equal : NotEqual);
      }
    case AboveOrEqual:
    case Below:
      if (is_intn(imm.value, 12)) {
        ma_sltu(dest, lhs, Operand(imm.value));
      } else {
        ma_li(scratch, imm);
        sltu(dest, lhs, scratch);
      }
      return (c == AboveOrEqual ? Equal : NotEqual);
    case GreaterThan:
    case LessThanOrEqual:
      if (imm.value != 0x7fffffff && is_intn(imm.value + 1, 12)) {
        // lhs <= rhs via lhs < rhs + 1.
        ma_slt(dest, lhs, Operand(imm.value + 1));
        return (c == LessThanOrEqual ? NotEqual : Equal);
      } else {
        ma_li(scratch, imm);
        slt(dest, scratch, lhs);
        return (c == LessThanOrEqual ? Equal : NotEqual);
      }
    case GreaterThanOrEqual:
    case LessThan:
      if (is_intn(imm.value, 12)) {
        ma_slt(dest, lhs, imm);
      } else {
        ma_li(scratch, imm);
        slt(dest, lhs, scratch);
      }
      return (c == GreaterThanOrEqual ? Equal : NotEqual);
    default:
      MOZ_CRASH("Invalid condition.");
  }
  return Always;
}

void MacroAssemblerRiscv64::ma_cmp_set(Register rd, Register rj, Register rk,
                                       Condition c) {
  switch (c) {
    case Equal:
      // seq d,s,t =>
      //   xor d,s,t
      //   sltiu d,d,1
      xor_(rd, rj, rk);
      ma_sltu(rd, rd, Operand(1));
      break;
    case NotEqual:
      // sne d,s,t =>
      //   xor d,s,t
      //   sltu d,$zero,d
      xor_(rd, rj, rk);
      sltu(rd, zero, rd);
      break;
    case Above:
      // sgtu d,s,t =>
      //   sltu d,t,s
      sltu(rd, rk, rj);
      break;
    case AboveOrEqual:
      // sgeu d,s,t =>
      //   sltu d,s,t
      //   xori d,d,1
      sltu(rd, rj, rk);
      xori(rd, rd, 1);
      break;
    case Below:
      // sltu d,s,t
      sltu(rd, rj, rk);
      break;
    case BelowOrEqual:
      // sleu d,s,t =>
      //   sltu d,t,s
      //   xori d,d,1
      sltu(rd, rk, rj);
      xori(rd, rd, 1);
      break;
    case GreaterThan:
      // sgt d,s,t =>
      //   slt d,t,s
      slt(rd, rk, rj);
      break;
    case GreaterThanOrEqual:
      // sge d,s,t =>
      //   slt d,s,t
      //   xori d,d,1
      slt(rd, rj, rk);
      xori(rd, rd, 1);
      break;
    case LessThan:
      // slt d,s,t
      slt(rd, rj, rk);
      break;
    case LessThanOrEqual:
      // sle d,s,t =>
      //   slt d,t,s
      //   xori d,d,1
      slt(rd, rk, rj);
      xori(rd, rd, 1);
      break;
    case Zero:
      MOZ_ASSERT(rj == rk);
      // seq d,s,$zero =>
      //   sltiu d,s,1
      ma_sltu(rd, rj, Operand(1));
      break;
    case NonZero:
      MOZ_ASSERT(rj == rk);
      // sne d,s,$zero =>
      //   sltu d,$zero,s
      sltu(rd, zero, rj);
      break;
    case Signed:
      MOZ_ASSERT(rj == rk);
      slt(rd, rj, zero);
      break;
    case NotSigned:
      MOZ_ASSERT(rj == rk);
      // sge d,s,$zero =>
      //   slt d,s,$zero
      //   xori d,d,1
      slt(rd, rj, zero);
      xori(rd, rd, 1);
      break;
    default:
      MOZ_CRASH("Invalid condition.");
  }
}

void MacroAssemblerRiscv64::ma_compareF32(Register rd, DoubleCondition cc,
                                          FloatRegister cmp1,
                                          FloatRegister cmp2) {
  switch (cc) {
    case DoubleEqual:
      feq_s(rd, cmp1, cmp2);
      return;
    case DoubleEqualOrUnordered: {
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      flt_s(rd, cmp1, cmp2);
      flt_s(scratch, cmp2, cmp1);
      or_(rd, rd, scratch);
      NegateBool(rd, rd);
      return;
    }
    case DoubleNotEqual: {
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      flt_s(rd, cmp1, cmp2);
      flt_s(scratch, cmp2, cmp1);
      or_(rd, rd, scratch);
      return;
    }
    case DoubleNotEqualOrUnordered:
      feq_s(rd, cmp1, cmp2);
      NegateBool(rd, rd);
      return;
    case DoubleLessThan:
      flt_s(rd, cmp1, cmp2);
      return;
    case DoubleLessThanOrUnordered:
      fle_s(rd, cmp2, cmp1);
      NegateBool(rd, rd);
      return;
    case DoubleGreaterThanOrEqual:
      fle_s(rd, cmp2, cmp1);
      return;
    case DoubleGreaterThanOrEqualOrUnordered:
      flt_s(rd, cmp1, cmp2);
      NegateBool(rd, rd);
      return;
    case DoubleLessThanOrEqual:
      fle_s(rd, cmp1, cmp2);
      return;
    case DoubleLessThanOrEqualOrUnordered:
      flt_s(rd, cmp2, cmp1);
      NegateBool(rd, rd);
      return;
    case DoubleGreaterThan:
      flt_s(rd, cmp2, cmp1);
      return;
    case DoubleGreaterThanOrUnordered:
      fle_s(rd, cmp1, cmp2);
      NegateBool(rd, rd);
      return;
    case DoubleOrdered:
      CompareIsNotNanF32(rd, cmp1, cmp2);
      return;
    case DoubleUnordered:
      CompareIsNanF32(rd, cmp1, cmp2);
      return;
  }
}

void MacroAssemblerRiscv64::ma_compareF64(Register rd, DoubleCondition cc,
                                          FloatRegister cmp1,
                                          FloatRegister cmp2) {
  switch (cc) {
    case DoubleEqual:
      feq_d(rd, cmp1, cmp2);
      return;
    case DoubleEqualOrUnordered: {
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      flt_d(rd, cmp1, cmp2);
      flt_d(scratch, cmp2, cmp1);
      or_(rd, rd, scratch);
      NegateBool(rd, rd);
      return;
    }
    case DoubleNotEqual: {
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      flt_d(rd, cmp1, cmp2);
      flt_d(scratch, cmp2, cmp1);
      or_(rd, rd, scratch);
      return;
    }
    case DoubleNotEqualOrUnordered:
      feq_d(rd, cmp1, cmp2);
      NegateBool(rd, rd);
      return;
    case DoubleLessThan:
      flt_d(rd, cmp1, cmp2);
      return;
    case DoubleLessThanOrUnordered:
      fle_d(rd, cmp2, cmp1);
      NegateBool(rd, rd);
      return;
    case DoubleGreaterThanOrEqual:
      fle_d(rd, cmp2, cmp1);
      return;
    case DoubleGreaterThanOrEqualOrUnordered:
      flt_d(rd, cmp1, cmp2);
      NegateBool(rd, rd);
      return;
    case DoubleLessThanOrEqual:
      fle_d(rd, cmp1, cmp2);
      return;
    case DoubleLessThanOrEqualOrUnordered:
      flt_d(rd, cmp2, cmp1);
      NegateBool(rd, rd);
      return;
    case DoubleGreaterThan:
      flt_d(rd, cmp2, cmp1);
      return;
    case DoubleGreaterThanOrUnordered:
      fle_d(rd, cmp1, cmp2);
      NegateBool(rd, rd);
      return;
    case DoubleOrdered:
      CompareIsNotNanF64(rd, cmp1, cmp2);
      return;
    case DoubleUnordered:
      CompareIsNanF64(rd, cmp1, cmp2);
      return;
  }
}

void MacroAssemblerRiscv64Compat::movePtr(Register src, Register dest) {
  mv(dest, src);
}
void MacroAssemblerRiscv64Compat::movePtr(ImmWord imm, Register dest) {
  ma_li(dest, imm);
}

void MacroAssemblerRiscv64Compat::movePtr(ImmGCPtr imm, Register dest) {
  ma_li(dest, imm);
}

void MacroAssemblerRiscv64Compat::movePtr(ImmPtr imm, Register dest) {
  movePtr(ImmWord(uintptr_t(imm.value)), dest);
}
void MacroAssemblerRiscv64Compat::movePtr(wasm::SymbolicAddress imm,
                                          Register dest) {
  DEBUG_PRINTF("[ %s\n", __FUNCTION__);
  BlockTrampolinePoolScope block_trampoline_pool(this, 8);
  append(wasm::SymbolicAccess(CodeOffset(nextOffset().getOffset()), imm));
  ma_liPatchable(dest, ImmWord(-1), Li64);
  DEBUG_PRINTF("]\n");
}

bool MacroAssemblerRiscv64Compat::buildOOLFakeExitFrame(void* fakeReturnAddr) {
  asMasm().Push(FrameDescriptor(FrameType::IonJS));  // descriptor_
  asMasm().Push(ImmPtr(fakeReturnAddr));
  asMasm().Push(FramePointer);
  return true;
}

void MacroAssemblerRiscv64Compat::convertUInt32ToDouble(Register src,
                                                        FloatRegister dest) {
  fcvt_d_wu(dest, src);
}

void MacroAssemblerRiscv64Compat::convertUInt64ToDouble(Register src,
                                                        FloatRegister dest) {
  fcvt_d_lu(dest, src);
}

void MacroAssemblerRiscv64Compat::convertUInt32ToFloat32(Register src,
                                                         FloatRegister dest) {
  fcvt_s_wu(dest, src);
}

void MacroAssemblerRiscv64Compat::convertDoubleToFloat32(FloatRegister src,
                                                         FloatRegister dest) {
  fcvt_s_d(dest, src);
}

void MacroAssemblerRiscv64Compat::minMax32(Register lhs, Register rhs,
                                           Register dest, bool isMax) {
  if (rhs == dest) {
    std::swap(lhs, rhs);
  }

  if (HasZbbExtension()) {
    UseScratchRegisterScope temps(this);
    const Register rhsSExt = temps.Acquire();
    move32(rhs, rhsSExt);
    move32(lhs, dest);
    // Using signed max/min to match the (signed)
    // Assembler::GreaterThan/Assembler::LessThan below
    if (isMax) {
      max(dest, dest, rhsSExt);
    } else {
      min(dest, dest, rhsSExt);
    }
    return;
  }

  auto cond = isMax ? Assembler::GreaterThan : Assembler::LessThan;
  if (lhs != dest) {
    move32(lhs, dest);
  }
  asMasm().cmp32Move32(cond, rhs, lhs, rhs, dest);
}

void MacroAssemblerRiscv64Compat::minMax32(Register lhs, Imm32 rhs,
                                           Register dest, bool isMax) {
  if (HasZbbExtension()) {
    UseScratchRegisterScope temps(this);
    Register realRhs;
    if (rhs.value == 0) {
      realRhs = zero;
    } else {
      realRhs = temps.Acquire();
      ma_li(realRhs, rhs);
    }
    // Using signed max/min to match the (signed)
    // Assembler::GreaterThan/Assembler::LessThan below
    move32(lhs, dest);
    if (isMax) {
      max(dest, dest, realRhs);
    } else {
      min(dest, dest, realRhs);
    }
    return;
  }

  if (rhs.value == 0) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    if (isMax) {
      // dest = -(lhs > 0 ? 1 : 0) & lhs
      sgtz(scratch, lhs);
      neg(scratch, scratch);
      and_(dest, lhs, scratch);
    } else {
      // dest = (lhs >> 31) & lhs
      sraiw(scratch, lhs, 31);
      and_(dest, lhs, scratch);
    }
    return;
  }

  // Uses branches because "Zicond" extension isn't yet supported.

  auto cond =
      isMax ? Assembler::GreaterThanOrEqual : Assembler::LessThanOrEqual;
  if (lhs != dest) {
    move32(lhs, dest);
  }
  Label done;
  asMasm().branch32(cond, lhs, rhs, &done);
  move32(rhs, dest);
  bind(&done);
}

void MacroAssemblerRiscv64Compat::minMaxPtr(Register lhs, Register rhs,
                                            Register dest, bool isMax) {
  if (HasZbbExtension()) {
    // Using signed max/min to match the (signed)
    // Assembler::GreaterThan/Assembler::LessThan below
    if (isMax) {
      max(dest, lhs, rhs);
    } else {
      min(dest, lhs, rhs);
    }
    return;
  }

  if (rhs == dest) {
    std::swap(lhs, rhs);
  }

  auto cond = isMax ? Assembler::GreaterThan : Assembler::LessThan;
  if (lhs != dest) {
    movePtr(lhs, dest);
  }
  asMasm().cmpPtrMovePtr(cond, rhs, lhs, rhs, dest);
}

void MacroAssemblerRiscv64Compat::minMaxPtr(Register lhs, ImmWord rhs,
                                            Register dest, bool isMax) {
  if (HasZbbExtension()) {
    UseScratchRegisterScope temps(this);
    Register realRhs;
    if (rhs.value == 0) {
      realRhs = zero;
    } else {
      realRhs = temps.Acquire();
      ma_li(realRhs, rhs);
    }
    // Using signed max/min to match the (signed)
    // Assembler::GreaterThan/Assembler::LessThan below
    if (isMax) {
      max(dest, lhs, realRhs);
    } else {
      min(dest, lhs, realRhs);
    }
    return;
  }

  if (rhs.value == 0) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    if (isMax) {
      // dest = -(lhs > 0 ? 1 : 0) & lhs
      sgtz(scratch, lhs);
      neg(scratch, scratch);
      and_(dest, lhs, scratch);
    } else {
      // dest = (lhs >> 63) & lhs
      srai(scratch, lhs, 63);
      and_(dest, lhs, scratch);
    }
    return;
  }

  // Uses branches because "Zicond" extension isn't yet supported.

  auto cond =
      isMax ? Assembler::GreaterThanOrEqual : Assembler::LessThanOrEqual;
  if (lhs != dest) {
    movePtr(lhs, dest);
  }
  Label done;
  asMasm().branchPtr(cond, lhs, rhs, &done);
  movePtr(rhs, dest);
  bind(&done);
}

template <typename F>
void MacroAssemblerRiscv64::RoundHelper(FPURegister dst, FPURegister src,
                                        FPURegister fpu_scratch,
                                        FPURoundingMode frm) {
  BlockTrampolinePoolScope block_trampoline_pool(this, 20, 2);
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();

  MOZ_ASSERT((std::is_same<float, F>::value) ||
             (std::is_same<double, F>::value));
  // Need at least two FPRs, so check against dst == src == fpu_scratch
  MOZ_ASSERT(!(dst == src && dst == fpu_scratch));

  const int kFloatMantissaBits =
      sizeof(F) == 4 ? kFloat32MantissaBits : kFloat64MantissaBits;
  const int kFloatExponentBits =
      sizeof(F) == 4 ? kFloat32ExponentBits : kFloat64ExponentBits;
  const int kFloatExponentBias =
      sizeof(F) == 4 ? kFloat32ExponentBias : kFloat64ExponentBias;
  Label done;

  {
    UseScratchRegisterScope temps2(this);
    Register scratch = temps2.Acquire();
    // extract exponent value of the source floating-point to scratch
    if (std::is_same<F, double>::value) {
      fmv_x_d(scratch, src);
    } else {
      fmv_x_w(scratch, src);
    }
    ExtractBits(scratch2, scratch, kFloatMantissaBits, kFloatExponentBits);
  }

  // if src is NaN/+-Infinity/+-Zero or if the exponent is larger than # of bits
  // in mantissa, the result is the same as src, so move src to dest  (to avoid
  // generating another branch)
  if (dst != src) {
    if (std::is_same<F, double>::value) {
      fmv_d(dst, src);
    } else {
      fmv_s(dst, src);
    }
  }
  {
    Label not_NaN;
    UseScratchRegisterScope temps2(this);
    Register scratch = temps2.Acquire();
    // According to the wasm spec
    // (https://webassembly.github.io/spec/core/exec/numerics.html#aux-nans)
    // if input is canonical NaN, then output is canonical NaN, and if input is
    // any other NaN, then output is any NaN with most significant bit of
    // payload is 1. In RISC-V, feq_d will set scratch to 0 if src is a NaN. If
    // src is not a NaN, branch to the label and do nothing, but if it is,
    // fmin_d will set dst to the canonical NaN.
    if (std::is_same<F, double>::value) {
      feq_d(scratch, src, src);
      bnez(scratch, &not_NaN);
      fmin_d(dst, src, src);
    } else {
      feq_s(scratch, src, src);
      bnez(scratch, &not_NaN);
      fmin_s(dst, src, src);
    }
    bind(&not_NaN);
  }

  // If real exponent (i.e., scratch2 - kFloatExponentBias) is greater than
  // kFloat32MantissaBits, it means the floating-point value has no fractional
  // part, thus the input is already rounded, jump to done. Note that, NaN and
  // Infinity in floating-point representation sets maximal exponent value, so
  // they also satisfy (scratch2 - kFloatExponentBias >= kFloatMantissaBits),
  // and JS round semantics specify that rounding of NaN (Infinity) returns NaN
  // (Infinity), so NaN and Infinity are considered rounded value too.
  ma_branch(&done, GreaterThanOrEqual, scratch2,
            Operand(kFloatExponentBias + kFloatMantissaBits));

  // Actual rounding is needed along this path

  // old_src holds the original input, needed for the case of src == dst
  FPURegister old_src = src;
  if (src == dst) {
    MOZ_ASSERT(fpu_scratch != dst);
    fmv_d(fpu_scratch, src);
    old_src = fpu_scratch;
  }

  // Since only input whose real exponent value is less than kMantissaBits
  // (i.e., 23 or 52-bits) falls into this path, the value range of the input
  // falls into that of 23- or 53-bit integers. So we round the input to integer
  // values, then convert them back to floating-point.
  {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    if (std::is_same<F, double>::value) {
      fcvt_l_d(scratch, src, frm);
      fcvt_d_l(dst, scratch, frm);
    } else {
      fcvt_w_s(scratch, src, frm);
      fcvt_s_w(dst, scratch, frm);
    }
  }
  // A special handling is needed if the input is a very small positive/negative
  // number that rounds to zero. JS semantics requires that the rounded result
  // retains the sign of the input, so a very small positive (negative)
  // floating-point number should be rounded to positive (negative) 0.
  // Therefore, we use sign-bit injection to produce +/-0 correctly. Instead of
  // testing for zero w/ a branch, we just insert sign-bit for everyone on this
  // path (this is where old_src is needed)
  if (std::is_same<F, double>::value) {
    fsgnj_d(dst, dst, old_src);
  } else {
    fsgnj_s(dst, dst, old_src);
  }

  bind(&done);
}

template <typename CvtFunc>
void MacroAssemblerRiscv64::RoundFloatingPointToInteger(Register rd,
                                                        FPURegister fs,
                                                        Register result,
                                                        CvtFunc fcvt_generator,
                                                        bool Inexact) {
  // Save csr_fflags to scratch & clear exception flags
  if (result != Register::Invalid()) {
    BlockTrampolinePoolScope block_trampoline_pool(this, 6);
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    int exception_flags = kInvalidOperation;
    if (Inexact) exception_flags |= kInexact;
    csrrci(scratch, csr_fflags, exception_flags);

    // actual conversion instruction
    fcvt_generator(this, rd, fs);

    // check kInvalidOperation flag (out-of-range, NaN)
    // set result to 1 if normal, otherwise set result to 0 for abnormal
    frflags(result);
    andi(result, result, exception_flags);
    seqz(result, result);  // result <-- 1 (normal), result <-- 0 (abnormal)

    // restore csr_fflags
    csrw(csr_fflags, scratch);
  } else {
    // actual conversion instruction
    fcvt_generator(this, rd, fs);
  }
}

void MacroAssemblerRiscv64::Trunc_uw_d(Register rd, FPURegister fs,
                                       Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_wu_d(dst, src, RTZ);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Trunc_w_d(Register rd, FPURegister fs,
                                      Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_w_d(dst, src, RTZ);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Trunc_uw_s(Register rd, FPURegister fs,
                                       Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_wu_s(dst, src, RTZ);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Trunc_w_s(Register rd, FPURegister fs,
                                      Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_w_s(dst, src, RTZ);
      },
      Inexact);
}
void MacroAssemblerRiscv64::Trunc_ul_d(Register rd, FPURegister fs,
                                       Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_lu_d(dst, src, RTZ);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Trunc_l_d(Register rd, FPURegister fs,
                                      Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_l_d(dst, src, RTZ);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Trunc_ul_s(Register rd, FPURegister fs,
                                       Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_lu_s(dst, src, RTZ);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Trunc_l_s(Register rd, FPURegister fs,
                                      Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_l_s(dst, src, RTZ);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Floor_d_d(FPURegister dst, FPURegister src,
                                      FPURegister fpu_scratch) {
  RoundHelper<double>(dst, src, fpu_scratch, RDN);
}

void MacroAssemblerRiscv64::Ceil_d_d(FPURegister dst, FPURegister src,
                                     FPURegister fpu_scratch) {
  RoundHelper<double>(dst, src, fpu_scratch, RUP);
}

void MacroAssemblerRiscv64::Trunc_d_d(FPURegister dst, FPURegister src,
                                      FPURegister fpu_scratch) {
  RoundHelper<double>(dst, src, fpu_scratch, RTZ);
}

void MacroAssemblerRiscv64::Round_d_d(FPURegister dst, FPURegister src,
                                      FPURegister fpu_scratch) {
  RoundHelper<double>(dst, src, fpu_scratch, RNE);
}

void MacroAssemblerRiscv64::Floor_s_s(FPURegister dst, FPURegister src,
                                      FPURegister fpu_scratch) {
  RoundHelper<float>(dst, src, fpu_scratch, RDN);
}

void MacroAssemblerRiscv64::Ceil_s_s(FPURegister dst, FPURegister src,
                                     FPURegister fpu_scratch) {
  RoundHelper<float>(dst, src, fpu_scratch, RUP);
}

void MacroAssemblerRiscv64::Trunc_s_s(FPURegister dst, FPURegister src,
                                      FPURegister fpu_scratch) {
  RoundHelper<float>(dst, src, fpu_scratch, RTZ);
}

void MacroAssemblerRiscv64::Round_s_s(FPURegister dst, FPURegister src,
                                      FPURegister fpu_scratch) {
  RoundHelper<float>(dst, src, fpu_scratch, RNE);
}

void MacroAssemblerRiscv64::Round_w_s(Register rd, FPURegister fs,
                                      Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_w_s(dst, src, RNE);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Round_w_d(Register rd, FPURegister fs,
                                      Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_w_d(dst, src, RNE);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Ceil_w_s(Register rd, FPURegister fs,
                                     Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_w_s(dst, src, RUP);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Ceil_l_d(Register rd, FPURegister fs,
                                     Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_l_d(dst, src, RUP);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Ceil_l_s(Register rd, FPURegister fs,
                                     Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_l_s(dst, src, RUP);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Ceil_w_d(Register rd, FPURegister fs,
                                     Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_w_d(dst, src, RUP);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Floor_w_s(Register rd, FPURegister fs,
                                      Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_w_s(dst, src, RDN);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Floor_w_d(Register rd, FPURegister fs,
                                      Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_w_d(dst, src, RDN);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Floor_l_s(Register rd, FPURegister fs,
                                      Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_l_s(dst, src, RDN);
      },
      Inexact);
}

void MacroAssemblerRiscv64::Floor_l_d(Register rd, FPURegister fs,
                                      Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_l_d(dst, src, RDN);
      },
      Inexact);
}

void MacroAssemblerRiscv64::RoundMaxMag_l_s(Register rd, FPURegister fs,
                                            Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_l_s(dst, src, RMM);
      },
      Inexact);
}

void MacroAssemblerRiscv64::RoundMaxMag_l_d(Register rd, FPURegister fs,
                                            Register result, bool Inexact) {
  RoundFloatingPointToInteger(
      rd, fs, result,
      [](MacroAssemblerRiscv64* masm, Register dst, FPURegister src) {
        masm->fcvt_l_d(dst, src, RMM);
      },
      Inexact);
}

// Checks whether a double is representable as a 32-bit integer. If so, the
// integer is written to the output register. Otherwise, a bailout is taken to
// the given snapshot. This function overwrites the scratch float register.
void MacroAssemblerRiscv64Compat::convertDoubleToInt32(FloatRegister src,
                                                       Register dest,
                                                       Label* fail,
                                                       bool negativeZeroCheck) {
  if (negativeZeroCheck) {
    fclass_d(dest, src);
    ma_b(dest, Imm32(kNegativeZero), fail, Equal);
  }
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  Trunc_w_d(dest, src, scratch, true);
  ma_b(scratch, Imm32(0), fail, Equal);
}

void MacroAssemblerRiscv64Compat::convertDoubleToPtr(FloatRegister src,
                                                     Register dest, Label* fail,
                                                     bool negativeZeroCheck) {
  if (negativeZeroCheck) {
    fclass_d(dest, src);
    ma_b(dest, Imm32(kNegativeZero), fail, Equal);
  }
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  Trunc_l_d(dest, src, scratch, true);
  ma_b(scratch, Imm32(0), fail, Equal);
}

// Checks whether a float32 is representable as a 32-bit integer. If so, the
// integer is written to the output register. Otherwise, a bailout is taken to
// the given snapshot. This function overwrites the scratch float register.
void MacroAssemblerRiscv64Compat::convertFloat32ToInt32(
    FloatRegister src, Register dest, Label* fail, bool negativeZeroCheck) {
  if (negativeZeroCheck) {
    fclass_d(dest, src);
    ma_b(dest, Imm32(kNegativeZero), fail, Equal);
  }
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  Trunc_w_s(dest, src, scratch, true);
  ma_b(scratch, Imm32(0), fail, Equal);
}

void MacroAssemblerRiscv64Compat::convertFloat32ToDouble(FloatRegister src,
                                                         FloatRegister dest) {
  fcvt_d_s(dest, src);
}

void MacroAssemblerRiscv64Compat::convertInt32ToFloat32(Register src,
                                                        FloatRegister dest) {
  fcvt_s_w(dest, src);
}

void MacroAssemblerRiscv64Compat::convertInt32ToFloat32(const Address& src,
                                                        FloatRegister dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  load32(src, scratch);
  fcvt_s_w(dest, scratch);
}

void MacroAssemblerRiscv64Compat::truncateFloat32ModUint32(FloatRegister src,
                                                           Register dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();

  // Convert scalar to signed 64-bit fixed-point, rounding toward zero.
  // In the case of overflow or NaN, the output is saturated.
  // In the case of -0, the output is zero.
  Trunc_l_s(dest, src);

  // Unsigned subtraction of INT64_MAX returns 1 resp. 0 for INT64_{MIN,MAX}.
  ma_li(scratch, Imm64(0x7fff'ffff'ffff'ffff));
  ma_sub64(scratch, dest, scratch);

  // If scratch u< 2, then scratch = 0; else scratch = -1.
  ma_sltu(scratch, scratch, Imm32(2));
  ma_add32(scratch, scratch, Imm32(-1));

  // Clear |dest| if the truncation result was saturated.
  ma_and(dest, dest, scratch);

  // Clear upper 32 bits.
  SignExtendWord(dest, dest);
}

// Memory.
FaultingCodeOffset MacroAssemblerRiscv64::ma_loadDouble(FloatRegister dest,
                                                        Address address) {
  UseScratchRegisterScope temps(this);
  int16_t encodedOffset;
  Register base;

  if (!is_int12(address.offset)) {
    Register scratch = temps.Acquire();
    ma_li(scratch, Imm32(address.offset));
    add(scratch, address.base, scratch);
    base = scratch;
    encodedOffset = 0;
  } else {
    encodedOffset = address.offset;
    base = address.base;
  }
  FaultingCodeOffset fco = FaultingCodeOffset(currentOffset());
  fld(dest, base, encodedOffset);
  return fco;
}

FaultingCodeOffset MacroAssemblerRiscv64::ma_loadFloat(FloatRegister dest,
                                                       Address address) {
  UseScratchRegisterScope temps(this);
  int16_t encodedOffset;
  Register base;

  if (!is_int12(address.offset)) {
    Register scratch = temps.Acquire();
    ma_li(scratch, Imm32(address.offset));
    add(scratch, address.base, scratch);
    base = scratch;
    encodedOffset = 0;
  } else {
    encodedOffset = address.offset;
    base = address.base;
  }
  FaultingCodeOffset fco = FaultingCodeOffset(currentOffset());
  flw(dest, base, encodedOffset);
  return fco;
}

FaultingCodeOffset MacroAssemblerRiscv64::ma_load(
    Register dest, Address address, LoadStoreSize size,
    LoadStoreExtension extension) {
  UseScratchRegisterScope temps(this);
  int16_t encodedOffset;
  Register base;

  if (!is_int12(address.offset)) {
    Register scratch = temps.Acquire();
    ma_li(scratch, Imm32(address.offset));
    add(scratch, address.base, scratch);
    base = scratch;
    encodedOffset = 0;
  } else {
    encodedOffset = address.offset;
    base = address.base;
  }
  FaultingCodeOffset fco = FaultingCodeOffset(currentOffset());
  switch (size) {
    case SizeByte:
      if (ZeroExtend == extension) {
        lbu(dest, base, encodedOffset);
      } else {
        lb(dest, base, encodedOffset);
      }
      break;
    case SizeHalfWord:
      if (ZeroExtend == extension) {
        lhu(dest, base, encodedOffset);
      } else {
        lh(dest, base, encodedOffset);
      }
      break;
    case SizeWord:
      if (ZeroExtend == extension) {
        lwu(dest, base, encodedOffset);
      } else {
        lw(dest, base, encodedOffset);
      }
      break;
    case SizeDouble:
      ld(dest, base, encodedOffset);
      break;
    default:
      MOZ_CRASH("Invalid argument for ma_load");
  }
  return fco;
}

FaultingCodeOffset MacroAssemblerRiscv64::ma_store(
    Register data, const BaseIndex& dest, LoadStoreSize size,
    LoadStoreExtension extension) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  computeScaledAddress(dest, scratch2);
  return ma_store(data, Address(scratch2, dest.offset), size, extension);
}

FaultingCodeOffset MacroAssemblerRiscv64::ma_store(
    Imm32 imm, const BaseIndex& dest, LoadStoreSize size,
    LoadStoreExtension extension) {
  UseScratchRegisterScope temps(this);

  Register address = temps.Acquire();
  computeScaledAddress(dest, address);

  Register scratch = temps.Acquire();
  ma_li(scratch, imm);

  return ma_store(scratch, Address(address, dest.offset), size, extension);
}

FaultingCodeOffset MacroAssemblerRiscv64::ma_store(
    Imm32 imm, Address address, LoadStoreSize size,
    LoadStoreExtension extension) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  ma_li(scratch, imm);
  return ma_store(scratch, address, size, extension);
}

FaultingCodeOffset MacroAssemblerRiscv64::ma_store(
    Register data, Address address, LoadStoreSize size,
    LoadStoreExtension extension) {
  UseScratchRegisterScope temps(this);

  int16_t encodedOffset;
  Register base;

  if (!is_int12(address.offset)) {
    Register scratch = temps.Acquire();
    ma_li(scratch, Imm32(address.offset));
    add(scratch, address.base, scratch);
    base = scratch;
    encodedOffset = 0;
  } else {
    encodedOffset = address.offset;
    base = address.base;
  }
  FaultingCodeOffset fco = FaultingCodeOffset(currentOffset());
  switch (size) {
    case SizeByte:
      sb(data, base, encodedOffset);
      break;
    case SizeHalfWord:
      sh(data, base, encodedOffset);
      break;
    case SizeWord:
      sw(data, base, encodedOffset);
      break;
    case SizeDouble:
      sd(data, base, encodedOffset);
      break;
    default:
      MOZ_CRASH("Invalid argument for ma_store");
  }
  return fco;
}

// Memory.
void MacroAssemblerRiscv64::ma_storeDouble(FloatRegister dest,
                                           Address address) {
  UseScratchRegisterScope temps(this);
  int16_t encodedOffset;
  Register base;

  if (!is_int12(address.offset)) {
    Register scratch = temps.Acquire();
    ma_li(scratch, Imm32(address.offset));
    add(scratch, address.base, scratch);
    base = scratch;
    encodedOffset = 0;
  } else {
    encodedOffset = address.offset;
    base = address.base;
  }
  fsd(dest, base, encodedOffset);
}

void MacroAssemblerRiscv64::ma_storeFloat(FloatRegister dest, Address address) {
  UseScratchRegisterScope temps(this);
  int16_t encodedOffset;
  Register base;

  if (!is_int12(address.offset)) {
    Register scratch = temps.Acquire();
    ma_li(scratch, Imm32(address.offset));
    add(scratch, address.base, scratch);
    base = scratch;
    encodedOffset = 0;
  } else {
    encodedOffset = address.offset;
    base = address.base;
  }
  fsw(dest, base, encodedOffset);
}

void MacroAssemblerRiscv64::computeScaledAddress(const BaseIndex& address,
                                                 Register dest) {
  Register base = address.base;
  Register index = address.index;
  int32_t shift = Imm32::ShiftOf(address.scale).value;
  UseScratchRegisterScope temps(this);
  if (shift && base == zero) {
    MOZ_ASSERT(shift <= 4);
    slli(dest, index, shift);
  } else if (shift) {
    MOZ_ASSERT(shift <= 4);
    if (HasZbaExtension()) {
      switch (shift) {
        case 1:
          sh1add(dest, index, base);
          return;
        case 2:
          sh2add(dest, index, base);
          return;
        case 3:
          sh3add(dest, index, base);
          return;
        default:
          break;
      }
    }
    Register tmp = dest == base ? temps.Acquire() : dest;
    slli(tmp, index, shift);
    add(dest, base, tmp);
  } else {
    add(dest, base, index);
  }
}

void MacroAssemblerRiscv64::computeScaledAddress32(const BaseIndex& address,
                                                   Register dest) {
  Register base = address.base;
  Register index = address.index;
  int32_t shift = Imm32::ShiftOf(address.scale).value;
  UseScratchRegisterScope temps(this);
  if (shift && base == zero) {
    MOZ_ASSERT(shift <= 4);
    slliw(dest, index, shift);
  } else if (shift) {
    MOZ_ASSERT(shift <= 4);
    if (HasZbaExtension()) {
      switch (shift) {
        case 1:
          sh1add_uw(dest, index, base);
          return;
        case 2:
          sh2add_uw(dest, index, base);
          return;
        case 3:
          sh3add_uw(dest, index, base);
          return;
        default:
          break;
      }
    }
    Register tmp = dest == base ? temps.Acquire() : dest;
    slliw(tmp, index, shift);
    addw(dest, base, tmp);
  } else {
    addw(dest, base, index);
  }
}

void MacroAssemblerRiscv64Compat::wasmLoadI64Impl(
    const wasm::MemoryAccessDesc& access, Register memoryBase, Register ptr,
    Register ptrScratch, Register64 output, Register tmp) {
  access.assertOffsetInGuardPages();
  uint32_t offset = access.offset32();
  MOZ_ASSERT_IF(offset, ptrScratch != InvalidReg);

  // Maybe add the offset.
  if (offset) {
    asMasm().addPtr(ImmWord(offset), ptrScratch);
    ptr = ptrScratch;
  }

  asMasm().memoryBarrierBefore(access.sync());
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  FaultingCodeOffset fco;
  switch (access.type()) {
    case Scalar::Int8:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      lb(output.reg, scratch, 0);
      break;
    case Scalar::Uint8:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      lbu(output.reg, scratch, 0);
      break;
    case Scalar::Int16:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      lh(output.reg, scratch, 0);
      break;
    case Scalar::Uint16:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      lhu(output.reg, scratch, 0);
      break;
    case Scalar::Int32:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      lw(output.reg, scratch, 0);
      break;
    case Scalar::Uint32:
      // TODO(riscv): Why need zero-extension here?
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      lwu(output.reg, scratch, 0);
      break;
    case Scalar::Int64:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      ld(output.reg, scratch, 0);
      break;
    default:
      MOZ_CRASH("unexpected array type");
  }

  append(access, js::wasm::TrapMachineInsnForLoad(access.byteSize()), fco);
  asMasm().memoryBarrierAfter(access.sync());
}

void MacroAssemblerRiscv64Compat::wasmStoreI64Impl(
    const wasm::MemoryAccessDesc& access, Register64 value, Register memoryBase,
    Register ptr, Register ptrScratch, Register tmp) {
  access.assertOffsetInGuardPages();
  uint32_t offset = access.offset32();
  MOZ_ASSERT_IF(offset, ptrScratch != InvalidReg);

  // Maybe add the offset.
  if (offset) {
    asMasm().addPtr(ImmWord(offset), ptrScratch);
    ptr = ptrScratch;
  }

  asMasm().memoryBarrierBefore(access.sync());
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  FaultingCodeOffset fco;
  switch (access.type()) {
    case Scalar::Int8:
    case Scalar::Uint8:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      sb(value.reg, scratch, 0);
      break;
    case Scalar::Int16:
    case Scalar::Uint16:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      sh(value.reg, scratch, 0);
      break;
    case Scalar::Int32:
    case Scalar::Uint32:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      sw(value.reg, scratch, 0);
      break;
    case Scalar::Int64:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      sd(value.reg, scratch, 0);
      break;
    default:
      MOZ_CRASH("unexpected array type");
  }

  append(access, js::wasm::TrapMachineInsnForLoad(access.byteSize()), fco);
  asMasm().memoryBarrierAfter(access.sync());
}

void MacroAssemblerRiscv64Compat::profilerEnterFrame(Register framePtr,
                                                     Register scratch) {
  asMasm().loadJSContext(scratch);
  loadPtr(Address(scratch, offsetof(JSContext, profilingActivation_)), scratch);
  storePtr(framePtr,
           Address(scratch, JitActivation::offsetOfLastProfilingFrame()));
  storePtr(ImmPtr(nullptr),
           Address(scratch, JitActivation::offsetOfLastProfilingCallSite()));
}

void MacroAssemblerRiscv64Compat::profilerExitFrame() {
  jump(asMasm().runtime()->jitRuntime()->getProfilerExitFrameTail());
}

void MacroAssemblerRiscv64Compat::move32(Imm32 imm, Register dest) {
  ma_li(dest, imm);
}

void MacroAssemblerRiscv64Compat::move32(Register src, Register dest) {
  SignExtendWord(dest, src);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::load8ZeroExtend(
    const Address& address, Register dest) {
  return ma_load(dest, address, SizeByte, ZeroExtend);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::load8ZeroExtend(
    const BaseIndex& src, Register dest) {
  return ma_load(dest, src, SizeByte, ZeroExtend);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::load8SignExtend(
    const Address& address, Register dest) {
  return ma_load(dest, address, SizeByte, SignExtend);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::load8SignExtend(
    const BaseIndex& src, Register dest) {
  return ma_load(dest, src, SizeByte, SignExtend);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::load16ZeroExtend(
    const Address& address, Register dest) {
  return ma_load(dest, address, SizeHalfWord, ZeroExtend);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::load16ZeroExtend(
    const BaseIndex& src, Register dest) {
  return ma_load(dest, src, SizeHalfWord, ZeroExtend);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::load16SignExtend(
    const Address& address, Register dest) {
  return ma_load(dest, address, SizeHalfWord, SignExtend);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::load16SignExtend(
    const BaseIndex& src, Register dest) {
  return ma_load(dest, src, SizeHalfWord, SignExtend);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::load32(const Address& address,
                                                       Register dest) {
  return ma_load(dest, address, SizeWord);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::load32(const BaseIndex& address,
                                                       Register dest) {
  return ma_load(dest, address, SizeWord);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::load32(AbsoluteAddress address,
                                                       Register dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  movePtr(ImmPtr(address.addr), scratch);
  return load32(Address(scratch, 0), dest);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::load32(
    wasm::SymbolicAddress address, Register dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  movePtr(address, scratch);
  return load32(Address(scratch, 0), dest);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::loadPtr(const Address& address,
                                                        Register dest) {
  return ma_load(dest, address, SizeDouble);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::loadPtr(const BaseIndex& src,
                                                        Register dest) {
  return ma_load(dest, src, SizeDouble);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::loadPtr(AbsoluteAddress address,
                                                        Register dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  movePtr(ImmPtr(address.addr), scratch);
  return loadPtr(Address(scratch, 0), dest);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::loadPtr(
    wasm::SymbolicAddress address, Register dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  movePtr(address, scratch);
  return loadPtr(Address(scratch, 0), dest);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::loadPrivate(
    const Address& address, Register dest) {
  return loadPtr(address, dest);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store8(Imm32 imm,
                                                       const Address& address) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  ma_li(scratch, imm);
  return ma_store(scratch, address, SizeByte);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store8(Register src,
                                                       const Address& address) {
  return ma_store(src, address, SizeByte);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store8(Imm32 imm,
                                                       const BaseIndex& dest) {
  return ma_store(imm, dest, SizeByte);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store8(Register src,
                                                       const BaseIndex& dest) {
  return ma_store(src, dest, SizeByte);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store16(
    Imm32 imm, const Address& address) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  ma_li(scratch, imm);
  return ma_store(scratch, address, SizeHalfWord);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store16(
    Register src, const Address& address) {
  return ma_store(src, address, SizeHalfWord);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store16(Imm32 imm,
                                                        const BaseIndex& dest) {
  return ma_store(imm, dest, SizeHalfWord);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store16(
    Register src, const BaseIndex& address) {
  return ma_store(src, address, SizeHalfWord);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store32(
    Register src, AbsoluteAddress address) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  movePtr(ImmPtr(address.addr), scratch);
  return store32(src, Address(scratch, 0));
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store32(
    Register src, const Address& address) {
  return ma_store(src, address, SizeWord);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store32(
    Imm32 src, const Address& address) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  move32(src, scratch);
  return ma_store(scratch, address, SizeWord);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store32(Imm32 imm,
                                                        const BaseIndex& dest) {
  return ma_store(imm, dest, SizeWord);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::store32(Register src,
                                                        const BaseIndex& dest) {
  return ma_store(src, dest, SizeWord);
}

template <typename T>
FaultingCodeOffset MacroAssemblerRiscv64Compat::storePtr(ImmWord imm,
                                                         T address) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  ma_li(scratch, imm);
  return ma_store(scratch, address, SizeDouble);
}

template FaultingCodeOffset MacroAssemblerRiscv64Compat::storePtr<Address>(
    ImmWord imm, Address address);
template FaultingCodeOffset MacroAssemblerRiscv64Compat::storePtr<BaseIndex>(
    ImmWord imm, BaseIndex address);

template <typename T>
FaultingCodeOffset MacroAssemblerRiscv64Compat::storePtr(ImmPtr imm,
                                                         T address) {
  return storePtr(ImmWord(uintptr_t(imm.value)), address);
}

template FaultingCodeOffset MacroAssemblerRiscv64Compat::storePtr<Address>(
    ImmPtr imm, Address address);
template FaultingCodeOffset MacroAssemblerRiscv64Compat::storePtr<BaseIndex>(
    ImmPtr imm, BaseIndex address);

template <typename T>
FaultingCodeOffset MacroAssemblerRiscv64Compat::storePtr(ImmGCPtr imm,
                                                         T address) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  movePtr(imm, scratch);
  return storePtr(scratch, address);
}

template FaultingCodeOffset MacroAssemblerRiscv64Compat::storePtr<Address>(
    ImmGCPtr imm, Address address);
template FaultingCodeOffset MacroAssemblerRiscv64Compat::storePtr<BaseIndex>(
    ImmGCPtr imm, BaseIndex address);

FaultingCodeOffset MacroAssemblerRiscv64Compat::storePtr(
    Register src, const Address& address) {
  return ma_store(src, address, SizeDouble);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::storePtr(
    Register src, const BaseIndex& address) {
  return ma_store(src, address, SizeDouble);
}

FaultingCodeOffset MacroAssemblerRiscv64Compat::storePtr(Register src,
                                                         AbsoluteAddress dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  movePtr(ImmPtr(dest.addr), scratch);
  return storePtr(src, Address(scratch, 0));
}

void MacroAssemblerRiscv64Compat::testNullSet(Condition cond,
                                              const ValueOperand& value,
                                              Register dest) {
  MOZ_ASSERT(cond == Equal || cond == NotEqual);
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  splitTag(value, scratch);
  ma_cmp_set(dest, scratch, ImmTag(JSVAL_TAG_NULL), cond);
}

void MacroAssemblerRiscv64Compat::testObjectSet(Condition cond,
                                                const ValueOperand& value,
                                                Register dest) {
  MOZ_ASSERT(cond == Equal || cond == NotEqual);
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  splitTag(value, scratch);
  ma_cmp_set(dest, scratch, ImmTag(JSVAL_TAG_OBJECT), cond);
}

void MacroAssemblerRiscv64Compat::testUndefinedSet(Condition cond,
                                                   const ValueOperand& value,
                                                   Register dest) {
  MOZ_ASSERT(cond == Equal || cond == NotEqual);
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  splitTag(value, scratch);
  ma_cmp_set(dest, scratch, ImmTag(JSVAL_TAG_UNDEFINED), cond);
}

void MacroAssemblerRiscv64Compat::unboxInt32(const ValueOperand& operand,
                                             Register dest) {
  SignExtendWord(dest, operand.valueReg());
}

void MacroAssemblerRiscv64Compat::unboxInt32(Register src, Register dest) {
  SignExtendWord(dest, src);
}

void MacroAssemblerRiscv64Compat::unboxInt32(const Address& src,
                                             Register dest) {
  load32(Address(src.base, src.offset), dest);
}

void MacroAssemblerRiscv64Compat::unboxInt32(const BaseIndex& src,
                                             Register dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  computeScaledAddress(src, scratch);
  load32(Address(scratch, src.offset), dest);
}

void MacroAssemblerRiscv64Compat::unboxBoolean(const ValueOperand& operand,
                                               Register dest) {
  ExtractBits(dest, operand.valueReg(), 0, 32);
}

void MacroAssemblerRiscv64Compat::unboxBoolean(Register src, Register dest) {
  ExtractBits(dest, src, 0, 32);
}

void MacroAssemblerRiscv64Compat::unboxBoolean(const Address& src,
                                               Register dest) {
  ma_load(dest, Address(src.base, src.offset), SizeWord, ZeroExtend);
}

void MacroAssemblerRiscv64Compat::unboxBoolean(const BaseIndex& src,
                                               Register dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  computeScaledAddress(src, scratch);
  ma_load(dest, Address(scratch, src.offset), SizeWord, ZeroExtend);
}

void MacroAssemblerRiscv64Compat::unboxDouble(const ValueOperand& operand,
                                              FloatRegister dest) {
  fmv_d_x(dest, operand.valueReg());
}

void MacroAssemblerRiscv64Compat::unboxDouble(const Address& src,
                                              FloatRegister dest) {
  ma_loadDouble(dest, Address(src.base, src.offset));
}

void MacroAssemblerRiscv64Compat::unboxDouble(const BaseIndex& src,
                                              FloatRegister dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  loadPtr(src, scratch);
  unboxDouble(ValueOperand(scratch), dest);
}

void MacroAssemblerRiscv64Compat::unboxString(const ValueOperand& operand,
                                              Register dest) {
  unboxNonDouble(operand, dest, JSVAL_TYPE_STRING);
}

void MacroAssemblerRiscv64Compat::unboxString(Register src, Register dest) {
  unboxNonDouble(src, dest, JSVAL_TYPE_STRING);
}

void MacroAssemblerRiscv64Compat::unboxString(const Address& src,
                                              Register dest) {
  unboxNonDouble(src, dest, JSVAL_TYPE_STRING);
}

void MacroAssemblerRiscv64Compat::unboxSymbol(const ValueOperand& operand,
                                              Register dest) {
  unboxNonDouble(operand, dest, JSVAL_TYPE_SYMBOL);
}

void MacroAssemblerRiscv64Compat::unboxSymbol(Register src, Register dest) {
  unboxNonDouble(src, dest, JSVAL_TYPE_SYMBOL);
}

void MacroAssemblerRiscv64Compat::unboxSymbol(const Address& src,
                                              Register dest) {
  unboxNonDouble(src, dest, JSVAL_TYPE_SYMBOL);
}

void MacroAssemblerRiscv64Compat::unboxBigInt(const ValueOperand& operand,
                                              Register dest) {
  unboxNonDouble(operand, dest, JSVAL_TYPE_BIGINT);
}

void MacroAssemblerRiscv64Compat::unboxBigInt(Register src, Register dest) {
  unboxNonDouble(src, dest, JSVAL_TYPE_BIGINT);
}

void MacroAssemblerRiscv64Compat::unboxBigInt(const Address& src,
                                              Register dest) {
  unboxNonDouble(src, dest, JSVAL_TYPE_BIGINT);
}

void MacroAssemblerRiscv64Compat::unboxObject(const ValueOperand& src,
                                              Register dest) {
  unboxNonDouble(src, dest, JSVAL_TYPE_OBJECT);
}

void MacroAssemblerRiscv64Compat::unboxObject(Register src, Register dest) {
  unboxNonDouble(src, dest, JSVAL_TYPE_OBJECT);
}

void MacroAssemblerRiscv64Compat::unboxObject(const Address& src,
                                              Register dest) {
  unboxNonDouble(src, dest, JSVAL_TYPE_OBJECT);
}

void MacroAssemblerRiscv64Compat::unboxValue(const ValueOperand& src,
                                             AnyRegister dest,
                                             JSValueType type) {
  if (dest.isFloat()) {
    Label notInt32, end;
    asMasm().branchTestInt32(Assembler::NotEqual, src, &notInt32);
    convertInt32ToDouble(src.valueReg(), dest.fpu());
    ma_branch(&end);
    bind(&notInt32);
    unboxDouble(src, dest.fpu());
    bind(&end);
  } else {
    unboxNonDouble(src, dest.gpr(), type);
  }
}

void MacroAssemblerRiscv64Compat::boxDouble(FloatRegister src,
                                            const ValueOperand& dest,
                                            FloatRegister) {
  fmv_x_d(dest.valueReg(), src);
}

#ifdef DEBUG
static constexpr int32_t PayloadSize(JSValueType type) {
  switch (type) {
    case JSVAL_TYPE_UNDEFINED:
    case JSVAL_TYPE_NULL:
      return 0;
    case JSVAL_TYPE_BOOLEAN:
      return 1;
    case JSVAL_TYPE_INT32:
    case JSVAL_TYPE_MAGIC:
      return 32;
    case JSVAL_TYPE_STRING:
    case JSVAL_TYPE_SYMBOL:
    case JSVAL_TYPE_PRIVATE_GCTHING:
    case JSVAL_TYPE_BIGINT:
    case JSVAL_TYPE_OBJECT:
      return JSVAL_TAG_SHIFT;
    case JSVAL_TYPE_DOUBLE:
    case JSVAL_TYPE_UNKNOWN:
      break;
  }
  MOZ_CRASH("bad value type");
}
#endif

static void AssertValidPayload(MacroAssemblerRiscv64Compat& masm,
                               JSValueType type, Register payload,
                               Register scratch) {
#ifdef DEBUG
  if (type == JSVAL_TYPE_INT32) {
    // Ensure the payload is a properly sign-extended int32.
    Label signExtended;
    masm.SignExtendWord(scratch, payload);
    masm.ma_b(payload, scratch, &signExtended, Assembler::Equal, ShortJump);
    masm.breakpoint();
    masm.bind(&signExtended);
  } else {
    // All bits above the payload must be zeroed.
    Label zeroed;
    masm.srli(scratch, payload, PayloadSize(type));
    masm.ma_b(scratch, Imm32(0), &zeroed, Assembler::Equal, ShortJump);
    masm.breakpoint();
    masm.bind(&zeroed);
  }
#endif
}

void MacroAssemblerRiscv64Compat::boxValue(JSValueType type, Register src,
                                           Register dest) {
  MOZ_ASSERT(type != JSVAL_TYPE_UNDEFINED && type != JSVAL_TYPE_NULL);
  MOZ_ASSERT(src != dest);

  AssertValidPayload(*this, type, src, dest);

  switch (type) {
    case JSVAL_TYPE_INT32: {
      // Loading the shifted tag requires only two instructions.
      ma_li(dest, ImmShiftedTag(type));

      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();

      // Insert low 32 bits as payload, removing all high bits from |src|.
      ZeroExtendWord(scratch, src);
      or_(dest, dest, scratch);
      return;
    }
    case JSVAL_TYPE_BOOLEAN:
    case JSVAL_TYPE_MAGIC:
    case JSVAL_TYPE_STRING:
    case JSVAL_TYPE_SYMBOL:
    case JSVAL_TYPE_PRIVATE_GCTHING:
    case JSVAL_TYPE_BIGINT:
    case JSVAL_TYPE_OBJECT: {
      // Loading the shifted tag requires only two instructions.
      ma_li(dest, ImmShiftedTag(type));

      // Insert payload.
      or_(dest, dest, src);
      return;
    }
    case JSVAL_TYPE_DOUBLE:
    case JSVAL_TYPE_UNDEFINED:
    case JSVAL_TYPE_NULL:
    case JSVAL_TYPE_UNKNOWN:
      break;
  }
  MOZ_CRASH("bad value type");
}

void MacroAssemblerRiscv64Compat::boxValue(Register type, Register src,
                                           Register dest) {
  MOZ_ASSERT(src != dest);

#ifdef DEBUG
  Label done, isNullOrUndefined, isBoolean, isInt32OrMagic, isPointerSized;

  asMasm().branch32(Assembler::Equal, type, Imm32(JSVAL_TYPE_NULL),
                    &isNullOrUndefined);
  asMasm().branch32(Assembler::Equal, type, Imm32(JSVAL_TYPE_UNDEFINED),
                    &isNullOrUndefined);
  asMasm().branch32(Assembler::Equal, type, Imm32(JSVAL_TYPE_BOOLEAN),
                    &isBoolean);
  asMasm().branch32(Assembler::Equal, type, Imm32(JSVAL_TYPE_INT32),
                    &isInt32OrMagic);
  asMasm().branch32(Assembler::Equal, type, Imm32(JSVAL_TYPE_MAGIC),
                    &isInt32OrMagic);
  // GCThing types aren't currently supported, because SignExtendWord truncates
  // payloads above UINT32_MAX.
  breakpoint();
  {
    bind(&isNullOrUndefined);

    // Ensure no payload for null and undefined.
    ma_b(src, src, &done, Assembler::Zero, ShortJump);
    breakpoint();
  }
  {
    bind(&isBoolean);

    // Ensure boolean values are either 0 or 1.
    ma_b(src, Imm32(1), &done, Assembler::BelowOrEqual, ShortJump);
    breakpoint();
  }
  {
    bind(&isInt32OrMagic);

    // Ensure |src| is sign-extended.
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    SignExtendWord(scratch, src);
    ma_b(src, scratch, &done, Assembler::Equal, ShortJump);
    breakpoint();
  }
  bind(&done);
#endif

  // JSVAL_TAG_MAX_DOUBLE can't be directly encoded in a single `ori`
  // instruction. Sign-extend the tag, taking the bits into account which will
  // later be shifted out, into a shorter immediate which fits into `ori`.
  constexpr int64_t tag =
      int64_t(uint64_t(JSVAL_TAG_MAX_DOUBLE) << JSVAL_TAG_SHIFT) >>
      JSVAL_TAG_SHIFT;
  static_assert(is_int12(tag), "ori requires int12 immediate");

  ori(dest, type, tag);
  slli(dest, dest, JSVAL_TAG_SHIFT);

  // Insert low 32 bits as payload, removing all high bits from |src|.
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  ZeroExtendWord(scratch, src);

  ma_or(dest, dest, scratch);
}

void MacroAssemblerRiscv64Compat::loadConstantFloat32(float f,
                                                      FloatRegister dest) {
  ma_lis(dest, f);
}

void MacroAssemblerRiscv64Compat::loadInt32OrDouble(const Address& src,
                                                    FloatRegister dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();

  Label notInt32, end;
  {
    // Inlined |branchTestInt32| to use a short-jump.
    Register tag = extractTag(src, scratch);
    ma_b(tag, ImmTag(JSVAL_TAG_INT32), &notInt32, Assembler::NotEqual,
         ShortJump);
  }
  {
    // If it's an int, convert it to double.
    unboxInt32(src, scratch);
    convertInt32ToDouble(scratch, dest);
    ma_branch(&end);
  }
  bind(&notInt32);
  {
    // Not an int, just load as double.
    unboxDouble(src, dest);
  }
  bind(&end);
}

void MacroAssemblerRiscv64Compat::loadInt32OrDouble(const BaseIndex& addr,
                                                    FloatRegister dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();

  computeScaledAddress(addr, scratch);
  loadInt32OrDouble(Address(scratch, addr.offset), dest);
}

void MacroAssemblerRiscv64Compat::loadConstantDouble(double dp,
                                                     FloatRegister dest) {
  ma_lid(dest, dp);
}

Register MacroAssemblerRiscv64Compat::extractObject(const Address& address,
                                                    Register scratch) {
  loadPtr(address, scratch);
  ExtractBits(scratch, scratch, 0, JSVAL_TAG_SHIFT);
  return scratch;
}

Register MacroAssemblerRiscv64Compat::extractTag(const Address& address,
                                                 Register scratch) {
  loadPtr(address, scratch);
  ExtractBits(scratch, scratch, JSVAL_TAG_SHIFT, 64 - JSVAL_TAG_SHIFT);
  return scratch;
}

Register MacroAssemblerRiscv64Compat::extractTag(const BaseIndex& address,
                                                 Register scratch) {
  computeScaledAddress(address, scratch);
  return extractTag(Address(scratch, address.offset), scratch);
}

/////////////////////////////////////////////////////////////////
// X86/X64-common/ARM/LoongArch interface.
/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
// X86/X64-common/ARM/MIPS interface.
/////////////////////////////////////////////////////////////////
void MacroAssemblerRiscv64Compat::storeValue(ValueOperand val,
                                             const BaseIndex& dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  computeScaledAddress(dest, scratch);
  storeValue(val, Address(scratch, dest.offset));
}

void MacroAssemblerRiscv64Compat::storeValue(JSValueType type, Register reg,
                                             BaseIndex dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();

  computeScaledAddress(dest, scratch);

  int32_t offset = dest.offset;
  if (!is_int12(offset)) {
    UseScratchRegisterScope temps(this);
    Register scratch2 = temps.Acquire();
    ma_li(scratch2, Imm32(offset));
    add(scratch, scratch, scratch2);
    offset = 0;
  }

  storeValue(type, reg, Address(scratch, offset));
}

void MacroAssemblerRiscv64Compat::storeValue(ValueOperand val,
                                             const Address& dest) {
  storePtr(val.valueReg(), Address(dest.base, dest.offset));
}

void MacroAssemblerRiscv64Compat::storeValue(JSValueType type, Register reg,
                                             Address dest) {
  if (type == JSVAL_TYPE_INT32 || type == JSVAL_TYPE_BOOLEAN) {
#ifdef DEBUG
    {
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();

      AssertValidPayload(*this, type, reg, scratch);
    }
#endif

    store32(reg, dest);
    JSValueShiftedTag tag = (JSValueShiftedTag)JSVAL_TYPE_TO_SHIFTED_TAG(type);
    store32(Imm64(tag).hi(), Address(dest.base, dest.offset + 4));
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    MOZ_ASSERT(dest.base != scratch);
    boxValue(type, reg, scratch);
    storePtr(scratch, Address(dest.base, dest.offset));
  }
}

void MacroAssemblerRiscv64Compat::storeValue(const Value& val, Address dest) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  if (val.isGCThing()) {
    writeDataRelocation(val);
    movWithPatch(ImmWord(val.asRawBits()), scratch2);
  } else {
    ma_li(scratch2, ImmWord(val.asRawBits()));
  }
  storePtr(scratch2, Address(dest.base, dest.offset));
}

void MacroAssemblerRiscv64Compat::storeValue(const Value& val, BaseIndex dest) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  computeScaledAddress(dest, scratch);

  int32_t offset = dest.offset;
  if (!is_int12(offset)) {
    Register scratch2 = temps.Acquire();
    ma_li(scratch2, Imm32(offset));
    add(scratch, scratch, scratch2);
    offset = 0;
  }
  storeValue(val, Address(scratch, offset));
}

void MacroAssemblerRiscv64Compat::loadValue(const BaseIndex& addr,
                                            ValueOperand val) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  computeScaledAddress(addr, scratch);
  loadValue(Address(scratch, addr.offset), val);
}

void MacroAssemblerRiscv64Compat::loadValue(Address src, ValueOperand val) {
  loadPtr(Address(src.base, src.offset), val.valueReg());
}

void MacroAssemblerRiscv64Compat::tagValue(JSValueType type, Register payload,
                                           ValueOperand dest) {
  MOZ_ASSERT(type != JSVAL_TYPE_UNDEFINED && type != JSVAL_TYPE_NULL);

  JitSpew(JitSpew_Codegen, "[ tagValue");

  if (payload == dest.valueReg()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    MOZ_ASSERT(dest.valueReg() != scratch);

    AssertValidPayload(*this, type, payload, scratch);

    switch (type) {
      case JSVAL_TYPE_INT32: {
        // Loading the shifted tag requires only two instructions.
        ma_li(scratch, ImmShiftedTag(type));

        // Insert low 32 bits as payload, removing all high bits from |payload|.
        ZeroExtendWord(payload, payload);
        or_(dest.valueReg(), payload, scratch);
        break;
      }
      case JSVAL_TYPE_BOOLEAN:
      case JSVAL_TYPE_MAGIC:
      case JSVAL_TYPE_STRING:
      case JSVAL_TYPE_SYMBOL:
      case JSVAL_TYPE_PRIVATE_GCTHING:
      case JSVAL_TYPE_BIGINT:
      case JSVAL_TYPE_OBJECT: {
        // Loading the shifted tag requires only two instructions.
        ma_li(scratch, ImmShiftedTag(type));

        // Insert payload.
        or_(dest.valueReg(), payload, scratch);
        break;
      }
      case JSVAL_TYPE_DOUBLE:
      case JSVAL_TYPE_UNDEFINED:
      case JSVAL_TYPE_NULL:
      case JSVAL_TYPE_UNKNOWN:
        MOZ_CRASH("bad value type");
    }
  } else {
    boxNonDouble(type, payload, dest);
  }

  JitSpew(JitSpew_Codegen, "]");
}

void MacroAssemblerRiscv64Compat::pushValue(ValueOperand val) {
  // Allocate stack slots for Value. One for each.
  asMasm().subPtr(Imm32(sizeof(Value)), StackPointer);
  // Store Value
  storeValue(val, Address(StackPointer, 0));
}

void MacroAssemblerRiscv64Compat::pushValue(const Address& addr) {
  // Load value before allocate stack, addr.base may be is sp.
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  loadPtr(Address(addr.base, addr.offset), scratch);
  ma_sub64(StackPointer, StackPointer, Imm32(sizeof(Value)));
  storePtr(scratch, Address(StackPointer, 0));
}

void MacroAssemblerRiscv64Compat::popValue(ValueOperand val) {
  ld(val.valueReg(), StackPointer, 0);
  ma_add64(StackPointer, StackPointer, Imm32(sizeof(Value)));
}

void MacroAssemblerRiscv64Compat::breakpoint(uint32_t value) { break_(value); }

void MacroAssemblerRiscv64Compat::handleFailureWithHandlerTail(
    Label* profilerExitTail, Label* bailoutTail,
    uint32_t* returnValueCheckOffset) {
  // Reserve space for exception information.
  int size = (sizeof(ResumeFromException) + ABIStackAlignment) &
             ~(ABIStackAlignment - 1);
  asMasm().subPtr(Imm32(size), StackPointer);
  mv(a0, StackPointer);  // Use a0 since it is a first function argument

  // Call the handler.
  using Fn = void (*)(ResumeFromException* rfe);
  asMasm().setupUnalignedABICall(a1);
  asMasm().passABIArg(a0);
  asMasm().callWithABI<Fn, HandleException>(
      ABIType::General, CheckUnsafeCallWithABI::DontCheckHasExitFrame);

  *returnValueCheckOffset = currentOffset();

  Label entryFrame;
  Label catch_;
  Label finally;
  Label returnBaseline;
  Label returnIon;
  Label bailout;
  Label wasmInterpEntry;
  Label wasmCatch;

  // Already clobbered a0, so use it...
  load32(Address(StackPointer, ResumeFromException::offsetOfKind()), a0);
  asMasm().branch32(Assembler::Equal, a0,
                    Imm32(ExceptionResumeKind::EntryFrame), &entryFrame);
  asMasm().branch32(Assembler::Equal, a0, Imm32(ExceptionResumeKind::Catch),
                    &catch_);
  asMasm().branch32(Assembler::Equal, a0, Imm32(ExceptionResumeKind::Finally),
                    &finally);
  asMasm().branch32(Assembler::Equal, a0,
                    Imm32(ExceptionResumeKind::ForcedReturnBaseline),
                    &returnBaseline);
  asMasm().branch32(Assembler::Equal, a0,
                    Imm32(ExceptionResumeKind::ForcedReturnIon), &returnIon);
  asMasm().branch32(Assembler::Equal, a0, Imm32(ExceptionResumeKind::Bailout),
                    &bailout);
  asMasm().branch32(Assembler::Equal, a0,
                    Imm32(ExceptionResumeKind::WasmInterpEntry),
                    &wasmInterpEntry);
  asMasm().branch32(Assembler::Equal, a0, Imm32(ExceptionResumeKind::WasmCatch),
                    &wasmCatch);

  breakpoint();  // Invalid kind.

  // No exception handler. Load the error value, restore state and return from
  // the entry frame.
  bind(&entryFrame);
  asMasm().moveValue(MagicValue(JS_ION_ERROR), JSReturnOperand);
  loadPtr(Address(StackPointer, ResumeFromException::offsetOfFramePointer()),
          FramePointer);
  loadPtr(Address(StackPointer, ResumeFromException::offsetOfStackPointer()),
          StackPointer);

  // We're going to be returning by the ion calling convention
  ma_pop(ra);
  jump(ra);
  nop();

  // If we found a catch handler, this must be a baseline frame. Restore
  // state and jump to the catch block.
  bind(&catch_);
  loadPtr(Address(StackPointer, ResumeFromException::offsetOfTarget()), a0);
  loadPtr(Address(StackPointer, ResumeFromException::offsetOfFramePointer()),
          FramePointer);
  loadPtr(Address(StackPointer, ResumeFromException::offsetOfStackPointer()),
          StackPointer);
  jump(a0);

  // If we found a finally block, this must be a baseline frame. Push three
  // values expected by the finally block: the exception, the exception stack,
  // and BooleanValue(true).
  bind(&finally);
  ValueOperand exception = ValueOperand(a1);
  loadValue(Address(sp, ResumeFromException::offsetOfException()), exception);

  ValueOperand exceptionStack = ValueOperand(a2);
  loadValue(Address(sp, ResumeFromException::offsetOfExceptionStack()),
            exceptionStack);

  loadPtr(Address(sp, ResumeFromException::offsetOfTarget()), a0);
  loadPtr(Address(sp, ResumeFromException::offsetOfFramePointer()),
          FramePointer);
  loadPtr(Address(sp, ResumeFromException::offsetOfStackPointer()), sp);

  pushValue(exception);
  pushValue(exceptionStack);
  pushValue(BooleanValue(true));
  jump(a0);

  // Return BaselineFrame->returnValue() to the caller.
  // Used in debug mode and for GeneratorReturn.
  Label profilingInstrumentation;
  bind(&returnBaseline);
  loadPtr(Address(StackPointer, ResumeFromException::offsetOfFramePointer()),
          FramePointer);
  loadPtr(Address(StackPointer, ResumeFromException::offsetOfStackPointer()),
          StackPointer);
  loadValue(Address(FramePointer, BaselineFrame::reverseOffsetOfReturnValue()),
            JSReturnOperand);
  jump(&profilingInstrumentation);

  // Return the given value to the caller.
  bind(&returnIon);
  loadValue(Address(StackPointer, ResumeFromException::offsetOfException()),
            JSReturnOperand);
  loadPtr(Address(StackPointer, ResumeFromException::offsetOfFramePointer()),
          FramePointer);
  loadPtr(Address(StackPointer, ResumeFromException::offsetOfStackPointer()),
          StackPointer);

  // If profiling is enabled, then update the lastProfilingFrame to refer to
  // caller frame before returning. This code is shared by ForcedReturnIon
  // and ForcedReturnBaseline.
  bind(&profilingInstrumentation);
  {
    Label skipProfilingInstrumentation;
    // Test if profiler enabled.
    AbsoluteAddress addressOfEnabled(
        asMasm().runtime()->geckoProfiler().addressOfEnabled());
    asMasm().branch32(Assembler::Equal, addressOfEnabled, Imm32(0),
                      &skipProfilingInstrumentation);
    jump(profilerExitTail);
    bind(&skipProfilingInstrumentation);
  }

  mv(StackPointer, FramePointer);
  pop(FramePointer);
  ret();

  // If we are bailing out to baseline to handle an exception, jump to
  // the bailout tail stub. Load 1 (true) in ReturnReg to indicate success.
  bind(&bailout);
  loadPtr(Address(sp, ResumeFromException::offsetOfBailoutInfo()), a2);
  loadPtr(Address(StackPointer, ResumeFromException::offsetOfStackPointer()),
          StackPointer);
  ma_li(ReturnReg, Imm32(1));
  jump(bailoutTail);

  // Reset SP and FP; SP is pointing to the unwound return address to the wasm
  // interpreter entry, so we can just ret().
  bind(&wasmInterpEntry);
  loadPtr(Address(StackPointer, ResumeFromException::offsetOfFramePointer()),
          FramePointer);
  loadPtr(Address(StackPointer, ResumeFromException::offsetOfStackPointer()),
          StackPointer);
  ma_li(InstanceReg, ImmWord(wasm::InterpFailInstanceReg));
  ret();

  // Found a wasm catch handler, restore state and jump to it.
  bind(&wasmCatch);
  wasm::GenerateJumpToCatchHandler(asMasm(), sp, a1, a2);
}

CodeOffset MacroAssemblerRiscv64Compat::toggledJump(Label* label) {
  CodeOffset ret(nextOffset().getOffset());
  BranchShort(label);
  return ret;
}

CodeOffset MacroAssemblerRiscv64Compat::toggledCall(JitCode* target,
                                                    bool enabled) {
  DEBUG_PRINTF("\ttoggledCall\n");
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  BlockTrampolinePoolScope block_trampoline_pool(this, 8);
  BufferOffset bo = nextOffset();
  CodeOffset offset(bo.getOffset());
  addPendingJump(bo, ImmPtr(target->raw()), RelocationKind::JITCODE);
  ma_liPatchable(scratch, ImmPtr(target->raw()));
  if (enabled) {
    jalr(scratch);
  } else {
    nop();
  }
  MOZ_ASSERT_IF(!oom(), nextOffset().getOffset() - offset.offset() ==
                            ToggledCallSize(nullptr));
  return offset;
}

void MacroAssembler::subFromStackPtr(Imm32 imm32) {
  if (imm32.value) {
    asMasm().subPtr(imm32, StackPointer);
  }
}

void MacroAssembler::clampDoubleToUint8(FloatRegister input, Register output) {
  Round_w_d(output, input);
  Clear_if_nan_d(output, input);
  clampIntToUint8(output);
}

//{{{ check_macroassembler_style
// ===============================================================
// MacroAssembler high-level usage.
bool MacroAssembler::convertUInt64ToDoubleNeedsTemp() { return false; }
CodeOffset MacroAssembler::call(Label* label) { return BranchAndLink(label); }
CodeOffset MacroAssembler::call(Register reg) {
  jalr(reg, 0);
  return CodeOffset(currentOffset());
}
CodeOffset MacroAssembler::call(wasm::SymbolicAddress target) {
  UseScratchRegisterScope temps(this);
  temps.Exclude(GeneralRegisterSet(1 << CallReg.code()));
  movePtr(target, CallReg);
  return call(CallReg);
}
CodeOffset MacroAssembler::farJumpWithPatch() {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  Register scratch2 = temps.Acquire();
  // Allocate space which will be patched by patchFarJump().
  CodeOffset farJump(nextInstrOffset(5).getOffset());
  auipc(scratch, 0);
  lw(scratch2, scratch, 4 * sizeof(Instr));
  add(scratch, scratch, scratch2);
  jr(scratch, 0);
  spew(".space 32bit initValue 0xffff ffff");
  emit(UINT32_MAX);
  return farJump;
}
CodeOffset MacroAssembler::moveNearAddressWithPatch(Register dest) {
  return movWithPatch(ImmPtr(nullptr), dest);
}
CodeOffset MacroAssembler::nopPatchableToCall() {
  BlockTrampolinePoolScope block_trampoline_pool(this, 7);
  // riscv64
  nop();  // lui(rd, (int32_t)high_20);
  nop();  // addi(rd, rd, low_12);  // 31 bits in rd.
  nop();  // slli(rd, rd, 11);      // Space for next 11 bis
  nop();  // ori(rd, rd, b11);      // 11 bits are put in. 42 bit in rd
  nop();  // slli(rd, rd, 6);       // Space for next 6 bits
  nop();  // ori(rd, rd, a6);       // 6 bits are put in. 48 bis in rd
  nop();  // jirl
  return CodeOffset(currentOffset());
}
FaultingCodeOffset MacroAssembler::wasmTrapInstruction() {
  BlockTrampolinePoolScope block_trampoline_pool(this, 2);
  FaultingCodeOffset fco = FaultingCodeOffset(currentOffset());
  illegal_trap(kWasmTrapCode);
  ebreak();
  return fco;
}
size_t MacroAssembler::PushRegsInMaskSizeInBytes(LiveRegisterSet set) {
  return set.gprs().size() * sizeof(intptr_t) + set.fpus().getPushSizeInBytes();
}

template <typename T>
void MacroAssembler::branchValueIsNurseryCellImpl(Condition cond,
                                                  const T& value, Register temp,
                                                  Label* label) {
  MOZ_ASSERT(cond == Assembler::Equal || cond == Assembler::NotEqual);
  Label done;
  branchTestGCThing(Assembler::NotEqual, value,
                    cond == Assembler::Equal ? &done : label);

  // temp may be InvalidReg, use scratch2 instead.
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();

  getGCThingValueChunk(value, scratch2);
  loadPtr(Address(scratch2, gc::ChunkStoreBufferOffset), scratch2);
  branchPtr(InvertCondition(cond), scratch2, ImmWord(0), label);

  bind(&done);
}

template <typename T>
void MacroAssembler::storeUnboxedValue(const ConstantOrRegister& value,
                                       MIRType valueType, const T& dest) {
  MOZ_ASSERT(valueType < MIRType::Value);

  if (valueType == MIRType::Double) {
    boxDouble(value.reg().typedReg().fpu(), dest);
    return;
  }

  if (value.constant()) {
    storeValue(value.value(), dest);
  } else {
    storeValue(ValueTypeFromMIRType(valueType), value.reg().typedReg().gpr(),
               dest);
  }
}

template void MacroAssembler::storeUnboxedValue(const ConstantOrRegister& value,
                                                MIRType valueType,
                                                const Address& dest);
template void MacroAssembler::storeUnboxedValue(
    const ConstantOrRegister& value, MIRType valueType,
    const BaseObjectElementIndex& dest);

// ===============================================================
// Jit Frames.

uint32_t MacroAssembler::pushFakeReturnAddress(Register scratch) {
  CodeLabel cl;

  ma_li(scratch, &cl);
  Push(scratch);
  bind(&cl);
  uint32_t retAddr = currentOffset();

  addCodeLabel(cl);
  return retAddr;
}

//===============================
// AtomicOp

template <typename T>
static void AtomicExchange(MacroAssembler& masm,
                           const wasm::MemoryAccessDesc* access,
                           Scalar::Type type, Synchronization sync,
                           const T& mem, Register value, Register valueTemp,
                           Register offsetTemp, Register maskTemp,
                           Register output) {
  bool signExtend = Scalar::isSignedIntType(type);
  unsigned nbytes = Scalar::byteSize(type);

  UseScratchRegisterScope temps(&masm);

  switch (nbytes) {
    case 1:
    case 2:
      break;
    case 4:
      MOZ_ASSERT(valueTemp == InvalidReg);
      MOZ_ASSERT(offsetTemp == InvalidReg);
      MOZ_ASSERT(maskTemp == InvalidReg);
      break;
    default:
      MOZ_CRASH();
  }

  Label again;

  Register scratch = temps.Acquire();
  masm.computeEffectiveAddress(mem, scratch);

  Register scratch2 = temps.Acquire();

  if (nbytes == 4) {
    masm.memoryBarrierBefore(sync);
    masm.bind(&again);
    BlockTrampolinePoolScope block_trampoline_pool(&masm,
                                                   /* 1 + 1 + 1 + 4 + 1 = */ 8,
                                                   1);
    if (access) {
      masm.append(*access, wasm::TrapMachineInsn::Atomic,
                  FaultingCodeOffset(masm.currentOffset()));
    }

    masm.lr_w(true, true, output, scratch);
    masm.or_(scratch2, value, zero);
    masm.sc_w(true, true, scratch2, scratch, scratch2);
    masm.ma_b(scratch2, Register(scratch2), &again, Assembler::NonZero,
              ShortJump);

    masm.memoryBarrierAfter(sync);

    return;
  }

  masm.andi(offsetTemp, scratch, 3);
  masm.subPtr(offsetTemp, scratch);
  masm.slliw(offsetTemp, offsetTemp, 3);
  masm.ma_li(maskTemp, Imm32(UINT32_MAX >> ((4 - nbytes) * 8)));
  masm.sllw(maskTemp, maskTemp, offsetTemp);
  masm.not_(maskTemp, maskTemp);
  switch (nbytes) {
    case 1:
      masm.andi(valueTemp, value, 0xff);
      break;
    case 2:
      masm.ma_and(valueTemp, value, Imm32(0xffff));
      break;
  }
  masm.sllw(valueTemp, valueTemp, offsetTemp);

  masm.memoryBarrierBefore(sync);

  masm.bind(&again);

  BlockTrampolinePoolScope block_trampoline_pool(
      &masm, /* 1 + 1 + 1 + 1 + 4 + 1 + 2 + 1 = */ 12, 1);
  if (access) {
    masm.append(*access, wasm::TrapMachineInsn::Atomic,
                FaultingCodeOffset(masm.currentOffset()));
  }

  masm.lr_w(true, true, output, scratch);
  masm.and_(scratch2, output, maskTemp);
  masm.or_(scratch2, scratch2, valueTemp);

  masm.sc_w(true, true, scratch2, scratch, scratch2);

  masm.ma_b(scratch2, Register(scratch2), &again, Assembler::NonZero,
            ShortJump);

  masm.srlw(output, output, offsetTemp);

  switch (nbytes) {
    case 1:
      if (signExtend) {
        masm.SignExtendByte(output, output);
      } else {
        masm.andi(output, output, 0xff);
      }
      break;
    case 2:
      if (signExtend) {
        masm.SignExtendShort(output, output);
      } else {
        masm.ma_and(output, Imm32(0xffff));
      }
      break;
  }

  masm.memoryBarrierAfter(sync);
}

template <typename T>
static void AtomicExchange64(MacroAssembler& masm,
                             const wasm::MemoryAccessDesc* access,
                             Synchronization sync, const T& mem,
                             Register64 value, Register64 output) {
  MOZ_ASSERT(value != output);
  UseScratchRegisterScope temps(&masm);
  Register scratch = temps.Acquire();
  Register scratch2 = temps.Acquire();
  masm.computeEffectiveAddress(mem, scratch2);

  Label tryAgain;

  masm.memoryBarrierBefore(sync);

  masm.bind(&tryAgain);
  BlockTrampolinePoolScope block_trampoline_pool(&masm,
                                                 /* 1 + 1 + 1 + 4 + 1 = */ 8,
                                                 1);
  if (access) {
    masm.append(*access, js::wasm::TrapMachineInsn::Load64,
                FaultingCodeOffset(masm.currentOffset()));
  }

  masm.lr_d(true, true, output.reg, scratch2);
  masm.movePtr(value.reg, scratch);
  masm.sc_d(true, true, scratch, scratch2, scratch);
  masm.ma_b(scratch, scratch, &tryAgain, Assembler::NonZero, ShortJump);

  masm.memoryBarrierAfter(sync);
}

template <typename T>
static void AtomicFetchOp64(MacroAssembler& masm,
                            const wasm::MemoryAccessDesc* access,
                            Synchronization sync, AtomicOp op, Register64 value,
                            const T& mem, Register64 temp, Register64 output) {
  MOZ_ASSERT(value != output);
  MOZ_ASSERT(value != temp);
  UseScratchRegisterScope temps(&masm);
  Register scratch2 = temps.Acquire();
  masm.computeEffectiveAddress(mem, scratch2);

  Label tryAgain;

  masm.memoryBarrierBefore(sync);

  masm.bind(&tryAgain);
  BlockTrampolinePoolScope block_trampoline_pool(&masm,
                                                 /* 1 + 1 + 1 + 4 + 1 = */ 8,
                                                 1);
  if (access) {
    masm.append(*access, js::wasm::TrapMachineInsn::Load64,
                FaultingCodeOffset(masm.currentOffset()));
  }

  masm.lr_d(true, true, output.reg, scratch2);

  switch (op) {
    case AtomicOp::Add:
      masm.add(temp.reg, output.reg, value.reg);
      break;
    case AtomicOp::Sub:
      masm.sub(temp.reg, output.reg, value.reg);
      break;
    case AtomicOp::And:
      masm.and_(temp.reg, output.reg, value.reg);
      break;
    case AtomicOp::Or:
      masm.or_(temp.reg, output.reg, value.reg);
      break;
    case AtomicOp::Xor:
      masm.xor_(temp.reg, output.reg, value.reg);
      break;
    default:
      MOZ_CRASH();
  }

  masm.sc_d(true, true, temp.reg, scratch2, temp.reg);
  masm.ma_b(temp.reg, temp.reg, &tryAgain, Assembler::NonZero, ShortJump);

  masm.memoryBarrierAfter(sync);
}

template <typename T>
static void AtomicEffectOp(MacroAssembler& masm,
                           const wasm::MemoryAccessDesc* access,
                           Scalar::Type type, Synchronization sync, AtomicOp op,
                           const T& mem, Register value, Register valueTemp,
                           Register offsetTemp, Register maskTemp) {
  UseScratchRegisterScope temps(&masm);
  unsigned nbytes = Scalar::byteSize(type);

  switch (nbytes) {
    case 1:
    case 2:
      break;
    case 4:
      MOZ_ASSERT(valueTemp == InvalidReg);
      MOZ_ASSERT(offsetTemp == InvalidReg);
      MOZ_ASSERT(maskTemp == InvalidReg);
      break;
    default:
      MOZ_CRASH();
  }

  Label again;

  Register scratch = temps.Acquire();
  masm.computeEffectiveAddress(mem, scratch);

  Register scratch2 = temps.Acquire();

  if (nbytes == 4) {
    masm.memoryBarrierBefore(sync);
    masm.bind(&again);

    if (access) {
      masm.append(*access, wasm::TrapMachineInsn::Atomic,
                  FaultingCodeOffset(masm.currentOffset()));
    }

    masm.lr_w(true, true, scratch2, scratch);

    switch (op) {
      case AtomicOp::Add:
        masm.addw(scratch2, scratch2, value);
        break;
      case AtomicOp::Sub:
        masm.subw(scratch2, scratch2, value);
        break;
      case AtomicOp::And:
        masm.and_(scratch2, scratch2, value);
        break;
      case AtomicOp::Or:
        masm.or_(scratch2, scratch2, value);
        break;
      case AtomicOp::Xor:
        masm.xor_(scratch2, scratch2, value);
        break;
      default:
        MOZ_CRASH();
    }

    masm.sc_w(true, true, scratch2, scratch, scratch2);
    masm.ma_b(scratch2, Register(scratch2), &again, Assembler::NonZero,
              ShortJump);

    masm.memoryBarrierAfter(sync);

    return;
  }

  masm.andi(offsetTemp, scratch, 3);
  masm.subPtr(offsetTemp, scratch);
  masm.slliw(offsetTemp, offsetTemp, 3);
  masm.ma_li(maskTemp, Imm32(UINT32_MAX >> ((4 - nbytes) * 8)));
  masm.sllw(maskTemp, maskTemp, offsetTemp);
  masm.not_(maskTemp, maskTemp);

  masm.memoryBarrierBefore(sync);

  masm.bind(&again);

  if (access) {
    masm.append(*access, wasm::TrapMachineInsn::Atomic,
                FaultingCodeOffset(masm.currentOffset()));
  }

  masm.lr_w(true, true, scratch2, scratch);
  masm.srlw(valueTemp, scratch2, offsetTemp);

  switch (op) {
    case AtomicOp::Add:
      masm.addw(valueTemp, valueTemp, value);
      break;
    case AtomicOp::Sub:
      masm.subw(valueTemp, valueTemp, value);
      break;
    case AtomicOp::And:
      masm.and_(valueTemp, valueTemp, value);
      break;
    case AtomicOp::Or:
      masm.or_(valueTemp, valueTemp, value);
      break;
    case AtomicOp::Xor:
      masm.xor_(valueTemp, valueTemp, value);
      break;
    default:
      MOZ_CRASH();
  }

  switch (nbytes) {
    case 1:
      masm.andi(valueTemp, valueTemp, 0xff);
      break;
    case 2:
      masm.ma_and(valueTemp, valueTemp, Imm32(0xffff));
      break;
  }

  masm.sllw(valueTemp, valueTemp, offsetTemp);

  masm.and_(scratch2, scratch2, maskTemp);
  masm.or_(scratch2, scratch2, valueTemp);

  masm.sc_w(true, true, scratch2, scratch, scratch2);

  masm.ma_b(scratch2, Register(scratch2), &again, Assembler::NonZero,
            ShortJump);

  masm.memoryBarrierAfter(sync);
}

template <typename T>
static void AtomicFetchOp(MacroAssembler& masm,
                          const wasm::MemoryAccessDesc* access,
                          Scalar::Type type, Synchronization sync, AtomicOp op,
                          const T& mem, Register value, Register valueTemp,
                          Register offsetTemp, Register maskTemp,
                          Register output) {
  UseScratchRegisterScope temps(&masm);
  bool signExtend = Scalar::isSignedIntType(type);
  unsigned nbytes = Scalar::byteSize(type);

  switch (nbytes) {
    case 1:
    case 2:
      break;
    case 4:
      MOZ_ASSERT(valueTemp == InvalidReg);
      MOZ_ASSERT(offsetTemp == InvalidReg);
      MOZ_ASSERT(maskTemp == InvalidReg);
      break;
    default:
      MOZ_CRASH();
  }

  Label again;

  Register scratch = temps.Acquire();
  masm.computeEffectiveAddress(mem, scratch);

  Register scratch2 = temps.Acquire();

  if (nbytes == 4) {
    masm.memoryBarrierBefore(sync);
    masm.bind(&again);

    if (access) {
      masm.append(*access, wasm::TrapMachineInsn::Atomic,
                  FaultingCodeOffset(masm.currentOffset()));
    }

    masm.lr_w(true, true, output, scratch);

    switch (op) {
      case AtomicOp::Add:
        masm.addw(scratch2, output, value);
        break;
      case AtomicOp::Sub:
        masm.subw(scratch2, output, value);
        break;
      case AtomicOp::And:
        masm.and_(scratch2, output, value);
        break;
      case AtomicOp::Or:
        masm.or_(scratch2, output, value);
        break;
      case AtomicOp::Xor:
        masm.xor_(scratch2, output, value);
        break;
      default:
        MOZ_CRASH();
    }

    masm.sc_w(true, true, scratch2, scratch, scratch2);
    masm.ma_b(scratch2, Register(scratch2), &again, Assembler::NonZero,
              ShortJump);

    masm.memoryBarrierAfter(sync);

    return;
  }

  masm.andi(offsetTemp, scratch, 3);
  masm.subPtr(offsetTemp, scratch);
  masm.slliw(offsetTemp, offsetTemp, 3);
  masm.ma_li(maskTemp, Imm32(UINT32_MAX >> ((4 - nbytes) * 8)));
  masm.sllw(maskTemp, maskTemp, offsetTemp);
  masm.not_(maskTemp, maskTemp);

  masm.memoryBarrierBefore(sync);

  masm.bind(&again);

  if (access) {
    masm.append(*access, wasm::TrapMachineInsn::Atomic,
                FaultingCodeOffset(masm.currentOffset()));
  }

  masm.lr_w(true, true, scratch2, scratch);
  masm.srlw(output, scratch2, offsetTemp);

  switch (op) {
    case AtomicOp::Add:
      masm.addw(valueTemp, output, value);
      break;
    case AtomicOp::Sub:
      masm.subw(valueTemp, output, value);
      break;
    case AtomicOp::And:
      masm.and_(valueTemp, output, value);
      break;
    case AtomicOp::Or:
      masm.or_(valueTemp, output, value);
      break;
    case AtomicOp::Xor:
      masm.xor_(valueTemp, output, value);
      break;
    default:
      MOZ_CRASH();
  }

  switch (nbytes) {
    case 1:
      masm.andi(valueTemp, valueTemp, 0xff);
      break;
    case 2:
      masm.ma_and(valueTemp, Imm32(0xffff));
      break;
  }

  masm.sllw(valueTemp, valueTemp, offsetTemp);

  masm.and_(scratch2, scratch2, maskTemp);
  masm.or_(scratch2, scratch2, valueTemp);

  masm.sc_w(true, true, scratch2, scratch, scratch2);

  masm.ma_b(scratch2, Register(scratch2), &again, Assembler::NonZero,
            ShortJump);

  switch (nbytes) {
    case 1:
      if (signExtend) {
        masm.SignExtendByte(output, output);
      } else {
        masm.andi(output, output, 0xff);
      }
      break;
    case 2:
      if (signExtend) {
        masm.SignExtendShort(output, output);
      } else {
        masm.ma_and(output, Imm32(0xffff));
      }
      break;
  }

  masm.memoryBarrierAfter(sync);
}

// ========================================================================
// JS atomic operations.

template <typename T>
static void CompareExchangeJS(MacroAssembler& masm, Scalar::Type arrayType,
                              Synchronization sync, const T& mem,
                              Register oldval, Register newval,
                              Register valueTemp, Register offsetTemp,
                              Register maskTemp, Register temp,
                              AnyRegister output) {
  if (arrayType == Scalar::Uint32) {
    masm.compareExchange(arrayType, sync, mem, oldval, newval, valueTemp,
                         offsetTemp, maskTemp, temp);
    masm.convertUInt32ToDouble(temp, output.fpu());
  } else {
    masm.compareExchange(arrayType, sync, mem, oldval, newval, valueTemp,
                         offsetTemp, maskTemp, output.gpr());
  }
}

template <typename T>
static void AtomicExchangeJS(MacroAssembler& masm, Scalar::Type arrayType,
                             Synchronization sync, const T& mem, Register value,
                             Register valueTemp, Register offsetTemp,
                             Register maskTemp, Register temp,
                             AnyRegister output) {
  if (arrayType == Scalar::Uint32) {
    masm.atomicExchange(arrayType, sync, mem, value, valueTemp, offsetTemp,
                        maskTemp, temp);
    masm.convertUInt32ToDouble(temp, output.fpu());
  } else {
    masm.atomicExchange(arrayType, sync, mem, value, valueTemp, offsetTemp,
                        maskTemp, output.gpr());
  }
}

template <typename T>
static void AtomicFetchOpJS(MacroAssembler& masm, Scalar::Type arrayType,
                            Synchronization sync, AtomicOp op, Register value,
                            const T& mem, Register valueTemp,
                            Register offsetTemp, Register maskTemp,
                            Register temp, AnyRegister output) {
  if (arrayType == Scalar::Uint32) {
    masm.atomicFetchOp(arrayType, sync, op, value, mem, valueTemp, offsetTemp,
                       maskTemp, temp);
    masm.convertUInt32ToDouble(temp, output.fpu());
  } else {
    masm.atomicFetchOp(arrayType, sync, op, value, mem, valueTemp, offsetTemp,
                       maskTemp, output.gpr());
  }
}

void MacroAssembler::atomicEffectOpJS(Scalar::Type arrayType,
                                      Synchronization sync, AtomicOp op,
                                      Register value, const BaseIndex& mem,
                                      Register valueTemp, Register offsetTemp,
                                      Register maskTemp) {
  AtomicEffectOp(*this, nullptr, arrayType, sync, op, mem, value, valueTemp,
                 offsetTemp, maskTemp);
}

void MacroAssembler::atomicEffectOpJS(Scalar::Type arrayType,
                                      Synchronization sync, AtomicOp op,
                                      Register value, const Address& mem,
                                      Register valueTemp, Register offsetTemp,
                                      Register maskTemp) {
  AtomicEffectOp(*this, nullptr, arrayType, sync, op, mem, value, valueTemp,
                 offsetTemp, maskTemp);
}
void MacroAssembler::atomicExchange64(Synchronization sync, const Address& mem,
                                      Register64 value, Register64 output) {
  AtomicExchange64(*this, nullptr, sync, mem, value, output);
}

void MacroAssembler::atomicExchange64(Synchronization sync,
                                      const BaseIndex& mem, Register64 value,
                                      Register64 output) {
  AtomicExchange64(*this, nullptr, sync, mem, value, output);
}

void MacroAssembler::atomicExchangeJS(Scalar::Type arrayType,
                                      Synchronization sync, const Address& mem,
                                      Register value, Register valueTemp,
                                      Register offsetTemp, Register maskTemp,
                                      Register temp, AnyRegister output) {
  AtomicExchangeJS(*this, arrayType, sync, mem, value, valueTemp, offsetTemp,
                   maskTemp, temp, output);
}

void MacroAssembler::atomicExchangeJS(Scalar::Type arrayType,
                                      Synchronization sync,
                                      const BaseIndex& mem, Register value,
                                      Register valueTemp, Register offsetTemp,
                                      Register maskTemp, Register temp,
                                      AnyRegister output) {
  AtomicExchangeJS(*this, arrayType, sync, mem, value, valueTemp, offsetTemp,
                   maskTemp, temp, output);
}

void MacroAssembler::atomicExchange(Scalar::Type type, Synchronization sync,
                                    const Address& mem, Register value,
                                    Register valueTemp, Register offsetTemp,
                                    Register maskTemp, Register output) {
  AtomicExchange(*this, nullptr, type, sync, mem, value, valueTemp, offsetTemp,
                 maskTemp, output);
}

void MacroAssembler::atomicExchange(Scalar::Type type, Synchronization sync,
                                    const BaseIndex& mem, Register value,
                                    Register valueTemp, Register offsetTemp,
                                    Register maskTemp, Register output) {
  AtomicExchange(*this, nullptr, type, sync, mem, value, valueTemp, offsetTemp,
                 maskTemp, output);
}

void MacroAssembler::atomicFetchOpJS(Scalar::Type arrayType,
                                     Synchronization sync, AtomicOp op,
                                     Register value, const Address& mem,
                                     Register valueTemp, Register offsetTemp,
                                     Register maskTemp, Register temp,
                                     AnyRegister output) {
  AtomicFetchOpJS(*this, arrayType, sync, op, value, mem, valueTemp, offsetTemp,
                  maskTemp, temp, output);
}

void MacroAssembler::atomicFetchOpJS(Scalar::Type arrayType,
                                     Synchronization sync, AtomicOp op,
                                     Register value, const BaseIndex& mem,
                                     Register valueTemp, Register offsetTemp,
                                     Register maskTemp, Register temp,
                                     AnyRegister output) {
  AtomicFetchOpJS(*this, arrayType, sync, op, value, mem, valueTemp, offsetTemp,
                  maskTemp, temp, output);
}

void MacroAssembler::atomicFetchOp(Scalar::Type type, Synchronization sync,
                                   AtomicOp op, Register value,
                                   const Address& mem, Register valueTemp,
                                   Register offsetTemp, Register maskTemp,
                                   Register output) {
  AtomicFetchOp(*this, nullptr, type, sync, op, mem, value, valueTemp,
                offsetTemp, maskTemp, output);
}

void MacroAssembler::atomicFetchOp(Scalar::Type type, Synchronization sync,
                                   AtomicOp op, Register value,
                                   const BaseIndex& mem, Register valueTemp,
                                   Register offsetTemp, Register maskTemp,
                                   Register output) {
  AtomicFetchOp(*this, nullptr, type, sync, op, mem, value, valueTemp,
                offsetTemp, maskTemp, output);
}

void MacroAssembler::atomicPause() {
  // `pause` hint defined in Zihintpause extension.
  // It is encoded as `fence w, 0`.
  fence(0b0001, 0b0000);
}

void MacroAssembler::branchPtrInNurseryChunk(Condition cond, Register ptr,
                                             Register temp, Label* label) {
  MOZ_ASSERT(cond == Assembler::Equal || cond == Assembler::NotEqual);
  MOZ_ASSERT(ptr != temp);
  MOZ_ASSERT(temp != InvalidReg);

  ma_and(temp, ptr, Imm32(int32_t(~gc::ChunkMask)));
  branchPtr(InvertCondition(cond), Address(temp, gc::ChunkStoreBufferOffset),
            zero, label);
}
void MacroAssembler::branchTestValue(Condition cond, const ValueOperand& lhs,
                                     const Value& rhs, Label* label) {
  MOZ_ASSERT(cond == Equal || cond == NotEqual);
  MOZ_ASSERT(!rhs.isNaN());

  if (!rhs.isGCThing()) {
    ma_b(lhs.valueReg(), ImmWord(rhs.asRawBits()), label, cond);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    MOZ_ASSERT(lhs.valueReg() != scratch);
    moveValue(rhs, ValueOperand(scratch));
    ma_b(lhs.valueReg(), scratch, label, cond);
  }
}

void MacroAssembler::branchTestNaNValue(Condition cond, const ValueOperand& val,
                                        Register temp, Label* label) {
  MOZ_ASSERT(cond == Equal || cond == NotEqual);
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  MOZ_ASSERT(val.valueReg() != scratch);

  // When testing for NaN, we want to ignore the sign bit.
  // Clear the top bit by shifting left and then right.
  slli(temp, val.valueReg(), 1);
  srli(temp, temp, 1);

  // Compare against a NaN with sign bit 0.
  static_assert(JS::detail::CanonicalizedNaNSignBit == 0);
  moveValue(DoubleValue(JS::GenericNaN()), ValueOperand(scratch));
  ma_b(temp, scratch, label, cond);
}

void MacroAssembler::branchValueIsNurseryCell(Condition cond,
                                              const Address& address,
                                              Register temp, Label* label) {
  branchValueIsNurseryCellImpl(cond, address, temp, label);
}

void MacroAssembler::branchValueIsNurseryCell(Condition cond,
                                              ValueOperand value, Register temp,
                                              Label* label) {
  branchValueIsNurseryCellImpl(cond, value, temp, label);
}
CodeOffset MacroAssembler::call(const Address& addr) {
  UseScratchRegisterScope temps(this);
  temps.Exclude(GeneralRegisterSet(1 << CallReg.code()));
  loadPtr(addr, CallReg);
  return call(CallReg);
}
void MacroAssembler::call(ImmPtr target) {
  BufferOffset bo = m_buffer.nextOffset();
  addPendingJump(bo, target, RelocationKind::HARDCODED);
  ma_call(target);
}
void MacroAssembler::call(ImmWord target) { call(ImmPtr((void*)target.value)); }

void MacroAssembler::call(JitCode* c) {
  DEBUG_PRINTF("[ %s\n", __FUNCTION__);
  BlockTrampolinePoolScope block_trampoline_pool(this, 8);
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  BufferOffset bo = m_buffer.nextOffset();
  addPendingJump(bo, ImmPtr(c->raw()), RelocationKind::JITCODE);
  ma_liPatchable(scratch, ImmPtr(c->raw()));
  callJitNoProfiler(scratch);
  DEBUG_PRINTF("]\n");
}

void MacroAssembler::callWithABIPre(uint32_t* stackAdjust, bool callFromWasm) {
  MOZ_ASSERT(inCall_);
  uint32_t stackForCall = abiArgs_.stackBytesConsumedSoFar();

  // Reserve place for $ra.
  stackForCall += sizeof(intptr_t);

  if (dynamicAlignment_) {
    stackForCall += ComputeByteAlignment(stackForCall, ABIStackAlignment);
  } else {
    uint32_t alignmentAtPrologue = callFromWasm ? sizeof(wasm::Frame) : 0;
    stackForCall += ComputeByteAlignment(
        stackForCall + framePushed() + alignmentAtPrologue, ABIStackAlignment);
  }

  *stackAdjust = stackForCall;
  reserveStack(stackForCall);

  // Save $ra because call is going to clobber it. Restore it in
  // callWithABIPost. NOTE: This is needed for calls from SharedIC.
  // Maybe we can do this differently.
  storePtr(ra, Address(StackPointer, stackForCall - sizeof(intptr_t)));

  // Position all arguments.
  {
    enoughMemory_ &= moveResolver_.resolve();
    if (!enoughMemory_) {
      return;
    }

    MoveEmitter emitter(asMasm());
    emitter.emit(moveResolver_);
    emitter.finish();
  }

  assertStackAlignment(ABIStackAlignment);
}

void MacroAssembler::callWithABIPost(uint32_t stackAdjust, ABIType result) {
  // Restore ra value (as stored in callWithABIPre()).
  loadPtr(Address(StackPointer, stackAdjust - sizeof(intptr_t)), ra);

  if (dynamicAlignment_) {
    // Restore sp value from stack (as stored in setupUnalignedABICall()).
    loadPtr(Address(StackPointer, stackAdjust), StackPointer);
    // Use adjustFrame instead of freeStack because we already restored sp.
    adjustFrame(-stackAdjust);
  } else {
    freeStack(stackAdjust);
  }

#ifdef DEBUG
  MOZ_ASSERT(inCall_);
  inCall_ = false;
#endif
}

void MacroAssembler::callWithABINoProfiler(Register fun, ABIType result) {
  // Load the callee in scratch2, no instruction between the movePtr and
  // call should clobber it. Note that we can't use fun because it may be
  // one of the IntArg registers clobbered before the call.
  UseScratchRegisterScope temps(this);
  temps.Exclude(GeneralRegisterSet(1 << CallReg.code()));
  movePtr(fun, CallReg);

  uint32_t stackAdjust;
  callWithABIPre(&stackAdjust);
  call(CallReg);
  callWithABIPost(stackAdjust, result);
}

void MacroAssembler::callWithABINoProfiler(const Address& fun, ABIType result) {
  // Load the callee in scratch2, as above.
  UseScratchRegisterScope temps(this);
  temps.Exclude(GeneralRegisterSet(1 << CallReg.code()));
  loadPtr(fun, CallReg);

  uint32_t stackAdjust;
  callWithABIPre(&stackAdjust);
  call(CallReg);
  callWithABIPost(stackAdjust, result);
}

void MacroAssembler::ceilDoubleToInt32(FloatRegister src, Register dest,
                                       Label* fail) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();

  // Round toward positive infinity.
  Ceil_l_d(dest, src);

  // Sign extend lower 32 bits to test if the result isn't an Int32.
  {
    move32SignExtendToPtr(dest, scratch);
    branchPtr(Assembler::NotEqual, dest, scratch, fail);
  }

  // We have to check for (-1, -0] when the result is zero.
  Label notZero;
  ma_b(dest, zero, &notZero, Assembler::NotEqual, ShortJump);
  {
    fmv_x_d(scratch, src);
    ma_b(scratch, scratch, fail, Assembler::Signed);
  }
  bind(&notZero);
}

void MacroAssembler::ceilFloat32ToInt32(FloatRegister src, Register dest,
                                        Label* fail) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();

  // Round toward positive infinity.
  Ceil_l_s(dest, src);

  // Sign extend lower 32 bits to test if the result isn't an Int32.
  {
    move32SignExtendToPtr(dest, scratch);
    branchPtr(Assembler::NotEqual, dest, scratch, fail);
  }

  // We have to check for (-1, -0] when the result is zero.
  Label notZero;
  ma_b(dest, zero, &notZero, Assembler::NotEqual, ShortJump);
  {
    fmv_x_w(scratch, src);
    ma_b(scratch, scratch, fail, Assembler::Signed);
  }
  bind(&notZero);
}

void MacroAssembler::comment(const char* msg) { Assembler::comment(msg); }

template <typename T>
static void CompareExchange64(MacroAssembler& masm,
                              const wasm::MemoryAccessDesc* access,
                              Synchronization sync, const T& mem,
                              Register64 expect, Register64 replace,
                              Register64 output) {
  MOZ_ASSERT(expect != output && replace != output);
  UseScratchRegisterScope temps(&masm);
  Register scratch = temps.Acquire();
  masm.computeEffectiveAddress(mem, scratch);

  Register scratch2 = temps.Acquire();

  Label tryAgain;
  Label exit;

  masm.memoryBarrierBefore(sync);

  masm.bind(&tryAgain);

  if (access) {
    masm.append(*access, wasm::TrapMachineInsn::Atomic,
                FaultingCodeOffset(masm.currentOffset()));
  }

  masm.lr_d(true, true, output.reg, scratch);

  masm.ma_b(output.reg, expect.reg, &exit, Assembler::NotEqual, ShortJump);
  masm.movePtr(replace.reg, scratch2);
  masm.sc_d(true, true, scratch2, scratch, scratch2);
  masm.ma_b(scratch2, Register(scratch2), &tryAgain, Assembler::NonZero,
            ShortJump);

  masm.memoryBarrierAfter(sync);

  masm.bind(&exit);
}

void MacroAssembler::compareExchange64(Synchronization sync, const Address& mem,
                                       Register64 expect, Register64 replace,
                                       Register64 output) {
  CompareExchange64(*this, nullptr, sync, mem, expect, replace, output);
}

void MacroAssembler::compareExchange64(Synchronization sync,
                                       const BaseIndex& mem, Register64 expect,
                                       Register64 replace, Register64 output) {
  CompareExchange64(*this, nullptr, sync, mem, expect, replace, output);
}

void MacroAssembler::compareExchangeJS(Scalar::Type arrayType,
                                       Synchronization sync, const Address& mem,
                                       Register oldval, Register newval,
                                       Register valueTemp, Register offsetTemp,
                                       Register maskTemp, Register temp,
                                       AnyRegister output) {
  CompareExchangeJS(*this, arrayType, sync, mem, oldval, newval, valueTemp,
                    offsetTemp, maskTemp, temp, output);
}

void MacroAssembler::compareExchangeJS(Scalar::Type arrayType,
                                       Synchronization sync,
                                       const BaseIndex& mem, Register oldval,
                                       Register newval, Register valueTemp,
                                       Register offsetTemp, Register maskTemp,
                                       Register temp, AnyRegister output) {
  CompareExchangeJS(*this, arrayType, sync, mem, oldval, newval, valueTemp,
                    offsetTemp, maskTemp, temp, output);
}

void MacroAssembler::convertInt64ToDouble(Register64 src, FloatRegister dest) {
  fcvt_d_l(dest, src.scratchReg());
}
void MacroAssembler::convertInt64ToFloat32(Register64 src, FloatRegister dest) {
  fcvt_s_l(dest, src.scratchReg());
}
void MacroAssembler::convertIntPtrToDouble(Register src, FloatRegister dest) {
  fcvt_d_l(dest, src);
}
void MacroAssembler::convertUInt64ToDouble(Register64 src, FloatRegister dest,
                                           Register tmp) {
  fcvt_d_lu(dest, src.scratchReg());
}
void MacroAssembler::convertUInt64ToFloat32(Register64 src, FloatRegister dest,
                                            Register tmp) {
  fcvt_s_lu(dest, src.scratchReg());
}
void MacroAssembler::copySignDouble(FloatRegister lhs, FloatRegister rhs,
                                    FloatRegister output) {
  fsgnj_d(output, lhs, rhs);
}
void MacroAssembler::copySignFloat32(FloatRegister lhs, FloatRegister rhs,
                                     FloatRegister output) {
  fsgnj_s(output, lhs, rhs);
}
void MacroAssembler::enterFakeExitFrameForWasm(Register cxreg, Register scratch,
                                               ExitFrameType type) {
  enterFakeExitFrame(cxreg, scratch, type);
}
CodeOffset MacroAssembler::sub32FromMemAndBranchIfNegativeWithPatch(
    Address address, Label* label) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  MOZ_ASSERT(scratch != address.base);
  ma_load(scratch, address);
  addiw(scratch, scratch, 128);
  CodeOffset patchPoint = CodeOffset(currentOffset());
  ma_store(scratch, address);
  ma_b(scratch, scratch, label, Assembler::Signed);
  return patchPoint;
}
void MacroAssembler::patchSub32FromMemAndBranchIfNegative(CodeOffset offset,
                                                          Imm32 imm) {
  int32_t val = imm.value;
  MOZ_RELEASE_ASSERT(val >= 1 && val <= 127);
  auto* inst = m_buffer.getInst(BufferOffset(offset.offset() - 4));
  inst->InstructionOpcodeType();
  MOZ_ASSERT(IsAddiw(inst->InstructionBits()));
  /*
   * | imm[11:0] | rs1 | 000 | rd | 0011011 |
   */
  inst->SetInstructionBits(((uint32_t)inst->InstructionBits() & ~kImm12Mask) |
                           (((uint32_t)(-val) & 0xfff) << kImm12Shift));
}
void MacroAssembler::flexibleDivMod32(Register lhs, Register rhs,
                                      Register divOutput, Register remOutput,
                                      bool isUnsigned, const LiveRegisterSet&) {
  MOZ_ASSERT(lhs != divOutput && lhs != remOutput, "lhs is preserved");
  MOZ_ASSERT(rhs != divOutput && rhs != remOutput, "rhs is preserved");

  // The recommended code sequence to obtain both the quotient and remainder
  // is div[u] followed by mod[u].
  if (isUnsigned) {
    ma_divu32(divOutput, lhs, rhs);
    ma_modu32(remOutput, lhs, rhs);
  } else {
    ma_div32(divOutput, lhs, rhs);
    ma_mod32(remOutput, lhs, rhs);
  }
}
void MacroAssembler::flexibleQuotient32(Register lhs, Register rhs,
                                        Register dest, bool isUnsigned,
                                        const LiveRegisterSet&) {
  quotient32(lhs, rhs, dest, isUnsigned);
}

void MacroAssembler::flexibleQuotientPtr(Register lhs, Register rhs,
                                         Register dest, bool isUnsigned,
                                         const LiveRegisterSet&) {
  quotient64(lhs, rhs, dest, isUnsigned);
}

void MacroAssembler::flexibleRemainder32(Register lhs, Register rhs,
                                         Register dest, bool isUnsigned,
                                         const LiveRegisterSet&) {
  remainder32(lhs, rhs, dest, isUnsigned);
}

void MacroAssembler::flexibleRemainderPtr(Register lhs, Register rhs,
                                          Register dest, bool isUnsigned,
                                          const LiveRegisterSet&) {
  remainder64(lhs, rhs, dest, isUnsigned);
}

void MacroAssembler::floorDoubleToInt32(FloatRegister src, Register dest,
                                        Label* fail) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();

  // Round toward negative infinity.
  Floor_l_d(dest, src);

  // Sign extend lower 32 bits to test if the result isn't an Int32.
  {
    move32SignExtendToPtr(dest, scratch);
    branchPtr(Assembler::NotEqual, dest, scratch, fail);
  }

  // Fail if the input is negative zero.
  {
    fclass_d(scratch, src);
    ma_b(scratch, Imm32(FClassFlag::kNegativeZero), fail, Equal);
  }
}

void MacroAssembler::floorFloat32ToInt32(FloatRegister src, Register dest,
                                         Label* fail) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();

  // Round toward negative infinity.
  Floor_l_s(dest, src);

  // Sign extend lower 32 bits to test if the result isn't an Int32.
  {
    move32SignExtendToPtr(dest, scratch);
    branchPtr(Assembler::NotEqual, dest, scratch, fail);
  }

  // Fail if the input is negative zero.
  {
    fclass_s(scratch, src);
    ma_b(scratch, Imm32(FClassFlag::kNegativeZero), fail, Equal);
  }
}

void MacroAssembler::flush() {}
void MacroAssembler::loadStoreBuffer(Register ptr, Register buffer) {
  ma_and(buffer, ptr, Imm32(int32_t(~gc::ChunkMask)));
  loadPtr(Address(buffer, gc::ChunkStoreBufferOffset), buffer);
}

void MacroAssembler::moveValue(const ValueOperand& src,
                               const ValueOperand& dest) {
  if (src == dest) {
    return;
  }
  movePtr(src.valueReg(), dest.valueReg());
}

void MacroAssembler::moveValue(const Value& src, const ValueOperand& dest) {
  if (!src.isGCThing()) {
    ma_li(dest.valueReg(), ImmWord(src.asRawBits()));
    return;
  }

  writeDataRelocation(src);
  movWithPatch(ImmWord(src.asRawBits()), dest.valueReg());
}

void MacroAssembler::nearbyIntDouble(RoundingMode mode, FloatRegister src,
                                     FloatRegister dest) {
  MOZ_ASSERT(HasRoundInstruction(mode));

  ScratchDoubleScope2 fscratch(*this);

  switch (mode) {
    case RoundingMode::Down:
      Floor_d_d(dest, src, fscratch);
      break;
    case RoundingMode::Up:
      Ceil_d_d(dest, src, fscratch);
      break;
    case RoundingMode::NearestTiesToEven:
      Round_d_d(dest, src, fscratch);
      break;
    case RoundingMode::TowardsZero:
      Trunc_d_d(dest, src, fscratch);
      break;
  }
}

void MacroAssembler::nearbyIntFloat32(RoundingMode mode, FloatRegister src,
                                      FloatRegister dest) {
  MOZ_ASSERT(HasRoundInstruction(mode));

  ScratchFloat32Scope2 fscratch(*this);

  switch (mode) {
    case RoundingMode::Down:
      Floor_s_s(dest, src, fscratch);
      break;
    case RoundingMode::Up:
      Ceil_s_s(dest, src, fscratch);
      break;
    case RoundingMode::NearestTiesToEven:
      Round_s_s(dest, src, fscratch);
      break;
    case RoundingMode::TowardsZero:
      Trunc_s_s(dest, src, fscratch);
      break;
  }
}

void MacroAssembler::oolWasmTruncateCheckF32ToI32(
    FloatRegister input, Register output, TruncFlags flags,
    const wasm::TrapSiteDesc& trapSiteDesc, Label* rejoin) {
  MOZ_ASSERT(!(flags & TRUNC_SATURATING));

  Label notNaN;
  BranchFloat32(Assembler::DoubleOrdered, input, input, &notNaN, ShortJump);
  wasmTrap(wasm::Trap::InvalidConversionToInteger, trapSiteDesc);
  bind(&notNaN);

  wasmTrap(wasm::Trap::IntegerOverflow, trapSiteDesc);
}

void MacroAssembler::oolWasmTruncateCheckF64ToI32(
    FloatRegister input, Register output, TruncFlags flags,
    const wasm::TrapSiteDesc& trapSiteDesc, Label* rejoin) {
  MOZ_ASSERT(!(flags & TRUNC_SATURATING));

  Label notNaN;
  BranchFloat64(Assembler::DoubleOrdered, input, input, &notNaN, ShortJump);
  wasmTrap(wasm::Trap::InvalidConversionToInteger, trapSiteDesc);
  bind(&notNaN);

  wasmTrap(wasm::Trap::IntegerOverflow, trapSiteDesc);
}

void MacroAssembler::oolWasmTruncateCheckF32ToI64(
    FloatRegister input, Register64 output, TruncFlags flags,
    const wasm::TrapSiteDesc& trapSiteDesc, Label* rejoin) {
  MOZ_ASSERT(!(flags & TRUNC_SATURATING));

  Label notNaN;
  BranchFloat32(Assembler::DoubleOrdered, input, input, &notNaN, ShortJump);
  wasmTrap(wasm::Trap::InvalidConversionToInteger, trapSiteDesc);
  bind(&notNaN);

  wasmTrap(wasm::Trap::IntegerOverflow, trapSiteDesc);
}

void MacroAssembler::oolWasmTruncateCheckF64ToI64(
    FloatRegister input, Register64 output, TruncFlags flags,
    const wasm::TrapSiteDesc& trapSiteDesc, Label* rejoin) {
  MOZ_ASSERT(!(flags & TRUNC_SATURATING));

  Label notNaN;
  BranchFloat64(Assembler::DoubleOrdered, input, input, &notNaN, ShortJump);
  wasmTrap(wasm::Trap::InvalidConversionToInteger, trapSiteDesc);
  bind(&notNaN);

  wasmTrap(wasm::Trap::IntegerOverflow, trapSiteDesc);
}

void MacroAssembler::patchCallToNop(uint8_t* call) {
  uint32_t* p = reinterpret_cast<uint32_t*>(call) - 7;
  *reinterpret_cast<Instr*>(p) = kNopByte;
  *reinterpret_cast<Instr*>(p + 1) = kNopByte;
  *reinterpret_cast<Instr*>(p + 2) = kNopByte;
  *reinterpret_cast<Instr*>(p + 3) = kNopByte;
  *reinterpret_cast<Instr*>(p + 4) = kNopByte;
  *reinterpret_cast<Instr*>(p + 5) = kNopByte;
  *reinterpret_cast<Instr*>(p + 6) = kNopByte;
}

CodeOffset MacroAssembler::callWithPatch() {
  BlockTrampolinePoolScope block_trampoline_pool(this, 2);
  DEBUG_PRINTF("\tcallWithPatch\n");
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  int32_t imm32 = 1 * sizeof(uint32_t);
  int32_t Hi20 = ((imm32 + 0x800) >> 12);
  int32_t Lo12 = imm32 << 20 >> 20;
  auipc(scratch, Hi20);  // Read PC + Hi20 into scratch.
  jalr(scratch, Lo12);   // jump PC + Hi20 + Lo12
  DEBUG_PRINTF("\tret %d\n", currentOffset());
  return CodeOffset(currentOffset());
}

void MacroAssembler::patchCall(uint32_t callerOffset, uint32_t calleeOffset) {
  DEBUG_PRINTF("\tpatchCall\n");
  BufferOffset call(callerOffset - 2 * sizeof(uint32_t));
  DEBUG_PRINTF("\tcallerOffset %d\n", callerOffset);
  int32_t offset = BufferOffset(calleeOffset).getOffset() - call.getOffset();
  if (is_int32(offset)) {
    Instruction* auipc_ = (Instruction*)editSrc(call);
    Instruction* jalr_ = (Instruction*)editSrc(
        BufferOffset(callerOffset - 1 * sizeof(uint32_t)));
    DEBUG_PRINTF("\t%p %zu\n\t", auipc_, callerOffset - 2 * sizeof(uint32_t));
    disassembleInstr(auipc_->InstructionBits());
    DEBUG_PRINTF("\t%p %zu\n\t", jalr_, callerOffset - 1 * sizeof(uint32_t));
    disassembleInstr(jalr_->InstructionBits());
    DEBUG_PRINTF("\t\n");
    MOZ_ASSERT(IsJalr(jalr_->InstructionBits()) &&
               IsAuipc(auipc_->InstructionBits()));
    MOZ_ASSERT(auipc_->RdValue() == jalr_->Rs1Value());
    int32_t Hi20 = (((int32_t)offset + 0x800) >> 12);
    int32_t Lo12 = (int32_t)offset << 20 >> 20;
    instr_at_put(call, SetAuipcOffset(Hi20, auipc_->InstructionBits()));
    instr_at_put(BufferOffset(callerOffset - 1 * sizeof(uint32_t)),
                 SetJalrOffset(Lo12, jalr_->InstructionBits()));
  } else {
    MOZ_CRASH();
  }
}

void MacroAssembler::patchFarJump(CodeOffset farJump, uint32_t targetOffset) {
  uint32_t* u32 = reinterpret_cast<uint32_t*>(
      editSrc(BufferOffset(farJump.offset() + 4 * kInstrSize)));
  MOZ_ASSERT(*u32 == UINT32_MAX);
  *u32 = targetOffset - farJump.offset();
}

void MacroAssembler::patchFarJump(uint8_t* farJump, uint8_t* target) {
  uint32_t* u32 = reinterpret_cast<uint32_t*>(farJump + 4 * kInstrSize);
  MOZ_ASSERT(*u32 == UINT32_MAX);
  *u32 = (int64_t)target - (int64_t)farJump;
}

void MacroAssembler::patchNearAddressMove(CodeLocationLabel loc,
                                          CodeLocationLabel target) {
  PatchDataWithValueCheck(loc, ImmPtr(target.raw()), ImmPtr(nullptr));
}

void MacroAssembler::patchNopToCall(uint8_t* call, uint8_t* target) {
  uint32_t* p = reinterpret_cast<uint32_t*>(call) - 7;
  Assembler::WriteLoad64Instructions((Instruction*)p, SavedScratchRegister,
                                     (uint64_t)target);
  DEBUG_PRINTF("\tpatchNopToCall %" PRIu64 " %" PRIu64 "\n", (uint64_t)target,
               ExtractLoad64Value((Instruction*)p));
  MOZ_ASSERT(ExtractLoad64Value((Instruction*)p) == (uint64_t)target);
  Instr jalr_ = JALR | (ra.code() << kRdShift) | (0x0 << kFunct3Shift) |
                (SavedScratchRegister.code() << kRs1Shift) |
                (0x0 << kImm12Shift);
  *reinterpret_cast<Instr*>(p + 6) = jalr_;
}
void MacroAssembler::Pop(Register reg) {
  pop(reg);
  adjustFrame(-int32_t(sizeof(intptr_t)));
}

void MacroAssembler::Pop(FloatRegister f) {
  pop(f);
  // See MacroAssemblerRiscv64::ma_pop(FloatRegister) for why we use
  // sizeof(double).
  adjustFrame(-int32_t(sizeof(double)));
}

void MacroAssembler::Pop(const ValueOperand& val) {
  popValue(val);
  adjustFrame(-int32_t(sizeof(Value)));
}

void MacroAssembler::PopRegsInMaskIgnore(LiveRegisterSet set,
                                         LiveRegisterSet ignore) {
  int32_t diff =
      set.gprs().size() * sizeof(intptr_t) + set.fpus().getPushSizeInBytes();
  const int32_t reserved = diff;

  for (GeneralRegisterBackwardIterator iter(set.gprs()); iter.more(); ++iter) {
    diff -= sizeof(intptr_t);
    if (!ignore.has(*iter)) {
      loadPtr(Address(StackPointer, diff), *iter);
    }
  }

#ifdef ENABLE_WASM_SIMD
#  error "Needs more careful logic if SIMD is enabled"
#endif

  for (FloatRegisterBackwardIterator iter(set.fpus().reduceSetForPush());
       iter.more(); ++iter) {
    diff -= sizeof(double);
    if (!ignore.has(*iter)) {
      loadDouble(Address(StackPointer, diff), *iter);
    }
  }
  MOZ_ASSERT(diff == 0);
  freeStack(reserved);
}

CodeOffset MacroAssembler::move32WithPatch(Register dest) {
  CodeOffset offs = CodeOffset(currentOffset());
  ma_liPatchable(dest, Imm32(0));
  return offs;
}

void MacroAssembler::patchMove32(CodeOffset offset, Imm32 n) {
  patchSub32FromStackPtr(offset, n);
}

void MacroAssembler::pushReturnAddress() { push(ra); }

void MacroAssembler::popReturnAddress() { pop(ra); }
void MacroAssembler::PopStackPtr() {
  loadPtr(Address(StackPointer, 0), StackPointer);
  adjustFrame(-int32_t(sizeof(intptr_t)));
}
void MacroAssembler::freeStackTo(uint32_t framePushed) {
  MOZ_ASSERT(framePushed <= framePushed_);
  ma_sub64(StackPointer, FramePointer, Imm32(framePushed));
  framePushed_ = framePushed;
}
void MacroAssembler::PushBoxed(FloatRegister reg) {
  subFromStackPtr(Imm32(sizeof(double)));
  boxDouble(reg, Address(getStackPointer(), 0));
  adjustFrame(sizeof(double));
}

void MacroAssembler::Push(Register reg) {
  push(reg);
  adjustFrame(int32_t(sizeof(intptr_t)));
}

void MacroAssembler::Push(const Imm32 imm) {
  push(imm);
  adjustFrame(int32_t(sizeof(intptr_t)));
}

void MacroAssembler::Push(const ImmWord imm) {
  push(imm);
  adjustFrame(int32_t(sizeof(intptr_t)));
}

void MacroAssembler::Push(const ImmPtr imm) {
  Push(ImmWord(uintptr_t(imm.value)));
}

void MacroAssembler::Push(const ImmGCPtr ptr) {
  push(ptr);
  adjustFrame(int32_t(sizeof(intptr_t)));
}

void MacroAssembler::Push(FloatRegister f) {
  push(f);
  // See MacroAssemblerRiscv64::ma_push(FloatRegister) for why we use
  // sizeof(double).
  adjustFrame(int32_t(sizeof(double)));
}

void MacroAssembler::PushRegsInMask(LiveRegisterSet set) {
  int32_t diff =
      set.gprs().size() * sizeof(intptr_t) + set.fpus().getPushSizeInBytes();
  const int32_t reserved = diff;

  reserveStack(reserved);
  for (GeneralRegisterBackwardIterator iter(set.gprs()); iter.more(); ++iter) {
    diff -= sizeof(intptr_t);
    storePtr(*iter, Address(StackPointer, diff));
  }

#ifdef ENABLE_WASM_SIMD
#  error "Needs more careful logic if SIMD is enabled"
#endif

  for (FloatRegisterBackwardIterator iter(set.fpus().reduceSetForPush());
       iter.more(); ++iter) {
    diff -= sizeof(double);
    storeDouble(*iter, Address(StackPointer, diff));
  }
  MOZ_ASSERT(diff == 0);
}

void MacroAssembler::roundFloat32ToInt32(FloatRegister src, Register dest,
                                         FloatRegister temp, Label* fail) {
  JitSpew(JitSpew_Codegen, "[ %s", __FUNCTION__);
  Label negative, done;

  // Branch to a slow path if input < 0.0 due to complicated rounding rules.
  {
    loadConstantFloat32(0.0f, temp);
    BranchFloat32(Assembler::DoubleLessThan, src, temp, &negative, ShortJump);
  }

  // Fail if the input is negative zero.
  {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    fclass_s(scratch, src);
    ma_b(scratch, Imm32(FClassFlag::kNegativeZero), fail, Assembler::Equal);
  }

  // Handle the simple case of a positive input and NaN.
  // Rounding proceeds with consideration of the fractional part of the input:
  // 1. If > 0.5, round to integer with higher absolute value (so, up).
  // 2. If < 0.5, round to integer with lower absolute value (so, down).
  // 3. If = 0.5, round to +Infinity (so, up).
  {
    // Round, ties away from zero.
    RoundMaxMag_l_s(dest, src);
    ma_branch(&done);
  }

  // Handle the complicated case of a negative input.
  // Rounding proceeds with consideration of the fractional part of the input:
  // 1. If > 0.5, round to integer with higher absolute value (so, down).
  // 2. If < 0.5, round to integer with lower absolute value (so, up).
  // 3. If = 0.5, round to +Infinity (so, up).
  bind(&negative);
  {
    // Inputs in [-0.5, 0) are rounded to -0. Fail.
    loadConstantFloat32(-0.5f, temp);
    branchFloat(Assembler::DoubleGreaterThanOrEqual, src, temp, fail);

    // Other negative inputs need the biggest float less than 0.5 added.
    loadConstantFloat32(GetBiggestNumberLessThan(0.5f), temp);
    fadd_s(temp, src, temp);

    // Round toward negative infinity.
    Floor_l_s(dest, temp);
  }

  // Sign extend lower 32 bits to test if the result isn't an Int32.
  bind(&done);
  {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    move32SignExtendToPtr(dest, scratch);
    branchPtr(Assembler::NotEqual, dest, scratch, fail);
  }
  JitSpew(JitSpew_Codegen, "]");
}

void MacroAssembler::roundDoubleToInt32(FloatRegister src, Register dest,
                                        FloatRegister temp, Label* fail) {
  JitSpew(JitSpew_Codegen, "[ %s", __FUNCTION__);
  Label negative, done;

  // Branch to a slow path if input < 0.0 due to complicated rounding rules.
  {
    loadConstantDouble(0.0, temp);
    BranchFloat64(Assembler::DoubleLessThan, src, temp, &negative, ShortJump);
  }

  // Fail if the input is negative zero.
  {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    fclass_d(scratch, src);
    ma_b(scratch, Imm32(FClassFlag::kNegativeZero), fail, Equal);
  }

  // Handle the simple case of a positive input and NaN.
  // Rounding proceeds with consideration of the fractional part of the input:
  // 1. If > 0.5, round to integer with higher absolute value (so, up).
  // 2. If < 0.5, round to integer with lower absolute value (so, down).
  // 3. If = 0.5, round to +Infinity (so, up).
  {
    // Round, ties away from zero.
    RoundMaxMag_l_d(dest, src);
    ma_branch(&done);
  }

  // Handle the complicated case of a negative input.
  // Rounding proceeds with consideration of the fractional part of the input:
  // 1. If > 0.5, round to integer with higher absolute value (so, down).
  // 2. If < 0.5, round to integer with lower absolute value (so, up).
  // 3. If = 0.5, round to +Infinity (so, up).
  bind(&negative);
  {
    // Inputs in [-0.5, 0) are rounded to -0. Fail.
    loadConstantDouble(-0.5, temp);
    branchDouble(Assembler::DoubleGreaterThanOrEqual, src, temp, fail);

    // Other negative inputs need the biggest double less than 0.5 added.
    loadConstantDouble(GetBiggestNumberLessThan(0.5), temp);
    fadd_d(temp, src, temp);

    // Round toward negative infinity.
    Floor_l_d(dest, temp);
  }

  // Sign extend lower 32 bits to test if the result isn't an Int32.
  bind(&done);
  {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    move32SignExtendToPtr(dest, scratch);
    branchPtr(Assembler::NotEqual, dest, scratch, fail);
  }
  JitSpew(JitSpew_Codegen, "]");
}

void MacroAssembler::setupUnalignedABICall(Register scratch) {
  MOZ_ASSERT(!IsCompilingWasm(), "wasm should only use aligned ABI calls");
  setupNativeABICall();
  dynamicAlignment_ = true;

  or_(scratch, StackPointer, zero);

  // Force sp to be aligned
  asMasm().subPtr(Imm32(sizeof(uintptr_t)), StackPointer);
  ma_and(StackPointer, StackPointer, Imm32(~(ABIStackAlignment - 1)));
  storePtr(scratch, Address(StackPointer, 0));
}
void MacroAssembler::shiftIndex32AndAdd(Register indexTemp32, int shift,
                                        Register pointer) {
  if (IsShiftInScaleRange(shift)) {
    computeEffectiveAddress(
        BaseIndex(pointer, indexTemp32, ShiftToScale(shift)), pointer);
    return;
  }
  lshift32(Imm32(shift), indexTemp32);
  addPtr(indexTemp32, pointer);
}
void MacroAssembler::speculationBarrier() { MOZ_CRASH(); }
void MacroAssembler::storeRegsInMask(LiveRegisterSet set, Address dest,
                                     Register) {
  FloatRegisterSet fpuSet(set.fpus().reduceSetForPush());
  mozilla::DebugOnly<unsigned> numFpu = fpuSet.size();
  int32_t diffF = fpuSet.getPushSizeInBytes();
  mozilla::DebugOnly<int32_t> diffG = set.gprs().size() * sizeof(intptr_t);

  MOZ_ASSERT(dest.offset >= diffG + diffF);

  for (GeneralRegisterBackwardIterator iter(set.gprs()); iter.more(); ++iter) {
    diffG -= sizeof(intptr_t);
    dest.offset -= sizeof(intptr_t);
    storePtr(*iter, dest);
  }
  MOZ_ASSERT(diffG == 0);

#ifdef ENABLE_WASM_SIMD
#  error "Needs more careful logic if SIMD is enabled"
#endif

  for (FloatRegisterBackwardIterator iter(fpuSet); iter.more(); ++iter) {
    FloatRegister reg = *iter;
    diffF -= reg.size();
    numFpu -= 1;
    dest.offset -= reg.size();
    if (reg.isDouble()) {
      storeDouble(reg, dest);
    } else if (reg.isSingle()) {
      storeFloat32(reg, dest);
    } else {
      MOZ_CRASH("Unknown register type.");
    }
  }
  MOZ_ASSERT(numFpu == 0);

  diffF -= diffF % sizeof(uintptr_t);
  MOZ_ASSERT(diffF == 0);
}
void MacroAssembler::truncDoubleToInt32(FloatRegister src, Register dest,
                                        Label* fail) {
  UseScratchRegisterScope temps(*this);
  Register scratch = temps.Acquire();

  // Round toward zero.
  Trunc_l_d(dest, src);

  // Sign extend lower 32 bits to test if the result isn't an Int32.
  {
    move32SignExtendToPtr(dest, scratch);
    branchPtr(Assembler::NotEqual, dest, scratch, fail);
  }

  // We have to check for (-1, -0] when the result is zero.
  Label notZero;
  ma_b(dest, zero, &notZero, Assembler::NotEqual, ShortJump);
  {
    fmv_x_d(scratch, src);
    ma_b(scratch, scratch, fail, Assembler::Signed);
  }
  bind(&notZero);
}
void MacroAssembler::truncFloat32ToInt32(FloatRegister src, Register dest,
                                         Label* fail) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();

  // Round toward zero.
  Trunc_l_s(dest, src);

  // Sign extend lower 32 bits to test if the result isn't an Int32.
  {
    move32SignExtendToPtr(dest, scratch);
    branchPtr(Assembler::NotEqual, dest, scratch, fail);
  }

  // We have to check for (-1, -0] when the result is zero.
  Label notZero;
  ma_b(dest, zero, &notZero, Assembler::NotEqual, ShortJump);
  {
    fmv_x_w(scratch, src);
    ma_b(scratch, scratch, fail, Assembler::Signed);
  }
  bind(&notZero);
}

void MacroAssembler::wasmAtomicEffectOp(const wasm::MemoryAccessDesc& access,
                                        AtomicOp op, Register value,
                                        const Address& mem, Register valueTemp,
                                        Register offsetTemp,
                                        Register maskTemp) {
  AtomicEffectOp(*this, &access, access.type(), access.sync(), op, mem, value,
                 valueTemp, offsetTemp, maskTemp);
}

void MacroAssembler::wasmAtomicEffectOp(const wasm::MemoryAccessDesc& access,
                                        AtomicOp op, Register value,
                                        const BaseIndex& mem,
                                        Register valueTemp, Register offsetTemp,
                                        Register maskTemp) {
  AtomicEffectOp(*this, &access, access.type(), access.sync(), op, mem, value,
                 valueTemp, offsetTemp, maskTemp);
}
template <typename T>
static void WasmAtomicExchange64(MacroAssembler& masm,
                                 const wasm::MemoryAccessDesc& access,
                                 const T& mem, Register64 value,
                                 Register64 output) {
  AtomicExchange64(masm, &access, access.sync(), mem, value, output);
}

void MacroAssembler::wasmAtomicExchange64(const wasm::MemoryAccessDesc& access,
                                          const Address& mem, Register64 src,
                                          Register64 output) {
  WasmAtomicExchange64(*this, access, mem, src, output);
}

void MacroAssembler::wasmAtomicExchange64(const wasm::MemoryAccessDesc& access,
                                          const BaseIndex& mem, Register64 src,
                                          Register64 output) {
  WasmAtomicExchange64(*this, access, mem, src, output);
}
void MacroAssembler::wasmAtomicExchange(const wasm::MemoryAccessDesc& access,
                                        const Address& mem, Register value,
                                        Register valueTemp, Register offsetTemp,
                                        Register maskTemp, Register output) {
  AtomicExchange(*this, &access, access.type(), access.sync(), mem, value,
                 valueTemp, offsetTemp, maskTemp, output);
}

void MacroAssembler::wasmAtomicExchange(const wasm::MemoryAccessDesc& access,
                                        const BaseIndex& mem, Register value,
                                        Register valueTemp, Register offsetTemp,
                                        Register maskTemp, Register output) {
  AtomicExchange(*this, &access, access.type(), access.sync(), mem, value,
                 valueTemp, offsetTemp, maskTemp, output);
}
void MacroAssembler::wasmAtomicFetchOp64(const wasm::MemoryAccessDesc& access,
                                         AtomicOp op, Register64 value,
                                         const Address& mem, Register64 temp,
                                         Register64 output) {
  AtomicFetchOp64(*this, &access, access.sync(), op, value, mem, temp, output);
}
void MacroAssembler::wasmAtomicFetchOp64(const wasm::MemoryAccessDesc& access,
                                         AtomicOp op, Register64 value,
                                         const BaseIndex& mem, Register64 temp,
                                         Register64 output) {
  AtomicFetchOp64(*this, &access, access.sync(), op, value, mem, temp, output);
}

void MacroAssembler::atomicFetchOp64(Synchronization sync, AtomicOp op,
                                     Register64 value, const Address& mem,
                                     Register64 temp, Register64 output) {
  AtomicFetchOp64(*this, nullptr, sync, op, value, mem, temp, output);
}

void MacroAssembler::atomicFetchOp64(Synchronization sync, AtomicOp op,
                                     Register64 value, const BaseIndex& mem,
                                     Register64 temp, Register64 output) {
  AtomicFetchOp64(*this, nullptr, sync, op, value, mem, temp, output);
}

void MacroAssembler::atomicEffectOp64(Synchronization sync, AtomicOp op,
                                      Register64 value, const Address& mem,
                                      Register64 temp) {
  AtomicFetchOp64(*this, nullptr, sync, op, value, mem, temp, temp);
}

void MacroAssembler::atomicEffectOp64(Synchronization sync, AtomicOp op,
                                      Register64 value, const BaseIndex& mem,
                                      Register64 temp) {
  AtomicFetchOp64(*this, nullptr, sync, op, value, mem, temp, temp);
}
void MacroAssembler::wasmAtomicFetchOp(const wasm::MemoryAccessDesc& access,
                                       AtomicOp op, Register value,
                                       const Address& mem, Register valueTemp,
                                       Register offsetTemp, Register maskTemp,
                                       Register output) {
  AtomicFetchOp(*this, &access, access.type(), access.sync(), op, mem, value,
                valueTemp, offsetTemp, maskTemp, output);
}

void MacroAssembler::wasmAtomicFetchOp(const wasm::MemoryAccessDesc& access,
                                       AtomicOp op, Register value,
                                       const BaseIndex& mem, Register valueTemp,
                                       Register offsetTemp, Register maskTemp,
                                       Register output) {
  AtomicFetchOp(*this, &access, access.type(), access.sync(), op, mem, value,
                valueTemp, offsetTemp, maskTemp, output);
}
void MacroAssembler::wasmBoundsCheck32(Condition cond, Register index,
                                       Register boundsCheckLimit,
                                       Label* label) {
  ma_b(index, boundsCheckLimit, label, cond);
}

void MacroAssembler::wasmBoundsCheck32(Condition cond, Register index,
                                       Address boundsCheckLimit, Label* label) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  load32(boundsCheckLimit, scratch2);
  ma_b(index, Register(scratch2), label, cond);
}

void MacroAssembler::wasmBoundsCheck64(Condition cond, Register64 index,
                                       Register64 boundsCheckLimit,
                                       Label* label) {
  ma_b(index.reg, boundsCheckLimit.reg, label, cond);
}

void MacroAssembler::wasmBoundsCheck64(Condition cond, Register64 index,
                                       Address boundsCheckLimit, Label* label) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  loadPtr(boundsCheckLimit, scratch2);
  ma_b(index.reg, scratch2, label, cond);
}

void MacroAssembler::wasmCompareExchange64(const wasm::MemoryAccessDesc& access,
                                           const Address& mem,
                                           Register64 expect,
                                           Register64 replace,
                                           Register64 output) {
  CompareExchange64(*this, &access, access.sync(), mem, expect, replace,
                    output);
}

void MacroAssembler::wasmCompareExchange64(const wasm::MemoryAccessDesc& access,
                                           const BaseIndex& mem,
                                           Register64 expect,
                                           Register64 replace,
                                           Register64 output) {
  CompareExchange64(*this, &access, access.sync(), mem, expect, replace,
                    output);
}

template <typename T>
static void CompareExchange(MacroAssembler& masm,
                            const wasm::MemoryAccessDesc* access,
                            Scalar::Type type, Synchronization sync,
                            const T& mem, Register oldval, Register newval,
                            Register valueTemp, Register offsetTemp,
                            Register maskTemp, Register output) {
  bool signExtend = Scalar::isSignedIntType(type);
  unsigned nbytes = Scalar::byteSize(type);

  switch (nbytes) {
    case 1:
    case 2:
      break;
    case 4:
      MOZ_ASSERT(valueTemp == InvalidReg);
      MOZ_ASSERT(offsetTemp == InvalidReg);
      MOZ_ASSERT(maskTemp == InvalidReg);
      break;
    default:
      MOZ_CRASH();
  }

  Label again, end;
  UseScratchRegisterScope temps(&masm);
  Register scratch1 = temps.Acquire();
  Register scratch2 = temps.Acquire();
  masm.computeEffectiveAddress(mem, scratch2);

  if (nbytes == 4) {
    masm.memoryBarrierBefore(sync);
    masm.bind(&again);

    if (access) {
      masm.append(*access, wasm::TrapMachineInsn::Atomic,
                  FaultingCodeOffset(masm.currentOffset()));
    }

    masm.lr_w(true, true, output, scratch2);
    masm.SignExtendWord(scratch1, oldval);
    masm.ma_b(output, scratch1, &end, Assembler::NotEqual, ShortJump);
    masm.mv(scratch1, newval);
    masm.sc_w(true, true, scratch1, scratch2, scratch1);
    masm.ma_b(scratch1, scratch1, &again, Assembler::NonZero, ShortJump);

    masm.memoryBarrierAfter(sync);
    masm.bind(&end);

    return;
  }

  masm.andi(offsetTemp, scratch2, 3);
  masm.subPtr(offsetTemp, scratch2);
#if !MOZ_LITTLE_ENDIAN()
  masm.as_xori(offsetTemp, offsetTemp, 3);
#endif
  masm.slli(offsetTemp, offsetTemp, 3);
  masm.ma_li(maskTemp, Imm32(UINT32_MAX >> ((4 - nbytes) * 8)));
  masm.sll(maskTemp, maskTemp, offsetTemp);
  masm.not_(maskTemp, maskTemp);

  masm.memoryBarrierBefore(sync);

  masm.bind(&again);

  if (access) {
    masm.append(*access, wasm::TrapMachineInsn::Atomic,
                FaultingCodeOffset(masm.currentOffset()));
  }

  masm.lr_w(true, true, scratch1, scratch2);

  masm.srl(output, scratch1, offsetTemp);

  switch (nbytes) {
    case 1:
      if (signExtend) {
        masm.SignExtendByte(valueTemp, oldval);
        masm.SignExtendByte(output, output);
        masm.SignExtendByte(newval, newval);
      } else {
        masm.andi(valueTemp, oldval, 0xff);
        masm.andi(output, output, 0xff);
        masm.andi(newval, newval, 0xff);
      }
      break;
    case 2:
      if (signExtend) {
        masm.SignExtendShort(valueTemp, oldval);
        masm.SignExtendShort(output, output);
        masm.SignExtendShort(newval, newval);
      } else {
        UseScratchRegisterScope temps(&masm);
        Register mask = temps.Acquire();
        masm.ma_li(mask, Imm32(0xffff));
        masm.and_(valueTemp, oldval, mask);
        masm.and_(output, output, mask);
        masm.and_(newval, newval, mask);
      }
      break;
  }

  masm.ma_b(output, valueTemp, &end, Assembler::NotEqual, ShortJump);

  masm.sllw(valueTemp, newval, offsetTemp);
  masm.and_(scratch1, scratch1, maskTemp);
  masm.or_(scratch1, scratch1, valueTemp);
  masm.sc_w(true, true, scratch1, scratch2, scratch1);

  masm.ma_b(scratch1, scratch1, &again, Assembler::NonZero, ShortJump);

  masm.memoryBarrierAfter(sync);

  masm.bind(&end);
}

void MacroAssembler::compareExchange(Scalar::Type type, Synchronization sync,
                                     const Address& mem, Register oldval,
                                     Register newval, Register valueTemp,
                                     Register offsetTemp, Register maskTemp,
                                     Register output) {
  CompareExchange(*this, nullptr, type, sync, mem, oldval, newval, valueTemp,
                  offsetTemp, maskTemp, output);
}

void MacroAssembler::compareExchange(Scalar::Type type, Synchronization sync,
                                     const BaseIndex& mem, Register oldval,
                                     Register newval, Register valueTemp,
                                     Register offsetTemp, Register maskTemp,
                                     Register output) {
  CompareExchange(*this, nullptr, type, sync, mem, oldval, newval, valueTemp,
                  offsetTemp, maskTemp, output);
}

void MacroAssembler::wasmCompareExchange(const wasm::MemoryAccessDesc& access,
                                         const Address& mem, Register oldval,
                                         Register newval, Register valueTemp,
                                         Register offsetTemp, Register maskTemp,
                                         Register output) {
  CompareExchange(*this, &access, access.type(), access.sync(), mem, oldval,
                  newval, valueTemp, offsetTemp, maskTemp, output);
}

void MacroAssembler::wasmCompareExchange(const wasm::MemoryAccessDesc& access,
                                         const BaseIndex& mem, Register oldval,
                                         Register newval, Register valueTemp,
                                         Register offsetTemp, Register maskTemp,
                                         Register output) {
  CompareExchange(*this, &access, access.type(), access.sync(), mem, oldval,
                  newval, valueTemp, offsetTemp, maskTemp, output);
}

void MacroAssembler::wasmLoad(const wasm::MemoryAccessDesc& access,
                              Register memoryBase, Register ptr,
                              Register ptrScratch, AnyRegister output) {
  wasmLoadImpl(access, memoryBase, ptr, ptrScratch, output, InvalidReg);
}

void MacroAssembler::wasmLoadI64(const wasm::MemoryAccessDesc& access,
                                 Register memoryBase, Register ptr,
                                 Register ptrScratch, Register64 output) {
  wasmLoadI64Impl(access, memoryBase, ptr, ptrScratch, output, InvalidReg);
}

void MacroAssembler::wasmStore(const wasm::MemoryAccessDesc& access,
                               AnyRegister value, Register memoryBase,
                               Register ptr, Register ptrScratch) {
  wasmStoreImpl(access, value, memoryBase, ptr, ptrScratch, InvalidReg);
}

void MacroAssembler::wasmStoreI64(const wasm::MemoryAccessDesc& access,
                                  Register64 value, Register memoryBase,
                                  Register ptr, Register ptrScratch) {
  wasmStoreI64Impl(access, value, memoryBase, ptr, ptrScratch, InvalidReg);
}

void MacroAssemblerRiscv64::Clear_if_nan_d(Register rd, FPURegister fs) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();

  feq_d(scratch, fs, fs);
  neg(scratch, scratch);
  and_(rd, rd, scratch);
}

void MacroAssemblerRiscv64::Clear_if_nan_s(Register rd, FPURegister fs) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();

  feq_s(scratch, fs, fs);
  neg(scratch, scratch);
  and_(rd, rd, scratch);
}

void MacroAssembler::wasmTruncateDoubleToInt32(FloatRegister input,
                                               Register output,
                                               bool isSaturating,
                                               Label* oolEntry) {
  if (isSaturating) {
    Trunc_w_d(output, input);
    Clear_if_nan_d(output, input);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    Trunc_l_d(output, input);

    // Sign extend lower 32 bits to test if the result isn't an Int32.
    move32SignExtendToPtr(output, scratch);
    branchPtr(Assembler::NotEqual, output, scratch, oolEntry);
  }
}

void MacroAssembler::wasmTruncateDoubleToInt64(
    FloatRegister input, Register64 output, bool isSaturating, Label* oolEntry,
    Label* oolRejoin, FloatRegister tempDouble) {
  if (isSaturating) {
    Trunc_l_d(output.reg, input);
    Clear_if_nan_d(output.reg, input);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    Trunc_l_d(output.reg, input, scratch);
    ma_b(scratch, Imm32(0), oolEntry, Assembler::Equal);
  }
}

void MacroAssembler::wasmTruncateDoubleToUInt32(FloatRegister input,
                                                Register output,
                                                bool isSaturating,
                                                Label* oolEntry) {
  if (isSaturating) {
    Trunc_uw_d(output, input);
    Clear_if_nan_d(output, input);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    Trunc_uw_d(output, input, scratch);
    ma_b(scratch, Imm32(0), oolEntry, Assembler::Equal);
  }
}

void MacroAssembler::wasmTruncateDoubleToUInt64(
    FloatRegister input, Register64 output, bool isSaturating, Label* oolEntry,
    Label* oolRejoin, FloatRegister tempDouble) {
  if (isSaturating) {
    Trunc_ul_d(output.reg, input);
    Clear_if_nan_d(output.reg, input);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    Trunc_ul_d(output.reg, input, scratch);
    ma_b(scratch, Imm32(0), oolEntry, Assembler::Equal);
  }
}

void MacroAssembler::wasmTruncateFloat32ToInt32(FloatRegister input,
                                                Register output,
                                                bool isSaturating,
                                                Label* oolEntry) {
  if (isSaturating) {
    Trunc_w_s(output, input);
    Clear_if_nan_s(output, input);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    Trunc_l_s(output, input, scratch);

    // Sign extend lower 32 bits to test if the result isn't an Int32.
    move32SignExtendToPtr(output, scratch);
    branchPtr(Assembler::NotEqual, output, scratch, oolEntry);
  }
}

void MacroAssembler::wasmTruncateFloat32ToInt64(
    FloatRegister input, Register64 output, bool isSaturating, Label* oolEntry,
    Label* oolRejoin, FloatRegister tempFloat) {
  if (isSaturating) {
    Trunc_l_s(output.reg, input);
    Clear_if_nan_s(output.reg, input);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    Trunc_l_s(output.reg, input, scratch);
    ma_b(scratch, Imm32(0), oolEntry, Assembler::Equal);
  }
}

void MacroAssembler::wasmTruncateFloat32ToUInt32(FloatRegister input,
                                                 Register output,
                                                 bool isSaturating,
                                                 Label* oolEntry) {
  if (isSaturating) {
    Trunc_uw_s(output, input);
    Clear_if_nan_s(output, input);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    Trunc_uw_s(output, input, scratch);
    ma_b(scratch, Imm32(0), oolEntry, Assembler::Equal);
  }
}

void MacroAssembler::wasmTruncateFloat32ToUInt64(
    FloatRegister input, Register64 output, bool isSaturating, Label* oolEntry,
    Label* oolRejoin, FloatRegister tempFloat) {
  if (isSaturating) {
    Trunc_ul_s(output.reg, input);
    Clear_if_nan_s(output.reg, input);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    Trunc_ul_s(output.reg, input, scratch);
    ma_b(scratch, Imm32(0), oolEntry, Assembler::Equal);
  }
}

// TODO(riscv64): widenInt32 should be nop?
void MacroAssembler::widenInt32(Register r) {
  move32To64SignExtend(r, Register64(r));
}

void MacroAssembler::wasmMarkCallAsSlow() { mv(ra, ra); }

const int32_t SlowCallMarker = 0x8093;  // addi ra, ra, 0

void MacroAssembler::wasmCheckSlowCallsite(Register ra_, Label* notSlow,
                                           Register temp1, Register temp2) {
  MOZ_ASSERT(ra_ != temp2);

  UseScratchRegisterScope temps(*this);
  // temp1 aliases ra_, so allocating a new register.
  const Register scratchMarker = temps.Acquire();
  move32(Imm32(SlowCallMarker), scratchMarker);

  Label slow;
  // Handle `jalr; (ra_ here) marker`.
  load32(Address(ra_, 0), temp2);
  branch32(Assembler::Equal, temp2, scratchMarker, &slow);
  // Handle `jal; (ra_ here) nop; marker`.
  // See also: AssemblerRISCVI::jal(Register rd, int32_t imm21); Bug 1996840
  branch32(Assembler::NotEqual, temp2, Imm32(kNopByte), notSlow);
  load32(Address(ra_, 4), temp2);
  branch32(Assembler::NotEqual, temp2, scratchMarker, notSlow);
  bind(&slow);
}

CodeOffset MacroAssembler::wasmMarkedSlowCall(const wasm::CallSiteDesc& desc,
                                              const Register reg) {
  BlockTrampolinePoolScope block_trampoline_pool(this, 2);
  CodeOffset offset = call(desc, reg);
  wasmMarkCallAsSlow();
  return offset;
}
//}}} check_macroassembler_style

// This method generates lui, dsll and ori instruction block that can be
// modified by UpdateLoad64Value, either during compilation (eg.
// Assembler::bind), or during execution (eg. jit::PatchJump).
void MacroAssemblerRiscv64::ma_liPatchable(Register dest, Imm32 imm) {
  m_buffer.ensureSpace(2 * sizeof(uint32_t));
  int64_t value = imm.value;
  int64_t high_20 = ((value + 0x800) >> 12);
  int64_t low_12 = value << 52 >> 52;
  lui(dest, high_20);
  addi(dest, dest, low_12);
}

void MacroAssemblerRiscv64::ma_liPatchable(Register dest, ImmPtr imm) {
  return ma_liPatchable(dest, ImmWord(uintptr_t(imm.value)));
}

void MacroAssemblerRiscv64::ma_liPatchable(Register dest, ImmWord imm,
                                           LiFlags flags) {
  DEBUG_PRINTF("\tma_liPatchable\n");
  if (Li64 == flags) {
    li_constant(dest, imm.value);
  } else {
    li_ptr(dest, imm.value);
  }
}

void MacroAssemblerRiscv64::ma_li(Register dest, ImmGCPtr ptr) {
  BlockTrampolinePoolScope block_trampoline_pool(this, 6);
  writeDataRelocation(ptr);
  ma_liPatchable(dest, ImmPtr(ptr.value));
}
void MacroAssemblerRiscv64::ma_li(Register dest, Imm32 imm) {
  RV_li(dest, imm.value);
}
void MacroAssemblerRiscv64::ma_li(Register dest, Imm64 imm) {
  RV_li(dest, imm.value);
}
void MacroAssemblerRiscv64::ma_li(Register dest, CodeLabel* label) {
  DEBUG_PRINTF("[ %s\n", __FUNCTION__);
  BlockTrampolinePoolScope block_trampoline_pool(this, 7);
  BufferOffset bo = m_buffer.nextOffset();
  JitSpew(JitSpew_Codegen, ".load CodeLabel %p", label);
  ma_liPatchable(dest, ImmWord(/* placeholder */ 0));
  label->patchAt()->bind(bo.getOffset());
  label->setLinkMode(CodeLabel::MoveImmediate);
  DEBUG_PRINTF("]\n");
}
void MacroAssemblerRiscv64::ma_li(Register dest, ImmWord imm) {
  RV_li(dest, imm.value);
}

// Shortcut for when we know we're transferring 32 bits of data.
void MacroAssemblerRiscv64::ma_pop(Register r) {
  ld(r, StackPointer, 0);
  addi(StackPointer, StackPointer, sizeof(intptr_t));
}

void MacroAssemblerRiscv64::ma_push(Register r) {
  UseScratchRegisterScope temps(this);
  if (r == sp) {
    Register scratch = temps.Acquire();
    // Pushing sp requires one more instruction.
    mv(scratch, sp);
    r = scratch;
  }

  addi(StackPointer, StackPointer, (int32_t)-sizeof(intptr_t));
  sd(r, StackPointer, 0);
}

void MacroAssemblerRiscv64::ma_mul32TestOverflow(Register rd, Register rj,
                                                 Register rk, Label* overflow) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  MOZ_ASSERT(rd != scratch);

  mul(rd, rj, rk);
  sext_w(scratch, rd);
  ma_b(scratch, rd, overflow, Assembler::NotEqual);
}
void MacroAssemblerRiscv64::ma_mul32TestOverflow(Register rd, Register rj,
                                                 Imm32 imm, Label* overflow) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  MOZ_ASSERT(rd != scratch && rj != scratch);

  ma_li(scratch, imm);

  mul(rd, rj, scratch);
  sext_w(scratch, rd);
  ma_b(scratch, rd, overflow, Assembler::NotEqual);
}

void MacroAssemblerRiscv64::ma_mulPtrTestOverflow(Register rd, Register rj,
                                                  Register rk,
                                                  Label* overflow) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  Register scratch2 = temps.Acquire();
  MOZ_ASSERT(rd != scratch);

  if (rd == rj) {
    or_(scratch, rj, zero);
    rj = scratch;
    rk = (rd == rk) ? rj : rk;
  } else if (rd == rk) {
    or_(scratch, rk, zero);
    rk = scratch;
  }

  mul(rd, rj, rk);
  mulh(scratch, rj, rk);
  srai(scratch2, rd, 63);
  ma_b(scratch, Register(scratch2), overflow, Assembler::NotEqual);
}

int32_t MacroAssemblerRiscv64::GetOffset(int32_t offset, Label* L,
                                         OffsetSize bits) {
  if (L) {
    offset = branchOffsetHelper(L, bits);
  } else {
    MOZ_ASSERT(is_intn(offset, bits));
  }
  return offset;
}

bool MacroAssemblerRiscv64::CalculateOffset(Label* L, OffsetSize bits,
                                            int32_t* offset) {
  if (!is_near(L, bits)) return false;
  *offset = GetOffset(*offset, L, bits);
  return true;
}

void MacroAssemblerRiscv64::BranchShortHelper(int32_t offset, Label* L) {
  MOZ_ASSERT(L == nullptr || offset == 0);
  BlockTrampolinePoolScope block_trampoline_pool(this, 2, 1);
  offset = GetOffset(offset, L, OffsetSize::kOffset21);
  Assembler::j(offset);
}

bool MacroAssemblerRiscv64::BranchShortHelper(int32_t offset, Label* L,
                                              Condition cond, Register rs,
                                              const Operand& rt) {
  MOZ_ASSERT(L == nullptr || offset == 0);
  MOZ_ASSERT(rt.is_reg() || rt.is_imm());
  UseScratchRegisterScope temps(this);
  Register scratch = Register();
  if (rt.is_imm()) {
    if (rt.immediate() == 0) {
      scratch = zero;
    } else {
      scratch = temps.Acquire();
      ma_li(scratch, Imm64(rt.immediate()));
    }
  } else {
    MOZ_ASSERT(rt.is_reg());
    scratch = rt.rm();
  }
  {
    BlockTrampolinePoolScope block_trampoline_pool(this, 2, 1);
    switch (cond) {
      case Always:
        if (!CalculateOffset(L, OffsetSize::kOffset21, &offset)) return false;
        Assembler::j(offset);
        break;
      case Equal:
        // rs == rt
        if (rt.is_reg() && rs == rt.rm()) {
          if (!CalculateOffset(L, OffsetSize::kOffset21, &offset)) return false;
          Assembler::j(offset);
        } else {
          if (!CalculateOffset(L, OffsetSize::kOffset13, &offset)) return false;
          Assembler::beq(rs, scratch, offset);
        }
        break;
      case NotEqual:
        // rs != rt
        if (rt.is_reg() && rs == rt.rm()) {
          break;  // No code needs to be emitted
        } else {
          if (!CalculateOffset(L, OffsetSize::kOffset13, &offset)) return false;
          Assembler::bne(rs, scratch, offset);
        }
        break;

      // Signed comparison.
      case GreaterThan:
        // rs > rt
        if (rt.is_reg() && rs == rt.rm()) {
          break;  // No code needs to be emitted.
        } else {
          if (!CalculateOffset(L, OffsetSize::kOffset13, &offset)) return false;
          Assembler::bgt(rs, scratch, offset);
        }
        break;
      case GreaterThanOrEqual:
        // rs >= rt
        if (rt.is_reg() && rs == rt.rm()) {
          if (!CalculateOffset(L, OffsetSize::kOffset21, &offset)) return false;
          Assembler::j(offset);
        } else {
          if (!CalculateOffset(L, OffsetSize::kOffset13, &offset)) return false;
          Assembler::bge(rs, scratch, offset);
        }
        break;
      case LessThan:
        // rs < rt
        if (rt.is_reg() && rs == rt.rm()) {
          break;  // No code needs to be emitted.
        } else {
          if (!CalculateOffset(L, OffsetSize::kOffset13, &offset)) return false;
          Assembler::blt(rs, scratch, offset);
        }
        break;
      case LessThanOrEqual:
        // rs <= rt
        if (rt.is_reg() && rs == rt.rm()) {
          if (!CalculateOffset(L, OffsetSize::kOffset21, &offset)) return false;
          Assembler::j(offset);
        } else {
          if (!CalculateOffset(L, OffsetSize::kOffset13, &offset)) return false;
          Assembler::ble(rs, scratch, offset);
        }
        break;

      // Unsigned comparison.
      case Above:
        // rs > rt
        if (rt.is_reg() && rs == rt.rm()) {
          break;  // No code needs to be emitted.
        } else {
          if (!CalculateOffset(L, OffsetSize::kOffset13, &offset)) return false;
          Assembler::bgtu(rs, scratch, offset);
        }
        break;
      case AboveOrEqual:
        // rs >= rt
        if (rt.is_reg() && rs == rt.rm()) {
          if (!CalculateOffset(L, OffsetSize::kOffset21, &offset)) return false;
          Assembler::j(offset);
        } else {
          if (!CalculateOffset(L, OffsetSize::kOffset13, &offset)) return false;
          Assembler::bgeu(rs, scratch, offset);
        }
        break;
      case Below:
        // rs < rt
        if (rt.is_reg() && rs == rt.rm()) {
          break;  // No code needs to be emitted.
        } else {
          if (!CalculateOffset(L, OffsetSize::kOffset13, &offset)) return false;
          bltu(rs, scratch, offset);
        }
        break;
      case BelowOrEqual:
        // rs <= rt
        if (rt.is_reg() && rs == rt.rm()) {
          if (!CalculateOffset(L, OffsetSize::kOffset21, &offset)) return false;
          Assembler::j(offset);
        } else {
          if (!CalculateOffset(L, OffsetSize::kOffset13, &offset)) return false;
          Assembler::bleu(rs, scratch, offset);
        }
        break;
      default:
        MOZ_CRASH("UNREACHABLE");
    }
  }
  return true;
}

// BRANCH_ARGS_CHECK checks that conditional jump arguments are correct.
#define BRANCH_ARGS_CHECK(cond, rs, rt)                           \
  MOZ_ASSERT((cond == Always && rs == zero && rt.rm() == zero) || \
             (cond != Always && (rs != zero || rt.rm() != zero)))

bool MacroAssemblerRiscv64::BranchShortCheck(int32_t offset, Label* L,
                                             Condition cond, Register rs,
                                             const Operand& rt) {
  BRANCH_ARGS_CHECK(cond, rs, rt);

  if (!L) {
    MOZ_ASSERT(is_int13(offset));
    return BranchShortHelper(offset, nullptr, cond, rs, rt);
  } else {
    MOZ_ASSERT(offset == 0);
    return BranchShortHelper(0, L, cond, rs, rt);
  }
}

void MacroAssemblerRiscv64::BranchShort(Label* L) { BranchShortHelper(0, L); }

bool MacroAssemblerRiscv64::BranchShort(int32_t offset, Condition cond,
                                        Register rs, const Operand& rt) {
  return BranchShortCheck(offset, nullptr, cond, rs, rt);
}

bool MacroAssemblerRiscv64::BranchShort(Label* L, Condition cond, Register rs,
                                        const Operand& rt) {
  return BranchShortCheck(0, L, cond, rs, rt);
}

void MacroAssemblerRiscv64::BranchLong(Label* L) {
  // Generate position independent long branch.
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  int32_t imm = branchLongOffsetHelper(L);
  GenPCRelativeJump(scratch, imm);
}

CodeOffset MacroAssemblerRiscv64::BranchAndLinkLong(Label* L) {
  // Generate position independent long branch and link.
  int32_t imm = branchLongOffsetHelper(L);
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  GenPCRelativeJumpAndLink(scratch, imm);
  return CodeOffset(currentOffset());
}

void MacroAssemblerRiscv64::ma_branch(Label* L, Condition cond, Register rs,
                                      const Operand& rt, JumpKind jumpKind) {
  // Always prefer short jumps when the label is already bound. (If the label is
  // bound, BranchShort can cheaply determine if short jumps are possible.)
  if (L->bound()) {
    jumpKind = ShortJump;
  }

  if (jumpKind == ShortJump && BranchShort(L, cond, rs, rt)) {
    return;
  }

  if (cond != Always) {
    Label skip;
    Condition neg_cond = InvertCondition(cond);
    MOZ_ALWAYS_TRUE(
        BranchShort(&skip, neg_cond, rs, rt));  // Guaranteed to be short.
    BranchLong(L);
    bind(&skip);
  } else {
    BranchLong(L);
  }
}

// Branches when done from within riscv code.
void MacroAssemblerRiscv64::ma_b(Register lhs, Address addr, Label* label,
                                 Condition c, JumpKind jumpKind) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  MOZ_ASSERT(lhs != scratch);
  ma_load(scratch, addr, SizeDouble);
  ma_b(lhs, Register(scratch), label, c, jumpKind);
}

void MacroAssemblerRiscv64::ma_b(Register lhs, ImmPtr imm, Label* l,
                                 Condition c, JumpKind jumpKind) {
  ma_b(lhs, ImmWord(uintptr_t(imm.value)), l, c, jumpKind);
}

// Branches when done from within riscv code.
void MacroAssemblerRiscv64::ma_b(Register lhs, ImmWord imm, Label* label,
                                 Condition c, JumpKind jumpKind) {
  switch (c) {
    case Always:
      ma_branch(label, c, zero, Operand(zero), jumpKind);
      break;
    case Zero:
    case NonZero:
    case Signed:
    case NotSigned:
      MOZ_ASSERT(imm.value == 0);
      ma_b(lhs, lhs, label, c, jumpKind);
      break;
    default:
      ma_branch(label, c, lhs, Operand(imm.value), jumpKind);
      break;
  }
}

void MacroAssemblerRiscv64::ma_b(Register lhs, Imm32 imm, Label* label,
                                 Condition c, JumpKind jumpKind) {
  switch (c) {
    case Always:
      ma_branch(label, c, zero, Operand(zero), jumpKind);
      break;
    case Zero:
    case NonZero:
    case Signed:
    case NotSigned:
      MOZ_ASSERT(imm.value == 0);
      ma_b(lhs, lhs, label, c, jumpKind);
      break;
    default:
      ma_branch(label, c, lhs, Operand(imm.value), jumpKind);
      break;
  }
}

void MacroAssemblerRiscv64::ma_b(Address addr, Imm32 imm, Label* label,
                                 Condition c, JumpKind jumpKind) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  ma_load(scratch2, addr);
  ma_b(Register(scratch2), imm, label, c, jumpKind);
}

void MacroAssemblerRiscv64::ma_b(Register lhs, Register rhs, Label* label,
                                 Condition c, JumpKind jumpKind) {
  switch (c) {
    case Always:
      ma_branch(label, c, zero, Operand(zero), jumpKind);
      break;
    case Zero:
      MOZ_ASSERT(lhs == rhs);
      ma_branch(label, Equal, lhs, Operand(zero), jumpKind);
      break;
    case NonZero:
      MOZ_ASSERT(lhs == rhs);
      ma_branch(label, NotEqual, lhs, Operand(zero), jumpKind);
      break;
    case Signed:
      MOZ_ASSERT(lhs == rhs);
      ma_branch(label, LessThan, lhs, Operand(zero), jumpKind);
      break;
    case NotSigned:
      MOZ_ASSERT(lhs == rhs);
      ma_branch(label, GreaterThanOrEqual, lhs, Operand(zero), jumpKind);
      break;
    default:
      ma_branch(label, c, lhs, rhs, jumpKind);
      break;
  }
}

void MacroAssemblerRiscv64::ExtractBits(Register rt, Register rs, uint16_t pos,
                                        uint16_t size, bool sign_extend) {
#if JS_CODEGEN_RISCV64
  constexpr uint16_t MaxBits = 64;
#elif JS_CODEGEN_RISCV32
  constexpr uint16_t MaxBits = 32;
#endif

  MOZ_ASSERT(pos < MaxBits);
  MOZ_ASSERT(size > 0);
  MOZ_ASSERT(size <= MaxBits);
  MOZ_ASSERT((pos + size) > 0);
  MOZ_ASSERT((pos + size) <= MaxBits);

  Register src;
  if (uint16_t shift = MaxBits - (pos + size)) {
    slli(rt, rs, shift);
    src = rt;
  } else {
    src = rs;
  }

  if (sign_extend) {
    srai(rt, src, MaxBits - size);
  } else {
    srli(rt, src, MaxBits - size);
  }
}

void MacroAssemblerRiscv64::InsertBits(Register dest, Register source, int pos,
                                       int size) {
#if JS_CODEGEN_RISCV64
  MOZ_ASSERT(size < 64);
#elif JS_CODEGEN_RISCV32
  MOZ_ASSERT(size < 32);
#endif
  UseScratchRegisterScope temps(this);
  BlockTrampolinePoolScope block_trampoline_pool(this, 9);
  Register source_ = temps.Acquire();
  if (pos != 0) {
    Register mask = temps.Acquire();
    // Create a mask of the length=size.
    ma_li(mask, Imm32(1));
    slli(mask, mask, size);
    addi(mask, mask, -1);
    and_(source_, mask, source);
    slli(source_, source_, pos);
    // Make a mask containing 0's. 0's start at "pos" with length=size.
    slli(mask, mask, pos);
    not_(mask, mask);
    // cut area for insertion of source.
    and_(dest, mask, dest);
  } else {
    // clear top bits from source and bottom bits from dest.
    slli(source_, source, 64 - size);
    srli(source_, source_, 64 - size);
    srli(dest, dest, size);
    slli(dest, dest, size);
  }
  // insert source
  or_(dest, dest, source_);
}

void MacroAssemblerRiscv64::InsertBits(Register dest, Register source,
                                       Register pos, int size) {
#if JS_CODEGEN_RISCV64
  MOZ_ASSERT(size < 64);
#elif JS_CODEGEN_RISCV32
  MOZ_ASSERT(size < 32);
#endif
  UseScratchRegisterScope temps(this);
  Register mask = temps.Acquire();
  BlockTrampolinePoolScope block_trampoline_pool(this, 9);
  Register source_ = temps.Acquire();
  // Create a mask of the length=size.
  ma_li(mask, Imm32(1));
  slli(mask, mask, size);
  addi(mask, mask, -1);
  and_(source_, mask, source);
  sll(source_, source_, pos);
  // Make a mask containing 0's. 0's start at "pos" with length=size.
  sll(mask, mask, pos);
  not_(mask, mask);
  // cut area for insertion of source.
  and_(dest, mask, dest);
  // insert source
  or_(dest, dest, source_);
}

void MacroAssemblerRiscv64::ma_add32(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    if (is_int12(rt.immediate())) {
      addiw(rd, rs, static_cast<int32_t>(rt.immediate()));
    } else if ((-4096 <= rt.immediate() && rt.immediate() <= -2049) ||
               (2048 <= rt.immediate() && rt.immediate() <= 4094)) {
      addiw(rd, rs, rt.immediate() / 2);
      addiw(rd, rd, rt.immediate() - (rt.immediate() / 2));
    } else {
      // li handles the relocation.
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      BlockTrampolinePoolScope block_trampoline_pool(this, 9);
      ma_li(scratch, rt.immediate());
      addw(rd, rs, scratch);
    }
  } else {
    MOZ_ASSERT(rt.is_reg());
    addw(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_add64(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    if (is_int12(rt.immediate())) {
      addi(rd, rs, static_cast<int32_t>(rt.immediate()));
    } else if ((-4096 <= rt.immediate() && rt.immediate() <= -2049) ||
               (2048 <= rt.immediate() && rt.immediate() <= 4094)) {
      addi(rd, rs, rt.immediate() / 2);
      addi(rd, rd, rt.immediate() - (rt.immediate() / 2));
    } else {
      // li handles the relocation.
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      BlockTrampolinePoolScope block_trampoline_pool(this, 9);
      ma_li(scratch, rt.immediate());
      add(rd, rs, scratch);
    }
  } else {
    MOZ_ASSERT(rt.is_reg());
    add(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_sub32(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    if (is_int12(-rt.immediate())) {
      addiw(rd, rs,
            static_cast<int32_t>(
                -rt.immediate()));  // No subi instr, use addi(x, y, -imm).
    } else if ((-4096 <= -rt.immediate() && -rt.immediate() <= -2049) ||
               (2048 <= -rt.immediate() && -rt.immediate() <= 4094)) {
      addiw(rd, rs, -rt.immediate() / 2);
      addiw(rd, rd, -rt.immediate() - (-rt.immediate() / 2));
    } else {
      // li handles the relocation.
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      ma_li(scratch, rt.immediate());
      subw(rd, rs, scratch);
    }
  } else {
    MOZ_ASSERT(rt.is_reg());
    subw(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_sub64(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    if (is_int12(-rt.immediate())) {
      addi(rd, rs,
           static_cast<int32_t>(
               -rt.immediate()));  // No subi instr, use addi(x, y, -imm).
    } else if ((-4096 <= -rt.immediate() && -rt.immediate() <= -2049) ||
               (2048 <= -rt.immediate() && -rt.immediate() <= 4094)) {
      addi(rd, rs, -rt.immediate() / 2);
      addi(rd, rd, -rt.immediate() - (-rt.immediate() / 2));
    } else {
      // li handles the relocation.
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      ma_li(scratch, rt.immediate());
      sub(rd, rs, scratch);
    }
  } else {
    MOZ_ASSERT(rt.is_reg());
    sub(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_and(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    if (is_int12(rt.immediate())) {
      andi(rd, rs, rt.immediate());
    } else {
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      ma_li(scratch, rt.immediate());
      and_(rd, rs, scratch);
    }
  } else {
    MOZ_ASSERT(rt.is_reg());
    and_(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_or(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    if (is_int12(rt.immediate())) {
      ori(rd, rs, rt.immediate());
    } else {
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      ma_li(scratch, rt.immediate());
      or_(rd, rs, scratch);
    }
  } else {
    MOZ_ASSERT(rt.is_reg());
    or_(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_xor(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    if (is_int12(rt.immediate())) {
      xori(rd, rs, rt.immediate());
    } else {
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      ma_li(scratch, rt.immediate());
      xor_(rd, rs, scratch);
    }
  } else {
    MOZ_ASSERT(rt.is_reg());
    xor_(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_nor(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    nor(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    nor(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_div32(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    divw(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    divw(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_divu32(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    divuw(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    divuw(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_div64(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    div(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    div(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_divu64(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    divu(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    divu(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_mod32(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    remw(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    remw(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_modu32(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    remuw(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    remuw(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_mod64(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    rem(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    rem(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_modu64(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    remu(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    remu(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_mul32(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    mulw(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    mulw(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_mulh32(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    mul(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    mul(rd, rs, rt.rm());
  }
  srai(rd, rd, 32);
}

void MacroAssemblerRiscv64::ma_mul64(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    mul(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    mul(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_mulh64(Register rd, Register rs, Operand rt) {
  if (rt.is_imm()) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, rt.immediate());
    mulh(rd, rs, scratch);
  } else {
    MOZ_ASSERT(rt.is_reg());
    mulh(rd, rs, rt.rm());
  }
}

void MacroAssemblerRiscv64::ma_sll64(Register rd, Register rs, Operand rt) {
  if (rt.is_reg()) {
    sll(rd, rs, rt.rm());
  } else {
    MOZ_ASSERT(rt.is_imm());
    uint8_t shamt = static_cast<uint8_t>(rt.immediate());
    slli(rd, rs, shamt);
  }
}

void MacroAssemblerRiscv64::ma_sll32(Register rd, Register rs, Operand rt) {
  if (rt.is_reg()) {
    sllw(rd, rs, rt.rm());
  } else {
    MOZ_ASSERT(rt.is_imm());
    uint8_t shamt = static_cast<uint8_t>(rt.immediate());
    slliw(rd, rs, shamt);
  }
}

void MacroAssemblerRiscv64::ma_sra64(Register rd, Register rs, Operand rt) {
  if (rt.is_reg()) {
    sra(rd, rs, rt.rm());
  } else {
    MOZ_ASSERT(rt.is_imm());
    uint8_t shamt = static_cast<uint8_t>(rt.immediate());
    srai(rd, rs, shamt);
  }
}

void MacroAssemblerRiscv64::ma_sra32(Register rd, Register rs, Operand rt) {
  if (rt.is_reg()) {
    sraw(rd, rs, rt.rm());
  } else {
    MOZ_ASSERT(rt.is_imm());
    uint8_t shamt = static_cast<uint8_t>(rt.immediate());
    sraiw(rd, rs, shamt);
  }
}

void MacroAssemblerRiscv64::ma_srl64(Register rd, Register rs, Operand rt) {
  if (rt.is_reg()) {
    srl(rd, rs, rt.rm());
  } else {
    MOZ_ASSERT(rt.is_imm());
    uint8_t shamt = static_cast<uint8_t>(rt.immediate());
    srli(rd, rs, shamt);
  }
}

void MacroAssemblerRiscv64::ma_srl32(Register rd, Register rs, Operand rt) {
  if (rt.is_reg()) {
    srlw(rd, rs, rt.rm());
  } else {
    MOZ_ASSERT(rt.is_imm());
    uint8_t shamt = static_cast<uint8_t>(rt.immediate());
    srliw(rd, rs, shamt);
  }
}

void MacroAssemblerRiscv64::ma_slt(Register rd, Register rs, Operand rt) {
  if (rt.is_reg()) {
    slt(rd, rs, rt.rm());
  } else {
    MOZ_ASSERT(rt.is_imm());
    if (is_int12(rt.immediate())) {
      slti(rd, rs, static_cast<int32_t>(rt.immediate()));
    } else {
      // li handles the relocation.
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      BlockTrampolinePoolScope block_trampoline_pool(this, 9);
      ma_li(scratch, rt.immediate());
      slt(rd, rs, scratch);
    }
  }
}

void MacroAssemblerRiscv64::ma_sltu(Register rd, Register rs, Operand rt) {
  if (rt.is_reg()) {
    sltu(rd, rs, rt.rm());
  } else {
    MOZ_ASSERT(rt.is_imm());
    if (is_int12(rt.immediate())) {
      sltiu(rd, rs, static_cast<int32_t>(rt.immediate()));
    } else {
      // li handles the relocation.
      UseScratchRegisterScope temps(this);
      Register scratch = temps.Acquire();
      BlockTrampolinePoolScope block_trampoline_pool(this, 9);
      ma_li(scratch, rt.immediate());
      sltu(rd, rs, scratch);
    }
  }
}

void MacroAssemblerRiscv64::ma_sle(Register rd, Register rs, Operand rt) {
  if (rt.is_reg()) {
    slt(rd, rt.rm(), rs);
  } else {
    MOZ_ASSERT(rt.is_imm());
    // li handles the relocation.
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    BlockTrampolinePoolScope block_trampoline_pool(this, 9);
    ma_li(scratch, rt.immediate());
    slt(rd, scratch, rs);
  }
  xori(rd, rd, 1);
}

void MacroAssemblerRiscv64::ma_sleu(Register rd, Register rs, Operand rt) {
  if (rt.is_reg()) {
    sltu(rd, rt.rm(), rs);
  } else {
    MOZ_ASSERT(rt.is_imm());
    // li handles the relocation.
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    BlockTrampolinePoolScope block_trampoline_pool(this, 9);
    ma_li(scratch, rt.immediate());
    sltu(rd, scratch, rs);
  }
  xori(rd, rd, 1);
}

void MacroAssemblerRiscv64::ma_sgt(Register rd, Register rs, Operand rt) {
  if (rt.is_reg()) {
    slt(rd, rt.rm(), rs);
  } else {
    MOZ_ASSERT(rt.is_imm());
    // li handles the relocation.
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    BlockTrampolinePoolScope block_trampoline_pool(this, 9);
    ma_li(scratch, rt.immediate());
    slt(rd, scratch, rs);
  }
}

void MacroAssemblerRiscv64::ma_sgtu(Register rd, Register rs, Operand rt) {
  if (rt.is_reg()) {
    sltu(rd, rt.rm(), rs);
  } else {
    MOZ_ASSERT(rt.is_imm());
    // li handles the relocation.
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    BlockTrampolinePoolScope block_trampoline_pool(this, 9);
    ma_li(scratch, rt.immediate());
    sltu(rd, scratch, rs);
  }
}

void MacroAssemblerRiscv64::ma_sge(Register rd, Register rs, Operand rt) {
  ma_slt(rd, rs, rt);
  xori(rd, rd, 1);
}

void MacroAssemblerRiscv64::ma_sgeu(Register rd, Register rs, Operand rt) {
  ma_sltu(rd, rs, rt);
  xori(rd, rd, 1);
}

static inline bool IsZero(const Operand& rt) {
  if (rt.is_reg()) {
    return rt.rm() == zero_reg;
  } else {
    MOZ_ASSERT(rt.is_imm());
    return rt.immediate() == 0;
  }
}

void MacroAssemblerRiscv64::ma_seq(Register rd, Register rs, Operand rt) {
  if (rs == zero_reg) {
    ma_seqz(rd, rt);
  } else if (IsZero(rt)) {
    seqz(rd, rs);
  } else {
    ma_sub64(rd, rs, rt);
    seqz(rd, rd);
  }
}

void MacroAssemblerRiscv64::ma_sne(Register rd, Register rs, Operand rt) {
  if (rs == zero_reg) {
    ma_snez(rd, rt);
  } else if (IsZero(rt)) {
    snez(rd, rs);
  } else {
    ma_sub64(rd, rs, rt);
    snez(rd, rd);
  }
}

void MacroAssemblerRiscv64::ma_seqz(Register rd, const Operand& rt) {
  if (rt.is_reg()) {
    seqz(rd, rt.rm());
  } else {
    ma_li(rd, rt.immediate() == 0);
  }
}

void MacroAssemblerRiscv64::ma_snez(Register rd, const Operand& rt) {
  if (rt.is_reg()) {
    snez(rd, rt.rm());
  } else {
    ma_li(rd, rt.immediate() != 0);
  }
}

void MacroAssemblerRiscv64::ma_neg(Register rd, const Operand& rt) {
  MOZ_ASSERT(rt.is_reg());
  neg(rd, rt.rm());
}

void MacroAssemblerRiscv64::ma_jump(ImmPtr dest) {
  DEBUG_PRINTF("[ %s\n", __FUNCTION__);
  BlockTrampolinePoolScope block_trampoline_pool(this, 8);
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  ma_liPatchable(scratch, dest);
  jr(scratch, 0);
  DEBUG_PRINTF("]\n");
}
// fp instructions
void MacroAssemblerRiscv64::ma_lid(FloatRegister dest, double value) {
  ImmWord imm(mozilla::BitwiseCast<uint64_t>(value));

  if (imm.value != 0) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, imm);
    fmv_d_x(dest, scratch);
  } else {
    fmv_d_x(dest, zero);
  }
}
// fp instructions
void MacroAssemblerRiscv64::ma_lis(FloatRegister dest, float value) {
  Imm32 imm(mozilla::BitwiseCast<uint32_t>(value));

  if (imm.value != 0) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, imm);
    fmv_w_x(dest, scratch);
  } else {
    fmv_w_x(dest, zero);
  }
}

void MacroAssemblerRiscv64::ma_sub32TestOverflow(Register rd, Register rj,
                                                 Register rk, Label* overflow) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  sub(scratch, rj, rk);
  subw(rd, rj, rk);
  ma_b(rd, Register(scratch), overflow, Assembler::NotEqual);
}

void MacroAssemblerRiscv64::ma_sub32TestOverflow(Register rd, Register rj,
                                                 Imm32 imm, Label* overflow) {
  if (imm.value != INT32_MIN) {
    ma_add32TestOverflow(rd, rj, Imm32(-imm.value), overflow);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    MOZ_ASSERT(rj != scratch);
    ma_li(scratch, Imm32(imm.value));
    ma_sub32TestOverflow(rd, rj, scratch, overflow);
  }
}

void MacroAssemblerRiscv64::ma_add32TestOverflow(Register rd, Register rj,
                                                 Register rk, Label* overflow) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  add(scratch, rj, rk);
  addw(rd, rj, rk);
  ma_b(rd, Register(scratch), overflow, Assembler::NotEqual);
}

void MacroAssemblerRiscv64::ma_add32TestOverflow(Register rd, Register rj,
                                                 Imm32 imm, Label* overflow) {
  // Check for signed range because of addi
  if (is_intn(imm.value, 12)) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    addi(scratch, rj, imm.value);
    addiw(rd, rj, imm.value);
    ma_b(rd, scratch, overflow, Assembler::NotEqual);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch2 = temps.Acquire();
    ma_li(scratch2, imm);
    ma_add32TestOverflow(rd, rj, scratch2, overflow);
  }
}

void MacroAssemblerRiscv64::ma_subPtrTestOverflow(Register rd, Register rj,
                                                  Register rk,
                                                  Label* overflow) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  MOZ_ASSERT_IF(rj == rd, rj != rk);
  MOZ_ASSERT(rj != scratch2);
  MOZ_ASSERT(rk != scratch2);
  MOZ_ASSERT(rd != scratch2);

  Register rj_copy = rj;

  if (rj == rd) {
    ma_or(scratch2, rj, zero);
    rj_copy = scratch2;
  }

  {
    Register scratch = temps.Acquire();
    MOZ_ASSERT(rd != scratch);

    sub(rd, rj, rk);
    // If the sign of rj and rk are the same, no overflow
    ma_xor(scratch, rj_copy, rk);
    // Check if the sign of rd and rj are the same
    ma_xor(scratch2, rd, rj_copy);
    ma_and(scratch2, scratch2, scratch);
  }

  ma_b(scratch2, zero, overflow, Assembler::LessThan);
}

void MacroAssemblerRiscv64::ma_addPtrTestOverflow(Register rd, Register rj,
                                                  Register rk,
                                                  Label* overflow) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  MOZ_ASSERT(rd != scratch);

  if (rj == rk) {
    if (rj == rd) {
      ma_or(scratch, rj, zero);
      rj = scratch;
    }

    add(rd, rj, rj);
    ma_xor(scratch, rj, rd);
    ma_b(scratch, zero, overflow, Assembler::LessThan);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch2 = temps.Acquire();
    MOZ_ASSERT(rj != scratch);
    MOZ_ASSERT(rd != scratch2);

    if (rj == rd) {
      ma_or(scratch2, rj, zero);
      rj = scratch2;
    }

    add(rd, rj, rk);
    slti(scratch, rj, 0);
    slt(scratch2, rd, rk);
    ma_b(scratch, Register(scratch2), overflow, Assembler::NotEqual);
  }
}

void MacroAssemblerRiscv64::ma_addPtrTestOverflow(Register rd, Register rj,
                                                  Imm32 imm, Label* overflow) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();

  if (imm.value == 0) {
    ori(rd, rj, 0);
    return;
  }

  if (rj == rd) {
    ori(scratch2, rj, 0);
    rj = scratch2;
  }

  ma_add64(rd, rj, imm);

  if (imm.value > 0) {
    ma_b(rd, rj, overflow, Assembler::LessThan);
  } else {
    MOZ_ASSERT(imm.value < 0);
    ma_b(rd, rj, overflow, Assembler::GreaterThan);
  }
}

void MacroAssemblerRiscv64::ma_addPtrTestOverflow(Register rd, Register rj,
                                                  ImmWord imm,
                                                  Label* overflow) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();

  if (imm.value == 0) {
    ori(rd, rj, 0);
    return;
  }

  if (rj == rd) {
    MOZ_ASSERT(rj != scratch2);
    ori(scratch2, rj, 0);
    rj = scratch2;
  }

  ma_li(rd, imm);
  add(rd, rj, rd);

  if (imm.value > 0) {
    ma_b(rd, rj, overflow, Assembler::LessThan);
  } else {
    MOZ_ASSERT(imm.value < 0);
    ma_b(rd, rj, overflow, Assembler::GreaterThan);
  }
}

void MacroAssemblerRiscv64::ma_add32TestCarry(Condition cond, Register rd,
                                              Register rj, Register rk,
                                              Label* overflow) {
  MOZ_ASSERT(cond == Assembler::CarrySet || cond == Assembler::CarryClear);
  MOZ_ASSERT_IF(rd == rj, rk != rd);
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  addw(rd, rj, rk);
  sltu(scratch, rd, rd == rj ? rk : rj);
  ma_b(Register(scratch), Register(scratch), overflow,
       cond == Assembler::CarrySet ? Assembler::NonZero : Assembler::Zero);
}

void MacroAssemblerRiscv64::ma_add32TestCarry(Condition cond, Register rd,
                                              Register rj, Imm32 imm,
                                              Label* overflow) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  MOZ_ASSERT(rj != scratch2);
  ma_li(scratch2, imm);
  ma_add32TestCarry(cond, rd, rj, scratch2, overflow);
}

void MacroAssemblerRiscv64::ma_subPtrTestOverflow(Register rd, Register rj,
                                                  Imm32 imm, Label* overflow) {
  // TODO(riscv): Check subPtrTestOverflow
  MOZ_ASSERT(imm.value != INT32_MIN);
  ma_addPtrTestOverflow(rd, rj, Imm32(-imm.value), overflow);
}

void MacroAssemblerRiscv64::ma_addPtrTestCarry(Condition cond, Register rd,
                                               Register rj, Register rk,
                                               Label* label) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  MOZ_ASSERT(rd != rk);
  MOZ_ASSERT(rd != scratch);
  add(rd, rj, rk);
  sltu(scratch, rd, rk);
  ma_b(scratch, Register(scratch), label,
       cond == Assembler::CarrySet ? Assembler::NonZero : Assembler::Zero);
}

void MacroAssemblerRiscv64::ma_addPtrTestCarry(Condition cond, Register rd,
                                               Register rj, Imm32 imm,
                                               Label* label) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();

  // Check for signed range because of addi
  if (is_intn(imm.value, 12)) {
    addi(rd, rj, imm.value);
    sltiu(scratch2, rd, imm.value);
    ma_b(scratch2, scratch2, label,
         cond == Assembler::CarrySet ? Assembler::NonZero : Assembler::Zero);
  } else {
    ma_li(scratch2, imm);
    ma_addPtrTestCarry(cond, rd, rj, scratch2, label);
  }
}

void MacroAssemblerRiscv64::ma_addPtrTestCarry(Condition cond, Register rd,
                                               Register rj, ImmWord imm,
                                               Label* label) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();

  // Check for signed range because of addi_d
  if (is_intn(imm.value, 12)) {
    uint32_t value = imm.value;
    addi(rd, rj, value);
    ma_sltu(scratch2, rd, Operand(value));
    ma_b(scratch2, scratch2, label,
         cond == Assembler::CarrySet ? Assembler::NonZero : Assembler::Zero);
  } else {
    ma_li(scratch2, imm);
    ma_addPtrTestCarry(cond, rd, rj, scratch2, label);
  }
}

void MacroAssemblerRiscv64::ma_addPtrTestSigned(Condition cond, Register rd,
                                                Register rj, Register rk,
                                                Label* taken) {
  MOZ_ASSERT(cond == Assembler::Signed || cond == Assembler::NotSigned);

  ma_add64(rd, rj, rk);
  ma_b(rd, rd, taken, cond);
}

void MacroAssemblerRiscv64::ma_addPtrTestSigned(Condition cond, Register rd,
                                                Register rj, Imm32 imm,
                                                Label* taken) {
  MOZ_ASSERT(cond == Assembler::Signed || cond == Assembler::NotSigned);

  ma_add64(rd, rj, imm);
  ma_b(rd, rd, taken, cond);
}

void MacroAssemblerRiscv64::ma_addPtrTestSigned(Condition cond, Register rd,
                                                Register rj, ImmWord imm,
                                                Label* taken) {
  MOZ_ASSERT(cond == Assembler::Signed || cond == Assembler::NotSigned);

  ma_add64(rd, rj, Operand(imm.value));
  ma_b(rd, rd, taken, cond);
}

FaultingCodeOffset MacroAssemblerRiscv64::ma_load(
    Register dest, const BaseIndex& src, LoadStoreSize size,
    LoadStoreExtension extension) {
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  computeScaledAddress(src, scratch2);
  return ma_load(dest, Address(scratch2, src.offset), size, extension);
}
void MacroAssemblerRiscv64::ma_pop(FloatRegister f) {
  if (f.isDouble()) {
    fld(f, StackPointer, 0);
  } else {
    MOZ_ASSERT(f.isSingle(), "simd128 is not supported");
    flw(f, StackPointer, 0);
  }
  // See also MacroAssemblerRiscv64::ma_push -- Free space for double even when
  // storing a float.
  addi(StackPointer, StackPointer, sizeof(double));
}

void MacroAssemblerRiscv64::ma_push(FloatRegister f) {
  // We allocate space for double even when storing a float.
  addi(StackPointer, StackPointer, (int32_t)-sizeof(double));
  if (f.isDouble()) {
    fsd(f, StackPointer, 0);
  } else {
    MOZ_ASSERT(f.isSingle(), "simd128 is not supported");
    fsw(f, StackPointer, 0);
  }
}

FaultingCodeOffset MacroAssemblerRiscv64::ma_fld_s(FloatRegister ft,
                                                   Address address) {
  int32_t offset = address.offset;
  Register base = address.base;

  FaultingCodeOffset fco;
  if (is_intn(offset, 12)) {
    fco = FaultingCodeOffset(currentOffset());
    flw(ft, base, offset);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    MOZ_ASSERT(base != scratch);
    ma_li(scratch, Imm32(offset));
    ma_add64(scratch, base, scratch);
    fco = FaultingCodeOffset(currentOffset());
    flw(ft, scratch, 0);
  }
  return fco;
}
FaultingCodeOffset MacroAssemblerRiscv64::ma_fld_d(FloatRegister ft,
                                                   Address address) {
  int32_t offset = address.offset;
  Register base = address.base;

  FaultingCodeOffset fco;
  if (is_intn(offset, 12)) {
    fco = FaultingCodeOffset(currentOffset());
    fld(ft, base, offset);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    MOZ_ASSERT(base != scratch);
    ma_li(scratch, Imm32(offset));
    ma_add64(scratch, base, scratch);
    fco = FaultingCodeOffset(currentOffset());
    fld(ft, scratch, 0);
  }
  return fco;
}
FaultingCodeOffset MacroAssemblerRiscv64::ma_fst_d(FloatRegister ft,
                                                   Address address) {
  int32_t offset = address.offset;
  Register base = address.base;

  FaultingCodeOffset fco;
  if (is_intn(offset, 12)) {
    fco = FaultingCodeOffset(currentOffset());
    fsd(ft, base, offset);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    MOZ_ASSERT(base != scratch);
    ma_li(scratch, Imm32(offset));
    ma_add64(scratch, base, scratch);
    fco = FaultingCodeOffset(currentOffset());
    fsd(ft, scratch, 0);
  }
  return fco;
}
FaultingCodeOffset MacroAssemblerRiscv64::ma_fst_s(FloatRegister ft,
                                                   Address address) {
  int32_t offset = address.offset;
  Register base = address.base;
  FaultingCodeOffset fco;
  if (is_intn(offset, 12)) {
    fco = FaultingCodeOffset(currentOffset());
    fsw(ft, base, offset);
  } else {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    MOZ_ASSERT(base != scratch);
    ma_li(scratch, Imm32(offset));
    ma_add64(scratch, base, scratch);
    fco = FaultingCodeOffset(currentOffset());
    fsw(ft, scratch, 0);
  }
  return fco;
}

FaultingCodeOffset MacroAssemblerRiscv64::ma_fst_d(FloatRegister ft,
                                                   BaseIndex address) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  computeScaledAddress(address, scratch);
  FaultingCodeOffset fco = FaultingCodeOffset(currentOffset());
  ma_fst_d(ft, Address(scratch, address.offset));
  return fco;
}

FaultingCodeOffset MacroAssemblerRiscv64::ma_fst_s(FloatRegister ft,
                                                   BaseIndex address) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  computeScaledAddress(address, scratch);
  FaultingCodeOffset fco = FaultingCodeOffset(currentOffset());
  ma_fst_s(ft, Address(scratch, address.offset));
  return fco;
}

void MacroAssemblerRiscv64::ma_fld_d(FloatRegister ft, const BaseIndex& src) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  computeScaledAddress(src, scratch);
  ma_fld_d(ft, Address(scratch, src.offset));
}

void MacroAssemblerRiscv64::ma_fld_s(FloatRegister ft, const BaseIndex& src) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  computeScaledAddress(src, scratch);
  ma_fld_s(ft, Address(scratch, src.offset));
}

void MacroAssemblerRiscv64::ma_call(ImmPtr dest) {
  DEBUG_PRINTF("[ %s\n", __FUNCTION__);
  BlockTrampolinePoolScope block_trampoline_pool(this, 8);
  UseScratchRegisterScope temps(this);
  temps.Exclude(GeneralRegisterSet(1 << CallReg.code()));
  ma_liPatchable(CallReg, dest);
  jalr(CallReg, 0);
  DEBUG_PRINTF("]\n");
}

void MacroAssemblerRiscv64::CompareIsNotNanF32(Register rd, FPURegister cmp1,
                                               FPURegister cmp2) {
  feq_s(rd, cmp1, cmp1);  // rd <- !isNan(cmp1)
  if (cmp1 != cmp2) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    feq_s(scratch, cmp2, cmp2);  // scratch <- !isNaN(cmp2)
    ma_and(rd, rd, scratch);     // rd <- !isNan(cmp1) && !isNan(cmp2)
  }
}

void MacroAssemblerRiscv64::CompareIsNotNanF64(Register rd, FPURegister cmp1,
                                               FPURegister cmp2) {
  feq_d(rd, cmp1, cmp1);  // rd <- !isNan(cmp1)
  if (cmp1 != cmp2) {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    feq_d(scratch, cmp2, cmp2);  // scratch <- !isNaN(cmp2)
    ma_and(rd, rd, scratch);     // rd <- !isNan(cmp1) && !isNan(cmp2)
  }
}

void MacroAssemblerRiscv64::CompareIsNanF32(Register rd, FPURegister cmp1,
                                            FPURegister cmp2) {
  CompareIsNotNanF32(rd, cmp1, cmp2);  // rd <- !isNan(cmp1) && !isNan(cmp2)
  ma_xor(rd, rd, Operand(1));          // rd <- isNan(cmp1) || isNan(cmp2)
}

void MacroAssemblerRiscv64::CompareIsNanF64(Register rd, FPURegister cmp1,
                                            FPURegister cmp2) {
  CompareIsNotNanF64(rd, cmp1, cmp2);  // rd <- !isNan(cmp1) && !isNan(cmp2)
  ma_xor(rd, rd, Operand(1));          // rd <- isNan(cmp1) || isNan(cmp2)
}

void MacroAssemblerRiscv64::BranchFloat32(DoubleCondition cc,
                                          FloatRegister frs1,
                                          FloatRegister frs2, Label* L,
                                          JumpKind jumpKind) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  ma_compareF32(scratch, cc, frs1, frs2);
  ma_b(scratch, Imm32(0), L, NotEqual, jumpKind);
}

void MacroAssemblerRiscv64::BranchFloat64(DoubleCondition cc,
                                          FloatRegister frs1,
                                          FloatRegister frs2, Label* L,
                                          JumpKind jumpKind) {
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  ma_compareF64(scratch, cc, frs1, frs2);
  ma_b(scratch, Imm32(0), L, NotEqual, jumpKind);
}

void MacroAssemblerRiscv64::Clz32(Register rd, Register xx) {
  if (HasZbbExtension()) {
#if JS_CODEGEN_RISCV64
    clzw(rd, xx);
#else
    clz(rd, xx);
#endif
    return;
  }

  // 32 bit unsigned in lower word: count number of leading zeros.
  //  int n = 32;
  //  unsigned y;

  //  y = x >>16; if (y != 0) { n = n -16; x = y; }
  //  y = x >> 8; if (y != 0) { n = n - 8; x = y; }
  //  y = x >> 4; if (y != 0) { n = n - 4; x = y; }
  //  y = x >> 2; if (y != 0) { n = n - 2; x = y; }
  //  y = x >> 1; if (y != 0) {rd = n - 2; return;}
  //  rd = n - x;

  Label L0, L1, L2, L3, L4;
  UseScratchRegisterScope temps(this);
  Register x = rd;
  Register y = temps.Acquire();
  Register n = temps.Acquire();
  MOZ_ASSERT(xx != y && xx != n);
  mv(x, xx);
  ma_li(n, Imm32(32));
#if JS_CODEGEN_RISCV64
  srliw(y, x, 16);
  ma_branch(&L0, Equal, y, Operand(zero_reg));
  mv(x, y);
  addiw(n, n, -16);
  bind(&L0);
  srliw(y, x, 8);
  ma_branch(&L1, Equal, y, Operand(zero_reg));
  addiw(n, n, -8);
  mv(x, y);
  bind(&L1);
  srliw(y, x, 4);
  ma_branch(&L2, Equal, y, Operand(zero_reg));
  addiw(n, n, -4);
  mv(x, y);
  bind(&L2);
  srliw(y, x, 2);
  ma_branch(&L3, Equal, y, Operand(zero_reg));
  addiw(n, n, -2);
  mv(x, y);
  bind(&L3);
  srliw(y, x, 1);
  subw(rd, n, x);
  ma_branch(&L4, Equal, y, Operand(zero_reg));
  addiw(rd, n, -2);
  bind(&L4);
#elif JS_CODEGEN_RISCV32
  srli(y, x, 16);
  ma_branch(&L0, Equal, y, Operand(zero_reg));
  mv(x, y);
  addi(n, n, -16);
  bind(&L0);
  srli(y, x, 8);
  ma_branch(&L1, Equal, y, Operand(zero_reg));
  addi(n, n, -8);
  mv(x, y);
  bind(&L1);
  srli(y, x, 4);
  ma_branch(&L2, Equal, y, Operand(zero_reg));
  addi(n, n, -4);
  mv(x, y);
  bind(&L2);
  srli(y, x, 2);
  ma_branch(&L3, Equal, y, Operand(zero_reg));
  addi(n, n, -2);
  mv(x, y);
  bind(&L3);
  srli(y, x, 1);
  sub(rd, n, x);
  ma_branch(&L4, Equal, y, Operand(zero_reg));
  addi(rd, n, -2);
  bind(&L4);
#endif
}

#if JS_CODEGEN_RISCV64
void MacroAssemblerRiscv64::Clz64(Register rd, Register rs) {
  if (HasZbbExtension()) {
    clz(rd, rs);
    return;
  }

  // 64 bit: count number of leading zeros.
  //  int n = 64;
  //  unsigned y;

  //  y = x >>32; if (y != 0) { n = n - 32; x = y; }
  //  y = x >>16; if (y != 0) { n = n - 16; x = y; }
  //  y = x >> 8; if (y != 0) { n = n - 8; x = y; }
  //  y = x >> 4; if (y != 0) { n = n - 4; x = y; }
  //  y = x >> 2; if (y != 0) { n = n - 2; x = y; }
  //  y = x >> 1; if (y != 0) {rd = n - 2; return;}
  //  rd = n - x;

  Label L0, L1, L2, L3, L4, L5;
  UseScratchRegisterScope temps(this);
  Register x = rd;
  Register y = temps.Acquire();
  Register n = temps.Acquire();
  MOZ_ASSERT(rs != y && rs != n);
  mv(x, rs);
  ma_li(n, Imm32(64));
  srli(y, x, 32);
  ma_branch(&L0, Equal, y, Operand(zero_reg));
  addiw(n, n, -32);
  mv(x, y);
  bind(&L0);
  srli(y, x, 16);
  ma_branch(&L1, Equal, y, Operand(zero_reg));
  addiw(n, n, -16);
  mv(x, y);
  bind(&L1);
  srli(y, x, 8);
  ma_branch(&L2, Equal, y, Operand(zero_reg));
  addiw(n, n, -8);
  mv(x, y);
  bind(&L2);
  srli(y, x, 4);
  ma_branch(&L3, Equal, y, Operand(zero_reg));
  addiw(n, n, -4);
  mv(x, y);
  bind(&L3);
  srli(y, x, 2);
  ma_branch(&L4, Equal, y, Operand(zero_reg));
  addiw(n, n, -2);
  mv(x, y);
  bind(&L4);
  srli(y, x, 1);
  subw(rd, n, x);
  ma_branch(&L5, Equal, y, Operand(zero_reg));
  addiw(rd, n, -2);
  bind(&L5);
}
#endif

void MacroAssemblerRiscv64::Ctz32(Register rd, Register rs) {
  if (HasZbbExtension()) {
#if JS_CODEGEN_RISCV64
    ctzw(rd, rs);
#else
    ctz(rd, rs);
#endif
    return;
  }

  // Convert trailing zeroes to trailing ones, and bits to their left
  // to zeroes.

  {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_add64(scratch, rs, Operand(-1));
    ma_xor(rd, scratch, rs);
    ma_and(rd, rd, scratch);
    // Count number of leading zeroes.
  }
  Clz32(rd, rd);
  {
    // Subtract number of leading zeroes from 32 to get number of trailing
    // ones. Remember that the trailing ones were formerly trailing zeroes.
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, Imm32(32));
    ma_sub32(rd, scratch, rd);
  }
}

#if JS_CODEGEN_RISCV64
void MacroAssemblerRiscv64::Ctz64(Register rd, Register rs) {
  if (HasZbbExtension()) {
    ctz(rd, rs);
    return;
  }

  // Convert trailing zeroes to trailing ones, and bits to their left
  // to zeroes.
  {
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_add64(scratch, rs, Operand(-1));
    ma_xor(rd, scratch, rs);
    ma_and(rd, rd, scratch);
    // Count number of leading zeroes.
  }
  Clz64(rd, rd);
  {
    // Subtract number of leading zeroes from 64 to get number of trailing
    // ones. Remember that the trailing ones were formerly trailing zeroes.
    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();
    ma_li(scratch, 64);
    ma_sub64(rd, scratch, rd);
  }
}
#endif

void MacroAssemblerRiscv64::Popcnt32(Register rd, Register rs,
                                     Register scratch) {
  if (HasZbbExtension()) {
#if JS_CODEGEN_RISCV64
    cpopw(rd, rs);
#else
    cpop(rd, rs);
#endif
    return;
  }

  MOZ_ASSERT(scratch != rs);
  MOZ_ASSERT(scratch != rd);
  // https://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetParallel
  //
  // A generalization of the best bit counting method to integers of
  // bit-widths up to 128 (parameterized by type T) is this:
  //
  // v = v - ((v >> 1) & (T)~(T)0/3);                           // temp
  // v = (v & (T)~(T)0/15*3) + ((v >> 2) & (T)~(T)0/15*3);      // temp
  // v = (v + (v >> 4)) & (T)~(T)0/255*15;                      // temp
  // c = (T)(v * ((T)~(T)0/255)) >> (sizeof(T) - 1) * BITS_PER_BYTE; //count
  //
  // There are algorithms which are faster in the cases where very few
  // bits are set but the algorithm here attempts to minimize the total
  // number of instructions executed even when a large number of bits
  // are set.
  // The number of instruction is 20.
  // uint32_t B0 = 0x55555555;     // (T)~(T)0/3
  // uint32_t B1 = 0x33333333;     // (T)~(T)0/15*3
  // uint32_t B2 = 0x0F0F0F0F;     // (T)~(T)0/255*15
  // uint32_t value = 0x01010101;  // (T)~(T)0/255

  uint32_t shift = 24;
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  Register value = temps.Acquire();
  MOZ_ASSERT((rd != value) && (rs != value));
  ma_li(value, 0x01010101);     // value = 0x01010101;
  ma_li(scratch2, 0x55555555);  // B0 = 0x55555555;
  ma_srl32(scratch, rs, Operand(1));
  ma_and(scratch, scratch, scratch2);
  ma_sub32(scratch, rs, scratch);
  ma_li(scratch2, 0x33333333);  // B1 = 0x33333333;
  slli(rd, scratch2, 4);
  or_(scratch2, scratch2, rd);
  ma_and(rd, scratch, scratch2);
  ma_srl32(scratch, scratch, Operand(2));
  ma_and(scratch, scratch, scratch2);
  ma_add32(scratch, rd, scratch);
  ma_srl32(rd, scratch, Operand(4));
  ma_add32(rd, rd, scratch);
  ma_li(scratch2, 0xF);
  ma_mul32(scratch2, value, scratch2);  // B2 = 0x0F0F0F0F;
  ma_and(rd, rd, scratch2);
  ma_mul32(rd, rd, value);
  ma_srl32(rd, rd, Operand(shift));
}

#if JS_CODEGEN_RISCV64
void MacroAssemblerRiscv64::Popcnt64(Register rd, Register rs,
                                     Register scratch) {
  if (HasZbbExtension()) {
    cpop(rd, rs);
    return;
  }

  MOZ_ASSERT(scratch != rs);
  MOZ_ASSERT(scratch != rd);
  // uint64_t B0 = 0x5555555555555555l;     // (T)~(T)0/3
  // uint64_t B1 = 0x3333333333333333l;     // (T)~(T)0/15*3
  // uint64_t B2 = 0x0F0F0F0F0F0F0F0Fl;     // (T)~(T)0/255*15
  // uint64_t value = 0x0101010101010101l;  // (T)~(T)0/255
  // uint64_t shift = 24;                   // (sizeof(T) - 1) * BITS_PER_BYTE
  uint64_t shift = 24;
  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  Register value = temps.Acquire();
  MOZ_ASSERT((rd != value) && (rs != value));
  ma_li(value, 0x1111111111111111l);  // value = 0x1111111111111111l;
  ma_li(scratch2, 5);
  ma_mul64(scratch2, value, scratch2);  // B0 = 0x5555555555555555l;
  ma_srl64(scratch, rs, Operand(1));
  ma_and(scratch, scratch, scratch2);
  ma_sub64(scratch, rs, scratch);
  ma_li(scratch2, 3);
  ma_mul64(scratch2, value, scratch2);  // B1 = 0x3333333333333333l;
  ma_and(rd, scratch, scratch2);
  ma_srl64(scratch, scratch, Operand(2));
  ma_and(scratch, scratch, scratch2);
  ma_add64(scratch, rd, scratch);
  ma_srl64(rd, scratch, Operand(4));
  ma_add64(rd, rd, scratch);
  ma_li(scratch2, 0xF);
  ma_li(value, 0x0101010101010101l);    // value = 0x0101010101010101l;
  ma_mul64(scratch2, value, scratch2);  // B2 = 0x0F0F0F0F0F0F0F0Fl;
  ma_and(rd, rd, scratch2);
  ma_mul64(rd, rd, value);
  srli(rd, rd, 32 + shift);
}
#endif

void MacroAssemblerRiscv64::ma_mod_mask(Register src, Register dest,
                                        Register hold, Register remain,
                                        int32_t shift, Label* negZero) {
  // MATH:
  // We wish to compute x % (1<<y) - 1 for a known constant, y.
  // First, let b = (1<<y) and C = (1<<y)-1, then think of the 32 bit
  // dividend as a number in base b, namely
  // c_0*1 + c_1*b + c_2*b^2 ... c_n*b^n
  // now, since both addition and multiplication commute with modulus,
  // x % C == (c_0 + c_1*b + ... + c_n*b^n) % C ==
  // (c_0 % C) + (c_1%C) * (b % C) + (c_2 % C) * (b^2 % C)...
  // now, since b == C + 1, b % C == 1, and b^n % C == 1
  // this means that the whole thing simplifies to:
  // c_0 + c_1 + c_2 ... c_n % C
  // each c_n can easily be computed by a shift/bitextract, and the modulus
  // can be maintained by simply subtracting by C whenever the number gets
  // over C.
  int32_t mask = (1 << shift) - 1;
  Label head, negative, sumSigned, done;

  // hold holds -1 if the value was negative, 1 otherwise.
  // remain holds the remaining bits that have not been processed
  // scratch2 serves as a temporary location to store extracted bits
  // into as well as holding the trial subtraction as a temp value dest is
  // the accumulator (and holds the final result)

  // move the whole value into the remain.
  or_(remain, src, zero);
  // Zero out the dest.
  ma_li(dest, Imm32(0));
  // Set the hold appropriately.
  ma_b(remain, remain, &negative, Signed, ShortJump);
  ma_li(hold, Imm32(1));
  ma_branch(&head, ShortJump);

  bind(&negative);
  ma_li(hold, Imm32(-1));
  negw(remain, remain);

  // Begin the main loop.
  bind(&head);

  UseScratchRegisterScope temps(this);
  Register scratch2 = temps.Acquire();
  // Extract the bottom bits into scratch2.
  ma_and(scratch2, remain, Imm32(mask));
  // Add those bits to the accumulator.
  addw(dest, dest, scratch2);
  // Do a trial subtraction
  ma_sub32(scratch2, dest, Imm32(mask));
  // If (sum - C) > 0, store sum - C back into sum, thus performing a
  // modulus.
  ma_b(scratch2, Register(scratch2), &sumSigned, Signed, ShortJump);
  or_(dest, scratch2, zero);
  bind(&sumSigned);
  // Get rid of the bits that we extracted before.
  srliw(remain, remain, shift);
  // If the shift produced zero, finish, otherwise, continue in the loop.
  ma_b(remain, remain, &head, NonZero, ShortJump);
  // Check the hold to see if we need to negate the result.
  ma_b(hold, hold, &done, NotSigned, ShortJump);

  if (negZero != nullptr) {
    // Jump out in case of negative zero.
    ma_b(dest, dest, negZero, Zero);
  }
  // If the hold was non-zero, negate the result to be in line with
  // what JS wants
  negw(dest, dest);

  bind(&done);
}

void MacroAssemblerRiscv64::ma_fmovz(FloatFormat fmt, FloatRegister fd,
                                     FloatRegister fj, Register rk) {
  Label done;
  ma_b(rk, zero, &done, Assembler::NotEqual);
  if (fmt == SingleFloat) {
    fmv_s(fd, fj);
  } else {
    fmv_d(fd, fj);
  }
  bind(&done);
}

void MacroAssemblerRiscv64::ByteSwap(Register rd, Register rs, int operand_size,
                                     Register scratch) {
  MOZ_ASSERT(operand_size == 4 || operand_size == 8);
#if JS_CODEGEN_RISCV64
  if (HasZbbExtension()) {
    rev8(rd, rs);
    if (operand_size == 4) {
      srai(rd, rd, 32);
    }
    return;
  }
#endif

  MOZ_ASSERT(scratch != rs);
  MOZ_ASSERT(scratch != rd);
  if (operand_size == 4) {
    // Uint32_t x1 = 0x00FF00FF;
    // x0 = (x0 << 16 | x0 >> 16);
    // x0 = (((x0 & x1) << 8)  | ((x0 & (x1 << 8)) >> 8));
    UseScratchRegisterScope temps(this);
    BlockTrampolinePoolScope block_trampoline_pool(this, 17);
    MOZ_ASSERT((rd != t6) && (rs != t6));
    Register x0 = temps.Acquire();
    Register x1 = temps.Acquire();
    Register x2 = scratch;
    RV_li(x1, 0x00FF00FF);
    slliw(x0, rs, 16);
    srliw(rd, rs, 16);
    or_(x0, rd, x0);   // x0 <- x0 << 16 | x0 >> 16
    and_(x2, x0, x1);  // x2 <- x0 & 0x00FF00FF
    slliw(x2, x2, 8);  // x2 <- (x0 & x1) << 8
    slliw(x1, x1, 8);  // x1 <- 0xFF00FF00
    and_(rd, x0, x1);  // x0 & 0xFF00FF00
    srliw(rd, rd, 8);
    or_(rd, rd, x2);  // (((x0 & x1) << 8)  | ((x0 & (x1 << 8)) >> 8))
  } else {
    // uinx24_t x1 = 0x0000FFFF0000FFFFl;
    // uinx24_t x1 = 0x00FF00FF00FF00FFl;
    // x0 = (x0 << 32 | x0 >> 32);
    // x0 = (x0 & x1) << 16 | (x0 & (x1 << 16)) >> 16;
    // x0 = (x0 & x1) << 8  | (x0 & (x1 << 8)) >> 8;
    UseScratchRegisterScope temps(this);
    BlockTrampolinePoolScope block_trampoline_pool(this, 30);
    MOZ_ASSERT((rd != t6) && (rs != t6));
    Register x0 = temps.Acquire();
    Register x1 = temps.Acquire();
    Register x2 = scratch;
    RV_li(x1, 0x0000FFFF0000FFFFl);
    slli(x0, rs, 32);
    srli(rd, rs, 32);
    or_(x0, rd, x0);   // x0 <- x0 << 32 | x0 >> 32
    and_(x2, x0, x1);  // x2 <- x0 & 0x0000FFFF0000FFFF
    slli(x2, x2, 16);  // x2 <- (x0 & 0x0000FFFF0000FFFF) << 16
    slli(x1, x1, 16);  // x1 <- 0xFFFF0000FFFF0000
    and_(rd, x0, x1);  // rd <- x0 & 0xFFFF0000FFFF0000
    srli(rd, rd, 16);  // rd <- x0 & (x1 << 16)) >> 16
    or_(x0, rd, x2);   // (x0 & x1) << 16 | (x0 & (x1 << 16)) >> 16;
    RV_li(x1, 0x00FF00FF00FF00FFl);
    and_(x2, x0, x1);  // x2 <- x0 & 0x00FF00FF00FF00FF
    slli(x2, x2, 8);   // x2 <- (x0 & x1) << 8
    slli(x1, x1, 8);   // x1 <- 0xFF00FF00FF00FF00
    and_(rd, x0, x1);
    srli(rd, rd, 8);  // rd <- (x0 & (x1 << 8)) >> 8
    or_(rd, rd, x2);  // (((x0 & x1) << 8)  | ((x0 & (x1 << 8)) >> 8))
  }
}

template <typename F_TYPE>
void MacroAssemblerRiscv64::FloatMinMaxHelper(FPURegister dst, FPURegister src1,
                                              FPURegister src2,
                                              MaxMinKind kind) {
  MOZ_ASSERT((std::is_same<F_TYPE, float>::value) ||
             (std::is_same<F_TYPE, double>::value));

  if (src1 == src2) {
    if (dst != src1) {
      if (std::is_same<float, F_TYPE>::value) {
        fmv_s(dst, src1);
      } else {
        fmv_d(dst, src1);
      }
    }
    return;
  }

  Label done, nan;

  // For RISCV, fmin_s returns the other non-NaN operand as result if only one
  // operand is NaN; but for JS, if any operand is NaN, result is Nan. The
  // following handles the discrepency between handling of NaN between ISA and
  // JS semantics
  if (std::is_same<float, F_TYPE>::value) {
    BranchFloat32(Assembler::DoubleUnordered, src1, src2, &nan, ShortJump);
  } else {
    BranchFloat64(Assembler::DoubleUnordered, src1, src2, &nan, ShortJump);
  }

  if (kind == MaxMinKind::kMax) {
    if (std::is_same<float, F_TYPE>::value) {
      fmax_s(dst, src1, src2);
    } else {
      fmax_d(dst, src1, src2);
    }
  } else {
    if (std::is_same<float, F_TYPE>::value) {
      fmin_s(dst, src1, src2);
    } else {
      fmin_d(dst, src1, src2);
    }
  }
  jump(&done);

  bind(&nan);
  // if any operand is NaN, return NaN (fadd returns NaN if any operand is NaN)
  if (std::is_same<float, F_TYPE>::value) {
    fadd_s(dst, src1, src2);
  } else {
    fadd_d(dst, src1, src2);
  }

  bind(&done);
}

void MacroAssemblerRiscv64::Float32Max(FPURegister dst, FPURegister src1,
                                       FPURegister src2) {
  comment(__FUNCTION__);
  FloatMinMaxHelper<float>(dst, src1, src2, MaxMinKind::kMax);
}

void MacroAssemblerRiscv64::Float32Min(FPURegister dst, FPURegister src1,
                                       FPURegister src2) {
  comment(__FUNCTION__);
  FloatMinMaxHelper<float>(dst, src1, src2, MaxMinKind::kMin);
}

void MacroAssemblerRiscv64::Float64Max(FPURegister dst, FPURegister src1,
                                       FPURegister src2) {
  comment(__FUNCTION__);
  FloatMinMaxHelper<double>(dst, src1, src2, MaxMinKind::kMax);
}

void MacroAssemblerRiscv64::Float64Min(FPURegister dst, FPURegister src1,
                                       FPURegister src2) {
  comment(__FUNCTION__);
  FloatMinMaxHelper<double>(dst, src1, src2, MaxMinKind::kMin);
}

void MacroAssemblerRiscv64::Rol(Register rd, Register rs, const Operand& rt) {
  if (rt.is_reg()) {
    if (HasZbbExtension()) {
      rolw(rd, rs, rt.rm());
      return;
    }

    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    negw(scratch, rt.rm());
    srlw(scratch, rs, scratch);
    sllw(rd, rs, rt.rm());
    or_(rd, scratch, rd);
    sext_w(rd, rd);
  } else {
    Ror(rd, rs, Operand(32 - (rt.immediate() & 0x1f)));
  }
}

void MacroAssemblerRiscv64::Ror(Register rd, Register rs, const Operand& rt) {
  if (HasZbbExtension()) {
    if (rt.is_reg()) {
      rorw(rd, rs, rt.rm());
    } else {
      int64_t ror_value = rt.immediate() % 32;
      if (ror_value < 0) {
        ror_value += 32;
      }
      roriw(rd, rs, ror_value);
    }
    return;
  }
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  if (rt.is_reg()) {
    negw(scratch, rt.rm());
    sllw(scratch, rs, scratch);
    srlw(rd, rs, rt.rm());
    or_(rd, scratch, rd);
    sext_w(rd, rd);
  } else {
    int64_t ror_value = rt.immediate() & 0x1f;
    if (ror_value == 0) {
      mv(rd, rs);
      return;
    }
    srliw(scratch, rs, ror_value);
    slliw(rd, rs, 32 - ror_value);
    or_(rd, scratch, rd);
    sext_w(rd, rd);
  }
}

void MacroAssemblerRiscv64::Drol(Register rd, Register rs, const Operand& rt) {
  if (rt.is_reg()) {
    if (HasZbbExtension()) {
      rol(rd, rs, rt.rm());
      return;
    }

    UseScratchRegisterScope temps(this);
    Register scratch = temps.Acquire();

    negw(scratch, rt.rm());
    srl(scratch, rs, scratch);
    sll(rd, rs, rt.rm());
    or_(rd, scratch, rd);
  } else {
    Dror(rd, rs, Operand(64 - (rt.immediate() & 0x3f)));
  }
}

void MacroAssemblerRiscv64::Dror(Register rd, Register rs, const Operand& rt) {
  if (HasZbbExtension()) {
    if (rt.is_reg()) {
      ror(rd, rs, rt.rm());
    } else {
      int64_t dror_value = rt.immediate() % 64;
      if (dror_value < 0) {
        dror_value += 64;
      }
      rori(rd, rs, dror_value);
    }
    return;
  }
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  if (rt.is_reg()) {
    negw(scratch, rt.rm());
    sll(scratch, rs, scratch);
    srl(rd, rs, rt.rm());
    or_(rd, scratch, rd);
  } else {
    int64_t dror_value = rt.immediate() & 0x3f;
    if (dror_value == 0) {
      mv(rd, rs);
      return;
    }
    srli(scratch, rs, dror_value);
    slli(rd, rs, 64 - dror_value);
    or_(rd, scratch, rd);
  }
}

void MacroAssemblerRiscv64::wasmLoadImpl(const wasm::MemoryAccessDesc& access,
                                         Register memoryBase, Register ptr,
                                         Register ptrScratch,
                                         AnyRegister output, Register tmp) {
  access.assertOffsetInGuardPages();
  uint32_t offset = access.offset32();
  MOZ_ASSERT_IF(offset, ptrScratch != InvalidReg);

  // Maybe add the offset.
  if (offset) {
    asMasm().addPtr(ImmWord(offset), ptrScratch);
    ptr = ptrScratch;
  }

  asMasm().memoryBarrierBefore(access.sync());
  UseScratchRegisterScope temps(this);
  Register scratch = temps.Acquire();
  FaultingCodeOffset fco;
  switch (access.type()) {
    case Scalar::Int8:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      lb(output.gpr(), scratch, 0);
      break;
    case Scalar::Uint8:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      lbu(output.gpr(), scratch, 0);
      break;
    case Scalar::Int16:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      lh(output.gpr(), scratch, 0);
      break;
    case Scalar::Uint16:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      lhu(output.gpr(), scratch, 0);
      break;
    case Scalar::Int32:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      lw(output.gpr(), scratch, 0);
      break;
    case Scalar::Uint32:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      lwu(output.gpr(), scratch, 0);
      break;
    case Scalar::Float64:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      fld(output.fpu(), scratch, 0);
      break;
    case Scalar::Float32:
      add(scratch, memoryBase, ptr);
      fco = FaultingCodeOffset(currentOffset());
      flw(output.fpu(), scratch, 0);
      break;
    default:
      MOZ_CRASH("unexpected array type");
  }

  append(access, js::wasm::TrapMachineInsnForLoad(access.byteSize()), fco);
  asMasm().memoryBarrierAfter(access.sync());
}

void MacroAssemblerRiscv64::wasmStoreImpl(const wasm::MemoryAccessDesc& access,
                                          AnyRegister value,
                                          Register memoryBase, Register ptr,
                                          Register ptrScratch, Register tmp) {
  access.assertOffsetInGuardPages();
  uint32_t offset = access.offset32();
  MOZ_ASSERT_IF(offset, ptrScratch != InvalidReg);

  // Maybe add the offset.
  if (offset) {
    asMasm().addPtr(ImmWord(offset), ptrScratch);
    ptr = ptrScratch;
  }

  unsigned byteSize = access.byteSize();
  bool isSigned = Scalar::isSignedIntType(access.type());
  bool isFloat = Scalar::isFloatingType(access.type());

  BaseIndex address(memoryBase, ptr, TimesOne);
  asMasm().memoryBarrierBefore(access.sync());
  FaultingCodeOffset fco;
  if (isFloat) {
    if (byteSize == 4) {
      fco = ma_fst_s(value.fpu(), address);
    } else {
      fco = ma_fst_d(value.fpu(), address);
    }
  } else {
    fco =
        ma_store(value.gpr(), address, static_cast<LoadStoreSize>(8 * byteSize),
                 isSigned ? SignExtend : ZeroExtend);
  }
  // Only the last emitted instruction is a memory access.
  append(access, js::wasm::TrapMachineInsnForStore(access.byteSize()), fco);
  asMasm().memoryBarrierAfter(access.sync());
}

void MacroAssemblerRiscv64::GenPCRelativeJumpAndLink(Register rd,
                                                     int32_t imm32) {
  MOZ_ASSERT(is_int32(imm32 + 0x800));
  int32_t Hi20 = ((imm32 + 0x800) >> 12);
  int32_t Lo12 = imm32 << 20 >> 20;
  auipc(rd, Hi20);  // Read PC + Hi20 into scratch.
  jalr(rd, Lo12);   // jump PC + Hi20 + Lo12
}

CodeOffset MacroAssemblerRiscv64::BranchAndLinkShortHelper(int32_t offset,
                                                           Label* L) {
  MOZ_ASSERT(L == nullptr || offset == 0);
  BlockTrampolinePoolScope block_trampoline_pool(this, 2, 1);
  offset = GetOffset(offset, L, OffsetSize::kOffset21);
  return jal(offset);
}

CodeOffset MacroAssemblerRiscv64::BranchAndLinkShort(int32_t offset) {
  MOZ_ASSERT(is_int21(offset));
  return BranchAndLinkShortHelper(offset, nullptr);
}

CodeOffset MacroAssemblerRiscv64::BranchAndLinkShort(Label* L) {
  return BranchAndLinkShortHelper(0, L);
}

CodeOffset MacroAssemblerRiscv64::BranchAndLink(Label* L) {
  if (L->bound() && !is_near(L)) {
    return BranchAndLinkLong(L);
  }
  return BranchAndLinkShort(L);
}

void MacroAssemblerRiscv64::ma_fmv_d(FloatRegister src, ValueOperand dest) {
  fmv_x_d(dest.valueReg(), src);
}

void MacroAssemblerRiscv64::ma_fmv_d(ValueOperand src, FloatRegister dest) {
  fmv_d_x(dest, src.valueReg());
}

void MacroAssemblerRiscv64::ma_fmv_w(FloatRegister src, ValueOperand dest) {
  fmv_x_w(dest.valueReg(), src);
}

void MacroAssemblerRiscv64::ma_fmv_w(ValueOperand src, FloatRegister dest) {
  fmv_w_x(dest, src.valueReg());
}

}  // namespace jit
}  // namespace js
