// |jit-test| skip-if: !wasmSimdEnabled() || !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("x86") || getBuildConfiguration("simulator") || isAvxPresent(); include:codegen-x86-test.js

codegenTestX86_v128xLITERAL_v128(
    [['f32x4.eq', '(v128.const f32x4 1 2 3 4)',
      `cmppsx \\$0x00, ${ABS}, %xmm0`],
     ['f32x4.ne', '(v128.const f32x4 1 2 3 4)',
      `cmppsx \\$0x04, ${ABS}, %xmm0`],
     ['f32x4.lt', '(v128.const f32x4 1 2 3 4)',
      `cmppsx \\$0x01, ${ABS}, %xmm0`],
     ['f32x4.le', '(v128.const f32x4 1 2 3 4)',
      `cmppsx \\$0x02, ${ABS}, %xmm0`],

     ['f64x2.eq', '(v128.const f64x2 1 2)',
      `cmppdx \\$0x00, ${ABS}, %xmm0`],
     ['f64x2.ne', '(v128.const f64x2 1 2)',
      `cmppdx \\$0x04, ${ABS}, %xmm0`],
     ['f64x2.lt', '(v128.const f64x2 1 2)',
      `cmppdx \\$0x01, ${ABS}, %xmm0`],
     ['f64x2.le', '(v128.const f64x2 1 2)',
     `cmppdx \\$0x02, ${ABS}, %xmm0`]]);
