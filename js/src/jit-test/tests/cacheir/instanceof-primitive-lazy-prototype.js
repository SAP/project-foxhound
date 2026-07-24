function Foo1() {}

function test1() {
  var arr = [1, "a", null, undefined];
  for (var i = 0; i < 20; i++) {
    var val = arr[i % arr.length];
    assertEq(val instanceof Foo1, false);
  }
}
test1();

function Foo2() {}
function Foo3() {}

function test2() {
  for (var i = 0; i < 20; i++) {
    var val = i < 17 ? 1 : new Foo2();
    assertEq(val instanceof Foo2, i >= 17);
    assertEq(val instanceof Foo3, false);
  }
}
test2();
