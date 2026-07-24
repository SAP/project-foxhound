// |jit-test| --no-threads

function opt(a) {
  for (const it in a) {
    a[it] = 5;
  }
}
const obj = {};
Object.defineProperty(obj, "x", {value: 1, enumerable: true, writable: false});
for (let i = 0; i < 2000; i++) {
  opt(obj);
}
assertEq(obj.x, 1);
