// Ensure ArrayBuffer views are updated after resize/grow.

function testResize() {
  let memory = new WebAssembly.Memory({initial: 1, maximum: 3});
  let buffer = memory.toResizableBuffer();
  let view1 = new Uint8Array(buffer);
  let view2 = new Int32Array(buffer);
  assertEq(view1.length, PageSizeInBytes);
  assertEq(view2.byteLength, PageSizeInBytes);

  // Test ArrayBuffer.prototype.resize.
  buffer.resize(2 * PageSizeInBytes);
  assertEq(buffer.byteLength, 2 * PageSizeInBytes);
  assertEq(view1.length, 2 * PageSizeInBytes);
  assertEq(view2.byteLength, 2 * PageSizeInBytes);

  // Test WebAssembly.Memory.prototype.grow.
  memory.grow(1);
  assertEq(buffer.byteLength, 3 * PageSizeInBytes);
  assertEq(view1.length, 3 * PageSizeInBytes);
  assertEq(view2.byteLength, 3 * PageSizeInBytes);
}
testResize();

function testGrow() {
  let memory = new WebAssembly.Memory({initial: 1, maximum: 3, shared: true});
  let buffer = memory.toResizableBuffer();
  let view1 = new Uint8Array(buffer);
  let view2 = new Int32Array(buffer);
  assertEq(view1.length, PageSizeInBytes);
  assertEq(view2.byteLength, PageSizeInBytes);

  // Test SharedArrayBuffer.prototype.grow.
  buffer.grow(2 * PageSizeInBytes);
  assertEq(buffer.byteLength, 2 * PageSizeInBytes);
  assertEq(view1.length, 2 * PageSizeInBytes);
  assertEq(view2.byteLength, 2 * PageSizeInBytes);

  // Test WebAssembly.Memory.prototype.grow.
  memory.grow(1);
  assertEq(buffer.byteLength, 3 * PageSizeInBytes);
  assertEq(view1.length, 3 * PageSizeInBytes);
  assertEq(view2.byteLength, 3 * PageSizeInBytes);
}
testGrow();
