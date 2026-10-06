// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Test JSPI interactions across different realms.

// Suspending import defined in a different realm (same compartment).
{
  var other = newGlobal({sameCompartmentAs: this});
  other.eval(`
    var suspending = new WebAssembly.Suspending(async (x) => x * 2);
  `);

  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (param i32) (result i32)))
    (func (export "f") (param i32) (result i32) (call $s (local.get 0)))
  )`, {"": {s: other.suspending}});

  var p = WebAssembly.promising(ins.exports.f);
  p(21).then(r => assertEq(r, 42));
}

// Multiple suspending imports from different realms.
{
  var other1 = newGlobal({sameCompartmentAs: this});
  var other2 = newGlobal({sameCompartmentAs: this});
  other1.eval(`var s1 = new WebAssembly.Suspending(async () => 10);`);
  other2.eval(`var s2 = new WebAssembly.Suspending(async () => 20);`);

  var ins = wasmEvalText(`(module
    (import "a" "s1" (func $s1 (result i32)))
    (import "b" "s2" (func $s2 (result i32)))
    (func (export "f") (result i32)
      (i32.add (call $s1) (call $s2))
    )
  )`, {a: {s1: other1.s1}, b: {s2: other2.s2}});

  var p = WebAssembly.promising(ins.exports.f);
  p().then(r => assertEq(r, 30));
}

drainJobQueue();
