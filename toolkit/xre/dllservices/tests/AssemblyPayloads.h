/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* These assembly functions represent patterns that were already hooked by
 * another application before our detour.
 */

#ifndef mozilla_AssemblyPayloads_h
#define mozilla_AssemblyPayloads_h

#include <cstdint>

#define PADDING_256_NOP                                              \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;" \
  "nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;nop;"

extern "C" {

#if defined(__clang__)
#  if defined(_M_X64)
constexpr uintptr_t JumpDestination = 0x7fff00000000;

__declspec(dllexport) __attribute__((naked)) void MovPushRet() {
  asm volatile(
      "mov %0, %%rax;"
      "push %%rax;"
      "ret;"
      :
      : "i"(JumpDestination));
}

__declspec(dllexport) __attribute__((naked)) void MovRaxJump() {
  asm volatile(
      "mov %0, %%rax;"
      "jmpq *%%rax;"
      :
      : "i"(JumpDestination));
}

__declspec(dllexport) __attribute__((naked)) void DoubleJump() {
  asm volatile(
      "jmp label1;"

      "label2:"
      "mov %0, %%rax;"
      "jmpq *%%rax;"

      // 0x100 bytes padding to generate jmp rel32 instead of jmp rel8
      PADDING_256_NOP

      "label1:"
      "jmp label2;"
      :
      : "i"(JumpDestination));
}

__declspec(dllexport) __attribute__((naked)) void NearJump() {
  asm volatile(
      "jae label3;"
      "je  label3;"
      "jne label3;"

      "label4:"
      "mov %0, %%rax;"
      "jmpq *%%rax;"

      // 0x100 bytes padding to generate jae rel32 instead of jae rel8
      PADDING_256_NOP

      "label3:"
      "jmp label4;"
      :
      : "i"(JumpDestination));
}

__declspec(dllexport) __attribute__((naked)) void OpcodeFF() {
  // Skip PUSH (FF /6) because clang prefers Opcode 50+rd
  // to translate PUSH r64 rather than Opcode FF.
  asm volatile(
      "incl %eax;"
      "decl %ebx;"
      "call *%rcx;"
      "jmp *(%rip);"  // Indirect jump to 0xcccccccc`cccccccc
      "int $3;int $3;int $3;int $3;"
      "int $3;int $3;int $3;int $3;");
}

__declspec(dllexport) __attribute__((naked)) void IndirectCall() {
  asm volatile(
      "call *(%rip);"  // Indirect call to 0x90909090`90909090
      "nop;nop;nop;nop;nop;nop;nop;nop;"
      "ret;");
}

__declspec(dllexport) __attribute__((naked)) void MovImm64() {
  asm volatile(
      "mov $0x1234567812345678, %r10;"
      "nop;nop;nop");
}

#    if !defined(MOZ_CODE_COVERAGE)
// This code reproduces bug 1798787: it uses the same prologue, the same unwind
// info, and it has a call instruction that starts within the 13 first bytes.
__attribute__((naked)) void DetouredCallCode(uintptr_t aCallee) {
  asm volatile(
      "subq $0x28, %rsp;"
      "testq %rcx, %rcx;"
      "jz exit;"
      "callq *%rcx;"
      "exit:"
      "addq $0x28, %rsp;"
      "retq;");
}
constexpr uint8_t gDetouredCallCodeSize = 16;  // size of function in bytes
alignas(uint32_t) uint8_t gDetouredCallUnwindInfo[] = {
    0x01,  // Version (1), Flags (0)
    0x04,  // SizeOfProlog (4)
    0x01,  // CountOfUnwindCodes (1)
    0x00,  // FrameRegister (0), FrameOffset (0)
    // UnwindCodes[0]
    0x04,  // .OffsetInProlog (4)
    0x42,  // .UnwindOpCode(UWOP_ALLOC_SMALL=2), .UnwindInfo (4)
};

// This points to the same code as DetouredCallCode, but dynamically generated
// so that it can have custom unwinding info. See TestDllInterceptor.cpp.
extern decltype(&DetouredCallCode) gDetouredCall;

// This is just a jumper: our hooking code will thus detour the jump target
// DetouredCall -- it will not detour DetouredCallJumper. We need to do this to
// point our hooking code to the dynamic code, because our hooking API needs an
// exported function name.
//
// guard(nocf) ensures that our generated code is a recognized jumper:
//   jmp qword ptr [rip+offset DetouredCall]
// rather than:
//   mov rax, qword ptr [rip+offset DetouredCall]
//   mov rdx, qword ptr [rip+offset __guard_dispatch_icall_fptr]
//   jmp rdx
__declspec(dllexport noinline guard(nocf)) void DetouredCallJumper(
    uintptr_t aCallee) {
  gDetouredCall(aCallee);
}
#    endif  // !defined(MOZ_CODE_COVERAGE)

#  elif defined(_M_IX86)
constexpr uintptr_t JumpDestination = 0x7fff0000;

__declspec(dllexport) __attribute__((naked)) void PushRet() {
  asm volatile(
      "push %0;"
      "ret;"
      :
      : "i"(JumpDestination));
}

__declspec(dllexport) __attribute__((naked)) void MovEaxJump() {
  asm volatile(
      "mov %0, %%eax;"
      "jmp *%%eax;"
      :
      : "i"(JumpDestination));
}

__declspec(dllexport) __attribute__((naked)) void Opcode83() {
  asm volatile(
      "xor $0x42, %eax;"
      "cmpl $1, 0xc(%ebp);");
}

__declspec(dllexport) __attribute__((naked)) void LockPrefix() {
  // Test an instruction with a LOCK prefix (0xf0) at a non-zero offset
  asm volatile(
      "push $0x7c;"
      "lock push $0x7c;");
}

__declspec(dllexport) __attribute__((naked)) void LooksLikeLockPrefix() {
  // This is for a regression scenario of bug 1625452, where we double-counted
  // the offset in CountPrefixBytes.  When we count prefix bytes in front of
  // the 2nd PUSH located at offset 2, we mistakenly started counting from
  // the byte 0xf0 at offset 4, which is considered as LOCK, thus we try to
  // detour the next byte 0xcc and it fails.
  //
  // 0: 6a7c       push 7Ch
  // 2: 68ccf00000 push 0F0CCh
  //
  asm volatile(
      "push $0x7c;"
      "push $0x0000f0cc;");
}

__declspec(dllexport) __attribute__((naked)) void DoubleJump() {
  asm volatile(
      "jmp label1;"

      "label2:"
      "mov %0, %%eax;"
      "jmp *%%eax;"

      // 0x100 bytes padding to generate jmp rel32 instead of jmp rel8
      PADDING_256_NOP

      "label1:"
      "jmp label2;"
      :
      : "i"(JumpDestination));
}
#  endif

#  if !defined(_M_ARM64)
__declspec(dllexport) __attribute__((naked)) void UnsupportedOp() {
  asm volatile(
      "ud2;"
      "nop;nop;nop;nop;nop;nop;nop;nop;"
      "nop;nop;nop;nop;nop;nop;nop;nop;");
}
#  endif  // !defined(_M_ARM64)

#endif  // defined(__clang__)

}  // extern "C"

#endif  // mozilla_AssemblyPayloads_h
