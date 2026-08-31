// |jit-test| -P wasm_lazy_tiering; -P wasm_lazy_tiering_synchronous; -P wasm_lazy_tiering_level=9; -P wasm_inlining_level=0

let {ion, baseline} = wasmEvalText(`(module
    (type $a (array i32))
    (func $ion (export "ion") (result i32 i32)
        i32.const 0
        i32.const 0
    )
    (func $baseline (export "baseline")
        ;; empty array
        (array.new_default $a i32.const 0)

        call $ion
        ;; drop the top of the stack, which is generally in a register
        drop

        ;; index into the array with the stack result
        array.get $a
        drop
    )
)`).exports;

// Call ion once to tier it up synchronously
ion();

// Double check it happened when the right mode is enabled
if (wasmLazyTieringEnabled() && wasmCompileMode() == "baseline+ion") {
    assertEq(wasmFunctionTier(baseline), "baseline");
    assertEq(wasmFunctionTier(ion), "optimized");
}

assertErrorMessage(baseline, WebAssembly.RuntimeError, /index out of bounds/);
