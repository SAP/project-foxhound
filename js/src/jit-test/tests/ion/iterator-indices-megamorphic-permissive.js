function test(obj, expected) {
  var count = 0;
  for (var s in obj) {
    if (obj.hasOwnProperty(s)) {
      count += obj[s];
    }
  }
  assertEq(count, expected);
}

function test2(obj, expected) {
  var count = 0;
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    var s = keys[i];
    if (obj.hasOwnProperty(s)) {
      count += obj[s];
    }
  }
  assertEq(count, expected);
}

var arr = [];
for (var i = 0; i < 20; i++) {
  var obj = {};
  for (var j = 0; j < i; j++) {
    if (j == i - 1) {
      Object.defineProperty(obj, "x_" + i + "_" + j, {
        get() {
          return 1;
        },
        enumerable: true,
      })
    } else {
      obj["x_" + i + "_" + j] = 1;
    }
  }

  arr.push(obj);
}

with ({}) {}
for (var i = 0; i < 2000; i++) {
  var idx = i % arr.length;
  test(arr[idx], idx);
  test2(arr[idx], idx);
}
