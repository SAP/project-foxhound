function test(obj, expected) {
  var actual = 0;
  for (var s in obj) {
    actual += obj[s];
  }
  assertEq(actual, expected);
}

function test2(obj, expected) {
  var count = 0;
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    var s = keys[i];
    if (obj.hasOwnProperty(s)) {
      count++;
    }
  }
  assertEq(count, expected);
}

var arr = [];
for (var i = 0; i < 20; i++) {
  var obj = {};
  for (var j = 0; j < i; j++) {
    obj["x_" + i + "_" + j] = 1;
  }
  arr.push(obj);
}

// Test fixed and dynamic slots
with ({}) {}
for (var i = 0; i < 2000; i++) {
  var idx = i % arr.length;
  test(arr[idx], idx);
  test2(arr[idx], idx);
}
