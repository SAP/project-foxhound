// Ensure inlined subarray() checks for detached buffers.
function testDetached() {
  var ab = new ArrayBuffer(10);
  var ta = new Int8Array(ab);
  for (var i = 0; i <= 100; ++i) {
    if (i === 100) {
      detachArrayBuffer(ab);
    }

    try {
      var r = ta.subarray();
      assertEq(r.length, ta.length);
    } catch (e) {
      assertEq(e.name, "TypeError");
      assertEq(i, 100);
      continue;
    }
    assertEq(i < 100, true);
  }
}
testDetached();

// Ensure shape guard to handle own "constructor" property.
function testShapeForOwnConstructor() {
  var ta = new Int8Array(10);
  for (var i = 0; i <= 100; ++i) {
    if (i === 100) {
      ta.constructor = Uint8Array;
    }

    var r = ta.subarray();
    assertEq(r.length, ta.length);
    assertEq(r.constructor, i < 100 ? Int8Array : Uint8Array);
  }
}
testShapeForOwnConstructor();

// Ensure shape guard to handle expected prototype.
function testShapeForPrototype() {
  var ta = new Int8Array(10);
  for (var i = 0; i <= 100; ++i) {
    if (i === 100) {
      Object.setPrototypeOf(ta, Uint8Array.prototype);
    }

    var r = ta.subarray();
    assertEq(r.length, ta.length);
    assertEq(r.constructor, i < 100 ? Int8Array : Uint8Array);
  }
}
testShapeForPrototype();

// Ensure fuse guard for "OptimizeTypedArraySpeciesFuse".
function testFuse() {
  var ta = new Int8Array(10);

  // Fuse is intact.
  assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, true);

  for (var i = 0; i <= 100; ++i) {
    if (i === 100) {
      Int8Array.prototype.constructor = Uint8Array;
    }

    var r = ta.subarray();
    assertEq(r.length, ta.length);
    assertEq(r.constructor, i < 100 ? Int8Array : Uint8Array);
  }

  // Fuse was popped.
  assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, false);
}

// Test in a new global to avoid invalidating the fuse of the current realm.
newGlobal().eval(`(${testFuse})()`);

// Ensure fuse of the current realm still intact.
assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, true);

// Ensure non-integer start index is correctly handled.
function testStartIndexNonInteger() {
  var ta = new Int8Array(10);
  for (var i = 0; i <= 100; ++i) {
    // ToInteger(1.5) = 1
    var start = [0, 1.5][(i === 100)|0];
    var r = ta.subarray(start);
    assertEq(r.length, ta.length - ((i === 100)|0));
  }
}
testStartIndexNonInteger();

// Ensure non-integer end index is correctly handled.
function testEndIndexNonInteger() {
  var ta = new Int8Array(10);
  for (var i = 0; i <= 100; ++i) {
    // ToInteger(6.5) = 6.
    var end = [5, 6.5][(i === 100)|0];
    var r = ta.subarray(0, end);
    assertEq(r.length, ta.length - 5 + ((i === 100)|0));
  }
}
testEndIndexNonInteger();
