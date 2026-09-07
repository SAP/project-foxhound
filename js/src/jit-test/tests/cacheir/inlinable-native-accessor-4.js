// Test calling an inlinable native function as an accessor when the native function uses alloc-sites.

function testObject() {
  var obj = Object.defineProperty({}, "object", {
    get: Object,
  });

  for (var i = 0; i < 100; i++) {
    var o = obj.object;
    assertEq(typeof o, "object");
    assertEq(o !== null, true);
  }
}
testObject();

function testArray() {
  var obj = Object.defineProperty({}, "array", {
    get: Array,
  });

  for (var i = 0; i < 100; i++) {
    var a = obj.array;
    assertEq(a.length, 0);
    assertEq(Array.isArray(a), true);
  }
}
testArray();
