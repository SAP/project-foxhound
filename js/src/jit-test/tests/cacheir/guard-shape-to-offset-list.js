function test() {
  var n = 3;
  var arr = [];
  for (var i = 0; i < n; i++) {
    var obj = {};
    for (var j = 0; j < i+4; j++) {
      obj["x_" + i + "_" + j] = 1;
    }
    arr.push(obj);
  }
  for (var i = 0; i < n; i++) {
    arr[i].a = -1;
    arr[i].b = -1;
  }

  for (let i=0; i<10000; i++) {
    arr[i%n].a = 0;
    arr[i%n].b = 1;
  }

  for (var i = 0; i < n; i++) {
      assertEq(arr[i].a, 0);
      assertEq(arr[i].b, 1);
  }
}

test();
