// |jit-test| skip-if: !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("arm64"); include:codegen-arm64-test.js

setJitCompilerOption("jit.full-debug-checks", 0);

codegenTestARM64_adhoc(`
  (func $testImp
    (import "wasm:js-string" "test")
    (param externref)
    (result i32)
  )
  (export "test" (func $testImp))`,
  'test',
  `and     x1, x0, #0x3
  cmp     w1, #0x2 \\(2\\)
  b\\.eq    #\\+0xc \\(addr .*\\)
  mov     w0, #0x0
  b       #\\+0x8 \\(addr .*\\)
  mov     w0, #0x1`,
  {features: {builtins: ["js-string"]}}
);

codegenTestARM64_adhoc(`
  (func $castImp
    (import "wasm:js-string" "cast")
    (param externref)
    (result (ref extern))
  )
  (export "cast" (func $castImp))`,
  'cast',
  `and     x1, x0, #0x3
  cmp     w1, #0x2 \\(2\\)
  b.eq    #\\+0x8 \\(addr .*\\)
  dcps0   \\{#0x0\\} \\(Wasm Trap\\)`,
  {features: {builtins: ["js-string"]}}
);
