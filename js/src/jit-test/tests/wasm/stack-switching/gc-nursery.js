// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Test nursery GC interactions with suspended continuations.

// Interleaved nursery GC and suspend/resume cycles.
{
  let { init, step, finish, result } = wasmEvalText(`(module
    (type $s (struct (field i32)))
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $r (mut i32) (i32.const 0))
    (func $f (type $ft)
      (local $acc (ref null $s))
      (local.set $acc (struct.new $s (i32.const 0)))
      (local.set $acc (struct.new $s (i32.add
        (struct.get $s 0 (local.get $acc)) (i32.const 1))))
      suspend $tag
      (local.set $acc (struct.new $s (i32.add
        (struct.get $s 0 (local.get $acc)) (i32.const 2))))
      suspend $tag
      (local.set $acc (struct.new $s (i32.add
        (struct.get $s 0 (local.get $acc)) (i32.const 3))))
      suspend $tag
      (local.set $acc (struct.new $s (i32.add
        (struct.get $s 0 (local.get $acc)) (i32.const 4))))
      suspend $tag
      (local.set $acc (struct.new $s (i32.add
        (struct.get $s 0 (local.get $acc)) (i32.const 5))))
      (global.set $r (struct.get $s 0 (local.get $acc)))
    )
    (elem declare func $f)
    (func (export "init")
      (global.set $k (cont.new $ct (ref.func $f)))
    )
    (func (export "step")
      (drop (struct.new $s (i32.const 99999)))
      (drop (struct.new $s (i32.const 99999)))
      (drop (struct.new $s (i32.const 99999)))
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

  init();
  for (let i = 0; i < 4; i++) {
    minorgc();
    step();
  }
  minorgc();
  finish();
  assertEq(result(), 15);
}

// Array of structs surviving minor GC while suspended.
{
  const COUNT = 20;
  let { init, step, finish, verify } = wasmEvalText(`(module
    (type $s (struct (field i32)))
    (type $a (array (mut (ref null $s))))
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $arr (mut (ref null $a)) (ref.null $a))
    (func $f (type $ft)
      (local $i i32)
      (global.set $arr (array.new $a (ref.null $s) (i32.const ${COUNT})))
      (local.set $i (i32.const 0))
      (loop $fill
        (array.set $a (global.get $arr) (local.get $i)
          (struct.new $s (i32.mul (local.get $i) (i32.const 7))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br_if $fill (i32.lt_u (local.get $i) (i32.const ${COUNT})))
      )
      suspend $tag
    )
    (elem declare func $f)
    (func (export "init")
      (global.set $k (cont.new $ct (ref.func $f)))
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
      (global.get $k) resume $ct
    )
    (func (export "verify") (result i32)
      (local $i i32)
      (local $sum i32)
      (local.set $i (i32.const 0))
      (loop $check
        (local.set $sum (i32.add (local.get $sum)
          (struct.get $s 0
            (array.get $a (global.get $arr) (local.get $i)))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br_if $check (i32.lt_u (local.get $i) (i32.const ${COUNT})))
      )
      (local.get $sum)
    )
  )`).exports;

  init();
  step();
  minorgc(); gc(); minorgc();
  finish();
  // Sum of i*7 for i=0..19 = 7*190 = 1330
  assertEq(verify(), 1330);
}
