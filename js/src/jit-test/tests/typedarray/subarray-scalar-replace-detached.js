// |jit-test| --ion-limit-script-size=off

// Test scalar replacement of TypedArray.prototype.subarray objects.
//
// Ensure length and byteOffset of detached buffers are correctly computed.

function test() {
  for (var i = 0; i < 100; ++i) {
    var ab = new ArrayBuffer(10 * Int32Array.BYTES_PER_ELEMENT);
    var ta = new Int32Array(ab, 4);
    var sub = ta.subarray(2);

    assertEq(sub.length, 7);
    assertEq(sub.byteLength, 7 * Int32Array.BYTES_PER_ELEMENT);
    assertEq(sub.byteOffset, 4 + 2 * Int32Array.BYTES_PER_ELEMENT);

    // Detach buffer.
    detachArrayBuffer(ta.buffer);

    // length, byteLength, and byteOffset now all return zero.
    assertEq(sub.length, 0);
    assertEq(sub.byteLength, 0);
    assertEq(sub.byteOffset, 0);

    assertRecoveredOnBailout(sub, true);
  }
}
test();
