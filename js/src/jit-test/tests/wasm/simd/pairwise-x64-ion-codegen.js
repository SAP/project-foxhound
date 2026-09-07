// |jit-test| skip-if: !wasmSimdEnabled() || !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("x64") || getBuildConfiguration("simulator"); include:codegen-x64-test.js

// Tests for SIMD add pairwise instructions.

if (!isAvxPresent()) {

     codegenTestX64_IGNOREDxv128_v128(
          [['i16x8.extadd_pairwise_i8x16_s', `
movdqax ${RIPR}, %xmm0
pmaddubsw %xmm1, %xmm0`],
           ['i16x8.extadd_pairwise_i8x16_u', `
movdqa %xmm1, %xmm0
pmaddubswx ${RIPR}, %xmm0`],
           ['i32x4.extadd_pairwise_i16x8_s', `
movdqa %xmm1, %xmm0
pmaddwdx ${RIPR}, %xmm0`],
           ['i32x4.extadd_pairwise_i16x8_u', `
movdqa %xmm1, %xmm0
pxorx ${RIPR}, %xmm0
pmaddwdx ${RIPR}, %xmm0
padddx ${RIPR}, %xmm0`]]);

} else {

     codegenTestX64_IGNOREDxv128_v128(
          [['i16x8.extadd_pairwise_i8x16_s', `
movdqax ${RIPR}, %xmm0
pmaddubsw %xmm1, %xmm0`],
           ['i16x8.extadd_pairwise_i8x16_u', `
vpmaddubswx ${RIPR}, %xmm1, %xmm0`],
           ['i32x4.extadd_pairwise_i16x8_s', `
vpmaddwdx ${RIPR}, %xmm1, %xmm0`],
           ['i32x4.extadd_pairwise_i16x8_u', `
vpxorx ${RIPR}, %xmm1, %xmm0
pmaddwdx ${RIPR}, %xmm0
padddx ${RIPR}, %xmm0`]]);

}
