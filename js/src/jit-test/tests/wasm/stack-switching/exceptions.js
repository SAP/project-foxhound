// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Wasm throw in continuation, caught by catch on main stack; tag value received
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $exn (param i32))
    (func $f (type $ft)
      i32.const 42
      throw $exn
    )
    (elem declare func $f)
    (func (export "run") (result i32)
      try (result i32)
        ref.func $f
        cont.new $ct
        resume $ct
        i32.const 0
      catch $exn
      end
    )
  )`).exports;
  assertEq(run(), 42);
}

// JS import throws from within continuation, caught by try/catch_all around resume
{
  let { run } = wasmEvalText(`(module
    (import "env" "fn" (func $fn))
    (type $ft (func))
    (type $ct (cont $ft))
    (func $f (type $ft) call $fn)
    (elem declare func $f)
    (func (export "run") (result i32)
      try (result i32)
        ref.func $f
        cont.new $ct
        resume $ct
        i32.const 0
      catch_all
        i32.const 1
      end
    )
  )`, { env: { fn: () => { throw new Error("test"); } } }).exports;
  assertEq(run(), 1);
}

// Throw and catch within a continuation; exception does not escape to resume caller
{
  let { run, getG } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $exn (param i32))
    (global $g (mut i32) (i32.const 0))
    (func $f (type $ft)
      try
        i32.const 99
        throw $exn
      catch $exn
        global.set $g
      end
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
    (func (export "getG") (result i32) global.get $g)
  )`).exports;
  run();
  assertEq(getG(), 99);
}

// Continuation suspends, resumes, then throws; try/catch around second resume catches it
{
  let { init, step1, step2 } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (tag $exn)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (func $f (type $ft)
      suspend $tag
      throw $exn
    )
    (elem declare func $f)
    (func (export "init")
      ref.func $f
      cont.new $ct
      global.set $k
    )
    (func (export "step1") (result i32)
      (block (result (ref $ct))
        global.get $k
        resume $ct (on $tag 0)
        i32.const 0
        return
      )
      global.set $k
      i32.const 1
    )
    (func (export "step2") (result i32)
      try (result i32)
        global.get $k
        resume $ct
        i32.const 0
      catch $exn
        i32.const 2
      end
    )
  )`).exports;
  init();
  assertEq(step1(), 1);
  assertEq(step2(), 2);
}

