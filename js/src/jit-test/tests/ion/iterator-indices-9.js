// Tests SetPropertyCache sets to object.
function test(obj) {
  let index = 0;
  for (var s in obj) {
    if (s.startsWith("test")) {
      obj[s] = index;
    }
    index++;
  }
  index = 0;
  for (var s in obj) {
    if (s.startsWith("test")) {
      assertEq(obj[s], index);
    }
    index++;
  }
}

function test2(obj) {
  let index = 0;
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    var s = keys[i];
    if (s.startsWith("test")) {
      obj[s] = index;
    }
    index++;
  }
  index = 0;
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    var s = keys[i];
    if (s.startsWith("test")) {
      assertEq(obj[s], index);
    }
    index++;
  }
}

var arr = [];
var arr2 = [];
for (var i = 0; i < 2; i++) {
  var obj = {};
  var obj2 = {};
  for (var j = 0; j < i * 20; j++) {
    obj["x_" + i + "_" + j] = 1;
    obj2["x_" + i + "_" + j] = 1;
  }
  obj.testKey = 1;
  obj2.testKey = 1;
  arr.push(obj);
  arr2.push(obj2);
}

with ({}) {}
for (var i = 0; i < 2000; i++) {
  var idx = i % arr.length;
  test(arr[idx]);
  test2(arr2[idx]);
}

