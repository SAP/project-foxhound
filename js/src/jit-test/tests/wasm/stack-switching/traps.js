// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Tests that various wasm traps inside a continuation propagate correctly to
// the JS caller as WebAssembly.RuntimeError.

const MODULE_PRELUDE = `
  (type $ft (func))
  (type $ct (cont $ft))
`;

function runOnCont(body) {
  return wasmEvalText(`(module
    ${MODULE_PRELUDE}
    (func $f (type $ft) ${body})
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`).exports.run;
}

// Integer divide by zero.
{
  let run = runOnCont(`i32.const 1 i32.const 0 i32.div_s drop`);
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /integer divide by zero/);
}

// Integer overflow (INT_MIN / -1).
{
  let run = runOnCont(`i32.const 0x80000000 i32.const -1 i32.div_s drop`);
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /integer overflow/);
}

// Out-of-bounds memory load.
{
  let run = wasmEvalText(`(module
    ${MODULE_PRELUDE}
    (memory 1)
    (func $f (type $ft)
      i32.const 0xffffffff
      i32.load
      drop
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`).exports.run;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /out of bounds/);
}

// Out-of-bounds memory store.
{
  let run = wasmEvalText(`(module
    ${MODULE_PRELUDE}
    (memory 1)
    (func $f (type $ft)
      i32.const 0xffffffff
      i32.const 0
      i32.store
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`).exports.run;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /out of bounds/);
}

// Out-of-bounds table access.
{
  let run = wasmEvalText(`(module
    ${MODULE_PRELUDE}
    (table 1 funcref)
    (func $f (type $ft)
      i32.const 100
      table.get 0
      drop
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`).exports.run;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /out of bounds/);
}

// Indirect call signature mismatch.
{
  let run = wasmEvalText(`(module
    ${MODULE_PRELUDE}
    (type $other (func (result i32)))
    (table 1 funcref)
    (func $g (type $ft))
    (elem (i32.const 0) func $g)
    (func $f (type $ft)
      i32.const 0
      call_indirect (type $other)
      drop
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`).exports.run;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /indirect call signature mismatch/);
}

// ref.cast failure inside a continuation (bad cast trap).
{
  let run = wasmEvalText(`(module
    ${MODULE_PRELUDE}
    (type $a (struct))
    (type $b (struct (field i32)))
    (func $f (type $ft)
      (struct.new $a)
      ref.cast (ref $b)
      drop
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`).exports.run;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /bad cast/);
}

// Trap after a suspend/resume round-trip.  Verifies unwind still works after
// the continuation stack has already been switched back and forth.
{
  let { start, step } = wasmEvalText(`(module
    ${MODULE_PRELUDE}
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (func $f (type $ft)
      suspend $tag
      i32.const 1
      i32.const 0
      i32.div_s
      drop
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
  assertErrorMessage(() => step(), WebAssembly.RuntimeError, /integer divide by zero/);
}
