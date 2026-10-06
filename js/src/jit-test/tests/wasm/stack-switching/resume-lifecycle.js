// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Test resume lifecycle: null continuations, double-resume, consumed continuations.

// Resume a null continuation traps.
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (func (export "run")
      (ref.null $ct)
      resume $ct
    )
  )`).exports;

  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /null/);
}

// Resume a completed continuation traps.
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (func $f (type $ft))
    (elem declare func $f)
    (func (export "run")
      (global.set $k (cont.new $ct (ref.func $f)))
      (global.get $k)
      resume $ct
      (global.get $k)
      resume $ct
    )
  )`).exports;

  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /null/);
}

// Resume a continuation consumed by a prior resume traps.
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k1 (mut (ref null $ct)) (ref.null $ct))
    (global $k2 (mut (ref null $ct)) (ref.null $ct))
    (func $f (type $ft)
      suspend $tag
    )
    (elem declare func $f)
    (func (export "run")
      (local $cont (ref null $ct))
      (local.set $cont (cont.new $ct (ref.func $f)))
      (global.set $k1 (local.get $cont))
      (global.set $k2 (local.get $cont))
      (block (result (ref $ct))
        (global.get $k1)
        resume $ct (on $tag 0)
        unreachable
      )
      (global.set $k1)
      (global.get $k2)
      resume $ct
    )
  )`).exports;

  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /null/);
}

// Funcref locals survive GC across suspension.
{
  gczeal(14, 1);

  let { run, getResult } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (type $adder (func (param i32 i32) (result i32)))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $r (mut i32) (i32.const 0))
    (func $add (type $adder) (param i32 i32) (result i32)
      (i32.add (local.get 0) (local.get 1))
    )
    (func $f (type $ft)
      (local $fn (ref null $adder))
      (local.set $fn (ref.func $add))
      suspend $tag
      (global.set $r
        (call_ref $adder (i32.const 100) (i32.const 200) (local.get $fn)))
    )
    (elem declare func $f $add)
    (func (export "run")
      (global.set $k (cont.new $ct (ref.func $f)))
      (block (result (ref $ct))
        (global.get $k)
        resume $ct (on $tag 0)
        unreachable
      )
      (global.set $k)
      (global.get $k)
      resume $ct
    )
    (func (export "getResult") (result i32) global.get $r)
  )`).exports;

  run();
  assertEq(getResult(), 300);
}
