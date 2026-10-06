// |jit-test| --ion-limit-script-size=off; --ion-osr=off; --ion-inlining=off

// Test scalar replacement of TypedArray.prototype.subarray objects.
//
// - Uses various elements sizes (Int8, Int32, Int64) to ensure access is scaled
//   by element size when necessary.
// - Uses different offsets to make sure offset adjustments work correctly.

function assertEqArray(actual, expected) {
  assertEq(actual.length, expected.length);

  for (var i = 0; i < expected.length; ++i) {
    if (!Object.is(actual[i], expected[i])) {
      assertEq(actual[i], expected[i], `[${actual}] != [${expected}] at index ${i}`);
    }
  }
}

// Test |length| and |byteLength| of scalar replaced |subarray| works.
function testLengthAndByteLength() {
  var i8 = new Int8Array(10);
  var i32 = new Int32Array(10);
  var i64 = new BigInt64Array(10);

  function inner() {
    var sub_i8 = i8.subarray();
    assertEq(sub_i8.length, 10);
    assertEq(sub_i8.byteLength, 10 * Int8Array.BYTES_PER_ELEMENT);
    assertRecoveredOnBailout(sub_i8, true);

    var sub_i32 = i32.subarray(5);
    assertEq(sub_i32.length, 5);
    assertEq(sub_i32.byteLength, 5 * Int32Array.BYTES_PER_ELEMENT);
    assertRecoveredOnBailout(sub_i32, true);

    var sub_i64 = i64.subarray(3, -1);
    assertEq(sub_i64.length, 6);
    assertEq(sub_i64.byteLength, 6 * BigInt64Array.BYTES_PER_ELEMENT);
    assertRecoveredOnBailout(sub_i64, true);
  }
  for (var i = 0; i < 100; ++i) {
    inner();
  }
}
testLengthAndByteLength();

// Test |byteOffset| of scalar replaced |subarray| works.
function testByteOffset() {
  var i8 = new Int8Array(new ArrayBuffer(20 * Int8Array.BYTES_PER_ELEMENT), 4, 10);
  var i32 = new Int32Array(new ArrayBuffer(20 * Int32Array.BYTES_PER_ELEMENT), 8, 10);
  var i64 = new BigInt64Array(new ArrayBuffer(20 * BigInt64Array.BYTES_PER_ELEMENT), 16, 10);

  function inner() {
    var sub_i8 = i8.subarray();
    assertEq(sub_i8.byteOffset, 4);
    assertRecoveredOnBailout(sub_i8, true);

    var sub_i32 = i32.subarray(5);
    assertEq(sub_i32.byteOffset, 8 + 5 * Int32Array.BYTES_PER_ELEMENT);
    assertRecoveredOnBailout(sub_i32, true);

    var sub_i64 = i64.subarray(3, -1);
    assertEq(sub_i64.byteOffset, 16 + 3 * BigInt64Array.BYTES_PER_ELEMENT);
    assertRecoveredOnBailout(sub_i64, true);
  }
  for (var i = 0; i < 100; ++i) {
    inner();
  }
}
testByteOffset();

// Test get-element access of scalar replaced |subarray| works.
function testGetElement() {
  var i8 = new Int8Array(10).map((v, k) => k);
  var i32 = new Int32Array(10).map((v, k) => k * 1000);
  var i64 = new BigInt64Array(10).map((v, k) => BigInt(k) * 1_000_000_000_000n);

  function inner() {
    var sub_i8 = i8.subarray();
    var sum = 0;
    for (var j = 0; j < sub_i8.length; ++j) {
      sum += sub_i8[j];
    }
    assertEq(sum, 0 + 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9);
    assertRecoveredOnBailout(sub_i8, true);

    var sub_i32 = i32.subarray(-6);
    var sum = 0;
    for (var j = 0; j < sub_i32.length; ++j) {
      sum += sub_i32[j];
    }
    assertEq(sum, 4000 + 5000 + 6000 + 7000 + 8000 + 9000);
    assertRecoveredOnBailout(sub_i32, true);

    var sub_i64 = i64.subarray(8, 100);
    var sum = 0n;
    for (var j = 0; j < sub_i64.length; ++j) {
      sum += sub_i64[j];
    }
    assertEq(sum, 8_000_000_000_000n + 9_000_000_000_000n);
    assertRecoveredOnBailout(sub_i64, true);
  }
  for (var i = 0; i < 100; ++i) {
    inner();
  }
}
testGetElement();

