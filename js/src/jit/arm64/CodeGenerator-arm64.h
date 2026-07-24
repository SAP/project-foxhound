/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef jit_arm64_CodeGenerator_arm64_h
#define jit_arm64_CodeGenerator_arm64_h

#include "jit/arm64/Assembler-arm64.h"
#include "jit/shared/CodeGenerator-shared.h"

namespace js {
namespace jit {

class CodeGeneratorARM64;
class OutOfLineTableSwitch;

using OutOfLineWasmTruncateCheck =
    OutOfLineWasmTruncateCheckBase<CodeGeneratorARM64>;

class CodeGeneratorARM64 : public CodeGeneratorShared {
  friend class MoveResolverARM64;

 protected:
  CodeGeneratorARM64(MIRGenerator* gen, LIRGraph* graph, MacroAssembler* masm,
                     const wasm::CodeMetadata* wasmCodeMeta);

  NonAssertingLabel deoptLabel_;

  MoveOperand toMoveOperand(const LAllocation a) const;

  void bailoutIf(Assembler::Condition condition, LSnapshot* snapshot);
  void bailoutIfZero(Assembler::Condition condition, ARMRegister rt,
                     LSnapshot* snapshot);
  void bailoutFrom(Label* label, LSnapshot* snapshot);
  void bailout(LSnapshot* snapshot);

  template <typename T1, typename T2>
  void bailoutCmpPtr(Assembler::Condition c, T1 lhs, T2 rhs,
                     LSnapshot* snapshot) {
    if constexpr (std::is_same_v<T1, Register> &&
                  (std::is_same_v<T2, Imm32> || std::is_same_v<T2, Imm64> ||
                   std::is_same_v<T2, ImmWord> || std::is_same_v<T2, ImmPtr>)) {
      if (rhs.value == 0) {
        if (c == Assembler::Equal) {
          bailoutIfZero(Assembler::Zero, ARMRegister(lhs, 64), snapshot);
          return;
        }
        if (c == Assembler::NotEqual) {
          bailoutIfZero(Assembler::NonZero, ARMRegister(lhs, 64), snapshot);
          return;
        }
      }
    }
    masm.cmpPtr(lhs, rhs);
    return bailoutIf(c, snapshot);
  }
  template <typename T1, typename T2>
  void bailoutCmp32(Assembler::Condition c, T1 lhs, T2 rhs,
                    LSnapshot* snapshot) {
    if constexpr (std::is_same_v<T1, Register> && std::is_same_v<T2, Imm32>) {
      if (rhs.value == 0) {
        if (c == Assembler::Equal) {
          bailoutIfZero(Assembler::Zero, ARMRegister(lhs, 32), snapshot);
          return;
        }
        if (c == Assembler::NotEqual) {
          bailoutIfZero(Assembler::NonZero, ARMRegister(lhs, 32), snapshot);
          return;
        }
      }
    }
    masm.cmp32(lhs, rhs);
    return bailoutIf(c, snapshot);
  }
  template <typename T1, typename T2>
  void bailoutTest32(Assembler::Condition c, T1 lhs, T2 rhs,
                     LSnapshot* snapshot) {
    if constexpr (std::is_same_v<T1, Register> &&
                  std::is_same_v<T2, Register>) {
      if (lhs == rhs && (c == Assembler::Zero || c == Assembler::NonZero)) {
        bailoutIfZero(c, ARMRegister(lhs, 32), snapshot);
        return;
      }
    }
    masm.test32(lhs, rhs);
    return bailoutIf(c, snapshot);
  }
  void bailoutIfFalseBool(Register reg, LSnapshot* snapshot) {
    masm.test32(reg, Imm32(0xFF));
    return bailoutIf(Assembler::Zero, snapshot);
  }

  bool generateOutOfLineCode();

  // Emits a branch that directs control flow to the true block if |cond| is
  // true, and the false block if |cond| is false.
  void emitBranch(Assembler::Condition cond, MBasicBlock* ifTrue,
                  MBasicBlock* ifFalse);

  void emitTableSwitchDispatch(MTableSwitch* mir, Register index,
                               Register base);

  void emitBigIntPtrDiv(LBigIntPtrDiv* ins, Register dividend, Register divisor,
                        Register output);
  void emitBigIntPtrMod(LBigIntPtrMod* ins, Register dividend, Register divisor,
                        Register output);

  void generateInvalidateEpilogue();

 public:
  void emitBailoutOOL(LSnapshot* snapshot);

  void visitOutOfLineTableSwitch(OutOfLineTableSwitch* ool);
  void visitOutOfLineWasmTruncateCheck(OutOfLineWasmTruncateCheck* ool);
};

using CodeGeneratorSpecific = CodeGeneratorARM64;

}  // namespace jit
}  // namespace js

#endif /* jit_arm64_CodeGenerator_arm64_h */
