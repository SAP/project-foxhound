// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Test exception and trap interactions with JSPI promising wrappers.

// Sync throw from suspending function rejects the promise.
{
  var suspending = new WebAssembly.Suspending(() => {
    throw new RangeError("sync throw");
  });
  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (result i32)))
    (func (export "f") (result i32) call $s)
  )`, {"": {s: suspending}});

  var p = WebAssembly.promising(ins.exports.f);
  p().then(
    () => assertEq(true, false),
    e => {
      assertEq(e instanceof RangeError, true);
      assertEq(e.message, "sync throw");
    }
  );
}

// Rejected promise from suspending function becomes a throw in wasm.
{
  var suspending = new WebAssembly.Suspending(async () => {
    throw new TypeError("async rejection");
  });
  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (result i32)))
    (func (export "f") (result i32) call $s)
  )`, {"": {s: suspending}});

  var p = WebAssembly.promising(ins.exports.f);
  p().then(
    () => assertEq(true, false),
    e => {
      assertEq(e instanceof TypeError, true);
      assertEq(e.message, "async rejection");
    }
  );
}

// Wasm trap after a successful suspending call rejects the promise.
// Per spec, the promising wrapper catches all exceptions from the wasm
// execution and rejects the returned promise.
{
  var suspending = new WebAssembly.Suspending(async () => 42);
  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (result i32)))
    (func (export "f") (result i32)
      (drop (call $s))
      unreachable
    )
  )`, {"": {s: suspending}});

  var p = WebAssembly.promising(ins.exports.f);
  p().then(
    () => assertEq(true, false),
    e => assertEq(e instanceof WebAssembly.RuntimeError, true)
  );
}

// Wasm trap inside the suspending function's async callback rejects the promise.
{
  var trapper = wasmEvalText(`(module
    (func (export "trap") unreachable)
  )`);
  var suspending = new WebAssembly.Suspending(async () => {
    trapper.exports.trap();
    return 42;
  });
  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (result i32)))
    (func (export "f") (result i32) call $s)
  )`, {"": {s: suspending}});

  var p = WebAssembly.promising(ins.exports.f);
  p().then(
    () => assertEq(true, false),
    e => assertEq(e instanceof WebAssembly.RuntimeError, true)
  );
}

drainJobQueue();
