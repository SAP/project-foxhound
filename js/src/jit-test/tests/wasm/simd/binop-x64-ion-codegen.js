// |jit-test| skip-if: !wasmSimdEnabled() || !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("x64") || getBuildConfiguration("simulator"); include:codegen-x64-test.js

// Test that there are no extraneous moves or fixups for sundry SIMD binary
// operations.  See README-codegen.md for general information about this type of
// test case.

// Inputs (xmm0, xmm1)

codegenTestX64_v128xPTYPE_v128(
    [['f32x4.replace_lane 0', 'f32', `movss %xmm1, %xmm0`],
     ['f32x4.replace_lane 1', 'f32', `insertps \\$0x10, %xmm1, %xmm0`],
     ['f32x4.replace_lane 3', 'f32', `insertps \\$0x30, %xmm1, %xmm0`],
     ['f64x2.replace_lane 0', 'f64', `movsd %xmm1, %xmm0`],
     ['f64x2.replace_lane 1', 'f64', `shufpd \\$0x00, %xmm1, %xmm0`]] );

// Inputs (xmm1, xmm0)

codegenTestX64_v128xv128_v128_reversed(
    [['f32x4.pmin', `minps %xmm1, %xmm0`],
     ['f32x4.pmax', `maxps %xmm1, %xmm0`],
     ['f64x2.pmin', `minpd %xmm1, %xmm0`],
     ['f64x2.pmax', `maxpd %xmm1, %xmm0`]] );

// Constant arguments that are folded into the instruction