// Test atomic get-element access of scalar replaced |subarray| works.
function testGetElementAtomic() {
  var i8 = new Int8Array(10).map((v, k) => k);
  var i32 = new Int32Array(10).map((v, k) => k * 1000);
  var i64 = new BigInt64Array(10).map((v, k) => BigInt(k) * 1_000_000_000_000n);

  function inner() {
    var sub_i8 = i8.subarray();
    var sum = 0;
    for (var j = 0; j < sub_i8.length; ++j) {
      sum += Atomics.load(sub_i8, j);
    }
    assertEq(sum, 0 + 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9);
    assertRecoveredOnBailout(sub_i8, true);

    var sub_i32 = i32.subarray(-6);
    var sum = 0;
    for (var j = 0; j < sub_i32.length; ++j) {
      sum += Atomics.load(sub_i32, j);
    }
    assertEq(sum, 4000 + 5000 + 6000 + 7000 + 8000 + 9000);
    assertRecoveredOnBailout(sub_i32, true);

    var sub_i64 = i64.subarray(8, 100);
    var sum = 0n;
    for (var j = 0; j < sub_i64.length; ++j) {
      sum += Atomics.load(sub_i64, j);
    }
    assertEq(sum, 8_000_000_000_000n + 9_000_000_000_000n);
    assertRecoveredOnBailout(sub_i64, true);
  }
  for (var i = 0; i < 100; ++i) {
    inner();
  }
}
testGetElementAtomic();

