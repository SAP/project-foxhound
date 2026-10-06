// |jit-test| --fast-warmup
enableGeckoProfilingWithSlowAssertions();
function cmp(a, b) {
  readGeckoProfilingStack();
  return b - a;
}
function test() {
  var a = [0, -1, 1];
  Object.defineProperty(a, "x", {set: Array.prototype.sort});
  for (var i = 0; i < 150; i++) {
    var obj = (i & 1) ? a : {};
    obj.x = cmp;
  }
  assertEq(a.toString(), "1,0,-1");
}
test();
