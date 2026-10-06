// |jit-test| skip-if: !hasDisassembler() || wasmCompileMode() != "ion" || getBuildConfiguration("windows") || (!getBuildConfiguration("x64") && !getBuildConfiguration("x86") && !getBuildConfiguration("arm64") && !getBuildConfiguration("arm")); include:adhoc-multiplatform-test.js
//
// These tests push wasm functions through the ion pipe and specify an expected
// disassembly output on all 4 primary targets, x64 / x86 / arm64 / arm(32).
// Results must be provided for the first 3, but can optionally be skipped
// for arm(32).
//
// Hence: disassembler is needed, compiler must be ion.
//
// Windows is disallowed because the argument registers are different from on
// Linux, and matching both is both difficult and not of much value.

// Tests are "end-to-end" in the sense that we don't care whether the
// tested-for code improvement is done by MIR optimisation, or later in the
// pipe.  Observed defects are marked with FIXMEs for future easy finding.


// Note that identities involving AND, OR and XOR are tested by
// binop-x64-ion-folding.js

// Multiplication with magic constant on the left
//
//    0 * x =>  0
//    1 * x =>  x
//   -1 * x =>  -x
//    2 * x =>  x + x
//    4 * x =>  x << 2

codegenTestMultiplatform_adhoc(
    `(module (func (export "mul32_zeroL") (param $p1 i32) (result i32)
       (i32.mul (i32.const 0) (local.get $p1))))`,
    "mul32_zeroL",
    {x64:   `xor %eax, %eax`,
     x86:   `xor %eax, %eax`,
     arm64: `mov w0, wzr`,
     arm:   `mov r0, #0`},
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "mul64_zeroL") (param $p1 i64) (result i64)
       (i64.mul (i64.const 0) (local.get $p1))))`,
    "mul64_zeroL",
    // FIXME zero-creation insns could be improved
    {x64:   `xor %rax, %rax`,     // REX.W is redundant
     x86:   `xor %eax, %eax
             xor %edx, %edx`,
     arm64: `mov x0, xzr`,
     arm:   `mov r0, #0
             mov r1, #0` },
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "mul32_oneL") (param $p1 i32) (result i32)
       (i32.mul (i32.const 1) (local.get $p1))))`,
    "mul32_oneL",
    {x64:   // We move edi to eax unnecessarily via ecx (bug 1752520).
            // Presumably because the folding 1 * x => x is done at the LIR
            // level, not the MIR level, hence the now-pointless WasmParameter
            // node is not DCE'd away, since DCE only happens at the MIR level.
            // In fact all targets suffer from the latter problem, but on x86
            // no_prefix_x86:true hides it, and on arm32/64 the pointless move
            // is correctly transformed by RA into a no-op.
            `mov %edi, %ecx
             mov %ecx, %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax`,
     arm64: ``,
     arm:   ``},
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "mul64_oneL") (param $p1 i64) (result i64)
       (i64.mul (i64.const 1) (local.get $p1))))`,
    "mul64_oneL",
    {x64:   `mov %rdi, %rcx
             mov %rcx, %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax`,
     arm64: ``,
     arm:   ``},
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "mul32_minusOneL") (param $p1 i32) (result i32)
       (i32.mul (i32.const -1) (local.get $p1))))`,
    "mul32_minusOneL",
    {x64:   `neg %eax`,
     x86:   `neg %eax`,
     arm64: `neg w0, w0`,
     arm:   `rsb r0, r0, #0`},
    {x86: {no_prefix:true}, x64: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "mul64_minusOneL") (param $p1 i64) (result i64)
       (i64.mul (i64.const -1) (local.get $p1))))`,
    "mul64_minusOneL",
    {x64:   `mov %rdi, %rcx
             mov %rcx, %rax
             neg %rax`,
     x86:   `neg %eax
             adc \\$0x00, %edx
             neg %edx`,
     arm64: `neg  x0, x0`,
     arm:   `rsbs r0, r0, #0
             rsc  r1, r1, #0`},
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "mul32_twoL") (param $p1 i32) (result i32)
       (i32.mul (i32.const 2) (local.get $p1))))`,
    "mul32_twoL",
    {x64:   `lea \\(%rdi,%rdi,1\\), %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax
             add %eax, %eax`,
     arm64: `add w0, w0, w0`,
     arm:   `adds r0, r0, r0`},
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "mul64_twoL") (param $p1 i64) (result i64)
       (i64.mul (i64.const 2) (local.get $p1))))`,
    "mul64_twoL",
    {x64:   `lea \\(%rdi,%rdi,1\\), %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax
             add %eax, %eax
             adc %edx, %edx`,
     arm64: `add  x0, x0, x0`,
     arm:   `adds r0, r0, r0
             adc  r1, r1, r1`},
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "mul32_fourL") (param $p1 i32) (result i32)
       (i32.mul (i32.const 4) (local.get $p1))))`,
    "mul32_fourL",
    {x64:   `lea \\(,%rdi,4\\), %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax
             shl \\$0x02, %eax`,
     arm64: `lsl w0, w0, #2`,
     arm:   `mov r0, r0, lsl #2`},
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "mul64_fourL") (param $p1 i64) (result i64)
       (i64.mul (i64.const 4) (local.get $p1))))`,
    "mul64_fourL",
    {x64:   `lea \\(,%rdi,4\\), %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax
             shld \\$0x02, %eax, %edx
             shl \\$0x02, %eax`,
     arm64: `lsl x0, x0, #2`,
     arm:   `mov r1, r1, lsl #2
             orr r1, r1, r0, lsr #30
             mov r0, r0, lsl #2`},
    {x86: {no_prefix:true}}
);

