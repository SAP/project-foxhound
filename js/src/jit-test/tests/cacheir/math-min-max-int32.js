function max(lhs, rhs) {
  return lhs >= rhs ? lhs : rhs;
}

function min(lhs, rhs) {
  return lhs <= rhs ? lhs : rhs
}

function testMinMaxI32() {
  var xs = [
    -0x8000_0000,
    -100000,
    -1000,
    -100,
    -1,
    -2,
    0,
    1,
    2,
    100,
    1000,
    100000,
    0x7fff_ffff,
  ];

  for (var i = 0; i < 1000; ++i) {
    var x = xs[i % xs.length];
    var y = xs[((i / xs.length)|0) % xs.length];

    assertEq(Math.max(x, 0), max(x, 0));
    assertEq(Math.min(x, 0), min(x, 0));

    assertEq(Math.max(x, 1), max(x, 1));
    assertEq(Math.min(x, 1), min(x, 1));

    assertEq(Math.max(x, -1), max(x, -1));
    assertEq(Math.min(x, -1), min(x, -1));

    assertEq(Math.max(x, 2), max(x, 2));
    assertEq(Math.min(x, 2), min(x, 2));

    assertEq(Math.max(x, -2), max(x, -2));
    assertEq(Math.min(x, -2), min(x, -2));

    assertEq(Math.max(x, 100_000 - 1), max(x, 100_000 - 1));
    assertEq(Math.min(x, 100_000 - 1), min(x, 100_000 - 1));

    assertEq(Math.max(x, 100_000), max(x, 100_000));
    assertEq(Math.min(x, 100_000), min(x, 100_000));

    assertEq(Math.max(x, 100_000 + 1), max(x, 100_000 + 1));
    assertEq(Math.min(x, 100_000 + 1), min(x, 100_000 + 1));

    assertEq(Math.max(x, -100_000 - 1), max(x, -100_000 - 1));
    assertEq(Math.min(x, -100_000 - 1), min(x, -100_000 - 1));

    assertEq(Math.max(x, -100_000), max(x, -100_000));
    assertEq(Math.min(x, -100_000), min(x, -100_000));

    assertEq(Math.max(x, -100_000 + 1), max(x, -100_000 + 1));
    assertEq(Math.min(x, -100_000 + 1), min(x, -100_000 + 1));

    assertEq(Math.max(x, y), max(x, y));
    assertEq(Math.min(x, y), min(x, y));
  }
}
testMinMaxI32();
