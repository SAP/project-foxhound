// |jit-test| --fast-warmup

// Test for GetProp loading a global constant.

function changeGlobalProp(i) {
  with (this) {} // Don't inline.
  if (i === 1900) {
    globalProp = 5;
  }
}
var globalProp = 3;
function f() {
  var res = 0;
  for (var i = 0; i < 2000; i++) {
    res += globalThis.globalProp;
    changeGlobalProp(i);
  }
  assertEq(res, 6198);
}
f();
