// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Resume a null continuation ref -> null pointer dereference
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (func (export "run")
      ref.null $ct
      resume $ct
    )
  )`).exports;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /null pointer/);
}

// Can't resume the same continuation twice
{
  let { init, resume1, resume2 } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (func $f (type $ft))
    (elem declare func $f)
    (func (export "init")
      ref.func $f
      cont.new $ct
      global.set $k
    )
    (func (export "resume1")
      global.get $k
      resume $ct
    )
    (func (export "resume2")
      global.get $k
      resume $ct
    )
  )`).exports;
  init();
  resume1();
  assertErrorMessage(() => resume2(), WebAssembly.RuntimeError, /null pointer/);
}

// Unhandled suspension (no handlers at all)
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (func $f (type $ft)
      suspend $tag
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`).exports;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /null pointer/);
}

// Unhandled suspension (wrong tag): handler exists but for a different tag
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag1)
    (tag $tag2)
    (func $f (type $ft)
      suspend $tag2
    )
    (elem declare func $f)
    (func (export "run")
      (block (result (ref $ct))
        ref.func $f
        cont.new $ct
        resume $ct (on $tag1 0)
        unreachable
      )
      drop
    )
  )`).exports;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /null pointer/);
}

// cont.new with null funcref -> dereferencing null pointer
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (func (export "run")
      ref.null $ft
      cont.new $ct
      drop
    )
  )`).exports;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /null pointer/);
}

// Trap in continuation propagates as RuntimeError to the JS caller
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (func $f (export "f") (type $ft) unreachable)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`).exports;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /unreachable/);
}

// Suspend inside try block is NYI
{
  let { run } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (func $f (type $ft)
      try
        suspend $tag
      catch_all
      end
    )
    (elem declare func $f)
    (func (export "run")
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`).exports;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /unimplemented/);
}

// cont.new/resume with cont type having params or results is NYI
{
  let { run } = wasmEvalText(`(module
    (type $ft (func (param i32) (result i32)))
    (type $ct (cont $ft))
    (func $f (type $ft) local.get 0)
    (elem declare func $f)
    (func (export "run") (result i32)
      i32.const 1
      ref.func $f
      cont.new $ct
      resume $ct
    )
  )`).exports;
  assertErrorMessage(() => run(), WebAssembly.RuntimeError, /unimplemented/);
}
