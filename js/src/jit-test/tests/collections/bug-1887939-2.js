// |jit-test| --enable-symbols-as-weakmap-keys
var map = new WeakMap();
try {
  map.set(1, 1);
} catch (e) {
  assertEq(!!e.message.match(/an unregistered symbol/), true);
}
