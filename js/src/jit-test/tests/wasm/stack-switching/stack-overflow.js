// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Tests that stack overflow inside a continuation propagates to the JS caller.

// Unbounded recursion inside the continuation.
{
  let run = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (func $recur (type $ft) call $recur)
    (elem declare func $recur)
    (func (export "run")
      ref.func $recur
      cont.new $ct
      resume $ct
    )
  )`).exports.run;
  assertErrorMessage(() => run(), InternalError, /too much recursion/);
}

// Stack overflow in the second segment, after a suspend/resume round-trip.
// The overflow happens on the re-entered continuation stack.
{
  let { start, step } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (func $recur (type $ft) call $recur)
    (func $f (type $ft)
      suspend $tag
      call $recur
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
  )`).exports;

  start();
  step();
  assertErrorMessage(() => step(), InternalError, /too much recursion/);
}

// Stack overflow in a JS import called from a continuation.
{
  function inf() { return inf(); }
  let run = wasmEvalText(`(module
    (import "env" "inf" (func $inf))
    (type $ft (func))
    (type $ct (cont $ft))
    (func $f (type $ft) call $inf)
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`, { env: { inf } }).exports.run;
  assertErrorMessage(() => run(), InternalError, /too much recursion/);
}
