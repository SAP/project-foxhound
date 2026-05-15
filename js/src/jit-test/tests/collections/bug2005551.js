function f() {
  var x = new WeakMap();
  for (var y of [0, 0]) {
    try {
      function g() {};
      x.getOrInsertComputed([], function () {});
    } catch (e) {}
  }
  oomTest(f);
}
f();
