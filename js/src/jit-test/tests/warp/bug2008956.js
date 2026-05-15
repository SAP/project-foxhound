// |jit-test| --no-threads

function foo(o) {
  return o.x;
}

let xy = {x:1,y:2}
let yx = {y:1,x:2};


with ({}) {}
for (var i = 0; i < 1000; i++) {
  foo(xy);
  foo(yx);
}

function invalidate() {
  class XZ { x = 1 }
  let xz = new XZ();
  for (var i = 0; i < 10; i++) {
    foo(xz);
  }
}
invalidate();
gc();

for (var i = 0; i < 1000; i++) {
  foo(xy);
  foo(yx);
}
