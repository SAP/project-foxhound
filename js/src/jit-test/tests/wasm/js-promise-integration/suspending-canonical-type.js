// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Regression test for bug 2043062: the wrapper function built for a
// WebAssembly.Suspending import must be given the import's actual declared
// type, not a fresh standalone FuncType. Otherwise the wrapper's canonical
// type diverges from the declared type when subtyping or recursion groups are
// involved, breaking ref.test / ref.cast / call_indirect.

var asyncAnswer = async (i) => Promise.resolve(i + 1);
var suspending = new WebAssembly.Suspending(asyncAnswer);

// ref.test against the import's declared (subtype) type must succeed.
{
  var ins = wasmEvalText(`(module
    (rec
      (type $base (sub (func (param i32) (result i32))))
      (type $ft (sub $base (func (param i32) (result i32))))
    )
    (import "" "f" (func $f (type $ft)))
    (elem declare func $f)
    (func (export "testFt") (result i32)
      (ref.test (ref $ft) (ref.func $f)))
    (func (export "testBase") (result i32)
      (ref.test (ref $base) (ref.func $f)))
  )`, { "": { f: suspending } });

  assertEq(ins.exports.testFt(), 1,
           "suspending import declared as $ft must test as $ft");
  assertEq(ins.exports.testBase(), 1,
           "suspending import must also test as its supertype $base");
}

// call_indirect through the import's declared type must not trap, and the
// suspension must resolve correctly when reached from a promising export.
{
  var ins = wasmEvalText(`(module
    (rec
      (type $base (sub (func (param i32) (result i32))))
      (type $ft (sub $base (func (param i32) (result i32))))
    )
    (import "" "f" (func $f (type $ft)))
    (table $t 1 1 funcref)
    (elem (i32.const 0) func $f)
    (func (export "run") (param i32) (result i32)
      (call_indirect $t (type $ft) (local.get 0) (i32.const 0)))
  )`, { "": { f: suspending } });

  var promising = WebAssembly.promising(ins.exports.run);
  var resolved = false;
  var value;
  promising(41).then((r) => { resolved = true; value = r; },
                     (e) => { throw e; });

  drainJobQueue();
  assertEq(resolved, true, "call_indirect through declared type $ft resolved");
  assertEq(value, 42);
}
