// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Tests that JSPI works with GC struct types in function signatures. We pad
// with a bunch of trivial types to also test larger index spaces.

// Promising: struct param
{
  const ins = wasmEvalText(`(module
    ${`(type (func))\n`.repeat(300)}

    (type $pair (struct (field i32) (field i32)))
    (func (export "sum") (param (ref $pair)) (result i32)
      (i32.add
        (struct.get $pair 0 (local.get 0))
        (struct.get $pair 1 (local.get 0))
      )
    )
    (func (export "makePair") (param i32 i32) (result (ref $pair))
      (struct.new $pair (local.get 0) (local.get 1))
    )
  )`);

  const psum = WebAssembly.promising(ins.exports.sum);
  const pair = ins.exports.makePair(3, 4);
  psum(pair).then(r => {
    assertEq(r, 7);
  }).catch(e => { throw e });
}

// Promising: struct result
{
  const ins = wasmEvalText(`(module
    ${`(type (func))\n`.repeat(300)}

    (type $pair (struct (field i32) (field i32)))
    (func (export "makePair") (param i32 i32) (result (ref $pair))
      (struct.new $pair (local.get 0) (local.get 1))
    )
    (func (export "getFirst") (param (ref $pair)) (result i32)
      (struct.get $pair 0 (local.get 0))
    )
  )`);

  const pMakePair = WebAssembly.promising(ins.exports.makePair);
  pMakePair(5, 6).then(pair => {
    assertEq(ins.exports.getFirst(pair), 5);
  }).catch(e => { throw e });
}

// Suspending: struct param
{
  let ins;
  const sf = new WebAssembly.Suspending(async (pair) => {
    return 99;
  });

  ins = wasmEvalText(`(module
    ${`(type (func))\n`.repeat(300)}

    (type $pair (struct (field i32) (field i32)))
    (import "" "sf" (func $sf (param (ref $pair)) (result i32)))
    (func (export "run") (param (ref $pair)) (result i32)
      (call $sf (local.get 0))
    )
    (func (export "makePair") (param i32 i32) (result (ref $pair))
      (struct.new $pair (local.get 0) (local.get 1))
    )
  )`, {"": {sf}});

  const prun = WebAssembly.promising(ins.exports.run);
  const pair = ins.exports.makePair(1, 2);
  prun(pair).then(r => {
    assertEq(r, 99);
  }).catch(e => { throw e });
}

// Suspending: struct result
{
  let ins;
  const sf = new WebAssembly.Suspending(async () => {
    return ins.exports.makePair(10, 20);
  });

  ins = wasmEvalText(`(module
    ${`(type (func))\n`.repeat(300)}

    (type $pair (struct (field i32) (field i32)))
    (import "" "sf" (func $sf (result (ref $pair))))
    (func (export "run") (result i32)
      (struct.get $pair 1 (call $sf))
    )
    (func (export "makePair") (param i32 i32) (result (ref $pair))
      (struct.new $pair (local.get 0) (local.get 1))
    )
  )`, {"": {sf}});

  const prun = WebAssembly.promising(ins.exports.run);
  prun().then(r => {
    assertEq(r, 20);
  }).catch(e => { throw e });
}

drainJobQueue();
