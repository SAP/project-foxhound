// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Regression test for bug 2042769: cont.new on a cross-module imported funcref
// (initial callee in instance A, resume from instance B) must propagate traps
// from A correctly without corrupting trap unwinding state.

const A = wasmEvalText(`(module
  (type $ft (func))
  (type $gt (func (param i32) (result i32)))
  (type $wrong (func (param i32 i32) (result i32)))
  (func $g (type $gt) (param i32) (result i32) local.get 0)
  (table 1 funcref)
  (elem (i32.const 0) $g)
  (func $f (export "f") (type $ft)
    i32.const 1 i32.const 2 i32.const 0
    (call_indirect (type $wrong))
    drop)
  (elem declare func $f)
)`).exports;

const B = wasmEvalText(`(module
  (type $ft (func))
  (type $ct (cont $ft))
  (import "a" "f" (func $f (type $ft)))
  (elem declare func $f)
  (func (export "run")
    ref.func $f
    cont.new $ct
    resume $ct)
)`, { a: A }).exports;

assertErrorMessage(() => B.run(), WebAssembly.RuntimeError, /indirect call signature mismatch/);
