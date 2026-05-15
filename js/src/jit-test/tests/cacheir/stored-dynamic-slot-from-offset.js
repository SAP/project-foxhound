function test() {
  var arr = [];
  for (var i = 0; i < 20; i++) {
    var obj = {};
    for (var j = 0; j < i+4; j++) {
      obj["x_" + i + "_" + j] = 1;
    }
    arr.push(obj);
  }
  for (var i = 0; i < arr.length; i++) {
    arr[i].a = 0;
  }

  for (let i=0; i<10000; i++) {
    arr[i%9].a = i%9;
  }

  assertEq(arr[0].a, 0);
  assertEq(arr[1].a, 1);
  assertEq(arr[2].a, 2);
  assertEq(arr[3].a, 3);
  assertEq(arr[4].a, 4);
  assertEq(arr[5].a, 5);
  assertEq(arr[6].a, 6);
  assertEq(arr[7].a, 7);
  assertEq(arr[8].a, 8);

  for (let i=0; i<10000; i++) {
    var a = arr[i%9].a;
    assertEq(a, i%9);
  }
}

test();
