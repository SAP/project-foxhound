// |jit-test| skip-if: !wasmSimdEnabled() || !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("x64") || getBuildConfiguration("simulator") || isAvxPresent(); include:codegen-x64-test.js

// Test encoding of the all_true, and any_true operations.

codegenTestX64_v128_i32(
     [['v128.any_true', `
xor %eax, %eax
ptest %xmm0, %xmm0
setnz %al`],
     ['i8x16.all_true', `
xor %eax, %eax
pxor %xmm15, %xmm15
pcmpeqb %xmm0, %xmm15
ptest %xmm15, %xmm15
setz %al`],
     ['i16x8.all_true', `
xor %eax, %eax
pxor %xmm15, %xmm15
pcmpeqw %xmm0, %xmm15
ptest %xmm15, %xmm15
setz %al`],
     ['i32x4.all_true', `
xor %eax, %eax
pxor %xmm15, %xmm15
pcmpeqd %xmm0, %xmm15
ptest %xmm15, %xmm15
setz %al`],
     ['i64x2.all_true', `
xor %eax, %eax
pxor %xmm15, %xmm15
pcmpeqq %xmm0, %xmm15
ptest %xmm15, %xmm15
setz %al`]], {}
)

// Utils.
function codegenTestX64_v128_i32(inputs, options = {}) {
     for ( let [op, expected] of inputs ) {
         codegenTestX64_adhoc(wrap(options, `
     (func (export "f") (param v128) (result i32)
       (${op} (local.get 0)))`),
                              'f',
                              expected,
                              options);
     }
 }
