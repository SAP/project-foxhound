const tests = [
  [-0x80000000n, -2n, -0x80000000n],
  [-0x7fffffffn, -2n, -0x80000000n],
  [-0x7ffffffen, -2n, -0x7ffffffen],
  [-2n, -2n, -2n],
  [-1n, -2n, -2n],
  [0n, -2n, 0n],
  [1n, -2n, 0n],
  [2n, -2n, 2n],
  [0x7ffffffen, -2n, 0x7ffffffen],
  [0x7fffffffn, -2n, 0x7ffffffen],
  [-0x80000000n, -1n, -0x80000000n],
  [-0x7fffffffn, -1n, -0x7fffffffn],
  [-0x7ffffffen, -1n, -0x7ffffffen],
  [-1n, -1n, -1n],
  [0n, -1n, 0n],
  [1n, -1n, 1n],
  [2n, -1n, 2n],
  [0x7ffffffen, -1n, 0x7ffffffen],
  [0x7fffffffn, -1n, 0x7fffffffn],
  [-0x80000000n, 0n, 0n],
  [-0x7fffffffn, 0n, 0n],
  [-0x7ffffffen, 0n, 0n],
  [0n, 0n, 0n],
  [1n, 0n, 0n],
  [2n, 0n, 0n],
  [0x7ffffffen, 0n, 0n],
  [0x7fffffffn, 0n, 0n],
  [-0x80000000n, 1n, 0n],
  [-0x7fffffffn, 1n, 1n],
  [-0x7ffffffen, 1n, 0n],
  [1n, 1n, 1n],
  [2n, 1n, 0n],
  [0x7ffffffen, 1n, 0n],
  [0x7fffffffn, 1n, 1n],
  [-0x80000000n, 2n, 0n],
  [-0x7fffffffn, 2n, 0n],
  [-0x7ffffffen, 2n, 2n],
  [2n, 2n, 2n],
  [0x7ffffffen, 2n, 2n],
  [0x7fffffffn, 2n, 2n],
  [-0x80000000n, 0x7ffffffen, 0n],
  [-0x7fffffffn, 0x7ffffffen, 0n],
  [-0x7ffffffen, 0x7ffffffen, 2n],
  [0x7ffffffen, 0x7ffffffen, 0x7ffffffen],
  [0x7fffffffn, 0x7ffffffen, 0x7ffffffen],
  [-0x80000000n, 0x7fffffffn, 0n],
  [-0x7fffffffn, 0x7fffffffn, 1n],
  [-0x7ffffffen, 0x7fffffffn, 2n],
  [0x7fffffffn, 0x7fffffffn, 0x7fffffffn],
  [-0x80000000n, -0x80000000n, -0x80000000n],
  [-0x7fffffffn, -0x80000000n, -0x80000000n],
  [-0x7ffffffen, -0x80000000n, -0x80000000n],
  [-0x7fffffffn, -0x7fffffffn, -0x7fffffffn],
  [-0x7ffffffen, -0x7fffffffn, -0x80000000n],
  [-0x7ffffffen, -0x7ffffffen, -0x7ffffffen],
];

function f(tests) {
  for (let test of tests) {
    let lhs = test[0], rhs = test[1], expected = test[2];
    assertEq(BigInt.asIntN(32, lhs), lhs);
    assertEq(BigInt.asIntN(32, rhs), rhs);
    assertEq(BigInt.asIntN(32, expected), expected);

    let f = Function(`
      let lhs = ${lhs}n;
      let rhs = ${rhs}n;
      assertEq(lhs & rhs, ${expected}n);
      assertEq(rhs & lhs, ${expected}n);
    `);

    for (let j = 0; j < 100; ++j) {
      f();
    }
  }
}

f(tests);