codegenTestX64_v128xLITERAL_v128(
    [['i8x16.add', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `paddbx ${RIPR}, %xmm0`],
     ['i8x16.sub', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `psubbx ${RIPR}, %xmm0`],
     ['i8x16.add_sat_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `paddsbx ${RIPR}, %xmm0`],
     ['i8x16.add_sat_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `paddusbx ${RIPR}, %xmm0`],
     ['i8x16.sub_sat_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `psubsbx ${RIPR}, %xmm0`],
     ['i8x16.sub_sat_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `psubusbx ${RIPR}, %xmm0`],
     ['i8x16.min_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pminsbx ${RIPR}, %xmm0`],
     ['i8x16.min_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pminubx ${RIPR}, %xmm0`],
     ['i8x16.max_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pmaxsbx ${RIPR}, %xmm0`],
     ['i8x16.max_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pmaxubx ${RIPR}, %xmm0`],
     ['i8x16.eq', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pcmpeqbx ${RIPR}, %xmm0`],
     ['i8x16.ne', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)', `
pcmpeqbx ${RIPR}, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
     ['i8x16.gt_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pcmpgtbx ${RIPR}, %xmm0`],
     ['i8x16.le_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)', `
pcmpgtbx ${RIPR}, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
     ['i8x16.narrow_i16x8_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `packsswbx ${RIPR}, %xmm0`],
     ['i8x16.narrow_i16x8_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `packuswbx ${RIPR}, %xmm0`],

     ['i16x8.add', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `paddwx ${RIPR}, %xmm0`],
     ['i16x8.sub', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `psubwx ${RIPR}, %xmm0`],
     ['i16x8.mul', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pmullwx ${RIPR}, %xmm0`],
     ['i16x8.add_sat_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `paddswx ${RIPR}, %xmm0`],
     ['i16x8.add_sat_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `padduswx ${RIPR}, %xmm0`],
     ['i16x8.sub_sat_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `psubswx ${RIPR}, %xmm0`],
     ['i16x8.sub_sat_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `psubuswx ${RIPR}, %xmm0`],
     ['i16x8.min_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pminswx ${RIPR}, %xmm0`],
     ['i16x8.min_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pminuwx ${RIPR}, %xmm0`],
     ['i16x8.max_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pmaxswx ${RIPR}, %xmm0`],
     ['i16x8.max_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pmaxuwx ${RIPR}, %xmm0`],
     ['i16x8.eq', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pcmpeqwx ${RIPR}, %xmm0`],
     ['i16x8.ne', '(v128.const i16x8 1 2 1 2 1 2 1 2)', `
pcmpeqwx ${RIPR}, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
     ['i16x8.gt_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pcmpgtwx ${RIPR}, %xmm0`],
     ['i16x8.le_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)', `
pcmpgtwx ${RIPR}, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
     ['i16x8.narrow_i32x4_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `packssdwx ${RIPR}, %xmm0`],
     ['i16x8.narrow_i32x4_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `packusdwx ${RIPR}, %xmm0`],

     ['i32x4.add', '(v128.const i32x4 1 2 1 2)',
      `padddx ${RIPR}, %xmm0`],
     ['i32x4.sub', '(v128.const i32x4 1 2 1 2)',
      `psubdx ${RIPR}, %xmm0`],
     ['i32x4.mul', '(v128.const i32x4 1 2 1 2)',
      `pmulldx ${RIPR}, %xmm0`],
     ['i32x4.min_s', '(v128.const i32x4 1 2 1 2)',
      `pminsdx ${RIPR}, %xmm0`],
     ['i32x4.min_u', '(v128.const i32x4 1 2 1 2)',
      `pminudx ${RIPR}, %xmm0`],
     ['i32x4.max_s', '(v128.const i32x4 1 2 1 2)',
      `pmaxsdx ${RIPR}, %xmm0`],
     ['i32x4.max_u', '(v128.const i32x4 1 2 1 2)',
      `pmaxudx ${RIPR}, %xmm0`],
     ['i32x4.eq', '(v128.const i32x4 1 2 1 2)',
      `pcmpeqdx ${RIPR}, %xmm0`],
     ['i32x4.ne', '(v128.const i32x4 1 2 1 2)', `
pcmpeqdx ${RIPR}, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
     ['i32x4.gt_s', '(v128.const i32x4 1 2 1 2)',
      `pcmpgtdx ${RIPR}, %xmm0`],
     ['i32x4.le_s', '(v128.const i32x4 1 2 1 2)', `
pcmpgtdx ${RIPR}, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
     ['i32x4.dot_i16x8_s', '(v128.const i32x4 1 2 1 2)',
      `pmaddwdx ${RIPR}, %xmm0`],

     ['i64x2.add', '(v128.const i64x2 1 2)',
      `paddqx ${RIPR}, %xmm0`],
     ['i64x2.sub', '(v128.const i64x2 1 2)',
      `psubqx ${RIPR}, %xmm0`],

     ['v128.and', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pandx ${RIPR}, %xmm0`],
     ['v128.or', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `porx ${RIPR}, %xmm0`],
     ['v128.xor', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pxorx ${RIPR}, %xmm0`],

     ['f32x4.add', '(v128.const f32x4 1 2 3 4)',
      `addpsx ${RIPR}, %xmm0`],
     ['f32x4.sub', '(v128.const f32x4 1 2 3 4)',
      `subpsx ${RIPR}, %xmm0`],
     ['f32x4.mul', '(v128.const f32x4 1 2 3 4)',
      `mulpsx ${RIPR}, %xmm0`],
     ['f32x4.div', '(v128.const f32x4 1 2 3 4)',
      `divpsx ${RIPR}, %xmm0`],
     ['f32x4.eq', '(v128.const f32x4 1 2 3 4)',
      `cmppsx \\$0x00, ${RIPR}, %xmm0`],
     ['f32x4.ne', '(v128.const f32x4 1 2 3 4)',
      `cmppsx \\$0x04, ${RIPR}, %xmm0`],
     ['f32x4.lt', '(v128.const f32x4 1 2 3 4)',
      `cmppsx \\$0x01, ${RIPR}, %xmm0`],
     ['f32x4.le', '(v128.const f32x4 1 2 3 4)',
      `cmppsx \\$0x02, ${RIPR}, %xmm0`],

     ['f64x2.add', '(v128.const f64x2 1 2)',
      `addpdx ${RIPR}, %xmm0`],
     ['f64x2.sub', '(v128.const f64x2 1 2)',
      `subpdx ${RIPR}, %xmm0`],
     ['f64x2.mul', '(v128.const f64x2 1 2)',
      `mulpdx ${RIPR}, %xmm0`],
     ['f64x2.div', '(v128.const f64x2 1 2)',
      `divpdx ${RIPR}, %xmm0`],
     ['f64x2.eq', '(v128.const f64x2 1 2)',
      `cmppdx \\$0x00, ${RIPR}, %xmm0`],
     ['f64x2.ne', '(v128.const f64x2 1 2)',
      `cmppdx \\$0x04, ${RIPR}, %xmm0`],
     ['f64x2.lt', '(v128.const f64x2 1 2)',
      `cmppdx \\$0x01, ${RIPR}, %xmm0`],
     ['f64x2.le', '(v128.const f64x2 1 2)',
      `cmppdx \\$0x02, ${RIPR}, %xmm0`]]);

// Commutative operations with constants on the lhs should generate the same
// code as with the constant on the rhs.

codegenTestX64_LITERALxv128_v128(
    [['i8x16.add', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `paddbx ${RIPR}, %xmm0`],
     ['i8x16.add_sat_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `paddsbx ${RIPR}, %xmm0`],
     ['i8x16.add_sat_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `paddusbx ${RIPR}, %xmm0`],
     ['i8x16.min_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pminsbx ${RIPR}, %xmm0`],
     ['i8x16.min_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pminubx ${RIPR}, %xmm0`],
     ['i8x16.max_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pmaxsbx ${RIPR}, %xmm0`],
     ['i8x16.max_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pmaxubx ${RIPR}, %xmm0`],
     ['i8x16.eq', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pcmpeqbx ${RIPR}, %xmm0`],
     ['i8x16.ne', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)', `
pcmpeqbx ${RIPR}, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],

     ['i16x8.add', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `paddwx ${RIPR}, %xmm0`],
     ['i16x8.mul', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pmullwx ${RIPR}, %xmm0`],
     ['i16x8.add_sat_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `paddswx ${RIPR}, %xmm0`],
     ['i16x8.add_sat_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `padduswx ${RIPR}, %xmm0`],
     ['i16x8.min_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pminswx ${RIPR}, %xmm0`],
     ['i16x8.min_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pminuwx ${RIPR}, %xmm0`],
     ['i16x8.max_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pmaxswx ${RIPR}, %xmm0`],
     ['i16x8.max_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pmaxuwx ${RIPR}, %xmm0`],
     ['i16x8.eq', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
      `pcmpeqwx ${RIPR}, %xmm0`],
     ['i16x8.ne', '(v128.const i16x8 1 2 1 2 1 2 1 2)', `
pcmpeqwx ${RIPR}, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],

     ['i32x4.add', '(v128.const i32x4 1 2 1 2)',
      `padddx ${RIPR}, %xmm0`],
     ['i32x4.mul', '(v128.const i32x4 1 2 1 2)',
      `pmulldx ${RIPR}, %xmm0`],
     ['i32x4.min_s', '(v128.const i32x4 1 2 1 2)',
      `pminsdx ${RIPR}, %xmm0`],
     ['i32x4.min_u', '(v128.const i32x4 1 2 1 2)',
      `pminudx ${RIPR}, %xmm0`],
     ['i32x4.max_s', '(v128.const i32x4 1 2 1 2)',
      `pmaxsdx ${RIPR}, %xmm0`],
     ['i32x4.max_u', '(v128.const i32x4 1 2 1 2)',
      `pmaxudx ${RIPR}, %xmm0`],
     ['i32x4.eq', '(v128.const i32x4 1 2 1 2)',
      `pcmpeqdx ${RIPR}, %xmm0`],
     ['i32x4.ne', '(v128.const i32x4 1 2 1 2)', `
pcmpeqdx ${RIPR}, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
     ['i32x4.dot_i16x8_s', '(v128.const i32x4 1 2 1 2)',
      `pmaddwdx ${RIPR}, %xmm0`],

     ['i64x2.add', '(v128.const i64x2 1 2)',
      `paddqx ${RIPR}, %xmm0`],

     ['v128.and', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pandx ${RIPR}, %xmm0`],
     ['v128.or', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `porx ${RIPR}, %xmm0`],
     ['v128.xor', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
      `pxorx ${RIPR}, %xmm0`]]);
