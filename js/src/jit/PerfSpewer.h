/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef jit_PerfSpewer_h
#define jit_PerfSpewer_h

#ifdef JS_ION_PERF
#  include <stdio.h>
#endif
#include "jit/CacheIR.h"
#include "jit/JitCode.h"
#include "jit/Label.h"
#include "jit/LIR.h"
#include "js/AllocPolicy.h"
#include "js/JitCodeAPI.h"
#include "js/Vector.h"
#include "vm/JSScript.h"

namespace {
struct AutoLockPerfSpewer;
}

namespace js::jit {

using ProfilerJitCodeVector = Vector<JS::JitCodeRecord, 0, SystemAllocPolicy>;

#ifdef JS_ION_PERF
void CheckPerf();
#else
inline void CheckPerf() {}
#endif
void ResetPerfSpewer(bool enabled);

class MBasicBlock;
class MacroAssembler;

bool PerfEnabled();

class PerfSpewer {
 protected:
  struct OpcodeEntry {
    Label addr;
    unsigned opcode = 0;
  };
  Vector<OpcodeEntry, 0, SystemAllocPolicy> opcodes_;

  uint32_t lir_opcode_length = 0;
  uint32_t js_opcode_length = 0;

  virtual JS::JitTier GetTier() { return JS::JitTier::Other; }

  virtual const char* CodeName(unsigned op) = 0;

 public:
  PerfSpewer() = default;

  void saveJitCodeIRInfo(const char* desc, JitCode* code,
                         JS::JitCodeRecord* profilerRecord,
                         AutoLockPerfSpewer& lock);
  void saveJitCodeSourceInfo(JSScript* script, JitCode* code,
                             JS::JitCodeRecord* record,
                             AutoLockPerfSpewer& lock);

  static void CollectJitCodeInfo(UniqueChars& function_name, JitCode* code,
                                 JS::JitCodeRecord*, AutoLockPerfSpewer& lock);
  static void CollectJitCodeInfo(UniqueChars& function_name, void* code_addr,
                                 uint64_t code_size,
                                 JS::JitCodeRecord* profilerRecord,
                                 AutoLockPerfSpewer& lock);
};

void CollectPerfSpewerJitCodeProfile(JitCode* code, const char* msg);
void CollectPerfSpewerJitCodeProfile(uintptr_t base, uint64_t size,
                                     const char* msg);

void CollectPerfSpewerWasmMap(uintptr_t base, uintptr_t size,
                              const char* filename, const char* annotation);
void CollectPerfSpewerWasmFunctionMap(uintptr_t base, uintptr_t size,
                                      const char* filename, unsigned lineno,
                                      const char* funcName);

class IonPerfSpewer : public PerfSpewer {
  JS::JitTier GetTier() override { return JS::JitTier::Ion; }
  virtual const char* CodeName(unsigned op) override;

 public:
  void recordInstruction(MacroAssembler& masm, LNode::Opcode op);
  void saveProfile(JSContext* cx, JSScript* script, JitCode* code);
};

class BaselinePerfSpewer : public PerfSpewer {
  JS::JitTier GetTier() override { return JS::JitTier::Baseline; }
  virtual const char* CodeName(unsigned op) override;

 public:
  void recordInstruction(MacroAssembler& masm, JSOp op);
  void saveProfile(JSContext* cx, JSScript* script, JitCode* code);
};

class InlineCachePerfSpewer : public PerfSpewer {
  JS::JitTier GetTier() override { return JS::JitTier::IC; }
  virtual const char* CodeName(unsigned op) override;

 public:
  void recordInstruction(MacroAssembler& masm, CacheOp op);
  void saveProfile(JitCode* code, const char* name);
};

class PerfSpewerRangeRecorder {
  using OffsetPair = std::tuple<uint32_t, UniqueChars>;
  Vector<OffsetPair, 0, js::SystemAllocPolicy> ranges;

  MacroAssembler& masm;

 public:
  explicit PerfSpewerRangeRecorder(MacroAssembler& masm_) : masm(masm_){};
  void RecordOffset(const char* name);
  void CollectRangesForJitCode(JitCode* code);
};

}  // namespace js::jit

#endif /* jit_PerfSpewer_h */
