// Test int64 specialization for TypedArray.prototype.fill.

// Call fill() with a constant value.
function fillConstantInt64() {
  var i64 = new BigInt64Array(1);
  for (var i = 0; i < 100; ++i) {
    i64.fill(0n);
    assertEq(i64[0], 0n);

    i64.fill(1n);
    assertEq(i64[0], 1n);

    i64.fill(-1n);
    assertEq(i64[0], -1n);

    // Largest int64 value.
    i64.fill(0x7fff_ffff_ffff_ffffn);
    assertEq(i64[0], 0x7fff_ffff_ffff_ffffn);

    // Largest uint64 value.
    i64.fill(0xffff_ffff_ffff_ffffn);
    assertEq(i64[0], -1n);

    // Smallest int64 value.
    i64.fill(-0x8000_0000_0000_0000n);
    assertEq(i64[0], -0x8000_0000_0000_0000n);

    // Larger than largest int64 value.
    i64.fill(0x1111_2222_3333_4444_5555_6666n);
    assertEq(i64[0], 0x3333_4444_5555_6666n);

    // Smaller than smallest int64 value.
    i64.fill(-0x1111_2222_3333_4444_5555_6666n);
    assertEq(i64[0], -0x3333_4444_5555_6666n);
  }
}
fillConstantInt64();

// Call fill() with a constant value.
function fillConstantUint64() {
  var u64 = new BigUint64Array(1);
  for (var i = 0; i < 100; ++i) {
    u64.fill(0n);
    assertEq(u64[0], 0n);

    u64.fill(1n);
    assertEq(u64[0], 1n);

    u64.fill(-1n);
    assertEq(u64[0], 0xffff_ffff_ffff_ffffn);

    // Largest int64 value.
    u64.fill(0x7fff_ffff_ffff_ffffn);
    assertEq(u64[0], 0x7fff_ffff_ffff_ffffn);

    // Largest uint64 value.
    u64.fill(0xffff_ffff_ffff_ffffn);
    assertEq(u64[0], 0xffff_ffff_ffff_ffffn);

    // Smallest int64 value.
    u64.fill(-0x8000_0000_0000_0000n);
    assertEq(u64[0], 0x8000_0000_0000_0000n);

    // Larger than largest int64 value.
    u64.fill(0x1111_2222_3333_4444_5555_6666n);
    assertEq(u64[0], 0x3333_4444_5555_6666n);

    // Smaller than smallest int64 value.
    u64.fill(-0x1111_2222_3333_4444_5555_6666n);
    assertEq(u64[0], 0xcccc_bbbb_aaaa_999an);
  }
}
fillConstantUint64();

// Call fill() with a BigInt from an int32.
function fillInt64FromInt32() {
  var i64 = new BigInt64Array(1);
  for (var i = 0; i < 100; ++i) {
    i64.fill(BigInt(i));
    assertEq(i64[0], BigInt(i));

    i64.fill(BigInt(-i));
    assertEq(i64[0], BigInt(-i));
  }
}
fillInt64FromInt32();

// Call fill() with a BigInt from an int32.
function fillUint64FromInt32() {
  var u64 = new BigUint64Array(1);
  for (var i = 0; i < 100; ++i) {
    u64.fill(BigInt(i));
    assertEq(u64[0], BigInt(i));

    u64.fill(BigInt(-i));
    assertEq(u64[0], BigInt.asUintN(64, BigInt(-i)));
  }
}
fillUint64FromInt32();

// Call fill() with an int64 value.
function fillInt64FromInt64() {
  var i64 = new BigInt64Array(2);
  for (var i = 0; i < 100; ++i) {
    i64[0] = BigInt(i);
    i64.fill(i64[0], 1);
    assertEq(i64[1], BigInt(i));
  }
}
fillInt64FromInt64();

// Call fill() with an uint64 value.
function fillUint64FromUint64() {
  var u64 = new BigUint64Array(2);
  for (var i = 0; i < 100; ++i) {
    u64[0] = BigInt(i);
    u64.fill(u64[0], 1);
    assertEq(u64[1], BigInt(i));
  }
}
fillUint64FromUint64();
