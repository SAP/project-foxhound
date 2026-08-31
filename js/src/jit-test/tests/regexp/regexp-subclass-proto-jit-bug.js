// |jit-test| --enable-legacy-regexp; skip-if: !getBuildConfiguration("debug")

load(libdir + 'asserts.js');

function testSubclassProtoJitBug() {
  class MyRegExp extends RegExp {}
  let real = RegExp("ab|cd");
  let fake = new MyRegExp("ab|cd");
  fake.__proto__ = RegExp.prototype;
  
  function foo(r) {
    return r.test("ab");
  }
  
  for (var i = 0; i < 2000; i++) {
    foo(real);
  }
  assertEq(RegExp.lastMatch, "ab");
  
  foo(fake);
  assertThrowsInstanceOf(() => RegExp.lastMatch, TypeError);
}

testSubclassProtoJitBug();
