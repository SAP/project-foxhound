// |jit-test| test-also=--setpref=wasm_test_serialization=true

const { test } = wasmEvalText(`(module
  (import "" "gc" (func $gc))
  (func (export "test") (param ${"anyref ".repeat(1_000)}) (result anyref)
    (local ${"anyref ".repeat(50_000 - 1_000)})

    ${[...new Array(10_000).keys()].map(i => `local.get ${i}`).join("\n")}
    call $gc
    ${"drop\n".repeat(10_000 - 1)}
  )
)`, {"": {gc}}).exports;

assertEq(test(5), 5);
