// |jit-test| --benchmark-mode; --no-ion
// --benchmark-mode (non-strict) should warn but still run with --no-ion.
assertEq(1 + 1, 2);
