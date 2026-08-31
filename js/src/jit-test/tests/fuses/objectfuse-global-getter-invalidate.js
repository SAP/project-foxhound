// |jit-test| --fast-warmup

// Test for GetGName with a constant getter property on the global.

function changeGlobalProp(i) {
  with (this) {} // Don't inline.
  if (i === 1900) {
    Object.defineProperty(globalThis, "globalProp", {get: function() {
      return 5;
    }});
  }
}

Object.defineProperty(globalThis, "globalProp", {get: function() {
  return 3;
}, configurable: true});

function f() {
  var res = 0;
  for (var i = 0; i < 2000; i++) {
    res += globalProp;
    changeGlobalProp(i);
  }
  assertEq(res, 6198);
}
f();
