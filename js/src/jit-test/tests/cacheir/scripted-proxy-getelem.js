function test() {
  var o = {x: 1, y: 2};
  var p = new Proxy(o, {});
  var keys = ["x", "y"];
  var res = 0;
  for (var i = 0; i < 300; i++) {
    var key = keys[i & 1];
    res += p[key];
  }
  assertEq(res, 450);
}
test();
