// |jit-test| --disable-main-thread-denormals; --fast-warmup; --ion-check-range-analysis; skip-if: !getBuildConfiguration("can-disable-main-thread-denormals")
function f(x) {
  x = Math.fround(x);
  if (x >= Math.fround(-1e-40)) {
    return x ? x : 0;
  }
  return 7;
}
function test() {
  with ({}) {} // Don't Ion-compile this function.
  var res = 0;
  for (var i = 0; i < 1000; i++) {
    res += f(Math.fround(-1e-40));
  }
  assertEq(res, 0);
}
test();
