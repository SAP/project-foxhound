// Tests for stealArrayBufferContents / JS::StealArrayBufferContents.

load(libdir + "asserts.js");

// Steal |ab|'s contents and check the result is detached and holds the
// expected bytes.
function checkSteal(ab, expected) {
  assertEq(ab.byteLength, expected.length);

  let stolen = stealArrayBufferContents(ab);
  assertEq(ab.detached, true);
  assertEq(ab.byteLength, 0);

  assertEq(stolen.byteLength, expected.length);
  assertEq(new Uint8Array(stolen).toString(), expected.toString());
}

function fill(ab) {
  let data = Array.from({length: ab.byteLength}, (_, i) => i & 0xff);
  new Uint8Array(ab).set(data);
  return data;
}

let smallSize = 8;     // inline
let largeSize = 4096;  // malloc

// Non-resizable buffers.
for (let size of [0, smallSize, largeSize]) {
  let ab = new ArrayBuffer(size);
  checkSteal(ab, fill(ab));
}

// Resizable buffers where byteLength == maxByteLength.
for (let size of [0, smallSize, largeSize]) {
  let ab = new ArrayBuffer(size, {maxByteLength: size});
  checkSteal(ab, fill(ab));
}

// Resizable buffers where byteLength < maxByteLength.
for (let maxByteLength of [smallSize, largeSize]) {
  for (let byteLength of [0, 1, maxByteLength - 1]) {
    let ab = new ArrayBuffer(byteLength, {maxByteLength});
    checkSteal(ab, fill(ab));
  }
}

// Resizable buffer grown before stealing.
{
  let ab = new ArrayBuffer(0, {maxByteLength: largeSize});
  ab.resize(largeSize);
  checkSteal(ab, fill(ab));
}

// Resizable buffer grown and then shrunk back to zero before stealing.
{
  let ab = new ArrayBuffer(0, {maxByteLength: largeSize});
  ab.resize(largeSize);
  ab.resize(0);
  checkSteal(ab, []);
}

// Non-stealable inputs throw an exception.
assertThrowsInstanceOf(() => stealArrayBufferContents({}), Error);
assertThrowsInstanceOf(() => stealArrayBufferContents(new SharedArrayBuffer(8)),
                       Error);

// WASM-backed buffers have a defined [[ArrayBufferDetachKey]] and can't be
// stolen.
if (wasmIsSupported()) {
  let memory = new WebAssembly.Memory({initial: 1});
  assertThrowsInstanceOf(() => stealArrayBufferContents(memory.buffer),
                         TypeError);
}

// Already-detached buffers can't be stolen again.
{
  let ab = new ArrayBuffer(8);
  stealArrayBufferContents(ab);
  assertEq(ab.detached, true);
  assertThrowsInstanceOf(() => stealArrayBufferContents(ab), TypeError);
}

// Cross-compartment-wrapped ArrayBuffers can be stolen: the wrapped buffer is
// detached and the contents are returned in the current compartment.
{
  let g = newGlobal({newCompartment: true});

  // Zero-length resizable, malloc-backed.
  let wrapped = g.eval(`new ArrayBuffer(0, {maxByteLength: ${largeSize}})`);
  assertEq(isProxy(wrapped), true);
  let stolen = stealArrayBufferContents(wrapped);
  assertEq(wrapped.detached, true);
  assertEq(isProxy(stolen), false);
  assertEq(stolen.byteLength, 0);

  // Non-empty buffer preserves its bytes.
  let wrapped2 =
      g.eval(`let a = new ArrayBuffer(4); new Uint8Array(a).set([10, 20, 30, 40]); a`);
  let stolen2 = stealArrayBufferContents(wrapped2);
  assertEq(wrapped2.detached, true);
  assertEq(new Uint8Array(stolen2).toString(), "10,20,30,40");
}