// Test set-element access of scalar replaced |subarray| works.
function testSetElement() {
  var i8 = new Int8Array(10);
  var i32 = new Int32Array(10);
  var i64 = new BigInt64Array(10);

  function inner() {
    i8.fill(0);
    i32.fill(0);
    i64.fill(0n);

    var sub_i8 = i8.subarray();
    for (var j = 0; j < sub_i8.length; ++j) {
      sub_i8[j] = j * 10;
    }
    assertRecoveredOnBailout(sub_i8, true);

    var sub_i32 = i32.subarray(-6);
    for (var j = 0; j < sub_i32.length; ++j) {
      sub_i32[j] = j * 1000;
    }
    assertRecoveredOnBailout(sub_i32, true);

    var sub_i64 = i64.subarray(8, 100);
    for (var j = 0; j < sub_i64.length; ++j) {
      sub_i64[j] = BigInt(j + 1) * 1111n;
    }
    assertRecoveredOnBailout(sub_i64, true);

    assertEqArray(i8, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    assertEqArray(i32, [0, 0, 0, 0, 0, 1000, 2000, 3000, 4000, 5000]);
    assertEqArray(i64, [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 1111n, 2222n]);
  }
  for (var i = 0; i < 100; ++i) {
    inner();
  }
}
testSetElement();

// Test atomic set-element access of scalar replaced |subarray| works.
function testSetElementAtomic() {
  var i8 = new Int8Array(10);
  var i32 = new Int32Array(10);
  var i64 = new BigInt64Array(10);

  function inner() {
    i8.fill(0);
    i32.fill(0);
    i64.fill(0n);

    var sub_i8 = i8.subarray();
    for (var j = 0; j < sub_i8.length; ++j) {
      Atomics.store(sub_i8, j, j * 10);
    }
    assertRecoveredOnBailout(sub_i8, true);

    var sub_i32 = i32.subarray(-6);
    for (var j = 0; j < sub_i32.length; ++j) {
      Atomics.store(sub_i32, j, j * 1000);
    }
    assertRecoveredOnBailout(sub_i32, true);

    var sub_i64 = i64.subarray(8, 100);
    for (var j = 0; j < sub_i64.length; ++j) {
      Atomics.store(sub_i64, j, BigInt(j + 1) * 1111n);
    }
    assertRecoveredOnBailout(sub_i64, true);

    assertEqArray(i8, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    assertEqArray(i32, [0, 0, 0, 0, 0, 1000, 2000, 3000, 4000, 5000]);
    assertEqArray(i64, [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 1111n, 2222n]);
  }
  for (var i = 0; i < 100; ++i) {
    inner();
  }
}
testSetElementAtomic();

// Test |fill| with scalar replaced |subarray| works.
function testFill() {
  var i8 = new Int8Array(10);
  var i32 = new Int32Array(10);
  var i64 = new BigInt64Array(10);

  function inner() {
    i8.fill(0);
    i32.fill(0);
    i64.fill(0n);

    var sub_i8 = i8.subarray();
    sub_i8.fill(1);
    assertRecoveredOnBailout(sub_i8, true);

    var sub_i32 = i32.subarray(1);
    sub_i32.fill(1234, 0, -5);
    assertRecoveredOnBailout(sub_i32, true);

    var sub_i64 = i64.subarray(2, 4);
    sub_i64.fill(0x123456789abcdefn, 1);
    assertRecoveredOnBailout(sub_i64, true);

    assertEqArray(i8, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    assertEqArray(i32, [0, 1234, 1234, 1234, 1234, 0, 0, 0, 0, 0]);
    assertEqArray(i64, [0n, 0n, 0n, 0x123456789abcdefn, 0n, 0n, 0n, 0n, 0n, 0n]);
  }
  for (var i = 0; i < 100; ++i) {
    inner();
  }
}
testFill();

// Test |set| with scalar replaced |subarray| as source works.
function testSetSource() {
  var i8 = new Int8Array(10);
  var i32 = new Int32Array(10);
  var i64 = new BigInt64Array(10);

  var i8_source = new Int8Array(10).map((v, k) => k);
  var i32_source = new Int32Array(10).map((v, k) => k * 1000);
  var i64_source = new BigInt64Array(10).map((v, k) => BigInt(k) * 1_000_000_000_000n);

  function inner() {
    i8.fill(0);
    i32.fill(0);
    i64.fill(0n);

    var sub_i8 = i8_source.subarray();
    i8.set(sub_i8);
    assertRecoveredOnBailout(sub_i8, true);

    var sub_i32 = i32_source.subarray(-8, -2);
    i32.set(sub_i32, 3);
    assertRecoveredOnBailout(sub_i32, true);

    var sub_i64 = i64_source.subarray(5, 7);
    i64.set(sub_i64, 5);
    assertRecoveredOnBailout(sub_i64, true);

    assertEqArray(i8, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assertEqArray(i32, [0, 0, 0, 2000, 3000, 4000, 5000, 6000, 7000, 0]);
    assertEqArray(i64, [0n, 0n, 0n, 0n, 0n, 5000000000000n, 6000000000000n, 0n, 0n, 0n]);
  }
  for (var i = 0; i < 100; ++i) {
    inner();
  }
}
testSetSource();

// Test |set| with scalar replaced |subarray| as target works.
function testSetTarget() {
  var i8 = new Int8Array(10);
  var i32 = new Int32Array(10);
  var i64 = new BigInt64Array(10);

  var i8_source = new Int8Array(10).map((v, k) => k);
  var i32_source = new Int32Array(2).map((v, k) => (k + 1) * 1000);
  var i64_source = new BigInt64Array(4).map((v, k) => BigInt(k + 1) * 0x1111_1111n);

  function inner() {
    i8.fill(0);
    i32.fill(0);
    i64.fill(0n);

    var sub_i8 = i8.subarray();
    sub_i8.set(i8_source);
    assertRecoveredOnBailout(sub_i8, true);

    var sub_i32 = i32.subarray(-8, -3);
    sub_i32.set(i32_source, 3);
    assertRecoveredOnBailout(sub_i32, true);

    var sub_i64 = i64.subarray(2, 8);
    sub_i64.set(i64_source, 1);
    assertRecoveredOnBailout(sub_i64, true);

    assertEqArray(i8, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assertEqArray(i32, [0, 0, 0, 0, 0, 1000, 2000, 0, 0, 0]);
    assertEqArray(i64, [0n, 0n, 0n, 0x1111_1111n, 0x2222_2222n, 0x3333_3333n, 0x4444_4444n, 0n, 0n, 0n]);
  }
  for (var i = 0; i < 100; ++i) {
    inner();
  }
}
testSetTarget();

// Test |subarray| of scalar replaced |subarray| works.
function testSubarray() {
  var i8 = new Int8Array(10);
  var i32 = new Int32Array(10);
  var i64 = new BigInt64Array(10);

  var i64_one = new BigInt64Array([1n, 1n]);

  function inner() {
    i8.fill(0);
    i32.fill(0);
    i64.fill(0n);

    var sub_i8_1 = i8.subarray(1);
    var sub_i8_2 = sub_i8_1.subarray(2);
    assertEq(sub_i8_1.length, 10 - 1);
    assertEq(sub_i8_2.length, 10 - 1 - 2);

    sub_i8_1[2] = 10;
    assertEq(sub_i8_2[0], 10);

    sub_i8_2[1] = 20;
    assertEq(sub_i8_1[3], 20);

    assertRecoveredOnBailout(sub_i8_1, true);
    assertRecoveredOnBailout(sub_i8_2, true);


    var sub_i32_1 = i32.subarray(2);
    var sub_i32_2 = sub_i32_1.subarray(2, -3);
    assertEq(sub_i32_1.length, 10 - 2);
    assertEq(sub_i32_2.length, 10 - 2 - 2 - 3);

    sub_i32_2.fill(100);

    assertRecoveredOnBailout(sub_i32_1, true);
    assertRecoveredOnBailout(sub_i32_2, true);


    var sub_i64_1 = i64.subarray(2, 8);
    var sub_i64_2 = sub_i64_1.subarray(2);
    assertEq(sub_i64_1.length, 10 - 4);
    assertEq(sub_i64_2.length, 10 - 4 - 2);

    sub_i64_2.set(i64_one, 2);

    assertRecoveredOnBailout(sub_i64_1, true);
    assertRecoveredOnBailout(sub_i64_2, true);

    assertEqArray(i8, [0, 0, 0, 10, 20, 0, 0, 0, 0, 0]);
    assertEqArray(i32, [0, 0, 0, 0, 100, 100, 100, 0, 0, 0]);
    assertEqArray(i64, [0n, 0n, 0n, 0n, 0n, 0n, 1n, 1n, 0n, 0n]);
  }
  for (var i = 0; i < 100; ++i) {
    inner();
  }
}
testSubarray();

// Test |subarray| of scalar replaced |subarray| works.
function testSubarrayChain4() {
  var i8 = new Int8Array(10);
  var i32 = new Int32Array(10);
  var i64 = new BigInt64Array(10);

  var i64_one = new BigInt64Array([1n, 1n]);
  var i64_two = new BigInt64Array([2n]);

  function inner() {
    i8.fill(0);
    i32.fill(0);
    i64.fill(0n);

    var sub_i8_1 = i8.subarray(1);
    var sub_i8_2 = sub_i8_1.subarray(2);
    var sub_i8_3 = sub_i8_2.subarray(0);
    var sub_i8_4 = sub_i8_3.subarray(3);
    assertEq(sub_i8_1.length, 10 - 1);
    assertEq(sub_i8_2.length, 10 - 1 - 2);
    assertEq(sub_i8_3.length, 10 - 1 - 2 - 0);
    assertEq(sub_i8_4.length, 10 - 1 - 2 - 0 - 3);

    sub_i8_1[5] = 10;
    assertEq(sub_i8_2[3], 10);
    assertEq(sub_i8_3[3], 10);
    assertEq(sub_i8_4[0], 10);

    sub_i8_2[4] = 20;
    assertEq(sub_i8_1[6], 20);
    assertEq(sub_i8_3[4], 20);
    assertEq(sub_i8_4[1], 20);

    sub_i8_3[5] = 30;
    assertEq(sub_i8_1[7], 30);
    assertEq(sub_i8_3[5], 30);
    assertEq(sub_i8_4[2], 30);

    sub_i8_4[3] = 40;
    assertEq(sub_i8_1[8], 40);
    assertEq(sub_i8_2[6], 40);
    assertEq(sub_i8_3[6], 40);

    assertRecoveredOnBailout(sub_i8_1, true);
    assertRecoveredOnBailout(sub_i8_2, true);
    assertRecoveredOnBailout(sub_i8_3, true);
    assertRecoveredOnBailout(sub_i8_4, true);

    var sub_i32_1 = i32.subarray(2);
    var sub_i32_2 = sub_i32_1.subarray(2, -3);
    var sub_i32_3 = sub_i32_2.subarray();
    var sub_i32_4 = sub_i32_3.subarray(2);
    assertEq(sub_i32_1.length, 10 - 2);
    assertEq(sub_i32_2.length, 10 - 2 - 2 - 3);
    assertEq(sub_i32_3.length, 10 - 2 - 2 - 3);
    assertEq(sub_i32_4.length, 10 - 2 - 2 - 3 - 2);

    sub_i32_2.fill(100);
    sub_i32_4.fill(200);

    assertRecoveredOnBailout(sub_i32_1, true);
    assertRecoveredOnBailout(sub_i32_2, true);
    assertRecoveredOnBailout(sub_i32_3, true);
    assertRecoveredOnBailout(sub_i32_4, true);

    var sub_i64_1 = i64.subarray(2, 8);
    var sub_i64_2 = sub_i64_1.subarray(2);
    var sub_i64_3 = sub_i64_2.subarray(1);
    var sub_i64_4 = sub_i64_3.subarray();
    assertEq(sub_i64_1.length, 10 - 4);
    assertEq(sub_i64_2.length, 10 - 4 - 2);
    assertEq(sub_i64_3.length, 10 - 4 - 2 - 1);
    assertEq(sub_i64_4.length, 10 - 4 - 2 - 1);

    sub_i64_2.set(i64_one, 2);
    sub_i64_4.set(i64_two);

    assertRecoveredOnBailout(sub_i64_1, true);
    assertRecoveredOnBailout(sub_i64_2, true);
    assertRecoveredOnBailout(sub_i64_3, true);
    assertRecoveredOnBailout(sub_i64_4, true);

    assertEqArray(i8, [0, 0, 0, 0, 0, 0, 10, 20, 30, 40]);
    assertEqArray(i32, [0, 0, 0, 0, 100, 100, 200, 0, 0, 0]);
    assertEqArray(i64, [0n, 0n, 0n, 0n, 0n, 2n, 1n, 1n, 0n, 0n]);
  }
  for (var i = 0; i < 100; ++i) {
    inner();
  }
}
testSubarrayChain4();
