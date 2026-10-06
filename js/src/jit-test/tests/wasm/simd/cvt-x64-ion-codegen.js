// |jit-test| skip-if: !wasmSimdEnabled() || !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("x64") || getBuildConfiguration("simulator") || isAvxPresent(); include:codegen-x64-test.js

// Test that there are no extraneous moves for various SIMD conversion
// operations. See README-codegen.md for general information about this type of
// test case.

// Note, these tests test the beginning of the output but not the end.

codegenTestX64_v128_v128(
    [['i32x4.trunc_sat_f32x4_s',
     // The movaps is dest -> scratch and needs to be here.  The test is
     // asserting that there is not an additional (redundant) move here.
`
movaps %xmm0, %xmm15
cmpps \\$0x00, %xmm15, %xmm15
pand %xmm15, %xmm0`],
     ['i32x4.trunc_sat_f32x4_u', `
xorps %xmm15, %xmm15
maxps %xmm15, %xmm0`],
     ['f32x4.convert_i32x4_u', `
pxor %xmm15, %xmm15
pblendw \\$0x55, %xmm0, %xmm15
psubd %xmm15, %xmm0
cvtdq2ps %xmm15, %xmm15`]],
    {no_suffix:true});


