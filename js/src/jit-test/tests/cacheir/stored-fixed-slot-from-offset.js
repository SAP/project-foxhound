function test() {
  var arr = [];
  arr[0] = {a:0};
  arr[1] = {b:0, a:0};
  arr[2] = {c:0, a:0};
  arr[3] = {d:0, a:0};
  arr[4] = {e:0, a:0};
  arr[5] = {f:0, a:0};
  arr[6] = {g:0, a:0};
  arr[7] = {h:0, a:0};
  arr[8] = {i:0, a:0};

  for (let i=0; i<10000; i++) {
    arr[i%9].a = ((i%9)==8)?2:1;
  }

  assertEq(arr[0].a, 1);
  assertEq(arr[1].a, 1);
  assertEq(arr[2].a, 1);
  assertEq(arr[3].a, 1);
  assertEq(arr[4].a, 1);
  assertEq(arr[5].a, 1);
  assertEq(arr[6].a, 1);
  assertEq(arr[7].a, 1);
  assertEq(arr[8].a, 2);
}

test();
