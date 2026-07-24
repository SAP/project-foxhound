// |jit-test| skip-if: !wasmSimdEnabled() || !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("x64") || getBuildConfiguration("simulator"); include:codegen-x64-test.js

// Test that there are no extraneous moves for a constant integer SIMD shift
// that can reuse its input for its output.  See README-codegen.md for general
// information about this type of test case.
//
// There are test cases here for all codegen cases that include a potential move
// to set up the operation, but not for all shift operations in general.

codegenTestX64_v128xLITERAL_v128(
    [['i8x16.shl', '(i32.const 2)', `
paddb %xmm0, %xmm0
paddb %xmm0, %xmm0`],
     ['i16x8.shl', '(i32.const 2)', `psllw \\$0x02, %xmm0`],
     ['i32x4.shl', '(i32.const 2)', `pslld \\$0x02, %xmm0`],
     ['i64x2.shl', '(i32.const 2)', `psllq \\$0x02, %xmm0`],
     ['i8x16.shr_u', '(i32.const 2)', `
pandx ${RIPR}, %xmm0
psrlw \\$0x02, %xmm0`],
     ['i16x8.shr_s', '(i32.const 2)', `psraw \\$0x02, %xmm0`],
     ['i16x8.shr_u', '(i32.const 2)', `psrlw \\$0x02, %xmm0`],
     ['i32x4.shr_s', '(i32.const 2)', `psrad \\$0x02, %xmm0`],
     ['i32x4.shr_u', '(i32.const 2)', `psrld \\$0x02, %xmm0`],
     ['i64x2.shr_u', '(i32.const 2)', `psrlq \\$0x02, %xmm0`]] );