// Multiplication with magic constant on the right
//
//  x * 0  =>  0
//  x * 1  =>  x
//  x * -1 =>  -x
//  x * 2  =>  x + x
//  x * 4  =>  x << 2

codegenTestMultiplatform_adhoc(
    `(module (func (export "mul32_zeroR") (param $p1 i32) (result i32)
       (i32.mul (local.get $p1) (i32.const 0))))`,
    "mul32_zeroR",
    {x64:   `xor %eax, %eax`,
     x86:   `xor %eax, %eax`,
     arm64: `mov w0, wzr`,
     arm:   `mov r0, #0`},
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "mul64_zeroR") (param $p1 i64) (result i64)
       (i64.mul (local.get $p1) (i64.const 0))))`,
    "mul64_zeroR",
    {x64:   `xor %rax, %rax`,     // REX.W is redundant
     x86:   `xor %eax, %eax
             xor %edx, %edx`,
     arm64: `mov x0, xzr`,
     arm:   `mov r0, #0
             mov r1, #0` },
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "mul32_oneR") (param $p1 i32) (result i32)
       (i32.mul (local.get $p1) (i32.const 1))))`,
    "mul32_oneR",
    {x64:   `mov %edi, %ecx
             mov %ecx, %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax`,
     arm64: ``,
     arm:   ``},
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "mul64_oneR") (param $p1 i64) (result i64)
       (i64.mul (local.get $p1) (i64.const 1))))`,
    "mul64_oneR",
    {x64:   `mov %rdi, %rcx
             mov %rcx, %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax`,
     arm64: ``,
     arm:   ``},
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "mul32_minusOneR") (param $p1 i32) (result i32)
       (i32.mul (local.get $p1) (i32.const -1))))`,
    "mul32_minusOneR",
    {x64:   `neg %eax`,
     x86:   `neg %eax`,
     arm64: `neg w0, w0`,
     arm:   `rsb r0, r0, #0`},
    {x86: {no_prefix:true}, x64: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "mul64_minusOneR") (param $p1 i64) (result i64)
       (i64.mul (local.get $p1) (i64.const -1))))`,
    "mul64_minusOneR",
    {x64:   `mov %rdi, %rcx
             mov %rcx, %rax
             neg %rax`,
     x86:   `neg %eax
             adc \\$0x00, %edx
             neg %edx`,
     arm64: `neg  x0, x0`,
     arm:   `rsbs r0, r0, #0
             rsc  r1, r1, #0`},
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "mul32_twoR") (param $p1 i32) (result i32)
       (i32.mul (local.get $p1) (i32.const 2))))`,
    "mul32_twoR",
    {x64:   `lea \\(%rdi,%rdi,1\\), %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax
             add %eax, %eax`,
     arm64: `add w0, w0, w0`,
     arm:   `adds r0, r0, r0`},
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "mul64_twoR") (param $p1 i64) (result i64)
       (i64.mul (local.get $p1) (i64.const 2))))`,
    "mul64_twoR",
    {x64:   `lea \\(%rdi,%rdi,1\\), %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax
             add %eax, %eax
             adc %edx, %edx`,
     arm64: `add  x0, x0, x0`,
     arm:   `adds r0, r0, r0
             adc  r1, r1, r1`},
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "mul32_fourR") (param $p1 i32) (result i32)
       (i32.mul (local.get $p1) (i32.const 4))))`,
    "mul32_fourR",
    {x64:   `lea \\(,%rdi,4\\), %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax
             shl \\$0x02, %eax`,
     arm64: `lsl w0, w0, #2`,
     arm:   `mov r0, r0, lsl #2`},
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "mul64_fourR") (param $p1 i64) (result i64)
       (i64.mul (local.get $p1) (i64.const 4))))`,
    "mul64_fourR",
    {x64:   `lea \\(,%rdi,4\\), %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax
             shld \\$0x02, %eax, %edx
             shl \\$0x02, %eax`,
     arm64: `lsl x0, x0, #2`,
     arm:   `mov r1, r1, lsl #2
             orr r1, r1, r0, lsr #30
             mov r0, r0, lsl #2`
    },
    {x86: {no_prefix:true}}
);

