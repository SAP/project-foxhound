
// A simple test case for memory.copy between different memories.
// See bug 1861267.

let i = wasmEvalText(
`(module
  (memory $$mem0 (data "staubfaenger"))
  (memory $$mem1 (data "\\ee\\22\\55\\ff"))
  (memory $$mem2 (data "\\dd\\33\\66\\00"))
  (memory $$mem3 (data "schnickschnack"))

  (func (export "copy0to3") (param i32 i32 i32)
    (memory.copy $$mem3 $$mem0
      (local.get 0)
      (local.get 1)
      (local.get 2))
  )
  (func (export "copy3to0") (param i32 i32 i32)
    (memory.copy $$mem0 $$mem3
      (local.get 0)
      (local.get 1)
      (local.get 2))
  )

  (func (export "read0") (param i32) (result i32)
    (i32.load8_u $$mem0 (local.get 0))
  )
  (func (export "read3") (param i32) (result i32)
    (i32.load8_u $$mem3 (local.get 0))
  )
)`);

i.exports.copy0to3(4, 5, 6);
let s = "";
for (let ix = 0; ix < 14; ix++) {
    s = s + String.fromCharCode(i.exports.read3(ix));
}

i.exports.copy3to0(8, 2, 7);
s = s + "_";
for (let ix = 0; ix < 12; ix++) {
    s = s + String.fromCharCode(i.exports.read0(ix));
}

assertEq(s, "schnfaengenack_staubfaehnfa");

// Bounds-check tests for memory.copy between distinct memories. Both memories
// are 1 page (65536 bytes).
{
  let bounds = wasmEvalText(
    `(module
       (memory $$dst 1)
       (memory $$src 1)
       (func (export "copy") (param $dst i32) (param $src i32) (param $n i32)
         (memory.copy $$dst $$src
           (local.get $dst)
           (local.get $src)
           (local.get $n))
       )
     )`).exports;
  const PAGE = 65536;

  // Zero-len copy at exact dst boundary succeeds.
  bounds.copy(PAGE, 0, 0);
  // Zero-len copy one past dst boundary traps.
  assertErrorMessage(() => bounds.copy(PAGE + 1, 0, 0),
                     WebAssembly.RuntimeError, /index out of bounds/);
  // Zero-len copy at exact src boundary succeeds.
  bounds.copy(0, PAGE, 0);
  // Zero-len copy one past src boundary traps.
  assertErrorMessage(() => bounds.copy(0, PAGE + 1, 0),
                     WebAssembly.RuntimeError, /index out of bounds/);
  // dst offset = 2^32 - 4 wraps around when added to n, must trap.
  assertErrorMessage(() => bounds.copy(-4, 0, 4),
                     WebAssembly.RuntimeError, /index out of bounds/);
  // src offset = 2^32 - 4 wraps around when added to n, must trap.
  assertErrorMessage(() => bounds.copy(0, -4, 4),
                     WebAssembly.RuntimeError, /index out of bounds/);
}
