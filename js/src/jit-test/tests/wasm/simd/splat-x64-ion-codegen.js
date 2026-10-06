// |jit-test| skip-if: !wasmSimdEnabled() || !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("x64") || getBuildConfiguration("simulator") || isAvxPresent(); include:codegen-x64-test.js

// Test that there are no extraneous moves or other instructions for splat and
// other splat-like operations that can reuse its input for its output and/or
// has a specializable code path.  See README-codegen.md for general information
// about this type of test case.

codegenTestX64_PTYPE_v128(
    [['f32x4.splat', 'f32', `shufps \\$0x00, %xmm0, %xmm0`],
     ['f64x2.splat', 'f64', `movddup %xmm0, %xmm0`]] , {log:true});

// Skip these on Win64 because the ABI differs and there's a different parameter
// register, this changes not just the name slightly but the binary encoding in
// larger ways.

if (!getBuildConfiguration("windows")) {
    codegenTestX64_PTYPE_v128(
        [['v128.load32_splat', 'i32', `
movssl \\(%r15,%rdi,1\\), %xmm0
shufps \\$0x00, %xmm0, %xmm0`],
         ['v128.load64_splat', 'i32', `movddupq \\(%r15,%rdi,1\\), %xmm0`],
         ['v128.load8x8_s',    'i32', `pmovsxbwq \\(%r15,%rdi,1\\), %xmm0`],
         ['v128.load8x8_u',    'i32', `pmovzxbwq \\(%r15,%rdi,1\\), %xmm0`],
         ['v128.load16x4_s',   'i32', `pmovsxwdq \\(%r15,%rdi,1\\), %xmm0`],
         ['v128.load16x4_u',   'i32', `pmovzxwdq \\(%r15,%rdi,1\\), %xmm0`],
         ['v128.load32x2_s',   'i32', `pmovsxdqq \\(%r15,%rdi,1\\), %xmm0`],
         ['v128.load32x2_u',   'i32', `pmovzxdqq \\(%r15,%rdi,1\\), %xmm0`]],
        {memory:1});
}
