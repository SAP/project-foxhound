// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Test that calling a suspending import without a promising wrapper throws.

var suspending = new WebAssembly.Suspending(async () => 42);
var ins = wasmEvalText(`(module
  (import "" "s" (func $s (result i32)))
  (func (export "f") (result i32) call $s)
)`, {"": {s: suspending}});

assertErrorMessage(() => ins.exports.f(),
  WebAssembly.SuspendError, /promising/);