// Shifts by zero (the right arg is zero)
//
// x >> 0  =>  x  (any shift kind: shl, shrU, shrS)

codegenTestMultiplatform_adhoc(
    `(module (func (export "shl32_zeroR") (param $p1 i32) (result i32)
       (i32.shl (local.get $p1) (i32.const 0))))`,
    "shl32_zeroR",
    // FIXME check these are consistently folded out at the MIR level
    {x64:   `mov %edi, %ecx
             mov %ecx, %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax`,
     arm64: `mov w0, w0`,
     arm:   `` // no-op 
    },
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "shl64_zeroR") (param $p1 i64) (result i64)
       (i64.shl (local.get $p1) (i64.const 0))))`,
    "shl64_zeroR",
    // FIXME why is this code so much better than the 32-bit case?
    {x64:   `mov %rdi, %rcx
             mov %rcx, %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax`,
     arm64: ``, // no-op
     arm:   ``  // no-op
    },
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "shrU32_zeroR") (param $p1 i32) (result i32)
       (i32.shr_u (local.get $p1) (i32.const 0))))`,
    "shrU32_zeroR",
    {x64:   `mov %edi, %ecx
             mov %ecx, %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax`,
     arm64: `mov w0, w0`,
     arm:   ``
    },
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "shrU64_zeroR") (param $p1 i64) (result i64)
       (i64.shr_u (local.get $p1) (i64.const 0))))`,
    "shrU64_zeroR",
    {x64:   `mov %rdi, %rcx
             mov %rcx, %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax`,
     arm64: ``,
     arm:   ``
    },
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "shrS32_zeroR") (param $p1 i32) (result i32)
       (i32.shr_s (local.get $p1) (i32.const 0))))`,
    "shrS32_zeroR",
    {x64:   `mov %edi, %ecx
             mov %ecx, %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax`,
     arm64: `mov w0, w0`,
     arm:   ``
    },
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "shrS64_zeroR") (param $p1 i64) (result i64)
       (i64.shr_s (local.get $p1) (i64.const 0))))`,
    "shrS64_zeroR",
    {x64:   `mov %rdi, %rcx
             mov %rcx, %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax`,
     arm64: ``,
     arm:   ``
    },
    {x86: {no_prefix:true}}
);

// Identities involving addition
//
//  x + 0   =>  x
//  0 + x   =>  x
//  x + x   =>  x << 1

codegenTestMultiplatform_adhoc(
    `(module (func (export "add32_zeroR") (param $p1 i32) (result i32)
       (i32.add (local.get $p1) (i32.const 0))))`,
    "add32_zeroR",
    {x64:   `mov %edi, %ecx
             mov %ecx, %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax`,
     arm64: ``,
     arm:   ``
    },
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "add64_zeroR") (param $p1 i64) (result i64)
       (i64.add (local.get $p1) (i64.const 0))))`,
    "add64_zeroR",
    {x64:   `mov %rdi, %rcx
             mov %rcx, %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax`,
     arm64: ``,
     arm:   ``
    },
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "add32_zeroL") (param $p1 i32) (result i32)
       (i32.add (i32.const 0) (local.get $p1))))`,
    "add32_zeroL",
    {x64:   `mov %edi, %ecx
             mov %ecx, %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax`,
     arm64: ``,
     arm:   ``
    },
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "add64_zeroL") (param $p1 i64) (result i64)
       (i64.add (i64.const 0) (local.get $p1))))`,
    "add64_zeroL",
    {x64:   `mov %rdi, %rcx
             mov %rcx, %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax`,
     arm64: ``,
     arm:   ``
    },
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "add32_self") (param $p1 i32) (result i32)
       (i32.add (local.get $p1) (local.get $p1))))`,
    "add32_self",
    {x64:   `mov  %edi, %ecx
             mov  %ecx, %eax
             add  %ecx, %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax
             addl 0x10\\(%rbp\\), %eax`,
     arm64: `add  w0, w0, w0`,
     arm:   `adds r0, r0, r0 `
    },
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "add64_self") (param $p1 i64) (result i64)
       (i64.add (local.get $p1) (local.get $p1))))`,
    "add64_self",
    // FIXME outstandingly bad 32-bit sequences, probably due to the RA
    {x64:   `mov %rdi, %rcx
             mov %rcx, %rax
             add %rcx, %rax`,
     x86:   // -0x21524111 is 0xDEADBEEF
            `movl 0x14\\(%rbp\\), %ebx
             movl 0x10\\(%rbp\\), %ecx
             mov \\$-0x21524111, %edi
             movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax
             add %ecx, %eax
             adc %ebx, %edx`,
     arm64: `add  x0, x0, x0`,
     arm:   // play Musical Chairs for a while
            `mov  r3, r1
             mov  r2, r0
             mov  r5, r3
             mov  r4, r2
             mov  r1, r3
             mov  r0, r2
             adds r0, r0, r4
             adc  r1, r1, r5`
    },
    {x86: {no_prefix:true}}
);

