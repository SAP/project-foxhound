function test() {
  var arr = [];
  var num = 5;
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
    arr[i%num].a = i%num;
  }

  var t = 0;
  for (let i=0; i<10000; i++) {
    t = arr[i%num].a;
  }

  for (let i=0; i<num; i++) {
    assertEq(arr[i].a, i);
  }
}

test();
