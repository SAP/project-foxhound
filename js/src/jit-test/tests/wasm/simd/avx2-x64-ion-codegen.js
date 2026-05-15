// |jit-test| skip-if: !wasmSimdEnabled() || !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("x64") || getBuildConfiguration("simulator") || !isAvxPresent(); include:codegen-x64-test.js

// Test that there are no extraneous moves for various SIMD conversion
// operations. See README-codegen.md for general information about this type of
// test case.

// Note, these tests test the beginning of the output but not the end.

// Currently AVX2 exhibits a defect when function uses its first v128 arg and
// returns v128: the register allocator adds unneeded extra moves from xmm0,
// then into different temporary, and then the latter temporary is used as arg.
// In the tests below, to simplify things, don't use/ignore the first arg.
// v128 OP v128 -> v128
// inputs: [[complete-opname, expected-pattern], ...]
function codegenTestX64_v128xv128_v128_avxhack(inputs, options = {}) {
     for ( let [op, expected] of inputs ) {
         codegenTestX64_adhoc(wrap(options, `
         (func (export "f") (param v128 v128 v128) (result v128)
           (${op} (local.get 1) (local.get 2)))`),
                              'f',
                              expected,
                              options);
     }
}
// (see codegenTestX64_v128xv128_v128_avxhack comment about AVX defect)
// v128 OP const -> v128
// inputs: [[complete-opname, const, expected-pattern], ...]
function codegenTestX64_v128xLITERAL_v128_avxhack(inputs, options = {}) {
     for ( let [op, const_, expected] of inputs ) {
         codegenTestX64_adhoc(wrap(options, `
         (func (export "f") (param v128 v128) (result v128)
           (${op} (local.get 1) ${const_}))`),
                              'f',
                              expected,
                              options);
     }
}
// (see codegenTestX64_v128xv128_v128_avxhack comment about AVX defect)
// const OP v128 -> v128
// inputs: [[complete-opname, const, expected-pattern], ...]
function codegenTestX64_LITERALxv128_v128_avxhack(inputs, options = {}) {
     for ( let [op, const_, expected] of inputs ) {
         codegenTestX64_adhoc(wrap(options, `
         (func (export "f") (param v128 v128) (result v128)
           (${op} ${const_} (local.get 1)))`),
                              'f',
                              expected,
                              options);
     }
}

// Utility function to test SIMD operations encoding, where the input argument
// has the specified type (T).
// inputs: [[type, complete-opname, expected-pattern], ...]
function codegenTestX64_T_v128_avxhack(inputs, options = {}) {
     for ( let [ty, op, expected] of inputs ) {
         codegenTestX64_adhoc(wrap(options, `
         (func (export "f") (param ${ty}) (result v128)
           (${op} (local.get 0)))`),
                              'f',
                              expected,
                              options);
     }
}

// Machers for any 64- and 32-bit registers.
var GPR_I64 = "%r\\w+";
var GPR_I32 = "%(?:e\\w+|r\\d+d)";

