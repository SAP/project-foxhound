// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Test recursive promising: a suspending import calls back into a promising
// export of the same module.

// Simple recursion: suspending import calls promising export.
{
  var ins;
  var suspending = new WebAssembly.Suspending(async (n) => {
    if (n <= 0) return 1;
    return await WebAssembly.promising(ins.exports.f)(n - 1);
  });

  ins = wasmEvalText(`(module
    (import "" "s" (func $s (param i32) (result i32)))
    (func (export "f") (param i32) (result i32)
      (i32.add (local.get 0) (call $s (local.get 0)))
    )
  )`, {"": {s: suspending}});

  var p = WebAssembly.promising(ins.exports.f);
  // f(3) = 3 + s(3) = 3 + f(2) = 3 + 2 + s(2) = 3 + 2 + f(1) = 3 + 2 + 1 + s(1) = 3 + 2 + 1 + f(0)
  // f(0) = 0 + s(0) = 0 + 1 = 1
  // f(1) = 1 + 1 = 2, f(2) = 2 + 2 = 4, f(3) = 3 + 4 = 7
  p(3).then(r => assertEq(r, 7));
}

drainJobQueue();
