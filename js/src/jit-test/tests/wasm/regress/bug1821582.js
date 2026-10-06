// Test that SharedArrayBuffer identity is preserved during WebAssembly.Memory cloning.

const options = {
  SharedArrayBuffer: "allow",
};

function testMemoryWithTypedArrays() {
  var memory = new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true });
  var buffer = memory.buffer;

  var arr1 = new Int32Array(buffer, 0, 10);
  var arr2 = new Int32Array(buffer, 40, 10);

  arr1[0] = 42;
  arr2[0] = 100;

  // Test with memory first in the object
  var obj1 = { memory, arr1, arr2 };
  var clonebuf1 = serialize(obj1, undefined, {scope: "SameProcess", ...options});
  var result1 = deserialize(clonebuf1, {...options});

  assertEq(result1.memory instanceof WebAssembly.Memory, true);
  assertEq(result1.arr1.buffer === result1.memory.buffer, true);
  assertEq(result1.arr2.buffer === result1.memory.buffer, true);
  assertEq(result1.arr1.buffer === result1.arr2.buffer, true);
  assertEq(result1.arr1[0], 42);
  assertEq(result1.arr2[0], 100);

  // Test with typed arrays before memory
  var obj2 = { arr1, arr2, memory };
  var clonebuf2 = serialize(obj2, undefined, {scope: "SameProcess", ...options});
  var result2 = deserialize(clonebuf2, {...options});

  assertEq(result2.memory instanceof WebAssembly.Memory, true);
  assertEq(result2.arr1.buffer === result2.memory.buffer, true);
  assertEq(result2.arr2.buffer === result2.memory.buffer, true);
  assertEq(result2.arr1.buffer === result2.arr2.buffer, true);
  assertEq(result2.arr1[0], 42);
  assertEq(result2.arr2[0], 100);
}

testMemoryWithTypedArrays();

// Serializing a plain SAB before a wasm memory case.
function testPlainSABBeforeWasmMemory() {
  var plainSAB = new SharedArrayBuffer(16);
  var memory = new WebAssembly.Memory({ initial: 1, maximum: 2, shared: true });
  var wasmSAB = memory.buffer;

  var data = serialize([plainSAB, wasmSAB, memory], undefined, {scope: "SameProcess", ...options});
  var result = deserialize(data, {...options});

  assertEq(result[2] instanceof WebAssembly.Memory, true);
  assertEq(result[2].buffer !== result[0], true);
  assertEq(result[2].buffer === result[1], true);

  // grow() would crash or assert if the memory wrapped the wrong buffer
  result[2].grow(1);
  assertEq(result[2].buffer.byteLength, 2 * 65536);
}

testPlainSABBeforeWasmMemory();

// Multiple plain SABs before a wasm memory: each SAB was double-appended,
// shifting the back-reference index by one per SAB.
function testMultiplePlainSABsBeforeWasmMemory() {
  var sab1 = new SharedArrayBuffer(16);
  var sab2 = new SharedArrayBuffer(32);
  var sab3 = new SharedArrayBuffer(64);
  var memory = new WebAssembly.Memory({ initial: 1, maximum: 4, shared: true });
  var wasmSAB = memory.buffer;

  var data = serialize([sab1, sab2, sab3, wasmSAB, memory], undefined,
                       {scope: "SameProcess", ...options});
  var result = deserialize(data, {...options});

  assertEq(result[4] instanceof WebAssembly.Memory, true);
  assertEq(result[4].buffer === result[3], true);
  assertEq(result[4].buffer !== result[0], true);
  assertEq(result[4].buffer !== result[1], true);
  assertEq(result[4].buffer !== result[2], true);
  result[4].grow(1);
  assertEq(result[4].buffer.byteLength, 2 * 65536);
}

testMultiplePlainSABsBeforeWasmMemory();

// Same WasmMemory referenced twice: the second reference must use a
// back-reference to the same WasmMemoryObject.
function testDuplicateMemoryReference() {
  var memory = new WebAssembly.Memory({ initial: 1, maximum: 2, shared: true });
  var wasmSAB = memory.buffer;
  var arr = new Int32Array(wasmSAB);
  arr[0] = 77;

  var data = serialize([memory, memory], undefined, {scope: "SameProcess", ...options});
  var result = deserialize(data, {...options});

  assertEq(result[0] instanceof WebAssembly.Memory, true);
  assertEq(result[1] instanceof WebAssembly.Memory, true);
  assertEq(result[0].buffer === result[1].buffer, true);
  assertEq(new Int32Array(result[0].buffer)[0], 77);
}

testDuplicateMemoryReference();

// Two independent wasm memories: back-reference indices for each memory's
// SAB must remain distinct.
function testTwoIndependentMemories() {
  var mem1 = new WebAssembly.Memory({ initial: 1, maximum: 2, shared: true });
  var mem2 = new WebAssembly.Memory({ initial: 2, maximum: 4, shared: true });
  var arr1 = new Int32Array(mem1.buffer);
  var arr2 = new Int32Array(mem2.buffer);
  arr1[0] = 11;
  arr2[0] = 22;

  var data = serialize([mem1, mem2, arr1, arr2], undefined,
                       {scope: "SameProcess", ...options});
  var result = deserialize(data, {...options});

  assertEq(result[0] instanceof WebAssembly.Memory, true);
  assertEq(result[1] instanceof WebAssembly.Memory, true);
  assertEq(result[2].buffer === result[0].buffer, true);
  assertEq(result[3].buffer === result[1].buffer, true);
  assertEq(result[0].buffer !== result[1].buffer, true);
  assertEq(new Int32Array(result[0].buffer)[0], 11);
  assertEq(new Int32Array(result[1].buffer)[0], 22);
}

testTwoIndependentMemories();

// Plain SAB + wasm memory + typed array on the wasm SAB: the scenario
// from bug 2019808 (3.js variant with named properties).
function testPlainSABThenMemoryThenTypedArray() {
  var plain = new SharedArrayBuffer(16);
  var memory = new WebAssembly.Memory({ initial: 1, maximum: 2, shared: true });
  var arr = new Int32Array(memory.buffer);
  arr[0] = 55;

  var obj = { a: plain, b: memory, c: arr };
  var data = serialize(obj, undefined, {scope: "SameProcess", ...options});
  var result = deserialize(data, {...options});

  assertEq(result.b instanceof WebAssembly.Memory, true);
  assertEq(result.c.buffer === result.b.buffer, true);
  assertEq(result.c.buffer !== result.a, true);
  assertEq(result.c[0], 55);
  result.b.grow(1);
}

testPlainSABThenMemoryThenTypedArray();

// Nested structure: memory inside an array inside an object, with a typed
// array at the top level referencing the same wasm SAB.
function testNestedMemoryWithOuterTypedArray() {
  var memory = new WebAssembly.Memory({ initial: 1, maximum: 2, shared: true });
  var arr = new Int32Array(memory.buffer);
  arr[0] = 99;

  var obj = { nested: [memory], arr };
  var data = serialize(obj, undefined, {scope: "SameProcess", ...options});
  var result = deserialize(data, {...options});

  assertEq(result.nested[0] instanceof WebAssembly.Memory, true);
  assertEq(result.arr.buffer === result.nested[0].buffer, true);
  assertEq(result.arr[0], 99);
}

testNestedMemoryWithOuterTypedArray();
