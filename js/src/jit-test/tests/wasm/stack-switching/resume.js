// |jit-test| skip-if: !wasmStackSwitchingEnabled()

const TYPES = [
  ['i32', 'i32.const 42', 42],
  ['i64', 'i64.const 42', 42n],
  ['f32', 'f32.const 13.5', 13.5],
  ['f64', 'f64.const 13.5', 13.5],
];

// Section 1: Basic cont.new + resume (no suspend)

// Simplest case: (func) cont, resume returns nothing
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (func $f (type $ft))
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`).exports;
  run();
}

// Section 2: Suspend and resume

// Single suspend, tag with no params, handler catches
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (func $f (type $ft)
      suspend $tag
    )
    (elem declare func $f)
    (func (export "run") (result i32)
      (block (result (ref $ct))
        ref.func $f
        cont.new $ct
        resume $ct (on $tag 0)
        unreachable
      )
      drop
      i32.const 1
    )
  )`).exports;
  assertEq(run(), 1);
}

// Single suspend with typed tag param, handler reads correct value
for (let [type, wasmConst, jsVal] of TYPES) {
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag (param ${type}))
    (func $f (type $ft)
      ${wasmConst}
      suspend $tag
    )
    (elem declare func $f)
    (func (export "run") (result ${type})
      (block (result ${type} (ref $ct))
        ref.func $f
        cont.new $ct
        resume $ct (on $tag 0)
        unreachable
      )
      drop
    )
  )`).exports;
  assertEq(run(), jsVal);
}

// Multiple tag params: (tag (param f64 i32)), handler reads both
{
  let { run, getF, getI } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag (param f64 i32))
    (global $gf (mut f64) (f64.const 0))
    (global $gi (mut i32) (i32.const 0))
    (func $f (type $ft)
      f64.const 1.5
      i32.const 42
      suspend $tag
    )
    (elem declare func $f)
    (func (export "run")
      (block (result f64 i32 (ref $ct))
        ref.func $f
        cont.new $ct
        resume $ct (on $tag 0)
        unreachable
      )
      drop
      global.set $gi
      global.set $gf
    )
    (func (export "getF") (result f64) global.get $gf)
    (func (export "getI") (result i32) global.get $gi)
  )`).exports;
  run();
  assertEq(getF(), 1.5);
  assertEq(getI(), 42);
}

// Two suspensions from same function, each delivers a distinct value
{
  let { init, step } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag (param i32))
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (func $f (type $ft)
      i32.const 10 suspend $tag
      i32.const 20 suspend $tag
    )
    (elem declare func $f)
    (func (export "init")
      ref.func $f
      cont.new $ct
      global.set $k
    )
    (func (export "step") (result i32)
      (block (result i32 (ref $ct))
        global.get $k
        resume $ct (on $tag 0)
        i32.const 0
        return
      )
      global.set $k
    )
  )`).exports;
  init();
  assertEq(step(), 10);
  assertEq(step(), 20);
  assertEq(step(), 0);
}

// Many suspensions: function suspends N times, JS-side loop resumes each time
{
  let { init, step } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag (param i32))
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (func $f (type $ft)
      i32.const 1 suspend $tag
      i32.const 2 suspend $tag
      i32.const 3 suspend $tag
      i32.const 4 suspend $tag
      i32.const 5 suspend $tag
    )
    (elem declare func $f)
    (func (export "init")
      ref.func $f
      cont.new $ct
      global.set $k
    )
    (func (export "step") (result i32)
      (block (result i32 (ref $ct))
        global.get $k
        resume $ct (on $tag 0)
        i32.const 0
        return
      )
      global.set $k
    )
  )`).exports;
  init();
  for (let i = 1; i <= 5; i++) {
    assertEq(step(), i);
  }
  assertEq(step(), 0);
}