// Simple binary ops: e.g. add, sub, mul
codegenTestX64_v128xv128_v128_avxhack(
     [['i8x16.avgr_u',    `vpavgb %xmm2, %xmm1, %xmm0`],
      ['i16x8.avgr_u',    `vpavgw %xmm2, %xmm1, %xmm0`],
      ['i8x16.add',       `vpaddb %xmm2, %xmm1, %xmm0`],
      ['i8x16.add_sat_s', `vpaddsb %xmm2, %xmm1, %xmm0`],
      ['i8x16.add_sat_u', `vpaddusb %xmm2, %xmm1, %xmm0`],
      ['i8x16.sub',       `vpsubb %xmm2, %xmm1, %xmm0`],
      ['i8x16.sub_sat_s', `vpsubsb %xmm2, %xmm1, %xmm0`],
      ['i8x16.sub_sat_u', `vpsubusb %xmm2, %xmm1, %xmm0`],
      ['i16x8.mul',       `vpmullw %xmm2, %xmm1, %xmm0`],
      ['i16x8.min_s',     `vpminsw %xmm2, %xmm1, %xmm0`],
      ['i16x8.min_u',     `vpminuw %xmm2, %xmm1, %xmm0`],
      ['i16x8.max_s',     `vpmaxsw %xmm2, %xmm1, %xmm0`],
      ['i16x8.max_u',     `vpmaxuw %xmm2, %xmm1, %xmm0`],
      ['i32x4.add',       `vpaddd %xmm2, %xmm1, %xmm0`],
      ['i32x4.sub',       `vpsubd %xmm2, %xmm1, %xmm0`],
      ['i32x4.mul',       `vpmulld %xmm2, %xmm1, %xmm0`],
      ['i32x4.min_s',     `vpminsd %xmm2, %xmm1, %xmm0`],
      ['i32x4.min_u',     `vpminud %xmm2, %xmm1, %xmm0`],
      ['i32x4.max_s',     `vpmaxsd %xmm2, %xmm1, %xmm0`],
      ['i32x4.max_u',     `vpmaxud %xmm2, %xmm1, %xmm0`],
      ['i64x2.add',       `vpaddq %xmm2, %xmm1, %xmm0`],
      ['i64x2.sub',       `vpsubq %xmm2, %xmm1, %xmm0`],
      ['i64x2.mul', `
vpsrlq \\$0x20, %xmm1, %xmm3
pmuludq %xmm2, %xmm3
vpsrlq \\$0x20, %xmm2, %xmm15
pmuludq %xmm1, %xmm15
paddq %xmm3, %xmm15
psllq \\$0x20, %xmm15
vpmuludq %xmm2, %xmm1, %xmm0
paddq %xmm15, %xmm0`],
      ['f32x4.add',            `vaddps %xmm2, %xmm1, %xmm0`],
      ['f32x4.sub',            `vsubps %xmm2, %xmm1, %xmm0`],
      ['f32x4.mul',            `vmulps %xmm2, %xmm1, %xmm0`],
      ['f32x4.div',            `vdivps %xmm2, %xmm1, %xmm0`],
      ['f64x2.add',            `vaddpd %xmm2, %xmm1, %xmm0`],
      ['f64x2.sub',            `vsubpd %xmm2, %xmm1, %xmm0`],
      ['f64x2.mul',            `vmulpd %xmm2, %xmm1, %xmm0`],
      ['f64x2.div',            `vdivpd %xmm2, %xmm1, %xmm0`],
      ['i8x16.narrow_i16x8_s', `vpacksswb %xmm2, %xmm1, %xmm0`],
      ['i8x16.narrow_i16x8_u', `vpackuswb %xmm2, %xmm1, %xmm0`],
      ['i16x8.narrow_i32x4_s', `vpackssdw %xmm2, %xmm1, %xmm0`],
      ['i16x8.narrow_i32x4_u', `vpackusdw %xmm2, %xmm1, %xmm0`],
      ['i32x4.dot_i16x8_s',    `vpmaddwd %xmm2, %xmm1, %xmm0`]]);

