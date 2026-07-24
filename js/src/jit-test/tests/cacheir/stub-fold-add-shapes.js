function foo(obj) {
  return obj.x + obj.y + obj.x + obj.y;
}
function f() {
  with ({}) {}
  var arr = [{x: 1, y: 0}, {x: 0, y: 1, z: 2}];
  var res = 0;
  for (var i = 0; i < 10_000; i++) {
    var obj = arr[i % arr.length];
    res += foo(obj);
    if (i === 4_000) {
      arr.push({x: 1, y: 2, z: 3, a: 4});
    } else if (i === 5_000) {
      arr.push({x: 1, y: 3, z: 3, b: 4});
    } else if (i === 6_000) {
      arr.push({x: 3, y: 2, z: 3, c: 4});
    } else if (i === 7_000) {
      arr.push({x: 4, y: 1, z: 3, d: 4});
    } else if (i === 8_000) {
      arr.push({x: 5, y: 3, z: 3, e: 4});
    }
  }
  assertEq(res, 43174);
}
f();
