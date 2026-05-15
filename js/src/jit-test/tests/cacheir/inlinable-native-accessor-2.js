// Test calling an inlinable native function as an accessor property.

// Install the inlinable Number.prototype.toString method as an accessor property.
Object.defineProperty(Number.prototype, "tostr", {
  get: Number.prototype.toString,
});

function testWithPrimitive() {
  var key = "tostr";
  for (var i = 0; i < 100; ++i) {
    assertEq(i.tostr, i.toString());
    assertEq(i[key], i.toString());
  }
}
testWithPrimitive();

// Install the inlinable Date.prototype.getTime method as an accessor property.
Object.defineProperty(Date.prototype, "time", {
  get: Date.prototype.getTime,
});

function testWithObject() {
  var key = "time";
  for (var i = 0; i < 100; ++i) {
    var d = new Date(i);
    assertEq(d.time, d.getTime());
    assertEq(d[key], d.getTime());
  }
}
testWithObject();
