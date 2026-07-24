// |jit-test| --ion-limit-script-size=off; --enable-arraybuffer-immutable; skip-if: !ArrayBuffer.prototype.transferToImmutable

// Test scalar replacement of TypedArray.prototype.subarray objects.
//
// Ensure length and byteOffset for immutable typed arrays works correctly.

function test() {
  for (var i = 0; i < 100; ++i) {
    var ab = new ArrayBuffer(10 * Int32Array.BYTES_PER_ELEMENT).transferToImmutable();
    var ta = new Int32Array(ab, 4);
    var sub = ta.subarray(2);

    assertEq(sub.length, 7);
    assertEq(sub.byteLength, 7 * Int32Array.BYTES_PER_ELEMENT);
    assertEq(sub.byteOffset, 4 + 2 * Int32Array.BYTES_PER_ELEMENT);

    assertRecoveredOnBailout(sub, true);
  }
}
test();
