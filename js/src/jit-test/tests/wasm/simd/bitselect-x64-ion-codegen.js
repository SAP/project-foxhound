// |jit-test| skip-if: !wasmSimdEnabled() || !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("x64") || getBuildConfiguration("simulator") || isAvxPresent(); include:codegen-x64-test.js

// Test that there are no extraneous moves or fixups for SIMD bitselect
// operations.  See README-codegen.md for general information about this type of
// test case.

// The codegen enforces onTrue == output so we avoid a move to set that up.
//
// The remaining movdqa is currently unavoidable, it moves the control mask into a temp.
// The temp should be identical to the mask but the regalloc does not currently
// allow this constraint to be enforced.

// Inputs (xmm0, xmm1, xmm2)

codegenTestX64_adhoc(
`(module
    (func (export "f") (param v128) (param v128) (param v128) (param v128) (result v128)
      (v128.bitselect (local.get 0) (local.get 1) (local.get 2))))`,
    'f',
`movdqa %xmm2, %xmm3
pand %xmm3, %xmm0
pandn %xmm1, %xmm3
por %xmm3, %xmm0`);

// Blend constant optimizations

codegenTestX64_adhoc(
  `(module
      (func (export "f") (param v128) (param v128) (param v128) (result v128)
        (v128.bitselect (local.get 0) (local.get 1) (v128.const i32x4 -1 0 0 -1))))`,
      'f',
  `pblendw \\$0x3C, %xmm1, %xmm0`);

// vpblendvp optimization when bitselect follows comparison.
// Non-AVX pblendvb uses xmm0 as an implicit read-only operand.
codegenTestX64_adhoc(
  `(module
      (func (export "f") (param v128) (param v128) (param v128) (param v128) (result v128)
        (v128.bitselect (local.get 2) (local.get 3)
           (i32x4.eq (local.get 0) (local.get 1)))))`,
      'f', `
pcmpeqd %xmm1, %xmm0
movdqa %xmm3, %xmm1
pblendvb %xmm2, %xmm1
movdqa %xmm1, %xmm0`);
