// |jit-test| --fast-warmup

function f(index, expected) {
  function g(index) {
    return arguments[index];
  }
  assertEq(g(index), expected);
}

// Don't inline |f| into top-level script.
with ({});

for (var i = 0; i < 100; ++i) {
  f(0, 0);
  f(1, undefined);
}
