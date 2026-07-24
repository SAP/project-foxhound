// Tests megamorphic stores to fixed and dynamics slots, and dense elements
function test(obj) {
  let index = 0;
  for (var s in obj) {
    obj[s] = index;
    index++;
  }
  index = 0;
  for (var s in obj) {
    assertEq(obj[s], index);
    index++;
  }
}
function test2(obj) {
  let index = 0;
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    var s = keys[i];
    obj[s] = index;
    index++;
  }
  index = 0;
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    var s = keys[i];
    assertEq(obj[s], index);
    index++;
  }
}

var arr = [];
var arr2 = [];
var elem_obj = [];
var elem_obj2 = [];
for (var i = 0; i < 20; i++) {
  var obj = {};
  var obj2 = {};
  for (var j = 0; j < i; j++) {
    obj["x_" + i + "_" + j] = 1;
    obj2["x_" + i + "_" + j] = 1;
  }
  arr.push(obj);
  arr2.push(obj2);
  elem_obj.push(1);
  elem_obj2.push(1);
}
arr.push(elem_obj);
arr2.push(elem_obj2);

with ({}) {}
for (var i = 0; i < 2000; i++) {
  var idx = i % arr.length;
  test(arr[idx]);
  test2(arr2[idx]);
}