// Identities involving subtraction
//
//  x - 0   =>  x
//  0 - x   =>  -x
//  x - x   =>  0

codegenTestMultiplatform_adhoc(
    `(module (func (export "sub32_zeroR") (param $p1 i32) (result i32)
       (i32.sub (local.get $p1) (i32.const 0))))`,
    "sub32_zeroR",
    {x64:   `mov %edi, %ecx
             mov %ecx, %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax`,
     arm64: ``,
     arm:   ``
    },
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "sub64_zeroR") (param $p1 i64) (result i64)
       (i64.sub (local.get $p1) (i64.const 0))))`,
    "sub64_zeroR",
    {x64:   `mov %rdi, %rcx
             mov %rcx, %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax`,
     arm64: ``,
     arm:   ``
    },
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "sub32_zeroL") (param $p1 i32) (result i32)
       (i32.sub (i32.const 0) (local.get $p1))))`,
    "sub32_zeroL",
    {x64:   `mov %edi, %ecx
             mov %ecx, %eax
             neg %eax`,
     x86:   `movl 0x10\\(%rbp\\), %eax
             neg %eax`,
     arm64: `neg w0, w0 `,
     arm:   `rsb r0, r0, #0`
    },
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "sub64_zeroL") (param $p1 i64) (result i64)
       (i64.sub (i64.const 0) (local.get $p1))))`,
    "sub64_zeroL",
    {x64:   `mov %rdi, %rcx
             mov %rcx, %rax
             neg %rax`,
     x86:   `movl 0x14\\(%rbp\\), %edx
             movl 0x10\\(%rbp\\), %eax
             neg %eax
             adc \\$0x00, %edx
             neg %edx`,
     arm64: `neg  x0, x0`,
     arm:   `rsbs r0, r0, #0
             rsc  r1, r1, #0`
    },
    {x86: {no_prefix:true}}
);

codegenTestMultiplatform_adhoc(
    `(module (func (export "sub32_self") (param $p1 i32) (result i32)
       (i32.sub (local.get $p1) (local.get $p1))))`,
    "sub32_self",
    {x64:   `xor %eax, %eax`,
     x86:   `xor %eax, %eax`,
     arm64: `mov w0, #0x0`,
     arm:   `mov r0, #0`
    },
    {x86: {no_prefix:true}}
);
codegenTestMultiplatform_adhoc(
    `(module (func (export "sub64_self") (param $p1 i64) (result i64)
       (i64.sub (local.get $p1) (local.get $p1))))`,
    "sub64_self",
    {x64:   `xor %eax, %eax`,
     x86:   `xor %eax, %eax
             xor %edx, %edx`,
     arm64: `mov x0, #0x0`,
     arm:   `mov r0, #0
             mov r1, #0`
    },
    {x86: {no_prefix:true}}
);
