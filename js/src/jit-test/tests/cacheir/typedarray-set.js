// Ensure inlined set() checks for detached target buffers.
function testDetachedTarget() {
  var target = new Int8Array(10);
  var source = new Int8Array(10);
  for (var i = 0; i <= 100; ++i) {
    if (i === 100) {
      detachArrayBuffer(target.buffer);
    }

    try {
      target.set(source);
    } catch (e) {
      assertEq(e.name, "TypeError");
      assertEq(i, 100);
      continue;
    }
    assertEq(i < 100, true);
  }
}
testDetachedTarget();

// Ensure inlined set() checks for detached source buffers.
function testDetachedSource() {
  var target = new Int8Array(10);
  var source = new Int8Array(10);
  for (var i = 0; i <= 100; ++i) {
    if (i === 100) {
      detachArrayBuffer(source.buffer);
    }

    try {
      target.set(source);
    } catch (e) {
      assertEq(e.name, "TypeError");
      assertEq(i, 100);
      continue;
    }
    assertEq(i < 100, true);
  }
}
testDetachedSource();

// Ensure non-integer offset index is correctly handled.
function testOffsetNonInteger() {
  var target = new Int8Array(10);
  var source = new Int8Array(10);
  for (var i = 0; i <= 100; ++i) {
    // ToInteger(0.5) = 0.
    var offset = [0, 0.5][(i === 100)|0];
    target.set(source, offset);
  }
}
testOffsetNonInteger();

// Ensure negative offset is correctly handled.
function testOffsetNegative() {
  var target = new Int8Array(10);
  var source = new Int8Array(10);
  for (var i = 0; i <= 100; ++i) {
    var offset = [0, -1][(i === 100)|0]

    try {
      target.set(source, offset);
    } catch (e) {
      assertEq(e.name, "RangeError");
      assertEq(i, 100);
      continue;
    }
    assertEq(i < 100, true);
  }
}
testOffsetNegative();

// Test no bit-wise copying with different underlying buffer.
function testNoBitwiseCopyDifferentBuffer() {
  var target = new Float64Array(10);
  var source = new Float32Array(10);
  for (var i = 0; i <= 100; ++i) {
    source[0] = i;
    source[1] = i + 1;

    target.set(source);

    assertEq(target[0], i);
    assertEq(target[1], i + 1);
  }
}
testNoBitwiseCopyDifferentBuffer();

// Test no bit-wise copying with same underlying buffer.
function testNoBitwiseCopySameBuffer() {
  var target = new Float64Array(10);
  var source = new Float32Array(target.buffer, 0, target.length);
  for (var i = 0; i <= 100; ++i) {
    source[0] = i;
    source[1] = i + 1;

    target.set(source);

    assertEq(target[0], i);
    assertEq(target[1], i + 1);
  }
}
testNoBitwiseCopySameBuffer();
