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
function Foo2b() {}

function test2() {
  for (var i = 0; i < 20; i++) {
    var val = i < 17 ? 1 : new Foo2();
    assertEq(val instanceof Foo2, i >= 17);
    assertEq(val instanceof Foo2b, false);
  }
}
test2();

// Uses a fresh function clone on each iteration.
function test3() {
  for (var i = 0; i < 40; i++) {
    var Foo3 = function() {};
    assertEq("" instanceof Foo3, false);
  }
}
test3();

// Primitive LHS with a custom @@hasInstance.
function Foo4() {}
function test4() {
  Object.defineProperty(Foo4, Symbol.hasInstance, {value: () => true});
  for (var i = 0; i < 20; i++) {
    assertEq(1 instanceof Foo4, true);
  }
}
test4();

// A @@hasInstance added after the IC attaches must invalidate the stub.
function Foo5() {}
function test5() {
  var proto = {__proto__: Function.prototype};
  Object.setPrototypeOf(Foo5, proto);

  var count = 0;
  for (var i = 0; i < 40; i++) {
    if (i === 20) {
      Object.defineProperty(proto, Symbol.hasInstance, {value: () => true});
    }
    if (1 instanceof Foo5) {
      count++;
    }
  }
  assertEq(count, 20);
}
test5();
