// |jit-test| --no-threads; --fast-warmup

function g(x) {
  return x % 7;
}
function f() {
  with ({}) {} // Don't compile with Ion.
  for (var i = 0; i < 500; i++) {
    if (i < 450) {
      g(1);
    } else {
      assertEq(g(-7), -0);
    }
  }
}
f();
