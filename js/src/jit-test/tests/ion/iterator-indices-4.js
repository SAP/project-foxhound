function id(x) { return x; }

function foo(obj) {
  for (var key in obj) {
    assertEq(id(obj[key]), obj[key]);
  }
}

function foo2(obj) {
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    assertEq(id(obj[key]), obj[key]);
  }
}

var arr = [];
for (var i = 0; i < 8; i++) {
  var obj = {["x" + i]: 1};
  arr.push(obj);
}

with ({}) {}
for (var i = 0; i < 1000; i++) {
  let obj = arr[i % arr.length];
  foo(obj);
  foo2(obj);
}
