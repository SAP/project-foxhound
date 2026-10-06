var iters = 0;

function test(o1, o2) {
  var count = 0;
  for (var s1 in o1) {
    for (var s2 in o2) {
      if (Object.hasOwn(o1, s1)) {
	count += o1[s1];
      }
      if (Object.hasOwn(o2, s2)) {
	count += o2[s2];
      }
    }
  }
  assertEq(count, 2);
}

function test2(o1, o2) {
  var count = 0;
  var keys1 = Object.keys(o1);
  for (var i = 0; i < keys1.length; i++) {
    var s1 = keys1[i];

      var keys2 = Object.keys(o2);
      for (var j = 0; j < keys2.length; j++) {
        var s2 = keys2[i];
        if (Object.hasOwn(o1, s1)) {
          count += o1[s1];
        }
        if (Object.hasOwn(o2, s2)) {
          count += o2[s2];
        }
    }
  }
  assertEq(count, 2);
}

var arr = [];
for (var i = 0; i < 20; i++) {
  arr.push({["x_" + i]: 1});
}

with ({}) {}
for (var i = 0; i < 2000; i++) {
  var idx1 = i % arr.length;
  var idx2 = 1 + i % (arr.length - 1);
  test(arr[idx1], arr[idx2]);
  test2(arr[idx1], arr[idx2]);
}
