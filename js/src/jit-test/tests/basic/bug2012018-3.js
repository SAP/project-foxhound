// Test various property suppression edge cases for for-in enumeration. Note that
// some of this is implementation-defined, but if our behavior changes we want to
// know about it.

function testBasic() {
  var proto = {y: 1};
  var obj = Object.create(proto);
  Object.assign(obj, {x: 2, y: 3});
  var log = "";
  for (var p in obj) {
    log += p;
    delete obj.y;
  }
  // proto.y took the place of obj.y.
  assertEq(log, "xy");
}
testBasic();

function testNonEnumerable() {
  var proto = {};
  Object.defineProperty(proto, "y", {value: 1, enumerable: false, writable: true});
  var obj = Object.create(proto);
  Object.assign(obj, {x: 2, y: 3});
  var log = "";
  for (var p in obj) {
    log += p;
    delete obj.y;
  }
  // proto.y is non-enumerable so "y" is suppressed.
  assertEq(log, "x");
}
testNonEnumerable();

function testDense() {
  var proto = {};
  proto[0] = 1;
  proto[1] = 2;
  var obj = Object.create(proto);
  Object.assign(obj, {0: 1, 1: 2});
  var log = "";
  for (var p in obj) {
    log += p;
    delete obj[1];
  }
  // proto[0] took the place of obj[0].
  assertEq(log, "01");
}
testDense();

function testIndexNonEnumerable() {
  var proto = {};
  proto[0] = 1;
  Object.defineProperty(proto, 1, {value: 2, enumerable: false, writable: true});
  var obj = Object.create(proto);
  Object.assign(obj, {0: 1, 1: 2});
  var log = "";
  for (var p in obj) {
    log += p;
    delete obj[1];
  }
  // proto[1] is non-enumerable so "1" is suppressed.
  assertEq(log, "0");
}
testIndexNonEnumerable();
