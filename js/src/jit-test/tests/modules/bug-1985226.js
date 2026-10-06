load(libdir + "asserts.js");

a = parseModule(`import 'b' with { b: 'bar'}`);
assertThrowsInstanceOf(function () {
  moduleLink(a);
}, SyntaxError)