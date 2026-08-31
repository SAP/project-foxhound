var r = BigInt.asUintN(65, (2n << 64n) + 2n);
assertEq(r, 2n);
