// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Test WebAssembly.Suspending with callable proxies.

// Basic callable proxy as suspending function.
{
  var target = async (x) => x + 1;
  var calls = 0;
  var handler = {
    apply(target, thisArg, args) {
      calls++;
      return target.apply(thisArg, args);
    }
  };
  var suspending = new WebAssembly.Suspending(new Proxy(target, handler));

  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (param i32) (result i32)))
    (func (export "f") (param i32) (result i32) (call $s (local.get 0)))
  )`, {"": {s: suspending}});

  var p = WebAssembly.promising(ins.exports.f);
  p(41).then(r => {
    assertEq(r, 42);
    assertEq(calls, 1);
  });
}

// Proxy that throws in apply trap.
{
  var target = async () => 0;
  var handler = {
    apply() { throw new Error("proxy trap error"); }
  };
  var suspending = new WebAssembly.Suspending(new Proxy(target, handler));

  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (result i32)))
    (func (export "f") (result i32) call $s)
  )`, {"": {s: suspending}});

  var p = WebAssembly.promising(ins.exports.f);
  p().then(
    () => assertEq(true, false),
    e => {
      assertEq(e instanceof Error, true);
      assertEq(e.message, "proxy trap error");
    }
  );
}

// Proxy returning a thenable.
{
  var target = () => ({ then(resolve) { resolve(123); } });
  var suspending = new WebAssembly.Suspending(new Proxy(target, {}));

  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (result i32)))
    (func (export "f") (result i32) call $s)
  )`, {"": {s: suspending}});

  var p = WebAssembly.promising(ins.exports.f);
  p().then(r => assertEq(r, 123));
}

drainJobQueue();
