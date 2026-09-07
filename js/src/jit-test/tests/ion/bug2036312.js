// |jit-test| --ion-eager; --no-threads
function f(x) {
  for (var i = 0; i < 50; i++) {
    try {
      !Math.fround(Math.fround(x) || y) % null.foo;
    } catch (e) {}
  }
}
f(0.1);
