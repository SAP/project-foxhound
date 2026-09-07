// |jit-test| skip-if: !wasmSimdEnabled() || !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("x64") || getBuildConfiguration("simulator"); include:codegen-x64-test.js

// Test that there are no extraneous moves or fixups for various SIMD comparison
// operations.  See README-codegen.md for general information about this type of
// test case.

// Inputs (xmm0, xmm1)

codegenTestX64_v128xv128_v128(
    [['i8x16.gt_s', `pcmpgtb %xmm1, %xmm0`],
     ['i16x8.gt_s', `pcmpgtw %xmm1, %xmm0`],
     ['i32x4.gt_s', `pcmpgtd %xmm1, %xmm0`],
     ['i8x16.le_s', `
pcmpgtb %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0
`],
     ['i16x8.le_s', `
pcmpgtw %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0
`],
     ['i32x4.le_s', `
pcmpgtd %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0
`],
     ['i8x16.eq', `pcmpeqb %xmm1, %xmm0`],
     ['i16x8.eq', `pcmpeqw %xmm1, %xmm0`],
     ['i32x4.eq', `pcmpeqd %xmm1, %xmm0`],
     ['i8x16.ne', `
pcmpeqb %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0
`],
     ['i16x8.ne', `
pcmpeqw %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0
`],
     ['i32x4.ne', `
pcmpeqd %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0
`],
     ['f32x4.eq', `cmpps \\$0x00, %xmm1, %xmm0`],
     ['f32x4.ne', `cmpps \\$0x04, %xmm1, %xmm0`],
     ['f32x4.lt', `cmpps \\$0x01, %xmm1, %xmm0`],
     ['f32x4.le', `cmpps \\$0x02, %xmm1, %xmm0`],
     ['f64x2.eq', `cmppd \\$0x00, %xmm1, %xmm0`],
     ['f64x2.ne', `cmppd \\$0x04, %xmm1, %xmm0`],
     ['f64x2.lt', `cmppd \\$0x01, %xmm1, %xmm0`],
     ['f64x2.le', `cmppd \\$0x02, %xmm1, %xmm0`]] );

// Inputs (xmm1, xmm0) because the operation reverses its arguments.

codegenTestX64_v128xv128_v128_reversed(
    [['i8x16.ge_s', `
pcmpgtb %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
     ['i16x8.ge_s',
`
pcmpgtw %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
     ['i32x4.ge_s', `
pcmpgtd %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
     ['i8x16.lt_s', `pcmpgtb %xmm1, %xmm0`],
     ['i16x8.lt_s', `pcmpgtw %xmm1, %xmm0`],
     ['i32x4.lt_s', `pcmpgtd %xmm1, %xmm0`],
     ['f32x4.gt', `cmpps \\$0x01, %xmm1, %xmm0`],
     ['f32x4.ge', `cmpps \\$0x02, %xmm1, %xmm0`],
     ['f64x2.gt', `cmppd \\$0x01, %xmm1, %xmm0`],
     ['f64x2.ge', `cmppd \\$0x02, %xmm1, %xmm0`]] );
