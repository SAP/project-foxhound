// |jit-test| --fast-warmup
function changeMath(i) {
  with (this) {} // Don't inline.
  if (i === 1980) {
    globalThis.Math = {abs: function() { return -1; }};
  }
}
function f() {
  var res = 0;
  for (var i = 0; i < 2000; i++) {
    res += Math.abs(i);
    changeMath(i);
  }
  assertEq(res, 1961171);
}
f();