// Two suspensions handled by chaining: the cont ref from the first handler is
// used directly on the stack to drive the second resume
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag (param f64 i32))
    (func $f (export "f") (type $ft)
      f64.const 20
      i32.const 0
      suspend $tag
      f64.const 40
      i32.const 1
      suspend $tag
    )
    (func (export "run") (result i32)
      (block (result f64 i32 (ref $ct))
        (block (result f64 i32 (ref $ct))
          ref.func $f
          cont.new $ct
          resume $ct (on $tag 0)
          unreachable
        )
        resume $ct (on $tag 0)
        unreachable
      )
      drop
      br 0
    )
  )`).exports;
  assertEq(run(), 1);
}

// Section 3: Handler dispatch

{
  let { init, step, getTagId, getVal } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $t1 (param i32))
    (tag $t2 (param i32))
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $lastTag (mut i32) (i32.const 0))
    (global $lastVal (mut i32) (i32.const 0))
    (func $f (type $ft)
      i32.const 1 suspend $t1
      i32.const 2 suspend $t2
    )
    (elem declare func $f)
    (func (export "init")
      ref.func $f
      cont.new $ct
      global.set $k
    )
    (func (export "step")
      (block $b1 (result i32 (ref $ct))
        (block $b2 (result i32 (ref $ct))
          global.get $k
          resume $ct (on $t1 1) (on $t2 0)
          return
        )
        ;; t2 handler (label 0)
        global.set $k
        i32.const 2
        global.set $lastTag
        global.set $lastVal
        return
      )
      ;; t1 handler (label 1)
      global.set $k
      i32.const 1
      global.set $lastTag
      global.set $lastVal
    )
    (func (export "getTagId") (result i32) global.get $lastTag)
    (func (export "getVal") (result i32) global.get $lastVal)
  )`).exports;
  init();
  step();
  assertEq(getTagId(), 1);
  assertEq(getVal(), 1);
  step();
  assertEq(getTagId(), 2);
  assertEq(getVal(), 2);
}

// Two tags with separate per-tag step functions; each fires correctly
{
  let { init, step1, step2, getTagId, getVal } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $t1 (param i32))
    (tag $t2 (param i32))
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $lastTag (mut i32) (i32.const 0))
    (global $lastVal (mut i32) (i32.const 0))
    (func $f (type $ft)
      i32.const 1 suspend $t1
      i32.const 2 suspend $t2
    )
    (elem declare func $f)
    (func (export "init")
      ref.func $f
      cont.new $ct
      global.set $k
    )
    (func (export "step1")
      (block (result i32 (ref $ct))
        global.get $k
        resume $ct (on $t1 0)
        return
      )
      global.set $k
      i32.const 1
      global.set $lastTag
      global.set $lastVal
    )
    (func (export "step2")
      (block (result i32 (ref $ct))
        global.get $k
        resume $ct (on $t2 0)
        return
      )
      global.set $k
      i32.const 2
      global.set $lastTag
      global.set $lastVal
    )
    (func (export "getTagId") (result i32) global.get $lastTag)
    (func (export "getVal") (result i32) global.get $lastVal)
  )`).exports;
  init();
  step1();
  assertEq(getTagId(), 1);
  assertEq(getVal(), 1);
  step2();
  assertEq(getTagId(), 2);
  assertEq(getVal(), 2);
}

// Section 4: Nested continuations

// Continuation A resumes B; B completes, A continues (verified via global)
{
  let { run, getG } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (global $g (mut i32) (i32.const 0))
    (func $inner (type $ft)
      i32.const 42
      global.set $g
    )
    (func $outer (type $ft)
      ref.func $inner
      cont.new $ct
      resume $ct
    )
    (elem declare func $inner $outer)
    (func (export "run")
      ref.func $outer
      cont.new $ct
      resume $ct
    )
    (func (export "getG") (result i32) global.get $g)
  )`).exports;
  run();
  assertEq(getG(), 42);
}

// Section 5: Imports and side effects

// Call JS import from within continuation; import has a side effect
{
  let sideEffect = 0;
  let { run } = wasmEvalText(`(module
    (import "env" "fn" (func $fn))
    (type $ft (func))
    (type $ct (cont $ft))
    (func $f (type $ft)
      call $fn
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`, { env: { fn: () => { sideEffect = 1; } } }).exports;
  run();
  assertEq(sideEffect, 1);
}

// Section 6: Re-entrant wasm through JS

// Continuation calls JS import which calls back into wasm creating a new continuation
{
  let callCount = 0;
  let inst = wasmEvalText(`(module
    (import "env" "doWork" (func $doWork))
    (type $ft (func))
    (type $ct (cont $ft))
    (func $inner (type $ft))
    (func $f (type $ft)
      call $doWork
    )
    (elem declare func $inner $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
    (func (export "runInner")
      ref.func $inner
      cont.new $ct
      resume $ct
    )
  )`, { env: { doWork: () => {
    callCount++;
    inst.exports.runInner();
  } } });
  inst.exports.run();
  assertEq(callCount, 1);
}
