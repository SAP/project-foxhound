let global = 0;

function foo(arr) {
  let a = arr[0] + 1;
  let b = arr[1];
  global = b;
  if (arr) {}
  return a + b;
}

with ({}) {}
for (var i = 0; i < 2000; i++) {
  assertEq(foo([1,2]), 4);
}

foo([0,,0]);
