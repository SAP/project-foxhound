// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Tests for tail calls from the base frame of a continuation.
//
// The base frame stub does a call_ref of the continuation's initial callee.
// When that callee does a return_call, the tail-called function's eventual
// return goes back to the base frame stub. All variants below verify that this
// chain works correctly with and without intermediate suspensions.

// Direct return_call: base frame tail-calls another function.
{
  let { run, result } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (global $r (mut i32) (i32.const 0))
    (func $g (type $ft)
      i32.const 42
      global.set $r
    )
    (func $f (type $ft)
      return_call $g
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
    (func (export "result") (result i32) global.get $r)
  )`).exports;
  run();
  assertEq(result(), 42);
}

// return_call_ref: base frame tail-calls via a funcref.
{
  let { run, result } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (global $r (mut i32) (i32.const 0))
    (func $g (type $ft)
      i32.const 99
      global.set $r
    )
    (elem declare func $g)
    (func $f (type $ft)
      ref.func $g
      return_call_ref $ft
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
    (func (export "result") (result i32) global.get $r)
  )`).exports;
  run();
  assertEq(result(), 99);
}

// return_call_indirect: base frame tail-calls via a table.
{
  let { run, result } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (table 1 funcref)
    (global $r (mut i32) (i32.const 0))
    (func $g (type $ft)
      i32.const 7
      global.set $r
    )
    (elem (i32.const 0) func $g)
    (func $f (type $ft)
      i32.const 0
      return_call_indirect (type $ft)
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
    (func (export "result") (result i32) global.get $r)
  )`).exports;
  run();
  assertEq(result(), 7);
}

// Tail call into a function that suspends: the suspension comes from the
// tail-called function, not the original base frame function.
{
  let { start, step, finish, result } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $r (mut i32) (i32.const 0))
    (func $g (type $ft)
      suspend $tag
      i32.const 1
      global.set $r
    )
    (func $f (type $ft)
      return_call $g
    )
    (elem declare func $f)
    (func (export "start")
      ref.func $f
      cont.new $ct
      global.set $k
    )
    (func (export "step")
      (block (result (ref $ct))
        global.get $k
        resume $ct (on $tag 0)
        return
      )
      global.set $k
    )
    (func (export "finish")
      global.get $k
      resume $ct
    )
    (func (export "result") (result i32) global.get $r)
  )`).exports;

  start();
  step();
  assertEq(result(), 0);  // not yet reached
  finish();
  assertEq(result(), 1);
}

// Chain of tail calls before suspend: f -> return_call g -> return_call h,
// then h suspends. Resume continues in h.
{
  let { start, step, finish, result } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $r (mut i32) (i32.const 0))
    (func $h (type $ft)
      suspend $tag
      i32.const 3
      global.set $r
    )
    (func $g (type $ft)
      return_call $h
    )
    (func $f (type $ft)
      return_call $g
    )
    (elem declare func $f)
    (func (export "start")
      ref.func $f
      cont.new $ct
      global.set $k
    )
    (func (export "step")
      (block (result (ref $ct))
        global.get $k
        resume $ct (on $tag 0)
        return
      )
      global.set $k
    )
    (func (export "finish")
      global.get $k
      resume $ct
    )
    (func (export "result") (result i32) global.get $r)
  )`).exports;

  start();
  step();
  assertEq(result(), 0);
  finish();
  assertEq(result(), 3);
}

// Tail-recursive counter: the base frame tail-calls a counter that recurses
// via return_call without growing the stack. Verifies proper tail calls work
// inside a continuation and don't cause a stack overflow.
{
  let { run, result } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (type $count_ft (func (param i32)))
    (global $r (mut i32) (i32.const 0))
    (func $count (type $count_ft)
      (if (i32.eqz (local.get 0)) (then return))
      (global.set $r (local.get 0))
      (return_call $count (i32.sub (local.get 0) (i32.const 1)))
    )
    (func $f (type $ft)
      i32.const 10000
      return_call $count
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
    (func (export "result") (result i32) global.get $r)
  )`).exports;
  run();
  assertEq(result(), 1);
}

// Tail call into a function that traps: RuntimeError propagates to caller.
{
  let run = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (func $g (type $ft) unreachable)
    (func $f (type $ft)
      return_call $g
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`).exports.run;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /unreachable/);
}

// Tail call into a JS import: base frame return_call_ref to a wasm wrapper
// that calls a JS function. The JS side effect is visible after resume.
{
  let called = false;
  let { run } = wasmEvalText(`(module
    (import "env" "fn" (func $fn))
    (type $ft (func))
    (type $ct (cont $ft))
    (func $f (type $ft)
      return_call $fn
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`, { env: { fn: () => { called = true; } } }).exports;
  run();
  assertEq(called, true);
}
