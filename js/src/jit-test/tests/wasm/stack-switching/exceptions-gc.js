// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Test exception handling interactions with stack switching and GC.

// Exception thrown after suspend/resume with GC.
{
  gczeal(14, 1);

  let { init, step, resumeAndCatch, getResult } = wasmEvalText(`(module
    (type $s (struct (field i32)))
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (tag $exn (param i32 i32))
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $r (mut i32) (i32.const 0))
    (func $f (type $ft)
      (local $a (ref null $s))
      (local $b (ref null $s))
      (local.set $a (struct.new $s (i32.const 111)))
      (local.set $b (struct.new $s (i32.const 222)))
      suspend $tag
      (throw $exn
        (struct.get $s 0 (local.get $a))
        (struct.get $s 0 (local.get $b)))
    )
    (elem declare func $f)
    (func (export "init")
      (global.set $k (cont.new $ct (ref.func $f)))
    )
    (func (export "step")
      (block (result (ref $ct))
        (global.get $k) resume $ct (on $tag 0) return
      )
      global.set $k
    )
    (func (export "resumeAndCatch")
      try
        (global.get $k) resume $ct
      catch $exn
        (global.set $r (i32.add))
      end
    )
    (func (export "getResult") (result i32) global.get $r)
  )`).exports;

  init();
  step();
  gc();
  resumeAndCatch();
  assertEq(getResult(), 333);
}

// JS exception from import on continuation stack.
{
  gczeal(2, 5);

  let error_obj = {secret: 12345, data: new Array(50).fill("test")};
  let caught = null;

  let { run } = wasmEvalText(`(module
    (import "env" "throwJS" (func $throwJS))
    (type $ft (func))
    (type $ct (cont $ft))
    (func $f (type $ft) call $throwJS)
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`, { env: {
    throwJS: () => { throw error_obj; }
  }}).exports;

  try {
    run();
  } catch (e) {
    caught = e;
  }
  assertEq(caught === error_obj, true);
  assertEq(caught.secret, 12345);
  assertEq(caught.data.length, 50);
}

// Nested resume with exception propagation across stack boundaries.
{
  gczeal(14, 1);

  let { run, getResult } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (tag $exn (param i32))
    (global $r (mut i32) (i32.const 0))
    (func $inner (type $ft)
      suspend $tag
      (throw $exn (i32.const 42))
    )
    (func $outer (type $ft)
      (local $inner_k (ref null $ct))
      (local.set $inner_k (cont.new $ct (ref.func $inner)))
      (block (result (ref $ct))
        (local.get $inner_k)
        resume $ct (on $tag 0)
        unreachable
      )
      (local.set $inner_k)
      suspend $tag
      try
        (local.get $inner_k)
        resume $ct
      catch $exn
        (global.set $r)
      end
    )
    (elem declare func $inner $outer)
    (func (export "run")
      (local $outer_k (ref null $ct))
      (local.set $outer_k (cont.new $ct (ref.func $outer)))
      (block (result (ref $ct))
        (local.get $outer_k)
        resume $ct (on $tag 0)
        unreachable
      )
      (local.set $outer_k)
      (local.get $outer_k)
      resume $ct
    )
    (func (export "getResult") (result i32) global.get $r)
  )`).exports;

  run();
  assertEq(getResult(), 42);
}

// Exception with unmatched handlers propagates to caller of resume.
{
  gczeal(14, 1);

  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag1)
    (tag $tag2)
    (tag $tag3)
    (tag $exn (param i32))
    (func $f (type $ft)
      (throw $exn (i32.const 99))
    )
    (elem declare func $f)
    (func (export "run") (result i32)
      try (result i32)
        (block (result (ref $ct))
          (block (result (ref $ct))
            (block (result (ref $ct))
              ref.func $f
              cont.new $ct
              resume $ct (on $tag1 0) (on $tag2 1) (on $tag3 2)
              unreachable
            )
            unreachable
          )
          unreachable
        )
        drop
        unreachable
      catch $exn
      end
    )
  )`).exports;

  assertEq(run(), 99);
}
