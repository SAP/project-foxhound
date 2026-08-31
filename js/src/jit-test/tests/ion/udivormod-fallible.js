// Test case for fallible unsigned division and modulus instructions.
//
// Doesn't include test that bailouts are correctly implemented.

// |MBinaryInstruction::unsignedOperands()| calls MustBeUInt32, which only
// treats MUrsh as unsigned when bailouts are disabled.
//
// |MUrsh::collectRangeInfoPreTrunc()| sets |MUrsh::bailoutsDisabled_| if
// the lower bound of the lhs operand is >= 0 and the lower bound of the rhs
// operand is >= 1.
//
// Use |Math.max(v, 0)| below to ensure the operand is non-negative, so that
// the |MUrsh| is marked as bailouts disabled.

// MMod::computeRange sets |MMod::unsigned_| flag.
//
// Range Analysis uses IsUint32Type to check for Uint32 types. IsUint32Type
// doesn't require that |Ursh| is marked as bailouts disabled.
//
// These don't need an explicit bit-or operation to mark as truncated.
function umod_by_constant(x) {
  return (x >>> 0) % 3;
}
function umod_by_constant_pow_two(x) {
  return (x >>> 0) % 4;
}
function umod(dividend, divisor) {
  // Ensure range of |divisor| doesn't include zero.
  divisor = Math.min(Math.max(divisor, 1), 10);

  // Make sure |IsUint32Type| returns true for both operands.
  return (dividend >>> 0) % (divisor >>> 0);
}

// |MMod::computeRange| also marks the operation as unsigned when the lower
// bound of the dividend is >= 0 (and the divisor's range doesn't include zero.)
function umod_by_constant_no_ursh(dividend, divisor) {
  // Ensure lower bound of |dividend| range is >= 0.
  dividend = Math.max(dividend, 0);

  return dividend % 5;
}
function umod_no_ursh(dividend, divisor) {
  // Ensure lower bound of |dividend| range is >= 0.
  dividend = Math.max(dividend, 0);

  // Ensure range of |divisor| doesn't include zero.
  divisor = Math.min(Math.max(divisor, 1), 10);

  return dividend % divisor;
}

// MMod::truncate sets |MMod::unsigned_| flag. Bit-or is needed to mark as truncated.
function umod_truncate(dividend, divisor) {
  dividend = Math.max(dividend, 0);
  divisor = Math.max(divisor, 0);
  return ((dividend >>> 0) % (divisor >>> 0))|0;
}

// MDiv::truncate sets |MDiv::unsigned_| flag. Bit-or is needed to mark as truncated.
//
// Note: MDiv::computeRange never sets |MDiv::unsigned_|.
function udiv_by_constant(dividend) {
  dividend = Math.max(dividend, 0);
  return ((dividend >>> 0) / 3)|0;
}
function udiv_by_constant_pow_two(dividend) {
  dividend = Math.max(dividend, 0);
  return ((dividend >>> 0) / 8)|0;
}
function udiv(dividend, divisor) {
  dividend = Math.max(dividend, 0);
  divisor = Math.max(divisor, 0);
  return ((dividend >>> 0) / (divisor >>> 0))|0;
}

// Don't Ion compile the top-level script.
with ({});

for (let i = 0; i < 100; ++i) {
  assertEq(umod_by_constant(i), i % 3);
  assertEq(umod_by_constant_pow_two(i), i % 4);

  assertEq(umod(i, 1), i % 1);
  assertEq(umod(i, 3), i % 3);
  assertEq(umod(i, 5), i % 5);

  assertEq(umod_by_constant_no_ursh(i), i % 5);

  assertEq(umod_no_ursh(i, 1), i % 1);
  assertEq(umod_no_ursh(i, 7), i % 7);
  assertEq(umod_no_ursh(i, 9), i % 9);

  assertEq(umod_truncate(i, 1), i % 1);
  assertEq(umod_truncate(i, 6), i % 6);
  assertEq(umod_truncate(i, 11), i % 11);

  // Use multiples of the divisor to ensure CacheIR doesn't emit a Double division. (bug 1554721)
  assertEq(udiv_by_constant(i * 3), i);
  assertEq(udiv_by_constant_pow_two(i * 8), i);

  assertEq(udiv(i * 1, 1), i);
  assertEq(udiv(i * 3, 3), i);
  assertEq(udiv(i * 5, 5), i);
}
