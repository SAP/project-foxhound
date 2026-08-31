// |jit-test| --fast-warmup; --no-threads
function g(arr, idx) {
  idx = +idx;
  var v1 = arr[idx];
  arr[idx + 1e-16] = 5;
  var v2 = arr[idx];
  return v1 + v2;
}
function f() {
  with (this) {}
  var arr = [1, 2, 3, 4, 5];
  for (var i = 0; i < 300; i++) {
    arr[2] = 4;
    assertEq(g(arr, numberToDouble(2)), 9);
  }
}
f();
