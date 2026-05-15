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
