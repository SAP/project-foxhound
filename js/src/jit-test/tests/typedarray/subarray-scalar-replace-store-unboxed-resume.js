// |jit-test| --ion-limit-script-size=off; --ion-osr=off; --ion-inlining=off

function testSetElement() {
  var i32 = new Int32Array(10);

  function inner(f) {
    var sub_i32 = i32.subarray(1);
    sub_i32[0] *= 100;
    f();
  }

  var empty = () => {};

  for (var i = 0; i <= 100; ++i) {
    i32.fill(1);
    inner(i < 100 ? empty : bailout);
    assertEq(i32[1], 100);
  }
}
testSetElement();
