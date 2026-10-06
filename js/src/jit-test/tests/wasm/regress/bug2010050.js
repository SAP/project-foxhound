// |jit-test| test-join=--spectre-mitigations=off

let { load, memory } = wasmEvalText(`(module
  (memory (export "memory") i64 1)
  (func (export "load") (param i64) (result i32)
    (i32.load
        (local.get 0)
    )
  )
)`).exports;

// a wasm page is 64k
let pageSize = 0x1_0000n;

// if an upper 32-bit is non-zero, the bounds check is skipped. the upper 32-bits is truncated and ignored
let fourGiB = 0x1_0000_0000n;

// there is always a wasm page sized guard after the initial memory
let guardSize = pageSize;
// the initial size of memory is 1 page
let initialSize = pageSize;

// access immediately beyond the guard region
let badAccess = fourGiB + initialSize + guardSize;

// this should trap
assertErrorMessage(() => load(badAccess), WebAssembly.RuntimeError, /out of bounds/);
