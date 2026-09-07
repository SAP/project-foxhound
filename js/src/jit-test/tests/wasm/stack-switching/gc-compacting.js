// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Test that GC references in continuation locals survive compacting GC.

gczeal(14, 1);

// Multiple struct refs across multiple suspend points.
{
  let { start, step, finish, result } = wasmEvalText(`(module
    (type $s (struct (field i32)))
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $r (mut i32) (i32.const 0))
    (func $f (type $ft)
      (local $a (ref null $s))
      (local $b (ref null $s))
      (local $c (ref null $s))
      (local $d (ref null $s))
      (local.set $a (struct.new $s (i32.const 111)))
      (local.set $b (struct.new $s (i32.const 222)))
      (local.set $c (struct.new $s (i32.const 333)))
      (local.set $d (struct.new $s (i32.const 444)))
      suspend $tag
      (local.set $a (struct.new $s (i32.add
        (struct.get $s 0 (local.get $a))
        (struct.get $s 0 (local.get $b)))))
      suspend $tag
      (local.set $b (struct.new $s (i32.add
        (struct.get $s 0 (local.get $c))
        (struct.get $s 0 (local.get $d)))))
      suspend $tag
      (global.set $r (i32.add
        (struct.get $s 0 (local.get $a))
        (struct.get $s 0 (local.get $b))))
    )
    (elem declare func $f)
    (func (export "start")
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
      global.get $k
      resume $ct
    )
    (func (export "result") (result i32) global.get $r)
  )`).exports;

  start();
  gc(); step();
  gc(); step();
  gc(); step();
  gc(); finish();
  // 111+222=333, 333+444=777, 333+777=1110
  assertEq(result(), 1110);
}

// Linked list of structs across suspend.
{
  let { start, step, finish, result } = wasmEvalText(`(module
    (rec (type $node (struct (field i32) (field (ref null $node)))))
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (global $r (mut i32) (i32.const 0))
    (func $f (type $ft)
      (local $list (ref null $node))
      (local $i i32)
      (local.set $i (i32.const 50))
      (loop $loop
        (local.set $list (struct.new $node (local.get $i) (local.get $list)))
        (local.set $i (i32.sub (local.get $i) (i32.const 1)))
        (br_if $loop (local.get $i))
      )
      suspend $tag
      (local.set $i (i32.const 0))
      (block $break
        (loop $walk
          (br_if $break (ref.is_null (local.get $list)))
          (local.set $i (i32.add (local.get $i)
            (struct.get $node 0 (local.get $list))))
          (local.set $list (struct.get $node 1 (local.get $list)))
          (br $walk)
        )
      )
      (global.set $r (local.get $i))
    )
    (elem declare func $f)
    (func (export "start")
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
      global.get $k
      resume $ct
    )
    (func (export "result") (result i32) global.get $r)
  )`).exports;

  start();
  step();
  gc();
  finish();
  // Sum of 1..50
  assertEq(result(), 1275);
}
