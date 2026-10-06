// Ensure inlined fill() checks for detached target buffers.
function testDetached() {
  var ta = new Int8Array(10);
  for (var i = 0; i <= 100; ++i) {
    if (i === 100) {
      detachArrayBuffer(ta.buffer);
    }

    try {
      ta.fill(0);
    } catch (e) {
      assertEq(e.name, "TypeError");
      assertEq(i, 100);
      continue;
    }
    assertEq(i < 100, true);
  }
}
testDetached();

// Ensure inlined fill() checks content type.
function testContentTypeInt32() {
  var ta = new Int32Array(10);
  for (var i = 0; i <= 100; ++i) {
    var value = [0, 0n][(i === 100)|0]

    try {
      ta.fill(value);
    } catch (e) {
      assertEq(e.name, "TypeError");
      assertEq(i, 100);
      continue;
    }
    assertEq(i < 100, true);
  }
}
testContentTypeInt32();

// Ensure inlined fill() checks content type.
function testContentTypeBigInt() {
  var ta = new BigInt64Array(10);
  for (var i = 0; i <= 100; ++i) {
    var value = [0n, 0][(i === 100)|0]

    try {
      ta.fill(value);
    } catch (e) {
      assertEq(e.name, "TypeError");
      assertEq(i, 100);
      continue;
    }
    assertEq(i < 100, true);
  }
}
testContentTypeBigInt();

// Ensure non-integer start index is correctly handled.
function testStartIndexNonInteger() {
  var ta = new Int8Array(10);
  for (var i = 0; i <= 100; ++i) {
    // ToInteger(1.5) = 1
    var start = [0, 1.5][(i === 100)|0];

    ta.fill(i, start);

    assertEq(ta[0], (i < 100 ? i : i - 1));
    assertEq(ta[1], i);
  }
}
testStartIndexNonInteger();

// Ensure non-integer end index is correctly handled.
function testEndIndexNonInteger() {
  var ta = new Int8Array(10);
  for (var i = 0; i <= 100; ++i) {
    // ToInteger(6.5) = 6.
    var end = [5, 6.5][(i === 100)|0];

    ta.fill(i, 0, end);

    assertEq(ta[4], i);
    assertEq(ta[5], (i < 100 ? 0 : i));
  }
}
testEndIndexNonInteger();
