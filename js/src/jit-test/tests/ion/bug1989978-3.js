// |jit-test| --no-threads; --fast-warmup

let o = { x: 1 };
addObjectFuse(o);

function foo() {
  return o.x;
}

function replace(obj, val) {
    for (var key in obj) {
        obj[key] = val;
    }
}

with ({}) {}
for (var i = 0; i < 100; i++) {
  foo(10);
}
for (var i = 0; i < 100; i++) {
  replace({a: 0}, 1);
  replace({a: 0, b: 0}, 1);
}

replace(o, 2);
assertEq(foo(), 2);
