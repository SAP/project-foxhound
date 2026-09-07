// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Test various return types through JSPI.

// f64
{
  var s = new WebAssembly.Suspending(async () => 3.14);
  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (result f64)))
    (func (export "f") (result f64) call $s)
  )`, {"": {s}});
  WebAssembly.promising(ins.exports.f)().then(r => assertEq(r, 3.14));
}

// i64 / BigInt
{
  var s = new WebAssembly.Suspending(async () => 123456789012345n);
  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (result i64)))
    (func (export "f") (result i64) call $s)
  )`, {"": {s}});
  WebAssembly.promising(ins.exports.f)().then(r => {
    assertEq(r, 123456789012345n);
  });
}

// null externref
{
  var s = new WebAssembly.Suspending(async () => null);
  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (result externref)))
    (func (export "f") (result externref) call $s)
  )`, {"": {s}});
  WebAssembly.promising(ins.exports.f)().then(r => assertEq(r, null));
}

// Parameters are correctly passed through suspending wrappers.
{
  var s = new WebAssembly.Suspending(async (a, b) => a + b);
  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (param i32 i32) (result i32)))
    (func (export "f") (param i32 i32) (result i32)
      (call $s (local.get 0) (local.get 1))
    )
  )`, {"": {s}});
  WebAssembly.promising(ins.exports.f)(17, 25).then(r => assertEq(r, 42));
}

drainJobQueue();
