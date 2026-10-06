function test(obj, otherObj) {
  var total = 0;
  var keys = Object.keys(obj);
  var otherKeys = Object.keys(otherObj);
  if (keys.length != otherKeys.length) {
    return -1;
  }
  for (var i = 0; i < keys.length; i++) {
    var s = keys[i];
    if (otherObj.hasOwnProperty(s)) {
      total += otherObj[s];
    }
  }

  return total;
}

var arr = [];
var arr2 = [];
for (var i = 0; i < 20; i++) {
  var obj = {};
  var obj2 = {};
  for (var j = 0; j < i; j++) {
    obj["x_" + i + "_" + j] = 1;
    obj2["x_" + i + "_" + j] = 2;
  }
  arr.push(obj);
  arr2.push(obj2);
}

with ({}) {}
for (var i = 0; i < 2000; i++) {
  var idx = i % arr.length;
  assertEq(test(arr[idx], arr2[idx]), idx * 2);
}

assertEq(-1, test({a: 1, b: 1, c: 1}, {a: 2, b: 2}));
assertEq(4, test({a: 1, b: 1, c: 1}, {a: 2, b: 2, d: 2}));