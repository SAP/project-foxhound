// |jit-test| skip-if: !wasmStackSwitchingEnabled()

gczeal(10, 2);

// Tests that wasm GC refs held in continuation locals are properly traced
// when GC runs while the continuation is suspended.

// Struct held only in a continuation local survives gc() during suspension.
{
  let { start, step, finish, result } = wasmEvalText(`(module
    (type $s (struct (field i32)))
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $r (mut i32) (i32.const 0))
    (func $f (type $ft)
      (local $ref (ref null $s))
      (local.set $ref (struct.new $s (i32.const 42)))
      suspend $tag
      (global.set $r (struct.get $s 0 (local.get $ref)))
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
  gc();
  finish();
  assertEq(result(), 42);
}

// Same test using minorgc() to trigger a nursery collection.
{
  let { start, step, finish, result } = wasmEvalText(`(module
    (type $s (struct (field i32)))
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $r (mut i32) (i32.const 0))
    (func $f (type $ft)
      (local $ref (ref null $s))
      (local.set $ref (struct.new $s (i32.const 99)))
      suspend $tag
      (global.set $r (struct.get $s 0 (local.get $ref)))
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
  minorgc();
  finish();
  assertEq(result(), 99);
}

// Array ref with inline data survives compacting GC while suspended.
{
  let { start, step, finish, result } = wasmEvalText(`(module
    (type $a (array (mut i32)))
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $r (mut i32) (i32.const 0))
    (func $f (type $ft)
      (local $arr (ref null $a))
      (local.set $arr (array.new $a (i32.const 7) (i32.const 3)))
      suspend $tag
      (global.set $r (array.get $a (local.get $arr) (i32.const 0)))
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
  gc();
  finish();
  assertEq(result(), 7);
}

// Tight allocation loop before suspend to trigger a nursery collection.
// The loop allocates many structs; only the last is held in a local when the
// continuation suspends.
{
  let { start, step, finish, result } = wasmEvalText(`(module
    (type $s (struct (field i32)))
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $r (mut i32) (i32.const 0))
    (func $f (type $ft)
      (local $last (ref null $s))
      (local $i i32)
      (local.set $i (i32.const 100))
      loop
        (local.set $last (struct.new $s (local.get $i)))
        (local.tee $i (i32.sub (local.get $i) (i32.const 1)))
        br_if 0
      end
      suspend $tag
      (global.set $r (struct.get $s 0 (local.get $last)))
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
  minorgc();
  finish();
  assertEq(result(), 1);
}
