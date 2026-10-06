// |jit-test| --ion-eager
gczeal(2);
function f1(f, x) {
  assertEq(1 instanceof f, false);
  +x;
}
for (var i = 0; i < 30; i++) {
  function f() {}
  f1(f, {valueOf() { f.__proto__ = null; }, __proto__: f});
}