// Simple comparison ops
codegenTestX64_v128xv128_v128_avxhack(
     [['i8x16.eq', `vpcmpeqb %xmm2, %xmm1, %xmm0`],
      ['i8x16.ne', `
vpcmpeqb %xmm2, %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
      ['i8x16.lt_s', `vpcmpgtb %xmm1, %xmm2, %xmm0`],
      ['i8x16.gt_u', `
vpmaxub %xmm2, %xmm1, %xmm0
pcmpeqb %xmm2, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
      ['i16x8.eq', `vpcmpeqw %xmm2, %xmm1, %xmm0`],
      ['i16x8.ne', `
vpcmpeqw %xmm2, %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
      ['i16x8.le_s', `
vpcmpgtw %xmm2, %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
      ['i16x8.ge_u', `
vpminuw %xmm2, %xmm1, %xmm0
pcmpeqw %xmm2, %xmm0`],
      ['i32x4.eq', `vpcmpeqd %xmm2, %xmm1, %xmm0`],
      ['i32x4.ne', `
vpcmpeqd %xmm2, %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
      ['i32x4.lt_s', `vpcmpgtd %xmm1, %xmm2, %xmm0`],
      ['i32x4.gt_u', `
vpmaxud %xmm2, %xmm1, %xmm0
pcmpeqd %xmm2, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
      ['i64x2.eq', `vpcmpeqq %xmm2, %xmm1, %xmm0`],
      ['i64x2.ne', `
vpcmpeqq %xmm2, %xmm1, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
      ['i64x2.lt_s', `vpcmpgtq %xmm1, %xmm2, %xmm0`],
      ['i64x2.ge_s', `
vpcmpgtq %xmm1, %xmm2, %xmm0
pcmpeqw %xmm15, %xmm15
pxor %xmm15, %xmm0`],
      ['f32x4.eq', `vcmpps \\$0x00, %xmm2, %xmm1, %xmm0`],
      ['f32x4.lt', `vcmpps \\$0x01, %xmm2, %xmm1, %xmm0`],
      ['f32x4.ge', `vcmpps \\$0x02, %xmm1, %xmm2, %xmm0`],
      ['f64x2.eq', `vcmppd \\$0x00, %xmm2, %xmm1, %xmm0`],
      ['f64x2.lt', `vcmppd \\$0x01, %xmm2, %xmm1, %xmm0`],
      ['f64x2.ge', `vcmppd \\$0x02, %xmm1, %xmm2, %xmm0`],
      ['f32x4.pmin', `vminps %xmm1, %xmm2, %xmm0`],
      ['f32x4.pmax', `vmaxps %xmm1, %xmm2, %xmm0`],
      ['f64x2.pmin', `vminpd %xmm1, %xmm2, %xmm0`],
      ['f64x2.pmax', `vmaxpd %xmm1, %xmm2, %xmm0`],
      ['i8x16.swizzle', `
vpaddusbx ${RIPR}, %xmm2, %xmm15
vpshufb %xmm15, %xmm1, %xmm0`],
      ['i16x8.extmul_high_i8x16_s', `
palignr \\$0x08, %xmm2, %xmm15
vpmovsxbw %xmm15, %xmm15
palignr \\$0x08, %xmm1, %xmm0
vpmovsxbw %xmm0, %xmm0
pmullw %xmm15, %xmm0`],
      ['i32x4.extmul_low_i16x8_u', `
vpmulhuw %xmm2, %xmm1, %xmm15
vpmullw %xmm2, %xmm1, %xmm0
punpcklwd %xmm15, %xmm0`],
      ['i64x2.extmul_low_i32x4_s', `
vpshufd \\$0x10, %xmm1, %xmm15
vpshufd \\$0x10, %xmm2, %xmm0
pmuldq %xmm15, %xmm0`],
      ['i16x8.q15mulr_sat_s', `
vpmulhrsw %xmm2, %xmm1, %xmm0
vpcmpeqwx ${RIPR}, %xmm0, %xmm15
pxor %xmm15, %xmm0`],
]);

// Bitwise binary ops
codegenTestX64_v128xv128_v128_avxhack(
     [['v128.and', `vpand %xmm2, %xmm1, %xmm0`],
      ['v128.andnot', `vpandn %xmm1, %xmm2, %xmm0`],
      ['v128.or', `vpor %xmm2, %xmm1, %xmm0`],
      ['v128.xor', `vpxor %xmm2, %xmm1, %xmm0`]]);


// Replace lane ops.
codegenTestX64_adhoc(`(module
     (func (export "f") (param v128 v128 i32) (result v128)
          (i8x16.replace_lane 7 (local.get 1) (local.get 2))))`, 'f', `
vpinsrb \\$0x07, ${GPR_I32}, %xmm1, %xmm0`);
codegenTestX64_adhoc(`(module
     (func (export "f") (param v128 v128 i32) (result v128)
          (i16x8.replace_lane 3 (local.get 1) (local.get 2))))`, 'f', `
vpinsrw \\$0x03, ${GPR_I32}, %xmm1, %xmm0`);
codegenTestX64_adhoc(`(module
     (func (export "f") (param v128 v128 i32) (result v128)
          (i32x4.replace_lane 2 (local.get 1) (local.get 2))))`, 'f', `
vpinsrd \\$0x02, ${GPR_I32}, %xmm1, %xmm0`);
codegenTestX64_adhoc(`(module
     (func (export "f") (param v128 v128 i64) (result v128)
          (i64x2.replace_lane 1 (local.get 1) (local.get 2))))`, 'f', `
vpinsrq \\$0x01, ${GPR_I64}, %xmm1, %xmm0`);


if (isAvxPresent(2)) {
     codegenTestX64_T_v128_avxhack(
          [['i32', 'i8x16.splat', `
vmovd ${GPR_I32}, %xmm0
vpbroadcastb %xmm0, %xmm0`],
           ['i32', 'i16x8.splat', `
vmovd ${GPR_I32}, %xmm0
vpbroadcastw %xmm0, %xmm0`],
           ['i32', 'i32x4.splat', `
vmovd ${GPR_I32}, %xmm0
vpbroadcastd %xmm0, %xmm0`],
           ['i64', 'i64x2.splat', `
vmovq ${GPR_I64}, %xmm0
vpbroadcastq %xmm0, %xmm0`],
           ['f32', 'f32x4.splat', `vbroadcastss %xmm0, %xmm0`]], {log:true});

     codegenTestX64_T_v128_avxhack(
          [['i32', 'v128.load8_splat',
            'vpbroadcastbb \\(%r15,%r\\w+,1\\), %xmm0'],
           ['i32', 'v128.load16_splat',
            'vpbroadcastww \\(%r15,%r\\w+,1\\), %xmm0'],
           ['i32', 'v128.load32_splat',
            'vbroadcastssl \\(%r15,%r\\w+,1\\), %xmm0']], {memory: 1});
}

// Using VEX during shuffle ops
codegenTestX64_v128xv128_v128_avxhack([
     // Identity op on second argument should generate a move
    ['i8x16.shuffle 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15',
     'vmovdqa %xmm1, %xmm0'],

     // Broadcast a byte from first argument
    ['i8x16.shuffle 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5',
     `
vpunpcklbw %xmm1, %xmm1, %xmm0
vpshufhw \\$0x55, %xmm0, %xmm0
vpshufd \\$0xAA, %xmm0, %xmm0`],

     // Broadcast a word from first argument
    ['i8x16.shuffle 4 5 4 5 4 5 4 5 4 5 4 5 4 5 4 5',
     `
vpshuflw \\$0xAA, %xmm1, %xmm0
vpshufd \\$0x00, %xmm0, %xmm0`],

     // Permute words
     ['i8x16.shuffle 2 3 0 1 6 7 4 5 10 11 8 9 14 15 12 13',
`
vpshuflw \\$0xB1, %xmm1, %xmm0
vpshufhw \\$0xB1, %xmm0, %xmm0`],

     // Permute doublewords
     ['i8x16.shuffle 4 5 6 7 0 1 2 3 12 13 14 15 8 9 10 11',
      'vpshufd \\$0xB1, %xmm1, %xmm0'],

     // Interleave doublewords
     ['i8x16.shuffle 0 1 2 3 16 17 18 19 4 5 6 7 20 21 22 23',
      'vpunpckldq %xmm2, %xmm1, %xmm0'],

     // Interleave quadwords
     ['i8x16.shuffle 24 25 26 27 28 29 30 31 8 9 10 11 12 13 14 15',
      'vpunpckhqdq %xmm1, %xmm2, %xmm0'],

     // Rotate right
    ['i8x16.shuffle 13 14 15 0 1 2 3 4 5 6 7 8 9 10 11 12',
     `vpalignr \\$0x0D, %xmm1, %xmm1, %xmm0`],
    ['i8x16.shuffle 28 29 30 31 0 1 2 3 4 5 6 7 8 9 10 11',
     `vpalignr \\$0x0C, %xmm2, %xmm1, %xmm0`]]);

if (isAvxPresent(2)) {
     codegenTestX64_v128xv128_v128_avxhack([
          // Broadcast low byte from second argument
          ['i8x16.shuffle 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0',
           'vpbroadcastb %xmm1, %xmm0'],

          // Broadcast low word from third argument
          ['i8x16.shuffle 16 17 16 17 16 17 16 17 16 17 16 17 16 17 16 17',
          'vpbroadcastw %xmm2, %xmm0'],

          // Broadcast low doubleword from second argument
          ['i8x16.shuffle 0 1 2 3 0 1 2 3 0 1 2 3 0 1 2 3',
           'vpbroadcastd %xmm1, %xmm0']]);
}

// Testing AVX optimization where VPBLENDVB accepts four XMM registers as args.
codegenTestX64_adhoc(
     `(func (export "f") (param v128 v128 v128 v128) (result v128)
        (i8x16.shuffle 0 17 2 3 4 5 6 7 24 25 26 11 12 13 30 15
          (local.get 2)(local.get 3)))`,
     'f',
`
movdqax ${RIPR}, %xmm1
vpblendvb %xmm1, %xmm3, %xmm2, %xmm0`);

// Constant arguments that are folded into the instruction
codegenTestX64_v128xLITERAL_v128_avxhack(
     [['i8x16.add', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpaddbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.sub', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpsubbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.add_sat_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpaddsbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.add_sat_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpaddusbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.sub_sat_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpsubsbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.sub_sat_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpsubusbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.min_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpminsbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.min_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpminubx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.max_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpmaxsbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.max_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpmaxubx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.eq', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpcmpeqbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.ne', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)', `
 vpcmpeqbx ${RIPR}, %xmm1, %xmm0
 pcmpeqw %xmm15, %xmm15
 pxor %xmm15, %xmm0`],
      ['i8x16.gt_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpcmpgtbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.le_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)', `
 vpcmpgtbx ${RIPR}, %xmm1, %xmm0
 pcmpeqw %xmm15, %xmm15
 pxor %xmm15, %xmm0`],
      ['i8x16.narrow_i16x8_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpacksswbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.narrow_i16x8_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpackuswbx ${RIPR}, %xmm1, %xmm0`],

      ['i16x8.add', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpaddwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.sub', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpsubwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.mul', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpmullwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.add_sat_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpaddswx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.add_sat_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpadduswx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.sub_sat_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpsubswx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.sub_sat_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpsubuswx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.min_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpminswx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.min_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpminuwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.max_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpmaxswx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.max_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpmaxuwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.eq', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpcmpeqwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.ne', '(v128.const i16x8 1 2 1 2 1 2 1 2)', `
 vpcmpeqwx ${RIPR}, %xmm1, %xmm0
 pcmpeqw %xmm15, %xmm15
 pxor %xmm15, %xmm0`],
      ['i16x8.gt_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpcmpgtwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.le_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)', `
 vpcmpgtwx ${RIPR}, %xmm1, %xmm0
 pcmpeqw %xmm15, %xmm15
 pxor %xmm15, %xmm0`],
      ['i16x8.narrow_i32x4_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpackssdwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.narrow_i32x4_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpackusdwx ${RIPR}, %xmm1, %xmm0`],

      ['i32x4.add', '(v128.const i32x4 1 2 1 2)',
       `vpadddx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.sub', '(v128.const i32x4 1 2 1 2)',
       `vpsubdx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.mul', '(v128.const i32x4 1 2 1 2)',
       `vpmulldx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.min_s', '(v128.const i32x4 1 2 1 2)',
       `vpminsdx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.min_u', '(v128.const i32x4 1 2 1 2)',
       `vpminudx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.max_s', '(v128.const i32x4 1 2 1 2)',
       `vpmaxsdx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.max_u', '(v128.const i32x4 1 2 1 2)',
       `vpmaxudx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.eq', '(v128.const i32x4 1 2 1 2)',
       `vpcmpeqdx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.ne', '(v128.const i32x4 1 2 1 2)', `
 vpcmpeqdx ${RIPR}, %xmm1, %xmm0
 pcmpeqw %xmm15, %xmm15
 pxor %xmm15, %xmm0`],
      ['i32x4.gt_s', '(v128.const i32x4 1 2 1 2)',
       `vpcmpgtdx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.le_s', '(v128.const i32x4 1 2 1 2)', `
 vpcmpgtdx ${RIPR}, %xmm1, %xmm0
 pcmpeqw %xmm15, %xmm15
 pxor %xmm15, %xmm0`],
      ['i32x4.dot_i16x8_s', '(v128.const i32x4 1 2 1 2)',
       `vpmaddwdx ${RIPR}, %xmm1, %xmm0`],

      ['i64x2.add', '(v128.const i64x2 1 2)',
       `vpaddqx ${RIPR}, %xmm1, %xmm0`],
      ['i64x2.sub', '(v128.const i64x2 1 2)',
       `vpsubqx ${RIPR}, %xmm1, %xmm0`],

      ['v128.and', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpandx ${RIPR}, %xmm1, %xmm0`],
      ['v128.or', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vporx ${RIPR}, %xmm1, %xmm0`],
      ['v128.xor', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpxorx ${RIPR}, %xmm1, %xmm0`],

      ['f32x4.add', '(v128.const f32x4 1 2 3 4)',
       `vaddpsx ${RIPR}, %xmm1, %xmm0`],
      ['f32x4.sub', '(v128.const f32x4 1 2 3 4)',
       `vsubpsx ${RIPR}, %xmm1, %xmm0`],
      ['f32x4.mul', '(v128.const f32x4 1 2 3 4)',
       `vmulpsx ${RIPR}, %xmm1, %xmm0`],
      ['f32x4.div', '(v128.const f32x4 1 2 3 4)',
       `vdivpsx ${RIPR}, %xmm1, %xmm0`],

      ['f64x2.add', '(v128.const f64x2 1 2)',
       `vaddpdx ${RIPR}, %xmm1, %xmm0`],
      ['f64x2.sub', '(v128.const f64x2 1 2)',
       `vsubpdx ${RIPR}, %xmm1, %xmm0`],
      ['f64x2.mul', '(v128.const f64x2 1 2)',
       `vmulpdx ${RIPR}, %xmm1, %xmm0`],
      ['f64x2.div', '(v128.const f64x2 1 2)',
       `vdivpdx ${RIPR}, %xmm1, %xmm0`],

      ['f32x4.eq', '(v128.const f32x4 1 2 3 4)',
       `vcmppsx \\$0x00, ${RIPR}, %xmm1, %xmm0`],
      ['f32x4.ne', '(v128.const f32x4 1 2 3 4)',
       `vcmppsx \\$0x04, ${RIPR}, %xmm1, %xmm0`],
      ['f32x4.lt', '(v128.const f32x4 1 2 3 4)',
       `vcmppsx \\$0x01, ${RIPR}, %xmm1, %xmm0`],
      ['f32x4.le', '(v128.const f32x4 1 2 3 4)',
       `vcmppsx \\$0x02, ${RIPR}, %xmm1, %xmm0`],

      ['f64x2.eq', '(v128.const f64x2 1 2)',
       `vcmppdx \\$0x00, ${RIPR}, %xmm1, %xmm0`],
      ['f64x2.ne', '(v128.const f64x2 1 2)',
       `vcmppdx \\$0x04, ${RIPR}, %xmm1, %xmm0`],
      ['f64x2.lt', '(v128.const f64x2 1 2)',
       `vcmppdx \\$0x01, ${RIPR}, %xmm1, %xmm0`],
      ['f64x2.le', '(v128.const f64x2 1 2)',
       `vcmppdx \\$0x02, ${RIPR}, %xmm1, %xmm0`]]);

 // Commutative operations with constants on the lhs should generate the same
 // code as with the constant on the rhs.
 codegenTestX64_LITERALxv128_v128_avxhack(
     [['i8x16.add', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpaddbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.add_sat_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpaddsbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.add_sat_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpaddusbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.min_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpminsbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.min_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpminubx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.max_s', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpmaxsbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.max_u', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpmaxubx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.eq', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpcmpeqbx ${RIPR}, %xmm1, %xmm0`],
      ['i8x16.ne', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)', `
 vpcmpeqbx ${RIPR}, %xmm1, %xmm0
 pcmpeqw %xmm15, %xmm15
 pxor %xmm15, %xmm0`],

      ['i16x8.add', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpaddwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.mul', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpmullwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.add_sat_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpaddswx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.add_sat_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpadduswx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.min_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpminswx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.min_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpminuwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.max_s', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpmaxswx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.max_u', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpmaxuwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.eq', '(v128.const i16x8 1 2 1 2 1 2 1 2)',
       `vpcmpeqwx ${RIPR}, %xmm1, %xmm0`],
      ['i16x8.ne', '(v128.const i16x8 1 2 1 2 1 2 1 2)', `
 vpcmpeqwx ${RIPR}, %xmm1, %xmm0
 pcmpeqw %xmm15, %xmm15
 pxor %xmm15, %xmm0`],

      ['i32x4.add', '(v128.const i32x4 1 2 1 2)',
       `vpadddx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.mul', '(v128.const i32x4 1 2 1 2)',
       `vpmulldx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.min_s', '(v128.const i32x4 1 2 1 2)',
       `vpminsdx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.min_u', '(v128.const i32x4 1 2 1 2)',
       `vpminudx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.max_s', '(v128.const i32x4 1 2 1 2)',
       `vpmaxsdx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.max_u', '(v128.const i32x4 1 2 1 2)',
       `vpmaxudx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.eq', '(v128.const i32x4 1 2 1 2)',
       `vpcmpeqdx ${RIPR}, %xmm1, %xmm0`],
      ['i32x4.ne', '(v128.const i32x4 1 2 1 2)', `
 vpcmpeqdx ${RIPR}, %xmm1, %xmm0
 pcmpeqw %xmm15, %xmm15
 pxor %xmm15, %xmm0`],
      ['i32x4.dot_i16x8_s', '(v128.const i32x4 1 2 1 2)',
       `vpmaddwdx ${RIPR}, %xmm1, %xmm0`],

      ['i64x2.add', '(v128.const i64x2 1 2)',
       `vpaddqx ${RIPR}, %xmm1, %xmm0`],

      ['v128.and', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpandx ${RIPR}, %xmm1, %xmm0`],
      ['v128.or', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vporx ${RIPR}, %xmm1, %xmm0`],
      ['v128.xor', '(v128.const i8x16 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2)',
       `vpxorx ${RIPR}, %xmm1, %xmm0`]]);

// Shift by constant encodings
codegenTestX64_v128xLITERAL_v128_avxhack(
     [['i8x16.shl', '(i32.const 2)', `
vpaddb %xmm1, %xmm1, %xmm0
paddb %xmm0, %xmm0`],
      ['i8x16.shl', '(i32.const 4)', `
vpandx ${RIPR}, %xmm1, %xmm0
psllw \\$0x04, %xmm0`],
      ['i16x8.shl', '(i32.const 1)',
       'vpsllw \\$0x01, %xmm1, %xmm0'],
      ['i16x8.shr_s', '(i32.const 3)',
       'vpsraw \\$0x03, %xmm1, %xmm0'],
      ['i16x8.shr_u', '(i32.const 2)',
       'vpsrlw \\$0x02, %xmm1, %xmm0'],
      ['i32x4.shl', '(i32.const 5)',
       'vpslld \\$0x05, %xmm1, %xmm0'],
      ['i32x4.shr_s', '(i32.const 2)',
       'vpsrad \\$0x02, %xmm1, %xmm0'],
      ['i32x4.shr_u', '(i32.const 5)',
       'vpsrld \\$0x05, %xmm1, %xmm0'],
      ['i64x2.shr_s', '(i32.const 7)', `
vpshufd \\$0xF5, %xmm1, %xmm15
psrad \\$0x1F, %xmm15
vpxor %xmm15, %xmm1, %xmm0
psrlq \\$0x07, %xmm0
pxor %xmm15, %xmm0`]]);

// vpblendvp optimization when bitselect follows comparison.
codegenTestX64_adhoc(
     `(module
         (func (export "f") (param v128) (param v128) (param v128) (param v128) (result v128)
           (v128.bitselect (local.get 2) (local.get 3)
              (i32x4.eq (local.get 0) (local.get 1)))))`,
         'f', `
pcmpeqd %xmm1, %xmm0
vpblendvb %xmm0, %xmm2, %xmm3, %xmm0`);
