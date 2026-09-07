// |jit-test| --ion-offthread-compile=off;
//
function test(arr, max) {

  // LoadFixedFromOffset
  var test = 0;
  for (let i=0; i<20; i++) {
    test = arr[i%max].a;
  }

  // StoreFixedFromOffset
  var test = 0;
  for (let i=0; i<20; i++) {
    arr[i%max].a = i%max;
  }

  for (let i=0; i<max; i++) {
    assertEq(arr[i].a, i);
  }
}

var arr = [];
arr[0] = {a:0};
arr[1] = {b:0, a:1};
arr[2] = {c:0, a:2};

// GuardShapeListToOffset (3)
for (let i=0; i<1000; i++) {
  test(arr, arr.length);
}

arr[3] = {d:0, a:3};

// GuardShapeListToOffset (4)
for (let i=0; i<1000; i++) {
  test(arr, arr.length);
}

arr[4] = {e:0, a:4};

// GuardMultipleShapesToOffset (5)
for (let i=0; i<1000; i++) {
  test(arr, arr.length);
}

arr[5] = {f:0, a:4};

// GuardMultipleShapesToOffset (6)
for (let i=0; i<1000; i++) {
  test(arr, arr.length);
}

arr[6] = {g:0, a:4};

// GuardMultipleShapesToOffset (7)
for (let i=0; i<1000; i++) {
  test(arr, arr.length);
}
