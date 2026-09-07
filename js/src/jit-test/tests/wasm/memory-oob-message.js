// |jit-test| --setpref=wasm_memory_debugging;

// Tests for out-of-bounds error messages, including the detailed form that
// includes memory index and byte offset on 64-bit platforms.

// We only support printing a useful offset message with signal handling.
const hasOffsetMessage = wasmHugeMemoryEnabled();

function oobPattern(memIdx, byteOffset) {
    if (hasOffsetMessage) {
        return new RegExp(
            `out of bounds: memory ${memIdx} access at memory address ${byteOffset}`
        );
    }
    return /index out of bounds/;
}

// Cover all combinations of:
//   load/store * memory 0/1 * no-offset/offset=8
// Memory 0 has 1 page, memory 1 has 2 pages.
let {
    load0, load0_off, store0, store0_off,
    load1, load1_off, store1, store1_off,
    grow0, grow1,
} = wasmEvalText(`
    (module
      (memory 1)
      (memory 2)
      (func (export "load0") (param i32) (result i32)
        (i32.load 0 (local.get 0)))
      (func (export "load0_off") (param i32) (result i32)
        (i32.load 0 offset=8 (local.get 0)))
      (func (export "store0") (param i32) (param i32)
        (i32.store 0 (local.get 0) (local.get 1)))
      (func (export "store0_off") (param i32) (param i32)
        (i32.store 0 offset=8 (local.get 0) (local.get 1)))
      (func (export "load1") (param i32) (result i32)
        (i32.load 1 (local.get 0)))
      (func (export "load1_off") (param i32) (result i32)
        (i32.load 1 offset=8 (local.get 0)))
      (func (export "store1") (param i32) (param i32)
        (i32.store 1 (local.get 0) (local.get 1)))
      (func (export "store1_off") (param i32) (param i32)
        (i32.store 1 offset=8 (local.get 0) (local.get 1)))
      (func (export "grow0") (param i32) (result i32)
        (memory.grow 0 (local.get 0)))
      (func (export "grow1") (param i32) (result i32)
        (memory.grow 1 (local.get 0)))
    )
`).exports;

const p = PageSizeInBytes;
const RuntimeError = WebAssembly.RuntimeError;

// Memory 0 has 1 page, memory 1 has 2 pages.
assertErrorMessage(() => load0(p),        RuntimeError, oobPattern(0, p));
assertErrorMessage(() => load0_off(p),    RuntimeError, oobPattern(0, p + 8));
assertErrorMessage(() => store0(p, 0),    RuntimeError, oobPattern(0, p));
assertErrorMessage(() => store0_off(p, 0), RuntimeError, oobPattern(0, p + 8));
assertErrorMessage(() => load1(2 * p),    RuntimeError, oobPattern(1, 2 * p));
assertErrorMessage(() => load1_off(2 * p), RuntimeError, oobPattern(1, 2 * p + 8));
assertErrorMessage(() => store1(2 * p, 0), RuntimeError, oobPattern(1, 2 * p));
assertErrorMessage(() => store1_off(2 * p, 0), RuntimeError, oobPattern(1, 2 * p + 8));

// Grow each memory by one page, then re-run the OOB checks at the new boundaries.
assertEq(grow0(1), 1);
assertEq(grow1(1), 2);

// Memory 0 now has 2 pages, memory 1 now has 3 pages.
assertErrorMessage(() => load0(2 * p),        RuntimeError, oobPattern(0, 2 * p));
assertErrorMessage(() => load0_off(2 * p),    RuntimeError, oobPattern(0, 2 * p + 8));
assertErrorMessage(() => store0(2 * p, 0),    RuntimeError, oobPattern(0, 2 * p));
assertErrorMessage(() => store0_off(2 * p, 0), RuntimeError, oobPattern(0, 2 * p + 8));
assertErrorMessage(() => load1(3 * p),        RuntimeError, oobPattern(1, 3 * p));
assertErrorMessage(() => load1_off(3 * p),    RuntimeError, oobPattern(1, 3 * p + 8));
assertErrorMessage(() => store1(3 * p, 0),    RuntimeError, oobPattern(1, 3 * p));
assertErrorMessage(() => store1_off(3 * p, 0), RuntimeError, oobPattern(1, 3 * p + 8));
