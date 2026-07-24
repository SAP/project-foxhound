function test(o, deleter) {
  var result = 0;
  for (var s in o) {
    if (!o.hasOwnProperty(s)) { continue; }
    result += o[s];
    deleter(o);
  }
  return result;
}

function test2(o, deleter) {
  var result = 0;
  var keys = Object.keys(o);
  for (var i = 0; i < keys.length; i++) {
    var s = keys[i];
    if (!o.hasOwnProperty(s)) { continue; }
    result += o[s];
    deleter(o);
  }
  return result;
}

with ({}) {}

// Ion-compile |test| with a megamorphic getprop and a generic call.
for (var i = 0; i < 2000; i++) {
  var obj = {};
  obj["x" + i] = 1;
  test(obj, () => 1);
  test(obj, () => 2);
  test2(obj, () => 1);
  test2(obj, () => 2);
}

assertEq(test({x: 1, y: 2}, (o) => delete o.y), 1);
assertEq(test([1,2], (o) => delete o[1]), 1);
assertEq(test([1,2], (o) => {o.length = 0}), 1);

assertEq(test({x: 1, y: 2, z: 3}, (o) => delete o.y), 4);
assertEq(test([1,2,3], (o) => delete o[1]), 4);
assertEq(test([1,2,3,4], (o) => {o.length = 2}), 3);
assertEq(test([,2,3], (o) => o.reverse()), 2);

assertEq(test({x: 1, y: 2, z: 3}, (o) => delete o.x), 6);
assertEq(test([1,2,3], (o) => delete o[0]), 6);
assertEq(test([1], (o) => {o.length = 0}), 1);

assertEq(test2({x: 1, y: 2}, (o) => delete o.y), 1);
assertEq(test2([1,2], (o) => delete o[1]), 1);
assertEq(test2([1,2], (o) => {o.length = 0}), 1);

assertEq(test2({x: 1, y: 2, z: 3}, (o) => delete o.y), 4);
assertEq(test2([1,2,3], (o) => delete o[1]), 4);
assertEq(test2([1,2,3,4], (o) => {o.length = 2}), 3);
assertEq(test2([,2,3], (o) => o.reverse()), 2);

assertEq(test2({x: 1, y: 2, z: 3}, (o) => delete o.x), 6);
assertEq(test2([1,2,3], (o) => delete o[0]), 6);
assertEq(test2([1], (o) => {o.length = 0}), 1);
