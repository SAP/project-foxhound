// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Test that multiple simultaneously suspended continuations, each holding
// GC references, are correctly traced during compacting GC.

gczeal(14, 1);

let { make, stepAll, finishAll, result } = wasmEvalText(`(module
  (type $s (struct (field i32)))
  (type $ft (func))
  (type $ct (cont $ft))
  (tag $tag)
  (global $r (mut i32) (i32.const 0))
  (global $k0 (mut (ref null $ct)) (ref.null $ct))
  (global $k1 (mut (ref null $ct)) (ref.null $ct))
  (global $k2 (mut (ref null $ct)) (ref.null $ct))
  (global $k3 (mut (ref null $ct)) (ref.null $ct))
  (func $f0 (type $ft)
    (local $ref (ref null $s))
    (local.set $ref (struct.new $s (i32.const 10)))
    suspend $tag
    (global.set $r (i32.add (global.get $r)
      (struct.get $s 0 (local.get $ref))))
  )
  (func $f1 (type $ft)
    (local $ref (ref null $s))
    (local.set $ref (struct.new $s (i32.const 20)))
    suspend $tag
    (global.set $r (i32.add (global.get $r)
      (struct.get $s 0 (local.get $ref))))
  )
  (func $f2 (type $ft)
    (local $ref (ref null $s))
    (local.set $ref (struct.new $s (i32.const 30)))
    suspend $tag
    (global.set $r (i32.add (global.get $r)
      (struct.get $s 0 (local.get $ref))))
  )
  (func $f3 (type $ft)
    (local $ref (ref null $s))
    (local.set $ref (struct.new $s (i32.const 40)))
    suspend $tag
    (global.set $r (i32.add (global.get $r)
      (struct.get $s 0 (local.get $ref))))
  )
  (elem declare func $f0 $f1 $f2 $f3)
  (func (export "make")
    (global.set $k0 (cont.new $ct (ref.func $f0)))
    (global.set $k1 (cont.new $ct (ref.func $f1)))
    (global.set $k2 (cont.new $ct (ref.func $f2)))
    (global.set $k3 (cont.new $ct (ref.func $f3)))
  )
  (func (export "stepAll")
    (block (result (ref $ct))
      (global.get $k0) resume $ct (on $tag 0) return
    )
    global.set $k0
    (block (result (ref $ct))
      (global.get $k1) resume $ct (on $tag 0) return
    )
    global.set $k1
    (block (result (ref $ct))
      (global.get $k2) resume $ct (on $tag 0) return
    )
    global.set $k2
    (block (result (ref $ct))
      (global.get $k3) resume $ct (on $tag 0) return
    )
    global.set $k3
  )
  (func (export "finishAll")
    (global.get $k0) resume $ct
    (global.get $k1) resume $ct
    (global.get $k2) resume $ct
    (global.get $k3) resume $ct
  )
  (func (export "result") (result i32) global.get $r)
)`).exports;

make();
stepAll();
gc(); gc();
finishAll();
assertEq(result(), 100);
