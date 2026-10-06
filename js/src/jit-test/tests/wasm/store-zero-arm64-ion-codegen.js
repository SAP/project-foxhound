// |jit-test| skip-if: !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("arm64"); include:codegen-arm64-test.js

// Test that storing an i32.const 0 uses wzr/xzr directly rather than
// materialising zero into a general-purpose register first (bug 1710087).

// i32 scalar stores with zero constant

codegenTestARM64_adhoc(
    `(module
       (memory 1)
       (func (export "f") (param i32)
         (i32.store (local.get 0) (i32.const 0))))`,
    'f',
    'str     wzr, \\[x\\d+, x0\\]');

codegenTestARM64_adhoc(
    `(module
       (memory 1)
       (func (export "f") (param i32)
         (i32.store8 (local.get 0) (i32.const 0))))`,
    'f',
    'strb    wzr, \\[x\\d+, x0\\]');

codegenTestARM64_adhoc(
    `(module
       (memory 1)
       (func (export "f") (param i32)
         (i32.store16 (local.get 0) (i32.const 0))))`,
    'f',
    'strh    wzr, \\[x\\d+, x0\\]');

if (wasmSimdEnabled()) {
    // i32x4.replace_lane with zero scalar: wzr, no prior mov to materialise zero
    codegenTestARM64_adhoc(
        `(module
        (func (export "f") (param v128) (result v128)
            (i32x4.replace_lane 1 (local.get 0) (i32.const 0))))`,
        'f',
        'mov     v0.s\\[1\\], wzr');
}

// anyref/funcref null stores use xzr directly

codegenTestARM64_adhoc(
    `(module
       (type $s (struct (field (mut anyref))))
       (func (export "f") (param (ref $s))
         (struct.set $s 0 (local.get 0) (ref.null any))))`,
    'f',
    'str     xzr, \\[',
    {no_prefix: true, no_suffix: true});

codegenTestARM64_adhoc(
    `(module
       (type $s (struct (field (mut funcref))))
       (func (export "f") (param (ref $s))
         (struct.set $s 0 (local.get 0) (ref.null func))))`,
    'f',
    'str     xzr, \\[',
    {no_prefix: true, no_suffix: true});

codegenTestARM64_adhoc(
    `(module
       (type $a (array (mut anyref)))
       (func (export "f") (param (ref $a)) (param i32)
         (array.set $a (local.get 0) (local.get 1) (ref.null any))))`,
    'f',
    'str     xzr, \\[',
    {no_prefix: true, no_suffix: true});
