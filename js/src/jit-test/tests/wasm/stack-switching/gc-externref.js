// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Test that externref locals survive GC across suspension.

gczeal(2, 1);

{
  let callCount = 0;
  let captured = [];
  let { start, step, finish } = wasmEvalText(`(module
    (import "env" "alloc" (func $alloc (result externref)))
    (import "env" "check"
      (func $check (param externref externref externref)))
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (func $f (type $ft)
      (local $x externref)
      (local $y externref)
      (local $z externref)
      (local.set $x (call $alloc))
      (local.set $y (call $alloc))
      (local.set $z (call $alloc))
      suspend $tag
      (call $check (local.get $x) (local.get $y) (local.get $z))
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
  )`, { env: {
    alloc: () => {
      let obj = {id: callCount++, data: new Array(100).fill(callCount)};
      captured.push(obj);
      return obj;
    },
    check: (x, y, z) => {
      assertEq(x.id, 0);
      assertEq(y.id, 1);
      assertEq(z.id, 2);
      assertEq(x.data[0], 1);
      assertEq(y.data[0], 2);
      assertEq(z.data[0], 3);
    }
  }}).exports;

  start();
  step();
  finish();
}
