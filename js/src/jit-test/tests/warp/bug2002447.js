// |jit-test| --fast-warmup
gczeal(2, 54);
var bin = new Uint8Array(2);
function f(i) {
  bin[1] = i;
  Object.defineProperty(bin, [], {get: function() {}, [bin]: f});
  WebAssembly(x);
}
function test() {
  for (let i = 1; i < 120; i++) {
    try {
      f(i);
    } catch {}
  }
}
test();
